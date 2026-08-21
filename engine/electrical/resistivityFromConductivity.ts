import { EngineError } from "../core/Errors.js";

/**
 * Resistivity as the reciprocal of conductivity:
 *
 *   ρ = 1 / σ                                            [Ω·m]
 *
 * `σ` is in S/m. Kept independent of `conductivityFromResistivity()` —
 * the two do not call each other internally (Phase 8A audit).
 * `conductivitySPerM = 0` (a hypothetical perfect insulator) is the
 * physical limit where resistivity diverges — this function throws
 * rather than returning a signed infinity.
 */
export function resistivityFromConductivity(conductivitySPerM: number): number {
  if (!Number.isFinite(conductivitySPerM)) {
    throw new EngineError("INVALID_INPUT", `resistivityFromConductivity() requires a finite conductivitySPerM, got ${conductivitySPerM}.`);
  }
  if (conductivitySPerM === 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", "resistivityFromConductivity() is undefined at conductivitySPerM=0 (division by zero).");
  }

  return 1 / conductivitySPerM;
}
