// ─── Statistics Engine ───────────────────────────────────────────────────────
// Computes descriptive statistics for numeric and categorical columns.

import { ColumnMeta, NumericStats, CategoricalStats, ColumnStats } from '@/types/dataset';

// ── Numeric helpers ──────────────────────────────────────────────────────────

export function toNumbers(values: string[]): number[] {
  return values
    .map((v) => parseFloat(v.replace(/,/g, '')))
    .filter((n) => !isNaN(n));
}

export function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function stdDev(nums: number[], avg?: number): number {
  const m = avg ?? mean(nums);
  const variance = nums.reduce((acc, n) => acc + (n - m) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function buildHistogram(nums: number[], binCount = 10): { bin: string; count: number }[] {
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ bin: String(min), count: nums.length }];

  const binSize = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    bin: `${(min + i * binSize).toFixed(1)}`,
    count: 0,
  }));

  nums.forEach((n) => {
    const idx = Math.min(Math.floor((n - min) / binSize), binCount - 1);
    bins[idx].count++;
  });

  return bins;
}

// ── Categorical helpers ──────────────────────────────────────────────────────

function buildFrequencies(values: string[]): { value: string; count: number }[] {
  const freq: Record<string, number> = {};
  values.filter((v) => v.trim() !== '').forEach((v) => {
    freq[v] = (freq[v] ?? 0) + 1;
  });
  return Object.entries(freq)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // cap at top 20
}

// ── Main export ──────────────────────────────────────────────────────────────

export function computeStats(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): Record<string, ColumnStats> {
  const result: Record<string, ColumnStats> = {};

  for (const col of columns) {
    const rawValues = rows.map((r) => r[col.name] ?? '');

    if (col.type === 'numeric') {
      const nums = toNumbers(rawValues);
      if (nums.length === 0) continue;
      const avg = mean(nums);
      result[col.name] = {
        mean: avg,
        median: median(nums),
        std: stdDev(nums, avg),
        min: Math.min(...nums),
        max: Math.max(...nums),
        histogram: buildHistogram(nums),
      } satisfies NumericStats;
    } else if (col.type === 'categorical') {
      const freqs = buildFrequencies(rawValues);
      const total = rawValues.filter((v) => v.trim() !== '').length;
      const mostCommon = freqs[0]?.value ?? '';
      const mostCommonPct = total > 0 ? (freqs[0]?.count ?? 0) / total : 0;
      result[col.name] = { frequencies: freqs, mostCommon, mostCommonPct } satisfies CategoricalStats;
    }
  }

  return result;
}
