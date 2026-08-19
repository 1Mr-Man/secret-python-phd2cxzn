import type { ParameterSource } from "../core/ParameterSource.js";
import type { UnitSymbol } from "../core/Units.js";

export type { ParameterSource, ParameterSourceKind } from "../core/ParameterSource.js";

/** One sourced numeric value, e.g. W = -21500 J/mol for Au-Cu under the Quasi-Chemical model. */
export interface ParameterValue {
  key: string;
  value: number;
  unit: UnitSymbol;
  source: ParameterSource;
}

/**
 * A complete parameter set for one (model, system) pair — the shape
 * Phase 2A establishes so a future dataset can plug in without redesigning
 * anything. `temperatureRangeK` is optional because not every parameter is
 * temperature-dependent, but the type exists now so a model that does need
 * it (e.g. a future temperature-dependent interaction parameter) doesn't
 * require a breaking change later.
 */
export interface ParameterSet {
  modelId: string;
  /** e.g. "Au-Cu" — see core/Material.ts's systemLabel(). */
  system: string;
  temperatureRangeK?: [number, number];
  parameters: ParameterValue[];
}
