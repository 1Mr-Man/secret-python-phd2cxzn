import type { StrainTensor } from "./strainTensor.js";

/**
 * Small-strain volumetric strain, from the trace of the strain tensor:
 *
 *   εV ≈ tr(ε) = εxx + εyy + εzz
 *
 * This is the SMALL-STRAIN APPROXIMATION, distinct from Phase 6A's
 * `volumetricStrain()` (which computes the exact (V-V0)/V0 ratio from
 * actual volumes) — the two coincide only in the small-strain limit and
 * are never composed with each other (Phase 6B audit). Assumes
 * `validateStrainTensor()` has already passed.
 */
export function volumetricStrainFromTensor(tensor: StrainTensor): number {
  return tensor.components[0]![0]! + tensor.components[1]![1]! + tensor.components[2]![2]!;
}
