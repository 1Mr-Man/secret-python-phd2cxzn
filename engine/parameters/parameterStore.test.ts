import { beforeEach, describe, expect, it } from "vitest";
import {
  clearParameterStore,
  findAllParameterSets,
  findParameterSet,
  registerParameterSet,
  toParameterRecord,
} from "./parameterStore.js";
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
    setId: "test-set-1",
    modelId: "test.example-model",
    system: "Xx-Yy",
    parameters: [
      {
        key: "W",
        value: -99999,
        unit: "J/mol",
        status: "provisional",
        source: { kind: "estimated", note: "test fixture, not real data" },
      },
      {
        key: "Z",
        value: 99,
        unit: "dimensionless",
        status: "provisional",
        source: { kind: "estimated", note: "test fixture, not real data" },
      },
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
    registerParameterSet(
      exampleSet({
        modelId: "test.model-b",
        parameters: [{ key: "W", value: 1, unit: "J/mol", status: "provisional", source: { kind: "estimated" } }],
      }),
    );

    expect(findParameterSet("test.model-a", "Xx-Yy")?.parameters).toHaveLength(2);
    expect(findParameterSet("test.model-b", "Xx-Yy")?.parameters).toHaveLength(1);
  });

  it("does not confuse the same model under different systems", () => {
    registerParameterSet(exampleSet({ system: "Xx-Yy" }));
    registerParameterSet(exampleSet({ system: "Aa-Bb", setId: "test-set-2", parameters: [] }));

    expect(findParameterSet("test.example-model", "Xx-Yy")?.parameters).toHaveLength(2);
    expect(findParameterSet("test.example-model", "Aa-Bb")?.parameters).toHaveLength(0);
  });

  it("toParameterRecord flattens a ParameterSet into a plain Record<string, number>", () => {
    const record = toParameterRecord(exampleSet());
    expect(record).toEqual({ W: -99999, Z: 99 });
  });

  it("toParameterRecord skips parameters with no value (status unavailable) rather than inventing a number", () => {
    const record = toParameterRecord(
      exampleSet({
        parameters: [
          { key: "W", unit: "J/mol", status: "unavailable", source: { kind: "estimated" } },
          { key: "Z", value: 42, unit: "dimensionless", status: "provisional", source: { kind: "estimated" } },
        ],
      }),
    );
    expect(record).toEqual({ Z: 42 });
    expect(record).not.toHaveProperty("W");
  });

  it("clearParameterStore empties the store", () => {
    registerParameterSet(exampleSet());
    clearParameterStore();
    expect(findParameterSet("test.example-model", "Xx-Yy")).toBeUndefined();
  });

  describe("multiple parameter sets for the same (model, system)", () => {
    it("findAllParameterSets returns every registered set, in registration order", () => {
      registerParameterSet(exampleSet({ setId: "source-a" }));
      registerParameterSet(exampleSet({ setId: "source-b", parameters: [] }));

      const all = findAllParameterSets("test.example-model", "Xx-Yy");
      expect(all.map((set) => set.setId)).toEqual(["source-a", "source-b"]);
    });

    it("findParameterSet (legacy, single-result) returns the first registered set", () => {
      registerParameterSet(exampleSet({ setId: "source-a" }));
      registerParameterSet(exampleSet({ setId: "source-b", parameters: [] }));

      expect(findParameterSet("test.example-model", "Xx-Yy")?.setId).toBe("source-a");
    });

    it("findAllParameterSets returns an empty array, not undefined, for an unregistered pair", () => {
      expect(findAllParameterSets("does.not.exist", "Aa-Bb")).toEqual([]);
    });

    it("rejects registering two sets with the same setId under the same (model, system)", () => {
      registerParameterSet(exampleSet({ setId: "dup" }));
      expect(() => registerParameterSet(exampleSet({ setId: "dup" }))).toThrow();
    });

    it("allows the same setId to be reused across different (model, system) keys", () => {
      registerParameterSet(exampleSet({ setId: "dup", system: "Xx-Yy" }));
      expect(() => registerParameterSet(exampleSet({ setId: "dup", system: "Aa-Bb" }))).not.toThrow();
    });
  });

  describe("registration-time validation (Phase 2D.1)", () => {
    it("rejects a set containing an 'unavailable' parameter that carries a numeric value", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            parameters: [
              { key: "W", value: -1, unit: "J/mol", status: "unavailable", source: { kind: "estimated" } },
            ],
          }),
        ),
      ).toThrow(/unavailable/);
    });

    it("rejects a 'verified_direct' parameter with no verification record", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            parameters: [
              {
                key: "W",
                value: -1,
                unit: "J/mol",
                status: "verified_direct",
                source: { kind: "literature", citation: "x" },
              },
            ],
          }),
        ),
      ).toThrow(/verification/);
    });

    it("rejects a 'verified_derived' parameter with no derivation record", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            parameters: [
              {
                key: "W",
                value: -1,
                unit: "J/mol",
                status: "verified_derived",
                source: { kind: "literature", citation: "x" },
                verification: { method: "derived" },
              },
            ],
          }),
        ),
      ).toThrow(/derivation/);
    });

    it("rejects a set whose compatibility is 'requires_explicit_transformation' but which contains a usable (non-unavailable) parameter", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            compatibility: "requires_explicit_transformation",
            parameters: [
              {
                key: "W",
                value: -1,
                unit: "J/mol",
                status: "verified_direct",
                source: { kind: "literature", citation: "x" },
                verification: { method: "direct_read" },
              },
            ],
          }),
        ),
      ).toThrow(/transformation/);
    });

    it("rejects a set whose compatibility is 'not_compatible' but which contains a usable parameter", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            compatibility: "not_compatible",
            parameters: [
              { key: "W", value: -1, unit: "J/mol", status: "provisional", source: { kind: "estimated" } },
            ],
          }),
        ),
      ).toThrow();
    });

    it("rejects a literature-sourced parameter with no citation", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            parameters: [
              { key: "W", value: -1, unit: "J/mol", status: "provisional", source: { kind: "literature" } },
            ],
          }),
        ),
      ).toThrow(/citation/);
    });

    it("rejects a parameter-level compatibility override that is less restrictive than the set's authoritative compatibility", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            compatibility: "not_compatible",
            parameters: [
              { key: "W", unit: "J/mol", status: "unavailable", source: { kind: "estimated" }, compatibility: "directly_compatible" },
            ],
          }),
        ),
      ).toThrow();
    });

    it("does not partially register a set that fails validation — a rejected set is entirely absent from the store", () => {
      expect(() =>
        registerParameterSet(
          exampleSet({
            setId: "should-never-appear",
            parameters: [
              { key: "W", value: -1, unit: "J/mol", status: "unavailable", source: { kind: "estimated" } },
            ],
          }),
        ),
      ).toThrow();
      expect(findAllParameterSets("test.example-model", "Xx-Yy")).toEqual([]);
    });

    it("still accepts well-formed data (provisional, unavailable, and fully-verified) exactly as before", () => {
      expect(() => registerParameterSet(exampleSet())).not.toThrow();
      expect(
        () =>
          registerParameterSet(
            exampleSet({
              setId: "verified-example",
              parameters: [
                {
                  key: "W",
                  value: -1,
                  unit: "J/mol",
                  status: "verified_direct",
                  source: { kind: "literature", citation: "x" },
                  verification: { method: "direct_read" },
                },
              ],
            }),
          ),
      ).not.toThrow();
    });
  });

  describe("canonical system identity at the store layer", () => {
    it("registering under one component order is found under the reversed order", () => {
      registerParameterSet(exampleSet({ system: "Yy-Xx" }));
      expect(findParameterSet("test.example-model", "Xx-Yy")).toBeDefined();
      expect(findParameterSet("test.example-model", "Yy-Xx")).toBeDefined();
    });

    it("preserves the registrant's original system label on the stored set, even though the lookup key is canonicalized", () => {
      registerParameterSet(exampleSet({ system: "Yy-Xx" }));
      expect(findParameterSet("test.example-model", "Xx-Yy")?.system).toBe("Yy-Xx");
    });
  });
});
