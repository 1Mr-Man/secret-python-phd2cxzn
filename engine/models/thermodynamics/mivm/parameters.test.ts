import { beforeEach, describe, expect, it } from "vitest";
import { binaryComposition } from "../../../core/Material.js";
import { Au, Cu } from "../../../data/elements.js";
import { clearParameterStore, registerParameterSet } from "../../../parameters/parameterStore.js";
import type { ParameterSet } from "../../../parameters/types.js";
import { MIVM_BINARY_MODEL_ID } from "./metadata.js";
import { resolveMivmParameters } from "./parameters.js";

const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
const conditions = { temperatureK: 1400 };

/** SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA. */
function fixtureSet(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    setId: "fixture-mivm-source",
    modelId: MIVM_BINARY_MODEL_ID,
    system: "Au-Cu",
    compatibility: "directly_compatible",
    parameters: [
      { key: "B_ij", value: 1.6, unit: "dimensionless", status: "verified_direct", source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA" }, verification: { method: "direct_read" } },
      { key: "B_ji", value: 0.62, unit: "dimensionless", status: "verified_direct", source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA" }, verification: { method: "direct_read" } },
      { key: "Z_i", value: 10, unit: "dimensionless", status: "verified_direct", source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA" }, verification: { method: "direct_read" } },
      { key: "Z_j", value: 9, unit: "dimensionless", status: "verified_direct", source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA" }, verification: { method: "direct_read" } },
      { key: "V_mi", value: 1.02e-5, unit: "m3/mol", status: "verified_direct", source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA" }, verification: { method: "direct_read" } },
      { key: "V_mj", value: 0.85e-5, unit: "m3/mol", status: "verified_direct", source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE — NOT REAL LITERATURE DATA" }, verification: { method: "direct_read" } },
    ],
    ...overrides,
  };
}

describe("resolveMivmParameters", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("NOT_FOUND for the real Au-Cu system against today's actual (empty) parameter store — no MIVM parameter is fabricated", () => {
    const result = resolveMivmParameters(material, conditions);
    expect(result.status).toBe("NOT_FOUND");
    expect(result.parameterSet).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/"key":"(B_ij|B_ji|Z_i|Z_j|V_mi|V_mj)"/);
  });

  it("registers and resolves a fixture set, carrying all six parameters with full provenance", () => {
    registerParameterSet(fixtureSet());
    const result = resolveMivmParameters(material, conditions);
    expect(result.status).toBe("FOUND");
    const keys = result.parameterSet?.parameters.map((p) => p.key).sort();
    expect(keys).toEqual(["B_ij", "B_ji", "V_mi", "V_mj", "Z_i", "Z_j"]);
  });

  it("resolves identically whether Au or Cu is listed first", () => {
    registerParameterSet(fixtureSet());
    const reversed = { composition: binaryComposition(Cu, 0.5, Au, 0.5) };
    expect(resolveMivmParameters(material, conditions).status).toBe("FOUND");
    expect(resolveMivmParameters(reversed, conditions).status).toBe("FOUND");
  });

  it("requires ALL SIX parameters — NOT_FOUND if even one is unavailable", () => {
    registerParameterSet(
      fixtureSet({
        parameters: [
          ...fixtureSet().parameters.slice(0, 5),
          { key: "V_mj", unit: "m3/mol", status: "unavailable", source: { kind: "estimated" } },
        ],
      }),
    );
    const result = resolveMivmParameters(material, conditions);
    expect(result.status).toBe("NOT_FOUND");
  });

  it("AMBIGUOUS when two competing fixture sources both apply", () => {
    registerParameterSet(fixtureSet({ setId: "source-a" }));
    registerParameterSet(fixtureSet({ setId: "source-b" }));
    const result = resolveMivmParameters(material, conditions);
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.candidates).toHaveLength(2);
  });

  it("preferredSetId resolves what would otherwise be AMBIGUOUS", () => {
    registerParameterSet(fixtureSet({ setId: "source-a" }));
    registerParameterSet(fixtureSet({ setId: "source-b" }));
    const result = resolveMivmParameters(material, conditions, { preferredSetId: "source-b" });
    expect(result.status).toBe("FOUND");
    expect(result.parameterSet?.setId).toBe("source-b");
  });

  it("does not resolve a set registered for a different system", () => {
    registerParameterSet(fixtureSet({ system: "Fe-Ni" }));
    expect(resolveMivmParameters(material, conditions).status).toBe("NOT_FOUND");
  });

  it("does not resolve a set registered under a different model id (e.g. Quasi-Chemical) for the same system", () => {
    registerParameterSet(fixtureSet({ modelId: "thermodynamics.quasi-chemical.scc0" }));
    expect(resolveMivmParameters(material, conditions).status).toBe("NOT_FOUND");
  });
});
