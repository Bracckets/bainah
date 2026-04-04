"use client";

import { useEffect, useRef, useState } from "react";
import HomeContent from "@/components/HomeContent";
import SheetPicker from "@/components/SheetPicker";
import { parseFile } from "@/lib/fileParser";
import { classifyColumns } from "@/lib/columnClassifier";
import { computeStats } from "@/lib/statisticsEngine";
import { computeCorrelations } from "@/lib/correlationEngine";
import { generateInsights } from "@/lib/insightGenerator";
import { generateAiInsights } from "@/lib/aiInsightGenerator";
import {
  exportDataAgentPrompt,
  type PreparedPromptTextFile,
} from "@/lib/aiPromptExport";
import { detectAnomalies } from "@/lib/anomalyDetector";
import { ApiKeyProvider, useApiKey } from "@/lib/ApiKeyContext";
import { ParsedDataset } from "@/types/dataset";

function PageInner() {
  const { apiKey, provider, providerConfig, hasKey } = useApiKey();
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [insightSource, setInsightSource] = useState<
    "ai" | "rules" | "loading" | null
  >(null);
  const aiRunRef = useRef(0);

  useEffect(() => {
    if (!dataset) return;

    const rulesOnly = generateInsights(
      dataset.columns,
      dataset.stats,
      dataset.correlations
    );

    if (!apiKey) {
      setDataset((prev) => (prev ? { ...prev, insights: rulesOnly } : prev));
      setInsightSource("rules");
      return;
    }

    const runId = ++aiRunRef.current;
    setInsightSource("loading");

    generateAiInsights(
      provider,
      providerConfig,
      apiKey,
      dataset.columns,
      dataset.stats,
      dataset.correlations,
      dataset.rowCount
    ).then(({ insights, source }) => {
      if (aiRunRef.current !== runId) return;
      setDataset((prev) => (prev ? { ...prev, insights } : prev));
      setInsightSource(source);
    });
  }, [
    apiKey,
    provider,
    providerConfig,
    dataset?.rowCount,
    dataset?.colCount,
    filename,
  ]);

  const processFile = async (file: File, sheetName?: string) => {
    setLoading(true);
    setError(null);
    setDataset(null);
    setInsightSource(null);
    setFilename(file.name);

    try {
      const result = await parseFile(file, sheetName);

      if (result.type === "sheets") {
        setPendingFile(file);
        setSheetNames(result.names);
        setLoading(false);
        return;
      }

      const rows = result.data;
      if (rows.length === 0) {
        throw new Error("The file appears to be empty.");
      }

      const columnNames = Object.keys(rows[0]);
      const columns = classifyColumns(rows, columnNames);
      const stats = computeStats(rows, columns);
      const correlations = computeCorrelations(rows, columns);
      const rulesOnly = generateInsights(columns, stats, correlations);
      const anomalies = detectAnomalies(rows, columns);

      const initialDataset: ParsedDataset = {
        rows,
        columns,
        rowCount: rows.length,
        colCount: columnNames.length,
        stats,
        correlations,
        insights: rulesOnly,
        anomalies,
      };

      setDataset(initialDataset);
      setPendingFile(null);
      setSheetNames([]);
      setInsightSource("rules");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error occurred.");
      setPendingFile(null);
      setSheetNames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    await processFile(file);
  };

  const handleSheetSelect = (sheetName: string) => {
    if (!pendingFile) return;
    setSheetNames([]);
    processFile(pendingFile, sheetName);
  };

  const handleGenerateAgentPrompt = async (): Promise<PreparedPromptTextFile> => {
    if (!dataset || !apiKey) {
      throw new Error("AI prompt export is temporarily unavailable.");
    }

    return exportDataAgentPrompt({
      dataset,
      filename,
      provider,
      providerConfig,
      apiKey,
      insightSource,
    });
  };

  return (
    <>
      {sheetNames.length > 0 && (
        <SheetPicker sheets={sheetNames} onSelect={handleSheetSelect} />
      )}
      <HomeContent
        dataset={dataset}
        loading={loading}
        error={error}
        filename={filename}
        insightSource={insightSource}
        providerId={provider}
        providerLabel={providerConfig.label}
        hasAiConnection={hasKey}
        onFile={handleFile}
        onGenerateAgentPrompt={handleGenerateAgentPrompt}
      />
    </>
  );
}

export default function Home() {
  return (
    <ApiKeyProvider>
      <PageInner />
    </ApiKeyProvider>
  );
}
