import type { CalculationRequest, CalculationResult } from "../core/Calculation.js";
import type { Conditions } from "../core/Conditions.js";
import { validateConditions } from "../core/Conditions.js";
import { EngineError, isEngineError } from "../core/Errors.js";
import { validateComposition } from "../core/Material.js";
import type { ParameterSource } from "../core/ParameterSource.js";
import type { UnitSymbol } from "../core/Units.js";
import {
  combineValidation,
  errorIssues,
  invalid,
  ok,
  warningIssues,
  type ValidationResult,
} from "../core/Validation.js";
import { resolveModel } from "../models/registry.js";
import { ENGINE_VERSION } from "../version.js";

/**
 * The single calculation pipeline every model runs through:
 *
 *   CalculationRequest
 *     -> input validation        (structural: composition, conditions shape)
 *     -> model resolution        (registry lookup by id)
 *     -> model validation        (generic required-condition check + the model's own validate())
 *     -> calculation              (model.calculate() — the only model-specific step)
 *     -> result normalization    (wrap model output into the standard envelope)
 *     -> validation/result metadata
 *     -> CalculationResult
 *
 * This file contains no scientific equations and must never import a
 * specific model — that would defeat the point of the registry. If you're
 * tempted to add model-specific logic here, it belongs in that model's
 * `validate` or `calculate` instead.
 */
export function runCalculation(request: CalculationRequest): CalculationResult {
  // 1. Input validation (structural)
  if (!request.modelId) {
    throw new EngineError("INVALID_INPUT", "CalculationRequest.modelId is required.");
  }

  const compositionValidation = validateComposition(request.material.composition);
  const baseConditionsValidation = validateConditions(request.conditions);
  const structural = combineValidation(compositionValidation, baseConditionsValidation);
  throwIfBlocking(structural, (issues) => new EngineError(issues[0]!.code, issues[0]!.message, { issues }));

  // 2. Model resolution
  const model = resolveModel(request.modelId);

  // 3. Model validation — generic required-condition presence, then the model's own rules.
  const requiredConditionKeys = model.requiredInputs.filter(
    (key): key is keyof Conditions => key !== "composition",
  );
  const requiredConditionsValidation = validateConditions(request.conditions, requiredConditionKeys);
  const modelSpecificValidation = model.validate({
    material: request.material,
    conditions: request.conditions,
    parameters: request.parameters ?? {},
  });
  const modelValidation = combineValidation(requiredConditionsValidation, modelSpecificValidation);
  throwIfBlocking(
    modelValidation,
    (issues) => new EngineError("MODEL_VALIDATION_ERROR", issues[0]!.message, { modelId: model.id, issues }),
  );

  // 4. Calculation — the only model-specific call site in the pipeline.
  const output = (() => {
    try {
      return model.calculate(request);
    } catch (error) {
      if (isEngineError(error)) throw error;
      const cause = error instanceof Error ? error.message : String(error);
      throw new EngineError("CALCULATION_ERROR", `${model.id} failed to calculate: ${cause}`, {
        modelId: model.id,
        cause,
      });
    }
  })();

  // 5. Result normalization
  const requestedOutputs = request.requestedOutputs;
  const values = requestedOutputs
    ? Object.fromEntries(Object.entries(output.values).filter(([key]) => requestedOutputs.includes(key)))
    : output.values;

  const units: Record<string, UnitSymbol> = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value[0]?.unit ?? "dimensionless" : value.unit]),
  );

  const outputProperties = requestedOutputs
    ? model.outputProperties.filter((property) => requestedOutputs.includes(property.id))
    : model.outputProperties;

  // 6. Validation/result metadata
  const finalValidation = combineValidation(structural, modelValidation);
  const warnings = [
    ...(output.warnings ?? []),
    ...warningIssues(finalValidation).map((issue) => issue.message),
  ];

  const parametersUsed = request.parameters ?? {};
  const parameterProvenance: Record<string, ParameterSource> = Object.fromEntries(
    Object.keys(parametersUsed).map((key) => [
      key,
      request.parameterSources?.[key] ?? { kind: "user_supplied" },
    ]),
  );

  // 7. CalculationResult
  return {
    modelId: model.id,
    modelName: model.name,
    domain: model.domain,
    outputProperties,
    values,
    units,
    inputSummary: {
      material: request.material,
      conditions: request.conditions,
      parametersUsed,
    },
    parameterProvenance,
    warnings,
    validation: finalValidation,
    intermediateValues: output.intermediateValues,
    equations: model.equations,
    assumptions: model.assumptions,
    references: model.references,
    metadata: {
      calculatedAt: new Date().toISOString(),
      numericalMethod: model.numericalMethod,
      engineVersion: ENGINE_VERSION,
    },
  };
}

function throwIfBlocking(result: ValidationResult, toError: (issues: ValidationResult["issues"]) => EngineError): void {
  const blocking = errorIssues(result);
  if (blocking.length > 0) throw toError(blocking);
}

// Re-exported so callers can build/inspect a plain ValidationResult without importing core/Validation directly.
export { ok, invalid };
