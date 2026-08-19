import type { Conditions } from "./Conditions.js";
import type { Material } from "./Material.js";
import type { PropertyDefinition, PropertyDomain } from "./Property.js";
import type { ModelReference } from "./Reference.js";
import type { PhysicalQuantity, UnitSymbol } from "./Units.js";
import type { ValidationResult } from "./Validation.js";

/**
 * What a caller builds to ask the engine for a calculation. This shape is
 * the same for every model — Ideal Solution, Quasi-Chemical, MIVM, a future
 * magnetic model — the pipeline never varies per model.
 */
export interface CalculationRequest {
  material: Material;
  modelId: string;
  conditions: Conditions;
  /**
   * Model parameters (e.g. W, Z for the Quasi-Chemical model). Phase 1a has
   * no parameter database yet, so every parameter a model requires must be
   * supplied explicitly here; a later phase can add default lookup by
   * system without changing this field's shape.
   */
  parameters?: Record<string, number>;
  /** Restrict which output property ids are returned; omit for all outputs the model defines. */
  requestedOutputs?: string[];
}

/**
 * What a model's own `calculate()` returns. The pipeline wraps this into
 * the full CalculationResult below — a model never constructs its own
 * result envelope, which is what keeps every model's output shape uniform.
 */
export interface ModelCalculationOutput {
  values: Record<string, PhysicalQuantity | PhysicalQuantity[]>;
  intermediateValues?: Record<string, number | number[]>;
  warnings?: string[];
}

/**
 * Standard result envelope for every calculation, regardless of model.
 * Carries enough provenance (N — scientific traceability) to be checked by
 * a scientist and, later, rendered by a UI without re-deriving anything.
 */
export interface CalculationResult {
  modelId: string;
  modelName: string;
  domain: PropertyDomain;
  outputProperties: PropertyDefinition[];

  values: Record<string, PhysicalQuantity | PhysicalQuantity[]>;
  units: Record<string, UnitSymbol>;

  inputSummary: {
    material: Material;
    conditions: Conditions;
    parametersUsed: Record<string, number>;
  };

  warnings: string[];
  validation: ValidationResult;

  intermediateValues?: Record<string, number | number[]>;
  equations?: string[];
  assumptions?: string[];
  references?: ModelReference[];

  metadata: {
    calculatedAt: string;
    numericalMethod: string;
    engineVersion: string;
    /** Populated by iterative models only; undefined for closed-form models like Quasi-Chemical. */
    iterationTolerance?: number;
    iterationCount?: number;
  };
}
