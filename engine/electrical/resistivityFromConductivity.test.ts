import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { resistivityFromConductivity } from "./resistivityFromConductivity.js";

describe("resistivityFromConductivity — basic calculation, independent hand computations", () => {
  it("matches 1/sigma for an arbitrary case", () => {
    const sigma = 5.96e7; // S/m, copper-scale value used only as an arbitrary test input
    expect(resistivityFromConductivity(sigma)).toBeCloseTo(1 / sigma, 12);
  });

  it("sigma=1 gives exactly 1", () => {
    expect(resistivityFromConductivity(1)).toBe(1);
  });
});

describe("resistivityFromConductivity — sign", () => {
  it("preserves the sign of the input (a negative sigma, though unphysical, is not rejected beyond the zero case)", () => {
    expect(() => resistivityFromConductivity(-4)).not.toThrow();
    expect(resistivityFromConductivity(-4)).toBeCloseTo(-0.25, 12);
  });
});

describe("resistivityFromConductivity — zero-denominator domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for conductivitySPerM=0", () => {
    try {
      resistivityFromConductivity(0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("resistivityFromConductivity — invalid input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN", () => {
    try {
      resistivityFromConductivity(NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity", () => {
    expect(() => resistivityFromConductivity(Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity", () => {
    expect(() => resistivityFromConductivity(-Infinity)).toThrow();
  });
});
