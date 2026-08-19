import type { Composition } from "./Material.js";
import { systemLabel } from "./Material.js";

/**
 * A material system's identity from two angles at once:
 *
 * - `orderedLabel`/`orderedSymbols`: exactly as the composition was built,
 *   e.g. "Cu-Au" if Cu was listed first. Some models are order-sensitive —
 *   Quasi-Chemical and Regular Solution both define x as
 *   `composition.components[0].fraction` (see Material.ts's
 *   `systemLabel()`) — so this ordering is never discarded.
 * - `canonicalId`: order-INDEPENDENT — "Au-Cu" and "Cu-Au" both produce
 *   the same canonicalId. This is what the parameter store keys its
 *   lookups by: a literature W value for "the Au-Cu system" is the same
 *   physical quantity no matter which element a caller happened to list
 *   first.
 */
export interface SystemIdentity {
  canonicalId: string;
  orderedSymbols: string[];
  orderedLabel: string;
}

/**
 * Canonicalization strategy: alphabetical sort of element symbols, joined
 * with "-". This is a genuine choice, not an unstated assumption — it is
 * the standard, defensible default for binary/ternary metallic systems
 * (it's how most materials databases label a system), but it is not
 * guaranteed to be every future model's notion of "canonical" (a
 * CALPHAD dataset, for instance, might key on a different convention).
 * Keeping this as one named, swappable function — rather than folding the
 * sort into `identifySystem` inline — is what lets a future domain
 * introduce a different canonicalization without touching this file's
 * callers.
 */
export function canonicalizeSystemLabel(label: string): string {
  return label
    .split("-")
    .sort((a, b) => a.localeCompare(b))
    .join("-");
}

/** Generalizes to any number of components — binary, ternary, or higher-order — with no redesign. */
export function identifySystem(composition: Composition): SystemIdentity {
  const orderedSymbols = composition.components.map((component) => component.element.symbol);
  const orderedLabel = systemLabel(composition);

  return {
    canonicalId: canonicalizeSystemLabel(orderedLabel),
    orderedSymbols,
    orderedLabel,
  };
}
