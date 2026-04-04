// ─── Dataset Types ───────────────────────────────────────────────────────────

export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text';

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  missingCount: number;
  uniqueCount: number;
}

export interface NumericStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  histogram: { bin: string; count: number }[];
}

export interface CategoricalStats {
  frequencies: { value: string; count: number }[];
  mostCommon: string;
  mostCommonPct: number;
  entropy: number;
}

export type ColumnStats = NumericStats | CategoricalStats;

export interface CorrelationResult {
  colA: string;
  colB: string;
  r: number;
  pValue: number;
  n: number;
  significant: boolean;
}

export interface Insight {
  id: string;
  type: 'correlation' | 'dominance' | 'outlier' | 'missing' | 'distribution' | 'general';
  severity: 'info' | 'warning' | 'highlight';
  title: string;
  body: string;
}

export interface AnomalyRow {
  rowIndex: number;
  column: string;
  value: number;
  zScore: number;
  iqrOutlier: boolean;
}

export interface ParsedDataset {
  rows: Record<string, string>[];
  columns: ColumnMeta[];
  rowCount: number;
  colCount: number;
  stats: Record<string, ColumnStats>;
  correlations: CorrelationResult[];
  insights: Insight[];
  anomalies: AnomalyRow[];
}

// ─── Analysis Wizard Types ────────────────────────────────────────────────────

export type WizardMode = 'understand' | 'drivers' | 'predict';

export interface DriverResult {
  column: string;
  /** Pearson |r| against the target */
  importance: number;
  direction: 'positive' | 'negative';
  r: number;
  pValue: number;
  significant: boolean;
}

export interface DriversAnalysis {
  target: string;
  drivers: DriverResult[];
  summary: string;
}

export interface PredictionRow {
  rowIndex: number;
  actual: number;
  predicted: number;
  error: number;
  actualLabel?: string;
  predictedLabel?: string;
}

export interface PredictionResult {
  target: string;
  taskType: 'regression' | 'classification';
  modelName: string;
  baselineModelName: string;
  evaluationLabel: string;
  completeRowCount: number;
  trainRowCount: number;
  testRowCount: number;
  warnings: string[];
  /** Regression metrics */
  rmse?: number;
  mae?: number;
  r2?: number;
  baselineRmse?: number;
  baselineMae?: number;
  baselineR2?: number;
  /** Classification metrics */
  accuracy?: number;
  baselineAccuracy?: number;
  /** Feature importances (correlation-based proxy) */
  featureImportance: { feature: string; importance: number }[];
  predictions: PredictionRow[];
  plottedPredictions: PredictionRow[];
  summary: string;
}

