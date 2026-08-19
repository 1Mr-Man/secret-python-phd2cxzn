import { describe, expect, it } from "vitest";
import { Au, Cu } from "../../../data/elements.js";
import { binaryComposition } from "../../../core/Material.js";
import { computeIdealScc0, idealSolutionScc0Model } from "./model.js";

const GOLDEN: Array<{ x: number; scc0: number }> = [
  { x: 0.1, scc0: 0.09 },
  { x: 0.2, scc0: 0.16 },
  { x: 0.3, scc0: 0.21 },
  { x: 0.4, scc0: 0.24 },
  { x: 0.5, scc0: 0.25 },
  { x: 0.6, scc0: 0.24 },
  { x: 0.7, scc0: 0.21 },
  { x: 0.8, scc0: 0.16 },
  { x: 0.9, scc0: 0.09 },
];

describe("computeIdealScc0 — golden values", () => {
  it.each(GOLDEN)("reproduces Scc(0) = x(1-x) at x=$x", ({ x, scc0 }) => {
    expect(computeIdealScc0(x)).toBeCloseTo(scc0, 6);
  });

  it("is zero at both pure-component boundaries (x=0, x=1)", () => {
    expect(computeIdealScc0(0)).toBe(0);
    expect(computeIdealScc0(1)).toBe(0);
  });

  it("is symmetric about x = 0.5", () => {
    expect(computeIdealScc0(0.3)).toBeCloseTo(computeIdealScc0(0.7), 12);
  });

  it("peaks at x = 0.5", () => {
    const atHalf = computeIdealScc0(0.5);
    for (const x of [0.1, 0.3, 0.7, 0.9]) {
      expect(computeIdealScc0(x)).toBeLessThan(atHalf);
    }
  });
});

describe("idealSolutionScc0Model (ModelDefinition contract)", () => {
  const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };

  it("has no required parameters", () => {
    expect(idealSolutionScc0Model.requiredParameters).toEqual([]);
  });

  it("validate() accepts a well-formed binary composition", () => {
    const result = idealSolutionScc0Model.validate({ material, conditions: {}, parameters: {} });
    expect(result.valid).toBe(true);
  });

  it("validate() rejects a non-binary composition", () => {
    const result = idealSolutionScc0Model.validate({
      material: { composition: { basis: "mole_fraction", components: [{ element: Au, fraction: 1 }] } },
      conditions: {},
      parameters: {},
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("MODEL_VALIDATION_ERROR");
  });

  it("calculate() returns Scc0 as a dimensionless PhysicalQuantity matching the golden value at x=0.5", () => {
    const output = idealSolutionScc0Model.calculate({
      material,
      modelId: idealSolutionScc0Model.id,
      conditions: {},
      parameters: {},
    });

    expect(output.values.Scc0).toMatchObject({ unit: "dimensionless" });
    expect((output.values.Scc0 as { value: number }).value).toBeCloseTo(0.25, 6);
  });
});
