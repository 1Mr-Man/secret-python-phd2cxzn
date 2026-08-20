import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { bulkModulus } from "./bulkModulus.js";
import { volumetricStrain } from "./volumetricStrain.js";

describe("bulkModulus — basic calculation, independent hand computations", () => {
  it("compression: positive deltaP with negative volumetric strain gives a positive K", () => {
    const deltaP = 1e6; // Pa, pressure increase
    const strainV = -0.001; // volume decreased under that pressure increase
    expect(bulkModulus(deltaP, strainV)).toBeCloseTo(1e9, 0);
  });

  it("matches -deltaP / strainV for an arbitrary case", () => {
    const deltaP = 2.5e6;
    const strainV = -0.0004;
    expect(bulkModulus(deltaP, strainV)).toBeCloseTo(-deltaP / strainV, 0);
  });

  it("zero pressure change with nonzero volumetric strain gives exactly 0", () => {
    expect(bulkModulus(0, -0.001)).toBe(0);
  });
});

describe("bulkModulus — sign convention", () => {
  it("pressure increase (deltaP > 0) with volume decrease (strainV < 0) gives K > 0 — the physical case", () => {
    expect(bulkModulus(5e6, -0.002)).toBeGreaterThan(0);
  });

  it("does not itself enforce the sign relationship — an inconsistent sign pairing is not rejected", () => {
    // deltaP > 0 with strainV > 0 is physically inconsistent for a real
    // material, but this function only applies the formula; it does not
    // police the caller's sign convention.
    expect(() => bulkModulus(5e6, 0.002)).not.toThrow();
    expect(bulkModulus(5e6, 0.002)).toBeLessThan(0);
  });
});

describe("bulkModulus — volumetric-strain domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for volumetricStrainValue = 0 (division by zero)", () => {
    try {
      bulkModulus(1e6, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("bulkModulus — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN deltaPressurePa", () => {
    try {
      bulkModulus(NaN, -0.001);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity deltaPressurePa", () => {
    expect(() => bulkModulus(Infinity, -0.001)).toThrow();
  });

  it("throws INVALID_INPUT for NaN volumetricStrainValue", () => {
    try {
      bulkModulus(1e6, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity volumetricStrainValue", () => {
    expect(() => bulkModulus(1e6, -Infinity)).toThrow();
  });
});

describe("bulkModulus — composability with volumetricStrain(), no internal call", () => {
  it("composes at the call site: volumetricStrain() feeds bulkModulus() without either calling the other internally", () => {
    const V0 = 1.0;
    const V = 0.999; // compressed under a pressure increase
    const strainV = volumetricStrain(V, V0);
    const deltaP = 1e6;

    const K = bulkModulus(deltaP, strainV);

    // Independent hand-computed expectation, not calling bulkModulus() again.
    expect(K).toBeCloseTo(-deltaP / ((V - V0) / V0), 0);
    expect(K).toBeGreaterThan(0);
  });
});
