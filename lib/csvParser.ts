// ─── CSV Parser ──────────────────────────────────────────────────────────────
// Wraps PapaParse to return typed rows.

import Papa from 'papaparse';

export function parseCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}
