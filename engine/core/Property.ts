import type { UnitSymbol } from "./Units.js";

/**
 * The eight research areas the platform is being built to cover. A model
 * declares one domain; the registry can be filtered by it (see
 * engine/models/registry.ts).
 */
export type PropertyDomain =
  | "thermodynamic"
  | "magnetic"
  | "surface"
  | "structural"
  | "optical"
  | "electrical"
  | "mechanical_strain"
  | "other";

/** Describes one output value a model can produce. */
export interface PropertyDefinition {
  /** Key this property is stored under in a CalculationResult's `values`, e.g. "Scc0". */
  id: string;
  name: string;
  domain: PropertyDomain;
  unit: UnitSymbol;
}
