import { PhysicalConstants } from "../core/Constants.js";
import { validateConditions } from "../core/Conditions.js";
import { EngineError } from "../core/Errors.js";
import { validateComposition, type Composition } from "../core/Material.js";

/**
 * Ideal molar Gibbs energy of mixing for an N-component system, computed
 * from its own direct closed-form expression (not by calling
 * `idealMixingEntropy()` and multiplying by `-T`):
 *
 *   ΔG_mix^ideal = RT Σ_i x_i ln(x_i)                 [J/mol]
 *
 * This is independently auditable against the known identity
 * `ΔG_mix^ideal = -T·ΔS_mix` (see `mixingEntropy.ts`'s
 * `idealMixingEntropy`) — that relationship is checked as a *regression/
 * consistency test* in this file's test suite, not relied on as the
 * implementation itself, so a bug in one function can't silently cancel
 * out in the other.
 *
 * Same limiting convention as `idealMixingEntropy`: `x_i ln(x_i) -> 0` as
 * `x_i -> 0`, handled explicitly rather than via `Math.log(0) * 0` (NaN
 * in JavaScript). Excess Gibbs energy, activity coefficients, activities,
 * and chemical potentials are all explicitly out of scope for this
 * function — see the Phase 5 audit.
 *
 * Validates its own inputs via the engine's existing `validateComposition`
 * and `validateConditions` (never reimplements either) — this is a
 * public, standalone function callable without going through
 * `CalculationPipeline`.
 */
export function idealMixingGibbsEnergy(composition: Composition, temperatureK: number): number {
  const compositionValidation = validateComposition(composition);
  if (!compositionValidation.valid) {
    const firstIssue = compositionValidation.issues[0]!;
    throw new EngineError(firstIssue.code, firstIssue.message, { issues: compositionValidation.issues });
  }

  const conditionsValidation = validateConditions({ temperatureK }, ["temperatureK"]);
  if (!conditionsValidation.valid) {
    const firstIssue = conditionsValidation.issues[0]!;
    throw new EngineError(firstIssue.code, firstIssue.message, { issues: conditionsValidation.issues });
  }

  const { GAS_CONSTANT_R: R } = PhysicalConstants;

  let sum = 0;
  for (const component of composition.components) {
    const x = component.fraction;
    if (x > 0) {
      sum += x * Math.log(x);
    }
    // x === 0 contributes 0 by the standard limiting convention — skipped
    // rather than computed, since Math.log(0) * 0 is NaN in JavaScript.
  }

  return R * temperatureK * sum;
}
