"use client";

import { AnomalyRow } from "@/types/dataset";

interface Props {
  anomalies: AnomalyRow[];
}

export default function AnomalyTable({ anomalies }: Props) {
  if (anomalies.length === 0) {
    return (
      <section className="workspace-panel">
        <div className="workspace-panel-head">
          <div>
            <p className="panel-kicker">Anomalies</p>
            <h2 className="panel-title">No outliers flagged</h2>
          </div>
          <p className="panel-note">
            This dataset did not trigger the current IQR and Z-score rules.
          </p>
        </div>
        <p className="empty-state">
          No rows crossed the current anomaly thresholds.
        </p>
      </section>
    );
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <p className="panel-kicker">Anomalies</p>
          <h2 className="panel-title">Review flagged rows</h2>
        </div>
        <p className="panel-note">
          {anomalies.length} rows or values were flagged by at least one of the
          current anomaly checks.
        </p>
      </div>

      <p className="section-sub">
        IQR is robust to skew. Z-score is useful for roughly normal numeric
        columns, but treat it carefully on long-tailed data.
      </p>

      <div className="anomaly-mobile-list">
        {anomalies.slice(0, 50).map((anomaly, index) => (
          <div key={`${anomaly.column}-${anomaly.rowIndex}-${index}`} className="anomaly-mobile-card">
            <div className="anomaly-mobile-head">
              <p className="column-mobile-name">{anomaly.column}</p>
              <span className="type-tag">
                Row {anomaly.rowIndex + 1}
              </span>
            </div>
            <p className="anomaly-mobile-value">
              Value {anomaly.value.toLocaleString()}
            </p>
            <p className="anomaly-mobile-meta">
              Z-score {anomaly.zScore > 0 ? "+" : ""}
              {anomaly.zScore.toFixed(3)}
            </p>
            <div className="anomaly-tags">
              <span
                className="type-tag"
                style={{
                  background: anomaly.iqrOutlier
                    ? "rgba(208, 111, 100, 0.18)"
                    : "var(--surface-subtle)",
                  color: anomaly.iqrOutlier ? "var(--warn)" : "var(--muted)",
                }}
              >
                {anomaly.iqrOutlier ? "IQR outlier" : "Not IQR"}
              </span>
              <span
                className="type-tag"
                style={{
                  background:
                    Math.abs(anomaly.zScore) > 3
                      ? "rgba(215, 194, 135, 0.18)"
                      : "var(--surface-subtle)",
                  color:
                    Math.abs(anomaly.zScore) > 3
                      ? "var(--accent)"
                      : "var(--muted)",
                }}
              >
                {Math.abs(anomaly.zScore) > 3 ? "Z outlier" : "Not Z"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="col-table-wrap column-table-desktop">
        <table className="col-table">
          <thead>
            <tr>
              <th>Row</th>
              <th>Column</th>
              <th>Value</th>
              <th>Z-score</th>
              <th>IQR flag</th>
              <th>Z flag</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.slice(0, 50).map((anomaly, index) => {
              const absZ = Math.abs(anomaly.zScore);
              const zColor =
                absZ > 5 ? "var(--warn)" : absZ > 4 ? "#D7C287" : "var(--muted)";

              return (
                <tr key={`${anomaly.column}-${anomaly.rowIndex}-${index}`}>
                  <td>{anomaly.rowIndex + 1}</td>
                  <td className="col-name">{anomaly.column}</td>
                  <td>{anomaly.value.toLocaleString()}</td>
                  <td style={{ color: zColor, fontFamily: "var(--font-mono)" }}>
                    {anomaly.zScore > 0 ? "+" : ""}
                    {anomaly.zScore.toFixed(3)}
                  </td>
                  <td>{anomaly.iqrOutlier ? "Yes" : "No"}</td>
                  <td>{Math.abs(anomaly.zScore) > 3 ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {anomalies.length > 50 && (
        <p className="section-sub">Showing the first 50 of {anomalies.length} flagged rows.</p>
      )}
    </section>
  );
}
