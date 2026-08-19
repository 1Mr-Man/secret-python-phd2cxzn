import { describe, expect, it } from "vitest";
import { Au, Cu } from "../../../data/elements.js";
import { binaryComposition } from "../../../core/Material.js";
import { computeScc0QuasiChemical } from "../quasi-chemical/model.js";
import { computeRegularScc0, regularSolutionScc0Model } from "./model.js";

/**
 * Same reference conditions as the Quasi-Chemical golden tests: Au-Cu,
 * T=1550K, W=-21500 J/mol. Values below were derived (not copied from any
 * existing source) from Scc(0) = x(1-x) / [1 - (2W/RT)x(1-x)] — see
 * metadata.ts for the full derivation.
 */
const T = 1550;
const W = -21500;

const GOLDEN: Array<{ x: number; scc0: number }> = [
  { x: 0.1, scc0: 0.069214 },
  { x: 0.2, scc0: 0.10431 },
  { x: 0.3, scc0: 0.123477 },
  { x: 0.4, scc0: 0.133272 },
  { x: 0.5, scc0: 0.1363 },
  { x: 0.6, scc0: 0.133272 },
  { x: 0.7, scc0: 0.123477 },
  { x: 0.8, scc0: 0.10431 },
  { x: 0.9, scc0: 0.069214 },
];

describe("computeRegularScc0 — derived values (Au-Cu, T=1550K, W=-21500 J/mol)", () => {
  it.each(GOLDEN)("reproduces Scc(0) at x=$x", ({ x, scc0 }) => {
    expect(computeRegularScc0(x, W, T).scc0).toBeCloseTo(scc0, 5);
  });

  it("is zero at both pure-component boundaries", () => {
    expect(computeRegularScc0(0, W, T).scc0).toBe(0);
    expect(computeRegularScc0(1, W, T).scc0).toBe(0);
  });

  it("is symmetric about x = 0.5", () => {
    expect(computeRegularScc0(0.3, W, T).scc0).toBeCloseTo(computeRegularScc0(0.7, W, T).scc0, 10);
  });

  it("sits strictly between the ideal (0.25) and Quasi-Chemical (Z=10, 0.131040) values at x=0.5 — the expected physical ordering for an ordering system (W<0)", () => {
    const ideal = 0.25;
    const qc = computeScc0QuasiChemical(0.5, W, 10, T).scc0;
    const regular = computeRegularScc0(0.5, W, T).scc0;
    expect(regular).toBeLessThan(ideal);
    expect(regular).toBeGreaterThan(qc);
  });

  it("AUTHORITATIVE CHECK: converges to the Quasi-Chemical model's own Z -> infinity (mean-field) limit at matching (T, W) — this is the derivation's verification, not just an independent guess", () => {
    const regular = computeRegularScc0(0.5, W, T).scc0;
    const qcAtHugeZ = computeScc0QuasiChemical(0.5, W, 10_000_000, T).scc0;
    expect(qcAtHugeZ).toBeCloseTo(regular, 6);
  });
});

describe("computeRegularScc0 — spinodal (scientific domain of validity)", () => {
  it("has a positive denominator for the Au-Cu ordering case (W<0) across the whole composition range", () => {
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(computeRegularScc0(x, W, T).denominator).toBeGreaterThan(0);
    }
  });

  it("denominator goes non-positive for a large positive (unmixing-tendency) W at x=0.5 — the spinodal condition", () => {
    expect(computeRegularScc0(0.5, 30000, T).denominator).toBeLessThanOrEqual(0);
  });
});

describe("regularSolutionScc0Model (ModelDefinition contract)", () => {
  const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
  const conditions = { temperatureK: T };

  it("requires exactly one parameter: W (no coordination number)", () => {
    expect(regularSolutionScc0Model.requiredParameters.map((p) => p.key)).toEqual(["W"]);
  });

  it("validate() accepts a well-formed request", () => {
    const result = regularSolutionScc0Model.validate({ material, conditions, parameters: { W } });
    expect(result.valid).toBe(true);
  });

  it("validate() rejects a non-binary composition", () => {
    const result = regularSolutionScc0Model.validate({
      material: { composition: { basis: "mole_fraction", components: [{ element: Au, fraction: 1 }] } },
      conditions,
      parameters: { W },
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("MODEL_VALIDATION_ERROR");
  });

  it("validate() rejects a missing W with an INVALID_PARAMETER issue", () => {
    const result = regularSolutionScc0Model.validate({ material, conditions, parameters: {} });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_PARAMETER")).toBe(true);
  });

  it("validate() rejects a non-finite W", () => {
    const result = regularSolutionScc0Model.validate({
      material,
      conditions,
      parameters: { W: Number.NaN },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INVALID_PARAMETER")).toBe(true);
  });

  it("validate() rejects a spinodal composition/parameter combination with a SCIENTIFIC_DOMAIN_ERROR issue", () => {
    const result = regularSolutionScc0Model.validate({ material, conditions, parameters: { W: 30000 } });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "SCIENTIFIC_DOMAIN_ERROR")).toBe(true);
  });

  it("calculate() returns Scc0 as a dimensionless PhysicalQuantity matching the derived value at x=0.5", () => {
    const output = regularSolutionScc0Model.calculate({
      material,
      modelId: regularSolutionScc0Model.id,
      conditions,
      parameters: { W },
    });

    expect(output.values.Scc0).toMatchObject({ unit: "dimensionless" });
    expect((output.values.Scc0 as { value: number }).value).toBeCloseTo(0.1363, 5);
  });
});
