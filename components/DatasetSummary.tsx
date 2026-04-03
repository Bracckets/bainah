"use client";

import { ParsedDataset, NumericStats, CategoricalStats } from "@/types/dataset";

const TYPE_COLORS: Record<string, string> = {
  numeric: "var(--tag-numeric)",
  categorical: "var(--tag-cat)",
  datetime: "var(--tag-date)",
  text: "var(--tag-text)",
};

interface Props {
  dataset: ParsedDataset;
}

export default function DatasetSummary({ dataset }: Props) {
  const totalMissing = dataset.columns.reduce(
    (sum, column) => sum + column.missingCount,
    0
  );

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <p className="panel-kicker">Overview</p>
          <h2 className="panel-title">Structure and column health</h2>
        </div>
        <p className="panel-note">
          Scan row counts, type mix, and column-level summaries before drilling
          into charts or model outputs.
        </p>
      </div>

      <div className="stat-grid">
        <StatBox label="Rows" value={dataset.rowCount.toLocaleString()} />
        <StatBox label="Columns" value={String(dataset.colCount)} />
        <StatBox
          label="Missing values"
          value={String(totalMissing)}
          warn={totalMissing > 0}
        />
        <StatBox
          label="Numeric cols"
          value={String(
            dataset.columns.filter((column) => column.type === "numeric").length
          )}
        />
      </div>

      <div className="column-mobile-list">
        {dataset.columns.map((column) => {
          const summary = buildSummary(column.name, column.type, dataset.stats);
          return (
            <details key={column.name} className="column-mobile-item">
              <summary className="column-mobile-summary">
                <div>
                  <p className="column-mobile-name">{column.name}</p>
                  <p className="column-mobile-meta">
                    {column.uniqueCount} unique · {column.missingCount} missing
                  </p>
                </div>
                <span
                  className="type-tag"
                  style={{ background: TYPE_COLORS[column.type] }}
                >
                  {column.type}
                </span>
              </summary>
              <div className="column-mobile-body">
                <p>{summary}</p>
              </div>
            </details>
          );
        })}
      </div>

      <div className="col-table-wrap column-table-desktop">
        <table className="col-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Unique</th>
              <th>Missing</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {dataset.columns.map((column) => (
              <tr key={column.name}>
                <td className="col-name">{column.name}</td>
                <td>
                  <span
                    className="type-tag"
                    style={{ background: TYPE_COLORS[column.type] }}
                  >
                    {column.type}
                  </span>
                </td>
                <td>{column.uniqueCount}</td>
                <td
                  style={{
                    color: column.missingCount > 0 ? "var(--warn)" : undefined,
                  }}
                >
                  {column.missingCount}
                </td>
                <td className="summary-cell">
                  {buildSummary(column.name, column.type, dataset.stats)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildSummary(
  columnName: string,
  columnType: string,
  stats: ParsedDataset["stats"]
) {
  const current = stats[columnName];
  if (!current) return "No summary available.";

  if (columnType === "numeric") {
    const numeric = current as NumericStats;
    return `Mean ${numeric.mean.toFixed(2)}, std ${numeric.std.toFixed(
      2
    )}, IQR ${numeric.q1.toFixed(2)} to ${numeric.q3.toFixed(2)}.`;
  }

  if (columnType === "categorical") {
    const categorical = current as CategoricalStats;
    return `Top value "${categorical.mostCommon}" at ${(
      categorical.mostCommonPct * 100
    ).toFixed(1)}%, entropy ${categorical.entropy.toFixed(2)}.`;
  }

  if (columnType === "datetime") {
    return "Detected as date-like values and included in structure-only summaries.";
  }

  return "Long-form text column, excluded from charting and predictive baselines.";
}

function StatBox({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  const isSingleToken = !/\s/.test(value);

  return (
    <div className="stat-stack">
      <div className="stat-box">
        <span
          className={`stat-value ${isSingleToken ? "stat-value--single-token" : ""}`}
          style={{ color: warn ? "var(--warn)" : undefined }}
        >
          {value}
        </span>
      </div>
      <span className="stat-label stat-label--outside">{label}</span>
    </div>
  );
}
