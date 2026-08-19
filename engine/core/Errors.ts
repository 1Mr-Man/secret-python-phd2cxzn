/**
 * Structured error taxonomy for the engine. Every failure the engine raises
 * on purpose is an EngineError with one of these codes — never a bare
 * thrown string — so callers (tests, a future UI, another model) can branch
 * on `error.code` instead of parsing messages.
 *
 * These map onto the engine's six validation categories:
 *   A. Structural         -> INVALID_INPUT
 *   B. Composition         -> INVALID_COMPOSITION
 *   C. Condition            -> INVALID_CONDITION
 *   D. Model-specific         -> MODEL_VALIDATION_ERROR (a model's own structural
 *                                constraints, e.g. "must be a binary composition",
 *                                on an otherwise-valid composition/request)
 *   E. Parameter-specific      -> INVALID_PARAMETER (a model parameter, e.g. W or
 *                                Z, missing or numerically invalid)
 *   F. Scientific-domain        -> SCIENTIFIC_DOMAIN_ERROR (composition/parameter/
 *                                condition combination is outside the model's
 *                                physical domain of validity — e.g. the regular
 *                                solution model's spinodal check)
 * Model resolution/execution failures (MODEL_NOT_FOUND, CALCULATION_ERROR,
 * UNSUPPORTED_OPERATION) sit outside this validation taxonomy.
 */
export type EngineErrorCode =
  | "INVALID_INPUT"
  | "INVALID_COMPOSITION"
  | "INVALID_CONDITION"
  | "MODEL_NOT_FOUND"
  | "MODEL_VALIDATION_ERROR"
  | "INVALID_PARAMETER"
  | "SCIENTIFIC_DOMAIN_ERROR"
  | "CALCULATION_ERROR"
  | "UNSUPPORTED_OPERATION";

export class EngineError extends Error {
  readonly code: EngineErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: EngineErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, EngineError.prototype);
  }
}

export function isEngineError(error: unknown): error is EngineError {
  return error instanceof EngineError;
}
