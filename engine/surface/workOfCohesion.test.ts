import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { workOfCohesion } from "./workOfCohesion.js";

describe("workOfCohesion — basic calculation, independent hand computations", () => {
  it("matches 2*gamma for a metal-scale surface energy", () => {
    const gamma = 1.5; // J/m2, arbitrary metal-scale test input
    expect(workOfCohesion(gamma)).toBeCloseTo(2 * gamma, 12);
  });

  it("matches 2*gamma for a second, unrelated arbitrary value", () => {
    const gamma = 0.072; // J/m2, water-surface-tension-scale, arbitrary test input
    expect(workOfCohesion(gamma)).toBeCloseTo(2 * gamma, 12);
  });

  it("gamma=1 gives exactly 2", () => {
    expect(workOfCohesion(1)).toBe(2);
  });
});

describe("workOfCohesion — scaling", () => {
  it("doubling gamma doubles the result", () => {
    const w1 = workOfCohesion(0.5);
    const w2 = workOfCohesion(1.0);
    expect(w2 / w1).toBeCloseTo(2, 12);
  });
});

describe("workOfCohesion — surface-energy domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for surfaceEnergyJPerM2=0", () => {
    try {
      workOfCohesion(0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative surfaceEnergyJPerM2", () => {
    try {
      workOfCohesion(-0.5);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("workOfCohesion — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN", () => {
    try {
      workOfCohesion(NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity", () => {
    expect(() => workOfCohesion(Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity", () => {
    expect(() => workOfCohesion(-Infinity)).toThrow();
  });
});
