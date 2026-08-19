import type { Conditions } from "../../../core/Conditions.js";
import type { Material } from "../../../core/Material.js";
import type { ParameterResolutionResult } from "../../../parameters/resolve.js";
import { resolveParameterSet } from "../../../parameters/resolve.js";
import { MIVM_BINARY_MODEL_ID } from "./metadata.js";

/**
 * Binary MIVM's own entry point into the generic parameter resolver
 * (engine/parameters/resolve.ts), scoped to this model and asking for
 * all six parameters it needs: B_ij, B_ji, Z_i, Z_j, V_mi, V_mj.
 * Mirrors resolveRegularSolutionParameters / resolveQuasiChemicalParameters
 * exactly, including the preferredSetId escape hatch for an
 * otherwise-AMBIGUOUS query.
 *
 * Thin, OPT-IN wrapper: does not change calculate()/validate() in
 * model.ts, and CalculationPipeline.ts never calls it. No MIVM
 * parameter set is registered anywhere in this codebase (see
 * engine/data/parameterSets/ — no MIVM entries exist), so calling this
 * against any real system today correctly returns NOT_FOUND — that is
 * the honest answer, not a bug. Real MIVM parameter acquisition is
 * explicitly out of scope for this phase (docs/MIVM_MATHEMATICAL_AUDIT.md).
 */
export function resolveMivmParameters(
  material: Material,
  conditions: Conditions,
  options: { preferredSetId?: string } = {},
): ParameterResolutionResult {
  return resolveParameterSet({
    modelId: MIVM_BINARY_MODEL_ID,
    composition: material.composition,
    conditions,
    requiredKeys: ["B_ij", "B_ji", "Z_i", "Z_j", "V_mi", "V_mj"],
    preferredSetId: options.preferredSetId,
  });
}
