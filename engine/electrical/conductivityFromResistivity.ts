import { EngineError } from "../core/Errors.js";

/**
 * Conductivity as the reciprocal of resistivity:
 *
 *   σ = 1 / ρ                                            [S/m]
 *
 * `ρ` is in Ω·m. Unlike magnetic B/H (related through a material's
 * permeability, not a pure numeric inverse), resistivity and
 * conductivity are true reciprocals of each other. Kept as its own
 * function rather than folded into `resistivityFromConductivity()` —
 * `Element.electrical` exposes both as independently optional fields,
 * and the two do not call each other internally (Phase 8A audit).
 * `resistivityOhmM = 0` (a hypothetical perfect conductor) is the
 * physical limit where conductivity diverges — this function throws
 * rather than returning a signed infinity.
 */
export function conductivityFromResistivity(resistivityOhmM: number): number {
  if (!Number.isFinite(resistivityOhmM)) {
    throw new EngineError("INVALID_INPUT", `conductivityFromResistivity() requires a finite resistivityOhmM, got ${resistivityOhmM}.`);
  }
  if (resistivityOhmM === 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", "conductivityFromResistivity() is undefined at resistivityOhmM=0 (division by zero).");
  }

  return 1 / resistivityOhmM;
}
