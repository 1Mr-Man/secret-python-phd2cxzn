/**
 * Three concepts that must stay separate (Phase 2D):
 *
 *   PARAMETER STATUS   -> "What is the verification state of this parameter?"
 *   COMPATIBILITY      -> "Can this parameter set be used with this model?"
 *   RESOLUTION STATUS  -> "What happened when the engine attempted to resolve it?"
 *                          (ParameterResolutionStatus in resolve.ts — a
 *                          query-time computed outcome, never stored)
 *
 * This file holds the second concept plus the two structured records that
 * back the first (DerivationRecord, VerificationRecord) and the shared
 * SourceLocation type both of those can point into.
 */

/**
 * Whether a source's parameterization can be used by a specific model
 * without changing its scientific meaning. This is a question about
 * SHAPE/compatibility, independent of whether a specific number has been
 * checked — a set can be "directly_compatible" in form while every value
 * in it is still "unavailable" (nobody has confirmed a number yet), and a
 * set can never be "not_compatible" and contain a usable value.
 *
 * Authoritative at the ParameterSet level (see ParameterSet.compatibility
 * in types.ts) — a whole source parameterization is either the right
 * shape for a model or it isn't. `ParameterValue.compatibility` exists
 * only as a rare, optional override for the case where one parameter
 * within an otherwise-compatible set has its own problem; it can only
 * ever be equally or MORE restrictive than its set's classification
 * (enforced by validateParameterSet) — never a way to smuggle a usable
 * value into a set the engine has already classified as blocked.
 */
export type CompatibilityAssessment =
  | "directly_compatible"
  | "requires_explicit_transformation"
  | "not_compatible";

export type SourceLocationType = "table" | "equation" | "figure" | "page" | "section" | "other";

/**
 * Where inside a publication a value or derivation input was found —
 * structured so "Table 3, p. 112" is machine-readable, not just prose
 * inside a note. Every field but `type` is optional because not every
 * source states a precise location (nor does every location need all of
 * `identifier`/`page`/`description` — "Table 3" is `{type:"table",
 * identifier:"3"}`; "Table 3, p. 112" adds `page:112` to the same object;
 * "Section 4.2" is `{type:"section", identifier:"4.2"}`).
 */
export interface SourceLocation {
  type: SourceLocationType;
  identifier?: string;
  page?: number;
  description?: string;
}

/**
 * How a "verified_derived" value was computed, with enough information to
 * reconstruct the derivation later without re-deriving it from scratch.
 * Every field here is required by validateParameterValue when status is
 * "verified_derived" — this is what stops "verified_derived" from being a
 * convenient label for an undocumented calculation.
 */
export interface DerivationRecord {
  /** The transformation itself, e.g. "W_regular = L0 (Redlich-Kister truncation; L1, L2 assumed negligible)". */
  transformationEquation: string;
  /** Every assumption the transformation depends on, stated explicitly. */
  assumptions: string[];
  /** The directly-verified input value(s) this was computed from, keyed by name (e.g. { "L0": -12345 }). */
  sourceValues: Record<string, number>;
  derivedBy?: string;
  derivedAt?: string;
}

export type VerificationMethod = "direct_read" | "cross_checked" | "derived";

/**
 * How THIS project came to trust a value — distinct from `ParameterSource`,
 * which describes the publication itself. A `VerificationRecord` describes
 * this project's own act of checking it.
 */
export interface VerificationRecord {
  method: VerificationMethod;
  location?: SourceLocation;
  verifiedBy?: string;
  verifiedAt?: string;
}
