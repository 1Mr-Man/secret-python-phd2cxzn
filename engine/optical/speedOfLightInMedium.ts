import { PhysicalConstants } from "../core/Constants.js";
import { EngineError } from "../core/Errors.js";

/**
 * Speed of light in a medium of given refractive index:
 *
 *   v = c / n                                            [m/s]
 *
 * `n` is a plain caller-supplied number (e.g. an `Element.optical`
 * `refractiveIndex` value) — this function does not look it up from any
 * `Element` record. `n <= 0` is rejected: a physical refractive index is
 * strictly positive (Phase 10A audit).
 */
export function speedOfLightInMedium(refractiveIndex: number): number {
  if (!Number.isFinite(refractiveIndex)) {
    throw new EngineError("INVALID_INPUT", `speedOfLightInMedium() requires a finite refractiveIndex, got ${refractiveIndex}.`);
  }
  if (refractiveIndex <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `speedOfLightInMedium() requires a strictly positive refractiveIndex, got ${refractiveIndex}.`,
    );
  }

  return PhysicalConstants.SPEED_OF_LIGHT / refractiveIndex;
}
