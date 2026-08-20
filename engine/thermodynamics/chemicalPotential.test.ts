import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../core/Constants.js";
import { isEngineError } from "../core/Errors.js";
import { computeMivmBinary } from "../models/thermodynamics/mivm/index.js";
import { activity } from "./activity.js";
import { relativeChemicalPotential } from "./chemicalPotential.js";

const T = 1000; // arbitrary, unremarkable reference temperature (K)

describe("relativeChemicalPotential — pure-component reference (a=1)", () => {
  it("is exactly 0 J/mol at a=1, for several temperatures", () => {
    for (const temperatureK of [1, 300, 1000, 1550, 5000]) {
      expect(relativeChemicalPotential(1, temperatureK)).toBe(0);
    }
  });
});

describe("relativeChemicalPotential — known analytical value", () => {
  it("equals -RT*ln(2) at a=0.5, using this project's own R=8.314", () => {
    const result = relativeChemicalPotential(0.5, T);
    expect(result).toBeCloseTo(-PhysicalConstants.GAS_CONSTANT_R * T * Math.log(2), 9);
  });

  it("matches R*T*ln(a) directly for an arbitrary a>1 case, hand-computed independently", () => {
    const result = relativeChemicalPotential(1.8, T);
    expect(result).toBeCloseTo(PhysicalConstants.GAS_CONSTANT_R * T * Math.log(1.8), 9);
  });
});

describe("relativeChemicalPotential — physical sign", () => {
  it("is negative for a<1 (below the pure-component reference)", () => {
    expect(relativeChemicalPotential(0.1, T)).toBeLessThan(0);
    expect(relativeChemicalPotential(0.99, T)).toBeLessThan(0);
  });

  it("is positive for a>1 (positive deviation from ideality — completely valid, not rejected)", () => {
    expect(relativeChemicalPotential(1.01, T)).toBeGreaterThan(0);
    expect(relativeChemicalPotential(5, T)).toBeGreaterThan(0);
  });
});

describe("relativeChemicalPotential — activity domain boundary (SCIENTIFIC_DOMAIN_ERROR, never -Infinity)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for activity=0 (never silently returns -Infinity)", () => {
    try {
      const result = relativeChemicalPotential(0, T);
      expect.fail(`expected relativeChemicalPotential(0, T) to throw, got ${result}`);
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for a negative activity", () => {
    try {
      relativeChemicalPotential(-0.5, T);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("relativeChemicalPotential — malformed activity (INVALID_INPUT, distinct from the domain boundary)", () => {
  it("throws INVALID_INPUT for NaN activity", () => {
    try {
      relativeChemicalPotential(NaN, T);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity activity", () => {
    try {
      relativeChemicalPotential(Infinity, T);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT (NOT SCIENTIFIC_DOMAIN_ERROR) for -Infinity activity, even though -Infinity <= 0", () => {
    // The trickiest case: -Infinity satisfies the "<=0" domain check too,
    // but finiteness must be checked FIRST so this is correctly classified
    // as a malformed argument, not a physical domain boundary.
    try {
      relativeChemicalPotential(-Infinity, T);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });
});

describe("relativeChemicalPotential — invalid temperature (INVALID_CONDITION)", () => {
  it("throws for T=0", () => {
    try {
      relativeChemicalPotential(0.5, 0);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_CONDITION");
    }
  });

  it("throws for a negative temperature", () => {
    expect(() => relativeChemicalPotential(0.5, -300)).toThrow();
  });

  it("throws for NaN temperature", () => {
    expect(() => relativeChemicalPotential(0.5, NaN)).toThrow();
  });

  it("throws for infinite temperature", () => {
    expect(() => relativeChemicalPotential(0.5, Infinity)).toThrow();
  });
});

describe("relativeChemicalPotential — composed with activity(), never duplicating either function's math", () => {
  it("ideal-solution case (gamma=1): Δμ_i = RT ln(x_i) exactly, cross-checked against a direct hand-written expression", () => {
    const x = 0.3;
    const a = activity(1, x); // a = x exactly, per activity()'s own contract
    const result = relativeChemicalPotential(a, T);
    expect(result).toBeCloseTo(PhysicalConstants.GAS_CONSTANT_R * T * Math.log(x), 9);
  });

  it("composes with a real MIVM gammaI output with no adapter and no reimplementation of MIVM's equation", () => {
    // Same synthetic fixture as mivm/model.test.ts and activity.test.ts —
    // not real literature data.
    const FIXTURE = { Bij: 1.6, Bji: 0.62, Zi: 10, Zj: 9, Vmi: 1.02e-5, Vmj: 0.85e-5, T: 1400 };
    const xi = 0.37;
    const mivmResult = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);

    const a = activity(mivmResult.gammaI, xi);
    const deltaMu = relativeChemicalPotential(a, FIXTURE.T);

    expect(deltaMu).toBeCloseTo(PhysicalConstants.GAS_CONSTANT_R * FIXTURE.T * Math.log(mivmResult.gammaI * xi), 9);
  });
});

describe("relativeChemicalPotential — Gibbs-Duhem, as a composability/integration consistency test", () => {
  it("x_i*dΔμ_i/dx_i + x_j*dΔμ_j/dx_i ≈ 0 when fed real MIVM activity coefficients through activity() -> relativeChemicalPotential()", () => {
    // IMPORTANT: this does not prove relativeChemicalPotential() itself
    // satisfies Gibbs-Duhem — that identity is a property of the activity
    // coefficients supplied to it (already proven for MIVM's own gammaI/
    // gammaJ by mivm/model.test.ts's "Gibbs-Duhem consistency" describe
    // block, which checks d(lnGamma)/dx directly). This test only confirms
    // that composing activity() and relativeChemicalPotential() on top of
    // those already-consistent coefficients doesn't disrupt that relation
    // — an end-to-end pipeline check, not new physics.
    const FIXTURE = { Bij: 1.6, Bji: 0.62, Zi: 10, Zj: 9, Vmi: 1.02e-5, Vmj: 0.85e-5, T: 1400 };
    const h = 1e-6;

    function deltaMuPair(xi: number): { deltaMuI: number; deltaMuJ: number } {
      const xj = 1 - xi;
      const result = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
      return {
        deltaMuI: relativeChemicalPotential(activity(result.gammaI, xi), FIXTURE.T),
        deltaMuJ: relativeChemicalPotential(activity(result.gammaJ, xj), FIXTURE.T),
      };
    }

    for (const xi of [0.25, 0.4, 0.5, 0.6, 0.75]) {
      const xj = 1 - xi;
      const plus = deltaMuPair(xi + h);
      const minus = deltaMuPair(xi - h);

      const dMuI_dxi = (plus.deltaMuI - minus.deltaMuI) / (2 * h);
      const dMuJ_dxi = (plus.deltaMuJ - minus.deltaMuJ) / (2 * h);

      const residual = xi * dMuI_dxi + xj * dMuJ_dxi;
      // Measured actual residuals are ~1e-6 J/mol (finite-difference floating-
      // point noise, h=1e-6) — 0.01 J/mol is a generous but still meaningful
      // bound: a real implementation bug (sign error, missing RT factor,
      // wrong xi/xj pairing) would produce a residual many orders of
      // magnitude larger than this, not something this tolerance would mask.
      expect(Math.abs(residual)).toBeLessThan(0.01);
    }
  });
});
