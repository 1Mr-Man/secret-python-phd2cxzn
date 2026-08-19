/**
 * A chemical element, typed to eventually hold the full range of
 * materials-science parameters models across every planned property domain
 * will need (magnetic, electrical, optical, structural, thermal, surface).
 *
 * Phase 1a intentionally leaves every domain-parameter group optional and
 * unpopulated except the identity fields required to name an element at
 * all (symbol, name, atomic number). No parameter values are invented here
 * — see engine/data/elements.ts for what is actually seeded and why.
 */

export interface ElectronicParameters {
  electronConfiguration?: string;
  valenceElectronCount?: number;
}

export interface MagneticParameters {
  curieTemperatureK?: number;
  neelTemperatureK?: number;
  saturationMagnetizationTeslas?: number;
  magneticMomentBohrMagnetons?: number;
}

export interface ElectricalParameters {
  electricalResistivityOhmM?: number;
  electricalConductivitySPerM?: number;
}

export interface OpticalParameters {
  refractiveIndex?: number;
  opticalBandGapEv?: number;
}

export interface StructuralParameters {
  crystalStructure?: string;
  latticeConstantAngstrom?: number;
}

export interface ThermalParameters {
  meltingPointK?: number;
  boilingPointK?: number;
  thermalConductivityWPerMK?: number;
  specificHeatJPerKgK?: number;
}

export interface SurfaceParameters {
  surfaceEnergyJPerM2?: number;
}

export interface Element {
  /** e.g. "Au" */
  symbol: string;
  /** e.g. "Gold" */
  name: string;
  atomicNumber: number;
  atomicMassGPerMol?: number;

  electronic?: ElectronicParameters;
  magnetic?: MagneticParameters;
  electrical?: ElectricalParameters;
  optical?: OpticalParameters;
  structural?: StructuralParameters;
  thermal?: ThermalParameters;
  surface?: SurfaceParameters;

  /** Escape hatch for a model-specific constant that doesn't fit any group above. */
  otherConstants?: Record<string, number>;
}

export function createElement(
  symbol: string,
  name: string,
  atomicNumber: number,
  overrides: Partial<Omit<Element, "symbol" | "name" | "atomicNumber">> = {},
): Element {
  return { symbol, name, atomicNumber, ...overrides };
}
