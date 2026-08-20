import { EngineError } from "../core/Errors.js";

/**
 * Linear magnetic response:
 *
 *   M = χ * H                                            [A/m]
 *
 * `χ` is the dimensionless SI volume susceptibility (same convention as
 * `curieWeissSusceptibility.ts`); `H` is field strength in A/m. `χ` can
 * be negative (diamagnetic) or positive (paramagnetic/ferromagnetic) —
 * neither is domain-restricted. No internal call to
 * `curieWeissSusceptibility()` or `magneticFluxDensity()` — these are
 * independent utilities the caller composes (Phase 7A audit).
 */
export function linearMagnetization(susceptibility: number, fieldStrengthAPerM: number): number {
  if (!Number.isFinite(susceptibility)) {
    throw new EngineError("INVALID_INPUT", `linearMagnetization() requires a finite susceptibility, got ${susceptibility}.`);
  }
  if (!Number.isFinite(fieldStrengthAPerM)) {
    throw new EngineError("INVALID_INPUT", `linearMagnetization() requires a finite fieldStrengthAPerM, got ${fieldStrengthAPerM}.`);
  }

  return susceptibility * fieldStrengthAPerM;
}
