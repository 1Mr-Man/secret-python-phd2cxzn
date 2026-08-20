import { describe, expect, it } from "vitest";
import { isEngineError } from "./Errors.js";
import { convert, convertQuantity } from "./UnitConversion.js";

describe("convert — same-family linear conversions", () => {
  it("converts within the pressure family", () => {
    expect(convert(1, "GPa", "MPa")).toBeCloseTo(1000, 9);
    expect(convert(1, "MPa", "kPa")).toBeCloseTo(1000, 9);
    expect(convert(101325, "Pa", "kPa")).toBeCloseTo(101.325, 9);
  });

  it("converts within the length family", () => {
    expect(convert(1, "m", "mm")).toBeCloseTo(1000, 9);
    expect(convert(1000, "nm", "µm")).toBeCloseTo(1, 9);
  });

  it("converts within the energy family (not molar)", () => {
    expect(convert(1, "kJ", "J")).toBeCloseTo(1000, 9);
  });

  it("converts within the molar-energy family, matching the unit MIVM/Regular Solution/Quasi-Chemical actually use (J/mol)", () => {
    expect(convert(-21.5, "kJ/mol", "J/mol")).toBeCloseTo(-21500, 9);
    expect(convert(1000, "J/mol", "kJ/mol")).toBeCloseTo(1, 9);
  });

  it("converts within the molar-volume family, matching the unit MIVM's V_mi/V_mj actually use (m3/mol)", () => {
    expect(convert(1.02e-5, "m3/mol", "cm3/mol")).toBeCloseTo(10.2, 9);
  });

  it("converts within the density family", () => {
    expect(convert(1, "g/cm3", "kg/m3")).toBeCloseTo(1000, 9);
  });

  it("round-trips through a conversion and back to the original value", () => {
    const original = 42.7;
    const roundTripped = convert(convert(original, "MPa", "Pa"), "Pa", "MPa");
    expect(roundTripped).toBeCloseTo(original, 9);
  });

  it("returns the exact input unchanged when from === to, even for an unregistered unit", () => {
    expect(convert(3.14, "dimensionless", "dimensionless")).toBe(3.14);
  });
});

describe("convert — temperature (affine, not linear)", () => {
  it("converts K to °C and back", () => {
    expect(convert(373.15, "K", "°C")).toBeCloseTo(100, 9);
    expect(convert(0, "°C", "K")).toBeCloseTo(273.15, 9);
  });

  it("accepts the ASCII 'C' alias for °C", () => {
    expect(convert(0, "C", "K")).toBeCloseTo(273.15, 9);
  });
});

describe("convert — error cases (never silently guesses)", () => {
  it("throws INVALID_INPUT for an unknown unit", () => {
    try {
      convert(1, "not-a-real-unit", "Pa");
      expect.fail("expected convert() to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for a cross-family conversion (Pa -> K)", () => {
    expect(() => convert(1, "Pa", "K")).toThrow(/different physical quantities|temperature unit/);
  });

  it("never converts energy (J) to molar energy (J/mol) — dimensionally distinct, no assumed mole count", () => {
    expect(() => convert(1, "J", "J/mol")).toThrow();
  });

  it("never converts volume (m3) to molar volume (m3/mol) — dimensionally distinct", () => {
    expect(() => convert(1, "m3", "m3/mol")).toThrow();
  });

  it("never converts magnetic flux density (T) to magnetic field strength (A/m) — requires a material's permeability, not a unit fact", () => {
    expect(() => convert(1, "T", "A/m")).toThrow();
  });
});

describe("convertQuantity", () => {
  it("converts a PhysicalQuantity and returns a new one with the target unit", () => {
    const result = convertQuantity({ value: 1, unit: "GPa" }, "MPa");
    expect(result).toEqual({ value: 1000, unit: "MPa" });
  });
});
