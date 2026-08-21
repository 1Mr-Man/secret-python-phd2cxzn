import { EngineError } from "../core/Errors.js";

/**
 * Shear modulus:
 *
 *   G = τ / γ                                            [Pa]
 *
 * τ is shear stress (Pa), γ is shear strain (dimensionless), in the
 * linear-elastic regime.
 */
export function shearModulus(shearStressPa: number, shearStrain: number): number {
  if (!Number.isFinite(shearStressPa)) {
    throw new EngineError("INVALID_INPUT", `shearModulus() requires a finite shearStressPa, got ${shearStressPa}.`);
  }
  if (!Number.isFinite(shearStrain)) {
    throw new EngineError("INVALID_INPUT", `shearModulus() requires a finite shearStrain, got ${shearStrain}.`);
  }
  if (shearStrain === 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", "shearModulus() is undefined at shearStrain=0 (division by zero).");
  }

  return shearStressPa / shearStrain;
}
