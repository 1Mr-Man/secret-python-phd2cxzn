import { beforeEach, describe, expect, it } from "vitest";
import { binaryComposition } from "../../../core/Material.js";
import { Au, Cu } from "../../../data/elements.js";
import { clearParameterStore, registerParameterSet } from "../../../parameters/parameterStore.js";
import type { ParameterSet } from "../../../parameters/types.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "./metadata.js";
import { resolveQuasiChemicalParameters } from "./parameters.js";

const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
const conditions = { temperatureK: 1550 };

/** Synthetic test fixture — NOT real Au-Cu literature data. */
function fixtureSet(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    setId: "fixture-source",
    modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
    system: "Au-Cu",
    compatibility: "directly_compatible",
    parameters: [
      {
        key: "Z",
        value: 10,
        unit: "dimensionless",
        status: "verified_direct",
        source: { kind: "literature", citation: "synthetic test fixture, not a real publication" },
        verification: { method: "direct_read" },
      },
      {
        key: "W",
        value: -20000,
        unit: "J/mol",
        status: "verified_direct",
        source: { kind: "literature", citation: "synthetic test fixture, not a real publication" },
        verification: { method: "direct_read" },
      },
    ],
    ...overrides,
  };
}

describe("resolveQuasiChemicalParameters", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("NOT_FOUND for the real Au-Cu system against today's actual (empty) parameter store — no Z or W is fabricated", () => {
    const result = resolveQuasiChemicalParameters(material, conditions);
    expect(result.status).toBe("NOT_FOUND");
    expect(result.parameterSet).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/"key":"[ZW]"/);
  });

  it("registers and resolves a fixture set, carrying both Z and W with full provenance", () => {
    registerParameterSet(fixtureSet());
    const result = resolveQuasiChemicalParameters(material, conditions);
    expect(result.status).toBe("FOUND");
    const z = result.parameterSet?.parameters.find((p) => p.key === "Z");
    const w = result.parameterSet?.parameters.find((p) => p.key === "W");
    expect(z?.value).toBe(10);
    expect(w?.value).toBe(-20000);
    expect(z?.source.kind).toBe("literature");
  });

  it("resolves identically whether Au or Cu is listed first", () => {
    registerParameterSet(fixtureSet());
    const reversed = { composition: binaryComposition(Cu, 0.5, Au, 0.5) };
    expect(resolveQuasiChemicalParameters(material, conditions).status).toBe("FOUND");
    expect(resolveQuasiChemicalParameters(reversed, conditions).status).toBe("FOUND");
  });

  it("requires BOTH Z and W — NOT_FOUND if only one is usable", () => {
    registerParameterSet(
      fixtureSet({
        parameters: [
          {
            key: "Z",
            value: 10,
            unit: "dimensionless",
            status: "verified_direct",
            source: { kind: "literature", citation: "x" },
            verification: { method: "direct_read" },
          },
          { key: "W", unit: "J/mol", status: "unavailable", source: { kind: "estimated" } },
        ],
      }),
    );
    const result = resolveQuasiChemicalParameters(material, conditions);
    expect(result.status).toBe("NOT_FOUND");
  });

  it("AMBIGUOUS when two competing fixture sources both apply", () => {
    registerParameterSet(fixtureSet({ setId: "source-a" }));
    registerParameterSet(fixtureSet({ setId: "source-b" }));
    const result = resolveQuasiChemicalParameters(material, conditions);
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.candidates).toHaveLength(2);
  });

  it("preferredSetId resolves what would otherwise be AMBIGUOUS", () => {
    registerParameterSet(fixtureSet({ setId: "source-a" }));
    registerParameterSet(fixtureSet({ setId: "source-b" }));
    const result = resolveQuasiChemicalParameters(material, conditions, { preferredSetId: "source-b" });
    expect(result.status).toBe("FOUND");
    expect(result.parameterSet?.setId).toBe("source-b");
  });

  it("does not resolve a set registered for a different system", () => {
    registerParameterSet(fixtureSet({ system: "Fe-Ni" }));
    expect(resolveQuasiChemicalParameters(material, conditions).status).toBe("NOT_FOUND");
  });

  it("does not resolve a set registered under a different model id (e.g. Regular Solution) for the same system", () => {
    registerParameterSet(fixtureSet({ modelId: "thermodynamics.regular-solution.scc0" }));
    expect(resolveQuasiChemicalParameters(material, conditions).status).toBe("NOT_FOUND");
  });
});
