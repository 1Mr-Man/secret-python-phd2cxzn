import type { CalculationRequest, ModelCalculationOutput } from "../../../core/Calculation.js";
import { PhysicalConstants } from "../../../core/Constants.js";
import { EngineError, isEngineError } from "../../../core/Errors.js";
import { quantity } from "../../../core/Units.js";
import { invalid, ok, type ValidationResult } from "../../../core/Validation.js";
import type { ModelDefinition, ModelValidationContext } from "../../ModelDefinition.js";
import {
  REDLICH_KISTER_BINARY_MODEL_ID,
  assumptions,
  equations,
  numericalMethod,
  outputProperties,
  references,
  requiredParameters,
} from "./metadata.js";

const COEFFICIENT_KEY_PATTERN = /^L(\d+)$/;

/**
 * Extracts the ordered Redlich-Kister coefficient array [L0, L1, ..., Ln]
 * from a flat parameters record. Required: L0 present and finite.
 * Contiguity is enforced — if the highest-indexed `Lk` key present is
 * `Ln`, every `L0`..`L(n-1)` must also be present and finite; a gap
 * (e.g. L0 and L2 present, L1 absent) is rejected, never silently
 * treated as zero. A clean trailing absence (nothing past Ln) is the
 * legitimate termination of the polynomial (Phase 12B parameter-schema
 * audit).
 */
export function extractRedlichKisterCoefficients(parameters: Record<string, number>): number[] {
  const presentIndices = new Set<number>();
  for (const key of Object.keys(parameters)) {
    const match = COEFFICIENT_KEY_PATTERN.exec(key);
    if (match) presentIndices.add(Number(match[1]));
  }

  if (presentIndices.size === 0) {
    throw new EngineError(
      "INVALID_PARAMETER",
      "Redlich-Kister model requires at least parameter L0 (the zeroth-order coefficient).",
    );
  }

  const maxIndex = Math.max(...presentIndices);
  const coefficients: number[] = [];

  for (let k = 0; k <= maxIndex; k++) {
    if (!presentIndices.has(k)) {
      throw new EngineError(
        "INVALID_PARAMETER",
        `Redlich-Kister model requires contiguous coefficients: L${k} is missing but L${maxIndex} is present. ` +
          "A missing lower-order term is never treated as zero.",
      );
    }
    const value = parameters[`L${k}`];
    if (value === undefined || !Number.isFinite(value)) {
      throw new EngineError("INVALID_PARAMETER", `Redlich-Kister model requires a finite value for L${k}, got ${value}.`);
    }
    coefficients.push(value);
  }

  return coefficients;
}

/**
 * Excess molar Gibbs energy of mixing:
 *
 *   G^E = x_A * x_B * sum_{k=0}^{n} L_k * (x_A - x_B)^k
 *
 * `coefficients[k]` is `L_k`. L0-only (all higher terms absent) reduces
 * this exactly to Regular Solution's `L0 * x_A * x_B` = `W * x(1-x)`
 * form (see model.test.ts's regression test) — but this function never
 * calls or is called by Regular Solution's own model code; the
 * equivalence is verified independently by test, not by sharing code.
 */
export function computeRedlichKisterExcessGibbsEnergy(xA: number, xB: number, coefficients: number[]): number {
  const diff = xA - xB;
  let sum = 0;
  let power = 1;
  for (const Lk of coefficients) {
    sum += Lk * power;
    power *= diff;
  }
  return xA * xB * sum;
}

/**
 * Total molar Gibbs energy of mixing: G_M = RT[x_A ln x_A + x_B ln x_B] + G^E.
 * Guards each ideal-term component individually (x>0) to avoid
 * `0 * -Infinity = NaN` at a pure-component boundary, matching Phase
 * 5C's `idealMixingGibbsEnergy()` convention — but this is an
 * independent inline computation, not a call into that utility (models
 * and Phase 5 utilities remain separate, per established precedent).
 */
export function computeRedlichKisterTotalGibbsMixing(xA: number, xB: number, temperatureK: number, coefficients: number[]): number {
  const { GAS_CONSTANT_R: R } = PhysicalConstants;
  const idealTerm = R * temperatureK * ((xA > 0 ? xA * Math.log(xA) : 0) + (xB > 0 ? xB * Math.log(xB) : 0));
  const excessTerm = computeRedlichKisterExcessGibbsEnergy(xA, xB, coefficients);
  return idealTerm + excessTerm;
}

function validate(context: ModelValidationContext): ValidationResult {
  const { material, conditions, parameters } = context;
  const issues: ValidationResult["issues"] = [];

  if (material.composition.components.length !== 2) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: `Redlich-Kister model requires exactly 2 components (binary system); got ${material.composition.components.length}.`,
      path: "material.composition.components",
    });
  }

  if (conditions.temperatureK === undefined) {
    issues.push({
      code: "INVALID_CONDITION",
      severity: "error",
      message: "Redlich-Kister model requires conditions.temperatureK.",
      path: "conditions.temperatureK",
    });
  }

  try {
    extractRedlichKisterCoefficients(parameters);
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
  const xA = request.material.composition.components[0]?.fraction;
  const T = request.conditions.temperatureK;

  if (xA === undefined || T === undefined) {
    // validate() runs before calculate() in the pipeline, so this should be
    // unreachable — guarded defensively rather than trusting call order.
    throw new EngineError("CALCULATION_ERROR", "Redlich-Kister model is missing a required input.", { xA, T });
  }

  const coefficients = extractRedlichKisterCoefficients(request.parameters ?? {});
  const xB = 1 - xA;

  const GE = computeRedlichKisterExcessGibbsEnergy(xA, xB, coefficients);
  const deltaGMix = computeRedlichKisterTotalGibbsMixing(xA, xB, T, coefficients);

  return {
    values: {
      GE: quantity(GE, "J/mol"),
      deltaGMix: quantity(deltaGMix, "J/mol"),
    },
  };
}

export const redlichKisterBinaryModel: ModelDefinition = {
  id: REDLICH_KISTER_BINARY_MODEL_ID,
  name: "Redlich-Kister Binary Model — Excess and Total Gibbs Energy of Mixing",
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
