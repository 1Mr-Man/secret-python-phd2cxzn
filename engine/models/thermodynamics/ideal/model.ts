import type { CalculationRequest, ModelCalculationOutput } from "../../../core/Calculation.js";
import { EngineError } from "../../../core/Errors.js";
import { quantity } from "../../../core/Units.js";
import { invalid, ok, type ValidationResult } from "../../../core/Validation.js";
import type { ModelDefinition, ModelValidationContext } from "../../ModelDefinition.js";
import {
  IDEAL_SOLUTION_SCC0_MODEL_ID,
  assumptions,
  equations,
  numericalMethod,
  outputProperties,
  references,
  requiredParameters,
} from "./metadata.js";

/** Scc(0) for an ideal binary solution: no parameters, no interaction — see metadata.ts for the derivation. */
export function computeIdealScc0(x: number): number {
  return x * (1 - x);
}

function validate(context: ModelValidationContext): ValidationResult {
  const { material } = context;
  const issues: ValidationResult["issues"] = [];

  if (material.composition.components.length !== 2) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: `Ideal Solution Scc(0) requires exactly 2 components (binary system); got ${material.composition.components.length}.`,
      path: "material.composition.components",
    });
  }

  return issues.length === 0 ? ok() : invalid(issues);
}

function calculate(request: CalculationRequest): ModelCalculationOutput {
  const x = request.material.composition.components[0]?.fraction;

  if (x === undefined) {
    // validate() runs before calculate() in the pipeline, so this should be
    // unreachable — guarded defensively rather than trusting call order.
    throw new EngineError("CALCULATION_ERROR", "Ideal Solution Scc(0) is missing composition.", { x });
  }

  return {
    values: {
      Scc0: quantity(computeIdealScc0(x), "dimensionless"),
    },
  };
}

export const idealSolutionScc0Model: ModelDefinition = {
  id: IDEAL_SOLUTION_SCC0_MODEL_ID,
  name: "Ideal Solution Model — Scc(0)",
  domain: "thermodynamic",
  outputProperties,
  requiredInputs: ["composition"],
  requiredParameters,
  numericalMethod,
  assumptions,
  references,
  equations,
  validate,
  calculate,
};
