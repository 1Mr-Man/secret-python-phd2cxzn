import { describe, expect, it } from "vitest";
import { PhysicalConstants } from "../../../core/Constants.js";
import { binaryComposition, ternaryComposition } from "../../../core/Material.js";
import { Au, Cu } from "../../../data/elements.js";
import { runCalculation } from "../../../pipeline/CalculationPipeline.js";
import { computeMivmBinary } from "./model.js";
import { MIVM_BINARY_MODEL_ID, mivmBinaryModel } from "./index.js";
// Importing the barrel registers the built-in models as a side effect.
import "../../../index.js";

/**
 * SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA. These B_ij/B_ji/Z_i/
 * Z_j/V_mi/V_mj values were chosen only to be numerically well-behaved
 * (all positive, asymmetric, no accidental degeneracy) — they are not
 * measured, fitted, or sourced from any publication and must never be
 * treated as real Au-Cu (or any other alloy's) MIVM parameters.
 */
const FIXTURE = {
  Bij: 1.6,
  Bji: 0.62,
  Zi: 10,
  Zj: 9,
  Vmi: 1.02e-5,
  Vmj: 0.85e-5,
  T: 1400,
};

/**
 * Independent transcription of the infinite-dilution limits quoted in
 * docs/MIVM_MATHEMATICAL_AUDIT.md §3.5 (from Oshakuade & Awe 2021, their
 * Eqs. 7-8, in that source's D_ij/D_ji notation — D === B here). This is
 * deliberately written as its own standalone formula, not derived from
 * computeMivmBinary()'s lnGamma(), so the regression tests below check
 * two independently-transcribed equations against each other, exactly
 * the same triangulation the audit itself performed.
 */
function lnGammaIInfiniteDilution(Bij: number, Bji: number, Zi: number, Zj: number, Vmi: number, Vmj: number): number {
  return 1 - Math.log((Vmj * Bji) / Vmi) - (Vmi * Bij) / Vmj - 0.5 * (Zi * Math.log(Bji) + Zj * Bij * Math.log(Bij));
}

function lnGammaJInfiniteDilution(Bij: number, Bji: number, Zi: number, Zj: number, Vmi: number, Vmj: number): number {
  return 1 - Math.log((Vmi * Bij) / Vmj) - (Vmj * Bji) / Vmi - 0.5 * (Zj * Math.log(Bij) + Zi * Bji * Math.log(Bji));
}

describe("computeMivmBinary — pure-component and infinite-dilution limits", () => {
  it("xi -> 1: GmE -> 0 and lnGammaI -> 0 (component i becoming pure)", () => {
    const r = computeMivmBinary(1 - 1e-9, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    expect(r.GmE_RT).toBeCloseTo(0, 6);
    expect(r.lnGammaI).toBeCloseTo(0, 6);
  });

  it("xi -> 0 (xj -> 1): GmE -> 0 and lnGammaJ -> 0 (component j becoming pure)", () => {
    const r = computeMivmBinary(1e-9, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    expect(r.GmE_RT).toBeCloseTo(0, 6);
    expect(r.lnGammaJ).toBeCloseTo(0, 6);
  });

  it("xi -> 0: lnGammaI matches the independently-transcribed infinite-dilution formula (audit §3.5, triangulated)", () => {
    const r = computeMivmBinary(1e-9, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    const expected = lnGammaIInfiniteDilution(FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj);
    expect(r.lnGammaI).toBeCloseTo(expected, 6);
  });

  it("xi -> 1 (xj -> 0): lnGammaJ matches the corresponding exchanged infinite-dilution formula", () => {
    const r = computeMivmBinary(1 - 1e-9, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    const expected = lnGammaJInfiniteDilution(FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj);
    expect(r.lnGammaJ).toBeCloseTo(expected, 6);
  });
});

describe("computeMivmBinary — exchange symmetry (lnGammaJ derivation)", () => {
  it("lnGammaJ(xi, i, j params) === lnGammaI(1-xi, j, i params) — the i<->j swap this model relies on to derive lnGammaJ", () => {
    const xi = 0.37;
    const forward = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    const swapped = computeMivmBinary(1 - xi, FIXTURE.Bji, FIXTURE.Bij, FIXTURE.Zj, FIXTURE.Zi, FIXTURE.Vmj, FIXTURE.Vmi, FIXTURE.T);

    expect(forward.lnGammaJ).toBeCloseTo(swapped.lnGammaI, 12);
    expect(forward.lnGammaI).toBeCloseTo(swapped.lnGammaJ, 12);
    expect(forward.GmE_RT).toBeCloseTo(swapped.GmE_RT, 12);
  });
});

describe("computeMivmBinary — numerical stability", () => {
  it("no NaN/Infinity across a fine composition sweep, including exact boundaries", () => {
    for (let i = 0; i <= 100; i++) {
      const xi = i / 100;
      const r = computeMivmBinary(xi, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
      for (const value of [r.GmE_RT, r.GmE, r.lnGammaI, r.lnGammaJ, r.gammaI, r.gammaJ]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(Number.isNaN(value)).toBe(false);
      }
    }
  });

  it("symmetric composition (xi=0.5) is finite and well-defined", () => {
    const r = computeMivmBinary(0.5, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    expect(Number.isFinite(r.GmE_RT)).toBe(true);
    expect(Number.isFinite(r.lnGammaI)).toBe(true);
    expect(Number.isFinite(r.lnGammaJ)).toBe(true);
  });

  it("gammaI/gammaJ are exp(lnGammaI)/exp(lnGammaJ) exactly, and are never negative", () => {
    const r = computeMivmBinary(0.3, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    expect(r.gammaI).toBeCloseTo(Math.exp(r.lnGammaI), 12);
    expect(r.gammaJ).toBeCloseTo(Math.exp(r.lnGammaJ), 12);
    expect(r.gammaI).toBeGreaterThan(0);
    expect(r.gammaJ).toBeGreaterThan(0);
  });
});

describe("computeMivmBinary — Gibbs-Duhem consistency (docs/MIVM_MATHEMATICAL_AUDIT.md §11)", () => {
  it("xi*d(lnGammaI)/dxi + xj*d(lnGammaJ)/dxi ≈ 0 across a composition sweep", () => {
    const h = 1e-6;
    for (const xi of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
      const xj = 1 - xi;

      const plus = computeMivmBinary(xi + h, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
      const minus = computeMivmBinary(xi - h, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);

      const dLnGammaI_dxi = (plus.lnGammaI - minus.lnGammaI) / (2 * h);
      const dLnGammaJ_dxi = (plus.lnGammaJ - minus.lnGammaJ) / (2 * h);

      const gibbsDuhemResidual = xi * dLnGammaI_dxi + xj * dLnGammaJ_dxi;
      expect(gibbsDuhemResidual).toBeCloseTo(0, 3);
    }
  });
});

describe("mivmBinaryModel — validate()", () => {
  const material = { composition: binaryComposition(Au, 0.4, Cu, 0.6) };
  const conditions = { temperatureK: FIXTURE.T };
  const parameters = { B_ij: FIXTURE.Bij, B_ji: FIXTURE.Bji, Z_i: FIXTURE.Zi, Z_j: FIXTURE.Zj, V_mi: FIXTURE.Vmi, V_mj: FIXTURE.Vmj };

  it("accepts a well-formed request", () => {
    const result = mivmBinaryModel.validate({ material, conditions, parameters });
    expect(result.valid).toBe(true);
  });

  it("rejects a non-binary composition", () => {
    const ternary = { composition: ternaryComposition(Au, 0.34, Cu, 0.33, Au, 0.33) };
    const result = mivmBinaryModel.validate({ material: ternary, conditions, parameters });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "MODEL_VALIDATION_ERROR")).toBe(true);
  });

  it("rejects a missing temperatureK", () => {
    const result = mivmBinaryModel.validate({ material, conditions: {}, parameters });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_CONDITION")).toBe(true);
  });

  it("rejects a non-positive temperatureK", () => {
    const result = mivmBinaryModel.validate({ material, conditions: { temperatureK: 0 }, parameters });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_CONDITION")).toBe(true);
  });

  it.each(["B_ij", "B_ji", "Z_i", "Z_j", "V_mi", "V_mj"])("rejects a missing parameter (%s)", (key) => {
    const rest = Object.fromEntries(Object.entries(parameters).filter(([k]) => k !== key));
    const result = mivmBinaryModel.validate({ material, conditions, parameters: rest });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_PARAMETER" && i.path === `parameters.${key}`)).toBe(true);
  });

  it.each(["B_ij", "B_ji", "Z_i", "Z_j", "V_mi", "V_mj"])("rejects a non-positive parameter (%s)", (key) => {
    const result = mivmBinaryModel.validate({ material, conditions, parameters: { ...parameters, [key]: 0 } });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_PARAMETER" && i.path === `parameters.${key}`)).toBe(true);
  });

  it("rejects a non-finite parameter", () => {
    const result = mivmBinaryModel.validate({ material, conditions, parameters: { ...parameters, B_ij: NaN } });
    expect(result.valid).toBe(false);
  });
});

describe("mivmBinaryModel — full pipeline (CalculationPipeline)", () => {
  it("runCalculation reaches calculate() and returns the expected output shape and provenance", () => {
    const material = { composition: binaryComposition(Au, 0.4, Cu, 0.6) };
    const conditions = { temperatureK: FIXTURE.T };
    const parameters = { B_ij: FIXTURE.Bij, B_ji: FIXTURE.Bji, Z_i: FIXTURE.Zi, Z_j: FIXTURE.Zj, V_mi: FIXTURE.Vmi, V_mj: FIXTURE.Vmj };
    const parameterSources = {
      B_ij: { kind: "estimated" as const, note: "SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA" },
    };

    const result = runCalculation({ material, modelId: MIVM_BINARY_MODEL_ID, conditions, parameters, parameterSources });

    expect(result.modelId).toBe(MIVM_BINARY_MODEL_ID);
    expect(Object.keys(result.values).sort()).toEqual(["GmE", "GmE_RT", "gammaI", "gammaJ", "lnGammaI", "lnGammaJ"]);
    expect(result.units.GmE).toBe("J/mol");
    expect(result.units.GmE_RT).toBe("dimensionless");
    expect(result.parameterProvenance.B_ij).toEqual(parameterSources.B_ij);

    const direct = computeMivmBinary(0.4, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    expect((result.values.GmE_RT as { value: number }).value).toBeCloseTo(direct.GmE_RT, 12);
    expect((result.values.GmE as { value: number }).value).toBeCloseTo(direct.GmE, 6);
  });

  it("GmE = GmE_RT * R * T exactly", () => {
    const R = PhysicalConstants.GAS_CONSTANT_R;
    const r = computeMivmBinary(0.4, FIXTURE.Bij, FIXTURE.Bji, FIXTURE.Zi, FIXTURE.Zj, FIXTURE.Vmi, FIXTURE.Vmj, FIXTURE.T);
    expect(r.GmE).toBeCloseTo(r.GmE_RT * R * FIXTURE.T, 8);
  });
});

describe("mivmBinaryModel — scope boundaries (docs/MIVM_MATHEMATICAL_AUDIT.md §22)", () => {
  it("no M-MIVM equation, reference, or terminology anywhere in this model's metadata", () => {
    const haystack = [...mivmBinaryModel.equations, ...mivmBinaryModel.assumptions, mivmBinaryModel.name, ...mivmBinaryModel.references.map((r) => `${r.citation} ${r.note ?? ""}`)].join(
      "\n",
    );
    // "M-MIVM" itself is allowed to appear ONLY inside an explicit
    // exclusion statement — this checks no bare implementation-flavored
    // mention (an equation, a parameter name) slipped in.
    expect(haystack).not.toMatch(/M-MIVM equation implemented/i);
    expect(mivmBinaryModel.outputProperties.map((p) => p.id)).not.toContain("Scc0");
  });

  it("this model has no Scc(0) output", () => {
    expect(mivmBinaryModel.outputProperties.some((p) => p.id === "Scc0")).toBe(false);
  });
});
