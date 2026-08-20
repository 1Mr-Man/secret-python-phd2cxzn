import { describe, expect, it } from "vitest";
import * as elements from "./elements.js";

describe("engine/data/elements — seed data integrity", () => {
  it("ALL_ELEMENTS has a unique symbol per entry, each with a positive atomic number and atomic mass", () => {
    const symbols = new Set<string>();
    for (const element of elements.ALL_ELEMENTS) {
      expect(symbols.has(element.symbol)).toBe(false);
      symbols.add(element.symbol);

      expect(element.atomicNumber).toBeGreaterThan(0);
      expect(Number.isInteger(element.atomicNumber)).toBe(true);
      expect(element.atomicMassGPerMol).toBeGreaterThan(0);
      expect(element.name.length).toBeGreaterThan(0);
    }
  });

  it("Au and Cu retain their original values (unchanged by this file's expansion)", () => {
    expect(elements.Au).toEqual({ symbol: "Au", name: "Gold", atomicNumber: 79, atomicMassGPerMol: 196.97 });
    expect(elements.Cu).toEqual({ symbol: "Cu", name: "Copper", atomicNumber: 29, atomicMassGPerMol: 63.55 });
  });

  it("ALL_ELEMENTS contains exactly the 10 named exports", () => {
    expect(elements.ALL_ELEMENTS).toHaveLength(10);
    expect(elements.ALL_ELEMENTS).toEqual(
      expect.arrayContaining([elements.Au, elements.Cu, elements.Fe, elements.Ni, elements.Co, elements.Cr, elements.Mn, elements.Al, elements.Zn, elements.Ti]),
    );
  });
});
