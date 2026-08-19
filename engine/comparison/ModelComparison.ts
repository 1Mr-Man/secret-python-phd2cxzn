import type { CalculationRequest, CalculationResult } from "../core/Calculation.js";
import type { Conditions } from "../core/Conditions.js";
import type { EngineErrorCode } from "../core/Errors.js";
import { isEngineError } from "../core/Errors.js";
import type { Material } from "../core/Material.js";
import { runCalculation } from "../pipeline/CalculationPipeline.js";

/**
 * Runs the SAME material/conditions through an arbitrary list of
 * registered models and returns one result per model.
 *
 * This file contains no scientific equations — it only calls
 * runCalculation() once per requested model id and collects what comes
 * back. Each model remains solely responsible for its own math; adding a
 * new model to a comparison is passing its id in `modelIds`, never editing
 * this file.
 *
 * Unlike runCalculation() and runCompositionSweep() (both fail-fast on a
 * structural problem), a comparison keeps going per model: an unknown or
 * inapplicable model produces an `error` entry rather than aborting the
 * whole comparison, so results for the OTHER requested models are still
 * returned. That's deliberate — comparing N independent models means one
 * model's failure shouldn't hide the other N-1 results.
 */

export interface ModelComparisonRequest {
  material: Material;
  conditions: Conditions;
  /** Any registered model ids, in any combination — nothing here is hardcoded to Ideal/Regular/Quasi-Chemical. */
  modelIds: string[];
  /** Per-model parameter overrides, keyed by modelId. */
  parametersByModel?: Record<string, Record<string, number>>;
  requestedOutputs?: string[];
}

export interface ModelComparisonEntry {
  modelId: string;
  result?: CalculationResult;
  error?: { code: EngineErrorCode; message: string };
}

export interface ModelComparisonResult {
  material: Material;
  conditions: Conditions;
  entries: ModelComparisonEntry[];
}

export function compareModels(request: ModelComparisonRequest): ModelComparisonResult {
  const entries: ModelComparisonEntry[] = request.modelIds.map((modelId) => {
    const calculationRequest: CalculationRequest = {
      material: request.material,
      modelId,
      conditions: request.conditions,
      parameters: request.parametersByModel?.[modelId],
      requestedOutputs: request.requestedOutputs,
    };

    try {
      return { modelId, result: runCalculation(calculationRequest) };
    } catch (error) {
      if (isEngineError(error)) {
        return { modelId, error: { code: error.code, message: error.message } };
      }
      // A non-EngineError here is an unexpected bug, not an expected
      // per-model failure mode — let it propagate rather than masking it.
      throw error;
    }
  });

  return { material: request.material, conditions: request.conditions, entries };
}
