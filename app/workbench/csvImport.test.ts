import { describe, expect, it } from "vitest";
import { parseCsv } from "./csvImport.js";

describe("parseCsv — well-formed CSV", () => {
  it("parses headers and numeric rows", () => {
    const result = parseCsv("x,Scc0\n0.1,0.07\n0.2,0.09");
    expect(result.headers).toEqual(["x", "Scc0"]);
    expect(result.rows).toEqual([
      { x: 0.1, Scc0: 0.07 },
      { x: 0.2, Scc0: 0.09 },
    ]);
    expect(result.issues).toEqual([]);
  });

  it("round-trips CSV produced by the export side's own quoting rules (quoted field with an embedded comma)", () => {
    // toCsv() (csvExport.ts) would quote a value containing a comma as "1,2"
    const result = parseCsv('label,value\n"1,2",5');
    expect(result.headers).toEqual(["label", "value"]);
    // "1,2" isn't numeric — that's expected and correctly flagged, not silently NaN.
    expect(result.rows[0]!.label).toBeNull();
    expect(result.rows[0]!.value).toBe(5);
    expect(result.issues).toContain('Row 2, column "label": "1,2" is not a valid number.');
  });

  it("handles a doubled-quote escape inside a quoted field", () => {
    const result = parseCsv('note,value\n"she said ""hi""",1');
    expect(result.rows[0]!.value).toBe(1);
    // The quoted text field is non-numeric, correctly flagged rather than silently zeroed.
    expect(result.issues.some((issue) => issue.includes("note"))).toBe(true);
  });

  it("handles a comma-embedded quoted field spanning what would otherwise look like two columns", () => {
    const result = parseCsv('a,b\n"1,000",2');
    expect(result.headers).toEqual(["a", "b"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.b).toBe(2);
  });
});

describe("parseCsv — issue reporting (never silent)", () => {
  it("flags a missing (empty) cell as null with an explicit issue, not 0", () => {
    const result = parseCsv("x,y\n1,\n2,3");
    expect(result.rows[0]!.y).toBeNull();
    expect(result.issues).toContain('Row 2, column "y": missing value.');
  });

  it("flags a non-numeric cell as null with an explicit issue, not NaN", () => {
    const result = parseCsv("x,y\n1,abc");
    expect(result.rows[0]!.y).toBeNull();
    expect(Number.isNaN(result.rows[0]!.y)).toBe(false);
    expect(result.issues).toContain('Row 2, column "y": "abc" is not a valid number.');
  });

  it("flags a row with the wrong number of columns", () => {
    const result = parseCsv("x,y,z\n1,2");
    expect(result.issues).toContain("Row 2: expected 3 column(s), got 2.");
  });

  it("returns an explicit issue and no rows/headers for empty input", () => {
    const result = parseCsv("   \n  ");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual(["No CSV content to parse."]);
  });

  it("returns zero issues for a fully clean dataset", () => {
    const result = parseCsv("x,y\n1,2\n3,4\n5,6");
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(3);
  });
});
