'use client';
// ─── DatasetSummary ───────────────────────────────────────────────────────────

import { ParsedDataset, NumericStats, CategoricalStats } from '@/types/dataset';

const TYPE_COLORS: Record<string, string> = {
  numeric:     'var(--tag-numeric)',
  categorical: 'var(--tag-cat)',
  datetime:    'var(--tag-date)',
  text:        'var(--tag-text)',
};

interface Props { dataset: ParsedDataset }

export default function DatasetSummary({ dataset }: Props) {
  const totalMissing = dataset.columns.reduce((a, c) => a + c.missingCount, 0);

  return (
    <section className="card">
      <h2 className="section-title">Dataset Overview</h2>
      <div className="stat-grid">
        <StatBox label="Rows"           value={dataset.rowCount.toLocaleString()} />
        <StatBox label="Columns"        value={dataset.colCount.toString()} />
        <StatBox label="Missing Values" value={totalMissing.toString()} warn={totalMissing > 0} />
        <StatBox label="Numeric Cols"   value={dataset.columns.filter(c => c.type === 'numeric').length.toString()} />
      </div>

      <div className="col-table-wrap">
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
            {dataset.columns.map((col) => {
              const s = dataset.stats[col.name];
              let summary = '—';
              if (s && col.type === 'numeric') {
                const ns = s as NumericStats;
                summary = `μ=${ns.mean.toFixed(2)}, σ=${ns.std.toFixed(2)}, IQR=[${ns.q1.toFixed(2)}, ${ns.q3.toFixed(2)}]`;
              } else if (s && col.type === 'categorical') {
                const cs = s as CategoricalStats;
                summary = `top: "${cs.mostCommon}" (${(cs.mostCommonPct * 100).toFixed(1)}%), H=${cs.entropy.toFixed(2)} bits`;
              }
              return (
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
                  <td style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{summary}</td>
                </tr>
              );
            })}
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
