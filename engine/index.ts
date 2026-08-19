/**
 * Public API surface of the engine. A future UI (or anything else) should
 * import only from here — never reach into engine/core or engine/models
 * directly — so internal reshuffling never breaks a consumer.
 *
 * Importing this module registers all built-in models as a side effect,
 * so `runCalculation({ modelId: "thermodynamics.quasi-chemical.scc0", ... })`
 * works immediately. Tests that need a clean registry should instead import
 * `models/registry.js` and `models/index.js` directly and control
 * registration explicitly (see engine/models/registry.test.ts).
 */

export type { Element } from "./core/Element.js";
export { createElement } from "./core/Element.js";

export type { Component, Composition, CompositionBasis, Material, SystemOrder } from "./core/Material.js";
export {
  binaryComposition,
  classifySystem,
  composition,
  pureElement,
  ternaryComposition,
  validateComposition,
} from "./core/Material.js";

export type { Conditions, StrainState } from "./core/Conditions.js";
export { validateConditions } from "./core/Conditions.js";

export type { PhysicalQuantity, UnitSymbol } from "./core/Units.js";
export { KNOWN_UNITS, quantity } from "./core/Units.js";

export { PhysicalConstants } from "./core/Constants.js";

export type { EngineErrorCode } from "./core/Errors.js";
export { EngineError, isEngineError } from "./core/Errors.js";

export type { ValidationIssue, ValidationResult, ValidationSeverity } from "./core/Validation.js";

export type { PropertyDefinition, PropertyDomain } from "./core/Property.js";
export type { ModelReference } from "./core/Reference.js";

export type { CalculationRequest, CalculationResult, ModelCalculationOutput } from "./core/Calculation.js";

export type { ModelDefinition, ModelParameterSpec, ModelValidationContext } from "./models/ModelDefinition.js";
export { clearRegistry, getModel, listModels, registerModel, resolveModel } from "./models/registry.js";
export { registerBuiltInModels } from "./models/index.js";

export { runCalculation } from "./pipeline/CalculationPipeline.js";

// Known model ids, exported so a UI can build a CalculationRequest without
// importing a specific model's module — only the barrel and a string id.
export { QUASI_CHEMICAL_SCC0_MODEL_ID } from "./models/thermodynamics/quasi-chemical/index.js";

export { ENGINE_VERSION } from "./version.js";

export * as elements from "./data/elements.js";

import { registerBuiltInModels } from "./models/index.js";
registerBuiltInModels();
