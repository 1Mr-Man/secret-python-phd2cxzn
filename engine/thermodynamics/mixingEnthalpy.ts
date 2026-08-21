import { EngineError } from "../core/Errors.js";
import { validateComposition, type Composition } from "../core/Material.js";
import {
  buildInteractionLookup,
  canonicalPairKey,
  validateInteractionMatrixForComposition,
  validateInteractionMatrixStructure,
  type InteractionMatrix,
} from "./interactionMatrix.js";

/**
 * Regular-solution-style molar mixing enthalpy for an N-component system:
 *
 *   ΔH_mix = Σ_{i<j} Ω_ij x_i x_j                     [J/mol]
 *
 * `Ω_ij` is explicitly the regular-solution-style pairwise interaction
 * energy — identical in form to Regular Solution's own binary `W·x(1-x)`
 * (`engine/models/thermodynamics/regular/metadata.ts`) generalized to N
 * components, and NEVER Quasi-Chemical's `W` or MIVM's `B_ij`/`B_ji` —
 * see `interactionMatrix.ts`'s header comment and the Phase 5D audit.
 *
 * Validates its own inputs: the composition via the engine's existing
 * `validateComposition`, and the matrix via `interactionMatrix.ts`'s two
 * deliberately-separate checks (matrix-level structure, then
 * composition-dependent completeness) — never reimplements either.
 */
export function regularSolutionMixingEnthalpy(composition: Composition, matrix: InteractionMatrix): number {
  const compositionValidation = validateComposition(composition);
  if (!compositionValidation.valid) {
    const firstIssue = compositionValidation.issues[0]!;
    throw new EngineError(firstIssue.code, firstIssue.message, { issues: compositionValidation.issues });
  }

  validateInteractionMatrixStructure(matrix);
  validateInteractionMatrixForComposition(matrix, composition);

  const lookup = buildInteractionLookup(matrix);
  const components = composition.components;

  let sum = 0;
  for (let a = 0; a < components.length; a++) {
    for (let b = a + 1; b < components.length; b++) {
      const componentA = components[a]!;
      const componentB = components[b]!;
      if (componentA.fraction <= 0 || componentB.fraction <= 0) continue; // exempt — Ω·0·x is 0 regardless of Ω

      const omega = lookup.get(canonicalPairKey(componentA.element.symbol, componentB.element.symbol))!;
      sum += omega * componentA.fraction * componentB.fraction;
    }
  }

  return sum;
}
