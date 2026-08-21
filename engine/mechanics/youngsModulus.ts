import { EngineError } from "../core/Errors.js";

/**
 * Young's modulus, from the uniaxial linear-elastic regime only:
 *
 *   E = σ / ε                                            [Pa]
 *
 * This is the inverse relation of `elasticStress()`'s σ = E·ε, valid in
 * exactly the same uniaxial, linear-elastic regime — not a general
 * definition applicable outside it. Does NOT call `elasticStress()`
 * internally; the two compose at the call site.
 */
export function youngsModulus(stressPa: number, strain: number): number {
  if (!Number.isFinite(stressPa)) {
    throw new EngineError("INVALID_INPUT", `youngsModulus() requires a finite stressPa, got ${stressPa}.`);
  }
  if (!Number.isFinite(strain)) {
    throw new EngineError("INVALID_INPUT", `youngsModulus() requires a finite strain, got ${strain}.`);
  }
  if (strain === 0) {
    throw new EngineError("SCIENTIFIC_DOMAIN_ERROR", "youngsModulus() is undefined at strain=0 (division by zero).");
  }

  return stressPa / strain;
}
