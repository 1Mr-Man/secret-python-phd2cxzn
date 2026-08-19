import type { Conditions } from "../core/Conditions.js";
import type { Composition } from "../core/Material.js";
import { identifySystem } from "../core/SystemIdentity.js";
import { findAllParameterSets } from "./parameterStore.js";
import type { ParameterSet } from "./types.js";

/**
 * FOUND        — exactly one applicable, non-provisional set with usable values.
 * PROVISIONAL  — exactly one applicable set, but at least one of its values isn't independently verified.
 * NOT_FOUND    — no set is registered for this (model, canonical system), or every registered set has no usable value.
 * OUT_OF_RANGE — set(s) exist for this (model, system) but none cover the requested temperature/composition.
 * AMBIGUOUS    — more than one set applies — the resolver refuses to silently pick one.
 */
export type ParameterResolutionStatus = "FOUND" | "NOT_FOUND" | "OUT_OF_RANGE" | "PROVISIONAL" | "AMBIGUOUS";

export interface ParameterResolutionQuery {
  modelId: string;
  composition: Composition;
  conditions?: Conditions;
  /**
   * If given, a set only counts as usable when it has a defined,
   * non-"unavailable" value for every one of these keys (e.g. `["W"]` for
   * Regular Solution). Omit to just check "does this set have any usable
   * value at all" — useful for a generic "what's registered" query.
   */
  requiredKeys?: string[];
}

export interface ParameterResolutionResult {
  status: ParameterResolutionStatus;
  /** The canonical system id this query resolved against — see core/SystemIdentity.ts. */
  canonicalSystemId: string;
  /** Present only when status is FOUND or PROVISIONAL: the single resolved set. */
  parameterSet?: ParameterSet;
  /** Present only when status is AMBIGUOUS: every set that applies — resolve explicitly by setId rather than guessing. */
  candidates?: ParameterSet[];
  /** Present only when status is OUT_OF_RANGE: the registered set(s) that exist but don't cover this query. */
  outOfRangeSets?: ParameterSet[];
  message: string;
}

function isWithinRange(value: number | undefined, range: [number, number] | undefined): boolean {
  if (range === undefined) return true; // no stated range = unrestricted
  if (value === undefined) return true; // nothing to check the range against
  return value >= range[0] && value <= range[1];
}

function setCoversQuery(set: ParameterSet, temperatureK: number | undefined, x: number | undefined): boolean {
  return (
    isWithinRange(temperatureK, set.validTemperatureRangeK) &&
    isWithinRange(x, set.validCompositionRangeMoleFraction)
  );
}

function hasUsableValue(set: ParameterSet, requiredKeys?: string[]): boolean {
  const isUsable = (key: string) => {
    const parameter = set.parameters.find((candidate) => candidate.key === key);
    return parameter !== undefined && parameter.status !== "unavailable" && parameter.value !== undefined;
  };

  if (requiredKeys && requiredKeys.length > 0) {
    return requiredKeys.every(isUsable);
  }
  return set.parameters.some((parameter) => parameter.status !== "unavailable" && parameter.value !== undefined);
}

/**
 * Given a model, a material system (as a Composition, so ordering doesn't
 * matter — see core/SystemIdentity.ts), and optionally conditions, decides
 * whether an applicable, unambiguous parameter set exists. Never silently
 * picks between competing sets and never fabricates a value: the only
 * numbers this function can return are ones already registered via
 * `registerParameterSet`.
 *
 * Contains no scientific equations and is not specific to any one model —
 * the same function resolves Regular Solution's W or a future MIVM
 * model's parameters identically.
 */
export function resolveParameterSet(query: ParameterResolutionQuery): ParameterResolutionResult {
  const { modelId, composition, conditions, requiredKeys } = query;
  const canonicalSystemId = identifySystem(composition).canonicalId;

  const allSets = findAllParameterSets(modelId, canonicalSystemId);
  const usableSets = allSets.filter((set) => hasUsableValue(set, requiredKeys));

  if (usableSets.length === 0) {
    return {
      status: "NOT_FOUND",
      canonicalSystemId,
      message:
        allSets.length === 0
          ? `No parameter set is registered for model "${modelId}" and system "${canonicalSystemId}".`
          : `${allSets.length} parameter set(s) are registered for model "${modelId}" and system "${canonicalSystemId}", but none has a usable (non-"unavailable") value${requiredKeys ? ` for: ${requiredKeys.join(", ")}` : ""}.`,
    };
  }

  const temperatureK = conditions?.temperatureK;
  const x = composition.components[0]?.fraction;

  const inRange = usableSets.filter((set) => setCoversQuery(set, temperatureK, x));
  const outOfRange = usableSets.filter((set) => !setCoversQuery(set, temperatureK, x));

  if (inRange.length === 0) {
    return {
      status: "OUT_OF_RANGE",
      canonicalSystemId,
      outOfRangeSets: outOfRange,
      message: `${outOfRange.length} parameter set(s) exist for model "${modelId}" and system "${canonicalSystemId}", but none cover the requested temperature/composition.`,
    };
  }

  if (inRange.length > 1) {
    return {
      status: "AMBIGUOUS",
      canonicalSystemId,
      candidates: inRange,
      message: `${inRange.length} applicable parameter sets exist for model "${modelId}" and system "${canonicalSystemId}" (${inRange
        .map((set) => set.setId)
        .join(", ")}) — resolve explicitly by setId instead of guessing.`,
    };
  }

  const resolved = inRange[0]!;
  const relevantParameters = requiredKeys
    ? resolved.parameters.filter((parameter) => requiredKeys.includes(parameter.key))
    : resolved.parameters;
  const hasProvisional = relevantParameters.some((parameter) => parameter.status === "provisional");

  if (hasProvisional) {
    return {
      status: "PROVISIONAL",
      canonicalSystemId,
      parameterSet: resolved,
      message: `Parameter set "${resolved.setId}" for model "${modelId}" and system "${canonicalSystemId}" contains at least one provisional (not independently verified) value.`,
    };
  }

  return {
    status: "FOUND",
    canonicalSystemId,
    parameterSet: resolved,
    message: `Resolved parameter set "${resolved.setId}" for model "${modelId}" and system "${canonicalSystemId}".`,
  };
}
