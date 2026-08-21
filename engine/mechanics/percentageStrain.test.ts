import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { linearStrain } from "./linearStrain.js";
import { percentageStrain } from "./percentageStrain.js";

describe("percentageStrain — basic calculation", () => {
  it("converts a positive strain to percent", () => {
    expect(percentageStrain(0.05)).toBeCloseTo(5, 12);
  });

  it("converts a negative strain to percent", () => {
    expect(percentageStrain(-0.02)).toBeCloseTo(-2, 12);
  });

  it("zero strain gives exactly 0", () => {
    expect(percentageStrain(0)).toBe(0);
  });

  it("matches strain * 100 for an arbitrary value", () => {
    const strain = 0.0371;
    expect(percentageStrain(strain)).toBeCloseTo(strain * 100, 12);
  });
});

describe("percentageStrain — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN", () => {
    try {
      percentageStrain(NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity", () => {
    expect(() => percentageStrain(Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity", () => {
    expect(() => percentageStrain(-Infinity)).toThrow();
  });
});

describe("percentageStrain — composability with linearStrain(), no internal call", () => {
  it("composes at the call site to reproduce a hand-computed percentage", () => {
    const L = 1.05;
    const L0 = 1.0;
    const strain = linearStrain(L, L0);
    const percent = percentageStrain(strain);

    expect(percent).toBeCloseTo(5, 9);
    // Independent hand-computed expectation, not calling either function again.
    expect(percent).toBeCloseTo(((L - L0) / L0) * 100, 9);
  });
});
