import { beforeEach, describe, expect, it } from "vitest";
import { binaryComposition } from "../../../core/Material.js";
import { Au, Cu } from "../../../data/elements.js";
import { clearParameterStore, registerParameterSet } from "../../../parameters/parameterStore.js";
import type { ParameterSet } from "../../../parameters/types.js";
import { REGULAR_SOLUTION_SCC0_MODEL_ID } from "./metadata.js";
import { resolveRegularSolutionParameters } from "./parameters.js";

const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
const conditions = { temperatureK: 1550 };

/** Synthetic test fixture — NOT real Au-Cu literature data. See parameterStore.test.ts's note. */
function fixtureWSet(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    setId: "fixture-source",
    modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
    system: "Au-Cu",
    parameters: [
      {
        key: "W",
        value: -20000,
        unit: "J/mol",
        status: "verified_direct",
        source: { kind: "literature", citation: "synthetic test fixture, not a real publication" },
      },
    ],
    ...overrides,
  };
}

describe("resolveRegularSolutionParameters", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("NOT_FOUND for the real Au-Cu system against today's actual (empty) parameter store — no W is fabricated", () => {
    // No registerParameterSet call: this is the real, unmodified production state.
    const result = resolveRegularSolutionParameters(material, conditions);
    expect(result.status).toBe("NOT_FOUND");
    expect(result.parameterSet).toBeUndefined();
    // Nowhere in the result is there a numeric W value to accidentally use.
    expect(JSON.stringify(result)).not.toMatch(/"key":"W"/);
  });

  it("FOUND once a verified fixture set is registered, carrying full provenance", () => {
    registerParameterSet(fixtureWSet());
    const result = resolveRegularSolutionParameters(material, conditions);
    expect(result.status).toBe("FOUND");
    const w = result.parameterSet?.parameters.find((p) => p.key === "W");
    expect(w?.value).toBe(-20000);
    expect(w?.source.kind).toBe("literature");
    expect(w?.status).toBe("verified_direct");
  });

  it("resolves the same fixture regardless of whether the material lists Au or Cu first", () => {
    registerParameterSet(fixtureWSet());
    const reversed = { composition: binaryComposition(Cu, 0.5, Au, 0.5) };
    expect(resolveRegularSolutionParameters(material, conditions).status).toBe("FOUND");
    expect(resolveRegularSolutionParameters(reversed, conditions).status).toBe("FOUND");
  });

  it("OUT_OF_RANGE when the fixture's temperature range excludes the requested temperature", () => {
    registerParameterSet(fixtureWSet({ validTemperatureRangeK: [200, 400] }));
    const result = resolveRegularSolutionParameters(material, conditions); // 1550K
    expect(result.status).toBe("OUT_OF_RANGE");
  });

  it("AMBIGUOUS when two competing fixture sources both apply — never silently averaged or first-picked", () => {
    registerParameterSet(fixtureWSet({ setId: "source-a" }));
    registerParameterSet(
      fixtureWSet({
        setId: "source-b",
        parameters: [{ key: "W", value: -18000, unit: "J/mol", status: "verified_direct", source: { kind: "literature" } }],
      }),
    );
    const result = resolveRegularSolutionParameters(material, conditions);
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.candidates).toHaveLength(2);
  });

  it("does not resolve a set registered for a different system (e.g. Fe-Ni) when asked about Au-Cu", () => {
    registerParameterSet(fixtureWSet({ system: "Fe-Ni" }));
    const result = resolveRegularSolutionParameters(material, conditions);
    expect(result.status).toBe("NOT_FOUND");
  });

  it("does not resolve a set registered under a different model id (e.g. Quasi-Chemical) for the same system", () => {
    registerParameterSet(fixtureWSet({ modelId: "thermodynamics.quasi-chemical.scc0" }));
    const result = resolveRegularSolutionParameters(material, conditions);
    expect(result.status).toBe("NOT_FOUND");
  });
});
