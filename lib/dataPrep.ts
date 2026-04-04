import { classifyColumns } from "@/lib/columnClassifier";
import { computeStats, isMissing, median, toNumbers } from "@/lib/statisticsEngine";
import { computeCorrelations } from "@/lib/correlationEngine";
import { generateInsights } from "@/lib/insightGenerator";
import { detectAnomalies } from "@/lib/anomalyDetector";
import type {
  ColumnMeta,
  ColumnType,
  DataPrepConfig,
  MissingValueStrategy,
  ParsedDataset,
} from "@/types/dataset";

function applyTypeOverrides(
  columns: ColumnMeta[],
  typeOverrides: DataPrepConfig["typeOverrides"]
) {
  return columns.map((column) => ({
    ...column,
    type: (typeOverrides[column.name] ?? column.type) as ColumnType,
  }));
}

function projectVisibleRows(
  rows: Record<string, string>[],
  visibleColumnNames: string[]
) {
  return rows.map((row) =>
    Object.fromEntries(visibleColumnNames.map((columnName) => [columnName, row[columnName] ?? ""]))
  );
}

function buildFillPlan(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
) {
  const fillPlan: Partial<Record<string, string>> = {};

  columns.forEach((column) => {
    if (column.type === "numeric") {
      const numericValues = toNumbers(rows.map((row) => row[column.name] ?? ""));
      if (numericValues.length > 0) {
        fillPlan[column.name] = String(median(numericValues));
      }
      return;
    }

    if (column.type === "categorical" || column.type === "text") {
      const counts = new Map<string, number>();
      rows.forEach((row) => {
        const value = row[column.name] ?? "";
        if (isMissing(value)) return;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      });

      const mostCommon = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
      fillPlan[column.name] = mostCommon ?? "Missing";
    }
  });

  return fillPlan;
}

function applyMissingStrategy(
  rows: Record<string, string>[],
  columns: ColumnMeta[],
  missingStrategy: MissingValueStrategy
) {
  if (missingStrategy === "keep") {
    return rows;
  }

  if (missingStrategy === "drop-rows") {
    return rows.filter((row) =>
      columns.every((column) => !isMissing(row[column.name] ?? ""))
    );
  }

  const fillPlan = buildFillPlan(rows, columns);
  return rows.map((row) => {
    const nextRow = { ...row };
    columns.forEach((column) => {
      const currentValue = nextRow[column.name] ?? "";
      if (!isMissing(currentValue)) return;
      const fillValue = fillPlan[column.name];
      if (fillValue !== undefined) {
        nextRow[column.name] = fillValue;
      }
    });
    return nextRow;
  });
}

export function buildPreparedDataset(
  sourceRows: Record<string, string>[],
  sourceColumnNames: string[],
  prepConfig: DataPrepConfig
): ParsedDataset {
  const visibleColumnNames = sourceColumnNames.filter(
    (columnName) => !prepConfig.hiddenColumns.includes(columnName)
  );

  if (visibleColumnNames.length === 0) {
    throw new Error("At least one column must remain visible.");
  }

  const visibleRows = projectVisibleRows(sourceRows, visibleColumnNames);
  const initialColumns = applyTypeOverrides(
    classifyColumns(visibleRows, visibleColumnNames),
    prepConfig.typeOverrides
  );
  const preparedRows = applyMissingStrategy(
    visibleRows,
    initialColumns,
    prepConfig.missingStrategy
  );
  const finalColumns = applyTypeOverrides(
    classifyColumns(preparedRows, visibleColumnNames),
    prepConfig.typeOverrides
  );
  const stats = computeStats(preparedRows, finalColumns);
  const correlations = computeCorrelations(preparedRows, finalColumns);
  const insights = generateInsights(finalColumns, stats, correlations);
  const anomalies = detectAnomalies(preparedRows, finalColumns);

  return {
    rows: preparedRows,
    columns: finalColumns,
    rowCount: preparedRows.length,
    colCount: finalColumns.length,
    stats,
    correlations,
    insights,
    anomalies,
  };
}
