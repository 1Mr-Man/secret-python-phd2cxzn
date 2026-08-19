import { EngineError } from "../core/Errors.js";
import type { ParameterSource } from "../core/ParameterSource.js";
import type { ParameterResolutionResult } from "./resolve.js";

export interface RequestParameters {
  parameters: Record<string, number>;
  parameterSources: Record<string, ParameterSource>;
}

/**
 * Converts a successful (FOUND or PROVISIONAL) ParameterResolutionResult
 * into the `{ parameters, parameterSources }` shape `CalculationRequest`
 * expects — mechanizing the manual copy Phase 2C's end-to-end test did by
 * hand, so a caller can no longer forget to carry provenance through from
 * a resolved parameter set into an actual calculation.
 *
 * Throws (rather than silently returning an empty/partial object) for any
 * other resolution status — NOT_FOUND, OUT_OF_RANGE, and AMBIGUOUS all
 * mean there is no single resolved set to convert, and building a
 * CalculationRequest from one of those would either fabricate parameters
 * or silently pick among competing sources. A caller must resolve those
 * cases explicitly (e.g. via `preferredSetId`) before calling this.
 */
export function toRequestParameters(
  resolution: ParameterResolutionResult,
  requiredKeys?: string[],
): RequestParameters {
  if (resolution.status !== "FOUND" && resolution.status !== "PROVISIONAL") {
    throw new EngineError(
      "INVALID_INPUT",
      `toRequestParameters requires a FOUND or PROVISIONAL resolution result; got "${resolution.status}". ${resolution.message}`,
      { status: resolution.status },
    );
  }

  const set = resolution.parameterSet!;

  // Defense-in-depth (Phase 2D safety review): set-level `compatibility`
  // is authoritative (Correction 1) — a source that cannot be used by this
  // model in its current form must never reach a CalculationRequest, even
  // if upstream data was registered without first running
  // validateParameterSet. This is this module's own check, independent of
  // resolve.ts, so a blocked/incompatible set is refused here regardless
  // of what a resolver (present or future) decided.
  if (set.compatibility === "requires_explicit_transformation" || set.compatibility === "not_compatible") {
    throw new EngineError(
      "INVALID_INPUT",
      `toRequestParameters refuses to convert parameter set "${set.setId}": its compatibility is "${set.compatibility}", which can never contain a directly usable value.`,
      { setId: set.setId, compatibility: set.compatibility },
    );
  }

  const relevant = requiredKeys ? set.parameters.filter((parameter) => requiredKeys.includes(parameter.key)) : set.parameters;

  const parameters: Record<string, number> = {};
  const parameterSources: Record<string, ParameterSource> = {};

  for (const parameter of relevant) {
    // A parameter with no usable value is skipped, never fabricated — see
    // engine/parameters/types.ts's ParameterStatus docs. Checked by BOTH
    // status and value (not value alone) as defense-in-depth: an
    // "unavailable" parameter must never be treated as usable even if it
    // were to carry a stray value due to an upstream data bug.
    if (parameter.status === "unavailable" || parameter.value === undefined) continue;
    parameters[parameter.key] = parameter.value;
    parameterSources[parameter.key] = parameter.source;
  }

  return { parameters, parameterSources };
}
