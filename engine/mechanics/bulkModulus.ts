import { EngineError } from "../core/Errors.js";

/**
 * Bulk modulus:
 *
 *   K = -ΔP / εV                                         [Pa]
 *
 * ΔP is the pressure change (Pa) and εV is volumetric strain
 * (dimensionless, e.g. from `volumetricStrain()`, composed at the call
 * site — not called internally here). The minus sign is the standard
 * convention: an increase in pressure (ΔP>0) produces a volume decrease
 * (εV<0), keeping K positive for a real material under compression. This
 * function does not enforce that sign relationship on its inputs — it
 * just applies the formula to whatever ΔP/εV the caller supplies.
 */
export function bulkModulus(deltaPressurePa: number, volumetricStrainValue: number): number {
  if (!Number.isFinite(deltaPressurePa)) {
    throw new EngineError("INVALID_INPUT", `bulkModulus() requires a finite deltaPressurePa, got ${deltaPressurePa}.`);
  }
  if (!Number.isFinite(volumetricStrainValue)) {
    throw new EngineError(
      "INVALID_INPUT",
      `bulkModulus() requires a finite volumetricStrainValue, got ${volumetricStrainValue}.`,
    );
  }
  if (volumetricStrainValue === 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", "bulkModulus() is undefined at volumetricStrainValue=0 (division by zero).");
  }

  return -deltaPressurePa / volumetricStrainValue;
}
