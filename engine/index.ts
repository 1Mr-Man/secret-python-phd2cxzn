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

export type { UnitFamily } from "./core/UnitConversion.js";
export { convert, convertQuantity } from "./core/UnitConversion.js";

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
export { IDEAL_SOLUTION_SCC0_MODEL_ID } from "./models/thermodynamics/ideal/index.js";
export { REGULAR_SOLUTION_SCC0_MODEL_ID } from "./models/thermodynamics/regular/index.js";
export { QUASI_CHEMICAL_SCC0_MODEL_ID } from "./models/thermodynamics/quasi-chemical/index.js";
export { MIVM_BINARY_MODEL_ID } from "./models/thermodynamics/mivm/index.js";

export type { ModelComparisonEntry, ModelComparisonRequest, ModelComparisonResult } from "./comparison/ModelComparison.js";
export { compareModels } from "./comparison/ModelComparison.js";

export type { CompositionSweepPoint, CompositionSweepRequest, CompositionSweepResult } from "./pipeline/CompositionSweep.js";
export { runCompositionSweep } from "./pipeline/CompositionSweep.js";

export type {
  CompatibilityAssessment,
  ParameterSet,
  ParameterSource,
  ParameterSourceKind,
  ParameterStatus,
  ParameterValue,
} from "./parameters/types.js";
export {
  clearParameterStore,
  findAllParameterSets,
  findParameterSet,
  registerParameterSet,
  toParameterRecord,
} from "./parameters/parameterStore.js";

export type {
  DerivationRecord,
  SourceLocation,
  SourceLocationType,
  VerificationMethod,
  VerificationRecord,
} from "./parameters/compatibility.js";

export type { ParameterValidationIssue, ParameterValidationResult } from "./parameters/validateParameterRecord.js";
export { validateParameterSet, validateParameterValue } from "./parameters/validateParameterRecord.js";

export type { ParameterResolutionQuery, ParameterResolutionResult, ParameterResolutionStatus } from "./parameters/resolve.js";
export { resolveParameterSet } from "./parameters/resolve.js";

export type { RequestParameters } from "./parameters/toRequestParameters.js";
export { toRequestParameters } from "./parameters/toRequestParameters.js";

export type { SystemIdentity } from "./core/SystemIdentity.js";
export { canonicalizeSystemLabel, identifySystem } from "./core/SystemIdentity.js";

export { systemLabel } from "./core/Material.js";

export { resolveRegularSolutionParameters } from "./models/thermodynamics/regular/index.js";
export { resolveQuasiChemicalParameters } from "./models/thermodynamics/quasi-chemical/index.js";
export { computeMivmBinary, resolveMivmParameters } from "./models/thermodynamics/mivm/index.js";
export type { MivmBinaryResult } from "./models/thermodynamics/mivm/index.js";

export { ENGINE_VERSION } from "./version.js";

// Phase 5 — pure, model-independent thermodynamic-quantity utilities.
// Not ModelDefinitions: no modelId, not run through CalculationPipeline.
// See the Phase 5 audit for scope/formulation and the remaining deferred
// utility (the total-Gibbs-mixing-energy combinator ΔG_mix =
// ΔG_mix^ideal + G^E — idealMixingGibbsEnergy below is only the ideal
// piece — not yet implemented).
export { idealMixingEntropy } from "./thermodynamics/mixingEntropy.js";
export { activity } from "./thermodynamics/activity.js";
export { idealMixingGibbsEnergy } from "./thermodynamics/idealMixingGibbsEnergy.js";
export type { InteractionMatrix, InteractionMatrixEntry } from "./thermodynamics/interactionMatrix.js";
export {
  buildInteractionLookup,
  canonicalPairKey,
  validateInteractionMatrixForComposition,
  validateInteractionMatrixStructure,
} from "./thermodynamics/interactionMatrix.js";
export { regularSolutionMixingEnthalpy } from "./thermodynamics/mixingEnthalpy.js";
export { relativeChemicalPotential } from "./thermodynamics/chemicalPotential.js";

export * as elements from "./data/elements.js";

// Real (but currently all status:"unavailable" — see DATA_MANIFEST.md)
// literature parameter records. NOT auto-registered into the running
// store — a caller registers explicitly if/when they want them queryable.
export * as parameterSets from "./data/parameterSets/index.js";

import { registerBuiltInModels } from "./models/index.js";
registerBuiltInModels();
