import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { thermalStrain } from "./thermalStrain.js";

describe("thermalStrain — basic calculation, independent hand computations", () => {
  it("matches alpha * deltaT for a typical steel-like coefficient", () => {
    const alpha = 12e-6; // 1/K, a typical structural-steel-scale value used only as an arbitrary test input
    const deltaT = 100; // K
    expect(thermalStrain(alpha, deltaT)).toBeCloseTo(alpha * deltaT, 15);
  });

  it("zero temperature change gives exactly 0", () => {
    expect(thermalStrain(12e-6, 0)).toBe(0);
  });

  it("zero expansion coefficient gives exactly 0 regardless of deltaT", () => {
    expect(thermalStrain(0, 500)).toBe(0);
  });
});

describe("thermalStrain — sign", () => {
  it("heating (deltaT > 0) with a positive alpha gives positive strain", () => {
    expect(thermalStrain(10e-6, 50)).toBeGreaterThan(0);
  });

  it("cooling (deltaT < 0) with a positive alpha gives negative strain — not rejected", () => {
    expect(() => thermalStrain(10e-6, -50)).not.toThrow();
    expect(thermalStrain(10e-6, -50)).toBeLessThan(0);
  });

  it("a negative expansion coefficient (some real materials, e.g. certain ceramics) is not rejected", () => {
    expect(() => thermalStrain(-2e-6, 100)).not.toThrow();
    expect(thermalStrain(-2e-6, 100)).toBeLessThan(0);
  });
});

describe("thermalStrain — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN thermalExpansionCoefficientPerK", () => {
    try {
      thermalStrain(NaN, 100);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity thermalExpansionCoefficientPerK", () => {
    expect(() => thermalStrain(Infinity, 100)).toThrow();
  });

  it("throws INVALID_INPUT for NaN deltaTemperatureK", () => {
    try {
      thermalStrain(12e-6, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity deltaTemperatureK", () => {
    expect(() => thermalStrain(12e-6, -Infinity)).toThrow();
  });
});
