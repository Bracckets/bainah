// ─── AI Insight Generator ─────────────────────────────────────────────────────
// Calls whichever provider the user chose. Falls back to rule-based on any error.

import {
  ColumnMeta, ColumnStats, CorrelationResult,
  Insight, NumericStats, CategoricalStats,
} from "@/types/dataset";
import { generateInsights as ruleBasedInsights } from "./insightGenerator";
import { AIProvider, ProviderConfig } from "./ApiKeyContext";

// ── Shared prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior data analyst. Given a dataset summary, generate 4–7 concise, actionable insights for a non-technical audience.

Return ONLY a valid JSON array. No markdown, no preamble. Each object must have exactly:
- "id": string (e.g. "ai-1")
- "type": one of "correlation" | "dominance" | "outlier" | "missing" | "distribution" | "general"
- "severity": one of "highlight" | "warning" | "info"
- "title": short title (max 8 words)
- "body": 1–3 sentences in plain English, grounded in the numbers

Prioritise actionable findings. Flag data quality issues, surprising patterns, and modelling considerations.`;

// ── Compact payload ───────────────────────────────────────────────────────────

function buildPayload(
  columns: ColumnMeta[],
  stats: Record<string, ColumnStats>,
  correlations: CorrelationResult[],
  rowCount: number
): string {
  const num = columns
    .filter((c) => c.type === "numeric")
    .map((c) => {
      const s = stats[c.name] as NumericStats;
      if (!s) return null;
      return `${c.name}: mean=${s.mean.toFixed(2)}, median=${s.median.toFixed(2)}, std=${s.std.toFixed(2)}, min=${s.min}, max=${s.max}, skew=${s.skewness.toFixed(2)}, missing=${c.missingCount}`;
    }).filter(Boolean).join("\n");

  const cat = columns
    .filter((c) => c.type === "categorical")
    .map((c) => {
      const s = stats[c.name] as CategoricalStats;
      if (!s) return null;
      const top = s.frequencies.slice(0, 4).map((f) => `${f.value}(${f.count})`).join(", ");
      return `${c.name}: top=[${top}], dominant=${(s.mostCommonPct * 100).toFixed(1)}%, entropy=${s.entropy.toFixed(2)}, missing=${c.missingCount}`;
    }).filter(Boolean).join("\n");

  const corrs = correlations
    .filter((c) => c.significant && Math.abs(c.r) >= 0.4)
    .slice(0, 10)
    .map((c) => `${c.colA} ↔ ${c.colB}: r=${c.r.toFixed(2)}, p=${c.pValue < 0.001 ? "<0.001" : c.pValue.toFixed(3)}`)
    .join("\n");

  return `Dataset: ${rowCount} rows, ${columns.length} columns\n\nNUMERIC:\n${num || "(none)"}\n\nCATEGORICAL:\n${cat || "(none)"}\n\nSIGNIFICANT CORRELATIONS:\n${corrs || "(none)"}`;
}

// ── Validate parsed response ──────────────────────────────────────────────────

function validateInsights(raw: string): Insight[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed: Insight[] = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty response");
  const valid = parsed.filter(
    (i) =>
      typeof i.id === "string" &&
      typeof i.title === "string" &&
      typeof i.body === "string" &&
      ["correlation","dominance","outlier","missing","distribution","general"].includes(i.type) &&
      ["highlight","warning","info"].includes(i.severity)
  );
  if (valid.length === 0) throw new Error("No valid insights");
  return valid;
}

// ── Single proxy call — all providers go through /api/ai ─────────────────────
// Avoids CORS errors: the Next.js server forwards the request to the upstream
// provider, so no direct browser→provider fetch ever happens.

async function callProvider(provider: AIProvider, cfg: ProviderConfig, key: string, userMsg: string): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      apiKey: key,
      model: cfg.model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!res.ok) {
    throw new Error("AI insights are temporarily unavailable.");
  }

  const data = await res.json();

  // Normalise response shape across providers
  if (provider === "claude")  return data?.content?.[0]?.text ?? "";
  if (provider === "gemini")  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return data?.choices?.[0]?.message?.content ?? ""; // openai + groq
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateAiInsights(
  provider: AIProvider,
  cfg: ProviderConfig,
  apiKey: string,
  columns: ColumnMeta[],
  stats: Record<string, ColumnStats>,
  correlations: CorrelationResult[],
  rowCount: number
): Promise<{ insights: Insight[]; source: "ai" | "rules" }> {
  const rulesInsights = ruleBasedInsights(columns, stats, correlations);
  if (!apiKey) return { insights: rulesInsights, source: "rules" };

  try {
    const userMsg = buildPayload(columns, stats, correlations, rowCount);
    const raw = await callProvider(provider, cfg, apiKey, userMsg);
    const insights = validateInsights(raw);
    return { insights, source: "ai" };
  } catch {
    console.warn(`[AI insights][${provider}] Falling back to rule-based insights.`);
    return { insights: rulesInsights, source: "rules" };
  }
}
