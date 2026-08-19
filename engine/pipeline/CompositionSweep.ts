import type { CalculationResult } from "../core/Calculation.js";
import type { Conditions } from "../core/Conditions.js";
import { EngineError } from "../core/Errors.js";
import type { Composition } from "../core/Material.js";
import { runCalculation } from "./CalculationPipeline.js";

/**
 * A reusable, engine-level composition sweep: run one model repeatedly
 * across a range of a single swept scalar (e.g. mole fraction x), and
 * collect one CalculationResult per point.
 *
 * Not UI-specific and not binary-specific: `compositionAt` is the only
 * thing that knows how the swept scalar maps to a full Composition, so
 * this same utility works for a binary x -> {A:x, B:1-x} sweep today and
 * an n-ary sweep later without changing this file.
 */
export interface CompositionSweepRequest {
  start: number;
  end: number;
  step: number;
  modelId: string;
  conditions: Conditions;
  parameters?: Record<string, number>;
  requestedOutputs?: string[];
  /** Maps the swept scalar x to a full Composition, e.g. binary x -> {A: x, B: 1-x}. */
  compositionAt: (x: number) => Composition;
}

export interface CompositionSweepPoint {
  x: number;
  result: CalculationResult;
}

export interface CompositionSweepResult {
  points: CompositionSweepPoint[];
  /** Every point's result.warnings, concatenated, for a quick "did anything look off" check without walking every point. */
  warnings: string[];
}

/** How many decimal places `step` itself was written with, e.g. 0.01 -> 2. */
function decimalPlaces(step: number): number {
  const text = step.toString();
  if (text.includes("e") || text.includes("E")) return 10; // exponential notation fallback; generous but finite
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Rounds `value` to the precision implied by `step`. This is what keeps
 * externally-exposed composition values as clean decimals (e.g. `0.3`)
 * instead of float artifacts like `0.30000000000000004` — the rounding
 * target is derived from the step the caller actually asked for, not a
 * fixed/arbitrary digit count.
 */
function roundToStep(value: number, step: number): number {
  const factor = 10 ** decimalPlaces(step);
  return Math.round(value * factor) / factor;
}

export function runCompositionSweep(request: CompositionSweepRequest): CompositionSweepResult {
  const { start, end, step, modelId, conditions, parameters, requestedOutputs, compositionAt } = request;

  if (!Number.isFinite(step) || step <= 0) {
    throw new EngineError("INVALID_INPUT", `CompositionSweepRequest.step must be a finite number > 0, got ${step}.`);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new EngineError(
      "INVALID_INPUT",
      `CompositionSweepRequest.start and end must be finite numbers, got start=${start}, end=${end}.`,
    );
  }
  if (end < start) {
    throw new EngineError(
      "INVALID_INPUT",
      `CompositionSweepRequest.end (${end}) must be greater than or equal to start (${start}).`,
    );
  }

  // Index-based generation (x_i = start + i*step, i an integer), NOT
  // repeated addition (x += step) — repeated addition accumulates
  // floating-point error across iterations; this doesn't. The 1e-9
  // epsilon absorbs the float division noise in (end-start)/step (e.g.
  // 1/0.1 evaluating to 9.999999999999998) without masking a genuinely
  // non-integer number of steps (e.g. a step of 0.3 across [0,1] correctly
  // stops at 0.9, one step short of overshooting end).
  const pointCount = Math.floor((end - start) / step + 1e-9) + 1;

  const points: CompositionSweepPoint[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < pointCount; i++) {
    const x = roundToStep(start + i * step, step);
    const result = runCalculation({
      material: { composition: compositionAt(x) },
      modelId,
      conditions,
      parameters,
      requestedOutputs,
    });
    points.push({ x, result });
    warnings.push(...result.warnings);
  }

  return { points, warnings };
}
