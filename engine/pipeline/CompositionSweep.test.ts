import { describe, expect, it } from "vitest";
import { binaryComposition } from "../core/Material.js";
import { isEngineError } from "../core/Errors.js";
import { Au, Cu } from "../data/elements.js";
import { IDEAL_SOLUTION_SCC0_MODEL_ID } from "../models/thermodynamics/ideal/index.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../models/thermodynamics/quasi-chemical/index.js";
import { runCompositionSweep } from "./CompositionSweep.js";
// Importing the barrel registers the built-in models as a side effect.
import "../index.js";

function auCuAt(x: number) {
  return binaryComposition(Au, x, Cu, 1 - x);
}

describe("runCompositionSweep", () => {
  it("sweeps x = 0..1 at step 0.1 and reproduces the golden Au-Cu QC table", () => {
    const { points, warnings } = runCompositionSweep({
      start: 0,
      end: 1,
      step: 0.1,
      modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
      conditions: { temperatureK: 1550 },
      parameters: { Z: 10, W: -21500 },
      compositionAt: auCuAt,
    });

    expect(points).toHaveLength(11);
    expect(warnings).toEqual([]);

    const at = (x: number) => points.find((p) => p.x === x)!;
    expect((at(0.1).result.values.Scc0 as { value: number }).value).toBeCloseTo(0.070492, 5);
    expect((at(0.5).result.values.Scc0 as { value: number }).value).toBeCloseTo(0.13104, 5);
    expect(at(0).result.values.Scc0 as { value: number }).toMatchObject({ value: 0 });
    expect(at(1).result.values.Scc0 as { value: number }).toMatchObject({ value: 0 });
  });

  it("exposes composition values with no floating-point tail artifacts", () => {
    const { points } = runCompositionSweep({
      start: 0,
      end: 1,
      step: 0.1,
      modelId: IDEAL_SOLUTION_SCC0_MODEL_ID,
      conditions: {},
      compositionAt: auCuAt,
    });

    const xs = points.map((p) => p.x);
    expect(xs).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    // Every value round-trips through JSON with no "0.30000000000000004"-style tail.
    expect(JSON.parse(JSON.stringify(xs))).toEqual(xs);
    for (const x of xs) {
      expect(x.toString()).not.toMatch(/\d{10,}/);
    }
  });

  it("is symmetric about x = 0.5 for the Ideal Solution model", () => {
    const { points } = runCompositionSweep({
      start: 0,
      end: 1,
      step: 0.1,
      modelId: IDEAL_SOLUTION_SCC0_MODEL_ID,
      conditions: {},
      compositionAt: auCuAt,
    });

    const value = (x: number) =>
      (points.find((p) => p.x === x)!.result.values.Scc0 as { value: number }).value;

    expect(value(0.3)).toBeCloseTo(value(0.7), 10);
    expect(value(0.2)).toBeCloseTo(value(0.8), 10);
  });

  it("stops at the last point that fits when step does not evenly divide the range, without overshooting end", () => {
    const { points } = runCompositionSweep({
      start: 0,
      end: 1,
      step: 0.3,
      modelId: IDEAL_SOLUTION_SCC0_MODEL_ID,
      conditions: {},
      compositionAt: auCuAt,
    });

    expect(points.map((p) => p.x)).toEqual([0, 0.3, 0.6, 0.9]);
    expect(points.every((p) => p.x <= 1)).toBe(true);
  });

  it("supports a sub-range sweep (start > 0)", () => {
    const { points } = runCompositionSweep({
      start: 0.2,
      end: 0.5,
      step: 0.1,
      modelId: IDEAL_SOLUTION_SCC0_MODEL_ID,
      conditions: {},
      compositionAt: auCuAt,
    });

    expect(points.map((p) => p.x)).toEqual([0.2, 0.3, 0.4, 0.5]);
  });

  it("rejects a non-positive step", () => {
    for (const badStep of [0, -0.1, Number.NaN]) {
      try {
        runCompositionSweep({
          start: 0,
          end: 1,
          step: badStep,
          modelId: IDEAL_SOLUTION_SCC0_MODEL_ID,
          conditions: {},
          compositionAt: auCuAt,
        });
        expect.unreachable(`step=${badStep} should have thrown`);
      } catch (error) {
        expect(isEngineError(error)).toBe(true);
        if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
      }
    }
  });

  it("rejects an invalid range (end < start)", () => {
    try {
      runCompositionSweep({
        start: 0.8,
        end: 0.2,
        step: 0.1,
        modelId: IDEAL_SOLUTION_SCC0_MODEL_ID,
        conditions: {},
        compositionAt: auCuAt,
      });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("propagates a per-point calculation failure (fail-fast, unlike compareModels)", () => {
    expect(() =>
      runCompositionSweep({
        start: 0,
        end: 1,
        step: 0.5,
        modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
        conditions: { temperatureK: 1550 },
        parameters: {}, // missing Z, W
        compositionAt: auCuAt,
      }),
    ).toThrow();
  });

  it("works with a generic (non-Au-Cu) composition generator, proving it is not binary-alloy-specific", () => {
    const { points } = runCompositionSweep({
      start: 0,
      end: 1,
      step: 0.5,
      modelId: IDEAL_SOLUTION_SCC0_MODEL_ID,
      conditions: {},
      compositionAt: (x) => binaryComposition(Cu, x, Au, 1 - x), // reversed component order
    });

    expect(points.map((p) => p.x)).toEqual([0, 0.5, 1]);
    expect(points[0]?.result.inputSummary.material.composition.components[0]?.element.symbol).toBe("Cu");
  });
});
