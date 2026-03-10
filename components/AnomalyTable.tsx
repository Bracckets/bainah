'use client';
// ─── AnomalyTable ─────────────────────────────────────────────────────────────
// Shows anomalies detected by IQR (Tukey fences, robust) and Z-score methods.

import { AnomalyRow } from '@/types/dataset';

interface Props { anomalies: AnomalyRow[] }

export default function AnomalyTable({ anomalies }: Props) {
  if (anomalies.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">Anomalies Detected</h2>
        <p className="empty-state">✓ No outliers detected by IQR (1.5×IQR) or Z-score (|z| &gt; 3) methods.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="section-title">Anomalies Detected</h2>
      <p className="section-sub">
        {anomalies.length} outlier{anomalies.length !== 1 ? 's' : ''} found.
        {' '}<strong>IQR method</strong> (Tukey 1.5×IQR fences) is distribution-free and robust to skew.
        {' '}<strong>Z-score</strong> (|z| &gt; 3) assumes approximate normality — treat with caution on skewed columns.
      </p>
      <div className="col-table-wrap">
        <table className="col-table">
          <thead>
            <tr>
              <th>Row #</th>
              <th>Column</th>
              <th>Value</th>
              <th>Z-Score</th>
              <th>IQR Outlier</th>
              <th>Z Outlier</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.slice(0, 50).map((a, i) => {
              const absZ = Math.abs(a.zScore);
              const zColor = absZ > 5 ? 'var(--warn)' : absZ > 4 ? '#f59e0b' : 'var(--muted)';
              return (
                <tr key={i}>
                  <td>{a.rowIndex + 1}</td>
                  <td className="col-name">{a.column}</td>
                  <td>{a.value.toLocaleString()}</td>
                  <td style={{ color: zColor, fontFamily: 'var(--font-mono)' }}>
                    {a.zScore > 0 ? '+' : ''}{a.zScore.toFixed(3)}
                  </td>
                  <td>
                    {a.iqrOutlier
                      ? <span className="type-tag" style={{ background: 'rgba(224,92,92,0.25)', color: 'var(--warn)' }}>yes</span>
                      : <span className="type-tag" style={{ background: 'var(--surface2)' }}>no</span>}
                  </td>
                  <td>
                    {Math.abs(a.zScore) > 3
                      ? <span className="type-tag" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>yes</span>
                      : <span className="type-tag" style={{ background: 'var(--surface2)' }}>no</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {anomalies.length > 50 && (
        <p className="section-sub" style={{ marginTop: 8 }}>Showing first 50 of {anomalies.length} anomalies.</p>
      )}
    </section>
  );
}
