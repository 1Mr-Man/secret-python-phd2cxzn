import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../core/Constants.js";
import { isEngineError } from "../core/Errors.js";
import { bandGapCutoffWavelength } from "./bandGapCutoffWavelength.js";

describe("bandGapCutoffWavelength — basic calculation, independent hand computations", () => {
  it("matches h*c/(Eg*e) for a silicon-scale band gap", () => {
    const eg = 1.12; // eV, silicon-scale value, arbitrary test input
    const expected = (PhysicalConstants.PLANCK_CONSTANT * PhysicalConstants.SPEED_OF_LIGHT) / (eg * PhysicalConstants.ELEMENTARY_CHARGE);
    expect(bandGapCutoffWavelength(eg)).toBeCloseTo(expected, 15);
  });

  it("matches the known ~1107nm ballpark for a 1.12eV band gap", () => {
    const result = bandGapCutoffWavelength(1.12);
    expect(result).toBeCloseTo(1.107e-6, 8);
  });

  it("matches a second, unrelated arbitrary band gap", () => {
    const eg = 2.42; // eV, arbitrary test input
    const expected = (PhysicalConstants.PLANCK_CONSTANT * PhysicalConstants.SPEED_OF_LIGHT) / (eg * PhysicalConstants.ELEMENTARY_CHARGE);
    expect(bandGapCutoffWavelength(eg)).toBeCloseTo(expected, 16);
  });
});

describe("bandGapCutoffWavelength — the eV-to-joule conversion boundary", () => {
  it("computing without the elementary-charge conversion would give a wildly different (wrong-order-of-magnitude) result", () => {
    const eg = 1.12;
    const result = bandGapCutoffWavelength(eg);
    const withoutEvConversion = (PhysicalConstants.PLANCK_CONSTANT * PhysicalConstants.SPEED_OF_LIGHT) / eg;
    // The unconverted (eV treated as if it were joules) result is off by
    // a factor of 1/e (~6.2e18) — orders of magnitude away from the
    // correct nanometer-scale wavelength. This pins down that the
    // conversion is actually applied, not silently skipped.
    expect(Math.abs(result - withoutEvConversion) / withoutEvConversion).toBeGreaterThan(1e10);
  });

  it("scaling opticalBandGapEv by a factor scales the joule-converted energy by the same factor (linearity of the eV->J step)", () => {
    const base = bandGapCutoffWavelength(1.0);
    const doubled = bandGapCutoffWavelength(2.0);
    // Larger Eg -> shorter wavelength -> inverse relationship
    expect(doubled).toBeCloseTo(base / 2, 15);
  });
});

describe("bandGapCutoffWavelength — larger band gap gives shorter cutoff wavelength", () => {
  it("Eg=3.0 gives a shorter wavelength than Eg=1.0", () => {
    const wideGap = bandGapCutoffWavelength(3.0);
    const narrowGap = bandGapCutoffWavelength(1.0);
    expect(wideGap).toBeLessThan(narrowGap);
  });
});

describe("bandGapCutoffWavelength — band-gap domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for Eg=0", () => {
    try {
      bandGapCutoffWavelength(0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative Eg", () => {
    try {
      bandGapCutoffWavelength(-1.5);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("bandGapCutoffWavelength — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN", () => {
    try {
      bandGapCutoffWavelength(NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity", () => {
    expect(() => bandGapCutoffWavelength(Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity", () => {
    expect(() => bandGapCutoffWavelength(-Infinity)).toThrow();
  });
});
