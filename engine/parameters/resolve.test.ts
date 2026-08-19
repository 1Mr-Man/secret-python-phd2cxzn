import { beforeEach, describe, expect, it } from "vitest";
import { binaryComposition } from "../core/Material.js";
import { Au, Cu } from "../data/elements.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../models/thermodynamics/quasi-chemical/index.js";
import { clearParameterStore, registerParameterSet } from "./parameterStore.js";
import { resolveParameterSet } from "./resolve.js";
import type { ParameterSet } from "./types.js";

/**
 * All values below (W=-12345, etc.) are deliberately synthetic test
 * fixtures, not real materials data — see parameterStore.test.ts's note.
 * These tests exercise the resolution mechanism only.
 */
const MODEL_ID = "test.resolver-model";
const auCu = binaryComposition(Au, 0.5, Cu, 0.5);
const cuAu = binaryComposition(Cu, 0.5, Au, 0.5);

function makeSet(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    setId: "fixture-1",
    modelId: MODEL_ID,
    system: "Au-Cu",
    parameters: [
      {
        key: "W",
        value: -12345,
        unit: "J/mol",
        status: "verified_direct",
        source: { kind: "literature", citation: "test fixture" },
        verification: { method: "direct_read" },
      },
    ],
    ...overrides,
  };
}

describe("resolveParameterSet", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("NOT_FOUND when nothing is registered for this (model, system)", () => {
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu });
    expect(result.status).toBe("NOT_FOUND");
    expect(result.parameterSet).toBeUndefined();
    expect(result.canonicalSystemId).toBe("Au-Cu");
  });

  it("FOUND when exactly one verified, in-range set applies", () => {
    registerParameterSet(makeSet());
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu });
    expect(result.status).toBe("FOUND");
    expect(result.parameterSet?.setId).toBe("fixture-1");
    expect(result.parameterSet?.parameters.find((p) => p.key === "W")?.value).toBe(-12345);
  });

  it("resolves the same result whether the composition lists Au or Cu first (reversed pair identity)", () => {
    registerParameterSet(makeSet());
    const viaAuCu = resolveParameterSet({ modelId: MODEL_ID, composition: auCu });
    const viaCuAu = resolveParameterSet({ modelId: MODEL_ID, composition: cuAu });
    expect(viaAuCu.status).toBe("FOUND");
    expect(viaCuAu.status).toBe("FOUND");
    expect(viaAuCu.parameterSet?.setId).toBe(viaCuAu.parameterSet?.setId);
  });

  it("PROVISIONAL when the single applicable set has a non-verified value", () => {
    registerParameterSet(
      makeSet({
        parameters: [
          { key: "W", value: -1, unit: "J/mol", status: "provisional", source: { kind: "estimated" } },
        ],
      }),
    );
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu });
    expect(result.status).toBe("PROVISIONAL");
    expect(result.parameterSet).toBeDefined();
  });

  it("NOT_FOUND (not a fabricated value) when the only registered set has status unavailable", () => {
    registerParameterSet(
      makeSet({
        parameters: [{ key: "W", unit: "J/mol", status: "unavailable", source: { kind: "estimated" } }],
      }),
    );
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu });
    expect(result.status).toBe("NOT_FOUND");
    expect(result.parameterSet).toBeUndefined();
  });

  it("OUT_OF_RANGE when the registered set's temperature range doesn't cover the query", () => {
    registerParameterSet(makeSet({ validTemperatureRangeK: [1200, 1400] }));
    const result = resolveParameterSet({
      modelId: MODEL_ID,
      composition: auCu,
      conditions: { temperatureK: 1550 },
    });
    expect(result.status).toBe("OUT_OF_RANGE");
    expect(result.outOfRangeSets).toHaveLength(1);
  });

  it("OUT_OF_RANGE when the registered set's composition range doesn't cover the query", () => {
    registerParameterSet(makeSet({ validCompositionRangeMoleFraction: [0.0, 0.2] }));
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu }); // x=0.5
    expect(result.status).toBe("OUT_OF_RANGE");
  });

  it("FOUND when the query temperature/composition falls within the registered set's stated ranges", () => {
    registerParameterSet(
      makeSet({ validTemperatureRangeK: [1200, 1800], validCompositionRangeMoleFraction: [0.1, 0.9] }),
    );
    const result = resolveParameterSet({
      modelId: MODEL_ID,
      composition: auCu,
      conditions: { temperatureK: 1550 },
    });
    expect(result.status).toBe("FOUND");
  });

  it("AMBIGUOUS when two competing sets both apply, and does not silently pick either", () => {
    registerParameterSet(makeSet({ setId: "source-a" }));
    registerParameterSet(
      makeSet({
        setId: "source-b",
        parameters: [
          {
            key: "W",
            value: -999,
            unit: "J/mol",
            status: "verified_direct",
            source: { kind: "literature", citation: "test fixture" },
            verification: { method: "direct_read" },
          },
        ],
      }),
    );

    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu });
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.parameterSet).toBeUndefined();
    expect(result.candidates?.map((set) => set.setId).sort()).toEqual(["source-a", "source-b"]);
  });

  it("requiredKeys narrows resolution to a specific parameter (e.g. only W matters, other keys' availability is irrelevant)", () => {
    registerParameterSet(
      makeSet({
        parameters: [
          {
            key: "W",
            value: -1,
            unit: "J/mol",
            status: "verified_direct",
            source: { kind: "literature", citation: "test fixture" },
            verification: { method: "direct_read" },
          },
          { key: "Z", unit: "dimensionless", status: "unavailable", source: { kind: "estimated" } },
        ],
      }),
    );
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu, requiredKeys: ["W"] });
    expect(result.status).toBe("FOUND");
  });

  it("requiredKeys causes NOT_FOUND when the specifically-requested key is unavailable, even if other keys exist", () => {
    registerParameterSet(
      makeSet({
        parameters: [
          { key: "W", unit: "J/mol", status: "unavailable", source: { kind: "estimated" } },
          {
            key: "Z",
            value: 10,
            unit: "dimensionless",
            status: "verified_direct",
            source: { kind: "literature", citation: "test fixture" },
            verification: { method: "direct_read" },
          },
        ],
      }),
    );
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: auCu, requiredKeys: ["W"] });
    expect(result.status).toBe("NOT_FOUND");
  });
});

describe("resolveParameterSet — scientific safety (cannot cross-contaminate model or system)", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("a set registered for one model is never returned when resolving a different model, even for the same system", () => {
    registerParameterSet(makeSet({ modelId: "test.model-a" }));
    const result = resolveParameterSet({ modelId: "test.model-b", composition: auCu });
    expect(result.status).toBe("NOT_FOUND");
  });

  it("a set registered for one system is never returned when resolving a different system, even for the same model", () => {
    const Ag = { symbol: "Ag", name: "Silver", atomicNumber: 47 };
    registerParameterSet(makeSet({ system: "Au-Cu" }));
    const result = resolveParameterSet({ modelId: MODEL_ID, composition: binaryComposition(Au, 0.5, Ag, 0.5) });
    expect(result.status).toBe("NOT_FOUND");
  });

  it("works identically for a real registered model id (Quasi-Chemical), proving genericity beyond the test fixture model", () => {
    registerParameterSet(
      makeSet({
        modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
        parameters: [
          {
            key: "Z",
            value: 10,
            unit: "dimensionless",
            status: "verified_direct",
            source: { kind: "literature", citation: "test fixture" },
            verification: { method: "direct_read" },
          },
        ],
      }),
    );
    const result = resolveParameterSet({ modelId: QUASI_CHEMICAL_SCC0_MODEL_ID, composition: auCu });
    expect(result.status).toBe("FOUND");
    expect(result.parameterSet?.parameters[0]?.key).toBe("Z");
  });

  it("resolving the REAL Au-Cu system against the REAL Quasi-Chemical model id with an empty (production) store is NOT_FOUND — no value is ever fabricated", () => {
    // Deliberately no registerParameterSet call: this is today's actual, unmodified production state.
    const result = resolveParameterSet({ modelId: QUASI_CHEMICAL_SCC0_MODEL_ID, composition: auCu });
    expect(result.status).toBe("NOT_FOUND");
    expect(result.parameterSet).toBeUndefined();
    expect(result.candidates).toBeUndefined();
  });
});
