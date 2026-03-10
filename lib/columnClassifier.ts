// ─── Column Classifier ────────────────────────────────────────────────────────
// Detects column type using heuristics. Uses shared isMissing() to handle
// N/A, null, none, -, ? and other common null representations.

import { ColumnMeta, ColumnType } from '@/types/dataset';
import { isMissing } from './statisticsEngine';

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/,     // ISO: 2024-01-15
  /^\d{2}\/\d{2}\/\d{4}/,   // US: 01/15/2024
  /^\d{2}-\d{2}-\d{4}/,     // EU: 15-01-2024
  /^\d{4}\/\d{2}\/\d{2}/,   // Alt ISO: 2024/01/15
];

function isNumericValue(val: string): boolean {
  const cleaned = val.trim().replace(/,/g, '');
  return cleaned !== '' && isFinite(Number(cleaned));
}

function isDatetimeValue(val: string): boolean {
  return DATE_PATTERNS.some((p) => p.test(val.trim()));
}

function detectType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => !isMissing(v));
  if (nonEmpty.length === 0) return 'text';

  const numericCount = nonEmpty.filter(isNumericValue).length;
  if (numericCount / nonEmpty.length >= 0.85) return 'numeric';

  const dateCount = nonEmpty.filter(isDatetimeValue).length;
  if (dateCount / nonEmpty.length >= 0.85) return 'datetime';

  const uniqueCount = new Set(nonEmpty.map((v) => v.toLowerCase().trim())).size;
  if (uniqueCount <= Math.max(20, nonEmpty.length * 0.15)) return 'categorical';

  return 'text';
}

export function classifyColumns(
  rows: Record<string, string>[],
  columnNames: string[]
): ColumnMeta[] {
  return columnNames.map((name) => {
    const values = rows.map((r) => r[name] ?? '');
    const missingCount = values.filter(isMissing).length;
    const uniqueCount = new Set(values.filter((v) => !isMissing(v))).size;
    const type = detectType(values);
    return { name, type, missingCount, uniqueCount };
  });
}
