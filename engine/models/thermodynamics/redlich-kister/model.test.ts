import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../../../core/Constants.js";
import { isEngineError } from "../../../core/Errors.js";
import { binaryComposition } from "../../../core/Material.js";
import { Au, Cu } from "../../../data/elements.js";
import {
  computeRedlichKisterExcessGibbsEnergy,
  computeRedlichKisterTotalGibbsMixing,
  extractRedlichKisterCoefficients,
  redlichKisterBinaryModel,
} from "./model.js";

// All coefficients below are SYNTHETIC TEST FIXTURES — not real, sourced
// production data for any system (see the Phase 12A/12B audits: no
// verified Au-Cu Redlich-Kister coefficients exist anywhere in this
// repository).

describe("extractRedlichKisterCoefficients — contiguity and presence", () => {
  it("extracts a single L0", () => {
    expect(extractRedlichKisterCoefficients({ L0: 1000 })).toEqual([1000]);
  });

  it("extracts a contiguous L0..L2", () => {
    expect(extractRedlichKisterCoefficients({ L0: 500, L1: -300, L2: 150 })).toEqual([500, -300, 150]);
  });

  it("throws INVALID_PARAMETER when no L-keyed parameter is present at all", () => {
    try {
      extractRedlichKisterCoefficients({});
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_PARAMETER");
    }
  });

  it("throws INVALID_PARAMETER for a gap (L0 and L2 present, L1 missing) — never defaults the gap to zero", () => {
    try {
      extractRedlichKisterCoefficients({ L0: 1, L2: 3 });
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) {
        expect(error.code).toBe("INVALID_PARAMETER");
        expect(error.message).toContain("L1");
      }
    }
  });

  it("throws INVALID_PARAMETER when L0 itself is missing but a higher term is present", () => {
    try {
      extractRedlichKisterCoefficients({ L1: 5 });
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_PARAMETER");
    }
  });

  it("throws INVALID_PARAMETER for a non-finite L0", () => {
    expect(() => extractRedlichKisterCoefficients({ L0: NaN })).toThrow();
  });

  it("throws INVALID_PARAMETER for a non-finite higher-order term", () => {
    expect(() => extractRedlichKisterCoefficients({ L0: 1, L1: Infinity })).toThrow();
  });
});

describe("computeRedlichKisterExcessGibbsEnergy — L0-only reduces to Regular Solution's excess term", () => {
  it("matches W*xA*xB exactly, for an arbitrary composition and synthetic W", () => {
    const xA = 0.3;
    const xB = 0.7;
    const W = -21500; // SYNTHETIC — same magnitude as the Regular Solution model's own test fixture, not real Au-Cu data
    const GE = computeRedlichKisterExcessGibbsEnergy(xA, xB, [W]);
    expect(GE).toBeCloseTo(W * xA * xB, 9);
  });

  it("holds across the composition range", () => {
    const W = 8000;
    for (const xA of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const xB = 1 - xA;
      expect(computeRedlichKisterExcessGibbsEnergy(xA, xB, [W])).toBeCloseTo(W * xA * xB, 9);
    }
  });
});

describe("computeRedlichKisterExcessGibbsEnergy — deterministic polynomial evaluation, hand-calculated", () => {
  it("matches an independent hand calculation for L0+L1", () => {
    const xA = 0.4;
    const xB = 0.6;
    const L0 = 1000;
    const L1 = 200;
    const diff = xA - xB;
    const expected = xA * xB * (L0 + L1 * diff);
    expect(computeRedlichKisterExcessGibbsEnergy(xA, xB, [L0, L1])).toBeCloseTo(expected, 9);
    expect(computeRedlichKisterExcessGibbsEnergy(xA, xB, [L0, L1])).toBeCloseTo(230.4, 6);
  });

  it("matches an independent hand calculation for L0+L1+L2", () => {
    const xA = 0.65;
    const xB = 0.35;
    const L0 = 500;
    const L1 = -300;
    const L2 = 150;
    const diff = xA - xB;
    const expected = xA * xB * (L0 + L1 * diff + L2 * diff * diff);
    expect(computeRedlichKisterExcessGibbsEnergy(xA, xB, [L0, L1, L2])).toBeCloseTo(expected, 9);
    expect(computeRedlichKisterExcessGibbsEnergy(xA, xB, [L0, L1, L2])).toBeCloseTo(96.34625, 5);
  });
});

describe("computeRedlichKisterExcessGibbsEnergy — A/B symmetry behavior", () => {
  it("L0-only is fully symmetric under swapping xA and xB (matches Regular Solution's inherent symmetry)", () => {
    const xA = 0.3;
    const xB = 0.7;
    const L0 = 4200;
    expect(computeRedlichKisterExcessGibbsEnergy(xA, xB, [L0])).toBeCloseTo(computeRedlichKisterExcessGibbsEnergy(xB, xA, [L0]), 12);
  });

  it("a nonzero L1 breaks that symmetry — swapping xA/xB with the SAME coefficients changes the result", () => {
    const xA = 0.3;
    const xB = 0.7;
    const L0 = 1000;
    const L1 = 500;
    const original = computeRedlichKisterExcessGibbsEnergy(xA, xB, [L0, L1]);
    const swapped = computeRedlichKisterExcessGibbsEnergy(xB, xA, [L0, L1]);
    expect(swapped).not.toBeCloseTo(original, 6);
  });

  it("swapping xA/xB AND negating the odd-order coefficient reproduces the original value (correct relabeling invariance)", () => {
    const xA = 0.3;
    const xB = 0.7;
    const L0 = 1000;
    const L1 = 500;
    const L2 = -250;
    const original = computeRedlichKisterExcessGibbsEnergy(xA, xB, [L0, L1, L2]);
    const relabeled = computeRedlichKisterExcessGibbsEnergy(xB, xA, [L0, -L1, L2]);
    expect(relabeled).toBeCloseTo(original, 9);
  });
});

describe("computeRedlichKisterExcessGibbsEnergy — pure-component boundaries", () => {
  it("is exactly 0 at xA=1 (xB=0), regardless of coefficients", () => {
    expect(computeRedlichKisterExcessGibbsEnergy(1, 0, [1000, -500, 250])).toBe(0);
  });

  it("is exactly 0 at xA=0 (xB=1), regardless of coefficients", () => {
    expect(computeRedlichKisterExcessGibbsEnergy(0, 1, [1000, -500, 250])).toBe(0);
  });
});

describe("computeRedlichKisterTotalGibbsMixing — ideal + excess", () => {
  it("matches R*T*ln(0.5) + excess term at xA=xB=0.5", () => {
    const T = 1000;
    const L0 = 2000; // SYNTHETIC
    const { GAS_CONSTANT_R: R } = PhysicalConstants;

    const result = computeRedlichKisterTotalGibbsMixing(0.5, 0.5, T, [L0]);
    const expectedIdeal = R * T * Math.log(0.5);
    const expectedExcess = 0.5 * 0.5 * L0;

    expect(result).toBeCloseTo(expectedIdeal + expectedExcess, 6);
  });

  it("is exactly 0 at a pure-component boundary, for any coefficients (both ideal and excess terms vanish)", () => {
    expect(computeRedlichKisterTotalGibbsMixing(1, 0, 1500, [999, -111, 42])).toBe(0);
    expect(computeRedlichKisterTotalGibbsMixing(0, 1, 1500, [999, -111, 42])).toBe(0);
  });
});

describe("redlichKisterBinaryModel (ModelDefinition contract)", () => {
  const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
  const conditions = { temperatureK: 1000 };
  const SYNTHETIC_PARAMETERS = { L0: 2000, L1: 300 }; // SYNTHETIC TEST FIXTURE, not production data

  it("declares only L0 as its fixed requiredParameters entry (actual arity is data-dependent)", () => {
    expect(redlichKisterBinaryModel.requiredParameters.map((p) => p.key)).toEqual(["L0"]);
  });

  it("validate() accepts a well-formed request", () => {
    const result = redlichKisterBinaryModel.validate({ material, conditions, parameters: SYNTHETIC_PARAMETERS });
    expect(result.valid).toBe(true);
  });

  it("validate() rejects a non-binary composition", () => {
    const result = redlichKisterBinaryModel.validate({
      material: { composition: { basis: "mole_fraction", components: [{ element: Au, fraction: 1 }] } },
      conditions,
      parameters: SYNTHETIC_PARAMETERS,
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("MODEL_VALIDATION_ERROR");
  });

  it("validate() rejects a missing temperatureK", () => {
    const result = redlichKisterBinaryModel.validate({ material, conditions: {}, parameters: SYNTHETIC_PARAMETERS });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_CONDITION")).toBe(true);
  });

  it("validate() rejects a missing L0 with an INVALID_PARAMETER issue", () => {
    const result = redlichKisterBinaryModel.validate({ material, conditions, parameters: {} });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_PARAMETER")).toBe(true);
  });

  it("validate() rejects a coefficient gap (L0, L2 present, L1 missing) with an INVALID_PARAMETER issue", () => {
    const result = redlichKisterBinaryModel.validate({ material, conditions, parameters: { L0: 1, L2: 3 } });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_PARAMETER")).toBe(true);
  });

  it("calculate() returns GE and deltaGMix as J/mol PhysicalQuantities", () => {
    const output = redlichKisterBinaryModel.calculate({
      material,
      modelId: redlichKisterBinaryModel.id,
      conditions,
      parameters: SYNTHETIC_PARAMETERS,
    });

    expect(output.values.GE).toMatchObject({ unit: "J/mol" });
    expect(output.values.deltaGMix).toMatchObject({ unit: "J/mol" });

    const xA = 0.5;
    const xB = 0.5;
    const expectedGE = computeRedlichKisterExcessGibbsEnergy(xA, xB, [2000, 300]);
    const expectedDeltaGMix = computeRedlichKisterTotalGibbsMixing(xA, xB, 1000, [2000, 300]);

    expect((output.values.GE as { value: number }).value).toBeCloseTo(expectedGE, 9);
    expect((output.values.deltaGMix as { value: number }).value).toBeCloseTo(expectedDeltaGMix, 9);
  });

  it("model id and domain are set correctly", () => {
    expect(redlichKisterBinaryModel.id).toBe("thermodynamics.redlich-kister.binary");
    expect(redlichKisterBinaryModel.domain).toBe("thermodynamic");
  });
});
