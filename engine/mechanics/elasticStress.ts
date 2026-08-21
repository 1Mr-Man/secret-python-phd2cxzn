import { EngineError } from "../core/Errors.js";

/**
 * Uniaxial linear-elastic stress (Hooke's law):
 *
 *   σ = E · ε                                            [Pa]
 *
 * This represents ONLY the uniaxial, linear-elastic regime — it is not a
 * general definition of stress. Real stress is not always E·ε: plastic
 * deformation, multiaxial stress states, and nonlinear elasticity all
 * require a different relation, none of which are implemented here (see
 * the Phase 6 audit — stress-strain curves are a separate, deferred model
 * phase). Deliberately not named `stress()`, to keep that restriction
 * visible at every call site.
 */
export function elasticStress(youngsModulusPa: number, strain: number): number {
  if (!Number.isFinite(youngsModulusPa)) {
    throw new EngineError("INVALID_INPUT", `elasticStress() requires a finite youngsModulusPa, got ${youngsModulusPa}.`);
  }
  if (!Number.isFinite(strain)) {
    throw new EngineError("INVALID_INPUT", `elasticStress() requires a finite strain, got ${strain}.`);
  }
  if (youngsModulusPa <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `elasticStress() requires a strictly positive youngsModulusPa (a real material's elastic modulus is always positive), got ${youngsModulusPa}.`,
    );
  }

  return youngsModulusPa * strain;
}
