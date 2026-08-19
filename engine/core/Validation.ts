import type { EngineErrorCode } from "./Errors.js";

/**
 * Generic validation primitives shared by every validation stage in the
 * engine (structural, model-specific/scientific). Regression validation —
 * checking a model against known-correct golden values — is not runtime
 * validation; it lives in the test suite (see engine/README.md).
 */

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  /** Which error category this issue belongs to, reused if it escalates to a thrown EngineError. */
  code: EngineErrorCode;
  message: string;
  /** Optional dotted path to the offending field, e.g. "conditions.temperatureK". */
  path?: string;
  /** "error" blocks calculation; "warning" is attached to the result but does not block it. */
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function ok(): ValidationResult {
  return { valid: true, issues: [] };
}

export function invalid(issues: ValidationIssue[]): ValidationResult {
  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}

/** Merges several validation results; invalid if any input is invalid. */
export function combineValidation(...results: ValidationResult[]): ValidationResult {
  const issues = results.flatMap((result) => result.issues);
  return {
    valid: results.every((result) => result.valid),
    issues,
  };
}

export function errorIssues(result: ValidationResult): ValidationIssue[] {
  return result.issues.filter((issue) => issue.severity === "error");
}

export function warningIssues(result: ValidationResult): ValidationIssue[] {
  return result.issues.filter((issue) => issue.severity === "warning");
}
