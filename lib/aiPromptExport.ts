"use client";

import type {
  ParsedDataset,
  ColumnStats,
  NumericStats,
  CategoricalStats,
} from "@/types/dataset";
import type { AIProvider, ProviderConfig } from "@/lib/ApiKeyContext";

interface ExportDataAgentPromptOptions {
  dataset: ParsedDataset;
  filename: string;
  provider: AIProvider;
  providerConfig: ProviderConfig;
  apiKey: string;
  insightSource: "ai" | "rules" | "loading" | null;
}

export interface PreparedPromptTextFile {
  filename: string;
  content: string;
}

const SYSTEM_PROMPT = `You are a senior analytics lead writing a prompt for a downstream data agent.

Return plain text only. No markdown fences. Write a ready-to-paste prompt that instructs a capable data agent how to investigate the dataset.

The prompt must:
- be grounded in the supplied evidence
- call out likely issues and risk signals
- describe how the data appears to behave
- suggest practical lines of investigation
- warn about misleading patterns, skew, imbalance, sparsity, leakage-like risks, and data quality concerns when relevant
- ask for concrete outputs, not generic analysis

Structure the prompt using short plain-text section headings only:
Objective
Dataset context
Known issues and risk signals
Behavioral observations
Investigation priorities
Practical cautions
Expected deliverables

Write like an analyst handing work to another analyst agent. Keep it specific, crisp, and operational.`;

function sanitizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatNumericColumn(name: string, stats: NumericStats, missingCount: number) {
  return `${name}: mean=${stats.mean.toFixed(2)}, median=${stats.median.toFixed(
    2
  )}, std=${stats.std.toFixed(2)}, min=${stats.min.toFixed(
    2
  )}, max=${stats.max.toFixed(2)}, skew=${stats.skewness.toFixed(
    2
  )}, kurtosis=${stats.kurtosis.toFixed(2)}, missing=${missingCount}`;
}

function formatCategoricalColumn(
  name: string,
  stats: CategoricalStats,
  missingCount: number
) {
  const top = stats.frequencies
    .slice(0, 4)
    .map((item) => `${String(item.value)}(${item.count})`)
    .join(", ");
  return `${name}: top=[${top || "none"}], dominant=${(
    stats.mostCommonPct * 100
  ).toFixed(1)}%, entropy=${stats.entropy.toFixed(2)}, missing=${missingCount}`;
}

function buildPromptContext(
  dataset: ParsedDataset,
  filename: string,
  insightSource: "ai" | "rules" | "loading" | null,
  providerLabel: string
) {
  const typeCounts = {
    numeric: dataset.columns.filter((column) => column.type === "numeric").length,
    categorical: dataset.columns.filter((column) => column.type === "categorical").length,
    datetime: dataset.columns.filter((column) => column.type === "datetime").length,
    text: dataset.columns.filter((column) => column.type === "text").length,
  };

  const numericColumns = dataset.columns
    .filter((column) => column.type === "numeric")
    .slice(0, 8)
    .map((column) => {
      const stats = dataset.stats[column.name] as NumericStats | undefined;
      return stats ? formatNumericColumn(column.name, stats, column.missingCount) : null;
    })
    .filter(Boolean)
    .join("\n");

  const categoricalColumns = dataset.columns
    .filter((column) => column.type === "categorical")
    .slice(0, 6)
    .map((column) => {
      const stats = dataset.stats[column.name] as CategoricalStats | undefined;
      return stats
        ? formatCategoricalColumn(column.name, stats, column.missingCount)
        : null;
    })
    .filter(Boolean)
    .join("\n");

  const missingColumns = dataset.columns
    .filter((column) => column.missingCount > 0)
    .sort((left, right) => right.missingCount - left.missingCount)
    .slice(0, 6)
    .map(
      (column) =>
        `${column.name}: ${column.missingCount.toLocaleString()} missing values, ${column.uniqueCount.toLocaleString()} unique values`
    )
    .join("\n");

  const anomalyCounts = Object.entries(
    dataset.anomalies.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.column] = (accumulator[row.column] ?? 0) + 1;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([column, count]) => `${column}: ${count} anomaly flags`)
    .join("\n");

  const topCorrelations = dataset.correlations
    .filter((item) => item.significant)
    .sort((left, right) => Math.abs(right.r) - Math.abs(left.r))
    .slice(0, 8)
    .map(
      (item) =>
        `${item.colA} vs ${item.colB}: r=${item.r.toFixed(2)}, p=${
          item.pValue < 0.001 ? "<0.001" : item.pValue.toFixed(3)
        }, n=${item.n}`
    )
    .join("\n");

  const currentInsights = dataset.insights
    .slice(0, 6)
    .map(
      (insight) =>
        `${insight.severity.toUpperCase()} | ${insight.title}: ${insight.body}`
    )
    .join("\n");

  return [
    `Dataset file: ${filename || "Uploaded dataset"}`,
    `Rows: ${dataset.rowCount.toLocaleString()}`,
    `Columns: ${dataset.colCount}`,
    `Type mix: numeric=${typeCounts.numeric}, categorical=${typeCounts.categorical}, datetime=${typeCounts.datetime}, text=${typeCounts.text}`,
    `Current insight source: ${
      insightSource === "ai"
        ? `AI via ${providerLabel}`
        : insightSource === "loading"
          ? `AI pending via ${providerLabel}`
          : "Rule-based"
    }`,
    "",
    "Numeric field summaries:",
    numericColumns || "(none)",
    "",
    "Categorical field summaries:",
    categoricalColumns || "(none)",
    "",
    "Missingness watchlist:",
    missingColumns || "(none)",
    "",
    "Anomaly concentration:",
    anomalyCounts || "(none)",
    "",
    "Significant correlations:",
    topCorrelations || "(none)",
    "",
    "Current Bayynah insights:",
    currentInsights || "(none)",
  ].join("\n");
}

async function callProviderText(
  provider: AIProvider,
  providerConfig: ProviderConfig,
  apiKey: string,
  userMessage: string
) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      apiKey,
      model: providerConfig.model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error("AI prompt export is temporarily unavailable.");
  }

  const data = await response.json();

  if (provider === "claude") return data?.content?.[0]?.text ?? "";
  if (provider === "gemini") {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function exportDataAgentPrompt({
  dataset,
  filename,
  provider,
  providerConfig,
  apiKey,
  insightSource,
}: ExportDataAgentPromptOptions): Promise<PreparedPromptTextFile> {
  const context = buildPromptContext(
    dataset,
    filename,
    insightSource,
    providerConfig.label
  );
  const rawPrompt = await callProviderText(provider, providerConfig, apiKey, context);
  const prompt = sanitizeText(rawPrompt).replace(/```[a-z]*|```/gi, "").trim();

  if (!prompt) {
    throw new Error("AI prompt export is temporarily unavailable.");
  }

  const safeBaseName = (filename || "dataset")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "_");

  return {
    content: prompt,
    filename: `${safeBaseName}_data_agent_prompt.txt`,
  };
}
