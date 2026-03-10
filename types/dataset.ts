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
  histogram: { bin: string; count: number }[];
}

export interface CategoricalStats {
  frequencies: { value: string; count: number }[];
  mostCommon: string;
  mostCommonPct: number;
}

export type ColumnStats = NumericStats | CategoricalStats;

export interface CorrelationResult {
  colA: string;
  colB: string;
  r: number;
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
