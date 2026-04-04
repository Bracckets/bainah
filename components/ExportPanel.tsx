"use client";

import SystemIcon from "@/components/SystemIcon";
import { PredictionResult } from "@/types/dataset";

interface Props {
  result: PredictionResult;
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

export default function ExportPanel({ result }: Props) {
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
          : `${row.rowIndex},"${row.actualLabel ?? row.actual}","${row.predictedLabel ?? row.predicted}",${
              row.error === 0 ? 1 : 0
            }`
      )
      .join("\n");

    downloadCSV(header + body, `predictions_${result.target}.csv`);
  };

  return (
    <div className="export-panel">
      <div className="export-panel-head">
        <div>
          <p className="panel-kicker">Export and handoff</p>
          <h3 className="sub-title">Take the evaluated results with you</h3>
        </div>
        <p className="export-panel-note">
          Export every held-out prediction row while keeping the chart view lightweight.
        </p>
      </div>
      <div className="export-buttons">
        <button className="export-btn export-btn--primary" onClick={exportPredictions}>
          <span className="export-btn-icon">
            <SystemIcon name="download" size={16} />
          </span>
          <span className="export-btn-copy">
            <span className="export-btn-title">Download held-out predictions</span>
            <span className="export-btn-sub">
              {result.predictions.length} evaluated rows, 200 plotted in-app
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
