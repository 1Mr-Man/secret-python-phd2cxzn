import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { PhysicalConstants } from "../core/Constants.js";
import { magneticFluxDensity } from "./magneticFluxDensity.js";

describe("magneticFluxDensity — vacuum case (M=0) reduces to B = mu0*H", () => {
  it("matches mu0*H exactly when magnetization is zero", () => {
    const H = 1000; // A/m, arbitrary
    expect(magneticFluxDensity(H, 0)).toBeCloseTo(PhysicalConstants.VACUUM_PERMEABILITY_MU0 * H, 18);
  });

  it("H=0, M=0 gives exactly 0", () => {
    expect(magneticFluxDensity(0, 0)).toBe(0);
  });
});

describe("magneticFluxDensity — basic calculation, independent hand computations", () => {
  it("matches mu0*(H+M) for an arbitrary paramagnetic-like case (M same sign as H)", () => {
    const H = 500;
    const M = 20;
    expect(magneticFluxDensity(H, M)).toBeCloseTo(PhysicalConstants.VACUUM_PERMEABILITY_MU0 * (H + M), 18);
  });

  it("matches mu0*(H+M) for a diamagnetic-like case (M opposite sign to H)", () => {
    const H = 500;
    const M = -5;
    expect(magneticFluxDensity(H, M)).toBeCloseTo(PhysicalConstants.VACUUM_PERMEABILITY_MU0 * (H + M), 18);
  });
});

describe("magneticFluxDensity — sign and magnitude relationships", () => {
  it("a positive M increases B above the vacuum value for the same H", () => {
    const H = 500;
    const vacuumB = magneticFluxDensity(H, 0);
    const paramagneticB = magneticFluxDensity(H, 20);
    expect(paramagneticB).toBeGreaterThan(vacuumB);
  });

  it("a negative M decreases B below the vacuum value for the same H", () => {
    const H = 500;
    const vacuumB = magneticFluxDensity(H, 0);
    const diamagneticB = magneticFluxDensity(H, -20);
    expect(diamagneticB).toBeLessThan(vacuumB);
  });

  it("H=0 with nonzero M still produces a nonzero B (remanent-magnetization-like case)", () => {
    expect(magneticFluxDensity(0, 100)).toBeCloseTo(PhysicalConstants.VACUUM_PERMEABILITY_MU0 * 100, 18);
    expect(magneticFluxDensity(0, 100)).toBeGreaterThan(0);
  });
});

describe("magneticFluxDensity — invalid input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN fieldStrengthAPerM", () => {
    try {
      magneticFluxDensity(NaN, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity fieldStrengthAPerM", () => {
    expect(() => magneticFluxDensity(Infinity, 0)).toThrow();
  });

  it("throws INVALID_INPUT for NaN magnetizationAPerM", () => {
    try {
      magneticFluxDensity(0, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity magnetizationAPerM", () => {
    expect(() => magneticFluxDensity(0, -Infinity)).toThrow();
  });
});
