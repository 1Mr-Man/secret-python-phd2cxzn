import { EngineError } from "../core/Errors.js";

/**
 * Volumetric strain, exact form:
 *
 *   εV = (V - V₀) / V₀                                   [dimensionless]
 *
 * V₀ is the reference (undeformed) volume; V is the current (deformed)
 * volume. This is the exact definition — the small-strain approximation
 * εV ≈ εx + εy + εz is deliberately deferred to Phase 6B alongside strain
 * tensors (Phase 6 audit).
 */
export function volumetricStrain(volume: number, referenceVolume: number): number {
  if (!Number.isFinite(volume)) {
    throw new EngineError("INVALID_INPUT", `volumetricStrain() requires a finite volume, got ${volume}.`);
  }
  if (!Number.isFinite(referenceVolume)) {
    throw new EngineError("INVALID_INPUT", `volumetricStrain() requires a finite referenceVolume, got ${referenceVolume}.`);
  }
  if (referenceVolume <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `volumetricStrain() requires a strictly positive referenceVolume (a physical volume cannot be zero or negative), got ${referenceVolume}.`,
    );
  }

  return (volume - referenceVolume) / referenceVolume;
}
