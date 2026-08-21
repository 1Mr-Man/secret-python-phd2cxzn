import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { ternaryComposition } from "../core/Material.js";
import { Cr, Fe, Ni } from "../data/elements.js";
import {
  buildInteractionLookup,
  canonicalPairKey,
  validateInteractionMatrixForComposition,
  validateInteractionMatrixStructure,
  type InteractionMatrix,
} from "./interactionMatrix.js";

describe("canonicalPairKey", () => {
  it("is order-independent (the whole reason it's reused from SystemIdentity.ts)", () => {
    expect(canonicalPairKey("Fe", "Ni")).toBe("Fe-Ni");
    expect(canonicalPairKey("Ni", "Fe")).toBe("Fe-Ni");
    expect(canonicalPairKey("Ni", "Fe")).toBe(canonicalPairKey("Fe", "Ni"));
  });
});

describe("validateInteractionMatrixStructure — matrix-level checks (no composition involved)", () => {
  it("passes for a well-formed matrix", () => {
    const matrix: InteractionMatrix = { pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: -21500 }] };
    expect(() => validateInteractionMatrixStructure(matrix)).not.toThrow();
  });

  it("passes for an empty matrix", () => {
    expect(() => validateInteractionMatrixStructure({ pairs: [] })).not.toThrow();
  });

  it("rejects a self-interaction pair", () => {
    const matrix: InteractionMatrix = { pairs: [{ i: "Fe", j: "Fe", omegaJPerMol: 100 }] };
    try {
      validateInteractionMatrixStructure(matrix);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects a duplicate canonical pair given in the same order twice", () => {
    const matrix: InteractionMatrix = {
      pairs: [
        { i: "Fe", j: "Ni", omegaJPerMol: -21500 },
        { i: "Fe", j: "Ni", omegaJPerMol: -1000 },
      ],
    };
    expect(() => validateInteractionMatrixStructure(matrix)).toThrow();
  });

  it("rejects a duplicate canonical pair given in reversed order (Fe-Ni then Ni-Fe)", () => {
    const matrix: InteractionMatrix = {
      pairs: [
        { i: "Fe", j: "Ni", omegaJPerMol: -21500 },
        { i: "Ni", j: "Fe", omegaJPerMol: -1000 },
      ],
    };
    expect(() => validateInteractionMatrixStructure(matrix)).toThrow();
  });

  it("rejects a non-finite omega (NaN)", () => {
    expect(() => validateInteractionMatrixStructure({ pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: NaN }] })).toThrow();
  });

  it("rejects a non-finite omega (Infinity)", () => {
    expect(() => validateInteractionMatrixStructure({ pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: Infinity }] })).toThrow();
  });

  it("rejects invalid element-symbol syntax (lowercase first letter)", () => {
    expect(() => validateInteractionMatrixStructure({ pairs: [{ i: "fe", j: "Ni", omegaJPerMol: 1 }] })).toThrow();
  });

  it("rejects invalid element-symbol syntax (empty string)", () => {
    expect(() => validateInteractionMatrixStructure({ pairs: [{ i: "", j: "Ni", omegaJPerMol: 1 }] })).toThrow();
  });

  it("rejects invalid element-symbol syntax (not a symbol shape)", () => {
    expect(() => validateInteractionMatrixStructure({ pairs: [{ i: "Iron", j: "Ni", omegaJPerMol: 1 }] })).toThrow();
  });
});

describe("validateInteractionMatrixForComposition — composition-dependent checks", () => {
  // The exact Fe/Ni/Cr example from the approved Phase 5D decision.
  const feNiCr = ternaryComposition(Fe, 0.5, Ni, 0.5, Cr, 0);

  it("requires Fe-Ni (both positive) but NOT Fe-Cr or Ni-Cr (Cr is at zero fraction)", () => {
    const matrix: InteractionMatrix = { pairs: [{ i: "Fe", j: "Ni", omegaJPerMol: -21500 }] };
    expect(() => validateInteractionMatrixForComposition(matrix, feNiCr)).not.toThrow();
  });

  it("rejects when the one required pair (Fe-Ni) is missing", () => {
    try {
      validateInteractionMatrixForComposition({ pairs: [] }, feNiCr);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) {
        expect(error.code).toBe("INVALID_INPUT");
        expect(error.message).toContain("Fe-Ni");
      }
    }
  });

  it("does NOT default the missing pair to zero — confirmed by the error explicitly saying so", () => {
    try {
      validateInteractionMatrixForComposition({ pairs: [] }, feNiCr);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.message).toContain("never treated as zero");
    }
  });

  it("allows (does not require, but does not reject) an extra entry for a zero-fraction pair", () => {
    const matrix: InteractionMatrix = {
      pairs: [
        { i: "Fe", j: "Ni", omegaJPerMol: -21500 },
        { i: "Fe", j: "Cr", omegaJPerMol: 500 }, // Cr is at x=0 — not required, but supplying it should be harmless
      ],
    };
    expect(() => validateInteractionMatrixForComposition(matrix, feNiCr)).not.toThrow();
  });

  it("rejects a pair that references an element not present in the composition at all", () => {
    const matrix: InteractionMatrix = { pairs: [{ i: "Fe", j: "Mn", omegaJPerMol: -21500 }] };
    try {
      validateInteractionMatrixForComposition(matrix, feNiCr);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.message).toContain("Mn");
    }
  });

  it("requires all three pairs when all three components are positive", () => {
    const allPositive = ternaryComposition(Fe, 0.5, Ni, 0.3, Cr, 0.2);
    const incomplete: InteractionMatrix = {
      pairs: [
        { i: "Fe", j: "Ni", omegaJPerMol: -21500 },
        { i: "Fe", j: "Cr", omegaJPerMol: 500 },
        // Ni-Cr missing
      ],
    };
    expect(() => validateInteractionMatrixForComposition(incomplete, allPositive)).toThrow();

    const complete: InteractionMatrix = {
      pairs: [...incomplete.pairs, { i: "Ni", j: "Cr", omegaJPerMol: -800 }],
    };
    expect(() => validateInteractionMatrixForComposition(complete, allPositive)).not.toThrow();
  });
});

describe("buildInteractionLookup", () => {
  it("builds a canonical-key -> omega map", () => {
    const matrix: InteractionMatrix = {
      pairs: [
        { i: "Fe", j: "Ni", omegaJPerMol: -21500 },
        { i: "Cr", j: "Fe", omegaJPerMol: 500 },
      ],
    };
    const lookup = buildInteractionLookup(matrix);
    expect(lookup.get("Fe-Ni")).toBe(-21500);
    expect(lookup.get(canonicalPairKey("Cr", "Fe"))).toBe(500);
    expect(lookup.size).toBe(2);
  });
});
