import { EngineError } from "../core/Errors.js";

/**
 * Fresnel reflectance at normal incidence, for the interface between two
 * media of refractive index n1 and n2:
 *
 *   R = ((n1 - n2) / (n1 + n2))²                         [dimensionless]
 *
 * Both `n1` and `n2` are plain caller-supplied numbers — e.g. `1` for
 * vacuum/air and an `Element.optical.refractiveIndex` value for a
 * material. No physical constant is needed. Normal incidence only — no
 * angle-dependent (s/p-polarized) Fresnel equations in this phase
 * (Phase 10A audit).
 */
export function fresnelReflectanceNormalIncidence(n1: number, n2: number): number {
  if (!Number.isFinite(n1)) {
    throw new EngineError("INVALID_INPUT", `fresnelReflectanceNormalIncidence() requires a finite n1, got ${n1}.`);
  }
  if (!Number.isFinite(n2)) {
    throw new EngineError("INVALID_INPUT", `fresnelReflectanceNormalIncidence() requires a finite n2, got ${n2}.`);
  }
  if (n1 <= 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", `fresnelReflectanceNormalIncidence() requires a strictly positive n1, got ${n1}.`);
  }
  if (n2 <= 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", `fresnelReflectanceNormalIncidence() requires a strictly positive n2, got ${n2}.`);
  }

  return ((n1 - n2) / (n1 + n2)) ** 2;
}
