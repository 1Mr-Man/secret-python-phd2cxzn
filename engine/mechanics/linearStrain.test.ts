import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { linearStrain } from "./linearStrain.js";

describe("linearStrain — basic calculation, independent hand computations", () => {
  it("elongation: L > L0 gives positive strain", () => {
    expect(linearStrain(1.05, 1.0)).toBeCloseTo(0.05, 12);
  });

  it("compression: L < L0 gives negative strain", () => {
    expect(linearStrain(0.98, 1.0)).toBeCloseTo(-0.02, 12);
  });

  it("no deformation: L === L0 gives exactly 0", () => {
    expect(linearStrain(2.5, 2.5)).toBe(0);
  });

  it("matches (L - L0) / L0 for an arbitrary case", () => {
    const L = 1.234;
    const L0 = 1.1;
    expect(linearStrain(L, L0)).toBeCloseTo((L - L0) / L0, 12);
  });
});

describe("linearStrain — sign", () => {
  it("is positive for elongation", () => {
    expect(linearStrain(10.1, 10)).toBeGreaterThan(0);
  });

  it("is negative for compression", () => {
    expect(linearStrain(9.9, 10)).toBeLessThan(0);
  });
});

describe("linearStrain — reference-length domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for referenceLength = 0", () => {
    try {
      linearStrain(1, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative referenceLength", () => {
    try {
      linearStrain(1, -5);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("linearStrain — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN length", () => {
    try {
      linearStrain(NaN, 1);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity length", () => {
    expect(() => linearStrain(Infinity, 1)).toThrow();
  });

  it("throws INVALID_INPUT for NaN referenceLength", () => {
    try {
      linearStrain(1, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity referenceLength", () => {
    expect(() => linearStrain(1, Infinity)).toThrow();
  });
});

describe("linearStrain — edge values", () => {
  it("handles a very small positive referenceLength without throwing", () => {
    expect(() => linearStrain(1e-9, 1e-10)).not.toThrow();
  });

  it("handles length = 0 (total compression) without throwing", () => {
    expect(linearStrain(0, 1)).toBe(-1);
  });
});
