import type { CalculationRequest, ModelCalculationOutput } from "../../../core/Calculation.js";
import { PhysicalConstants } from "../../../core/Constants.js";
import { EngineError } from "../../../core/Errors.js";
import { quantity } from "../../../core/Units.js";
import { invalid, ok, type ValidationResult } from "../../../core/Validation.js";
import type { ModelDefinition, ModelValidationContext } from "../../ModelDefinition.js";
import {
  MIVM_BINARY_MODEL_ID,
  assumptions,
  equations,
  numericalMethod,
  outputProperties,
  references,
  requiredParameters,
} from "./metadata.js";

/**
 * ln(gamma_k) for "component k, dilute-or-not, in a k-l binary pair" —
 * this single function computes BOTH ln(gamma_i) and ln(gamma_j).
 *
 * Called as lnGamma(xi, xj, Bij, Bji, Zi, Zj, Vmi, Vmj) it returns
 * ln(gamma_i) exactly as quoted from Source B (Hang & Tao 2023, Eq. 14 —
 * see metadata.ts's header comment for the full citation and the
 * B_ij/B_ji convention this project settled on).
 *
 * Called with i and j swapped in EVERY argument — lnGamma(xj, xi, Bji,
 * Bij, Zj, Zi, Vmj, Vmi) — it returns ln(gamma_j). This is the exchange
 * symmetry the audit (docs/MIVM_MATHEMATICAL_AUDIT.md §6.3, §10)
 * requires: ln(gamma_j) is NOT independently quoted by any source this
 * project read, so it is produced by literally reusing this same
 * formula with i<->j swapped throughout, rather than by transcribing a
 * second, separately-derived expression that could carry its own
 * transcription error. See model.test.ts's exchange-symmetry test.
 */
function lnGamma(xk: number, xl: number, Bkl: number, Blk: number, Zk: number, Zl: number, Vmk: number, Vml: number): number {
  const denomK = Vmk * xk + Vml * Blk * xl;
  const denomL = Vml * xl + xk * Vmk * Bkl;
  const bracketDenomK = xk + xl * Blk;
  const bracketDenomL = xl + Bkl * xk;

  const term1 = 1 + Math.log(Vmk / denomK);
  const term2 = -(xk * Vmk) / denomK;
  const term3 = -(xl * Vmk * Bkl) / denomL;
  const bracket = (Zk * Blk * Blk * Math.log(Blk)) / (bracketDenomK * bracketDenomK) + (Zl * Bkl * Math.log(Bkl)) / (bracketDenomL * bracketDenomL);
  const term4 = -((xl * xl) / 2) * bracket;

  return term1 + term2 + term3 + term4;
}

/**
 * Binary MIVM molar excess Gibbs energy, normalized by RT — quoted
 * exactly from Source B (Hang & Tao 2023, Eq. 13). See metadata.ts's
 * header comment for the full provenance and the B_ij/B_ji convention.
 *
 * Well-behaved (no NaN/Infinity) across the full closed domain
 * xi in [0, 1] given Bij, Bji, Zi, Zj, Vmi, Vmj all > 0 (validated by
 * validate() below) — unlike Ideal Solution's x*ln(x), no explicit
 * x=0/x=1 special-casing is needed here: every log argument stays
 * finite and positive at both boundaries, and every bracket denominator
 * stays strictly positive, so the "0 * ln(finite)" limiting behavior
 * that JavaScript already computes correctly is exactly what's wanted.
 */
function gmE_RT(xi: number, xj: number, Bij: number, Bji: number, Zi: number, Zj: number, Vmi: number, Vmj: number): number {
  const term1 = xi * Math.log(Vmi / (xi * Vmi + xj * Vmj * Bji));
  const term2 = xj * Math.log(Vmj / (xj * Vmj + xi * Vmi * Bij));
  const bracket = (Zi * Bji * Math.log(Bji)) / (xi + xj * Bji) + (Zj * Bij * Math.log(Bij)) / (xj + xi * Bij);
  const term3 = -((xi * xj) / 2) * bracket;

  return term1 + term2 + term3;
}

export interface MivmBinaryResult {
  GmE_RT: number;
  GmE: number;
  lnGammaI: number;
  lnGammaJ: number;
  gammaI: number;
  gammaJ: number;
}

/**
 * The complete binary MIVM calculation for one composition point.
 * `xi` is the mole fraction of the composition's first component (same
 * convention as Regular Solution / Quasi-Chemical); `xj = 1 - xi`.
 */
export function computeMivmBinary(
  xi: number,
  Bij: number,
  Bji: number,
  Zi: number,
  Zj: number,
  Vmi: number,
  Vmj: number,
  T: number,
): MivmBinaryResult {
  const { GAS_CONSTANT_R: R } = PhysicalConstants;
  const xj = 1 - xi;

  const GmE_RT = gmE_RT(xi, xj, Bij, Bji, Zi, Zj, Vmi, Vmj);
  const lnGammaI = lnGamma(xi, xj, Bij, Bji, Zi, Zj, Vmi, Vmj);
  const lnGammaJ = lnGamma(xj, xi, Bji, Bij, Zj, Zi, Vmj, Vmi);

  return {
    GmE_RT,
    GmE: GmE_RT * R * T,
    lnGammaI,
    lnGammaJ,
    gammaI: Math.exp(lnGammaI),
    gammaJ: Math.exp(lnGammaJ),
  };
}

function validate(context: ModelValidationContext): ValidationResult {
  const { material, conditions, parameters } = context;
  const issues: ValidationResult["issues"] = [];

  if (material.composition.components.length !== 2) {
    issues.push({
      code: "MODEL_VALIDATION_ERROR",
      severity: "error",
      message: `Binary MIVM requires exactly 2 components (binary system); got ${material.composition.components.length}.`,
      path: "material.composition.components",
    });
  }

  if (conditions.temperatureK === undefined) {
    issues.push({
      code: "INVALID_CONDITION",
      severity: "error",
      message: "Binary MIVM requires conditions.temperatureK.",
      path: "conditions.temperatureK",
    });
  } else if (conditions.temperatureK <= 0) {
    issues.push({
      code: "INVALID_CONDITION",
      severity: "error",
      message: `conditions.temperatureK must be > 0, got ${conditions.temperatureK}.`,
      path: "conditions.temperatureK",
    });
  }

  const requiredKeys: Array<{ key: string; mustBePositive: boolean }> = [
    { key: "B_ij", mustBePositive: true },
    { key: "B_ji", mustBePositive: true },
    { key: "Z_i", mustBePositive: true },
    { key: "Z_j", mustBePositive: true },
    { key: "V_mi", mustBePositive: true },
    { key: "V_mj", mustBePositive: true },
  ];

  for (const { key, mustBePositive } of requiredKeys) {
    const value = parameters[key];
    if (value === undefined || !Number.isFinite(value)) {
      issues.push({
        code: "INVALID_PARAMETER",
        severity: "error",
        message: `Binary MIVM requires a finite parameter ${key}.`,
        path: `parameters.${key}`,
      });
    } else if (mustBePositive && value <= 0) {
      issues.push({
        code: "INVALID_PARAMETER",
        severity: "error",
        message: `Binary MIVM parameter ${key} must be > 0, got ${value}.`,
        path: `parameters.${key}`,
      });
    }
  }

  return issues.length === 0 ? ok() : invalid(issues);
}

function calculate(request: CalculationRequest): ModelCalculationOutput {
  const xi = request.material.composition.components[0]?.fraction;
  const T = request.conditions.temperatureK;
  const Bij = request.parameters?.B_ij;
  const Bji = request.parameters?.B_ji;
  const Zi = request.parameters?.Z_i;
  const Zj = request.parameters?.Z_j;
  const Vmi = request.parameters?.V_mi;
  const Vmj = request.parameters?.V_mj;

  if (
    xi === undefined ||
    T === undefined ||
    Bij === undefined ||
    Bji === undefined ||
    Zi === undefined ||
    Zj === undefined ||
    Vmi === undefined ||
    Vmj === undefined
  ) {
    // validate() runs before calculate() in the pipeline, so this should be
    // unreachable — guarded defensively rather than trusting call order.
    throw new EngineError("CALCULATION_ERROR", "Binary MIVM is missing a required input.", {
      xi,
      T,
      Bij,
      Bji,
      Zi,
      Zj,
      Vmi,
      Vmj,
    });
  }

  const result = computeMivmBinary(xi, Bij, Bji, Zi, Zj, Vmi, Vmj, T);

  return {
    values: {
      GmE: quantity(result.GmE, "J/mol"),
      GmE_RT: quantity(result.GmE_RT, "dimensionless"),
      lnGammaI: quantity(result.lnGammaI, "dimensionless"),
      lnGammaJ: quantity(result.lnGammaJ, "dimensionless"),
      gammaI: quantity(result.gammaI, "dimensionless"),
      gammaJ: quantity(result.gammaJ, "dimensionless"),
    },
  };
}

export const mivmBinaryModel: ModelDefinition = {
  id: MIVM_BINARY_MODEL_ID,
  name: "Molecular Interaction Volume Model (MIVM) — binary",
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
