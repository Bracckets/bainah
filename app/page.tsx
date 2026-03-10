"use client";
// ─── page.tsx — BAINAH | بيّنة ────────────────────────────────────────────────

import { useState } from "react";
import HomeContent from "@/components/HomeContent";
import { parseCSV } from "@/lib/csvParser";
import { classifyColumns } from "@/lib/columnClassifier";
import { computeStats } from "@/lib/statisticsEngine";
import { computeCorrelations } from "@/lib/correlationEngine";
import { generateInsights } from "@/lib/insightGenerator";
import { detectAnomalies } from "@/lib/anomalyDetector";
import { ParsedDataset } from "@/types/dataset";

export default function Home() {
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState("");

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setDataset(null);
    setFilename(file.name);

    try {
      const rows = await parseCSV(file);
      if (rows.length === 0) throw new Error("The CSV appears to be empty.");

      const columnNames = Object.keys(rows[0]);
      const columns = classifyColumns(rows, columnNames);
      const stats = computeStats(rows, columns);
      const correlations = computeCorrelations(rows, columns);
      const insights = generateInsights(columns, stats, correlations);
      const anomalies = detectAnomalies(rows, columns);

      setDataset({
        rows,
        columns,
        rowCount: rows.length,
        colCount: columnNames.length,
        stats,
        correlations,
        insights,
        anomalies,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <HomeContent
      dataset={dataset}
      loading={loading}
      error={error}
      filename={filename}
      onFile={handleFile}
    />
  );
}
