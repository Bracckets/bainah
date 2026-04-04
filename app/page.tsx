"use client";

import { useEffect, useRef, useState } from "react";
import HomeContent from "@/components/HomeContent";
import SheetPicker from "@/components/SheetPicker";
import { parseFile } from "@/lib/fileParser";
import { classifyColumns } from "@/lib/columnClassifier";
import { generateInsights } from "@/lib/insightGenerator";
import { generateAiInsights } from "@/lib/aiInsightGenerator";
import {
  exportDataAgentPrompt,
  type PreparedPromptTextFile,
} from "@/lib/aiPromptExport";
import { buildPreparedDataset } from "@/lib/dataPrep";
import { ApiKeyProvider, useApiKey } from "@/lib/ApiKeyContext";
import { ParsedDataset, ColumnMeta, DataPrepConfig, MissingValueStrategy, ColumnType } from "@/types/dataset";

const DEFAULT_PREP_CONFIG: DataPrepConfig = {
  hiddenColumns: [],
  typeOverrides: {},
  missingStrategy: "keep",
};

function PageInner() {
  const { apiKey, provider, providerConfig, hasKey } = useApiKey();
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [sourceRows, setSourceRows] = useState<Record<string, string>[]>([]);
  const [sourceColumnNames, setSourceColumnNames] = useState<string[]>([]);
  const [sourceColumns, setSourceColumns] = useState<ColumnMeta[]>([]);
  const [prepConfig, setPrepConfig] = useState<DataPrepConfig>(DEFAULT_PREP_CONFIG);
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
    if (sourceRows.length === 0 || sourceColumnNames.length === 0) return;

    try {
      const nextDataset = buildPreparedDataset(sourceRows, sourceColumnNames, prepConfig);
      setDataset(nextDataset);
      setError(null);
      setInsightSource("rules");
    } catch (e: unknown) {
      setDataset(null);
      setInsightSource(null);
      setError(e instanceof Error ? e.message : "Unable to apply data prep.");
    }
  }, [sourceRows, sourceColumnNames, prepConfig]);

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
      setSourceRows(rows);
      setSourceColumnNames(columnNames);
      setSourceColumns(classifyColumns(rows, columnNames));
      setPrepConfig(DEFAULT_PREP_CONFIG);
      setPendingFile(null);
      setSheetNames([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error occurred.");
      setSourceRows([]);
      setSourceColumnNames([]);
      setSourceColumns([]);
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

  const handleTogglePrepColumn = (columnName: string) => {
    setPrepConfig((current) => ({
      ...current,
      hiddenColumns: current.hiddenColumns.includes(columnName)
        ? current.hiddenColumns.filter((entry) => entry !== columnName)
        : [...current.hiddenColumns, columnName],
    }));
  };

  const handleTypeOverrideChange = (columnName: string, nextType: ColumnType | "") => {
    setPrepConfig((current) => {
      const nextOverrides = { ...current.typeOverrides };
      const sourceType = sourceColumns.find((column) => column.name === columnName)?.type;
      if (!nextType) {
        delete nextOverrides[columnName];
      } else if (nextType === sourceType) {
        delete nextOverrides[columnName];
      } else {
        nextOverrides[columnName] = nextType;
      }

      return {
        ...current,
        typeOverrides: nextOverrides,
      };
    });
  };

  const handleMissingStrategyChange = (strategy: MissingValueStrategy) => {
    setPrepConfig((current) => ({
      ...current,
      missingStrategy: strategy,
    }));
  };

  const handleResetPrep = () => {
    setPrepConfig(DEFAULT_PREP_CONFIG);
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
        sourceColumns={sourceColumns}
        prepConfig={prepConfig}
        onTogglePrepColumn={handleTogglePrepColumn}
        onTypeOverrideChange={handleTypeOverrideChange}
        onMissingStrategyChange={handleMissingStrategyChange}
        onResetPrep={handleResetPrep}
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
