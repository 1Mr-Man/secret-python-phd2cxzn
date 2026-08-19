import { beforeEach, describe, expect, it } from "vitest";
import { clearParameterStore, findParameterSet, registerParameterSet, toParameterRecord } from "./parameterStore.js";
import type { ParameterSet } from "./types.js";

/**
 * NOTE: the parameter values below (W=-99999, Z=99) are deliberately
 * nonsensical placeholders, not real Au-Cu data — this test exercises the
 * storage mechanism only. The engine's actual Au-Cu W/Z values remain
 * user-supplied per request (see engine/README.md); nothing is pre-seeded
 * into the real store.
 */
function exampleSet(overrides: Partial<ParameterSet> = {}): ParameterSet {
  return {
    modelId: "test.example-model",
    system: "Xx-Yy",
    parameters: [
      { key: "W", value: -99999, unit: "J/mol", source: { kind: "estimated", note: "test fixture, not real data" } },
      { key: "Z", value: 99, unit: "dimensionless", source: { kind: "estimated", note: "test fixture, not real data" } },
    ],
    ...overrides,
  };
}

describe("parameter store", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("registers and finds a parameter set by (modelId, system)", () => {
    registerParameterSet(exampleSet());
    const found = findParameterSet("test.example-model", "Xx-Yy");
    expect(found).toBeDefined();
    expect(found?.parameters).toHaveLength(2);
  });

  it("returns undefined for an unregistered (modelId, system) pair", () => {
    expect(findParameterSet("does.not.exist", "Aa-Bb")).toBeUndefined();
  });

  it("does not confuse the same system under different models", () => {
    registerParameterSet(exampleSet({ modelId: "test.model-a" }));
    registerParameterSet(exampleSet({ modelId: "test.model-b", parameters: [{ key: "W", value: 1, unit: "J/mol", source: { kind: "estimated" } }] }));

    expect(findParameterSet("test.model-a", "Xx-Yy")?.parameters).toHaveLength(2);
    expect(findParameterSet("test.model-b", "Xx-Yy")?.parameters).toHaveLength(1);
  });

  it("does not confuse the same model under different systems", () => {
    registerParameterSet(exampleSet({ system: "Xx-Yy" }));
    registerParameterSet(exampleSet({ system: "Aa-Bb", parameters: [] }));

    expect(findParameterSet("test.example-model", "Xx-Yy")?.parameters).toHaveLength(2);
    expect(findParameterSet("test.example-model", "Aa-Bb")?.parameters).toHaveLength(0);
  });

  it("toParameterRecord flattens a ParameterSet into a plain Record<string, number>", () => {
    const record = toParameterRecord(exampleSet());
    expect(record).toEqual({ W: -99999, Z: 99 });
  });

  it("clearParameterStore empties the store", () => {
    registerParameterSet(exampleSet());
    clearParameterStore();
    expect(findParameterSet("test.example-model", "Xx-Yy")).toBeUndefined();
  });
});
