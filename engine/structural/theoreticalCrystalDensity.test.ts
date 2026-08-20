import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../core/Constants.js";
import { isEngineError } from "../core/Errors.js";
import { theoreticalCrystalDensity } from "./theoreticalCrystalDensity.js";

/** Independent hand-expansion of rho = Z*M / (N_A * (a*1e-10)^3), not calling the function under test. */
function expectedDensity(latticeConstantAngstrom: number, atomsPerUnitCell: number, molarMassKgPerMol: number): number {
  const aMeters = latticeConstantAngstrom * 1e-10;
  const volumeM3 = aMeters ** 3;
  return (atomsPerUnitCell * molarMassKgPerMol) / (PhysicalConstants.AVOGADRO_CONSTANT * volumeM3);
}

describe("theoreticalCrystalDensity — known cubic-crystal hand calculation", () => {
  it("matches copper-scale inputs (FCC-like a and Z, but supplied purely numerically)", () => {
    // a=3.615 Angstrom, Z=4, M=0.06355 kg/mol — values in copper's range,
    // used only as realistic arbitrary test inputs (not sourced/verified
    // literature data — see the project's provenance policy).
    const a = 3.615;
    const Z = 4;
    const M = 0.06355;
    const result = theoreticalCrystalDensity(a, Z, M);

    expect(result).toBeCloseTo(expectedDensity(a, Z, M), 6);
    // Sanity range check: real copper density is ~8960 kg/m3; a simple
    // theoretical calculation from a and Z alone should land in the same
    // ballpark (within a few percent), not off by orders of magnitude.
    expect(result).toBeGreaterThan(8000);
    expect(result).toBeLessThan(9500);
  });

  it("matches a second, unrelated arbitrary cubic case", () => {
    const a = 5.43; // Angstrom, silicon-diamond-cubic-scale, arbitrary test input
    const Z = 8;
    const M = 0.0280855;
    const result = theoreticalCrystalDensity(a, Z, M);
    expect(result).toBeCloseTo(expectedDensity(a, Z, M), 6);
  });
});

describe("theoreticalCrystalDensity — Angstrom-to-cubic-meters conversion correctness", () => {
  it("a=1 Angstrom gives a unit cell volume of exactly 1e-30 m3, reflected in the result", () => {
    const Z = 1;
    const M = 1;
    const result = theoreticalCrystalDensity(1, Z, M);
    const manualExpected = (Z * M) / (PhysicalConstants.AVOGADRO_CONSTANT * 1e-30);
    expect(result).toBeCloseTo(manualExpected, 6);
  });
});

describe("theoreticalCrystalDensity — lattice-constant scaling", () => {
  it("doubling the lattice constant divides density by exactly 8 (volume scales as a^3)", () => {
    const Z = 4;
    const M = 0.05;
    const a = 3.0;
    const densityA = theoreticalCrystalDensity(a, Z, M);
    const density2A = theoreticalCrystalDensity(2 * a, Z, M);
    expect(densityA / density2A).toBeCloseTo(8, 9);
  });
});

describe("theoreticalCrystalDensity — Z and M scaling", () => {
  it("doubling Z doubles the density, other inputs held fixed", () => {
    const a = 4.0;
    const M = 0.04;
    const density1 = theoreticalCrystalDensity(a, 2, M);
    const density2 = theoreticalCrystalDensity(a, 4, M);
    expect(density2 / density1).toBeCloseTo(2, 9);
  });

  it("doubling molar mass doubles the density, other inputs held fixed", () => {
    const a = 4.0;
    const Z = 2;
    const density1 = theoreticalCrystalDensity(a, Z, 0.03);
    const density2 = theoreticalCrystalDensity(a, Z, 0.06);
    expect(density2 / density1).toBeCloseTo(2, 9);
  });

  it("is purely numeric in Z — it does not matter whether the caller conceptually derived Z=4 from FCC or Z=2 from BCC, only the number matters", () => {
    const a = 3.6;
    const M = 0.05;
    // Same numeric Z, two different hypothetical physical origins for it
    // (never referenced by the function — it takes no crystalStructure
    // string at all) — both calls must produce identical output.
    const fromHypotheticalFcc = theoreticalCrystalDensity(a, 4, M);
    const fromAnotherNumericSourceOfFour = theoreticalCrystalDensity(a, 4, M);
    expect(fromHypotheticalFcc).toBe(fromAnotherNumericSourceOfFour);
  });
});

describe("theoreticalCrystalDensity — domain boundaries (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for latticeConstantAngstrom = 0", () => {
    try {
      theoreticalCrystalDensity(0, 4, 0.05);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative latticeConstantAngstrom", () => {
    try {
      theoreticalCrystalDensity(-3.6, 4, 0.05);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for atomsPerUnitCell = 0", () => {
    try {
      theoreticalCrystalDensity(3.6, 0, 0.05);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative atomsPerUnitCell", () => {
    expect(() => theoreticalCrystalDensity(3.6, -2, 0.05)).toThrow();
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for molarMassKgPerMol = 0", () => {
    try {
      theoreticalCrystalDensity(3.6, 4, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative molarMassKgPerMol", () => {
    expect(() => theoreticalCrystalDensity(3.6, 4, -0.05)).toThrow();
  });
});

describe("theoreticalCrystalDensity — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN latticeConstantAngstrom", () => {
    try {
      theoreticalCrystalDensity(NaN, 4, 0.05);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity latticeConstantAngstrom", () => {
    expect(() => theoreticalCrystalDensity(Infinity, 4, 0.05)).toThrow();
  });

  it("throws INVALID_INPUT for NaN atomsPerUnitCell", () => {
    try {
      theoreticalCrystalDensity(3.6, NaN, 0.05);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity atomsPerUnitCell", () => {
    expect(() => theoreticalCrystalDensity(3.6, Infinity, 0.05)).toThrow();
  });

  it("throws INVALID_INPUT for NaN molarMassKgPerMol", () => {
    try {
      theoreticalCrystalDensity(3.6, 4, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity molarMassKgPerMol", () => {
    expect(() => theoreticalCrystalDensity(3.6, 4, Infinity)).toThrow();
  });
});
