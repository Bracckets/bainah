"use client";

import { PredictionResult, ParsedDataset } from "@/types/dataset";

interface Props {
  result: PredictionResult;
  dataset: ParsedDataset;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExportPanel({ result, dataset }: Props) {
  const exportPredictions = () => {
    const header =
      result.taskType === "regression"
        ? "row_index,actual,predicted,error\n"
        : "row_index,actual_class,predicted_class,correct\n";

    const body = result.predictions
      .map((row) =>
        result.taskType === "regression"
          ? `${row.rowIndex},${row.actual.toFixed(4)},${row.predicted.toFixed(
              4
            )},${row.error.toFixed(4)}`
          : `${row.rowIndex},${row.actual},${row.predicted},${row.error === 0 ? 1 : 0}`
      )
      .join("\n");

    downloadCSV(header + body, `predictions_${result.target}.csv`);
  };

  const exportDataset = () => {
    const columns = dataset.columns.map((column) => column.name);
    const header = `${columns.map((column) => `"${column}"`).join(",")}\n`;
    const body = dataset.rows
      .map((row) =>
        columns
          .map((column) => {
            const value = row[column] ?? "";
            return value.includes(",") || value.includes('"')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      )
      .join("\n");

    downloadCSV(header + body, "dataset_export.csv");
  };

  const copyApiSnippet = async () => {
    const snippet = `// Example API shape for server-side prediction
// POST /api/predict
// Body: { target: "${result.target}", rows: [...] }
// Response: { predictions: [{ rowIndex, predicted }] }
`;

    await navigator.clipboard.writeText(snippet);
  };

  return (
    <div className="export-panel">
      <h3 className="sub-title">Export and handoff</h3>
      <div className="export-buttons">
        <button className="export-btn" onClick={exportPredictions}>
          Download prediction CSV
          <span className="export-btn-sub">
            {result.predictions.length} result rows
          </span>
        </button>
        <button className="export-btn" onClick={exportDataset}>
          Download dataset CSV
          <span className="export-btn-sub">{dataset.rowCount} source rows</span>
        </button>
        <button
          className="export-btn export-btn--secondary"
          onClick={copyApiSnippet}
        >
          Copy API handoff stub
          <span className="export-btn-sub">Clipboard</span>
        </button>
      </div>
    </div>
  );
}
