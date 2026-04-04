import {
  ParsedDataset,
  ColumnMeta,
  DriversAnalysis,
  DriverResult,
  PredictionResult,
  PredictionRow,
} from "@/types/dataset";
import { toNumbers } from "./statisticsEngine";

function pearson(xs: number[], ys: number[]): { r: number; pValue: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { r: 0, pValue: 1 };
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const r = dx2 === 0 || dy2 === 0 ? 0 : num / Math.sqrt(dx2 * dy2);
  const t = r * Math.sqrt((n - 2) / Math.max(1 - r * r, 1e-12));
  const pValue = 2 * (1 - tCDF(Math.abs(t), n - 2));
  return { r: Math.max(-1, Math.min(1, r)), pValue };
}

function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  return front * cf(a, b, x);
}

function cf(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-7;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIterations; m += 1) {
    let aa = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    h *= d * c;

    aa = (-((a + m) * (a + b + m) * x)) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return h;
}

function lgamma(x: number): number {
  const coeffs = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const coeff of coeffs) {
    y += 1;
    ser += coeff / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rmse(actual: number[], predicted: number[]) {
  const n = Math.min(actual.length, predicted.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += (actual[i] - predicted[i]) ** 2;
  return Math.sqrt(sum / n);
}

function mae(actual: number[], predicted: number[]) {
  const n = Math.min(actual.length, predicted.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += Math.abs(actual[i] - predicted[i]);
  return sum / n;
}

function r2(actual: number[], predicted: number[]) {
  const n = Math.min(actual.length, predicted.length);
  const targetMean = mean(actual.slice(0, n));
  let residualSum = 0;
  let totalSum = 0;
  for (let i = 0; i < n; i += 1) {
    residualSum += (actual[i] - predicted[i]) ** 2;
    totalSum += (actual[i] - targetMean) ** 2;
  }
  return totalSum === 0 ? 0 : 1 - residualSum / totalSum;
}

function ols(xs: number[], ys: number[]): (x: number) => number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let denom = 0;
  for (let i = 0; i < xs.length; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    denom += (xs[i] - mx) ** 2;
  }
  const slope = denom === 0 ? 0 : num / denom;
  const intercept = my - slope * mx;
  return (x) => intercept + slope * x;
}

function multipleOLS(X: number[][], y: number[]): (row: number[]) => number {
  const n = X.length;
  const p = X[0].length + 1;
  const withBias = X.map((row) => [1, ...row]);
  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));

  for (let i = 0; i < p; i += 1) {
    for (let j = 0; j < p; j += 1) {
      for (let k = 0; k < n; k += 1) {
        xtx[i][j] += withBias[k][i] * withBias[k][j];
      }
    }
  }

  const xty: number[] = new Array(p).fill(0);
  for (let i = 0; i < p; i += 1) {
    for (let k = 0; k < n; k += 1) {
      xty[i] += withBias[k][i] * y[k];
    }
  }

  const augmented = xtx.map((row, index) => [...row, xty[index]]);
  for (let col = 0; col < p; col += 1) {
    let maxRow = col;
    for (let row = col + 1; row < p; row += 1) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
    if (Math.abs(augmented[col][col]) < 1e-12) continue;

    for (let row = 0; row < p; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col] / augmented[col][col];
      for (let j = col; j <= p; j += 1) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  const coeffs = augmented.map((row, index) =>
    Math.abs(augmented[index][index]) < 1e-12 ? 0 : row[p] / augmented[index][index]
  );

  return (row) => coeffs[0] + row.reduce((sum, value, index) => sum + coeffs[index + 1] * value, 0);
}

export function runDriversAnalysis(
  dataset: ParsedDataset,
  target: string
): DriversAnalysis {
  const targetVals = toNumbers(dataset.rows.map((row) => row[target] ?? ""));
  const featureCols = dataset.columns.filter(
    (column) => column.name !== target && column.type === "numeric"
  );

  const drivers: DriverResult[] = featureCols
    .map((column) => {
      const vals = toNumbers(dataset.rows.map((row) => row[column.name] ?? ""));
      const minLen = Math.min(vals.length, targetVals.length);
      const { r, pValue } = pearson(vals.slice(0, minLen), targetVals.slice(0, minLen));
      return {
        column: column.name,
        importance: Math.abs(r),
        direction: r >= 0 ? "positive" : "negative",
        r,
        pValue,
        significant: pValue < 0.05,
      } as DriverResult;
    })
    .sort((left, right) => right.importance - left.importance);

  const topDrivers = drivers.slice(0, 3);
  const summaryParts = topDrivers.map(
    (driver) =>
      `"${driver.column}" (r=${driver.r.toFixed(2)}, ${
        driver.significant ? "significant" : "not significant"
      })`
  );
  const summary =
    topDrivers.length === 0
      ? `No numeric features found to correlate with "${target}".`
      : `Top drivers of "${target}": ${summaryParts.join(", ")}.`;

  return { target, drivers, summary };
}

type SplitResult<T> = {
  train: T[];
  test: T[];
};

type RegressionValidRow = {
  features: number[];
  target: number;
  rowIndex: number;
};

type ClassificationValidRow = {
  features: number[];
  target: string;
  rowIndex: number;
};

function parseNumericCell(value: string | undefined): number {
  return Number.parseFloat((value ?? "").replace(/,/g, ""));
}

function deterministicRank(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function splitHoldout<T extends { rowIndex: number }>(
  rows: T[],
  testRatio = 0.2
): SplitResult<T> {
  if (rows.length === 0) return { train: [], test: [] };
  if (rows.length === 1) return { train: rows, test: [] };

  const shuffled = [...rows].sort(
    (left, right) => deterministicRank(left.rowIndex + 1) - deterministicRank(right.rowIndex + 1)
  );
  const rawTestSize = Math.round(shuffled.length * testRatio);
  const testSize = Math.max(1, Math.min(shuffled.length - 1, rawTestSize));

  return {
    train: shuffled.slice(0, shuffled.length - testSize),
    test: shuffled.slice(shuffled.length - testSize),
  };
}

function splitStratifiedHoldout(
  rows: ClassificationValidRow[],
  testRatio = 0.2
): SplitResult<ClassificationValidRow> {
  const grouped = new Map<string, ClassificationValidRow[]>();
  rows.forEach((row) => {
    const bucket = grouped.get(row.target) ?? [];
    bucket.push(row);
    grouped.set(row.target, bucket);
  });

  const train: ClassificationValidRow[] = [];
  const test: ClassificationValidRow[] = [];

  grouped.forEach((bucket) => {
    const split = splitHoldout(bucket, testRatio);
    train.push(...split.train);
    test.push(...split.test);
  });

  if (test.length === 0 && train.length > 1) {
    return splitHoldout(train, testRatio);
  }

  return { train, test };
}

function buildCommonWarnings(
  completeRowCount: number,
  trainRowCount: number,
  testRowCount: number,
  featureCount: number
) {
  const warnings: string[] = [];

  if (completeRowCount < 40) {
    warnings.push("Very few complete rows were available, so the holdout metrics may swing noticeably.");
  }

  if (testRowCount < 12) {
    warnings.push("The test split is small, so treat these scores as a rough directional check.");
  }

  if (featureCount === 0) {
    warnings.push("No usable numeric feature columns were available, so only the baseline could be evaluated.");
  } else if (trainRowCount <= featureCount * 3) {
    warnings.push("There are not many more training rows than features, which raises overfitting risk.");
  }

  return warnings;
}

function summariseRegression(
  target: string,
  modelName: string,
  featureCount: number,
  modelR2: number,
  modelRmse: number,
  baselineRmse: number
) {
  const comparison =
    modelRmse < baselineRmse * 0.92
      ? "It beats the mean baseline by a meaningful margin on held-out rows."
      : modelRmse < baselineRmse
        ? "It edges past the mean baseline on held-out rows."
        : "It does not outperform the mean baseline on held-out rows yet.";
  const fitRead =
    modelR2 > 0.65 ? "Signal looks fairly strong." : modelR2 > 0.35 ? "Signal is moderate." : "Signal looks weak.";

  return `${modelName} evaluated "${target}" on an 80/20 holdout split using ${featureCount} numeric feature${
    featureCount !== 1 ? "s" : ""
  }. Test R2=${modelR2.toFixed(3)}, RMSE=${modelRmse.toFixed(2)}. ${comparison} ${fitRead}`;
}

function summariseClassification(
  target: string,
  modelName: string,
  accuracy: number,
  baselineAccuracy: number
) {
  const comparison =
    accuracy > baselineAccuracy + 0.05
      ? "It improves on the majority baseline on held-out rows."
      : accuracy > baselineAccuracy
        ? "It only slightly improves on the majority baseline on held-out rows."
        : "It does not beat the majority baseline on held-out rows yet.";

  return `${modelName} evaluated "${target}" on an 80/20 holdout split. Test accuracy=${(
    accuracy * 100
  ).toFixed(1)}%. ${comparison}`;
}

export function runPrediction(
  dataset: ParsedDataset,
  target: string
): PredictionResult {
  const targetCol = dataset.columns.find((column) => column.name === target)!;
  const isRegression = targetCol.type === "numeric";
  const featureCols: ColumnMeta[] = dataset.columns
    .filter((column) => column.name !== target && column.type === "numeric")
    .slice(0, 10);

  return isRegression
    ? runRegression(dataset, target, featureCols)
    : runClassification(dataset, target, featureCols);
}

function runRegression(
  dataset: ParsedDataset,
  target: string,
  featureCols: ColumnMeta[]
): PredictionResult {
  const validRows: RegressionValidRow[] = dataset.rows
    .map((row, index) => {
      const features = featureCols.map((column) => parseNumericCell(row[column.name]));
      const targetValue = parseNumericCell(row[target]);
      if (features.some((value) => !isFinite(value)) || !isFinite(targetValue)) return null;
      return { features, target: targetValue, rowIndex: index };
    })
    .filter((row): row is RegressionValidRow => row !== null);

  const split = splitHoldout(validRows);
  const trainRows = split.train;
  const testRows = split.test;
  const warnings = buildCommonWarnings(
    validRows.length,
    trainRows.length,
    testRows.length,
    featureCols.length
  );

  if (validRows.length < 8 || trainRows.length < 4 || testRows.length < 1 || featureCols.length === 0) {
    return fallbackRegression(target, featureCols, validRows, warnings);
  }

  const XTrain = trainRows.map((row) => row.features);
  const yTrain = trainRows.map((row) => row.target);
  const predict =
    featureCols.length === 1
      ? (() => {
          const model = ols(XTrain.map((row) => row[0]), yTrain);
          return (row: number[]) => model(row[0]);
        })()
      : multipleOLS(XTrain, yTrain);

  const actual = testRows.map((row) => row.target);
  const predicted = testRows.map((row) => predict(row.features));
  const trainMean = mean(yTrain);
  const baselinePredicted = testRows.map(() => trainMean);

  const featureImportance = featureCols
    .map((column, index) => {
      const featureValues = trainRows.map((row) => row.features[index]);
      const { r } = pearson(featureValues, yTrain);
      return { feature: column.name, importance: Math.abs(r) };
    })
    .sort((left, right) => right.importance - left.importance);

  const modelRmse = rmse(actual, predicted);
  const modelMae = mae(actual, predicted);
  const modelR2 = r2(actual, predicted);
  const baselineRmse = rmse(actual, baselinePredicted);
  const baselineMae = mae(actual, baselinePredicted);
  const baselineR2 = r2(actual, baselinePredicted);

  const predictions: PredictionRow[] = testRows.map((row, index) => ({
    rowIndex: row.rowIndex,
    actual: actual[index],
    predicted: predicted[index],
    error: actual[index] - predicted[index],
  }));

  const modelName =
    featureCols.length <= 1 ? "Simple Linear Regression" : "Multiple Linear Regression";

  return {
    target,
    taskType: "regression",
    modelName,
    baselineModelName: "Train-set mean baseline",
    evaluationLabel: "80/20 holdout split",
    completeRowCount: validRows.length,
    trainRowCount: trainRows.length,
    testRowCount: testRows.length,
    warnings,
    rmse: modelRmse,
    mae: modelMae,
    r2: modelR2,
    baselineRmse,
    baselineMae,
    baselineR2,
    featureImportance,
    predictions,
    plottedPredictions: predictions.slice(0, 200),
    summary: summariseRegression(
      target,
      modelName,
      featureCols.length,
      modelR2,
      modelRmse,
      baselineRmse
    ),
  };
}

function fallbackRegression(
  target: string,
  featureCols: ColumnMeta[],
  validRows: RegressionValidRow[],
  warnings: string[]
): PredictionResult {
  const actual = validRows.map((row) => row.target);
  const average = actual.length > 0 ? mean(actual) : 0;
  const predictions: PredictionRow[] = validRows.map((row) => ({
    rowIndex: row.rowIndex,
    actual: row.target,
    predicted: average,
    error: row.target - average,
  }));
  const baselineRmse = actual.length > 0 ? rmse(actual, new Array(actual.length).fill(average)) : 0;
  const baselineMae = actual.length > 0 ? mae(actual, new Array(actual.length).fill(average)) : 0;

  return {
    target,
    taskType: "regression",
    modelName: "Baseline only",
    baselineModelName: "Mean baseline",
    evaluationLabel: "Fallback evaluation",
    completeRowCount: validRows.length,
    trainRowCount: validRows.length,
    testRowCount: validRows.length,
    warnings: [
      ...warnings,
      "Bayynah could not form a stable train/test split, so only the mean baseline is shown.",
    ],
    rmse: baselineRmse,
    mae: baselineMae,
    r2: 0,
    baselineRmse,
    baselineMae,
    baselineR2: 0,
    featureImportance: featureCols.map((column) => ({ feature: column.name, importance: 0 })),
    predictions,
    plottedPredictions: predictions.slice(0, 200),
    summary: `Not enough complete rows were available to fit a reliable holdout model for "${target}". Showing the mean baseline only.`,
  };
}

function runClassification(
  dataset: ParsedDataset,
  target: string,
  featureCols: ColumnMeta[]
): PredictionResult {
  const validRows: ClassificationValidRow[] = dataset.rows
    .map((row, index) => {
      const label = row[target]?.trim();
      const features = featureCols.map((column) => parseNumericCell(row[column.name]));
      if (!label || features.some((value) => !isFinite(value))) return null;
      return { features, target: label, rowIndex: index };
    })
    .filter((row): row is ClassificationValidRow => row !== null);

  const distinctClasses = Array.from(new Set(validRows.map((row) => row.target)));
  const split = splitStratifiedHoldout(validRows);
  const trainRows = split.train;
  const testRows = split.test;
  const warnings = buildCommonWarnings(
    validRows.length,
    trainRows.length,
    testRows.length,
    featureCols.length
  );

  const trainFrequency: Record<string, number> = {};
  trainRows.forEach((row) => {
    trainFrequency[row.target] = (trainFrequency[row.target] ?? 0) + 1;
  });
  const majority =
    Object.entries(trainFrequency).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "unknown";

  if (distinctClasses.length < 2 || featureCols.length === 0 || trainRows.length < 6 || testRows.length < 1) {
    const baselineAccuracy =
      validRows.length > 0
        ? validRows.filter((row) => row.target === majority).length / validRows.length
        : 0;

    return {
      target,
      taskType: "classification",
      modelName: "Baseline only",
      baselineModelName: "Majority class baseline",
      evaluationLabel: "Fallback evaluation",
      completeRowCount: validRows.length,
      trainRowCount: trainRows.length || validRows.length,
      testRowCount: testRows.length || validRows.length,
      warnings: [
        ...warnings,
        "Bayynah could not form a stable classification holdout, so only the majority baseline is shown.",
      ],
      accuracy: baselineAccuracy,
      baselineAccuracy,
      featureImportance: featureCols.map((column) => ({ feature: column.name, importance: 0 })),
      predictions: validRows.map((row) => ({
        rowIndex: row.rowIndex,
        actual: row.target === majority ? 1 : 0,
        predicted: 1,
        error: row.target === majority ? 0 : 1,
        actualLabel: row.target,
        predictedLabel: majority,
      })),
      plottedPredictions: validRows.slice(0, 200).map((row) => ({
        rowIndex: row.rowIndex,
        actual: row.target === majority ? 1 : 0,
        predicted: 1,
        error: row.target === majority ? 0 : 1,
        actualLabel: row.target,
        predictedLabel: majority,
      })),
      summary: `Not enough complete labeled rows were available to fit a reliable holdout classifier for "${target}". Showing the majority baseline only.`,
    };
  }

  const centroids = new Map<string, number[]>();
  distinctClasses.forEach((label) => {
    const rowsForClass = trainRows.filter((row) => row.target === label);
    const centroid = featureCols.map((_, featureIndex) =>
      mean(rowsForClass.map((row) => row.features[featureIndex]))
    );
    centroids.set(label, centroid);
  });

  const classify = (features: number[]) => {
    let bestLabel = majority;
    let bestDistance = Number.POSITIVE_INFINITY;

    centroids.forEach((centroid, label) => {
      const distance = Math.sqrt(
        centroid.reduce((sum, centerValue, index) => {
          const diff = features[index] - centerValue;
          return sum + diff * diff;
        }, 0)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestLabel = label;
      }
    });

    return bestLabel;
  };

  const predictions: PredictionRow[] = testRows.map((row) => {
    const predictedLabel = classify(row.features);
    const correct = predictedLabel === row.target;
    return {
      rowIndex: row.rowIndex,
      actual: correct ? 1 : 0,
      predicted: 1,
      error: correct ? 0 : 1,
      actualLabel: row.target,
      predictedLabel,
    };
  });

  const accuracy =
    predictions.length > 0
      ? predictions.filter((row) => row.error === 0).length / predictions.length
      : 0;
  const baselineAccuracy =
    testRows.length > 0
      ? testRows.filter((row) => row.target === majority).length / testRows.length
      : 0;

  const majorityShare = trainRows.length > 0 ? (trainFrequency[majority] ?? 0) / trainRows.length : 0;
  if (majorityShare > 0.7) {
    warnings.push(
      `The target is imbalanced: "${majority}" makes up ${(majorityShare * 100).toFixed(1)}% of training rows.`
    );
  }

  const featureImportance = featureCols
    .map((column, index) => {
      const overallValues = trainRows.map((row) => row.features[index]);
      const overallMean = mean(overallValues);
      const betweenClassSpread = distinctClasses.reduce((sum, label) => {
        const classRows = trainRows.filter((row) => row.target === label);
        if (classRows.length === 0) return sum;
        const classMean = mean(classRows.map((row) => row.features[index]));
        return sum + classRows.length * (classMean - overallMean) ** 2;
      }, 0);
      const totalSpread = overallValues.reduce(
        (sum, value) => sum + (value - overallMean) ** 2,
        0
      );

      return {
        feature: column.name,
        importance: totalSpread === 0 ? 0 : Math.min(1, betweenClassSpread / totalSpread),
      };
    })
    .sort((left, right) => right.importance - left.importance);

  return {
    target,
    taskType: "classification",
    modelName: "Nearest Centroid Classifier",
    baselineModelName: "Majority class baseline",
    evaluationLabel: "80/20 holdout split",
    completeRowCount: validRows.length,
    trainRowCount: trainRows.length,
    testRowCount: testRows.length,
    warnings,
    accuracy,
    baselineAccuracy,
    featureImportance,
    predictions,
    plottedPredictions: predictions.slice(0, 200),
    summary: summariseClassification(
      target,
      "Nearest Centroid Classifier",
      accuracy,
      baselineAccuracy
    ),
  };
}
