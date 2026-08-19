import type { ParameterSource } from "../core/ParameterSource.js";
import type { UnitSymbol } from "../core/Units.js";
import type { CompatibilityAssessment, DerivationRecord, VerificationRecord } from "./compatibility.js";

export type { ParameterSource, ParameterSourceKind } from "../core/ParameterSource.js";
export type {
  CompatibilityAssessment,
  DerivationRecord,
  SourceLocation,
  SourceLocationType,
  VerificationMethod,
  VerificationRecord,
} from "./compatibility.js";

/**
 * Where a `ParameterValue` stands scientifically. This answers ONE
 * question — "has this specific number been checked, and how" — and
 * nothing else. Whether the source it came from is even the right SHAPE
 * for the target model is a separate question (see `CompatibilityAssessment`
 * on `ParameterSet`, below); whether the engine could resolve an
 * applicable value for a given query is a third, still separate question
 * (`ParameterResolutionStatus` in resolve.ts). Keeping these three apart
 * is deliberate — see compatibility.ts's file-level comment.
 *
 * - "verified_direct": the exact value was read directly from the cited
 *   source (see `verification`) — the strongest status.
 * - "verified_derived": the value was computed via a documented, reviewable
 *   transformation from directly-verified inputs (see `derivation`, which
 *   is required whenever this status is used).
 * - "provisional": a numeric value exists but hasn't been independently
 *   checked. Usable, but the resolver flags it rather than treating it as
 *   equivalent to either "verified_*" status.
 * - "unavailable": no numeric value at all — a placeholder documenting that
 *   this parameter is *known to be needed* for a (model, system) pair but
 *   has not been sourced. `value` MUST be omitted when status is
 *   "unavailable"; this is how the architecture represents "we don't have
 *   this" without ever inventing a number to fill the gap.
 */
export type ParameterStatus = "verified_direct" | "verified_derived" | "provisional" | "unavailable";

/** One sourced numeric value, e.g. W = -21500 J/mol for Au-Cu under the Quasi-Chemical model. */
export interface ParameterValue {
  key: string;
  /** Human-readable name, e.g. "Interchange energy" — optional since ModelParameterSpec often already names it. */
  name?: string;
  /**
   * The number itself. Required unless `status` is "unavailable", in
   * which case it MUST be omitted — a placeholder record for a
   * known-but-unsourced parameter never carries a fabricated value.
   */
  value?: number;
  unit: UnitSymbol;
  source: ParameterSource;
  status: ParameterStatus;
  /** Numeric uncertainty (same unit as `value`) or a qualitative description — omit entirely rather than guess. */
  uncertainty?: { value: number; unit: UnitSymbol } | { description: string };
  /** Required by validateParameterValue when status is "verified_derived". */
  derivation?: DerivationRecord;
  /** How this project came to trust the value — required by validateParameterValue for both "verified_*" statuses. */
  verification?: VerificationRecord;
  /**
   * Rare, optional override of the set's authoritative `compatibility`
   * (below) for this one parameter. May only be equally or MORE
   * restrictive than the set's classification — validateParameterSet
   * rejects an override that claims to be MORE permissive than its set,
   * since that would let an incompatible source's value in through a side
   * door. Leave unset in the normal case; the set-level field is what
   * everything else (including the resolver) actually reads.
   */
  compatibility?: CompatibilityAssessment;
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
  /**
   * AUTHORITATIVE: can this source's parameterization be used by
   * `modelId` at all, without changing its scientific meaning? Optional —
   * `undefined` means "not yet assessed," which is honestly different
   * from actively asserting compatibility either way (see the Su & Wang
   * Au-Cu record, which leaves this unset on purpose). When set to
   * `"requires_explicit_transformation"` or `"not_compatible"`,
   * validateParameterSet requires every parameter in this set to have
   * `status: "unavailable"` — a blocked or incompatible source can never
   * contain a directly usable value.
   */
  compatibility?: CompatibilityAssessment;
  parameters: ParameterValue[];
}
