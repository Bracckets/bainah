'use client';
// ─── DatasetSummary ───────────────────────────────────────────────────────────

import { ParsedDataset } from '@/types/dataset';

const TYPE_COLORS: Record<string, string> = {
  numeric: 'var(--tag-numeric)',
  categorical: 'var(--tag-cat)',
  datetime: 'var(--tag-date)',
  text: 'var(--tag-text)',
};

interface Props { dataset: ParsedDataset }

export default function DatasetSummary({ dataset }: Props) {
  const totalMissing = dataset.columns.reduce((a, c) => a + c.missingCount, 0);

  return (
    <section className="card">
      <h2 className="section-title">Dataset Overview</h2>
      <div className="stat-grid">
        <StatBox label="Rows" value={dataset.rowCount.toLocaleString()} />
        <StatBox label="Columns" value={dataset.colCount.toString()} />
        <StatBox label="Missing Values" value={totalMissing.toString()} warn={totalMissing > 0} />
        <StatBox label="Numeric Cols" value={dataset.columns.filter(c => c.type === 'numeric').length.toString()} />
      </div>

      <div className="col-table-wrap">
        <table className="col-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Unique</th>
              <th>Missing</th>
            </tr>
          </thead>
          <tbody>
            {dataset.columns.map((col) => (
              <tr key={col.name}>
                <td className="col-name">{col.name}</td>
                <td>
                  <span className="type-tag" style={{ background: TYPE_COLORS[col.type] }}>
                    {col.type}
                  </span>
                </td>
                <td>{col.uniqueCount}</td>
                <td style={{ color: col.missingCount > 0 ? 'var(--warn)' : undefined }}>
                  {col.missingCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatBox({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="stat-box">
      <span className="stat-value" style={{ color: warn ? 'var(--warn)' : undefined }}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
