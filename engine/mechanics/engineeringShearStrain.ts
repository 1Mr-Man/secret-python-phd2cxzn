import { EngineError } from "../core/Errors.js";

/**
 * Converts a TENSORIAL shear-strain value to engineering shear strain:
 *
 *   γ_ij = 2 ε_ij
 *
 * This is the explicit, separately-named conversion required before
 * feeding a tensor-extracted shear component (e.g. from
 * `tensorialShearStrainComponents()`) into an engineering formula such as
 * Phase 6A's `shearModulus()`, which expects γ, not ε. Never apply this
 * factor implicitly inside tensor extraction (Phase 6B audit) — that is
 * exactly the silent factor-of-2 error this function exists to prevent.
 */
export function engineeringShearStrain(tensorialShearStrain: number): number {
  if (!Number.isFinite(tensorialShearStrain)) {
    throw new EngineError(
      "INVALID_INPUT",
      `engineeringShearStrain() requires a finite tensorialShearStrain, got ${tensorialShearStrain}.`,
    );
  }

  return 2 * tensorialShearStrain;
}
