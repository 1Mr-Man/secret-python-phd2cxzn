import type { StrainTensor } from "./strainTensor.js";

/**
 * Normal strain components (diagonal entries) — the same value under
 * either the tensorial or engineering convention, so no conversion is
 * needed for these. Assumes `validateStrainTensor()` has already passed
 * (matches `interactionMatrix.ts`'s `buildInteractionLookup()` precedent
 * — an extraction helper does not re-validate its input).
 */
export function normalStrainComponents(tensor: StrainTensor): { xx: number; yy: number; zz: number } {
  return {
    xx: tensor.components[0]![0]!,
    yy: tensor.components[1]![1]!,
    zz: tensor.components[2]![2]!,
  };
}

/**
 * TENSORIAL shear strain components (off-diagonal entries), ε_ij — NOT
 * engineering shear strain. Feed these through `engineeringShearStrain()`
 * (`engineeringShearStrain.ts`) before using them in an engineering
 * formula such as Phase 6A's `shearModulus()`, which expects γ = 2ε
 * (Phase 6B audit). Assumes `validateStrainTensor()` has already passed.
 */
export function tensorialShearStrainComponents(tensor: StrainTensor): { xy: number; yz: number; xz: number } {
  return {
    xy: tensor.components[0]![1]!,
    yz: tensor.components[1]![2]!,
    xz: tensor.components[0]![2]!,
  };
}
