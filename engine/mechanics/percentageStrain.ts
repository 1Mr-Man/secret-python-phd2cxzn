import { EngineError } from "../core/Errors.js";

/**
 * Linear strain expressed as a percentage:
 *
 *   ε% = ε × 100
 *
 * Takes an already-computed strain value (e.g. from `linearStrain()`) —
 * does NOT call `linearStrain()` internally, keeping the two composed at
 * the call site rather than this function silently owning how the strain
 * was derived (matches this project's established Phase 5 convention,
 * e.g. `totalMixingGibbsEnergy()`).
 */
export function percentageStrain(strain: number): number {
  if (!Number.isFinite(strain)) {
    throw new EngineError("INVALID_INPUT", `percentageStrain() requires a finite strain, got ${strain}.`);
  }

  return strain * 100;
}
