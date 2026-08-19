import { EngineError } from "../core/Errors.js";
import type { PropertyDomain } from "../core/Property.js";
import type { ModelDefinition } from "./ModelDefinition.js";

/**
 * The plugin registry. This is the only place model instances are stored;
 * the pipeline and any future UI resolve models exclusively through this
 * module, by id — never by importing a model module directly. That
 * indirection is what lets a new model be added (see models/index.ts)
 * without touching the pipeline.
 */
const models = new Map<string, ModelDefinition>();

export function registerModel(model: ModelDefinition): void {
  if (models.has(model.id)) {
    throw new EngineError(
      "INVALID_INPUT",
      `A model is already registered under id "${model.id}".`,
      { modelId: model.id },
    );
  }
  models.set(model.id, model);
}

/** Returns the model or throws MODEL_NOT_FOUND — use this in the pipeline. */
export function resolveModel(modelId: string): ModelDefinition {
  const model = models.get(modelId);
  if (!model) {
    throw new EngineError("MODEL_NOT_FOUND", `No model is registered under id "${modelId}".`, {
      modelId,
      availableModelIds: [...models.keys()],
    });
  }
  return model;
}

/** Returns the model or undefined — use this for existence checks that shouldn't throw. */
export function getModel(modelId: string): ModelDefinition | undefined {
  return models.get(modelId);
}

export function listModels(domain?: PropertyDomain): ModelDefinition[] {
  const all = [...models.values()];
  return domain ? all.filter((model) => model.domain === domain) : all;
}

/** Test-only escape hatch: registration is otherwise permanent for the life of the process. */
export function clearRegistry(): void {
  models.clear();
}
