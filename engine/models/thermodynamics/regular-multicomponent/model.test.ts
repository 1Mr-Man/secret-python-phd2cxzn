import { describe, expect, it } from "vitest";
import { isEngineError } from "../../../core/Errors.js";
import { composition, pureElement } from "../../../core/Material.js";
import { Au, Cr, Cu, Fe, Ni } from "../../../data/elements.js";
import { idealMixingGibbsEnergy } from "../../../thermodynamics/idealMixingGibbsEnergy.js";
import { extractInteractionMatrixFromParameters, regularSolutionMulticomponentModel } from "./model.js";

// All interaction (Omega) values below are SYNTHETIC TEST FIXTURES — not
// real, sourced production data for any system (same discipline as
// Redlich-Kister's Phase 12B tests and every Phase 5D interaction-matrix
// test — see the Phase 12A/13A audits: no verified multicomponent
// interaction data exists anywhere in this repository).

describe("extractInteractionMatrixFromParameters — key parsing", () => {
  it("extracts a single canonical pair", () => {
    expect(extractInteractionMatrixFromParameters({ "Omega_Au-Cu": -21500 })).toEqual({
      pairs: [{ i: "Au", j: "Cu", omegaJPerMol: -21500 }],
    });
  });

  it("extracts multiple pairs and ignores unrelated keys", () => {
    const result = extractInteractionMatrixFromParameters({
      "Omega_Cr-Fe": -500,
      "Omega_Cr-Ni": 800,
      "Omega_Fe-Ni": 1000,
      unrelatedKey: 42,
    });
    expect(result.pairs).toHaveLength(3);
    expect(result.pairs).toContainEqual({ i: "Cr", j: "Fe", omegaJPerMol: -500 });
    expect(result.pairs).toContainEqual({ i: "Cr", j: "Ni", omegaJPerMol: 800 });
    expect(result.pairs).toContainEqual({ i: "Fe", j: "Ni", omegaJPerMol: 1000 });
  });

  it("returns an empty pairs array when no Omega-keyed parameter is present", () => {
    expect(extractInteractionMatrixFromParameters({})).toEqual({ pairs: [] });
  });

  it("throws INVALID_PARAMETER for a non-finite interaction value", () => {
    try {
      extractInteractionMatrixFromParameters({ "Omega_Au-Cu": NaN });
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_PARAMETER");
    }
  });
});

describe("regularSolutionMulticomponentModel — binary regression against Regular Solution's own W*x(1-x) form", () => {
  it("matches W*xA*xB exactly for a 2-component system with one Omega pair", () => {
    const xA = 0.3;
    const W = -21500; // SYNTHETIC — same magnitude as Regular Solution's/Redlich-Kister's own test fixtures
    const material = { composition: composition([{ element: Au, fraction: xA }, { element: Cu, fraction: 1 - xA }]) };
    const conditions = { temperatureK: 1550 };

    const output = regularSolutionMulticomponentModel.calculate({
      material,
      modelId: regularSolutionMulticomponentModel.id,
      conditions,
      parameters: { "Omega_Au-Cu": W },
    });

    const GE = (output.values.GE as { value: number }).value;
    expect(GE).toBeCloseTo(W * xA * (1 - xA), 9);

    const expectedIdeal = idealMixingGibbsEnergy(material.composition, 1550);
    const deltaGMix = (output.values.deltaGMix as { value: number }).value;
    expect(deltaGMix).toBeCloseTo(expectedIdeal + W * xA * (1 - xA), 9);
  });
});

describe("regularSolutionMulticomponentModel — ternary case, independent hand calculation", () => {
  it("matches a hand-expanded sum over i<j of Omega_ij*xi*xj for Fe-Ni-Cr", () => {
    const xFe = 0.5;
    const xNi = 0.3;
    const xCr = 0.2;
    const material = {
      composition: composition([
        { element: Fe, fraction: xFe },
        { element: Ni, fraction: xNi },
        { element: Cr, fraction: xCr },
      ]),
    };
    const conditions = { temperatureK: 1200 };
    const parameters = { "Omega_Fe-Ni": 1000, "Omega_Cr-Fe": -500, "Omega_Cr-Ni": 800 };

    const output = regularSolutionMulticomponentModel.calculate({
      material,
      modelId: regularSolutionMulticomponentModel.id,
      conditions,
      parameters,
    });

    const expectedGE = 1000 * xFe * xNi + -500 * xCr * xFe + 800 * xCr * xNi;
    expect(expectedGE).toBeCloseTo(148, 9);

    const GE = (output.values.GE as { value: number }).value;
    expect(GE).toBeCloseTo(expectedGE, 9);

    const expectedIdeal = idealMixingGibbsEnergy(material.composition, 1200);
    const deltaGMix = (output.values.deltaGMix as { value: number }).value;
    expect(deltaGMix).toBeCloseTo(expectedIdeal + expectedGE, 9);
  });
});

describe("regularSolutionMulticomponentModel (ModelDefinition contract)", () => {
  const ternaryMaterial = {
    composition: composition([
      { element: Fe, fraction: 0.5 },
      { element: Ni, fraction: 0.3 },
      { element: Cr, fraction: 0.2 },
    ]),
  };
  const conditions = { temperatureK: 1200 };
  const FULL_TERNARY_PARAMETERS = { "Omega_Fe-Ni": 1000, "Omega_Cr-Fe": -500, "Omega_Cr-Ni": 800 };

  it("has no fixed required parameters (arity is composition-dependent)", () => {
    expect(regularSolutionMulticomponentModel.requiredParameters).toEqual([]);
  });

  it("validate() accepts a well-formed ternary request with all required pairs", () => {
    const result = regularSolutionMulticomponentModel.validate({
      material: ternaryMaterial,
      conditions,
      parameters: FULL_TERNARY_PARAMETERS,
    });
    expect(result.valid).toBe(true);
  });

  it("validate() accepts a zero-fraction component without requiring its pairs (InteractionMatrix's own exemption rule)", () => {
    const material = {
      composition: composition([
        { element: Fe, fraction: 0.6 },
        { element: Ni, fraction: 0.4 },
        { element: Cr, fraction: 0 },
      ]),
    };
    const result = regularSolutionMulticomponentModel.validate({
      material,
      conditions,
      parameters: { "Omega_Fe-Ni": 1000 }, // no Cr pairs needed — Cr has zero fraction
    });
    expect(result.valid).toBe(true);
  });

  it("validate() rejects a single-component (pure) composition", () => {
    const result = regularSolutionMulticomponentModel.validate({
      material: { composition: pureElement(Au) },
      conditions,
      parameters: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "MODEL_VALIDATION_ERROR")).toBe(true);
  });

  it("validate() rejects a missing temperatureK", () => {
    const result = regularSolutionMulticomponentModel.validate({
      material: ternaryMaterial,
      conditions: {},
      parameters: FULL_TERNARY_PARAMETERS,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_CONDITION")).toBe(true);
  });

  it("validate() rejects a missing required pair (Cr-Ni omitted, both positive fractions)", () => {
    const result = regularSolutionMulticomponentModel.validate({
      material: ternaryMaterial,
      conditions,
      parameters: { "Omega_Fe-Ni": 1000, "Omega_Cr-Fe": -500 }, // Omega_Cr-Ni missing
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_INPUT")).toBe(true);
  });

  it("validate() rejects a non-finite interaction value with INVALID_PARAMETER", () => {
    const result = regularSolutionMulticomponentModel.validate({
      material: ternaryMaterial,
      conditions,
      parameters: { "Omega_Fe-Ni": NaN, "Omega_Cr-Fe": -500, "Omega_Cr-Ni": 800 },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_PARAMETER")).toBe(true);
  });

  it("validate() rejects a pair referencing an element not in the composition (reused InteractionMatrix structural rule)", () => {
    const result = regularSolutionMulticomponentModel.validate({
      material: ternaryMaterial,
      conditions,
      parameters: { ...FULL_TERNARY_PARAMETERS, "Omega_Au-Cu": -100 },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_INPUT")).toBe(true);
  });

  it("calculate() returns GE and deltaGMix as J/mol PhysicalQuantities", () => {
    const output = regularSolutionMulticomponentModel.calculate({
      material: ternaryMaterial,
      modelId: regularSolutionMulticomponentModel.id,
      conditions,
      parameters: FULL_TERNARY_PARAMETERS,
    });

    expect(output.values.GE).toMatchObject({ unit: "J/mol" });
    expect(output.values.deltaGMix).toMatchObject({ unit: "J/mol" });
  });

  it("model id and domain are set correctly, and does not output Scc0", () => {
    expect(regularSolutionMulticomponentModel.id).toBe("thermodynamics.regular-solution.multicomponent");
    expect(regularSolutionMulticomponentModel.domain).toBe("thermodynamic");
    expect(regularSolutionMulticomponentModel.outputProperties.map((p) => p.id)).toEqual(["GE", "deltaGMix"]);
  });
});
