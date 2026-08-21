import type { StrainTensor } from "./strainTensor.js";
import { validateStrainTensor } from "./strainTensor.js";

/**
 * Von Mises equivalent strain — a single-state scalar measure of
 * distortional (shape-change) strain magnitude:
 *
 *   ε_eq = sqrt( (2/9)[(εxx-εyy)² + (εyy-εzz)² + (εzz-εxx)²]
 *                + (4/3)[εxy² + εyz² + εxz²] )
 *
 * equivalently sqrt((2/3) e:e) for the tensorial deviatoric strain e.
 * The 4/3 shear coefficient is the correct one for TENSORIAL shear
 * strain (this repo's `StrainTensor` convention, Phase 6B) — it is NOT
 * the coefficient used in formulas written for engineering shear strain
 * (γ=2ε), which use 1/3 instead. Computed directly from the tensor's raw
 * components; deliberately does NOT call `engineeringShearStrain()` (no
 * conversion is needed or correct here) and does NOT call
 * `principalStrains()` (this is a direct tensor invariant, not derived
 * via eigenvalues) — see the Phase 6D audit.
 *
 * NOT a von Mises STRESS, NOT a yield criterion or yield surface, and
 * NOT the path-dependent accumulated equivalent plastic strain of flow-
 * plasticity theory — this is a single-state scalar computed from one
 * strain tensor, with no notion of loading history or material yield
 * behavior. A purely hydrostatic (volume-only) strain state legitimately
 * produces ε_eq = 0 by design: this measures distortion, not overall
 * strain magnitude (Phase 6D audit).
 *
 * Reuses `validateStrainTensor()` for input validation — no duplicated
 * checks, no new error code. Always finite and non-negative for any
 * valid tensor (a sum of squares under a square root), so there is no
 * `SCIENTIFIC_DOMAIN_ERROR` case here.
 */
export function equivalentStrain(tensor: StrainTensor): number {
  validateStrainTensor(tensor);

  const c = tensor.components;
  const exx = c[0]![0]!;
  const eyy = c[1]![1]!;
  const ezz = c[2]![2]!;
  const exy = c[0]![1]!;
  const eyz = c[1]![2]!;
  const exz = c[0]![2]!;

  const normalTerm = (exx - eyy) ** 2 + (eyy - ezz) ** 2 + (ezz - exx) ** 2;
  const shearTerm = exy * exy + eyz * eyz + exz * exz;

  return Math.sqrt((2 / 9) * normalTerm + (4 / 3) * shearTerm);
}
