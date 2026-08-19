import { describe, expect, it } from "vitest";
import { binaryComposition } from "../core/Material.js";
import { Au, Cu } from "../data/elements.js";
import { IDEAL_SOLUTION_SCC0_MODEL_ID } from "../models/thermodynamics/ideal/index.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../models/thermodynamics/quasi-chemical/index.js";
import { REGULAR_SOLUTION_SCC0_MODEL_ID } from "../models/thermodynamics/regular/index.js";
import { compareModels } from "./ModelComparison.js";
// Importing the barrel registers the built-in models as a side effect.
import "../index.js";

const material = { composition: binaryComposition(Au, 0.5, Cu, 0.5) };
const conditions = { temperatureK: 1550 };

describe("compareModels", () => {
  it("runs multiple models against the same material/conditions and returns one entry per model", () => {
    const comparison = compareModels({
      material,
      conditions,
      modelIds: [IDEAL_SOLUTION_SCC0_MODEL_ID, REGULAR_SOLUTION_SCC0_MODEL_ID, QUASI_CHEMICAL_SCC0_MODEL_ID],
      parametersByModel: {
        [REGULAR_SOLUTION_SCC0_MODEL_ID]: { W: -21500 },
        [QUASI_CHEMICAL_SCC0_MODEL_ID]: { Z: 10, W: -21500 },
      },
    });

    expect(comparison.entries).toHaveLength(3);

    const byId = Object.fromEntries(comparison.entries.map((entry) => [entry.modelId, entry]));

    expect(byId[IDEAL_SOLUTION_SCC0_MODEL_ID]?.result).toBeDefined();
    expect((byId[IDEAL_SOLUTION_SCC0_MODEL_ID]!.result!.values.Scc0 as { value: number }).value).toBeCloseTo(
      0.25,
      6,
    );

    expect(byId[REGULAR_SOLUTION_SCC0_MODEL_ID]?.result).toBeDefined();
    expect((byId[REGULAR_SOLUTION_SCC0_MODEL_ID]!.result!.values.Scc0 as { value: number }).value).toBeCloseTo(
      0.1363,
      4,
    );

    expect(byId[QUASI_CHEMICAL_SCC0_MODEL_ID]?.result).toBeDefined();
    expect((byId[QUASI_CHEMICAL_SCC0_MODEL_ID]!.result!.values.Scc0 as { value: number }).value).toBeCloseTo(
      0.13104,
      5,
    );

    // Physical ordering established in the Regular Solution golden tests holds here too.
    const ideal = (byId[IDEAL_SOLUTION_SCC0_MODEL_ID]!.result!.values.Scc0 as { value: number }).value;
    const regular = (byId[REGULAR_SOLUTION_SCC0_MODEL_ID]!.result!.values.Scc0 as { value: number }).value;
    const qc = (byId[QUASI_CHEMICAL_SCC0_MODEL_ID]!.result!.values.Scc0 as { value: number }).value;
    expect(ideal).toBeGreaterThan(regular);
    expect(regular).toBeGreaterThan(qc);
  });

  it("supports an arbitrary subset/order of registered models, not a hardcoded list", () => {
    const comparison = compareModels({
      material,
      conditions,
      modelIds: [QUASI_CHEMICAL_SCC0_MODEL_ID],
      parametersByModel: { [QUASI_CHEMICAL_SCC0_MODEL_ID]: { Z: 10, W: -21500 } },
    });
    expect(comparison.entries).toHaveLength(1);
    expect(comparison.entries[0]?.modelId).toBe(QUASI_CHEMICAL_SCC0_MODEL_ID);
  });

  it("reports an unknown model as an error entry instead of aborting the whole comparison", () => {
    const comparison = compareModels({
      material,
      conditions,
      modelIds: [IDEAL_SOLUTION_SCC0_MODEL_ID, "does.not.exist"],
    });

    expect(comparison.entries).toHaveLength(2);

    const ideal = comparison.entries.find((entry) => entry.modelId === IDEAL_SOLUTION_SCC0_MODEL_ID);
    expect(ideal?.result).toBeDefined();
    expect(ideal?.error).toBeUndefined();

    const missing = comparison.entries.find((entry) => entry.modelId === "does.not.exist");
    expect(missing?.result).toBeUndefined();
    expect(missing?.error?.code).toBe("MODEL_NOT_FOUND");
  });

  it("reports a model-validation failure (e.g. missing parameter) as an error entry, not a thrown exception", () => {
    const comparison = compareModels({
      material,
      conditions,
      modelIds: [REGULAR_SOLUTION_SCC0_MODEL_ID], // no W supplied
    });

    expect(comparison.entries[0]?.result).toBeUndefined();
    expect(comparison.entries[0]?.error?.code).toBe("MODEL_VALIDATION_ERROR");
  });

  it("normalizes every successful entry to the standard CalculationResult shape", () => {
    const comparison = compareModels({
      material,
      conditions,
      modelIds: [IDEAL_SOLUTION_SCC0_MODEL_ID],
    });

    const result = comparison.entries[0]?.result;
    expect(result).toBeDefined();
    expect(result!.modelId).toBe(IDEAL_SOLUTION_SCC0_MODEL_ID);
    expect(result!.units.Scc0).toBe("dimensionless");
    expect(result!.parameterProvenance).toBeDefined();
    expect(result!.metadata.engineVersion).toBeTruthy();
  });
});
