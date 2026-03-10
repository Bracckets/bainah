// ─── Correlation Engine ──────────────────────────────────────────────────────
// Pearson correlation between all pairs of numeric columns.

import { ColumnMeta, CorrelationResult } from '@/types/dataset';
import { toNumbers, mean } from './statisticsEngine';

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

export function computeCorrelations(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): CorrelationResult[] {
  const numCols = columns.filter((c) => c.type === 'numeric');
  const results: CorrelationResult[] = [];

  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const colA = numCols[i].name;
      const colB = numCols[j].name;

      // Pair rows where both values are numeric
      const pairs: [number, number][] = rows
        .map((r) => [
          parseFloat(r[colA]?.replace(/,/g, '') ?? ''),
          parseFloat(r[colB]?.replace(/,/g, '') ?? ''),
        ] as [number, number])
        .filter(([a, b]) => !isNaN(a) && !isNaN(b));

      if (pairs.length < 2) continue;

      const xs = pairs.map(([a]) => a);
      const ys = pairs.map(([, b]) => b);
      const r = pearson(xs, ys);

      results.push({ colA, colB, r: parseFloat(r.toFixed(4)) });
    }
  }

  return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}
