import { validateConditions } from "../core/Conditions.js";
import { EngineError } from "../core/Errors.js";

/**
 * Curie-Weiss law, paramagnetic-regime susceptibility:
 *
 *   χ = C / (T - θ)                                     [dimensionless]
 *
 * `χ` is the dimensionless SI **volume** susceptibility (matching
 * `linearMagnetization.ts`'s `M = χH`, which also expects a dimensionless
 * volume χ) — never molar susceptibility, and never silently mixed with
 * it. Under that convention the Curie constant `C` has units of kelvin.
 * Both `C` and `θ` (the Weiss constant) are plain caller-supplied
 * numbers — this function does not source them from any `Element` field
 * or fit them from data (Phase 7A audit).
 *
 * This is explicitly the PARAMAGNETIC-regime form only, requiring
 * `T > θ` strictly. `T = θ` is the mathematical singularity (χ→∞); `T <
 * θ` is mathematically defined but physically inappropriate here — below
 * θ the material has already magnetically ordered and this simple form
 * no longer describes it. Both `T <= θ` cases throw
 * `SCIENTIFIC_DOMAIN_ERROR`, never a signed infinity or a value from the
 * wrong physical regime.
 *
 * Reuses `validateConditions()` for the base temperature check
 * (finite, `> 0`); the `T > θ` domain check is specific to this formula
 * and is layered on top.
 */
export function curieWeissSusceptibility(curieConstantK: number, temperatureK: number, weissConstantK: number): number {
  if (!Number.isFinite(curieConstantK)) {
    throw new EngineError("INVALID_INPUT", `curieWeissSusceptibility() requires a finite curieConstantK, got ${curieConstantK}.`);
  }
  if (!Number.isFinite(weissConstantK)) {
    throw new EngineError("INVALID_INPUT", `curieWeissSusceptibility() requires a finite weissConstantK, got ${weissConstantK}.`);
  }

  const conditionsValidation = validateConditions({ temperatureK }, ["temperatureK"]);
  if (!conditionsValidation.valid) {
    const firstIssue = conditionsValidation.issues[0]!;
    throw new EngineError(firstIssue.code, firstIssue.message, { issues: conditionsValidation.issues });
  }

  if (temperatureK <= weissConstantK) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `curieWeissSusceptibility() requires T > θ (paramagnetic regime only): got temperatureK=${temperatureK}, weissConstantK=${weissConstantK}.`,
    );
  }

  return curieConstantK / (temperatureK - weissConstantK);
}
