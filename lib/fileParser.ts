// --- File Parser -------------------------------------------------------------
// Supports CSV (PapaParse) and XLSX spreadsheets with auto-detection by extension.

import Papa from 'papaparse';
import readXlsxFile, { readSheet } from 'read-excel-file/browser';

export type ParseFileResult =
  | { type: 'rows'; data: Record<string, string>[] }
  | { type: 'sheets'; names: string[] };

type RawRow = unknown[];

type HeaderDetectionResult = {
  headerRowIndex: number;
  headers: string[];
};

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function parseNumericString(value: string): number | null {
  let working = value.trim();
  if (working === '') return null;

  let negative = false;
  if (/^\(.*\)$/.test(working)) {
    negative = true;
    working = working.slice(1, -1).trim();
  }

  working = working
    .replace(/^[A-Za-z]{2,4}\s*/, '')
    .replace(/\s*[A-Za-z]{2,4}$/, '')
    .replace(/^[\$£¥€₹₩₺₽₫₦₱₪₴₭₲₵₸₼₡₮₠₢₣₤₧₯₰﷼]+/, '')
    .replace(/[\$£¥€₹₩₺₽₫₦₱₪₴₭₲₵₸₼₡₮₠₢₣₤₧₯₰﷼]+$/, '')
    .trim();

  if (working === '' || /[A-Za-z\u0600-\u06FF]/.test(working)) return null;

  if (working.includes(',') && working.includes('.')) {
    working = working.replace(/,/g, '');
  } else if (working.includes(',')) {
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(working)) {
      working = working.replace(/,/g, '');
    } else {
      return null;
    }
  }

  if (!/^[-+]?\d*\.?\d+$/.test(working)) return null;

  const parsed = Number(working);
  if (Number.isNaN(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'string') {
    if (!/\d/.test(value)) return false;
    return parseNumericString(value) !== null;
  }
  return false;
}

function isDateValue(value: unknown): boolean {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return false;
    if (!/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/.test(trimmed)) return false;
    return !Number.isNaN(Date.parse(trimmed));
  }
  return false;
}

function isStringValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function countNonEmpty(row: RawRow): number {
  let count = 0;
  for (const cell of row) {
    if (!isEmptyValue(cell)) count += 1;
  }
  return count;
}

function normalizeHeaderValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/[^A-Za-z0-9\u0600-\u06FF ]+/g, '').trim();
  return text;
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const base = header;
    const count = seen.get(base) || 0;
    const nextCount = count + 1;
    seen.set(base, nextCount);
    if (count === 0) return base;
    return `${base}_${nextCount}`;
  });
}

function forwardFillMergedHeaders(row: RawRow): RawRow {
  const filled: RawRow = [];
  let lastString = '';
  for (const cell of row) {
    if (isStringValue(cell)) {
      lastString = String(cell).trim();
      filled.push(cell);
    } else if (isEmptyValue(cell) && lastString) {
      filled.push(lastString);
    } else {
      filled.push(cell);
    }
  }
  return filled;
}

function buildHeadersFromRow(row: RawRow, columnCount: number): string[] {
  const filledRow = forwardFillMergedHeaders(row);
  const headers: string[] = [];
  for (let i = 0; i < columnCount; i += 1) {
    const rawValue = filledRow[i];
    const cleaned = normalizeHeaderValue(rawValue);
    headers.push(cleaned || `col_${i + 1}`);
  }
  return dedupeHeaders(headers);
}

function findDataTable(rawRows: RawRow[]): HeaderDetectionResult {
  const maxScan = Math.min(50, rawRows.length);
  let bestIndex = 0;
  let bestScore = -Infinity;

  const findPrevIndex = (index: number) => {
    for (let i = index - 1; i >= 0; i -= 1) {
      return i;
    }
    return -1;
  };

  const findNextIndices = (index: number, count: number) => {
    const indices: number[] = [];
    for (let i = index + 1; i < rawRows.length && indices.length < count; i += 1) {
      indices.push(i);
    }
    return indices;
  };

  for (let i = 0; i < maxScan; i += 1) {
    const row = rawRows[i] || [];
    const nonEmpty = countNonEmpty(row);
    if (nonEmpty < 3) continue;

    let stringCount = 0;
    let numericCount = 0;
    let dateCount = 0;
    for (const cell of row) {
      if (isEmptyValue(cell)) continue;
      if (isStringValue(cell)) stringCount += 1;
      if (isNumericValue(cell)) numericCount += 1;
      if (isDateValue(cell)) dateCount += 1;
    }

    const stringDensity = stringCount / nonEmpty;
    const numericRatio = (numericCount + dateCount) / nonEmpty;

    let score = 0;
    if (stringDensity >= 0.7) score += 2;
    else if (stringDensity >= 0.5) score += 1;

    if (numericRatio <= 0.2) score += 2;
    else if (numericRatio <= 0.35) score += 1;
    else if (numericRatio >= 0.6) score -= 2;

    score += 1;

    const prevIndex = findPrevIndex(i);
    if (prevIndex >= 0) {
      const prevRow = rawRows[prevIndex] || [];
      if (countNonEmpty(prevRow) <= 1) score += 1;
    }

    const nextIndices = findNextIndices(i, 3);
    let numericHeavyRows = 0;
    for (const idx of nextIndices) {
      const nextRow = rawRows[idx] || [];
      const nextNonEmpty = countNonEmpty(nextRow);
      if (nextNonEmpty < 3) continue;
      let nextNumeric = 0;
      let nextDate = 0;
      for (const cell of nextRow) {
        if (isEmptyValue(cell)) continue;
        if (isNumericValue(cell)) nextNumeric += 1;
        if (isDateValue(cell)) nextDate += 1;
      }
      const nextNumericRatio = (nextNumeric + nextDate) / nextNonEmpty;
      if (nextNumericRatio >= 0.6) numericHeavyRows += 1;
    }
    if (numericHeavyRows >= 2) score += 3;
    else if (numericHeavyRows >= 1) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const strongThreshold = 5;
  const headerRowIndex = bestScore >= strongThreshold ? bestIndex : 0;

  const maxColumns = rawRows.reduce((max, row) => Math.max(max, row?.length || 0), 0);
  const headerRow = rawRows[headerRowIndex] || [];

  let headers = buildHeadersFromRow(headerRow, Math.max(headerRow.length, maxColumns));

  if (headerRowIndex === 0 && bestScore < strongThreshold) {
    const emptyHeaders = headers.filter((name) => name.startsWith('col_')).length;
    if (maxColumns > 0 && emptyHeaders / maxColumns > 0.3) {
      headers = dedupeHeaders(
        Array.from({ length: maxColumns }, (_, idx) => `col_${idx + 1}`)
      );
    }
  }

  return { headerRowIndex, headers };
}

function buildRecords(
  rawRows: RawRow[],
  headerRowIndex: number,
  headers: string[]
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i += 1) {
    const row = rawRows[i] || [];
    if (countNonEmpty(row) === 0) continue;
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      const value = row[c];
      if (typeof value === 'string') {
        if (isDateValue(value)) {
          record[headers[c]] = value;
          continue;
        }
        const parsed = parseNumericString(value);
        record[headers[c]] = parsed === null ? value : String(parsed);
      } else if (value instanceof Date) {
        record[headers[c]] = value.toISOString();
      } else if (value === null || value === undefined) {
        record[headers[c]] = '';
      } else {
        record[headers[c]] = String(value);
      }
    }
    rows.push(record);
  }
  return rows;
}

export function parseFile(file: File, sheetName?: string): Promise<ParseFileResult> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      // CSV parsing with PapaParse
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve({ type: 'rows', data: results.data }),
        error: (err) => reject(err),
      });
    } else if (extension === 'xlsx') {
      // XLSX parsing with read-excel-file
      (async () => {
        try {
          if (!sheetName) {
            const sheets = await readXlsxFile(file);
            if (sheets.length > 1) {
              resolve({ type: 'sheets', names: sheets.map((sheet) => sheet.sheet) });
              return;
            }

            const rawRows = (sheets[0]?.data ?? []) as RawRow[];
            const { headerRowIndex, headers } = findDataTable(rawRows);
            resolve({ type: 'rows', data: buildRecords(rawRows, headerRowIndex, headers) });
            return;
          }

          const rawRows = (await readSheet(file, sheetName)) as RawRow[];
          const { headerRowIndex, headers } = findDataTable(rawRows);
          resolve({ type: 'rows', data: buildRecords(rawRows, headerRowIndex, headers) });
        } catch (err) {
          reject(err);
        }
      })();
    } else if (extension === 'xls') {
      reject(
        new Error(
          'Legacy .xls files are no longer supported. Please resave the spreadsheet as .xlsx or export it as .csv.'
        )
      );
    } else {
      reject(new Error(`Unsupported file type: .${extension}`));
    }
  });
}
