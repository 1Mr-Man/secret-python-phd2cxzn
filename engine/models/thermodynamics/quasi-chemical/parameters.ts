import type { Conditions } from "../../../core/Conditions.js";
import type { Material } from "../../../core/Material.js";
import type { ParameterResolutionResult } from "../../../parameters/resolve.js";
import { resolveParameterSet } from "../../../parameters/resolve.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "./metadata.js";

/**
 * Quasi-Chemical's own entry point into the generic parameter resolver
 * (engine/parameters/resolve.ts), scoped to this model and asking for both
 * of its parameters — Z (coordination number) and W (interchange energy).
 * Mirrors `resolveRegularSolutionParameters` in the neighboring `regular/`
 * model exactly, including the `preferredSetId` escape hatch for an
 * otherwise-AMBIGUOUS query.
 *
 * Thin, OPT-IN wrapper: does not change `calculate()`/`validate()` in
 * model.ts, and CalculationPipeline.ts never calls it. The Su & Wang
 * (2013) Au-Cu record already registered in engine/data/parameterSets/
 * still has `status: "unavailable"` for both Z and W (see
 * DATA_MANIFEST.md), so calling this against the real Au-Cu system today
 * correctly returns NOT_FOUND — no equation or golden value changes here,
 * and no numeric QC parameter is introduced by this file.
 */
export function resolveQuasiChemicalParameters(
  material: Material,
  conditions: Conditions,
  options: { preferredSetId?: string } = {},
): ParameterResolutionResult {
  return resolveParameterSet({
    modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
    composition: material.composition,
    conditions,
    requiredKeys: ["Z", "W"],
    preferredSetId: options.preferredSetId,
  });
}
