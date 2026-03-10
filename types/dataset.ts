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
  std: number;        // sample std dev (n-1) — Bessel's correction
  min: number;
  max: number;
  q1: number;         // 25th percentile
  q3: number;         // 75th percentile
  iqr: number;        // interquartile range
  skewness: number;   // moment-based skewness
  kurtosis: number;   // excess kurtosis (normal = 0)
  histogram: { bin: string; count: number }[];
}

export interface CategoricalStats {
  frequencies: { value: string; count: number }[];
  mostCommon: string;
  mostCommonPct: number;
  entropy: number;    // Shannon entropy — measures category diversity
}

export type ColumnStats = NumericStats | CategoricalStats;

export interface CorrelationResult {
  colA: string;
  colB: string;
  r: number;
  pValue: number;     // two-tailed p-value for H0: r = 0
  n: number;          // sample size used
  significant: boolean; // p < 0.05
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
  iqrOutlier: boolean; // true if also flagged by IQR method
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
