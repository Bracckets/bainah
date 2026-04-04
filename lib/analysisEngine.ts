// ─── Analysis Engine ──────────────────────────────────────────────────────────
// Pure-TS in-browser drivers + prediction pipeline.
// No Python backend needed — good enough for MVP / testing.

import { ParsedDataset, ColumnMeta, DriversAnalysis, DriverResult, PredictionResult, PredictionRow } from "@/types/dataset";
import { toNumbers } from "./statisticsEngine";

// ── helpers ───────────────────────────────────────────────────────────────────

function pearson(xs: number[], ys: number[]): { r: number; pValue: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { r: 0, pValue: 1 };
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const r = dx2 === 0 || dy2 === 0 ? 0 : num / Math.sqrt(dx2 * dy2);
  // t-distribution p-value approximation
  const t = r * Math.sqrt((n - 2) / Math.max(1 - r * r, 1e-12));
  const pValue = 2 * (1 - tCDF(Math.abs(t), n - 2));
  return { r: Math.max(-1, Math.min(1, r)), pValue };
}

/** Approximation of the Student-t CDF using regularised incomplete beta */
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

function incompleteBeta(a: number, b: number, x: number): number {
  // Continued-fraction approximation (Lentz)
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  return front * cf(a, b, x);
}

function cf(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 3e-7;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    let aa = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return h;
}

function lgamma(x: number): number {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) { y++; ser += ci / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function rmse(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0; for (let i = 0; i < n; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / n);
}
function mae(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0; for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s / n;
}
function r2(actual: number[], predicted: number[]) {
  const n = Math.min(actual.length, predicted.length);
  const m = mean(actual.slice(0, n));
  let ss_res = 0, ss_tot = 0;
  for (let i = 0; i < n; i++) {
    ss_res += (actual[i] - predicted[i]) ** 2;
    ss_tot += (actual[i] - m) ** 2;
  }
  return ss_tot === 0 ? 0 : 1 - ss_res / ss_tot;
}

/** Simple OLS: y = a + b*x  — returns predictor function */
function ols(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  const mx = mean(xs), my = mean(ys);
  let num = 0, denom = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); denom += (xs[i] - mx) ** 2; }
  const b = denom === 0 ? 0 : num / denom;
  const a = my - b * mx;
  return (x) => a + b * x;
}

/** Multiple linear regression via normal equations (X'X)^-1 X'y — up to ~20 features */
function multipleOLS(X: number[][], y: number[]): (row: number[]) => number {
  const n = X.length, p = X[0].length + 1;
  // Add bias column
  const Xb = X.map((r) => [1, ...r]);
  // X'X
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < n; k++) XtX[i][j] += Xb[k][i] * Xb[k][j];
  // X'y
  const Xty: number[] = new Array(p).fill(0);
  for (let i = 0; i < p; i++) for (let k = 0; k < n; k++) Xty[i] += Xb[k][i] * y[k];
  // Solve via Gaussian elimination
  const A = XtX.map((r, i) => [...r, Xty[i]]);
  for (let col = 0; col < p; col++) {
    let maxRow = col;
    for (let row = col + 1; row < p; row++) if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    if (Math.abs(A[col][col]) < 1e-12) continue;
    for (let row = 0; row < p; row++) {
      if (row === col) continue;
      const f = A[row][col] / A[col][col];
      for (let j = col; j <= p; j++) A[row][j] -= f * A[col][j];
    }
  }
  const coeff = A.map((r, i) => (Math.abs(A[i][i]) < 1e-12 ? 0 : r[p] / A[i][i]));
  return (row) => coeff[0] + row.reduce((s, v, i) => s + coeff[i + 1] * v, 0);
}

// ── Drivers Analysis ──────────────────────────────────────────────────────────

export function runDriversAnalysis(
  dataset: ParsedDataset,
  target: string
): DriversAnalysis {
  const targetVals = toNumbers(dataset.rows.map((r) => r[target] ?? ""));
  const featureCols = dataset.columns.filter(
    (c) => c.name !== target && c.type === "numeric"
  );

  const drivers: DriverResult[] = featureCols
    .map((col) => {
      const vals = toNumbers(dataset.rows.map((r) => r[col.name] ?? ""));
      const minLen = Math.min(vals.length, targetVals.length);
      const { r, pValue } = pearson(vals.slice(0, minLen), targetVals.slice(0, minLen));
      return {
        column: col.name,
        importance: Math.abs(r),
        direction: r >= 0 ? "positive" : "negative",
        r,
        pValue,
        significant: pValue < 0.05,
      } as DriverResult;
    })
    .sort((a, b) => b.importance - a.importance);

  const top = drivers.slice(0, 3);
  const summaryParts = top.map(
    (d) =>
      `"${d.column}" (r=${d.r.toFixed(2)}, ${d.significant ? "significant" : "not significant"})`
  );
  const summary =
    top.length === 0
      ? `No numeric features found to correlate with "${target}".`
      : `Top drivers of "${target}": ${summaryParts.join(", ")}.`;

  return { target, drivers, summary };
}

// ── Prediction Pipeline ───────────────────────────────────────────────────────

export function runPrediction(
  dataset: ParsedDataset,
  target: string
): PredictionResult {
  const targetCol = dataset.columns.find((c) => c.name === target)!;
  const isRegression = targetCol.type === "numeric";

  // Feature columns: all numeric except target, capped at 10
  const featureCols: ColumnMeta[] = dataset.columns
    .filter((c) => c.name !== target && c.type === "numeric")
    .slice(0, 10);

  if (isRegression) {
    return runRegression(dataset, target, featureCols);
  } else {
    return runClassification(dataset, target, featureCols);
  }
}

function runRegression(
  dataset: ParsedDataset,
  target: string,
  featureCols: ColumnMeta[]
): PredictionResult {
  const targetVals = dataset.rows.map((r) => parseFloat(r[target]?.replace(/,/g, "") ?? "")).filter(isFinite);

  // Build feature matrix (rows where ALL features + target are present)
  type ValidRow = { features: number[]; target: number; originalIndex: number };
  const validRows: ValidRow[] = dataset.rows
    .map((row, i) => {
      const features = featureCols.map((c) => parseFloat(row[c.name]?.replace(/,/g, "") ?? ""));
      const t = parseFloat(row[target]?.replace(/,/g, "") ?? "");
      if (features.some((f) => !isFinite(f)) || !isFinite(t)) return null;
      return { features, target: t, originalIndex: i };
    })
    .filter((r): r is ValidRow => r !== null);

  if (validRows.length < 5) {
    return fallbackRegression(dataset, target, featureCols, targetVals);
  }

  const X = validRows.map((r) => r.features);
  const y = validRows.map((r) => r.target);
  const predict = featureCols.length === 1
    ? (() => { const f = ols(X.map((r) => r[0]), y); return (row: number[]) => f(row[0]); })()
    : multipleOLS(X, y);

  const predicted = X.map(predict);
  const actual = y;

  // Feature importances via |r| with target
  const featureImportance = featureCols.map((col) => {
    const vals = validRows.map((r) => r.features[featureCols.indexOf(col)]);
    const { r: corr } = pearson(vals, y);
    return { feature: col.name, importance: Math.abs(corr) };
  }).sort((a, b) => b.importance - a.importance);

  const rmsVal = rmse(actual, predicted);
  const maeVal = mae(actual, predicted);
  const r2Val = r2(actual, predicted);

  const predictions: PredictionRow[] = validRows.slice(0, 200).map((r, i) => ({
    rowIndex: r.originalIndex,
    actual: actual[i],
    predicted: predicted[i],
    error: actual[i] - predicted[i],
  }));

  const modelName = featureCols.length <= 1 ? "Simple Linear Regression" : "Multiple Linear Regression";
  const summary = `${modelName} on "${target}" using ${featureCols.length} feature${featureCols.length !== 1 ? "s" : ""}. R²=${r2Val.toFixed(3)}, RMSE=${rmsVal.toFixed(2)}, MAE=${maeVal.toFixed(2)}. ${r2Val > 0.7 ? "Good fit." : r2Val > 0.4 ? "Moderate fit." : "Weak fit — consider non-linear models."}`;

  return {
    target, taskType: "regression", modelName,
    rmse: rmsVal, mae: maeVal, r2: r2Val,
    featureImportance, predictions, summary,
  };
}

function fallbackRegression(
  dataset: ParsedDataset,
  target: string,
  featureCols: ColumnMeta[],
  targetVals: number[]
): PredictionResult {
  // Mean predictor as baseline
  const m = mean(targetVals);
  const predictions: PredictionRow[] = targetVals.slice(0, 200).map((v, i) => ({
    rowIndex: i, actual: v, predicted: m, error: v - m,
  }));
  return {
    target, taskType: "regression", modelName: "Mean Baseline",
    rmse: rmse(targetVals, new Array(targetVals.length).fill(m)),
    mae: mae(targetVals, new Array(targetVals.length).fill(m)),
    r2: 0,
    featureImportance: featureCols.map((c) => ({ feature: c.name, importance: 0 })),
    predictions,
    summary: `Not enough complete rows to fit a model. Showing mean baseline for "${target}".`,
  };
}

function runClassification(
  dataset: ParsedDataset,
  target: string,
  featureCols: ColumnMeta[]
): PredictionResult {
  // Naive majority-class classifier with feature-weighted voting
  const classes = dataset.rows.map((r) => r[target]).filter(Boolean);
  const freq: Record<string, number> = {};
  classes.forEach((c) => { freq[c] = (freq[c] ?? 0) + 1; });
  const majority = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
  const accuracy = (freq[majority] ?? 0) / classes.length;

  const featureImportance = featureCols.map((col) => {
    const vals = toNumbers(dataset.rows.map((r) => r[col.name] ?? ""));
    const targetNums = dataset.rows
      .map((r) => (r[target] === majority ? 1 : 0))
      .slice(0, vals.length);
    const { r } = pearson(vals, targetNums);
    return { feature: col.name, importance: Math.abs(r) };
  }).sort((a, b) => b.importance - a.importance);

  // Create dummy numeric predictions for scatter (1 = correct, 0 = wrong)
  const predictions: PredictionRow[] = dataset.rows.slice(0, 200).map((r, i) => ({
    rowIndex: i,
    actual: r[target] === majority ? 1 : 0,
    predicted: 1,  // majority always predicts 1
    error: r[target] === majority ? 0 : 1,
  }));

  return {
    target, taskType: "classification",
    modelName: "Majority Class Baseline",
    accuracy,
    featureImportance,
    predictions,
    summary: `Majority class classifier for "${target}": predicts "${majority}" always. Accuracy=${(accuracy * 100).toFixed(1)}%. This is a baseline — use a Python backend for real classification.`,
  };
}
