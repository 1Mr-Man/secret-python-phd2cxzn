import { EngineError } from "../core/Errors.js";

/**
 * Linear temperature coefficient of resistivity, expressed in terms of
 * an already-computed temperature difference:
 *
 *   ρ = ρ0 * (1 + α * ΔT)                                 [Ω·m]
 *
 * Follows 6A's `thermalStrain(alpha, deltaT)` precedent: `ΔT` is a
 * plain caller-supplied number, not an absolute-temperature pair — this
 * formula only needs the difference, and `ΔT` may legitimately be
 * negative (cooling). Deliberately does NOT call `validateConditions()`
 * (which enforces an absolute `temperatureK > 0`, the wrong check here).
 * No sign constraint is imposed on the computed `ρ`: this is the
 * caller-supplied linear approximation applied as given, not a claim
 * about where that approximation remains physically valid (Phase 8A
 * audit).
 */
export function resistivityAtTemperature(
  referenceResistivityOhmM: number,
  temperatureCoefficientPerK: number,
  deltaTemperatureK: number,
): number {
  if (!Number.isFinite(referenceResistivityOhmM)) {
    throw new EngineError(
      "INVALID_INPUT",
      `resistivityAtTemperature() requires a finite referenceResistivityOhmM, got ${referenceResistivityOhmM}.`,
    );
  }
  if (!Number.isFinite(temperatureCoefficientPerK)) {
    throw new EngineError(
      "INVALID_INPUT",
      `resistivityAtTemperature() requires a finite temperatureCoefficientPerK, got ${temperatureCoefficientPerK}.`,
    );
  }
  if (!Number.isFinite(deltaTemperatureK)) {
    throw new EngineError("INVALID_INPUT", `resistivityAtTemperature() requires a finite deltaTemperatureK, got ${deltaTemperatureK}.`);
  }

  return referenceResistivityOhmM * (1 + temperatureCoefficientPerK * deltaTemperatureK);
}
