import { EngineError } from "../core/Errors.js";

/**
 * Linear (engineering) strain:
 *
 *   ε = (L - L₀) / L₀                                    [dimensionless]
 *
 * L₀ is the reference (undeformed) length; L is the current (deformed)
 * length. Positive ε is elongation, negative ε is compression.
 */
export function linearStrain(length: number, referenceLength: number): number {
  if (!Number.isFinite(length)) {
    throw new EngineError("INVALID_INPUT", `linearStrain() requires a finite length, got ${length}.`);
  }
  if (!Number.isFinite(referenceLength)) {
    throw new EngineError("INVALID_INPUT", `linearStrain() requires a finite referenceLength, got ${referenceLength}.`);
  }
  if (referenceLength <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `linearStrain() requires a strictly positive referenceLength (a physical length cannot be zero or negative), got ${referenceLength}.`,
    );
  }

  return (length - referenceLength) / referenceLength;
}
