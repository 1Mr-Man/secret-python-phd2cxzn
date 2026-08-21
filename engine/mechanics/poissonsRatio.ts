import { EngineError } from "../core/Errors.js";

/**
 * Poisson's ratio:
 *
 *   ν = -ε_transverse / ε_axial                          [dimensionless]
 *
 * For a material stretched along its axial direction, ε_axial is
 * typically positive and ε_transverse (the lateral contraction) is
 * typically negative, making ν positive for ordinary materials — but
 * this function does not enforce that sign relationship: a negative
 * (auxetic) Poisson's ratio is physically real and not rejected here.
 */
export function poissonsRatio(transverseStrain: number, axialStrain: number): number {
  if (!Number.isFinite(transverseStrain)) {
    throw new EngineError("INVALID_INPUT", `poissonsRatio() requires a finite transverseStrain, got ${transverseStrain}.`);
  }
  if (!Number.isFinite(axialStrain)) {
    throw new EngineError("INVALID_INPUT", `poissonsRatio() requires a finite axialStrain, got ${axialStrain}.`);
  }
  if (axialStrain === 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", "poissonsRatio() is undefined at axialStrain=0 (division by zero).");
  }

  const result = -transverseStrain / axialStrain;
  return result === 0 ? 0 : result;
}
