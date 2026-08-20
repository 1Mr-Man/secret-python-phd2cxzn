/**
 * Units are carried as plain string labels on `PhysicalQuantity` itself —
 * every model is responsible for stating the unit its inputs/outputs are
 * already in; nothing here auto-converts. Real runtime conversion between
 * compatible units now exists, in `UnitConversion.ts` (`convert()` /
 * `convertQuantity()`) — a separate, opt-in module so this file's shape
 * (and every existing model's unit strings) never had to change to get it.
 */

/** Known unit symbols used by models shipped so far, plus an open extension point. */
export const KNOWN_UNITS = {
  KELVIN: "K",
  PASCAL: "Pa",
  JOULE_PER_MOLE: "J/mol",
  TESLA: "T",
  VOLT_PER_METER: "V/m",
  DIMENSIONLESS: "dimensionless",
  MOLE_FRACTION: "mole_fraction",
} as const;

/**
 * `(string & {})` keeps autocomplete for the known symbols above while still
 * accepting any string, so a new model can introduce a unit (e.g. "Ohm·m")
 * without editing this file.
 */
export type UnitSymbol = (typeof KNOWN_UNITS)[keyof typeof KNOWN_UNITS] | (string & {});

export interface PhysicalQuantity {
  readonly value: number;
  readonly unit: UnitSymbol;
}

export function quantity(value: number, unit: UnitSymbol): PhysicalQuantity {
  return { value, unit };
}
