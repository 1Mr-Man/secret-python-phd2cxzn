import { describe, expect, it } from "vitest";
import { binaryComposition } from "../core/Material.js";
import { isEngineError } from "../core/Errors.js";
import { Au, Cu } from "../data/elements.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../models/thermodynamics/quasi-chemical/index.js";
import { runCalculation } from "./CalculationPipeline.js";
// Importing the barrel registers the built-in models (Quasi-Chemical) as a side effect.
import "../index.js";

const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
const conditions = { temperatureK: 1550 };
const parameters = { Z: 10, W: -21500 };

describe("runCalculation — end to end via the pipeline", () => {
  it("runs the Quasi-Chemical model and reproduces the golden Scc(0) at x=0.5", () => {
    const result = runCalculation({
      material,
      modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
      conditions,
      parameters,
    });

    expect(result.modelId).toBe(QUASI_CHEMICAL_SCC0_MODEL_ID);
    expect(result.domain).toBe("thermodynamic");
    expect((result.values.Scc0 as { value: number }).value).toBeCloseTo(0.13104, 5);
    expect((result.values.Scc0Ideal as { value: number }).value).toBeCloseTo(0.25, 5);
    expect(result.units.Scc0).toBe("dimensionless");
    expect(result.inputSummary.parametersUsed).toEqual(parameters);
    expect(result.validation.valid).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.metadata.engineVersion).toBeTruthy();
    expect(() => new Date(result.metadata.calculatedAt).toISOString()).not.toThrow();
  });

  it("filters output values to requestedOutputs when provided", () => {
    const result = runCalculation({
      material,
      modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
      conditions,
      parameters,
      requestedOutputs: ["Scc0"],
    });

    expect(Object.keys(result.values)).toEqual(["Scc0"]);
    expect(result.outputProperties.map((p) => p.id)).toEqual(["Scc0"]);
  });

  it("throws INVALID_INPUT when modelId is missing", () => {
    expect(() =>
      runCalculation({ material, modelId: "", conditions, parameters }),
    ).toThrowError();
  });

  it("throws MODEL_NOT_FOUND for an unregistered model id", () => {
    try {
      runCalculation({ material, modelId: "does.not.exist", conditions, parameters });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("MODEL_NOT_FOUND");
    }
  });

  it("throws on a structurally invalid composition (fractions do not sum to 1)", () => {
    try {
      runCalculation({
        material: { composition: binaryComposition(Au, 0.3, Cu, 0.3) },
        modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
        conditions,
        parameters,
      });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_COMPOSITION");
    }
  });

  it("throws MODEL_VALIDATION_ERROR when a required condition (temperatureK) is missing", () => {
    try {
      runCalculation({ material, modelId: QUASI_CHEMICAL_SCC0_MODEL_ID, conditions: {}, parameters });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("MODEL_VALIDATION_ERROR");
    }
  });

  it("throws MODEL_VALIDATION_ERROR when required parameters are missing", () => {
    try {
      runCalculation({ material, modelId: QUASI_CHEMICAL_SCC0_MODEL_ID, conditions, parameters: {} });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("MODEL_VALIDATION_ERROR");
    }
  });
});
