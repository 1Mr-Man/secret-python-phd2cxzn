import { canonicalizeSystemLabel } from "../core/SystemIdentity.js";
import type { ParameterSet } from "./types.js";

/**
 * A small in-memory (model, system) -> ParameterSet[] lookup — deliberately
 * NOT a database. Nothing is pre-registered here: this project has no
 * verified literature source for the Au-Cu W/Z values used elsewhere (they
 * are user-supplied demo inputs, not sourced constants), and inventing one
 * would be worse than having none. A future phase can populate this from a
 * real, cited dataset without changing any of the surrounding API.
 *
 * Storage is keyed by (modelId, CANONICAL system id) — see
 * core/SystemIdentity.ts. Registering a set under "Cu-Au" and looking it
 * up under "Au-Cu" (or vice versa) finds the same entry, because a
 * literature W value for the Au-Cu system is the same physical quantity
 * regardless of which element a caller lists first. The stored
 * `ParameterSet.system` field itself is left exactly as the registrant
 * wrote it (not overwritten to canonical form) so that information isn't
 * lost — only the lookup key is canonicalized.
 *
 * More than one ParameterSet can be registered under the same
 * (modelId, system) key — e.g. two literature sources both reporting W
 * for Au-Cu. `registerParameterSet` appends; `findParameterSet` stays
 * backward compatible (returns the first registered set, matching every
 * caller's existing single-set assumption); `findAllParameterSets`
 * exposes the full list, which is what the resolver (resolve.ts) uses to
 * detect ambiguity rather than silently picking one.
 */
const store = new Map<string, ParameterSet[]>();

function key(modelId: string, system: string): string {
  return `${modelId}::${canonicalizeSystemLabel(system)}`;
}

/** Throws if a set with the same setId is already registered under this (modelId, system) key — registration is additive, not silently overwriting. */
export function registerParameterSet(set: ParameterSet): void {
  const mapKey = key(set.modelId, set.system);
  const existing = store.get(mapKey) ?? [];

  if (existing.some((registered) => registered.setId === set.setId)) {
    throw new Error(
      `A parameter set with id "${set.setId}" is already registered for model "${set.modelId}" and system "${set.system}".`,
    );
  }

  store.set(mapKey, [...existing, set]);
}

/**
 * Returns the first registered set for (modelId, system), or undefined.
 * Kept for backward compatibility with callers that assume at most one
 * set exists — use `findAllParameterSets` or `resolveParameterSet`
 * (resolve.ts) wherever more than one set might apply and picking "the
 * first one" without checking would silently hide an ambiguity.
 */
export function findParameterSet(modelId: string, system: string): ParameterSet | undefined {
  return store.get(key(modelId, system))?.[0];
}

/** Every set registered for (modelId, system), in registration order. Empty array if none. */
export function findAllParameterSets(modelId: string, system: string): ParameterSet[] {
  return store.get(key(modelId, system)) ?? [];
}

/**
 * Flattens a ParameterSet into the plain `Record<string, number>` shape
 * CalculationRequest.parameters expects. Parameters with no numeric value
 * (status "unavailable") are skipped, never coerced to a fake number —
 * check `resolveParameterSet`'s status first rather than calling this on
 * an unresolved/ambiguous/out-of-range set.
 */
export function toParameterRecord(set: ParameterSet): Record<string, number> {
  return Object.fromEntries(
    set.parameters
      .filter((parameter): parameter is typeof parameter & { value: number } => parameter.value !== undefined)
      .map((parameter) => [parameter.key, parameter.value]),
  );
}

/** Test-only escape hatch, mirroring models/registry.ts's clearRegistry(). */
export function clearParameterStore(): void {
  store.clear();
}
