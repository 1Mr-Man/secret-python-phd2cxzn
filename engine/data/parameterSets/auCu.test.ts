import { beforeEach, describe, expect, it } from "vitest";
import { binaryComposition } from "../../core/Material.js";
import { Au, Cu } from "../elements.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../../models/thermodynamics/quasi-chemical/index.js";
import { REGULAR_SOLUTION_SCC0_MODEL_ID } from "../../models/thermodynamics/regular/index.js";
import { clearParameterStore, findAllParameterSets, registerParameterSet } from "../../parameters/parameterStore.js";
import { resolveParameterSet } from "../../parameters/resolve.js";
import { validateParameterSet } from "../../parameters/validateParameterRecord.js";
import {
  AU_CU_KNOWN_SOURCES,
  AU_CU_QUASI_CHEMICAL_SU_WANG_2013,
  AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997,
  AU_CU_REGULAR_SOLUTION_SUNDMAN_1998,
} from "./auCu.js";

/**
 * These tests use the REAL literature records from auCu.ts — real
 * citations, DOIs where available, and (per DATA_MANIFEST.md) no numeric
 * value, because none could be independently verified in this
 * environment. That's the point being tested here: registration,
 * provenance, and system/model scoping all work correctly for real data,
 * and the resolver still correctly refuses to fabricate a usable value.
 *
 * For tests that need an actual numeric value to flow through a real
 * calculation (ambiguity between competing sources, explicit set
 * selection, the full Regular Solution end-to-end chain), see
 * engine/models/thermodynamics/regular/parametersEndToEnd.test.ts, which
 * uses clearly-labeled synthetic fixtures instead — this file never does.
 */

const auCu = binaryComposition(Au, 0.5, Cu, 0.5);
const cuAu = binaryComposition(Cu, 0.5, Au, 0.5);

describe("real Au-Cu literature records", () => {
  beforeEach(() => {
    clearParameterStore();
  });

  it("can be registered without error", () => {
    expect(() => registerParameterSet(AU_CU_REGULAR_SOLUTION_SUNDMAN_1998)).not.toThrow();
  });

  it("provenance survives registration and lookup unchanged", () => {
    registerParameterSet(AU_CU_REGULAR_SOLUTION_SUNDMAN_1998);
    const [found] = findAllParameterSets(REGULAR_SOLUTION_SCC0_MODEL_ID, "Au-Cu");

    const w = found?.parameters.find((p) => p.key === "W");
    expect(w?.source.citation).toContain("Sundman");
    expect(w?.source.publicationYear).toBe(1998);
    expect(w?.status).toBe("unavailable");
    expect(w?.value).toBeUndefined();
    expect(w?.unit).toBe("J/mol");
  });

  it("preserves DOI metadata for a source that has one", () => {
    registerParameterSet(AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997);
    const [found] = findAllParameterSets(REGULAR_SOLUTION_SCC0_MODEL_ID, "Au-Cu");
    expect(found?.parameters[0]?.source.doi).toBe("10.1088/0034-4885/60/1/003");
  });

  it("the store finds the registered real record (it exists) even though the resolver correctly refuses to use it", () => {
    registerParameterSet(AU_CU_REGULAR_SOLUTION_SUNDMAN_1998);

    const stored = findAllParameterSets(REGULAR_SOLUTION_SCC0_MODEL_ID, "Au-Cu");
    expect(stored).toHaveLength(1);
    expect(stored[0]?.setId).toBe("au-cu.regular-solution.sundman-fries-oates-1998");

    const resolved = resolveParameterSet({ modelId: REGULAR_SOLUTION_SCC0_MODEL_ID, composition: auCu });
    expect(resolved.status).toBe("NOT_FOUND");
    expect(resolved.parameterSet).toBeUndefined();
  });

  it("resolves identically whether the query composition lists Au or Cu first", () => {
    registerParameterSet(AU_CU_REGULAR_SOLUTION_SUNDMAN_1998);
    expect(findAllParameterSets(REGULAR_SOLUTION_SCC0_MODEL_ID, "Au-Cu")).toHaveLength(1);

    const viaAuCu = resolveParameterSet({ modelId: REGULAR_SOLUTION_SCC0_MODEL_ID, composition: auCu });
    const viaCuAu = resolveParameterSet({ modelId: REGULAR_SOLUTION_SCC0_MODEL_ID, composition: cuAu });
    expect(viaAuCu.canonicalSystemId).toBe(viaCuAu.canonicalSystemId);
    expect(viaAuCu.status).toBe(viaCuAu.status);
  });

  it("a record registered under Regular Solution is not retrievable when resolving Quasi-Chemical for the same system", () => {
    registerParameterSet(AU_CU_REGULAR_SOLUTION_SUNDMAN_1998);
    expect(findAllParameterSets(QUASI_CHEMICAL_SCC0_MODEL_ID, "Au-Cu")).toEqual([]);
  });

  it("a record registered for Au-Cu is not retrievable when resolving a different system", () => {
    registerParameterSet(AU_CU_QUASI_CHEMICAL_SU_WANG_2013);
    expect(findAllParameterSets(QUASI_CHEMICAL_SCC0_MODEL_ID, "Ag-Cu")).toEqual([]);
  });

  it("resolving the real Au-Cu Quasi-Chemical query returns NOT_FOUND, never a fabricated Z or W", () => {
    registerParameterSet(AU_CU_QUASI_CHEMICAL_SU_WANG_2013);
    const result = resolveParameterSet({
      modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
      composition: auCu,
      requiredKeys: ["Z", "W"],
    });
    expect(result.status).toBe("NOT_FOUND");
    expect(JSON.stringify(result)).not.toMatch(/"value":-?\d/);
  });

  it("every real record's setId is unique and citation-bearing (sanity check on the dataset itself)", () => {
    const all = [
      AU_CU_REGULAR_SOLUTION_SUNDMAN_1998,
      AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997,
      AU_CU_QUASI_CHEMICAL_SU_WANG_2013,
    ];
    const setIds = all.map((set) => set.setId);
    expect(new Set(setIds).size).toBe(setIds.length);
    for (const set of all) {
      for (const parameter of set.parameters) {
        expect(parameter.status).toBe("unavailable");
        expect(parameter.value).toBeUndefined();
        expect(parameter.source.citation).toBeTruthy();
        expect(parameter.source.publicationYear).toBeGreaterThan(1900);
      }
    }
  });
});

describe("real Au-Cu records — compatibility classification (Phase 2D)", () => {
  it("Sundman/Fries/Oates (CALPHAD, Redlich-Kister) is classified requires_explicit_transformation", () => {
    expect(AU_CU_REGULAR_SOLUTION_SUNDMAN_1998.compatibility).toBe("requires_explicit_transformation");
  });

  it("Singh/Sommer (single-W formalism) is classified directly_compatible", () => {
    expect(AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997.compatibility).toBe("directly_compatible");
  });

  it("Su/Wang (QC form unconfirmed) leaves compatibility unset rather than guessing", () => {
    expect(AU_CU_QUASI_CHEMICAL_SU_WANG_2013.compatibility).toBeUndefined();
  });

  it("every real record passes validateParameterSet — structurally consistent, no contradictions", () => {
    for (const set of AU_CU_KNOWN_SOURCES) {
      const result = validateParameterSet(set);
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    }
  });

  it("all three records remain unavailable and produce no numeric value anywhere, migration or not", () => {
    for (const set of AU_CU_KNOWN_SOURCES) {
      for (const parameter of set.parameters) {
        expect(parameter.status).toBe("unavailable");
        expect(parameter.value).toBeUndefined();
      }
    }
  });
});
