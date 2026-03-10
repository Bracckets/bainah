// ─── Anomaly Detector ─────────────────────────────────────────────────────────
// Dual method: Z-score (assumes normality) + IQR (distribution-free, robust).
// IQR is the primary flag; Z-score is shown as supplementary info.

import { ColumnMeta, AnomalyRow } from '@/types/dataset';
import { toNumbers, mean, stdDev, percentile } from './statisticsEngine';

export function detectAnomalies(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): AnomalyRow[] {
  const anomalies: AnomalyRow[] = [];
  const numericCols = columns.filter((c) => c.type === 'numeric');

  for (const col of numericCols) {
    const allNums = toNumbers(rows.map((r) => r[col.name] ?? ''));
    if (allNums.length < 4) continue; // need reasonable sample for IQR

    const sorted = [...allNums].sort((a, b) => a - b);
    const q1 = percentile(sorted, 25);
    const q3 = percentile(sorted, 75);
    const iqr = q3 - q1;

    // IQR fences — Tukey's method (1.5 × IQR = mild, 3 × IQR = extreme)
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    // Z-score parameters (sample)
    const m = mean(allNums);
    const s = stdDev(allNums, m);

    rows.forEach((row, rowIndex) => {
      const raw = row[col.name];
      if (!raw || raw.trim() === '') return;
      const val = parseFloat(raw.replace(/,/g, ''));
      if (!isFinite(val)) return;

      const iqrOutlier = val < lowerFence || val > upperFence;
      const zScore = s > 0 ? (val - m) / s : 0;
      const zOutlier = Math.abs(zScore) > 3;

      // Flag if caught by either method
      if (iqrOutlier || zOutlier) {
        anomalies.push({
          rowIndex,
          column: col.name,
          value: val,
          zScore: parseFloat(zScore.toFixed(3)),
          iqrOutlier,
        });
      }
    });
  }

  // Sort by most extreme IQR deviation first
  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}
