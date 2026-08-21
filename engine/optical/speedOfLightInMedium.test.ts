import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../core/Constants.js";
import { isEngineError } from "../core/Errors.js";
import { speedOfLightInMedium } from "./speedOfLightInMedium.js";

describe("speedOfLightInMedium — vacuum case (n=1) gives exactly c", () => {
  it("n=1 returns the exact vacuum speed of light", () => {
    expect(speedOfLightInMedium(1)).toBe(PhysicalConstants.SPEED_OF_LIGHT);
  });
});

describe("speedOfLightInMedium — basic calculation, independent hand computations", () => {
  it("matches c/n for a glass-scale refractive index", () => {
    const n = 1.5; // typical glass-scale value, arbitrary test input
    expect(speedOfLightInMedium(n)).toBeCloseTo(PhysicalConstants.SPEED_OF_LIGHT / n, 3);
  });

  it("matches c/n for a water-scale refractive index", () => {
    const n = 1.33;
    expect(speedOfLightInMedium(n)).toBeCloseTo(PhysicalConstants.SPEED_OF_LIGHT / n, 3);
  });

  it("a larger n gives a smaller speed", () => {
    const slower = speedOfLightInMedium(2.0);
    const faster = speedOfLightInMedium(1.2);
    expect(slower).toBeLessThan(faster);
  });
});

describe("speedOfLightInMedium — refractive-index domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for n=0", () => {
    try {
      speedOfLightInMedium(0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative n", () => {
    try {
      speedOfLightInMedium(-1.5);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("speedOfLightInMedium — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN", () => {
    try {
      speedOfLightInMedium(NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity", () => {
    expect(() => speedOfLightInMedium(Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity", () => {
    expect(() => speedOfLightInMedium(-Infinity)).toThrow();
  });
});
