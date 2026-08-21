import { EngineError } from "../core/Errors.js";

/**
 * Ideal work of cohesion for a homogeneous solid:
 *
 *   W_c = 2γ                                             [J/m²]
 *
 * `γ` (surface free energy — locked as the meaning of
 * `Element.surface.surfaceEnergyJPerM2`, a plain caller-supplied number
 * here, not looked up internally) is the energy per unit area to create
 * one new surface. Reversibly cleaving a homogeneous material creates
 * two new free surfaces, hence `W_c = 2γ`.
 *
 * `W_c` is the IDEAL reversible cleavage work per unit area only — it is
 * NOT a measured fracture toughness, fracture energy, or practical
 * fracture energy. Real fracture energy typically includes substantial
 * additional dissipation (plasticity, crack-tip processes, etc.) beyond
 * this ideal surface-energy contribution (Phase 11 audit).
 *
 * `γ` is surface free energy, not surface stress — the two coincide only
 * for a liquid (Shuttleworth relation: surface stress = γ + dγ/dε for a
 * solid) — this function's `γ` is always the energy quantity.
 */
export function workOfCohesion(surfaceEnergyJPerM2: number): number {
  if (!Number.isFinite(surfaceEnergyJPerM2)) {
    throw new EngineError("INVALID_INPUT", `workOfCohesion() requires a finite surfaceEnergyJPerM2, got ${surfaceEnergyJPerM2}.`);
  }
  if (surfaceEnergyJPerM2 <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `workOfCohesion() requires a strictly positive surfaceEnergyJPerM2 (creating surface always costs energy), got ${surfaceEnergyJPerM2}.`,
    );
  }

  return 2 * surfaceEnergyJPerM2;
}
