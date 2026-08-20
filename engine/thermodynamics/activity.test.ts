import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { computeMivmBinary } from "../models/thermodynamics/mivm/index.js";
import { activity } from "./activity.js";

describe("activity — analytical identities", () => {
  it("gamma=1 gives a_i = x_i exactly, for several mole fractions", () => {
    for (const x of [0, 0.1, 0.37, 0.5, 0.99, 1]) {
      expect(activity(1, x)).toBe(x);
    }
  });

  it("x_i=0 gives a_i=0 regardless of gamma", () => {
    expect(activity(1, 0)).toBe(0);
    expect(activity(2.5, 0)).toBe(0);
    expect(activity(0.001, 0)).toBe(0);
  });

  it("x_i=1, gamma=1 gives a_i=1", () => {
    expect(activity(1, 1)).toBe(1);
  });

  it("computes a_i = gamma_i * x_i for an arbitrary independent case (gamma=2, x=0.3 -> 0.6)", () => {
    expect(activity(2, 0.3)).toBeCloseTo(0.6, 12);
  });

  it("computes a_i correctly for gamma < 1 (negative deviation from ideality)", () => {
    expect(activity(0.4, 0.5)).toBeCloseTo(0.2, 12);
  });
});

describe("activity — boundary/error handling", () => {
  it("throws INVALID_INPUT for a non-finite activity coefficient (NaN)", () => {
    try {
      activity(NaN, 0.5);
      expect.fail("expected activity() to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for a non-finite activity coefficient (Infinity)", () => {
    expect(() => activity(Infinity, 0.5)).toThrow();
  });

  it("throws INVALID_INPUT for a mole fraction below 0", () => {
    expect(() => activity(1, -0.001)).toThrow();
  });

  it("throws INVALID_INPUT for a mole fraction above 1", () => {
    expect(() => activity(1, 1.001)).toThrow();
  });

  it("throws INVALID_INPUT for a non-finite mole fraction (NaN)", () => {
    expect(() => activity(1, NaN)).toThrow();
  });

  it("accepts the closed boundary values x=0 and x=1 without throwing", () => {
    expect(() => activity(1, 0)).not.toThrow();
    expect(() => activity(1, 1)).not.toThrow();
  });
});

describe("activity — compatible with MIVM's existing gammaI/gammaJ outputs, without duplicating MIVM's own equation", () => {
  // Same SYNTHETIC fixture values as mivm/model.test.ts (Bij/Bji/Zi/Zj/Vmi/Vmj
  // are not real literature data — see that file's own fixture comment).
  // computeMivmBinary() is called directly (the real, already-tested MIVM
  // function) — this test never reimplements MIVM's lnGamma/gamma formula.
  const FIXTURE = { Bij: 1.6, Bji: 0.62, Zi: 10, Zj: 9, Vmi: 1.02e-5, Vmj: 0.85e-5, T: 1400 };

  it("activity(gammaI, xi) reproduces gammaI*xi for a real MIVM calculation, with no adapter needed", () => {
    const xi = 0.37;
    const result = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);

    const aI = activity(result.gammaI, xi);

    expect(aI).toBeCloseTo(result.gammaI * xi, 15);
    expect(aI).toBeGreaterThan(0);
  });

  it("works symmetrically for MIVM's gammaJ at the corresponding xj = 1 - xi", () => {
    const xi = 0.37;
    const xj = 1 - xi;
    const result = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);

    const aJ = activity(result.gammaJ, xj);

    expect(aJ).toBeCloseTo(result.gammaJ * xj, 15);
  });

  it("MIVM's gammaI/gammaJ are always finite and positive (by construction, exp of a real number) — never trips activity()'s finiteness guard", () => {
    const xi = 0.37;
    const result = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);

    expect(() => activity(result.gammaI, xi)).not.toThrow();
    expect(() => activity(result.gammaJ, 1 - xi)).not.toThrow();
  });
});
