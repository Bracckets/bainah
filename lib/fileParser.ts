// ─── File Parser ──────────────────────────────────────────────────────────────
// Supports CSV (PapaParse) and Excel (SheetJS) with auto-detection by extension.

import Papa from 'papaparse';
import { read, utils } from 'xlsx';

export type ParseFileResult =
  | { type: 'rows'; data: Record<string, string>[] }
  | { type: 'sheets'; names: string[] };

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
    } else if (extension === 'xlsx' || extension === 'xls') {
      // Excel parsing with SheetJS
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = read(data, { type: 'array' });

          // If multiple sheets and no sheetName provided, return sheet names
          if (workbook.SheetNames.length > 1 && !sheetName) {
            resolve({ type: 'sheets', names: workbook.SheetNames });
            return;
          }

          // Parse the specified sheet (or the first if single sheet)
          const targetSheet = sheetName || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[targetSheet];
          const rows = utils.sheet_to_json<Record<string, string>>(worksheet, {
            raw: false,
            defval: '',
          });
          resolve({ type: 'rows', data: rows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Unsupported file type: .${extension}`));
    }
  });
}
