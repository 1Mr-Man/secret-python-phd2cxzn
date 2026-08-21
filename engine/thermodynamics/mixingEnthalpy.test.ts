import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { binaryComposition, composition, pureElement, ternaryComposition } from "../core/Material.js";
import { Au, Cr, Cu, Fe, Ni } from "../data/elements.js";
import type { InteractionMatrix } from "./interactionMatrix.js";
import { regularSolutionMixingEnthalpy } from "./mixingEnthalpy.js";

describe("regularSolutionMixingEnthalpy — known analytical values", () => {
  it("binary: Ω=-21500 at x=0.5 gives Ω*0.25 = -5375 J/mol, hand-computed", () => {
    const matrix: InteractionMatrix = { pairs: [{ i: "Au", j: "Cu", omegaJPerMol: -21500 }] };
    const result = regularSolutionMixingEnthalpy(binaryComposition(Au, 0.5, Cu, 0.5), matrix);
    expect(result).toBeCloseTo(-21500 * 0.25, 9);
    expect(result).toBeCloseTo(-5375, 9);
  });

  it("binary asymmetric: Ω=1000 at x=0.3 gives Ω*0.3*0.7 = 210 J/mol, hand-computed", () => {
    const matrix: InteractionMatrix = { pairs: [{ i: "Au", j: "Cu", omegaJPerMol: 1000 }] };
    const result = regularSolutionMixingEnthalpy(binaryComposition(Au, 0.3, Cu, 0.7), matrix);
    expect(result).toBeCloseTo(210, 9);
  });

  it("ternary: matches a separately hand-summed value across all three pairs", () => {
    const comp = ternaryComposition(Fe, 0.5, Ni, 0.3, Cr, 0.2);
    const matrix: InteractionMatrix = {
      pairs: [
        { i: "Fe", j: "Ni", omegaJPerMol: -21500 },
        { i: "Fe", j: "Cr", omegaJPerMol: 500 },
        { i: "Ni", j: "Cr", omegaJPerMol: -800 },
      ],
    };
    // Hand-computed, independent of the production summation loop:
    const expected = -21500 * 0.5 * 0.3 + 500 * 0.5 * 0.2 + -800 * 0.3 * 0.2;
    const result = regularSolutionMixingEnthalpy(comp, matrix);
    expect(result).toBeCloseTo(expected, 9);
  });

  it("matches Regular Solution's own W*x(1-x) form exactly when Ω is set equal to a synthetic W", () => {
    // Regular Solution's own documented enthalpy term (regular/metadata.ts)
    // is W*x(1-x) — this cross-checks against that already-accepted form,
    // written directly here (not calling any Regular Solution code, which
    // doesn't expose ΔH_mix itself — see the Phase 5 audit §B.2/§E).
    const W = -21500;
    const x = 0.37;
    const expected = W * x * (1 - x);
    const matrix: InteractionMatrix = { pairs: [{ i: "Au", j: "Cu", omegaJPerMol: W }] };
    const result = regularSolutionMixingEnthalpy(binaryComposition(Au, x, Cu, 1 - x), matrix);
    expect(result).toBeCloseTo(expected, 9);
  });
});

describe("regularSolutionMixingEnthalpy — pure-component and zero-fraction limits", () => {
  it("is exactly 0 for a pure-component composition, with no matrix entries required", () => {
    expect(regularSolutionMixingEnthalpy(pureElement(Au), { pairs: [] })).toBe(0);
  });

  it("is exactly 0 for a binary composition degenerate to pure (x=1, x=0), with no matrix entries required", () => {
    expect(regularSolutionMixingEnthalpy(binaryComposition(Au, 1, Cu, 0), { pairs: [] })).toBe(0);
  });

  it("the exact Fe/Ni/Cr example from the approved Phase 5D decision: Cr=0 exempts Fe-Cr and Ni-Cr", () => {
    const comp = ternaryComposition(Fe, 0.5, Ni, 0.5, Cr, 0);
    const matrix: InteractionMatrix = { pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: -21500 }] };
    const result = regularSolutionMixingEnthalpy(comp, matrix);
    // Only the Fe-Ni term contributes; Cr's terms are 0 regardless of Ω.
    expect(result).toBeCloseTo(-21500 * 0.5 * 0.5, 9);
  });
});

describe("regularSolutionMixingEnthalpy — canonical-order symmetry", () => {
  it("gives the same result whether a pair is stored i=Fe,j=Ni or i=Ni,j=Fe", () => {
    const comp = binaryComposition(Fe, 0.4, Ni, 0.6);
    const forward = regularSolutionMixingEnthalpy(comp, { pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: -3000 }] });
    const reversed = regularSolutionMixingEnthalpy(comp, { pairs: [{ i: "Ni", j: "Fe", omegaJPerMol: -3000 }] });
    expect(forward).toBeCloseTo(reversed, 12);
  });

  it("is invariant under swapping which binary component is listed first in the composition", () => {
    const matrix: InteractionMatrix = { pairs: [{ i: "Au", j: "Cu", omegaJPerMol: -21500 }] };
    const forward = regularSolutionMixingEnthalpy(binaryComposition(Au, 0.35, Cu, 0.65), matrix);
    const swapped = regularSolutionMixingEnthalpy(binaryComposition(Cu, 0.65, Au, 0.35), matrix);
    expect(forward).toBeCloseTo(swapped, 9);
  });
});

describe("regularSolutionMixingEnthalpy — strict rejection, never defaults to zero", () => {
  it("throws when a required pair (both fractions positive) is missing", () => {
    const comp = ternaryComposition(Fe, 0.5, Ni, 0.3, Cr, 0.2);
    const incomplete: InteractionMatrix = {
      pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: -21500 }], // Fe-Cr and Ni-Cr missing, but Cr>0
    };
    expect(() => regularSolutionMixingEnthalpy(comp, incomplete)).toThrow();
  });

  it("throws for a matrix entry referencing an element not in the composition", () => {
    const comp = binaryComposition(Fe, 0.5, Ni, 0.5);
    const matrix: InteractionMatrix = { pairs: [{ i: "Fe", j: "Cr", omegaJPerMol: 100 }] };
    expect(() => regularSolutionMixingEnthalpy(comp, matrix)).toThrow();
  });

  it("throws for a duplicate canonical pair in the matrix", () => {
    const comp = binaryComposition(Fe, 0.5, Ni, 0.5);
    const matrix: InteractionMatrix = {
      pairs: [
        { i: "Fe", j: "Ni", omegaJPerMol: -21500 },
        { i: "Ni", j: "Fe", omegaJPerMol: 1 },
      ],
    };
    expect(() => regularSolutionMixingEnthalpy(comp, matrix)).toThrow();
  });

  it("throws for a self-interaction pair in the matrix", () => {
    const comp = binaryComposition(Fe, 0.5, Ni, 0.5);
    const matrix: InteractionMatrix = { pairs: [{ i: "Fe", j: "Fe", omegaJPerMol: 100 }] };
    expect(() => regularSolutionMixingEnthalpy(comp, matrix)).toThrow();
  });

  it("throws for a non-finite omega", () => {
    const comp = binaryComposition(Fe, 0.5, Ni, 0.5);
    expect(() => regularSolutionMixingEnthalpy(comp, { pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: NaN }] })).toThrow();
  });
});

describe("regularSolutionMixingEnthalpy — invalid composition rejected", () => {
  it("throws an EngineError (INVALID_COMPOSITION) when mole fractions don't sum to 1", () => {
    try {
      regularSolutionMixingEnthalpy(binaryComposition(Fe, 0.5, Ni, 0.2), { pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: 1 }] });
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_COMPOSITION");
    }
  });

  it("throws for an empty composition", () => {
    expect(() => regularSolutionMixingEnthalpy(composition([]), { pairs: [] })).toThrow();
  });
});
