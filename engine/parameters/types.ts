import type { ParameterSource } from "../core/ParameterSource.js";
import type { UnitSymbol } from "../core/Units.js";

export type { ParameterSource, ParameterSourceKind } from "../core/ParameterSource.js";

/**
 * Where a `ParameterValue` stands scientifically:
 * - "verified": a real numeric value with a checked source — safe to calculate with.
 * - "provisional": a numeric value exists but hasn't been independently checked
 *   (e.g. a single uncorroborated source, or an estimate with stated methodology).
 *   Usable, but the resolver flags it rather than treating it as equivalent to "verified".
 * - "unavailable": no numeric value at all — a placeholder documenting that this
 *   parameter is *known to be needed* for a (model, system) pair but has not
 *   been sourced. `value` MUST be omitted when status is "unavailable"; this is
 *   how the architecture represents "we don't have this" without ever inventing
 *   a number to fill the gap.
 */
export type ParameterStatus = "verified" | "provisional" | "unavailable";

/** One sourced numeric value, e.g. W = -21500 J/mol for Au-Cu under the Quasi-Chemical model. */
export interface ParameterValue {
  key: string;
  /** Human-readable name, e.g. "Interchange energy" — optional since ModelParameterSpec often already names it. */
  name?: string;
  /**
   * The number itself. Required when `status` is "verified" or
   * "provisional"; MUST be omitted when `status` is "unavailable" — a
   * placeholder record for a known-but-unsourced parameter never carries
   * a fabricated value.
   */
  value?: number;
  unit: UnitSymbol;
  source: ParameterSource;
  status: ParameterStatus;
  /** Numeric uncertainty (same unit as `value`) or a qualitative description — omit entirely rather than guess. */
  uncertainty?: { value: number; unit: UnitSymbol } | { description: string };
  notes?: string;
}

/**
 * A complete parameter set for one (model, system) pair, from one source.
 * Multiple `ParameterSet`s can exist for the same (modelId, system) — e.g.
 * two literature sources both reporting W for Au-Cu — which is exactly
 * what `setId` and the resolver's AMBIGUOUS status are for (see
 * engine/parameters/resolve.ts).
 */
export interface ParameterSet {
  /** Unique within this (modelId, system) pair — distinguishes competing sets from different sources. */
  setId: string;
  modelId: string;
  /** As given by whoever registered this set (not forced to canonical order) — see core/SystemIdentity.ts for why lookup still works regardless of order. */
  system: string;
  /** This set's numeric values are only asserted valid within this range, if stated. */
  validTemperatureRangeK?: [number, number];
  /** This set's numeric values are only asserted valid within this mole-fraction range (of the system's first/canonical component), if stated. */
  validCompositionRangeMoleFraction?: [number, number];
  parameters: ParameterValue[];
}
