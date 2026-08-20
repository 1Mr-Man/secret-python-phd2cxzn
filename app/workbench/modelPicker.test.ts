// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { QUASI_CHEMICAL_SCC0_MODEL_ID, listModels, MIVM_BINARY_MODEL_ID } from "../../engine/index.js";
import { groupModelsByDomain, mountModelPicker } from "./modelPicker.js";

describe("groupModelsByDomain — pure grouping", () => {
  it("groups every currently-registered model under 'thermodynamic' (no other domain has a model yet)", () => {
    const groups = groupModelsByDomain(listModels());
    expect(groups).toHaveLength(1);
    expect(groups[0]!.domain).toBe("thermodynamic");
    expect(groups[0]!.models.length).toBeGreaterThanOrEqual(4); // ideal, regular, quasi-chemical, mivm
  });
});

describe("mountModelPicker — DOM wiring", () => {
  it("renders one <option> per registered model and pre-selects the requested default", () => {
    const container = document.createElement("div");
    const handle = mountModelPicker(container, {
      initialModelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
      onChange: () => {},
    });

    const select = container.querySelector('select[data-role="model-select"]') as HTMLSelectElement;
    expect(select.querySelectorAll("option").length).toBe(listModels().length);
    expect(handle.getSelectedModel()?.id).toBe(QUASI_CHEMICAL_SCC0_MODEL_ID);
  });

  it("selecting a different model in the <select> fires onChange with that model", () => {
    const container = document.createElement("div");
    const seen: string[] = [];
    mountModelPicker(container, {
      initialModelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
      onChange: (model) => seen.push(model.id),
    });

    const select = container.querySelector("select") as HTMLSelectElement;
    select.value = MIVM_BINARY_MODEL_ID;
    select.dispatchEvent(new Event("change"));

    expect(seen).toEqual([MIVM_BINARY_MODEL_ID]);
  });

  it("setSelectedModelId updates the <select> value and fires onChange", () => {
    const container = document.createElement("div");
    const seen: string[] = [];
    const handle = mountModelPicker(container, {
      initialModelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
      onChange: (model) => seen.push(model.id),
    });

    handle.setSelectedModelId(MIVM_BINARY_MODEL_ID);

    expect(seen).toEqual([MIVM_BINARY_MODEL_ID]);
    expect((container.querySelector("select") as HTMLSelectElement).value).toBe(MIVM_BINARY_MODEL_ID);
  });
});
