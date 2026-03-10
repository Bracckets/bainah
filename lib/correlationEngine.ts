// ─── Correlation Engine ───────────────────────────────────────────────────────
// Pearson r + two-tailed p-value using t-distribution approximation.

import { ColumnMeta, CorrelationResult } from '@/types/dataset';
import { mean } from './statisticsEngine';

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
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

// Two-tailed p-value for Pearson r under H0: r = 0
// Uses t = r * sqrt(n-2) / sqrt(1-r²), df = n-2
// Approximated via regularized incomplete beta function (Abramowitz & Stegun).
function pValueFromR(r: number, n: number): number {
  if (n < 3) return 1;
  const rClamped = Math.min(Math.max(r, -0.9999999), 0.9999999);
  const t = rClamped * Math.sqrt(n - 2) / Math.sqrt(1 - rClamped * rClamped);
  const df = n - 2;
  // betai approximation for t-distribution CDF
  const x = df / (df + t * t);
  const p = incompleteBeta(df / 2, 0.5, x);
  return Math.min(Math.max(p, 0), 1); // two-tailed, betai already gives it
}

// Regularized incomplete beta function I_x(a, b) via continued fraction
// Sufficient accuracy for p-value display purposes
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  // Use Lentz continued fraction
  const MAXITER = 200;
  const EPS = 1e-10;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXITER; m++) {
    // Even step
    let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    h *= d * c;
    // Odd step
    num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  // Use symmetry: if x > (a/(a+b)) use 1 - I(1-x)(b,a)
  if (x > (a / (a + b))) {
    return 1 - front * h;
  }
  return front * h;
}

// Stirling-series log-gamma (accurate to ~1e-12)
function lgamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) { ser += ci / ++y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
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

      const pairs: [number, number][] = rows
        .map((r) => [
          parseFloat(r[colA]?.replace(/,/g, '') ?? ''),
          parseFloat(r[colB]?.replace(/,/g, '') ?? ''),
        ] as [number, number])
        .filter(([a, b]) => isFinite(a) && isFinite(b));

      if (pairs.length < 3) continue;

      const xs = pairs.map(([a]) => a);
      const ys = pairs.map(([, b]) => b);
      const r = pearson(xs, ys);
      const n = pairs.length;
      const pValue = pValueFromR(r, n);

      results.push({
        colA,
        colB,
        r: parseFloat(r.toFixed(4)),
        pValue: parseFloat(pValue.toFixed(4)),
        n,
        significant: pValue < 0.05,
      });
    }
  }

  return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}
