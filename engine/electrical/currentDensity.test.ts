import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { currentDensity } from "./currentDensity.js";

describe("currentDensity — basic calculation, independent hand computations", () => {
  it("matches sigma*E for an arbitrary case", () => {
    const sigma = 5.96e7; // S/m, copper-scale value used only as an arbitrary test input
    const E = 0.001; // V/m
    expect(currentDensity(sigma, E)).toBeCloseTo(sigma * E, 0);
  });

  it("zero conductivity gives exactly 0 regardless of E", () => {
    expect(currentDensity(0, 1000)).toBe(0);
  });

  it("zero field gives exactly 0 regardless of sigma", () => {
    expect(currentDensity(5e7, 0)).toBe(0);
  });
});

describe("currentDensity — sign", () => {
  it("positive sigma and positive E give positive J", () => {
    expect(currentDensity(1e6, 0.01)).toBeGreaterThan(0);
  });

  it("a negative E (reversed field) flips the sign of J — not rejected", () => {
    expect(() => currentDensity(1e6, -0.01)).not.toThrow();
    expect(currentDensity(1e6, -0.01)).toBeLessThan(0);
  });
});

describe("currentDensity — invalid input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN conductivitySPerM", () => {
    try {
      currentDensity(NaN, 0.01);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity conductivitySPerM", () => {
    expect(() => currentDensity(Infinity, 0.01)).toThrow();
  });

  it("throws INVALID_INPUT for NaN electricFieldVPerM", () => {
    try {
      currentDensity(1e6, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity electricFieldVPerM", () => {
    expect(() => currentDensity(1e6, -Infinity)).toThrow();
  });
});
