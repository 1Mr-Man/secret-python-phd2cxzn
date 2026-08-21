import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../core/Constants.js";
import { isEngineError } from "../core/Errors.js";
import { binaryComposition, composition, pureElement, ternaryComposition, type Composition } from "../core/Material.js";
import { Au, Co, Cr, Cu, Fe, Ni } from "../data/elements.js";
import { idealMixingEntropy } from "./mixingEntropy.js";
import { idealMixingGibbsEnergy } from "./idealMixingGibbsEnergy.js";

/**
 * Independent reference implementation — a separately-written closed-form
 * sum, not calling idealMixingGibbsEnergy() or sharing code with it (and
 * not routed through idealMixingEntropy() either, so this isn't the same
 * "-T*ΔS_mix" relationship being tested against itself). Mirrors the
 * precedent already established in mixingEntropy.test.ts.
 */
function referenceIdealMixingGibbsEnergy(fractions: number[], temperatureK: number): number {
  let sum = 0;
  for (const x of fractions) {
    if (x > 0) sum += x * Math.log(x);
  }
  return PhysicalConstants.GAS_CONSTANT_R * temperatureK * sum;
}

const T = 1000; // arbitrary, unremarkable reference temperature (K) used across most tests below

describe("idealMixingGibbsEnergy — pure-component limits (test 1)", () => {
  it("is exactly 0 J/mol for a single-component (pure) composition", () => {
    expect(idealMixingGibbsEnergy(pureElement(Au), T)).toBe(0);
  });

  it("is exactly 0 J/mol for a binary composition degenerate to pure (x=1, x=0)", () => {
    expect(idealMixingGibbsEnergy(binaryComposition(Au, 1, Cu, 0), T)).toBe(0);
  });
});

describe("idealMixingGibbsEnergy — known analytical value (test 2)", () => {
  it("equals -RT*ln(2) at binary equimolar composition, using this project's own R=8.314", () => {
    const result = idealMixingGibbsEnergy(binaryComposition(Au, 0.5, Cu, 0.5), T);
    // Closed form for x=0.5: RT[0.5 ln 0.5 + 0.5 ln 0.5] = RT ln(0.5) = -RT ln(2).
    expect(result).toBeCloseTo(-PhysicalConstants.GAS_CONSTANT_R * T * Math.log(2), 9);
  });
});

describe("idealMixingGibbsEnergy — cross-checked against an independent reference implementation", () => {
  it("matches for a binary asymmetric composition (test 3)", () => {
    const result = idealMixingGibbsEnergy(binaryComposition(Au, 0.3, Cu, 0.7), T);
    expect(result).toBeCloseTo(referenceIdealMixingGibbsEnergy([0.3, 0.7], T), 9);
  });

  it("matches for a ternary composition (test 4)", () => {
    const result = idealMixingGibbsEnergy(ternaryComposition(Fe, 0.5, Ni, 0.3, Cr, 0.2), T);
    expect(result).toBeCloseTo(referenceIdealMixingGibbsEnergy([0.5, 0.3, 0.2], T), 9);
  });

  it("matches for an arbitrary (5-component) multicomponent composition (test 5)", () => {
    const fractions = [0.2, 0.2, 0.2, 0.2, 0.2];
    const fiveComponent: Composition = composition([
      { element: Fe, fraction: fractions[0]! },
      { element: Ni, fraction: fractions[1]! },
      { element: Cr, fraction: fractions[2]! },
      { element: Co, fraction: fractions[3]! },
      { element: Cu, fraction: fractions[4]! },
    ]);
    const result = idealMixingGibbsEnergy(fiveComponent, T);
    expect(result).toBeCloseTo(referenceIdealMixingGibbsEnergy(fractions, T), 9);
  });
});

describe("idealMixingGibbsEnergy — x_i=0 boundary (test 6)", () => {
  it("handles x=0 safely (no NaN/Infinity) within an otherwise-mixed ternary composition", () => {
    const withZero = ternaryComposition(Au, 0.6, Cu, 0.4, Fe, 0);
    const result = idealMixingGibbsEnergy(withZero, T);
    expect(Number.isFinite(result)).toBe(true);
    // The Fe=0 term must contribute exactly 0, so this must equal the plain binary case.
    expect(result).toBeCloseTo(idealMixingGibbsEnergy(binaryComposition(Au, 0.6, Cu, 0.4), T), 12);
  });
});

describe("idealMixingGibbsEnergy — A/B swap symmetry (test 7)", () => {
  it("is invariant under swapping which binary component is listed first", () => {
    const forward = idealMixingGibbsEnergy(binaryComposition(Au, 0.35, Cu, 0.65), T);
    const swapped = idealMixingGibbsEnergy(binaryComposition(Cu, 0.65, Au, 0.35), T);
    expect(forward).toBeCloseTo(swapped, 9);
  });
});

describe("idealMixingGibbsEnergy — invalid composition rejected (test 8)", () => {
  it("throws an EngineError (INVALID_COMPOSITION) when mole fractions don't sum to 1", () => {
    try {
      idealMixingGibbsEnergy(binaryComposition(Au, 0.5, Cu, 0.2), T);
      expect.fail("expected idealMixingGibbsEnergy() to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) {
        expect(error.code).toBe("INVALID_COMPOSITION");
        expect(error.message).toContain("sum to 1");
      }
    }
  });

  it("throws for a negative mole fraction", () => {
    expect(() => idealMixingGibbsEnergy(binaryComposition(Au, -0.1, Cu, 1.1), T)).toThrow();
  });

  it("throws for an empty composition (zero components)", () => {
    expect(() => idealMixingGibbsEnergy(composition([]), T)).toThrow();
  });

  it("throws for a duplicate element in the composition", () => {
    const duplicated = composition([
      { element: Au, fraction: 0.5 },
      { element: Au, fraction: 0.5 },
    ]);
    expect(() => idealMixingGibbsEnergy(duplicated, T)).toThrow();
  });
});

describe("idealMixingGibbsEnergy — invalid temperature rejected (test 9)", () => {
  const valid = binaryComposition(Au, 0.5, Cu, 0.5);

  it("throws an EngineError (INVALID_CONDITION) for T=0", () => {
    try {
      idealMixingGibbsEnergy(valid, 0);
      expect.fail("expected idealMixingGibbsEnergy() to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_CONDITION");
    }
  });

  it("throws for a negative temperature", () => {
    expect(() => idealMixingGibbsEnergy(valid, -300)).toThrow();
  });

  it("throws for NaN temperature", () => {
    expect(() => idealMixingGibbsEnergy(valid, NaN)).toThrow();
  });

  it("throws for infinite temperature", () => {
    expect(() => idealMixingGibbsEnergy(valid, Infinity)).toThrow();
  });
});

describe("idealMixingGibbsEnergy — physical sign (test 11)", () => {
  it("is <= 0 for pure-component and genuinely mixed compositions alike", () => {
    expect(idealMixingGibbsEnergy(pureElement(Au), T)).toBeLessThanOrEqual(0);
    expect(idealMixingGibbsEnergy(binaryComposition(Au, 0.5, Cu, 0.5), T)).toBeLessThanOrEqual(0);
    expect(idealMixingGibbsEnergy(binaryComposition(Au, 0.05, Cu, 0.95), T)).toBeLessThanOrEqual(0);
    expect(idealMixingGibbsEnergy(ternaryComposition(Fe, 0.5, Ni, 0.3, Cr, 0.2), T)).toBeLessThanOrEqual(0);
  });
});

describe("idealMixingGibbsEnergy — relationship with Phase 5A (test 12, a consistency check, not the golden-value test)", () => {
  it("equals -T * idealMixingEntropy() for independently selected compositions/temperatures distinct from the analytical-value test above", () => {
    const cases: Array<{ comp: Composition; temperatureK: number }> = [
      { comp: binaryComposition(Au, 0.42, Cu, 0.58), temperatureK: 1550 },
      { comp: ternaryComposition(Fe, 0.1, Ni, 0.6, Cr, 0.3), temperatureK: 900 },
      {
        comp: composition([
          { element: Fe, fraction: 0.15 },
          { element: Ni, fraction: 0.35 },
          { element: Cr, fraction: 0.2 },
          { element: Co, fraction: 0.3 },
        ]),
        temperatureK: 1200,
      },
    ];

    for (const { comp, temperatureK } of cases) {
      const gibbs = idealMixingGibbsEnergy(comp, temperatureK);
      const entropy = idealMixingEntropy(comp);
      expect(gibbs).toBeCloseTo(-temperatureK * entropy, 6);
    }
  });
});
