import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { shearModulus } from "./shearModulus.js";

describe("shearModulus — basic calculation, independent hand computations", () => {
  it("matches shearStress / shearStrain for an arbitrary case", () => {
    const tau = 80e6;
    const gamma = 0.001;
    expect(shearModulus(tau, gamma)).toBeCloseTo(tau / gamma, 3);
  });

  it("zero shear stress with nonzero shear strain gives exactly 0", () => {
    expect(shearModulus(0, 0.001)).toBe(0);
  });
});

describe("shearModulus — sign", () => {
  it("same-sign shear stress/strain gives a positive modulus", () => {
    expect(shearModulus(50e6, 0.0006)).toBeGreaterThan(0);
  });

  it("opposite-sign shear stress/strain gives a negative modulus — not rejected (the sign check is the caller's responsibility)", () => {
    expect(() => shearModulus(50e6, -0.0006)).not.toThrow();
    expect(shearModulus(50e6, -0.0006)).toBeLessThan(0);
  });
});

describe("shearModulus — shear-strain domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for shearStrain = 0 (division by zero)", () => {
    try {
      shearModulus(50e6, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("shearModulus — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN shearStressPa", () => {
    try {
      shearModulus(NaN, 0.001);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity shearStressPa", () => {
    expect(() => shearModulus(Infinity, 0.001)).toThrow();
  });

  it("throws INVALID_INPUT for NaN shearStrain", () => {
    try {
      shearModulus(50e6, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity shearStrain", () => {
    expect(() => shearModulus(50e6, -Infinity)).toThrow();
  });
});
