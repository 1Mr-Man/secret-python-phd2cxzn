/**
 * UI adapter for the Au–Cu Quasi-Chemical calculator screen.
 *
 * This is the only place in `app/` that knows about the engine's types
 * (CalculationRequest/Result, the model id, PhysicalQuantity). It turns
 * this screen's plain-number inputs (T, Z, W, a composition step) into
 * engine requests, runs them through `runCalculation`, and reshapes the
 * results into a small view-model (`QcSweepPoint`, `QcSweepResult`) that
 * `main.ts` can format into HTML/canvas without importing the engine or
 * knowing anything about CalculationRequest/Result shapes.
 *
 * No DOM access here — see engine/README.md and ARCHITECTURE.md for why
 * that boundary is drawn at this file, not inside the engine.
 */
import {
  binaryComposition,
  elements,
  runCalculation,
  QUASI_CHEMICAL_SCC0_MODEL_ID,
  type CalculationRequest,
  type PhysicalQuantity,
} from "../engine/index.js";

export interface QcSweepPoint {
  x: number;
  scc0: number;
  scc0Ideal: number;
}

export interface QcSweepResult {
  etaSquared: number;
  points: QcSweepPoint[];
}

function scalar(value: PhysicalQuantity | PhysicalQuantity[]): number {
  if (Array.isArray(value)) {
    throw new Error("Expected a scalar physical quantity, got an array.");
  }
  return value.value;
}

/** Builds one CalculationRequest for the Au–Cu Quasi-Chemical model at composition x. */
export function buildQcRequest(x: number, temperatureK: number, Z: number, W: number): CalculationRequest {
  return {
    material: { composition: binaryComposition(elements.Au, x, elements.Cu, 1 - x) },
    modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
    conditions: { temperatureK },
    parameters: { Z, W },
  };
}

/**
 * Sweeps composition the same way the original prototype's `calculate()`
 * did — same start/stop bounds and the same `toFixed(10)` rounding — but
 * gets each point's Scc(0)/ideal/η² from the engine instead of computing
 * them locally. One engine call per composition point.
 */
export function runQcSweep(temperatureK: number, Z: number, W: number, step: number): QcSweepResult {
  const points: QcSweepPoint[] = [];
  let etaSquared = 0;

  for (let x = step; x <= 1.000001; x += step) {
    const xRounded = Number(x.toFixed(10));
    const result = runCalculation(buildQcRequest(xRounded, temperatureK, Z, W));

    etaSquared = scalar(result.values.etaSquared!);
    points.push({
      x: xRounded,
      scc0: scalar(result.values.Scc0!),
      scc0Ideal: scalar(result.values.Scc0Ideal!),
    });
  }

  return { etaSquared, points };
}

/**
 * Fine-grained (sampleCount+1 point) ideal-solution curve for the smooth
 * dashed baseline on the chart — independent of the table's composition
 * step, same as the original prototype's 101-point loop in drawGraph().
 * Scc0Ideal doesn't depend on T/Z/W, but there is no standalone Ideal
 * Solution model yet (Phase 2), so it is read off the Quasi-Chemical
 * model's bundled ideal-baseline output rather than computed in the UI.
 */
export function computeIdealCurve(
  temperatureK: number,
  Z: number,
  W: number,
  sampleCount = 100,
): QcSweepPoint[] {
  const points: QcSweepPoint[] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const x = i / sampleCount;
    const result = runCalculation(buildQcRequest(x, temperatureK, Z, W));
    points.push({ x, scc0: scalar(result.values.Scc0!), scc0Ideal: scalar(result.values.Scc0Ideal!) });
  }

  return points;
}
