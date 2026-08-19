import { describe, expect, it } from "vitest";
import type { ParameterSet, ParameterValue } from "./types.js";
import { validateParameterSet, validateParameterValue } from "./validateParameterRecord.js";

function baseValue(overrides: Partial<ParameterValue> = {}): ParameterValue {
  return {
    key: "W",
    unit: "J/mol",
    status: "unavailable",
    source: { kind: "estimated" },
    ...overrides,
  };
}

describe("validateParameterValue — status: unavailable", () => {
  it("accepts a well-formed unavailable record", () => {
    expect(validateParameterValue(baseValue()).valid).toBe(true);
  });

  it("rejects an unavailable record carrying a value (Rule 1)", () => {
    const result = validateParameterValue(baseValue({ value: 123 }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.endsWith(".value"))).toBe(true);
  });

  it("rejects an unavailable record carrying a derivation (Rule 2)", () => {
    const result = validateParameterValue(
      baseValue({ derivation: { transformationEquation: "x", assumptions: ["a"], sourceValues: { L0: 1 } } }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.endsWith(".derivation"))).toBe(true);
  });

  it("rejects an unavailable record carrying uncertainty", () => {
    const result = validateParameterValue(baseValue({ uncertainty: { description: "unknown" } }));
    expect(result.valid).toBe(false);
  });
});

describe("validateParameterValue — status: verified_direct", () => {
  function verifiedDirect(overrides: Partial<ParameterValue> = {}): ParameterValue {
    return baseValue({
      status: "verified_direct",
      value: -21500,
      source: { kind: "literature", citation: "Some Paper (2000)" },
      verification: { method: "direct_read", location: { type: "table", identifier: "3", page: 112 } },
      ...overrides,
    });
  }

  it("accepts a well-formed verified_direct record (Rule 3)", () => {
    expect(validateParameterValue(verifiedDirect()).valid).toBe(true);
  });

  it("rejects verified_direct with no value", () => {
    expect(validateParameterValue(verifiedDirect({ value: undefined })).valid).toBe(false);
  });

  it("rejects verified_direct with no verification record", () => {
    const result = validateParameterValue(verifiedDirect({ verification: undefined }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.endsWith(".verification"))).toBe(true);
  });

  it('rejects verified_direct whose verification.method is "derived"', () => {
    expect(validateParameterValue(verifiedDirect({ verification: { method: "derived" } })).valid).toBe(false);
  });

  it("accepts verified_direct with verification.method cross_checked", () => {
    expect(validateParameterValue(verifiedDirect({ verification: { method: "cross_checked" } })).valid).toBe(true);
  });

  it("rejects verified_direct carrying a derivation record (should be verified_derived instead)", () => {
    const result = validateParameterValue(
      verifiedDirect({ derivation: { transformationEquation: "x", assumptions: ["a"], sourceValues: { L0: 1 } } }),
    );
    expect(result.valid).toBe(false);
  });
});

describe("validateParameterValue — status: verified_derived", () => {
  function verifiedDerived(overrides: Partial<ParameterValue> = {}): ParameterValue {
    return baseValue({
      status: "verified_derived",
      value: -12345,
      source: { kind: "literature", citation: "Some Assessment (1998)" },
      derivation: {
        transformationEquation: "W = L0 (Redlich-Kister truncation; L1, L2 assumed negligible)",
        assumptions: ["L1 and L2 assumed negligible"],
        sourceValues: { L0: -12345 },
      },
      verification: { method: "derived" },
      ...overrides,
    });
  }

  it("accepts a well-formed verified_derived record (Rules 4-7)", () => {
    expect(validateParameterValue(verifiedDerived()).valid).toBe(true);
  });

  it("rejects verified_derived with no derivation record (Rule 4)", () => {
    const result = validateParameterValue(verifiedDerived({ derivation: undefined }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.endsWith(".derivation"))).toBe(true);
  });

  it("rejects verified_derived with an empty transformationEquation (Rule 6)", () => {
    const result = validateParameterValue(
      verifiedDerived({ derivation: { transformationEquation: "", assumptions: ["a"], sourceValues: { L0: 1 } } }),
    );
    expect(result.valid).toBe(false);
  });

  it("rejects verified_derived with no assumptions (Rule 7)", () => {
    const result = validateParameterValue(
      verifiedDerived({ derivation: { transformationEquation: "x", assumptions: [], sourceValues: { L0: 1 } } }),
    );
    expect(result.valid).toBe(false);
  });

  it("rejects verified_derived with no sourceValues (Rule 5)", () => {
    const result = validateParameterValue(
      verifiedDerived({ derivation: { transformationEquation: "x", assumptions: ["a"], sourceValues: {} } }),
    );
    expect(result.valid).toBe(false);
  });

  it("rejects verified_derived with no verification record", () => {
    expect(validateParameterValue(verifiedDerived({ verification: undefined })).valid).toBe(false);
  });

  it('rejects verified_derived whose verification.method is not "derived"', () => {
    expect(validateParameterValue(verifiedDerived({ verification: { method: "direct_read" } })).valid).toBe(false);
  });
});

describe("validateParameterValue — status: provisional", () => {
  it("accepts a well-formed provisional record", () => {
    const result = validateParameterValue(baseValue({ status: "provisional", value: 1, source: { kind: "estimated" } }));
    expect(result.valid).toBe(true);
  });

  it("rejects provisional with no value", () => {
    expect(validateParameterValue(baseValue({ status: "provisional" })).valid).toBe(false);
  });
});

describe("validateParameterValue — units and source citation", () => {
  it("rejects a missing unit (Rule 12)", () => {
    const result = validateParameterValue({ ...baseValue(), unit: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects a literature source with no citation (Rule 11)", () => {
    const result = validateParameterValue(
      baseValue({ status: "provisional", value: 1, source: { kind: "literature" } }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.endsWith(".source.citation"))).toBe(true);
  });

  it("rejects a database source with no citation", () => {
    const result = validateParameterValue(baseValue({ status: "provisional", value: 1, source: { kind: "database" } }));
    expect(result.valid).toBe(false);
  });

  it("accepts a user_supplied source with no citation", () => {
    const result = validateParameterValue(
      baseValue({ status: "provisional", value: 1, source: { kind: "user_supplied" } }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateParameterValue — structured source location", () => {
  const cases: Array<{ label: string; location: NonNullable<ParameterValue["verification"]>["location"] }> = [
    { label: "table", location: { type: "table", identifier: "3", page: 112 } },
    { label: "equation", location: { type: "equation", identifier: "14" } },
    { label: "page", location: { type: "page", page: 112 } },
    { label: "section", location: { type: "section", identifier: "4.2" } },
    { label: "figure", location: { type: "figure", identifier: "2" } },
    { label: "other", location: { type: "other", description: "supplementary spreadsheet" } },
  ];

  for (const { label, location } of cases) {
    it(`accepts a verified_direct record with a "${label}" location`, () => {
      const result = validateParameterValue(
        baseValue({
          status: "verified_direct",
          value: 1,
          source: { kind: "literature", citation: "x" },
          verification: { method: "direct_read", location },
        }),
      );
      expect(result.valid).toBe(true);
    });
  }

  it("accepts verified_direct with no location at all (some sources don't state one)", () => {
    const result = validateParameterValue(
      baseValue({
        status: "verified_direct",
        value: 1,
        source: { kind: "literature", citation: "x" },
        verification: { method: "direct_read" },
      }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateParameterSet", () => {
  function baseSet(overrides: Partial<ParameterSet> = {}): ParameterSet {
    return {
      setId: "test-set",
      modelId: "test.model",
      system: "Au-Cu",
      parameters: [baseValue()],
      ...overrides,
    };
  }

  it("accepts a well-formed unavailable set with compatibility unset", () => {
    expect(validateParameterSet(baseSet()).valid).toBe(true);
  });

  it("rejects an empty setId (Rule 10)", () => {
    expect(validateParameterSet(baseSet({ setId: "" })).valid).toBe(false);
  });

  it("rejects an empty modelId", () => {
    expect(validateParameterSet(baseSet({ modelId: "" })).valid).toBe(false);
  });

  it("rejects an empty system", () => {
    expect(validateParameterSet(baseSet({ system: "" })).valid).toBe(false);
  });

  it("accepts a directly_compatible set whose parameter is still unavailable — compatible in shape, not yet verified", () => {
    expect(validateParameterSet(baseSet({ compatibility: "directly_compatible" })).valid).toBe(true);
  });

  it("accepts a requires_explicit_transformation set whose parameter is unavailable (Rule 8)", () => {
    expect(validateParameterSet(baseSet({ compatibility: "requires_explicit_transformation" })).valid).toBe(true);
  });

  it("rejects a requires_explicit_transformation set that contains a usable value (Rule 8)", () => {
    const result = validateParameterSet(
      baseSet({
        compatibility: "requires_explicit_transformation",
        parameters: [baseValue({ status: "provisional", value: 1, source: { kind: "estimated" } })],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("cannot contain a directly usable value"))).toBe(true);
  });

  it("rejects a not_compatible set that contains a usable value (Rule 9)", () => {
    const result = validateParameterSet(
      baseSet({
        compatibility: "not_compatible",
        parameters: [
          baseValue({
            status: "verified_direct",
            value: 1,
            source: { kind: "literature", citation: "x" },
            verification: { method: "direct_read" },
          }),
        ],
      }),
    );
    expect(result.valid).toBe(false);
  });

  it("rejects a parameter-level compatibility override that is LESS restrictive than the set", () => {
    const result = validateParameterSet(
      baseSet({
        compatibility: "not_compatible",
        parameters: [baseValue({ compatibility: "directly_compatible" })],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("less restrictive"))).toBe(true);
  });

  it("accepts a parameter-level compatibility override that is MORE restrictive than the set", () => {
    const result = validateParameterSet(
      baseSet({
        compatibility: "directly_compatible",
        parameters: [baseValue({ compatibility: "not_compatible" })],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("accepts a parameter-level compatibility override equal to the set's", () => {
    const result = validateParameterSet(
      baseSet({
        compatibility: "directly_compatible",
        parameters: [baseValue({ compatibility: "directly_compatible" })],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("aggregates per-parameter issues with an indexed path", () => {
    const result = validateParameterSet(baseSet({ parameters: [baseValue({ value: 5 })] }));
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.path).toBe("set.parameters[0].value");
  });
});
