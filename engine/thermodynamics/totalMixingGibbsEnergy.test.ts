import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { binaryComposition, pureElement } from "../core/Material.js";
import { Au, Cu } from "../data/elements.js";
import { computeMivmBinary } from "../models/thermodynamics/mivm/index.js";
import { idealMixingGibbsEnergy } from "./idealMixingGibbsEnergy.js";
import { totalMixingGibbsEnergy } from "./totalMixingGibbsEnergy.js";

describe("totalMixingGibbsEnergy — basic addition, independent hand calculations", () => {
  it("adds two positive values", () => {
    expect(totalMixingGibbsEnergy(100, 50)).toBe(150);
  });

  it("adds a negative ideal term and a negative excess term", () => {
    expect(totalMixingGibbsEnergy(-5762.8, -1200)).toBeCloseTo(-6962.8, 9);
  });

  it("adds a negative ideal term and a positive excess term", () => {
    expect(totalMixingGibbsEnergy(-5000, 3000)).toBe(-2000);
  });
});

describe("totalMixingGibbsEnergy — zero-term identities", () => {
  it("zero excess: total equals the ideal term exactly", () => {
    expect(totalMixingGibbsEnergy(-5762.8, 0)).toBe(-5762.8);
  });

  it("zero ideal: total equals the excess term exactly", () => {
    expect(totalMixingGibbsEnergy(0, 1234.5)).toBe(1234.5);
  });

  it("both zero: total is exactly 0", () => {
    expect(totalMixingGibbsEnergy(0, 0)).toBe(0);
  });
});

describe("totalMixingGibbsEnergy — sign-flip cases", () => {
  it("a large positive excess term flips the total from negative to positive", () => {
    const result = totalMixingGibbsEnergy(-1000, 5000);
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(4000);
  });

  it("a small positive excess term does not flip the sign", () => {
    const result = totalMixingGibbsEnergy(-1000, 200);
    expect(result).toBeLessThan(0);
    expect(result).toBe(-800);
  });

  it("a large negative excess term makes an already-negative total more negative", () => {
    const result = totalMixingGibbsEnergy(-1000, -5000);
    expect(result).toBeLessThan(-1000);
    expect(result).toBe(-6000);
  });
});

describe("totalMixingGibbsEnergy — finite-value validation", () => {
  it("throws INVALID_INPUT for NaN idealGibbsEnergy", () => {
    try {
      totalMixingGibbsEnergy(NaN, 100);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity idealGibbsEnergy", () => {
    expect(() => totalMixingGibbsEnergy(Infinity, 100)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity idealGibbsEnergy", () => {
    expect(() => totalMixingGibbsEnergy(-Infinity, 100)).toThrow();
  });

  it("throws INVALID_INPUT for NaN excessGibbsEnergy", () => {
    try {
      totalMixingGibbsEnergy(-1000, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity excessGibbsEnergy", () => {
    expect(() => totalMixingGibbsEnergy(-1000, Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity excessGibbsEnergy", () => {
    expect(() => totalMixingGibbsEnergy(-1000, -Infinity)).toThrow();
  });

  it("does not impose any sign restriction — finite positive/negative values are both valid for either argument", () => {
    expect(() => totalMixingGibbsEnergy(-1000, 1000)).not.toThrow();
    expect(() => totalMixingGibbsEnergy(1000, -1000)).not.toThrow(); // even though a positive "ideal" term never occurs in practice, this function doesn't police that
  });
});

describe("totalMixingGibbsEnergy — composability, no reimplementation of either source", () => {
  it("composes with 5C's idealMixingGibbsEnergy() at the call site, not internally", () => {
    const composition = binaryComposition(Au, 0.5, Cu, 0.5);
    const T = 1000;
    const idealG = idealMixingGibbsEnergy(composition, T);
    const excessG = 2000; // arbitrary synthetic excess value for this test

    const total = totalMixingGibbsEnergy(idealG, excessG);

    expect(total).toBeCloseTo(idealG + excessG, 12);
  });

  it("a pure-component composition (ideal term = 0) plus a synthetic excess still adds correctly", () => {
    const idealG = idealMixingGibbsEnergy(pureElement(Au), 1000);
    expect(idealG).toBe(0);
    expect(totalMixingGibbsEnergy(idealG, 750)).toBe(750);
  });

  it("composes with a real MIVM GmE output, with no reimplementation of MIVM's own equation", () => {
    // Same synthetic fixture as mivm/model.test.ts, activity.test.ts, and
    // chemicalPotential.test.ts — not real literature data.
    const FIXTURE = { Bij: 1.6, Bji: 0.62, Zi: 10, Zj: 9, Vmi: 1.02e-5, Vmj: 0.85e-5, T: 1400 };
    const xi = 0.37;
    const mivmResult = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);

    const composition = binaryComposition(Au, xi, Cu, 1 - xi);
    const idealG = idealMixingGibbsEnergy(composition, FIXTURE.T);

    const total = totalMixingGibbsEnergy(idealG, mivmResult.GmE);

    // Independent hand-added expectation, not calling totalMixingGibbsEnergy() again.
    expect(total).toBeCloseTo(idealG + mivmResult.GmE, 9);
  });
});
