import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { elasticStress } from "./elasticStress.js";

describe("elasticStress — basic calculation, independent hand computations", () => {
  it("matches E * strain for a steel-scale modulus", () => {
    const E = 200e9; // Pa, a typical structural-steel-scale value used only as an arbitrary test input
    const strain = 0.001;
    expect(elasticStress(E, strain)).toBeCloseTo(200e6, 0);
  });

  it("zero strain gives exactly 0 stress", () => {
    expect(elasticStress(200e9, 0)).toBe(0);
  });

  it("matches E * strain for an arbitrary case", () => {
    const E = 70e9;
    const strain = 0.0025;
    expect(elasticStress(E, strain)).toBeCloseTo(E * strain, 6);
  });
});

describe("elasticStress — sign", () => {
  it("tension (positive strain) gives positive stress", () => {
    expect(elasticStress(100e9, 0.002)).toBeGreaterThan(0);
  });

  it("compression (negative strain) gives negative stress", () => {
    expect(elasticStress(100e9, -0.002)).toBeLessThan(0);
  });
});

describe("elasticStress — modulus domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for youngsModulusPa = 0", () => {
    try {
      elasticStress(0, 0.001);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative youngsModulusPa", () => {
    try {
      elasticStress(-50e9, 0.001);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("elasticStress — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN youngsModulusPa", () => {
    try {
      elasticStress(NaN, 0.001);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity youngsModulusPa", () => {
    expect(() => elasticStress(Infinity, 0.001)).toThrow();
  });

  it("throws INVALID_INPUT for NaN strain", () => {
    try {
      elasticStress(200e9, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity strain", () => {
    expect(() => elasticStress(200e9, -Infinity)).toThrow();
  });
});
