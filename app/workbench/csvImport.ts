/**
 * CSV import for the Workbench — the counterpart to `csvExport.ts`. Parses
 * pasted CSV text (RFC-4180-aware: quoted fields, embedded commas/
 * newlines, doubled-quote escaping) into a dataset object, coercing every
 * cell to a number and recording an explicit issue for anything that
 * isn't one — never silently producing `NaN` or a phantom zero for a
 * missing value.
 *
 * This is intentionally *not* wired into regression/curve-fitting: it
 * parses and displays a dataset, nothing more. Fitting imported data
 * against a model is separately-scoped future work.
 */

/** Splits RFC-4180 CSV text into rows of raw string cells (quote-aware, so a comma or newline inside a quoted field doesn't split the row). */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // skip; \n (below) ends the row
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export interface CsvParseResult {
  headers: string[];
  /** Each row keyed by header; a cell that's missing or non-numeric is `null`, never a silent NaN. */
  rows: Record<string, number | null>[];
  /** Human-readable problems found while parsing — empty means every cell parsed cleanly. */
  issues: string[];
}

/** Parses `text` (first row = headers) into a dataset. Never throws — problems are reported in `issues`, not exceptions. */
export function parseCsv(text: string): CsvParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { headers: [], rows: [], issues: ["No CSV content to parse."] };
  }

  const rawRows = parseCsvRows(trimmed);
  const headers = rawRows[0] ?? [];
  const dataRows = rawRows.slice(1);
  const issues: string[] = [];
  const rows: Record<string, number | null>[] = [];

  dataRows.forEach((rawRow, rowIndex) => {
    const rowNumber = rowIndex + 2; // 1-indexed, +1 to account for the header row
    if (rawRow.length !== headers.length) {
      issues.push(`Row ${rowNumber}: expected ${headers.length} column(s), got ${rawRow.length}.`);
    }

    const row: Record<string, number | null> = {};
    headers.forEach((header, columnIndex) => {
      const cell = rawRow[columnIndex];
      if (cell === undefined || cell === "") {
        row[header] = null;
        issues.push(`Row ${rowNumber}, column "${header}": missing value.`);
        return;
      }
      const numeric = Number(cell);
      if (!Number.isFinite(numeric)) {
        row[header] = null;
        issues.push(`Row ${rowNumber}, column "${header}": "${cell}" is not a valid number.`);
        return;
      }
      row[header] = numeric;
    });
    rows.push(row);
  });

  return { headers, rows, issues };
}
