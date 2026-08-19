import type { ParameterSet } from "./types.js";

/**
 * A small in-memory (model, system) -> ParameterSet lookup — deliberately
 * NOT a database. Nothing is pre-registered here: this project has no
 * verified literature source for the Au-Cu W/Z values used elsewhere (they
 * are user-supplied demo inputs, not sourced constants), and Phase 2A's
 * brief is explicit that inventing one would be worse than having none.
 * A future phase can populate this from a real, cited dataset without
 * changing any of the surrounding API.
 */
const store = new Map<string, ParameterSet>();

function key(modelId: string, system: string): string {
  return `${modelId}::${system}`;
}

export function registerParameterSet(set: ParameterSet): void {
  store.set(key(set.modelId, set.system), set);
}

export function findParameterSet(modelId: string, system: string): ParameterSet | undefined {
  return store.get(key(modelId, system));
}

/** Flattens a ParameterSet into the plain `Record<string, number>` shape CalculationRequest.parameters expects. */
export function toParameterRecord(set: ParameterSet): Record<string, number> {
  return Object.fromEntries(set.parameters.map((parameter) => [parameter.key, parameter.value]));
}

/** Test-only escape hatch, mirroring models/registry.ts's clearRegistry(). */
export function clearParameterStore(): void {
  store.clear();
}
