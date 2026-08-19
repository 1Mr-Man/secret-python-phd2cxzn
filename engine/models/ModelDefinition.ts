import type { CalculationRequest, ModelCalculationOutput } from "../core/Calculation.js";
import type { Conditions } from "../core/Conditions.js";
import type { Material } from "../core/Material.js";
import type { PropertyDefinition, PropertyDomain } from "../core/Property.js";
import type { ModelReference } from "../core/Reference.js";
import type { UnitSymbol } from "../core/Units.js";
import type { ValidationResult } from "../core/Validation.js";

/** Describes one parameter a model needs (e.g. W, Z for Quasi-Chemical) — not a condition, not part of the material. */
export interface ModelParameterSpec {
  key: string;
  name: string;
  unit: UnitSymbol;
  description?: string;
}

export interface ModelValidationContext {
  material: Material;
  conditions: Conditions;
  parameters: Record<string, number>;
}

/**
 * The contract every model implements — the one interface the registry,
 * pipeline, and (eventually) UI depend on. Adding a new model means
 * implementing this interface and registering it (see registry.ts); it
 * never requires editing the pipeline or any other model.
 */
export interface ModelDefinition {
  /** Unique, stable id, e.g. "thermodynamics.quasi-chemical.scc0". */
  id: string;
  name: string;
  domain: PropertyDomain;
  outputProperties: PropertyDefinition[];

  /** Condition keys this model needs present, plus the literal "composition" if it needs Material.composition. */
  requiredInputs: Array<keyof Conditions | "composition">;
  optionalInputs?: Array<keyof Conditions>;
  requiredParameters: ModelParameterSpec[];

  numericalMethod: string;
  assumptions: string[];
  references: ModelReference[];
  /** Human-readable equation strings for display/audit — not parsed or executed. */
  equations: string[];

  /** Model-specific/scientific validation (H, tier 2) — e.g. valid ranges, structural constraints this model imposes beyond generic composition/condition checks. */
  validate: (context: ModelValidationContext) => ValidationResult;

  /** Pure calculation. No I/O, no DOM, no side effects. */
  calculate: (request: CalculationRequest) => ModelCalculationOutput;
}
