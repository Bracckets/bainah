// ─── Column Classifier ───────────────────────────────────────────────────────
// Detects column type using simple heuristics.

import { ColumnMeta, ColumnType } from '@/types/dataset';

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/, // ISO date
  /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
  /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
];

function isNumeric(val: string): boolean {
  return val.trim() !== '' && !isNaN(Number(val.replace(/,/g, '')));
}

function isDatetime(val: string): boolean {
  return DATE_PATTERNS.some((p) => p.test(val.trim()));
}

function detectType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v.trim() !== '');
  if (nonEmpty.length === 0) return 'text';

  const numericCount = nonEmpty.filter(isNumeric).length;
  if (numericCount / nonEmpty.length >= 0.85) return 'numeric';

  const dateCount = nonEmpty.filter(isDatetime).length;
  if (dateCount / nonEmpty.length >= 0.85) return 'datetime';

  // Categorical: low cardinality relative to total rows
  const uniqueCount = new Set(nonEmpty.map((v) => v.toLowerCase())).size;
  if (uniqueCount <= Math.max(20, nonEmpty.length * 0.15)) return 'categorical';

  return 'text';
}

export function classifyColumns(
  rows: Record<string, string>[],
  columnNames: string[]
): ColumnMeta[] {
  return columnNames.map((name) => {
    const values = rows.map((r) => r[name] ?? '');
    const missingCount = values.filter((v) => v.trim() === '').length;
    const uniqueCount = new Set(values.filter((v) => v.trim() !== '')).size;
    const type = detectType(values);
    return { name, type, missingCount, uniqueCount };
  });
}
