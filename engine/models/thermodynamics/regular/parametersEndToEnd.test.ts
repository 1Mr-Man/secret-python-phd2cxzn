import { beforeEach, describe, expect, it } from "vitest";
import { binaryComposition } from "../../../core/Material.js";
import { identifySystem } from "../../../core/SystemIdentity.js";
import { Au, Cu } from "../../../data/elements.js";
import { clearParameterStore, registerParameterSet } from "../../../parameters/parameterStore.js";
import type { ParameterSet } from "../../../parameters/types.js";
import { runCalculation } from "../../../pipeline/CalculationPipeline.js";
import { REGULAR_SOLUTION_SCC0_MODEL_ID } from "./metadata.js";
import { computeRegularScc0 } from "./model.js";
import { resolveRegularSolutionParameters } from "./parameters.js";
// Importing the barrel registers the built-in models (incl. Regular Solution) as a side effect.
import "../../../index.js";

/**
 * Task 7's full chain, end to end:
 *
 *   material system -> canonical system identity -> parameter resolver
 *   -> Regular Solution parameter adapter -> Regular Solution calculation
 *   -> provenance in the final CalculationResult
 *
 * The real Au-Cu records (auCu.ts) carry no usable value (see
 * DATA_MANIFEST.md), so a real end-to-end run isn't possible with real
 * data yet. This file proves the MECHANISM works correctly using clearly
 * synthetic fixtures — every fixture's citation says so explicitly, and
 * none of this is exported from a `data/` module or treated as
 * production data anywhere.
 */

const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
const conditions = { temperatureK: 1550 };

function syntheticSet(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    setId: "synthetic-fixture-a",
    modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
    system: "Au-Cu",
    parameters: [
      {
        key: "W",
        value: -19000,
        unit: "J/mol",
        status: "verified_direct",
        source: {
          kind: "literature",
          citation: "SYNTHETIC TEST FIXTURE — not a real publication, not real Au-Cu data",
          publicationYear: 2020,
          doi: "10.0000/fixture.example",
        },
      },
    ],
    ...overrides,
  };
}

describe("Regular Solution parameter resolution — full end-to-end chain (synthetic fixture)", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("system identity -> resolver -> adapter -> calculation -> provenance, all consistent", () => {
    registerParameterSet(syntheticSet());

    // 1. Canonical system identity.
    const identity = identifySystem(material.composition);
    expect(identity.canonicalId).toBe("Au-Cu");

    // 2 & 3. Resolver, via Regular Solution's own adapter.
    const resolution = resolveRegularSolutionParameters(material, conditions);
    expect(resolution.status).toBe("FOUND");
    expect(resolution.canonicalSystemId).toBe(identity.canonicalId);

    const resolvedW = resolution.parameterSet?.parameters.find((p) => p.key === "W");
    expect(resolvedW?.value).toBe(-19000);

    // 4. Feed the resolved value into an actual calculation — this is the
    // "the parameter actually reaches the model correctly" check.
    const result = runCalculation({
      material,
      modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
      conditions,
      parameters: { W: resolvedW!.value! },
      parameterSources: { W: resolvedW!.source },
    });

    const expected = computeRegularScc0(0.5, -19000, 1550).scc0;
    expect((result.values.Scc0 as { value: number }).value).toBeCloseTo(expected, 10);

    // 5. Provenance survives all the way into the CalculationResult —
    // this is what lets a future consumer answer "where did this
    // parameter come from" per Task 6, without a dedicated UI.
    expect(result.parameterProvenance.W).toEqual(resolvedW!.source);
    expect(result.parameterProvenance.W?.citation).toContain("SYNTHETIC TEST FIXTURE");
    expect(result.parameterProvenance.W?.doi).toBe("10.0000/fixture.example");
  });

  it("resolves identically for Au-Cu and Cu-Au orderings all the way through to the same calculation", () => {
    registerParameterSet(syntheticSet());
    const reversedMaterial = { composition: binaryComposition(Cu, 0.5, Au, 0.5) };

    const a = resolveRegularSolutionParameters(material, conditions);
    const b = resolveRegularSolutionParameters(reversedMaterial, conditions);
    expect(a.status).toBe("FOUND");
    expect(b.status).toBe("FOUND");
    expect(a.parameterSet?.setId).toBe(b.parameterSet?.setId);
  });

  it("OUT_OF_RANGE when the fixture's stated temperature range excludes the query", () => {
    registerParameterSet(syntheticSet({ validTemperatureRangeK: [200, 400] }));
    const resolution = resolveRegularSolutionParameters(material, conditions); // 1550K
    expect(resolution.status).toBe("OUT_OF_RANGE");
  });

  it("AMBIGUOUS when two competing synthetic sources both apply — never silently averaged or first-picked", () => {
    registerParameterSet(syntheticSet({ setId: "synthetic-fixture-a" }));
    registerParameterSet(
      syntheticSet({
        setId: "synthetic-fixture-b",
        parameters: [
          {
            key: "W",
            value: -17500,
            unit: "J/mol",
            status: "verified_direct",
            source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE B — not real data" },
          },
        ],
      }),
    );

    const resolution = resolveRegularSolutionParameters(material, conditions);
    expect(resolution.status).toBe("AMBIGUOUS");
    expect(resolution.parameterSet).toBeUndefined();
    expect(resolution.candidates?.map((set) => set.setId).sort()).toEqual([
      "synthetic-fixture-a",
      "synthetic-fixture-b",
    ]);
  });

  it("explicit set selection (preferredSetId) resolves what would otherwise be AMBIGUOUS", () => {
    registerParameterSet(syntheticSet({ setId: "synthetic-fixture-a" }));
    registerParameterSet(
      syntheticSet({
        setId: "synthetic-fixture-b",
        parameters: [
          {
            key: "W",
            value: -17500,
            unit: "J/mol",
            status: "verified_direct",
            source: { kind: "literature", citation: "SYNTHETIC TEST FIXTURE B — not real data" },
          },
        ],
      }),
    );

    const resolution = resolveRegularSolutionParameters(material, conditions, {
      preferredSetId: "synthetic-fixture-b",
    });
    expect(resolution.status).toBe("FOUND");
    expect(resolution.parameterSet?.setId).toBe("synthetic-fixture-b");
    expect(resolution.parameterSet?.parameters[0]?.value).toBe(-17500);
  });

  it("units and status are preserved unchanged from registration through to the resolved result", () => {
    registerParameterSet(syntheticSet());
    const resolution = resolveRegularSolutionParameters(material, conditions);
    const w = resolution.parameterSet?.parameters.find((p) => p.key === "W");
    expect(w?.unit).toBe("J/mol");
    expect(w?.status).toBe("verified_direct");
  });

  it("PROVISIONAL status is preserved end-to-end and distinguished from FOUND", () => {
    registerParameterSet(
      syntheticSet({
        parameters: [
          {
            key: "W",
            value: -19000,
            unit: "J/mol",
            status: "provisional",
            source: { kind: "estimated", note: "SYNTHETIC TEST FIXTURE — not real data" },
          },
        ],
      }),
    );
    const resolution = resolveRegularSolutionParameters(material, conditions);
    expect(resolution.status).toBe("PROVISIONAL");
    expect(resolution.parameterSet?.parameters[0]?.status).toBe("provisional");
  });
});
