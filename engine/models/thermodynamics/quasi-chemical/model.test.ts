import { describe, expect, it } from "vitest";
import { Au, Cu } from "../../../data/elements.js";
import { binaryComposition } from "../../../core/Material.js";
import { computeScc0QuasiChemical, quasiChemicalScc0Model } from "./model.js";

/**
 * Golden regression values for the Au–Cu system at T = 1550 K, Z = 10,
 * W = -21500 J/mol — the exact conditions the original script.js prototype
 * ships with by default. These numbers are NOT hard-coded into the model;
 * they are the expected *output* of computeScc0QuasiChemical(), used here
 * to prove the migrated equations reproduce the original arithmetic.
 */
const T = 1550;
const Z = 10;
const W = -21500;

const GOLDEN_SCC0: Array<{ x: number; scc0: number; ideal: number }> = [
  { x: 0.1, scc0: 0.070492, ideal: 0.09 },
  { x: 0.2, scc0: 0.104788, ideal: 0.16 },
  { x: 0.3, scc0: 0.121453, ideal: 0.21 },
  { x: 0.4, scc0: 0.128924, ideal: 0.24 },
  { x: 0.5, scc0: 0.13104, ideal: 0.25 },
  { x: 0.6, scc0: 0.128924, ideal: 0.24 },
  { x: 0.7, scc0: 0.121453, ideal: 0.21 },
  { x: 0.8, scc0: 0.104788, ideal: 0.16 },
];

describe("computeScc0QuasiChemical — golden values (Au-Cu, T=1550K, Z=10, W=-21500 J/mol)", () => {
  it("reproduces η² for the reference conditions", () => {
    const { etaSquared } = computeScc0QuasiChemical(0.5, W, Z, T);
    expect(etaSquared).toBeCloseTo(0.716285, 5);
  });

  it.each(GOLDEN_SCC0)("reproduces Scc(0) and the ideal baseline at x=$x", ({ x, scc0, ideal }) => {
    const result = computeScc0QuasiChemical(x, W, Z, T);
    expect(result.scc0).toBeCloseTo(scc0, 5);
    expect(result.scc0Ideal).toBeCloseTo(ideal, 5);
  });

  it("is symmetric about x = 0.5, as the equation's x(1-x) form requires", () => {
    const lower = computeScc0QuasiChemical(0.3, W, Z, T);
    const upper = computeScc0QuasiChemical(0.7, W, Z, T);
    expect(lower.scc0).toBeCloseTo(upper.scc0, 10);
  });

  it("is zero at both pure-component boundaries", () => {
    expect(computeScc0QuasiChemical(0, W, Z, T).scc0).toBe(0);
    expect(computeScc0QuasiChemical(1, W, Z, T).scc0).toBe(0);
  });
});

describe("quasiChemicalScc0Model (ModelDefinition contract)", () => {
  const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
  const conditions = { temperatureK: T };
  const parameters = { Z, W };

  it("validate() accepts a well-formed binary request", () => {
    const result = quasiChemicalScc0Model.validate({ material, conditions, parameters });
    expect(result.valid).toBe(true);
  });

  it("validate() rejects a non-binary composition", () => {
    const result = quasiChemicalScc0Model.validate({
      material: { composition: { basis: "mole_fraction", components: [{ element: Au, fraction: 1 }] } },
      conditions,
      parameters,
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("MODEL_VALIDATION_ERROR");
  });

  it("validate() rejects a missing coordination number Z", () => {
    const result = quasiChemicalScc0Model.validate({ material, conditions, parameters: { W } });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("Z"))).toBe(true);
  });

  it("validate() rejects Z <= 0", () => {
    const result = quasiChemicalScc0Model.validate({ material, conditions, parameters: { Z: 0, W } });
    expect(result.valid).toBe(false);
  });

  it("calculate() returns Scc0, Scc0Ideal, and etaSquared as dimensionless PhysicalQuantity values matching the golden values", () => {
    const output = quasiChemicalScc0Model.calculate({
      material,
      modelId: quasiChemicalScc0Model.id,
      conditions,
      parameters,
    });

    expect(output.values.Scc0).toMatchObject({ unit: "dimensionless" });
    expect((output.values.Scc0 as { value: number }).value).toBeCloseTo(0.13104, 5);
    expect((output.values.Scc0Ideal as { value: number }).value).toBeCloseTo(0.25, 5);
    expect((output.values.etaSquared as { value: number }).value).toBeCloseTo(0.716285, 5);
  });
});
