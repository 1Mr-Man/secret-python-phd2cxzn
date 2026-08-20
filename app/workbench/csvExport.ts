/**
 * CSV export for a Workbench results/sweep table — the "CSV export" half
 * of the Phase-1-foundation checklist (CSV import + regression/curve-
 * fitting are separately-scoped future work, not attempted here).
 */

/** Escapes a value per RFC 4180: wraps in quotes and doubles any embedded quote whenever the value contains a comma, quote, or newline. */
function escapeCsvValue(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Pure: turns an array of flat rows into CSV text. Column order is taken from the first row's own key order. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const columns = Object.keys(rows[0]!);
  const lines = [columns.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvValue(row[column])).join(","));
  }
  return lines.join("\r\n");
}

/** DOM: triggers a browser download of `csvText` as `filename`, via a Blob + temporary anchor click. */
export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
