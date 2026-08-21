import { PhysicalConstants } from "../core/Constants.js";
import { EngineError } from "../core/Errors.js";

/**
 * Optical absorption-edge (cutoff) wavelength from a band gap:
 *
 *   λ_cutoff = h*c / E_g                                 [m]
 *
 * `opticalBandGapEv` (a plain caller-supplied number, e.g. an
 * `Element.optical.opticalBandGapEv` value) is in eV, but `h` and `c`
 * are SI — this function explicitly converts: E_g[J] = E_g[eV] * e
 * (the elementary charge), so:
 *
 *   λ_cutoff = h*c / (E_g[eV] * e)
 *
 * This eV->J conversion is the most important unit boundary in this
 * formula (Phase 10A audit) — never skipped or left implicit.
 */
export function bandGapCutoffWavelength(opticalBandGapEv: number): number {
  if (!Number.isFinite(opticalBandGapEv)) {
    throw new EngineError("INVALID_INPUT", `bandGapCutoffWavelength() requires a finite opticalBandGapEv, got ${opticalBandGapEv}.`);
  }
  if (opticalBandGapEv <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `bandGapCutoffWavelength() requires a strictly positive opticalBandGapEv, got ${opticalBandGapEv}.`,
    );
  }

  const { PLANCK_CONSTANT: h, SPEED_OF_LIGHT: c, ELEMENTARY_CHARGE: e } = PhysicalConstants;
  const bandGapJoules = opticalBandGapEv * e;

  return (h * c) / bandGapJoules;
}
