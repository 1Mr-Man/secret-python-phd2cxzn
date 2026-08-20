import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../core/Constants.js";
import { isEngineError } from "../core/Errors.js";
import { binaryComposition, composition, pureElement, ternaryComposition, type Composition } from "../core/Material.js";
import { Au, Co, Cr, Cu, Fe, Ni } from "../data/elements.js";
import { idealMixingEntropy } from "./mixingEntropy.js";

/**
 * Independent reference implementation — a plain, separately-written sum,
 * not calling idealMixingEntropy() or sharing any code with it. Used to
 * cross-check arbitrary (ternary/multicomponent) compositions where a
 * hand-computed decimal isn't practical, the same triangulation approach
 * this repo already uses elsewhere (e.g. mivm/model.test.ts's
 * independently-transcribed infinite-dilution formula).
 */
function referenceMixingEntropy(fractions: number[]): number {
  let sum = 0;
  for (const x of fractions) {
    if (x > 0) sum += x * Math.log(x);
  }
  return -PhysicalConstants.GAS_CONSTANT_R * sum;
}

describe("idealMixingEntropy — pure-component and boundary limits", () => {
  it("is exactly 0 for a single-component (pure) composition", () => {
    expect(idealMixingEntropy(pureElement(Au))).toBe(0);
  });

  it("is exactly 0 for a binary composition degenerate to pure (x=1, x=0)", () => {
    expect(idealMixingEntropy(binaryComposition(Au, 1, Cu, 0))).toBe(0);
  });

  it("handles x=0 safely (no NaN/Infinity) within an otherwise-mixed ternary composition", () => {
    const withZero = ternaryComposition(Au, 0.6, Cu, 0.4, Fe, 0);
    const result = idealMixingEntropy(withZero);
    expect(Number.isFinite(result)).toBe(true);
    // The Fe=0 term must contribute exactly 0, so this must equal the plain binary case.
    expect(result).toBeCloseTo(idealMixingEntropy(binaryComposition(Au, 0.6, Cu, 0.4)), 12);
  });
});

describe("idealMixingEntropy — known analytical value", () => {
  it("equals R*ln(2) at binary equimolar composition (x=0.5) — the closed-form textbook value (-R[0.5 ln 0.5 + 0.5 ln 0.5] = R ln 2), computed independently of idealMixingEntropy's own summation loop", () => {
    const result = idealMixingEntropy(binaryComposition(Au, 0.5, Cu, 0.5));
    // Uses this project's own PhysicalConstants.GAS_CONSTANT_R (8.314, a
    // deliberately-preserved legacy value — see Constants.ts — not the
    // more precise CODATA constant), since that's the R this function
    // actually uses; Math.log(2) itself is independent of this codebase.
    expect(result).toBeCloseTo(PhysicalConstants.GAS_CONSTANT_R * Math.log(2), 12);
  });
});

describe("idealMixingEntropy — cross-checked against an independent reference implementation", () => {
  it("matches for an asymmetric binary composition", () => {
    const result = idealMixingEntropy(binaryComposition(Au, 0.3, Cu, 0.7));
    expect(result).toBeCloseTo(referenceMixingEntropy([0.3, 0.7]), 12);
  });

  it("matches for a ternary composition", () => {
    const result = idealMixingEntropy(ternaryComposition(Fe, 0.5, Ni, 0.3, Cr, 0.2));
    expect(result).toBeCloseTo(referenceMixingEntropy([0.5, 0.3, 0.2]), 12);
  });

  it("matches for an arbitrary (5-component) multicomponent composition", () => {
    const fractions = [0.2, 0.2, 0.2, 0.2, 0.2];
    const fiveComponent: Composition = composition([
      { element: Fe, fraction: fractions[0]! },
      { element: Ni, fraction: fractions[1]! },
      { element: Cr, fraction: fractions[2]! },
      { element: Co, fraction: fractions[3]! },
      { element: Cu, fraction: fractions[4]! },
    ]);
    const result = idealMixingEntropy(fiveComponent);
    expect(result).toBeCloseTo(referenceMixingEntropy(fractions), 12);
  });
});

describe("idealMixingEntropy — symmetry", () => {
  it("is invariant under swapping which binary component is listed first", () => {
    const forward = idealMixingEntropy(binaryComposition(Au, 0.35, Cu, 0.65));
    const swapped = idealMixingEntropy(binaryComposition(Cu, 0.65, Au, 0.35));
    expect(forward).toBeCloseTo(swapped, 12);
  });
});

describe("idealMixingEntropy — invalid composition is rejected, not silently miscomputed", () => {
  it("throws an EngineError (INVALID_COMPOSITION) when mole fractions don't sum to 1", () => {
    try {
      idealMixingEntropy(binaryComposition(Au, 0.5, Cu, 0.2));
      expect.fail("expected idealMixingEntropy() to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) {
        expect(error.code).toBe("INVALID_COMPOSITION");
        expect(error.message).toContain("sum to 1");
      }
    }
  });

  it("throws for a negative mole fraction", () => {
    expect(() => idealMixingEntropy(binaryComposition(Au, -0.1, Cu, 1.1))).toThrow();
  });

  it("throws for an empty composition (zero components)", () => {
    expect(() => idealMixingEntropy(composition([]))).toThrow();
  });

  it("throws for a duplicate element in the composition", () => {
    const duplicated = composition([
      { element: Au, fraction: 0.5 },
      { element: Au, fraction: 0.5 },
    ]);
    expect(() => idealMixingEntropy(duplicated)).toThrow();
  });
});
