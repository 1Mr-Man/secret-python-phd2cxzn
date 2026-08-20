/**
 * The Workbench's model picker: lists every model actually registered in
 * `engine/models/registry.ts` (via `listModels()`), grouped by
 * `PropertyDomain`. Adding a new model anywhere in the engine makes it
 * show up here automatically — this file has no per-model knowledge and
 * must never hardcode a model id list.
 */
import { listModels, type ModelDefinition, type PropertyDomain } from "../../engine/index.js";

/** Fixed display order for domains that exist; domains with zero registered models are simply absent from the grouping. */
const DOMAIN_ORDER: PropertyDomain[] = [
  "thermodynamic",
  "magnetic",
  "structural",
  "surface",
  "optical",
  "electrical",
  "mechanical_strain",
  "other",
];

export function groupModelsByDomain(models: ModelDefinition[]): Array<{ domain: PropertyDomain; models: ModelDefinition[] }> {
  const byDomain = new Map<PropertyDomain, ModelDefinition[]>();
  for (const model of models) {
    const group = byDomain.get(model.domain) ?? [];
    group.push(model);
    byDomain.set(model.domain, group);
  }
  return DOMAIN_ORDER.filter((domain) => byDomain.has(domain)).map((domain) => ({ domain, models: byDomain.get(domain)! }));
}

export interface ModelPickerHandle {
  getSelectedModel(): ModelDefinition | undefined;
  setSelectedModelId(modelId: string): void;
}

export interface ModelPickerOptions {
  initialModelId: string;
  onChange: (model: ModelDefinition) => void;
}

/** DOM: renders a `<select>` (grouped by domain via `<optgroup>`) sourced from the live registry. */
export function mountModelPicker(container: HTMLElement, options: ModelPickerOptions): ModelPickerHandle {
  const models = listModels();
  const groups = groupModelsByDomain(models);
  const byId = new Map(models.map((model) => [model.id, model]));

  container.innerHTML = "";
  const select = document.createElement("select");
  select.dataset.role = "model-select";

  for (const group of groups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.domain;
    for (const model of group.models) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      option.selected = model.id === options.initialModelId;
      optgroup.appendChild(option);
    }
    select.appendChild(optgroup);
  }

  select.addEventListener("change", () => {
    const model = byId.get(select.value);
    if (model) options.onChange(model);
  });

  container.appendChild(select);

  return {
    getSelectedModel: () => byId.get(select.value),
    setSelectedModelId: (modelId) => {
      if (!byId.has(modelId)) return;
      select.value = modelId;
      const model = byId.get(modelId);
      if (model) options.onChange(model);
    },
  };
}
