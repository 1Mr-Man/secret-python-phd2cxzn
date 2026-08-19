import { beforeEach, describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { binaryComposition } from "../core/Material.js";
import { Au, Cu } from "../data/elements.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../models/thermodynamics/quasi-chemical/index.js";
import { resolveQuasiChemicalParameters } from "../models/thermodynamics/quasi-chemical/parameters.js";
import { REGULAR_SOLUTION_SCC0_MODEL_ID } from "../models/thermodynamics/regular/index.js";
import { resolveRegularSolutionParameters } from "../models/thermodynamics/regular/parameters.js";
import { computeRegularScc0 } from "../models/thermodynamics/regular/model.js";
import { runCalculation } from "../pipeline/CalculationPipeline.js";
import { clearParameterStore, registerParameterSet } from "./parameterStore.js";
import { resolveParameterSet } from "./resolve.js";
import type { ParameterResolutionResult } from "./resolve.js";
import { toRequestParameters } from "./toRequestParameters.js";
import type { ParameterSet } from "./types.js";
// Importing the barrel registers the built-in models as a side effect.
import "../index.js";

const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
const conditions = { temperatureK: 1550 };

function regularFixture(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    setId: "fixture-regular",
    modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
    system: "Au-Cu",
    compatibility: "directly_compatible",
    parameters: [
      {
        key: "W",
        value: -19500,
        unit: "J/mol",
        status: "verified_direct",
        source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — not real data", doi: "10.0000/fixture" },
        verification: { method: "direct_read", location: { type: "table", identifier: "3", page: 112 } },
      },
    ],
    ...overrides,
  };
}

function qcFixture(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    setId: "fixture-qc",
    modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
    system: "Au-Cu",
    compatibility: "directly_compatible",
    parameters: [
      {
        key: "Z",
        value: 10,
        unit: "dimensionless",
        status: "verified_direct",
        source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — not real data" },
        verification: { method: "direct_read" },
      },
      {
        key: "W",
        value: -21500,
        unit: "J/mol",
        status: "verified_direct",
        source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — not real data" },
        verification: { method: "direct_read" },
      },
    ],
    ...overrides,
  };
}

describe("toRequestParameters", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("converts a FOUND result into {parameters, parameterSources}", () => {
    registerParameterSet(regularFixture());
    const resolution = resolveRegularSolutionParameters(material, conditions);
    const { parameters, parameterSources } = toRequestParameters(resolution);

    expect(parameters).toEqual({ W: -19500 });
    expect(parameterSources.W).toEqual(regularFixture().parameters[0]!.source);
  });

  it("converts a PROVISIONAL result the same way", () => {
    registerParameterSet(
      regularFixture({
        parameters: [
          {
            key: "W",
            value: -18000,
            unit: "J/mol",
            status: "provisional",
            source: { kind: "estimated", note: "SYNTHETIC TEST FIXTURE — not real data" },
          },
        ],
      }),
    );
    const resolution = resolveRegularSolutionParameters(material, conditions);
    const { parameters } = toRequestParameters(resolution);
    expect(parameters).toEqual({ W: -18000 });
  });

  it("respects requiredKeys, excluding other parameters present in the same set", () => {
    registerParameterSet(qcFixture());
    const resolution = resolveParameterSet({ modelId: QUASI_CHEMICAL_SCC0_MODEL_ID, composition: material.composition, conditions });
    const { parameters } = toRequestParameters(resolution, ["W"]);
    expect(parameters).toEqual({ W: -21500 });
    expect(parameters).not.toHaveProperty("Z");
  });

  it("throws for a NOT_FOUND result rather than returning an empty/fabricated object", () => {
    const resolution = resolveRegularSolutionParameters(material, conditions);
    expect(resolution.status).toBe("NOT_FOUND");
    try {
      toRequestParameters(resolution);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws for an AMBIGUOUS result rather than silently picking a candidate", () => {
    registerParameterSet(regularFixture({ setId: "a" }));
    registerParameterSet(regularFixture({ setId: "b" }));
    const resolution = resolveRegularSolutionParameters(material, conditions);
    expect(resolution.status).toBe("AMBIGUOUS");
    expect(() => toRequestParameters(resolution)).toThrow();
  });

  describe("safety review (Phase 2D): defense-in-depth against invalid upstream data", () => {
    it("refuses to convert a set whose compatibility is requires_explicit_transformation, even if it were (incorrectly) resolved as FOUND", () => {
      const resolution: ParameterResolutionResult = {
        status: "FOUND",
        canonicalSystemId: "Au-Cu",
        message: "hand-built to simulate an upstream data bug",
        parameterSet: {
          setId: "bad-data-blocked",
          modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
          system: "Au-Cu",
          compatibility: "requires_explicit_transformation",
          parameters: [
            {
              key: "W",
              value: -19500,
              unit: "J/mol",
              status: "verified_direct",
              source: { kind: "literature", citation: "SIMULATED INVALID DATA — should never reach a calculation" },
              verification: { method: "direct_read" },
            },
          ],
        },
      };
      expect(() => toRequestParameters(resolution)).toThrow();
    });

    it("refuses to convert a set whose compatibility is not_compatible", () => {
      const resolution: ParameterResolutionResult = {
        status: "FOUND",
        canonicalSystemId: "Au-Cu",
        message: "hand-built to simulate an upstream data bug",
        parameterSet: {
          setId: "bad-data-not-compatible",
          modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
          system: "Au-Cu",
          compatibility: "not_compatible",
          parameters: [
            {
              key: "W",
              value: -1,
              unit: "J/mol",
              status: "verified_direct",
              source: { kind: "literature", citation: "SIMULATED INVALID DATA — should never reach a calculation" },
              verification: { method: "direct_read" },
            },
          ],
        },
      };
      expect(() => toRequestParameters(resolution)).toThrow();
    });

    it("never emits a parameter whose status is unavailable, even if it were (incorrectly) carrying a stray numeric value", () => {
      const resolution: ParameterResolutionResult = {
        status: "FOUND",
        canonicalSystemId: "Au-Cu",
        message: "hand-built to simulate an upstream data bug",
        parameterSet: {
          setId: "bad-data-stray-value",
          modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
          system: "Au-Cu",
          compatibility: "directly_compatible",
          parameters: [
            {
              key: "W",
              // Structurally disallowed by validateParameterValue, but the
              // type system alone doesn't prevent it — this simulates data
              // that skipped validation before registration.
              value: -19500,
              unit: "J/mol",
              status: "unavailable",
              source: { kind: "literature", citation: "SIMULATED INVALID DATA — should never reach a calculation" },
            },
          ],
        },
      };
      const { parameters } = toRequestParameters(resolution);
      expect(parameters).toEqual({});
      expect(parameters).not.toHaveProperty("W");
    });
  });

  describe("end-to-end: resolution -> CalculationRequest -> CalculationPipeline -> CalculationResult.parameterProvenance", () => {
    it("Regular Solution: the resolved W reaches the model and its provenance survives into the result", () => {
      registerParameterSet(regularFixture());
      const resolution = resolveRegularSolutionParameters(material, conditions);
      const { parameters, parameterSources } = toRequestParameters(resolution);

      const result = runCalculation({
        material,
        modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
        conditions,
        parameters,
        parameterSources,
      });

      const expected = computeRegularScc0(0.5, -19500, 1550).scc0;
      expect((result.values.Scc0 as { value: number }).value).toBeCloseTo(expected, 10);
      expect(result.parameterProvenance.W).toEqual(regularFixture().parameters[0]!.source);
      expect(result.parameterProvenance.W?.doi).toBe("10.0000/fixture");
    });

    it("Quasi-Chemical: both resolved Z and W reach the model with provenance intact, equation and golden behavior unaffected", () => {
      registerParameterSet(qcFixture());
      const resolution = resolveQuasiChemicalParameters(material, conditions);
      const { parameters, parameterSources } = toRequestParameters(resolution);

      const result = runCalculation({
        material,
        modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
        conditions,
        parameters,
        parameterSources,
      });

      // Same reference conditions as the golden Au-Cu table — proves this
      // path reproduces the unchanged QC equation exactly.
      expect((result.values.Scc0 as { value: number }).value).toBeCloseTo(0.13104, 5);
      expect(result.parameterProvenance.Z?.kind).toBe("literature");
      expect(result.parameterProvenance.W?.kind).toBe("literature");
    });
  });
});
