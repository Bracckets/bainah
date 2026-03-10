"use client";
// ─── AnomalyTable ─────────────────────────────────────────────────────────────

import { AnomalyRow } from "@/types/dataset";
import { useState } from "react";

interface Props {
  anomalies: AnomalyRow[];
}

export default function AnomalyTable({ anomalies }: Props) {
  const [exporting, setExporting] = useState(false);

  const severity = (z: number) => {
    const abs = Math.abs(z);
    if (abs > 5) return "high";
    if (abs > 4) return "medium";
    return "low";
  };

  const exportToCSV = () => {
    const headers = ["Row #", "Column", "Value", "Z-Score", "Severity"];
    const rows = anomalies.map((a) => [
      a.rowIndex + 1,
      a.column,
      a.value,
      a.zScore.toFixed(3),
      severity(a.zScore),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "anomalies.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const data = anomalies.map((a) => ({
      rowNumber: a.rowIndex + 1,
      column: a.column,
      value: a.value,
      zScore: parseFloat(a.zScore.toFixed(3)),
      severity: severity(a.zScore),
    }));

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "anomalies.json");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (anomalies.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">Anomalies Detected</h2>
        <p className="empty-state">
          ✓ No anomalies detected (|z-score| ≤ 3 for all values).
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <h2 className="section-title">Anomalies Detected</h2>
          <p className="section-sub">
            {anomalies.length} anomalous value
            {anomalies.length !== 1 ? "s" : ""} found using Z-score method
            (threshold: |z| &gt; 3).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportToCSV}
            disabled={exporting}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "14px",
              opacity: exporting ? 0.6 : 1,
            }}
          >
            Export CSV
          </button>
          <button
            onClick={exportToJSON}
            disabled={exporting}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "14px",
              opacity: exporting ? 0.6 : 1,
            }}
          >
            Export JSON
          </button>
        </div>
      </div>
      <div className="col-table-wrap">
        <table className="col-table">
          <thead>
            <tr>
              <th>Row #</th>
              <th>Column</th>
              <th>Value</th>
              <th>Z-Score</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.slice(0, 50).map((a, i) => {
              const sev = severity(a.zScore);
              const color =
                sev === "high"
                  ? "var(--warn)"
                  : sev === "medium"
                    ? "#f59e0b"
                    : "var(--muted)";
              return (
                <tr key={i}>
                  <td>{a.rowIndex + 1}</td>
                  <td className="col-name">{a.column}</td>
                  <td>{a.value.toLocaleString()}</td>
                  <td style={{ color }}>
                    {a.zScore > 0 ? "+" : ""}
                    {a.zScore.toFixed(3)}
                  </td>
                  <td>
                    <span className="type-tag" style={{ background: color }}>
                      {sev}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {anomalies.length > 50 && (
        <p className="section-sub" style={{ marginTop: 8 }}>
          Showing first 50 of {anomalies.length} anomalies. Exports include all{" "}
          {anomalies.length} anomalies.
        </p>
      )}
    </section>
  );
}
