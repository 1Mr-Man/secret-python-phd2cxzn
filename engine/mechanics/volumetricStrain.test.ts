import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { volumetricStrain } from "./volumetricStrain.js";

describe("volumetricStrain — basic calculation, independent hand computations", () => {
  it("expansion: V > V0 gives positive strain", () => {
    expect(volumetricStrain(1.03, 1.0)).toBeCloseTo(0.03, 12);
  });

  it("compression: V < V0 gives negative strain", () => {
    expect(volumetricStrain(0.95, 1.0)).toBeCloseTo(-0.05, 12);
  });

  it("no deformation: V === V0 gives exactly 0", () => {
    expect(volumetricStrain(4.2, 4.2)).toBe(0);
  });

  it("matches the exact (V - V0) / V0 form for an arbitrary case", () => {
    const V = 2.345;
    const V0 = 2.1;
    expect(volumetricStrain(V, V0)).toBeCloseTo((V - V0) / V0, 12);
  });

  it("uses the exact form, not the small-strain sum-of-linear-strains approximation", () => {
    // At non-infinitesimal strain the exact and approximate forms diverge;
    // this pins down that volumetricStrain() computes the exact ratio.
    const V0 = 1.0;
    const V = 1.5; // a 50% volume increase — well outside the small-strain regime
    expect(volumetricStrain(V, V0)).toBeCloseTo(0.5, 12);
  });
});

describe("volumetricStrain — sign", () => {
  it("is positive for expansion", () => {
    expect(volumetricStrain(1.01, 1)).toBeGreaterThan(0);
  });

  it("is negative for compression", () => {
    expect(volumetricStrain(0.99, 1)).toBeLessThan(0);
  });
});

describe("volumetricStrain — reference-volume domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for referenceVolume = 0", () => {
    try {
      volumetricStrain(1, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative referenceVolume", () => {
    try {
      volumetricStrain(1, -3);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("volumetricStrain — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN volume", () => {
    try {
      volumetricStrain(NaN, 1);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity volume", () => {
    expect(() => volumetricStrain(Infinity, 1)).toThrow();
  });

  it("throws INVALID_INPUT for NaN referenceVolume", () => {
    try {
      volumetricStrain(1, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity referenceVolume", () => {
    expect(() => volumetricStrain(1, Infinity)).toThrow();
  });
});
