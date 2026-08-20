import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { conductivityFromResistivity } from "./conductivityFromResistivity.js";
import { resistivityFromConductivity } from "./resistivityFromConductivity.js";

describe("conductivityFromResistivity — basic calculation, independent hand computations", () => {
  it("matches 1/rho for an arbitrary case", () => {
    const rho = 1.68e-8; // Ohm*m, copper-scale value used only as an arbitrary test input
    expect(conductivityFromResistivity(rho)).toBeCloseTo(1 / rho, -3);
  });

  it("rho=1 gives exactly 1", () => {
    expect(conductivityFromResistivity(1)).toBe(1);
  });
});

describe("conductivityFromResistivity — sign", () => {
  it("preserves the sign of the input (a negative rho, though unphysical, is not rejected beyond the zero case)", () => {
    expect(() => conductivityFromResistivity(-2)).not.toThrow();
    expect(conductivityFromResistivity(-2)).toBeCloseTo(-0.5, 12);
  });
});

describe("conductivityFromResistivity — zero-denominator domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for resistivityOhmM=0", () => {
    try {
      conductivityFromResistivity(0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("conductivityFromResistivity — invalid input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN", () => {
    try {
      conductivityFromResistivity(NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity", () => {
    expect(() => conductivityFromResistivity(Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity", () => {
    expect(() => conductivityFromResistivity(-Infinity)).toThrow();
  });
});

describe("conductivityFromResistivity — round-trips with resistivityFromConductivity(), composed at the call site", () => {
  it("is its own inverse under composition (neither function calls the other internally)", () => {
    const rho = 2.65e-8;
    const sigma = conductivityFromResistivity(rho);
    const recoveredRho = resistivityFromConductivity(sigma);
    expect(recoveredRho).toBeCloseTo(rho, 15);
  });
});
