import type { CalculationRequest, ModelCalculationOutput } from "../../../core/Calculation.js";
import { EngineError, isEngineError } from "../../../core/Errors.js";
import { quantity } from "../../../core/Units.js";
import { invalid, ok, type ValidationResult } from "../../../core/Validation.js";
import { idealMixingGibbsEnergy } from "../../../thermodynamics/idealMixingGibbsEnergy.js";
import type { InteractionMatrix, InteractionMatrixEntry } from "../../../thermodynamics/interactionMatrix.js";
import { validateInteractionMatrixForComposition, validateInteractionMatrixStructure } from "../../../thermodynamics/interactionMatrix.js";
import { regularSolutionMixingEnthalpy } from "../../../thermodynamics/mixingEnthalpy.js";
import { totalMixingGibbsEnergy } from "../../../thermodynamics/totalMixingGibbsEnergy.js";
import type { ModelDefinition, ModelValidationContext } from "../../ModelDefinition.js";
import {
  REGULAR_SOLUTION_MULTICOMPONENT_MODEL_ID,
  assumptions,
  equations,
  numericalMethod,
  outputProperties,
  references,
  requiredParameters,
} from "./metadata.js";

const OMEGA_KEY_PATTERN = /^Omega_([A-Z][a-z]?)-([A-Z][a-z]?)$/;

/**
 * Reconstructs an `InteractionMatrix` from this model's flat
 * `Omega_<canonicalPairKey>` parameter encoding (e.g.
 * `parameters["Omega_Fe-Ni"] = -8000`), the resolution to the same
 * "shared parameter types stay scalar" constraint 12B solved for
 * Redlich-Kister's coefficient array. Every matching key becomes one
 * `InteractionMatrixEntry` — structural/completeness validation
 * (self-pairs, duplicates, syntax, required-pair coverage) is NOT done
 * here; it is `validateInteractionMatrixStructure()`/
 * `validateInteractionMatrixForComposition()`'s job, reused unmodified
 * (Phase 13B audit — never invent a new rule where an existing one
 * already applies). This function only rejects a non-finite value for
 * an otherwise well-formed key, since that is specific to this model's
 * own parameter-parsing step, the same way
 * `extractRedlichKisterCoefficients()` (Phase 12B) rejects a non-finite
 * coefficient before its own contiguity check runs.
 */
export function extractInteractionMatrixFromParameters(parameters: Record<string, number>): InteractionMatrix {
  const pairs: InteractionMatrixEntry[] = [];

  for (const [key, value] of Object.entries(parameters)) {
    const match = OMEGA_KEY_PATTERN.exec(key);
    if (!match) continue;

    if (!Number.isFinite(value)) {
      throw new EngineError(
        "INVALID_PARAMETER",
        `Multicomponent Regular Solution requires a finite interaction value for parameter "${key}", got ${value}.`,
      );
    }

    pairs.push({ i: match[1]!, j: match[2]!, omegaJPerMol: value });
  }

  return { pairs };
}

function validate(context: ModelValidationContext): ValidationResult {
  const { material, conditions, parameters } = context;
  const issues: ValidationResult["issues"] = [];

  if (material.composition.components.length < 2) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: `Multicomponent Regular Solution requires at least 2 components; got ${material.composition.components.length}.`,
      path: "material.composition.components",
    });
  }

  if (conditions.temperatureK === undefined) {
    issues.push({
      code: "INVALID_CONDITION",
      severity: "error",
      message: "Multicomponent Regular Solution requires conditions.temperatureK.",
      path: "conditions.temperatureK",
    });
  }

  try {
    const matrix = extractInteractionMatrixFromParameters(parameters);
    validateInteractionMatrixStructure(matrix);
    if (material.composition.components.length >= 2) {
      validateInteractionMatrixForComposition(matrix, material.composition);
    }
  } catch (error) {
    if (isEngineError(error)) {
      issues.push({ code: error.code, severity: "error", message: error.message, path: "parameters" });
    } else {
      throw error;
    }
  }

  return issues.length === 0 ? ok() : invalid(issues);
}

function calculate(request: CalculationRequest): ModelCalculationOutput {
  const T = request.conditions.temperatureK;

  if (T === undefined) {
    // validate() runs before calculate() in the pipeline, so this should be
    // unreachable — guarded defensively rather than trusting call order.
    throw new EngineError("CALCULATION_ERROR", "Multicomponent Regular Solution is missing conditions.temperatureK.");
  }

  const matrix = extractInteractionMatrixFromParameters(request.parameters ?? {});
  const composition = request.material.composition;

  const idealG = idealMixingGibbsEnergy(composition, T);
  const excessG = regularSolutionMixingEnthalpy(composition, matrix);
  const deltaGMix = totalMixingGibbsEnergy(idealG, excessG);

  return {
    values: {
      GE: quantity(excessG, "J/mol"),
      deltaGMix: quantity(deltaGMix, "J/mol"),
    },
  };
}

export const regularSolutionMulticomponentModel: ModelDefinition = {
  id: REGULAR_SOLUTION_MULTICOMPONENT_MODEL_ID,
  name: "Regular Solution Model — Multicomponent Gibbs Energy of Mixing",
  domain: "thermodynamic",
  outputProperties,
  requiredInputs: ["composition", "temperatureK"],
  requiredParameters,
  numericalMethod,
  assumptions,
  references,
  equations,
  validate,
  calculate,
};
