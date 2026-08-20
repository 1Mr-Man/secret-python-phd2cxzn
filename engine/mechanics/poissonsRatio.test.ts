import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { poissonsRatio } from "./poissonsRatio.js";

describe("poissonsRatio — basic calculation, independent hand computations", () => {
  it("matches a typical-metal case (axial elongation, transverse contraction)", () => {
    const transverse = -0.0003;
    const axial = 0.001;
    expect(poissonsRatio(transverse, axial)).toBeCloseTo(0.3, 6);
  });

  it("matches -transverseStrain / axialStrain for an arbitrary case", () => {
    const transverse = -0.00021;
    const axial = 0.0006;
    expect(poissonsRatio(transverse, axial)).toBeCloseTo(-transverse / axial, 9);
  });

  it("zero transverse strain gives exactly 0", () => {
    expect(poissonsRatio(0, 0.001)).toBe(0);
  });
});

describe("poissonsRatio — sign", () => {
  it("is positive for the ordinary case (axial elongation, transverse contraction)", () => {
    expect(poissonsRatio(-0.0002, 0.0008)).toBeGreaterThan(0);
  });

  it("is negative for an auxetic material (transverse also expands) — physically real, not rejected", () => {
    expect(() => poissonsRatio(0.0002, 0.0008)).not.toThrow();
    expect(poissonsRatio(0.0002, 0.0008)).toBeLessThan(0);
  });
});

describe("poissonsRatio — axial-strain domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for axialStrain = 0 (division by zero)", () => {
    try {
      poissonsRatio(-0.0002, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("poissonsRatio — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN transverseStrain", () => {
    try {
      poissonsRatio(NaN, 0.001);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity transverseStrain", () => {
    expect(() => poissonsRatio(Infinity, 0.001)).toThrow();
  });

  it("throws INVALID_INPUT for NaN axialStrain", () => {
    try {
      poissonsRatio(-0.0002, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity axialStrain", () => {
    expect(() => poissonsRatio(-0.0002, -Infinity)).toThrow();
  });
});
