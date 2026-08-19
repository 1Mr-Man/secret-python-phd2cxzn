import type { CalculationRequest, ModelCalculationOutput } from "../../../core/Calculation.js";
import { PhysicalConstants } from "../../../core/Constants.js";
import { EngineError } from "../../../core/Errors.js";
import { quantity } from "../../../core/Units.js";
import { invalid, ok, type ValidationResult } from "../../../core/Validation.js";
import type { ModelDefinition, ModelValidationContext } from "../../ModelDefinition.js";
import {
  REGULAR_SOLUTION_SCC0_MODEL_ID,
  assumptions,
  equations,
  numericalMethod,
  outputProperties,
  references,
  requiredParameters,
} from "./metadata.js";

/**
 * Regular-solution Scc(0) — see metadata.ts for the full derivation and its
 * verification as the Z -> infinity limit of this project's Quasi-Chemical
 * model. `denominator` is exposed so callers (validate() below, tests) can
 * detect the spinodal condition without recomputing it.
 */
export function computeRegularScc0(x: number, W: number, T: number): { scc0: number; denominator: number } {
  const { GAS_CONSTANT_R: R } = PhysicalConstants;

  const denominator = 1 - ((2 * W) / (R * T)) * x * (1 - x);
  const scc0 = (x * (1 - x)) / denominator;

  return { scc0, denominator };
}

function validate(context: ModelValidationContext): ValidationResult {
  const { material, conditions, parameters } = context;
  const issues: ValidationResult["issues"] = [];

  if (material.composition.components.length !== 2) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: `Regular Solution Scc(0) requires exactly 2 components (binary system); got ${material.composition.components.length}.`,
      path: "material.composition.components",
    });
  }

  if (conditions.temperatureK === undefined) {
    issues.push({
      code: "INVALID_CONDITION",
      severity: "error",
      message: "Regular Solution Scc(0) requires conditions.temperatureK.",
      path: "conditions.temperatureK",
    });
  }

  const W = parameters.W;
  if (W === undefined || !Number.isFinite(W)) {
    issues.push({
      code: "INVALID_PARAMETER",
      severity: "error",
      message: "Regular Solution Scc(0) requires a finite parameter W (interaction energy, J/mol).",
      path: "parameters.W",
    });
  }

  // Scientific-domain check: only meaningful once composition/temperature/W
  // are all individually valid — the mean-field regular solution predicts
  // spinodal instability (Scc(0) formally negative/infinite) when the
  // denominator is non-positive.
  const x = material.composition.components[0]?.fraction;
  if (
    material.composition.components.length === 2 &&
    x !== undefined &&
    conditions.temperatureK !== undefined &&
    conditions.temperatureK > 0 &&
    W !== undefined &&
    Number.isFinite(W)
  ) {
    const { denominator } = computeRegularScc0(x, W, conditions.temperatureK);
    if (denominator <= 0) {
      issues.push({
        code: "SCIENTIFIC_DOMAIN_ERROR",
        severity: "error",
        message:
          `Regular Solution Scc(0) is undefined at x=${x}, T=${conditions.temperatureK} K, W=${W} J/mol: ` +
          "the mean-field regular solution predicts thermodynamic instability (at or beyond the spinodal) " +
          "at this composition, so 1 - (2W/RT)x(1-x) <= 0.",
        path: "parameters.W",
      });
    }
  }

  return issues.length === 0 ? ok() : invalid(issues);
}

function calculate(request: CalculationRequest): ModelCalculationOutput {
  const x = request.material.composition.components[0]?.fraction;
  const T = request.conditions.temperatureK;
  const W = request.parameters?.W;

  if (x === undefined || T === undefined || W === undefined) {
    // validate() runs before calculate() in the pipeline, so this should be
    // unreachable — guarded defensively rather than trusting call order.
    throw new EngineError("CALCULATION_ERROR", "Regular Solution Scc(0) is missing a required input.", {
      x,
      T,
      W,
    });
  }

  const { scc0 } = computeRegularScc0(x, W, T);

  return {
    values: {
      Scc0: quantity(scc0, "dimensionless"),
    },
  };
}

export const regularSolutionScc0Model: ModelDefinition = {
  id: REGULAR_SOLUTION_SCC0_MODEL_ID,
  name: "Regular Solution Model — Scc(0)",
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
