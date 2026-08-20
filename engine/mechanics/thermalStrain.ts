import { EngineError } from "../core/Errors.js";

/**
 * Thermal strain:
 *
 *   ε_thermal = α · ΔT                                   [dimensionless]
 *
 * α is the linear thermal expansion coefficient (1/K) and ΔT is the
 * temperature change (K). Both are plain numeric inputs, not sourced from
 * `Conditions` or any `Element` parameter group — no thermal-expansion
 * coefficient exists anywhere in this repo's data yet (Phase 6 audit).
 * Deliberately does NOT reuse `validateConditions()`: that helper
 * enforces `temperatureK > 0` (an absolute temperature), but ΔT must be
 * allowed to be negative (cooling), so it would be the wrong validator
 * here.
 */
export function thermalStrain(thermalExpansionCoefficientPerK: number, deltaTemperatureK: number): number {
  if (!Number.isFinite(thermalExpansionCoefficientPerK)) {
    throw new EngineError(
      "INVALID_INPUT",
      `thermalStrain() requires a finite thermalExpansionCoefficientPerK, got ${thermalExpansionCoefficientPerK}.`,
    );
  }
  if (!Number.isFinite(deltaTemperatureK)) {
    throw new EngineError("INVALID_INPUT", `thermalStrain() requires a finite deltaTemperatureK, got ${deltaTemperatureK}.`);
  }

  return thermalExpansionCoefficientPerK * deltaTemperatureK;
}
