import type { Conditions } from "../../../core/Conditions.js";
import type { Material } from "../../../core/Material.js";
import type { ParameterResolutionResult } from "../../../parameters/resolve.js";
import { resolveParameterSet } from "../../../parameters/resolve.js";
import { REGULAR_SOLUTION_SCC0_MODEL_ID } from "./metadata.js";

/**
 * Regular Solution's own entry point into the generic parameter resolver
 * (engine/parameters/resolve.ts), scoped to this model and asking
 * specifically for W — the only parameter this model needs (see
 * metadata.ts).
 *
 * This is a thin, OPT-IN wrapper. It does not change `calculate()` or
 * `validate()` in model.ts, and `CalculationPipeline.ts` never calls it —
 * a caller (a future UI, a script, a test) uses this BEFORE building a
 * CalculationRequest, to find out whether a verified W exists for the
 * requested system/temperature and decide what to do (proceed, show
 * "parameter not available", ask the user to supply one manually) without
 * the engine ever guessing on their behalf.
 *
 * Because the parameter store ships with no real data (see
 * engine/parameters/parameterStore.ts), calling this against a real
 * system today returns NOT_FOUND — that is the correct, honest answer,
 * not a bug. See model.test.ts / parameters.test.ts for both the
 * empty-store case and a fixture-based demonstration of every resolution
 * state.
 */
export function resolveRegularSolutionParameters(
  material: Material,
  conditions: Conditions,
  options: { preferredSetId?: string } = {},
): ParameterResolutionResult {
  return resolveParameterSet({
    modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
    composition: material.composition,
    conditions,
    requiredKeys: ["W"],
    preferredSetId: options.preferredSetId,
  });
}
