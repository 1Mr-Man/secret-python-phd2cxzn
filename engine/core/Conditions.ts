import { type ValidationResult, invalid, ok } from "./Validation.js";

/**
 * External state variables a calculation runs under. Every field is
 * optional — no model is assumed to use all of them. A model declares
 * which of these it actually needs via `ModelDefinition.requiredInputs`;
 * `validateConditions` below checks presence against that declared list.
 */

export type StrainState =
  | { kind: "scalar"; value: number }
  | { kind: "tensor"; components: number[][] };

export interface Conditions {
  temperatureK?: number;
  pressurePa?: number;
  strain?: StrainState;
  magneticFieldTeslas?: number;
  electricFieldVPerM?: number;
  /** Escape hatch for a condition specific to one model that doesn't warrant a named field yet. */
  custom?: Record<string, number>;
}

/**
 * Structural + basic sanity validation. `requiredKeys` come from the
 * model's own `requiredInputs` declaration — this function does not know
 * about any particular model.
 */
export function validateConditions(
  conditions: Conditions,
  requiredKeys: Array<keyof Conditions> = [],
): ValidationResult {
  const issues: ValidationResult["issues"] = [];

  for (const key of requiredKeys) {
    if (conditions[key] === undefined) {
      issues.push({
        code: "INVALID_CONDITION",
        severity: "error",
        message: `Missing required condition: ${String(key)}.`,
        path: `conditions.${String(key)}`,
      });
    }
  }

  if (conditions.temperatureK !== undefined) {
    if (!Number.isFinite(conditions.temperatureK) || conditions.temperatureK <= 0) {
      issues.push({
        code: "INVALID_CONDITION",
        severity: "error",
        message: `temperatureK must be a finite number greater than 0 (absolute temperature), got ${conditions.temperatureK}.`,
        path: "conditions.temperatureK",
      });
    }
  }

  if (conditions.pressurePa !== undefined) {
    if (!Number.isFinite(conditions.pressurePa) || conditions.pressurePa < 0) {
      issues.push({
        code: "INVALID_CONDITION",
        severity: "error",
        message: `pressurePa must be a finite number ≥ 0, got ${conditions.pressurePa}.`,
        path: "conditions.pressurePa",
      });
    }
  }

  return issues.length === 0 ? ok() : invalid(issues);
}
