import type { Element } from "./Element.js";
import { type ValidationResult, invalid, ok } from "./Validation.js";

/**
 * Composition, alloy classification, and composition validation.
 *
 * Phase 1a supports one composition basis — mole fraction — because that is
 * what the existing Au–Cu prototype uses. `CompositionBasis` is a union of
 * one value on purpose: adding "mass_fraction" later is a matter of
 * extending the union and the validator, not redesigning this file.
 */

export type CompositionBasis = "mole_fraction";

export interface Component {
  element: Element;
  /** Fraction of this component in the material, in units of `basis`. */
  fraction: number;
}

export interface Composition {
  basis: CompositionBasis;
  components: Component[];
}

export type SystemOrder = "pure" | "binary" | "ternary" | "multicomponent";

export function classifySystem(composition: Composition): SystemOrder {
  switch (composition.components.length) {
    case 1:
      return "pure";
    case 2:
      return "binary";
    case 3:
      return "ternary";
    default:
      return "multicomponent";
  }
}

export interface Material {
  composition: Composition;
  /** Optional phase label, e.g. "liquid", "fcc" — not validated in Phase 1a. */
  phase?: string;
}

/**
 * A human-readable system label in component order, e.g. "Au-Cu" for a
 * binary Au/Cu composition. Used as the lookup key for parameter sets
 * (engine/parameters/) — not alphabetized, since "Au-Cu" and "Cu-Au" are
 * conventionally distinct orderings in the alloy literature (first element
 * matches the x in Scc(0) sweeps).
 */
export function systemLabel(composition: Composition): string {
  return composition.components.map((component) => component.element.symbol).join("-");
}

/** Convenience constructor for an n-component mole-fraction composition. */
export function composition(components: Component[]): Composition {
  return { basis: "mole_fraction", components };
}

export function pureElement(element: Element): Composition {
  return composition([{ element, fraction: 1 }]);
}

export function binaryComposition(
  elementA: Element,
  fractionA: number,
  elementB: Element,
  fractionB: number = 1 - fractionA,
): Composition {
  return composition([
    { element: elementA, fraction: fractionA },
    { element: elementB, fraction: fractionB },
  ]);
}

export function ternaryComposition(
  elementA: Element,
  fractionA: number,
  elementB: Element,
  fractionB: number,
  elementC: Element,
  fractionC: number = 1 - fractionA - fractionB,
): Composition {
  return composition([
    { element: elementA, fraction: fractionA },
    { element: elementB, fraction: fractionB },
    { element: elementC, fraction: fractionC },
  ]);
}

const SUM_TOLERANCE = 1e-6;

export function validateComposition(composition: Composition): ValidationResult {
  const issues: ValidationResult["issues"] = [];

  if (composition.components.length === 0) {
    issues.push({
      code: "INVALID_COMPOSITION",
      severity: "error",
      message: "Composition must contain at least one component.",
      path: "composition.components",
    });
    return invalid(issues);
  }

  const seenSymbols = new Set<string>();
  let sum = 0;

  composition.components.forEach(({ element, fraction }, index) => {
    const path = `composition.components[${index}]`;

    if (!Number.isFinite(fraction)) {
      issues.push({
        code: "INVALID_COMPOSITION",
        severity: "error",
        message: `Mole fraction for ${element.symbol} must be a finite number, got ${fraction}.`,
        path,
      });
      return;
    }

    if (fraction < 0) {
      issues.push({
        code: "INVALID_COMPOSITION",
        severity: "error",
        message: `Mole fraction for ${element.symbol} must not be negative, got ${fraction}.`,
        path,
      });
    }

    if (fraction > 1) {
      issues.push({
        code: "INVALID_COMPOSITION",
        severity: "error",
        message: `Mole fraction for ${element.symbol} must not exceed 1, got ${fraction}.`,
        path,
      });
    }

    if (seenSymbols.has(element.symbol)) {
      issues.push({
        code: "INVALID_COMPOSITION",
        severity: "error",
        message: `Element ${element.symbol} appears more than once in the composition.`,
        path,
      });
    }
    seenSymbols.add(element.symbol);

    sum += fraction;
  });

  if (Number.isFinite(sum) && Math.abs(sum - 1) > SUM_TOLERANCE) {
    issues.push({
      code: "INVALID_COMPOSITION",
      severity: "error",
      message: `Composition mole fractions must sum to 1 (±${SUM_TOLERANCE}); got ${sum}.`,
      path: "composition.components",
    });
  }

  return issues.length === 0 ? ok() : invalid(issues);
}
