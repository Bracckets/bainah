// ─── Statistics Engine ───────────────────────────────────────────────────────
// All estimators use sample (n-1) denominators — correct for data samples.

import { ColumnMeta, NumericStats, CategoricalStats, ColumnStats } from '@/types/dataset';

// ── Null-like value detection ─────────────────────────────────────────────────
// Catches '', 'N/A', 'NA', 'null', 'NULL', 'none', 'None', '-', '?', 'NaN'
const NULL_PATTERNS = /^(|n\/?a|null|none|-|\?|nan)$/i;
export function isMissing(v: string): boolean {
  return NULL_PATTERNS.test(v.trim());
}

// ── Numeric helpers ───────────────────────────────────────────────────────────

export function toNumbers(values: string[]): number[] {
  return values
    .filter((v) => !isMissing(v))
    .map((v) => parseFloat(v.replace(/,/g, '')))
    .filter((n) => isFinite(n));
}

export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Sample standard deviation — Bessel's correction (n-1)
export function stdDev(nums: number[], avg?: number): number {
  if (nums.length < 2) return 0;
  const m = avg ?? mean(nums);
  const variance = nums.reduce((acc, n) => acc + (n - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

// Percentile via linear interpolation (same as numpy default)
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Moment-based skewness: adjusted Fisher-Pearson standardized moment
export function skewness(nums: number[], avg: number, s: number): number {
  if (nums.length < 3 || s === 0) return 0;
  const n = nums.length;
  const m3 = nums.reduce((acc, x) => acc + ((x - avg) / s) ** 3, 0) / n;
  // Bias correction
  return (n / ((n - 1) * (n - 2))) * m3 * n;
}

// Excess kurtosis (Fisher's definition — normal distribution = 0)
export function excessKurtosis(nums: number[], avg: number, s: number): number {
  if (nums.length < 4 || s === 0) return 0;
  const n = nums.length;
  const m4 = nums.reduce((acc, x) => acc + ((x - avg) / s) ** 4, 0) / n;
  return m4 - 3;
}

// Freedman-Diaconis bin count — robust to outliers
function fdBinCount(nums: number[], iqr: number): number {
  if (iqr === 0) return 10;
  const h = 2 * iqr * Math.pow(nums.length, -1 / 3);
  const range = Math.max(...nums) - Math.min(...nums);
  const bins = Math.round(range / h);
  return Math.min(Math.max(bins, 5), 50); // clamp 5–50
}

function buildHistogram(
  nums: number[],
  iqr: number
): { bin: string; count: number }[] {
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ bin: String(min), count: nums.length }];

  const binCount = fdBinCount(nums, iqr);
  const binSize = (max - min) / binCount;

  const bins = Array.from({ length: binCount }, (_, i) => ({
    bin: `${(min + i * binSize).toFixed(2)}`,
    count: 0,
  }));

  nums.forEach((n) => {
    const idx = Math.min(Math.floor((n - min) / binSize), binCount - 1);
    bins[idx].count++;
  });

  return bins;
}

// ── Categorical helpers ───────────────────────────────────────────────────────

function buildFrequencies(values: string[]): { value: string; count: number }[] {
  const freq: Record<string, number> = {};
  values.filter((v) => !isMissing(v)).forEach((v) => {
    freq[v] = (freq[v] ?? 0) + 1;
  });
  return Object.entries(freq)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// Shannon entropy in bits — measures diversity of categories
function shannonEntropy(freqs: { value: string; count: number }[], total: number): number {
  if (total === 0) return 0;
  return freqs.reduce((acc, { count }) => {
    const p = count / total;
    return p > 0 ? acc - p * Math.log2(p) : acc;
  }, 0);
}

// ── Main export ───────────────────────────────────────────────────────────────

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

      const sorted = [...nums].sort((a, b) => a - b);
      const avg = mean(nums);
      const s = stdDev(nums, avg);
      const q1 = percentile(sorted, 25);
      const q3 = percentile(sorted, 75);
      const iqr = q3 - q1;

      result[col.name] = {
        mean: avg,
        median: median(nums),
        std: s,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        q1,
        q3,
        iqr,
        skewness: skewness(nums, avg, s),
        kurtosis: excessKurtosis(nums, avg, s),
        histogram: buildHistogram(nums, iqr),
      } satisfies NumericStats;

    } else if (col.type === 'categorical') {
      const freqs = buildFrequencies(rawValues);
      const total = rawValues.filter((v) => !isMissing(v)).length;
      const mostCommon = freqs[0]?.value ?? '';
      const mostCommonPct = total > 0 ? (freqs[0]?.count ?? 0) / total : 0;
      result[col.name] = {
        frequencies: freqs,
        mostCommon,
        mostCommonPct,
        entropy: shannonEntropy(freqs, total),
      } satisfies CategoricalStats;
    }
  }

  return result;
}
