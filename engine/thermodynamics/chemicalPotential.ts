import { PhysicalConstants } from "../core/Constants.js";
import { validateConditions } from "../core/Conditions.js";
import { EngineError } from "../core/Errors.js";

/**
 * Relative chemical potential of mixing — relative to the pure-component
 * reference state (Δμ_i = μ_i - μ_i°), NEVER absolute μ_i:
 *
 *   Δμ_i = RT ln(a_i)                                  [J/mol]
 *
 * Absolute μ_i requires μ_i° (the chemical potential of pure component i
 * at the same T), and no absolute reference-state Gibbs-energy data
 * exists anywhere in this repository — that remains explicitly out of
 * scope (Phase 5 audit §B.4).
 *
 * Deliberately takes an already-computed `activity` (not `γ`/`x`) and
 * never calls `activity.ts`'s `activity()` internally — this keeps the
 * composition explicit at the call site (`relativeChemicalPotential(
 * activity(gammaI, xi), T)`) rather than this function silently owning a
 * dependency on how activity was derived (Phase 5E audit §4).
 *
 * Domain boundary, decided explicitly rather than left to fall out of
 * `Math.log`: `ln(0⁺) → -∞` is the physically real limit as a component
 * becomes infinitely dilute, but this function never returns a signed
 * infinity — it throws `SCIENTIFIC_DOMAIN_ERROR` for `activity <= 0`
 * instead, matching this project's own established convention
 * (`engine/models/thermodynamics/regular/model.ts`'s spinodal check does
 * the same: throws rather than returning "a negative or infinite value").
 * `activity` non-finite (NaN/±Infinity) is a different failure mode — a
 * malformed argument, not a real domain boundary — and is rejected as
 * `INVALID_INPUT` before the domain check ever runs. `activity > 1`
 * (positive deviation from ideality) is completely valid.
 */
export function relativeChemicalPotential(activity: number, temperatureK: number): number {
  if (!Number.isFinite(activity)) {
    throw new EngineError("INVALID_INPUT", `relativeChemicalPotential() requires a finite activity, got ${activity}.`);
  }

  if (activity <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `relativeChemicalPotential() is undefined at activity=${activity}: ln(a_i) requires a strictly positive activity. ` +
        "The physical limit as a_i -> 0+ is -Infinity (a real divergence, not a value this function returns).",
    );
  }

  const conditionsValidation = validateConditions({ temperatureK }, ["temperatureK"]);
  if (!conditionsValidation.valid) {
    const firstIssue = conditionsValidation.issues[0]!;
    throw new EngineError(firstIssue.code, firstIssue.message, { issues: conditionsValidation.issues });
  }

  const { GAS_CONSTANT_R: R } = PhysicalConstants;
  return R * temperatureK * Math.log(activity);
}
