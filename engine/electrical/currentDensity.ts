import { EngineError } from "../core/Errors.js";

/**
 * Ohm's law, microscopic/field form:
 *
 *   J = σ * E                                            [A/m²]
 *
 * `σ` is conductivity (S/m), `E` is electric field strength (V/m) —
 * matches `Conditions.electricFieldVPerM`'s locked semantics (V/m
 * unambiguously identifies E, not the electric displacement field D).
 * The electrical counterpart of `linearMagnetization()`'s `M = χH`
 * (Phase 7A). No sign restriction: a negative `E` (field reversed) and
 * the resulting negative `J` are both physically legitimate.
 */
export function currentDensity(conductivitySPerM: number, electricFieldVPerM: number): number {
  if (!Number.isFinite(conductivitySPerM)) {
    throw new EngineError("INVALID_INPUT", `currentDensity() requires a finite conductivitySPerM, got ${conductivitySPerM}.`);
  }
  if (!Number.isFinite(electricFieldVPerM)) {
    throw new EngineError("INVALID_INPUT", `currentDensity() requires a finite electricFieldVPerM, got ${electricFieldVPerM}.`);
  }

  return conductivitySPerM * electricFieldVPerM;
}
