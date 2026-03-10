// ─── Anomaly Detector ────────────────────────────────────────────────────────
// Flags rows where |z-score| > 3 for any numeric column.

import { ColumnMeta, AnomalyRow } from '@/types/dataset';
import { toNumbers, mean, stdDev } from './statisticsEngine';

export function detectAnomalies(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): AnomalyRow[] {
  const anomalies: AnomalyRow[] = [];
  const numericCols = columns.filter((c) => c.type === 'numeric');

  for (const col of numericCols) {
    const allNums = toNumbers(rows.map((r) => r[col.name] ?? ''));
    if (allNums.length < 2) continue;

    const m = mean(allNums);
    const s = stdDev(allNums, m);
    if (s === 0) continue;

    rows.forEach((row, rowIndex) => {
      const raw = row[col.name];
      if (!raw || raw.trim() === '') return;
      const val = parseFloat(raw.replace(/,/g, ''));
      if (isNaN(val)) return;
      const z = (val - m) / s;
      if (Math.abs(z) > 3) {
        anomalies.push({ rowIndex, column: col.name, value: val, zScore: parseFloat(z.toFixed(3)) });
      }
    });
  }

  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}
