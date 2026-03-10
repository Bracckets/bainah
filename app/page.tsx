"use client";
// ─── page.tsx — BAINAH | بيّنة ────────────────────────────────────────────────

import { useState } from "react";
import HomeContent from "@/components/HomeContent";
import SheetPicker from "@/components/SheetPicker";
import { parseFile } from "@/lib/fileParser";
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  const processFile = async (file: File, sheetName?: string) => {
    setLoading(true);
    setError(null);
    setDataset(null);
    setFilename(file.name);

    try {
      const result = await parseFile(file, sheetName);

      // If sheets available, show sheet picker
      if (result.type === "sheets") {
        setPendingFile(file);
        setSheetNames(result.names);
        setLoading(false);
        return;
      }

      // Process rows
      const rows = result.data;
      if (rows.length === 0) throw new Error("The file appears to be empty.");

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
      setPendingFile(null);
      setSheetNames([]);
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
    if (pendingFile) {
      setSheetNames([]);
      processFile(pendingFile, sheetName);
    }
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
        onFile={handleFile}
      />
    </>
  );
}
