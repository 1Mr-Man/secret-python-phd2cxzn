import type { CompatibilityAssessment } from "./compatibility.js";
import type { ParameterSet, ParameterValue } from "./types.js";

/**
 * Structural validation for parameter data itself — distinct from
 * `resolve.ts` (which decides whether a QUERY can be satisfied) and from
 * `core/Validation.ts` (which validates a CalculationRequest). This file
 * validates the DATA before it's trusted enough to register or cite:
 * "is this record internally consistent," not "does this record answer a
 * particular question."
 *
 * These are structural rules only — presence/absence of required fields
 * and the logical relationships between status/compatibility/derivation/
 * verification. Nothing here judges whether a NUMBER is scientifically
 * correct; that is and remains a human/literature question.
 */

export interface ParameterValidationIssue {
  path: string;
  message: string;
}

export interface ParameterValidationResult {
  valid: boolean;
  issues: ParameterValidationIssue[];
}

function ok(): ParameterValidationResult {
  return { valid: true, issues: [] };
}

function invalid(issues: ParameterValidationIssue[]): ParameterValidationResult {
  return { valid: false, issues };
}

/**
 * Validates one ParameterValue in isolation (rules 1-7, 11, 12 from the
 * Phase 2D spec). `path` lets a caller (validateParameterSet) prefix
 * issues with the value's position within its set.
 */
export function validateParameterValue(value: ParameterValue, path = "parameter"): ParameterValidationResult {
  const issues: ParameterValidationIssue[] = [];

  // Rule 12: units must be present for numerical parameters.
  if (!value.unit) {
    issues.push({ path: `${path}.unit`, message: "unit is required." });
  }

  if (value.status === "unavailable") {
    // Rule 1: unavailable -> no usable numeric value.
    if (value.value !== undefined) {
      issues.push({
        path: `${path}.value`,
        message: `status is "unavailable" but value (${value.value}) is present; an unavailable parameter must not carry a numeric value.`,
      });
    }
    // Rule 2: unavailable -> cannot contain a derivation claiming a verified result.
    if (value.derivation !== undefined) {
      issues.push({
        path: `${path}.derivation`,
        message: 'status is "unavailable" but a derivation record is present; an unavailable parameter cannot claim a verified derived result.',
      });
    }
    if (value.uncertainty !== undefined) {
      issues.push({
        path: `${path}.uncertainty`,
        message: 'status is "unavailable" but uncertainty is present; there is nothing to be uncertain about without a value.',
      });
    }
  } else if (value.value === undefined || !Number.isFinite(value.value)) {
    issues.push({
      path: `${path}.value`,
      message: `status is "${value.status}" but value is missing or not a finite number.`,
    });
  }

  if (value.status === "verified_direct") {
    // Rule 3: verified_direct -> requires appropriate verification metadata.
    if (!value.verification) {
      issues.push({
        path: `${path}.verification`,
        message: 'status is "verified_direct" but no verification record is present.',
      });
    } else if (value.verification.method !== "direct_read" && value.verification.method !== "cross_checked") {
      issues.push({
        path: `${path}.verification.method`,
        message: `status is "verified_direct" but verification.method is "${value.verification.method}"; expected "direct_read" or "cross_checked".`,
      });
    }
    if (value.derivation !== undefined) {
      issues.push({
        path: `${path}.derivation`,
        message: 'status is "verified_direct" but a derivation record is present; a direct read has no transformation to record — use "verified_derived" instead.',
      });
    }
  }

  if (value.status === "verified_derived") {
    // Rules 4-7: verified_derived -> requires a complete DerivationRecord.
    if (!value.derivation) {
      issues.push({
        path: `${path}.derivation`,
        message: 'status is "verified_derived" but no derivation record is present.',
      });
    } else {
      if (!value.derivation.transformationEquation || value.derivation.transformationEquation.trim() === "") {
        issues.push({
          path: `${path}.derivation.transformationEquation`,
          message: '"verified_derived" requires a non-empty transformationEquation.',
        });
      }
      if (!value.derivation.assumptions || value.derivation.assumptions.length === 0) {
        issues.push({
          path: `${path}.derivation.assumptions`,
          message: '"verified_derived" requires at least one stated assumption.',
        });
      }
      if (!value.derivation.sourceValues || Object.keys(value.derivation.sourceValues).length === 0) {
        issues.push({
          path: `${path}.derivation.sourceValues`,
          message: '"verified_derived" requires the directly-verified source values it was computed from.',
        });
      }
    }
    if (!value.verification) {
      issues.push({
        path: `${path}.verification`,
        message: 'status is "verified_derived" but no verification record is present.',
      });
    } else if (value.verification.method !== "derived") {
      issues.push({
        path: `${path}.verification.method`,
        message: `status is "verified_derived" but verification.method is "${value.verification.method}"; expected "derived".`,
      });
    }
  }

  // Rule 11: literature/database sources should have citation metadata.
  if ((value.source.kind === "literature" || value.source.kind === "database") && !value.source.citation) {
    issues.push({
      path: `${path}.source.citation`,
      message: `source.kind is "${value.source.kind}" but no citation is present.`,
    });
  }

  return issues.length === 0 ? ok() : invalid(issues);
}

const COMPATIBILITY_RESTRICTIVENESS: Record<CompatibilityAssessment, number> = {
  directly_compatible: 0,
  requires_explicit_transformation: 1,
  not_compatible: 2,
};

/**
 * Validates a whole ParameterSet: every parameter within it (rule set
 * above), plus the set-level rules (8-10) that depend on more than one
 * value or on the set's own fields — most importantly that
 * `compatibility` and each parameter's `status` cannot contradict each
 * other (Correction 1: set-level compatibility is authoritative; a
 * parameter-level override may only be equally or MORE restrictive, never
 * a way to claim usability the set has already ruled out).
 */
export function validateParameterSet(set: ParameterSet): ParameterValidationResult {
  const issues: ParameterValidationIssue[] = [];

  // Rule 10: setId (and the other identity fields) must be non-empty.
  if (!set.setId || set.setId.trim() === "") {
    issues.push({ path: "set.setId", message: "setId must be non-empty." });
  }
  if (!set.modelId || set.modelId.trim() === "") {
    issues.push({ path: "set.modelId", message: "modelId must be non-empty." });
  }
  if (!set.system || set.system.trim() === "") {
    issues.push({ path: "set.system", message: "system must be non-empty." });
  }

  set.parameters.forEach((parameter, index) => {
    const valueResult = validateParameterValue(parameter, `set.parameters[${index}]`);
    issues.push(...valueResult.issues);

    // Rules 8 & 9: a transformation-blocked or incompatible set can never
    // contain a directly usable value.
    if (
      (set.compatibility === "requires_explicit_transformation" || set.compatibility === "not_compatible") &&
      parameter.status !== "unavailable"
    ) {
      issues.push({
        path: `set.parameters[${index}].status`,
        message: `set.compatibility is "${set.compatibility}" but parameter "${parameter.key}" has status "${parameter.status}"; a transformation-blocked or incompatible set cannot contain a directly usable value.`,
      });
    }

    // Correction 1: reject a parameter-level override that is LESS
    // restrictive than the set's authoritative classification.
    if (parameter.compatibility !== undefined && set.compatibility !== undefined) {
      if (COMPATIBILITY_RESTRICTIVENESS[parameter.compatibility] < COMPATIBILITY_RESTRICTIVENESS[set.compatibility]) {
        issues.push({
          path: `set.parameters[${index}].compatibility`,
          message: `parameter "${parameter.key}" claims compatibility "${parameter.compatibility}", which is less restrictive than the set's authoritative compatibility "${set.compatibility}"; a parameter-level override may only be equally or more restrictive than its set, never more permissive.`,
        });
      }
    }
  });

  return issues.length === 0 ? ok() : invalid(issues);
}
