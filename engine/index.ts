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
// See the Phase 5 audit for scope/formulation — Phase 5 is now complete
// (5A-5F).
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
export { totalMixingGibbsEnergy } from "./thermodynamics/totalMixingGibbsEnergy.js";

// Phase 6A — pure, model-independent scalar-mechanics utilities. Same
// contract as Phase 5: no modelId, not run through CalculationPipeline,
// no UI wiring, no mechanical material data. Strain tensors, stress-
// strain curves, and composition-dependent mechanical models are
// deliberately deferred (Phase 6 audit; Phase 6B covers tensors).
export { linearStrain } from "./mechanics/linearStrain.js";
export { percentageStrain } from "./mechanics/percentageStrain.js";
export { volumetricStrain } from "./mechanics/volumetricStrain.js";
export { thermalStrain } from "./mechanics/thermalStrain.js";
export { elasticStress } from "./mechanics/elasticStress.js";
export { youngsModulus } from "./mechanics/youngsModulus.js";
export { shearModulus } from "./mechanics/shearModulus.js";
export { bulkModulus } from "./mechanics/bulkModulus.js";
export { poissonsRatio } from "./mechanics/poissonsRatio.js";

// Phase 6B — 3x3 strain tensor: construction, structural validation
// (shape/finiteness/symmetry), component extraction, and the explicit
// tensorial->engineering shear conversion. Stores TENSORIAL shear strain
// (ε_ij), never engineering shear strain (γ_ij=2ε_ij) — always convert
// via engineeringShearStrain() before using an off-diagonal component in
// an engineering formula (e.g. shearModulus() above). Principal strains/
// eigenvalues and von Mises/equivalent strain are deliberately deferred
// — see the Phase 6B audit.
export type { StrainTensor } from "./mechanics/strainTensor.js";
export { createStrainTensor, validateStrainTensor } from "./mechanics/strainTensor.js";
export { normalStrainComponents, tensorialShearStrainComponents } from "./mechanics/strainTensorComponents.js";
export { engineeringShearStrain } from "./mechanics/engineeringShearStrain.js";
export { volumetricStrainFromTensor } from "./mechanics/volumetricStrainFromTensor.js";

// Phase 6C — principal strains (eigenvalues of the strain tensor), via
// the closed-form analytic trigonometric method for a real symmetric
// 3x3 matrix (Smith 1961) — not an iterative solver. Eigenvalues only,
// ordered epsilon1>=epsilon2>=epsilon3; no eigenvectors, no von Mises/
// equivalent strain, no generic matrix module — see the Phase 6C audit.
export type { PrincipalStrains } from "./mechanics/principalStrains.js";
export { principalStrains } from "./mechanics/principalStrains.js";

// Phase 6D — von Mises equivalent strain: a single-state distortional-
// strain scalar computed directly from StrainTensor's tensorial
// components (never via principalStrains() or engineeringShearStrain()).
// NOT a von Mises stress, yield criterion, or the path-dependent
// accumulated equivalent plastic strain of flow-plasticity theory — see
// the Phase 6D audit.
export { equivalentStrain } from "./mechanics/equivalentStrain.js";

// Phase 7A — pure, model-independent magnetic utilities. Same contract
// as Phase 5/6: no modelId, not run through CalculationPipeline, no UI
// wiring, no element magnetic data. Conditions.magneticFieldTeslas is
// locked as B (flux density), never H (field strength) — see the Phase
// 7A audit. None of these three utilities call each other internally.
export { curieWeissSusceptibility } from "./magnetic/curieWeissSusceptibility.js";
export { magneticFluxDensity } from "./magnetic/magneticFluxDensity.js";
export { linearMagnetization } from "./magnetic/linearMagnetization.js";

// Phase 8A — pure, model-independent electrical utilities. Same contract
// as Phase 5/6/7: no modelId, not run through CalculationPipeline, no UI
// wiring, no element electrical data. None of these four call each other
// internally — see the Phase 8A audit.
export { currentDensity } from "./electrical/currentDensity.js";
export { conductivityFromResistivity } from "./electrical/conductivityFromResistivity.js";
export { resistivityFromConductivity } from "./electrical/resistivityFromConductivity.js";
export { resistivityAtTemperature } from "./electrical/resistivityAtTemperature.js";

// Phase 9A — theoretical crystal density, cubic unit cells only. Same
// contract as Phase 5/6/7/8: no modelId, not run through
// CalculationPipeline, no UI wiring. Z (atoms/unit cell) and molar mass
// are plain caller-supplied numbers — this does NOT infer Z from any
// crystalStructure string or look up mass from any Element record. No
// general (non-cubic) unit-cell-volume utility — see the Phase 9A audit.
export { theoreticalCrystalDensity } from "./structural/theoreticalCrystalDensity.js";

export * as elements from "./data/elements.js";

// Real (but currently all status:"unavailable" — see DATA_MANIFEST.md)
// literature parameter records. NOT auto-registered into the running
// store — a caller registers explicitly if/when they want them queryable.
export * as parameterSets from "./data/parameterSets/index.js";

import { registerBuiltInModels } from "./models/index.js";
registerBuiltInModels();
