import { EngineError } from "./Errors.js";
import type { PhysicalQuantity, UnitSymbol } from "./Units.js";

/**
 * Real runtime unit conversion — the capability `Units.ts` explicitly
 * deferred ("Phase 1a does not implement unit conversion... A conversion
 * layer can be introduced later without changing this shape"). This file
 * is purely additive: no existing `quantity()` call site, model output
 * unit, or `CalculationPipeline` behavior changes because of it. It is a
 * registry-based converter sized to the units this project's models and
 * `Conditions` actually use today (`engine/README.md`'s own unit survey:
 * "dimensionless", "J/mol", "m3/mol", plus K/Pa/T/V-per-m on the
 * Conditions side) plus the handful of near-term units the roadmap's next
 * domains (strain/mechanics, magnetism, electrical) will need — not a
 * general-purpose unit framework.
 *
 * Two deliberate scientific-correctness decisions, not oversights:
 *
 * 1. Energy (J, kJ) and molar energy (J/mol, kJ/mol) are two separate
 *    families, never mutually convertible here — they differ by a factor
 *    of "per mole of substance", which this layer has no way to know.
 *    Same reasoning for volume (m3, cm3) vs molar volume (m3/mol,
 *    cm3/mol) — the latter is what MIVM's V_mi/V_mj actually use.
 * 2. Magnetic flux density (T) and magnetic field strength (A/m) are two
 *    separate families, never mutually convertible here — relating them
 *    requires a material's permeability (B = μH), which is not a unit
 *    fact, it's a property of the specific material being modeled.
 */

export type UnitFamily =
  | "length"
  | "pressure"
  | "energy"
  | "molarEnergy"
  | "temperature"
  | "volume"
  | "molarVolume"
  | "density"
  | "electricalResistivity"
  | "electricalConductivity"
  | "magneticFluxDensity"
  | "magneticFieldStrength";

interface LinearUnitDef {
  family: UnitFamily;
  /** Multiply a value in this unit by this factor to get the family's SI base unit. */
  toBaseFactor: number;
}

/** Every linearly-convertible unit this layer knows, keyed by its exact UnitSymbol string. Temperature is handled separately below (affine, not linear). */
const UNIT_REGISTRY: Record<string, LinearUnitDef> = {
  // length — base: m
  m: { family: "length", toBaseFactor: 1 },
  mm: { family: "length", toBaseFactor: 1e-3 },
  "µm": { family: "length", toBaseFactor: 1e-6 },
  nm: { family: "length", toBaseFactor: 1e-9 },

  // pressure — base: Pa
  Pa: { family: "pressure", toBaseFactor: 1 },
  kPa: { family: "pressure", toBaseFactor: 1e3 },
  MPa: { family: "pressure", toBaseFactor: 1e6 },
  GPa: { family: "pressure", toBaseFactor: 1e9 },

  // energy — base: J
  J: { family: "energy", toBaseFactor: 1 },
  kJ: { family: "energy", toBaseFactor: 1e3 },

  // molar energy — base: J/mol (what Regular Solution's W, Quasi-Chemical's W, and MIVM's GmE actually use)
  "J/mol": { family: "molarEnergy", toBaseFactor: 1 },
  "kJ/mol": { family: "molarEnergy", toBaseFactor: 1e3 },

  // volume — base: m3
  m3: { family: "volume", toBaseFactor: 1 },
  cm3: { family: "volume", toBaseFactor: 1e-6 },

  // molar volume — base: m3/mol (what MIVM's V_mi/V_mj actually use)
  "m3/mol": { family: "molarVolume", toBaseFactor: 1 },
  "cm3/mol": { family: "molarVolume", toBaseFactor: 1e-6 },

  // density — base: kg/m3
  "kg/m3": { family: "density", toBaseFactor: 1 },
  "g/cm3": { family: "density", toBaseFactor: 1e3 },

  // electrical resistivity — base: Ω·m
  "Ω·m": { family: "electricalResistivity", toBaseFactor: 1 },

  // electrical conductivity — base: S/m
  "S/m": { family: "electricalConductivity", toBaseFactor: 1 },

  // magnetic flux density — base: T (single-member family today; mT/G can be added later without touching callers)
  T: { family: "magneticFluxDensity", toBaseFactor: 1 },

  // magnetic field strength — base: A/m
  "A/m": { family: "magneticFieldStrength", toBaseFactor: 1 },
};

const TEMPERATURE_UNITS = new Set(["K", "°C", "C"]);

function normalizeTemperatureUnit(unit: string): "K" | "°C" {
  return unit === "K" ? "K" : "°C";
}

function convertTemperature(value: number, from: string, to: string): number {
  const kelvin = normalizeTemperatureUnit(from) === "K" ? value : value + 273.15;
  return normalizeTemperatureUnit(to) === "K" ? kelvin : kelvin - 273.15;
}

/**
 * Converts `value` from one unit to another. Throws `EngineError`
 * ("INVALID_INPUT") for a unit this registry doesn't know, or for a
 * cross-family conversion (e.g. Pa -> K) — it never silently guesses.
 */
export function convert(value: number, from: UnitSymbol, to: UnitSymbol): number {
  if (from === to) return value;

  const fromIsTemperature = TEMPERATURE_UNITS.has(from);
  const toIsTemperature = TEMPERATURE_UNITS.has(to);
  if (fromIsTemperature || toIsTemperature) {
    if (!fromIsTemperature || !toIsTemperature) {
      throw new EngineError("INVALID_INPUT", `Cannot convert between a temperature unit and a non-temperature unit: "${from}" -> "${to}".`);
    }
    return convertTemperature(value, from, to);
  }

  const fromDef = UNIT_REGISTRY[from];
  const toDef = UNIT_REGISTRY[to];
  if (!fromDef) throw new EngineError("INVALID_INPUT", `Unknown unit "${from}" — not in the unit-conversion registry.`);
  if (!toDef) throw new EngineError("INVALID_INPUT", `Unknown unit "${to}" — not in the unit-conversion registry.`);
  if (fromDef.family !== toDef.family) {
    throw new EngineError(
      "INVALID_INPUT",
      `Cannot convert "${from}" (${fromDef.family}) to "${to}" (${toDef.family}) — different physical quantities.`,
    );
  }

  return (value * fromDef.toBaseFactor) / toDef.toBaseFactor;
}

/** Convenience wrapper: converts a PhysicalQuantity to a new unit, returning a new PhysicalQuantity. */
export function convertQuantity(quantity: PhysicalQuantity, to: UnitSymbol): PhysicalQuantity {
  return { value: convert(quantity.value, quantity.unit, to), unit: to };
}
