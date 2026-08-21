import { PhysicalConstants } from "../core/Constants.js";
import { EngineError } from "../core/Errors.js";
import { validateComposition, type Composition } from "../core/Material.js";

/**
 * Ideal (configurational) molar entropy of mixing for an N-component
 * system:
 *
 *   ΔS_mix = -R Σ_i x_i ln(x_i)                      [J/(mol·K)]
 *
 * This is the fully general form of the entropy term already present, as
 * prose, in Ideal Solution's and Regular Solution's own documented molar
 * Gibbs energy of mixing (`engine/models/thermodynamics/ideal/metadata.ts`,
 * `engine/models/thermodynamics/regular/metadata.ts`) — see the Phase 5
 * audit, §B.1. Neither of those models computes it in code; this is the
 * first place it's actually implemented, as a standalone, model-
 * independent utility (not a `ModelDefinition` — no `modelId`, not run
 * through `CalculationPipeline`, matching `UnitConversion.ts`'s precedent
 * for a pure, opt-in engine capability).
 *
 * `x_i ln(x_i) -> 0` as `x_i -> 0` (the standard limiting convention) is
 * handled explicitly, not left to `Math.log(0) * 0`, which evaluates to
 * `NaN` in JavaScript rather than 0 — the same pattern already used at the
 * Quasi-Chemical model's own `x === 0` boundary
 * (`engine/models/thermodynamics/quasi-chemical/model.ts`).
 *
 * Validates its own input via the engine's existing `validateComposition`
 * (never re-implements composition validation) — this is a public,
 * standalone function callable without going through
 * `CalculationPipeline`, so an invalid composition must be rejected here
 * too, not only at the pipeline boundary.
 */
export function idealMixingEntropy(composition: Composition): number {
  const validation = validateComposition(composition);
  if (!validation.valid) {
    const firstIssue = validation.issues[0]!;
    throw new EngineError(firstIssue.code, firstIssue.message, { issues: validation.issues });
  }

  let sum = 0;
  for (const component of composition.components) {
    const x = component.fraction;
    if (x > 0) {
      sum += x * Math.log(x);
    }
    // x === 0 contributes 0 by the standard limiting convention — skipped
    // rather than computed, since Math.log(0) * 0 is NaN in JavaScript.
  }

  // A pure component (sum === 0, e.g. x=1 gives 1*ln(1)=0) negates to -0
  // under IEEE-754 — normalized to +0 so callers never see the surprising
  // (if numerically equivalent) negative-zero result.
  const result = -PhysicalConstants.GAS_CONSTANT_R * sum;
  return result === 0 ? 0 : result;
}
