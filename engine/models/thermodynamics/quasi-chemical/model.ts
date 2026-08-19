import type { CalculationRequest, ModelCalculationOutput } from "../../../core/Calculation.js";
import { PhysicalConstants } from "../../../core/Constants.js";
import { EngineError } from "../../../core/Errors.js";
import { quantity } from "../../../core/Units.js";
import { invalid, ok, type ValidationResult } from "../../../core/Validation.js";
import type { ModelDefinition, ModelValidationContext } from "../../ModelDefinition.js";
import {
  QUASI_CHEMICAL_SCC0_MODEL_ID,
  assumptions,
  equations,
  numericalMethod,
  outputProperties,
  references,
  requiredParameters,
} from "./metadata.js";

/**
 * The Au–Cu Quasi-Chemical Scc(0) calculation, migrated from script.js
 * (calculateSccQC) with identical arithmetic. This function operates on a
 * single composition point x — the original's concentration sweep (an
 * array of x values → a table/chart) is a caller-level concern: sweep by
 * calling the pipeline once per x, which this migration deliberately does
 * not bake into the engine (see engine/README.md).
 *
 * x is the mole fraction of the composition's first component; 1−x is the
 * second component's fraction (validated equal by validateComposition).
 */
export function computeScc0QuasiChemical(
  x: number,
  W: number,
  Z: number,
  T: number,
): { etaSquared: number; beta: number; scc0: number; scc0Ideal: number } {
  const { GAS_CONSTANT_R: R } = PhysicalConstants;

  const etaSquared = Math.exp((2 * W) / (Z * R * T));
  const beta = Math.sqrt(1 + 4 * x * (1 - x) * (etaSquared - 1));

  // Pure component: no concentration fluctuations possible — matches the
  // original prototype's explicit boundary branch rather than relying on
  // the general formula to reduce to zero on its own.
  const scc0 = x === 0 || x === 1 ? 0 : (x * (1 - x)) / (1 + (Z / 2) * ((1 - beta) / beta));

  const scc0Ideal = x * (1 - x);

  return { etaSquared, beta, scc0, scc0Ideal };
}

function validate(context: ModelValidationContext): ValidationResult {
  const { material, conditions, parameters } = context;
  const issues: ValidationResult["issues"] = [];

  if (material.composition.components.length !== 2) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: `Quasi-Chemical Scc(0) requires exactly 2 components (binary system); got ${material.composition.components.length}.`,
      path: "material.composition.components",
    });
  }

  if (conditions.temperatureK === undefined) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: "Quasi-Chemical Scc(0) requires conditions.temperatureK.",
      path: "conditions.temperatureK",
    });
  }

  const Z = parameters.Z;
  if (Z === undefined || !Number.isFinite(Z)) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: "Quasi-Chemical Scc(0) requires a finite parameter Z (coordination number).",
      path: "parameters.Z",
    });
  } else if (Z <= 0) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: `Coordination number Z must be greater than 0, got ${Z}.`,
      path: "parameters.Z",
    });
  }

  const W = parameters.W;
  if (W === undefined || !Number.isFinite(W)) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: "Quasi-Chemical Scc(0) requires a finite parameter W (interchange energy, J/mol).",
      path: "parameters.W",
    });
  }

  return issues.length === 0 ? ok() : invalid(issues);
}

function calculate(request: CalculationRequest): ModelCalculationOutput {
  const x = request.material.composition.components[0]?.fraction;
  const T = request.conditions.temperatureK;
  const Z = request.parameters?.Z;
  const W = request.parameters?.W;

  if (x === undefined || T === undefined || Z === undefined || W === undefined) {
    // validate() runs before calculate() in the pipeline, so this should be
    // unreachable — guarded defensively rather than trusting call order.
    throw new EngineError("CALCULATION_ERROR", "Quasi-Chemical Scc(0) is missing a required input.", {
      x,
      T,
      Z,
      W,
    });
  }

  const { etaSquared, beta, scc0, scc0Ideal } = computeScc0QuasiChemical(x, W, Z, T);

  return {
    values: {
      Scc0: quantity(scc0, "dimensionless"),
      Scc0Ideal: quantity(scc0Ideal, "dimensionless"),
      etaSquared: quantity(etaSquared, "dimensionless"),
    },
    intermediateValues: { beta },
  };
}

export const quasiChemicalScc0Model: ModelDefinition = {
  id: QUASI_CHEMICAL_SCC0_MODEL_ID,
  name: "Quasi-Chemical Model — Scc(0)",
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
