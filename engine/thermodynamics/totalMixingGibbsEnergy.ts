import { EngineError } from "../core/Errors.js";

/**
 * Total molar Gibbs energy of mixing:
 *
 *   ΔG_mix = ΔG_mix^ideal + G^E                        [J/mol]
 *
 * A pure scalar combinator — it does NOT call `idealMixingGibbsEnergy()`
 * (`idealMixingGibbsEnergy.ts`, 5C) internally, and does not derive `G^E`
 * from any model. Both terms are supplied by the caller, already
 * computed by whatever produced them (5C for the ideal term; e.g. MIVM's
 * own `GmE` output for the excess term — no other current model exposes
 * `G^E`). This keeps `ΔG_mix` and `G^E` scientifically distinct, as two
 * independently-produced values composed here, rather than this function
 * silently taking on composition/temperature validation that belongs to
 * whatever computed `ΔG_mix^ideal` in the first place.
 *
 * Validates only that both inputs are finite — no sign constraint on
 * either argument: `ΔG_mix^ideal` is provably `<= 0` (proven by 5C's own
 * tests, not re-enforced here), and `G^E` has no required sign at all in
 * real systems (positive or negative excess Gibbs energy are both
 * physically normal), so the total can legitimately be either sign too.
 */
export function totalMixingGibbsEnergy(idealGibbsEnergy: number, excessGibbsEnergy: number): number {
  if (!Number.isFinite(idealGibbsEnergy)) {
    throw new EngineError("INVALID_INPUT", `totalMixingGibbsEnergy() requires a finite idealGibbsEnergy, got ${idealGibbsEnergy}.`);
  }
  if (!Number.isFinite(excessGibbsEnergy)) {
    throw new EngineError("INVALID_INPUT", `totalMixingGibbsEnergy() requires a finite excessGibbsEnergy, got ${excessGibbsEnergy}.`);
  }

  return idealGibbsEnergy + excessGibbsEnergy;
}
