import { canonicalizeSystemLabel } from "../core/SystemIdentity.js";
import { EngineError } from "../core/Errors.js";
import type { Composition } from "../core/Material.js";

/**
 * A regular-solution-style pairwise interaction matrix — `Ω_ij`, the
 * coefficient of `x_i x_j` in `ΔH_mix = Σ_{i<j} Ω_ij x_i x_j` (see
 * `mixingEnthalpy.ts`). Explicitly the SAME quantity/unit as Regular
 * Solution's own `W` (`engine/models/thermodynamics/regular/metadata.ts`:
 * "coefficient of x(1-x) in ... G_M = G_M^ideal + W x(1-x)") generalized
 * to N components — never Quasi-Chemical's `W` (a different functional
 * form, `η² = exp(2W/(ZRT))`, only equal to this in the Z→∞ limit) or
 * MIVM's `B_ij`/`B_ji` (deliberately asymmetric, a different
 * parameterization entirely). Always call this "regular-solution-style
 * pairwise interaction energy," never a bare "interaction parameter" —
 * see the Phase 5D audit.
 *
 * Represented as a pair-list, not an NxN matrix, so `Ω_AB ≠ Ω_BA` can
 * never even be constructed — symmetry is structural, not a runtime
 * check that could be bypassed.
 */
export interface InteractionMatrixEntry {
  /** Element symbol, e.g. "Fe". */
  i: string;
  /** Element symbol, e.g. "Ni". */
  j: string;
  /** Same unit as Regular Solution's W. */
  omegaJPerMol: number;
}

export interface InteractionMatrix {
  pairs: InteractionMatrixEntry[];
}

/** Standard periodic-table symbol shape: one uppercase letter, optionally followed by one lowercase letter (e.g. "Fe", "U", "Au") — matches every symbol actually seeded in engine/data/elements.ts. */
const ELEMENT_SYMBOL_SYNTAX = /^[A-Z][a-z]?$/;

/**
 * The canonical, order-independent key for an unordered pair — reuses
 * `canonicalizeSystemLabel` (`engine/core/SystemIdentity.ts`) directly
 * rather than reimplementing pair canonicalization: that function already
 * alphabetically sorts hyphen-joined symbols, which is exactly what a
 * two-symbol pair key needs. `canonicalPairKey("Ni","Fe")` and
 * `canonicalPairKey("Fe","Ni")` are guaranteed equal.
 */
export function canonicalPairKey(i: string, j: string): string {
  return canonicalizeSystemLabel(`${i}-${j}`);
}

/**
 * Matrix-level validation only — everything checkable without reference
 * to any particular composition: finite `Ω`, no self-pairs, no duplicate
 * canonical pairs, valid element-symbol syntax. Does NOT check whether a
 * pair's symbols belong to some composition, or whether every required
 * pair is present — see `validateInteractionMatrixForComposition` for
 * that (composition-dependent, deliberately kept separate so an
 * `InteractionMatrix` is never treated as permanently tied to one
 * composition).
 */
export function validateInteractionMatrixStructure(matrix: InteractionMatrix): void {
  const seenCanonicalKeys = new Set<string>();

  for (const entry of matrix.pairs) {
    if (!ELEMENT_SYMBOL_SYNTAX.test(entry.i) || !ELEMENT_SYMBOL_SYNTAX.test(entry.j)) {
      throw new EngineError(
        "INVALID_INPUT",
        `InteractionMatrix entry has invalid element-symbol syntax: "${entry.i}"-"${entry.j}".`,
      );
    }

    if (entry.i === entry.j) {
      throw new EngineError(
        "INVALID_INPUT",
        `InteractionMatrix cannot contain a self-interaction pair: "${entry.i}"-"${entry.j}".`,
      );
    }

    if (!Number.isFinite(entry.omegaJPerMol)) {
      throw new EngineError(
        "INVALID_INPUT",
        `InteractionMatrix pair "${entry.i}-${entry.j}" has a non-finite omegaJPerMol: ${entry.omegaJPerMol}.`,
      );
    }

    const key = canonicalPairKey(entry.i, entry.j);
    if (seenCanonicalKeys.has(key)) {
      throw new EngineError(
        "INVALID_INPUT",
        `InteractionMatrix has a duplicate pair (canonical key "${key}"): "${entry.i}-${entry.j}".`,
      );
    }
    seenCanonicalKeys.add(key);
  }
}

/**
 * Composition-dependent validation: every pair must name symbols that are
 * actually present in `composition` (regardless of their fraction — a
 * zero-fraction component is still a real component of the composition),
 * and every pair where BOTH components have a strictly positive mole
 * fraction must have an explicit entry. A missing interaction is never
 * defaulted to zero — see the Phase 5D audit's §8 decision — so an
 * incomplete matrix throws rather than silently treating the absent pair
 * as non-interacting.
 *
 * A pair between two components where either has `fraction === 0` is
 * exempt from the "required" check (its `Ω·x_i·x_j` term is exactly zero
 * regardless of `Ω`, so no real datum is being silently assumed) — this
 * also means a caller building a composition-row UI with a placeholder
 * zero-fraction element (e.g. `app/workbench/materialForm.ts`'s default
 * new-row fraction) is never forced to supply a meaningless value.
 *
 * Assumes `validateInteractionMatrixStructure` has already passed —
 * callers (see `mixingEnthalpy.ts`) run both, in that order.
 */
export function validateInteractionMatrixForComposition(matrix: InteractionMatrix, composition: Composition): void {
  const symbolsInComposition = new Set(composition.components.map((component) => component.element.symbol));

  for (const entry of matrix.pairs) {
    if (!symbolsInComposition.has(entry.i) || !symbolsInComposition.has(entry.j)) {
      throw new EngineError(
        "INVALID_INPUT",
        `InteractionMatrix pair "${entry.i}-${entry.j}" references an element not present in the given composition.`,
      );
    }
  }

  const lookup = buildInteractionLookup(matrix);
  const present = composition.components.filter((component) => component.fraction > 0);

  for (let a = 0; a < present.length; a++) {
    for (let b = a + 1; b < present.length; b++) {
      const symbolA = present[a]!.element.symbol;
      const symbolB = present[b]!.element.symbol;
      const key = canonicalPairKey(symbolA, symbolB);
      if (!lookup.has(key)) {
        throw new EngineError(
          "INVALID_INPUT",
          `InteractionMatrix is missing a required pair interaction for "${symbolA}-${symbolB}" ` +
            "(both have a positive mole fraction in this composition) — a missing interaction is never treated as zero.",
        );
      }
    }
  }
}

/** Builds the canonical-pair-key -> Ω lookup. Assumes `validateInteractionMatrixStructure` has already passed (no duplicate keys). */
export function buildInteractionLookup(matrix: InteractionMatrix): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const entry of matrix.pairs) {
    lookup.set(canonicalPairKey(entry.i, entry.j), entry.omegaJPerMol);
  }
  return lookup;
}
