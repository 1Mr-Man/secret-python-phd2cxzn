import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { resistivityAtTemperature } from "./resistivityAtTemperature.js";

describe("resistivityAtTemperature — basic calculation, independent hand computations", () => {
  it("matches rho0*(1+alpha*deltaT) for an arbitrary heating case", () => {
    const rho0 = 1.68e-8; // Ohm*m, copper-scale value used only as an arbitrary test input
    const alpha = 0.00386; // 1/K, copper-scale tempco used only as an arbitrary test input
    const deltaT = 50; // K
    expect(resistivityAtTemperature(rho0, alpha, deltaT)).toBeCloseTo(rho0 * (1 + alpha * deltaT), 20);
  });

  it("deltaT=0 reduces to exactly rho0", () => {
    expect(resistivityAtTemperature(1.68e-8, 0.00386, 0)).toBe(1.68e-8);
  });

  it("alpha=0 reduces to exactly rho0 regardless of deltaT", () => {
    expect(resistivityAtTemperature(2.65e-8, 0, 100)).toBe(2.65e-8);
  });
});

describe("resistivityAtTemperature — sign of deltaT (cooling is not rejected)", () => {
  it("heating (deltaT>0) with a positive alpha increases resistivity", () => {
    const rho0 = 1.68e-8;
    expect(resistivityAtTemperature(rho0, 0.00386, 50)).toBeGreaterThan(rho0);
  });

  it("cooling (deltaT<0) with a positive alpha decreases resistivity — not rejected", () => {
    const rho0 = 1.68e-8;
    expect(() => resistivityAtTemperature(rho0, 0.00386, -50)).not.toThrow();
    expect(resistivityAtTemperature(rho0, 0.00386, -50)).toBeLessThan(rho0);
  });

  it("a negative alpha (some materials, e.g. semiconductors) is not rejected", () => {
    expect(() => resistivityAtTemperature(1e-3, -0.05, 20)).not.toThrow();
    expect(resistivityAtTemperature(1e-3, -0.05, 20)).toBeLessThan(1e-3);
  });
});

describe("resistivityAtTemperature — no absolute-temperature validation, no imposed sign on the result", () => {
  it("does not throw for any finite deltaT magnitude, however large", () => {
    expect(() => resistivityAtTemperature(1e-8, 0.004, -1e6)).not.toThrow();
  });

  it("does not police the physical validity of a resulting negative resistivity — the caller-supplied linear approximation is applied as given", () => {
    // A large enough negative deltaT with a positive alpha can push the
    // linear approximation past zero; this function does not clamp or
    // reject that — it is explicitly out of scope per the Phase 8A audit.
    const result = resistivityAtTemperature(1e-8, 0.004, -1e6);
    expect(result).toBeLessThan(0);
  });
});

describe("resistivityAtTemperature — invalid input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN referenceResistivityOhmM", () => {
    try {
      resistivityAtTemperature(NaN, 0.004, 10);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity referenceResistivityOhmM", () => {
    expect(() => resistivityAtTemperature(Infinity, 0.004, 10)).toThrow();
  });

  it("throws INVALID_INPUT for NaN temperatureCoefficientPerK", () => {
    try {
      resistivityAtTemperature(1.68e-8, NaN, 10);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity temperatureCoefficientPerK", () => {
    expect(() => resistivityAtTemperature(1.68e-8, -Infinity, 10)).toThrow();
  });

  it("throws INVALID_INPUT for NaN deltaTemperatureK", () => {
    try {
      resistivityAtTemperature(1.68e-8, 0.004, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity deltaTemperatureK", () => {
    expect(() => resistivityAtTemperature(1.68e-8, 0.004, Infinity)).toThrow();
  });
});
