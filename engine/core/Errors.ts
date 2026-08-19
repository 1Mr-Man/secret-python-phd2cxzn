/**
 * Structured error taxonomy for the engine. Every failure the engine raises
 * on purpose is an EngineError with one of these codes — never a bare
 * thrown string — so callers (tests, a future UI, another model) can branch
 * on `error.code` instead of parsing messages.
 */
export type EngineErrorCode =
  | "INVALID_INPUT"
  | "INVALID_COMPOSITION"
  | "INVALID_CONDITION"
  | "MODEL_NOT_FOUND"
  | "MODEL_VALIDATION_ERROR"
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
