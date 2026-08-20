import { PhysicalConstants } from "../core/Constants.js";
import { EngineError } from "../core/Errors.js";

/**
 * Magnetic flux density from field strength and magnetization:
 *
 *   B = μ0 * (H + M)                                    [T]
 *
 * `H` and `M` are both in A/m; `B` is in T. `H` is the applied magnetic
 * field strength — distinct from `Conditions.magneticFieldTeslas`, which
 * is locked as B itself (flux density), not H (Phase 7A audit). `M` can
 * be negative (diamagnetic response) or positive (para-/ferromagnetic);
 * neither is domain-restricted here. No internal call to
 * `linearMagnetization()` or `curieWeissSusceptibility()` — these are
 * independent utilities the caller composes.
 */
export function magneticFluxDensity(fieldStrengthAPerM: number, magnetizationAPerM: number): number {
  if (!Number.isFinite(fieldStrengthAPerM)) {
    throw new EngineError("INVALID_INPUT", `magneticFluxDensity() requires a finite fieldStrengthAPerM, got ${fieldStrengthAPerM}.`);
  }
  if (!Number.isFinite(magnetizationAPerM)) {
    throw new EngineError("INVALID_INPUT", `magneticFluxDensity() requires a finite magnetizationAPerM, got ${magnetizationAPerM}.`);
  }

  return PhysicalConstants.VACUUM_PERMEABILITY_MU0 * (fieldStrengthAPerM + magnetizationAPerM);
}
