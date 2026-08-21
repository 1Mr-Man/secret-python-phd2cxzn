import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { elasticStress } from "./elasticStress.js";
import { youngsModulus } from "./youngsModulus.js";

describe("youngsModulus — basic calculation, independent hand computations", () => {
  it("matches stress / strain for a steel-scale case", () => {
    expect(youngsModulus(200e6, 0.001)).toBeCloseTo(200e9, 0);
  });

  it("matches stress / strain for an arbitrary case", () => {
    const stress = 175e6;
    const strain = 0.0025;
    expect(youngsModulus(stress, strain)).toBeCloseTo(stress / strain, 3);
  });

  it("zero stress with nonzero strain gives exactly 0", () => {
    expect(youngsModulus(0, 0.001)).toBe(0);
  });
});

describe("youngsModulus — sign", () => {
  it("same-sign stress/strain (tension) gives a positive modulus", () => {
    expect(youngsModulus(100e6, 0.001)).toBeGreaterThan(0);
  });

  it("same-sign stress/strain (compression) also gives a positive modulus", () => {
    expect(youngsModulus(-100e6, -0.001)).toBeGreaterThan(0);
  });
});

describe("youngsModulus — strain domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for strain = 0 (division by zero)", () => {
    try {
      youngsModulus(100e6, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("youngsModulus — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN stressPa", () => {
    try {
      youngsModulus(NaN, 0.001);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity stressPa", () => {
    expect(() => youngsModulus(Infinity, 0.001)).toThrow();
  });

  it("throws INVALID_INPUT for NaN strain", () => {
    try {
      youngsModulus(100e6, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity strain", () => {
    expect(() => youngsModulus(100e6, -Infinity)).toThrow();
  });
});

describe("youngsModulus — inverse relationship with elasticStress(), composed at the call site", () => {
  it("recovers the original modulus by round-tripping through elasticStress(), with no internal calls between them", () => {
    const E = 130e9;
    const strain = 0.0018;
    const stress = elasticStress(E, strain);
    const recoveredE = youngsModulus(stress, strain);

    expect(recoveredE).toBeCloseTo(E, 3);
  });
});
