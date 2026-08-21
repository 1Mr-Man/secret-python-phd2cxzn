import { EngineError } from "../core/Errors.js";

/**
 * Activity a_i = γ_i · x_i — dimensionless.
 *
 * Consumes an already-established activity coefficient γ_i rather than
 * computing one itself — MIVM already computes and exposes `gammaI`/
 * `gammaJ` (`engine/models/thermodynamics/mivm/model.ts`), and no other
 * existing model exposes an activity coefficient at all (Phase 5 audit,
 * §B.5). This function is the one missing step between "a model's own
 * γ_i" and "the activity," reusable as-is by MIVM today and by any future
 * model that produces its own γ_i the same way — it must never
 * reimplement a model's activity-coefficient equation itself.
 *
 * Pure function: no modelId, not run through CalculationPipeline, no
 * ModelDefinition — mirrors `UnitConversion.ts`'s and
 * `mixingEntropy.ts`'s precedent for a standalone, opt-in engine
 * capability.
 */
export function activity(activityCoefficient: number, moleFraction: number): number {
  if (!Number.isFinite(activityCoefficient)) {
    throw new EngineError("INVALID_INPUT", `activity() requires a finite activity coefficient, got ${activityCoefficient}.`);
  }
  if (!Number.isFinite(moleFraction) || moleFraction < 0 || moleFraction > 1) {
    throw new EngineError("INVALID_INPUT", `activity() requires a mole fraction in [0, 1], got ${moleFraction}.`);
  }

  return activityCoefficient * moleFraction;
}
