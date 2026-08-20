// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { ModelParameterSpec } from "../../engine/index.js";
import { mountParameterForm } from "./parameterForm.js";

const SPECS: ModelParameterSpec[] = [
  { key: "Z", name: "Coordination number Z", unit: "dimensionless", description: "First coordination number." },
  { key: "W", name: "Interchange energy W", unit: "J/mol" },
];

describe("mountParameterForm — DOM wiring", () => {
  it("renders one input per parameter spec, labeled with name and unit", () => {
    const container = document.createElement("div");
    mountParameterForm(container, SPECS);

    const inputs = container.querySelectorAll("input[data-parameter-key]");
    expect(inputs).toHaveLength(2);

    const labels = [...container.querySelectorAll("label")].map((l) => l.textContent);
    expect(labels).toEqual(["Coordination number Z (dimensionless)", "Interchange energy W (J/mol)"]);
  });

  it("seeds inputs from initialValues where a key matches, leaves the rest blank", () => {
    const container = document.createElement("div");
    mountParameterForm(container, SPECS, { Z: 10 });

    const zInput = container.querySelector('input[data-parameter-key="Z"]') as HTMLInputElement;
    const wInput = container.querySelector('input[data-parameter-key="W"]') as HTMLInputElement;
    expect(zInput.value).toBe("10");
    expect(wInput.value).toBe("");
  });

  it("getValues reads the current numeric value of every input, keyed by parameter key", () => {
    const container = document.createElement("div");
    const handle = mountParameterForm(container, SPECS, { Z: 10, W: -21500 });

    expect(handle.getValues()).toEqual({ Z: 10, W: -21500 });

    (container.querySelector('input[data-parameter-key="W"]') as HTMLInputElement).value = "-30000";
    expect(handle.getValues()).toEqual({ Z: 10, W: -30000 });
  });

  it("renders nothing for a model with zero required parameters", () => {
    const container = document.createElement("div");
    const handle = mountParameterForm(container, []);
    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(handle.getValues()).toEqual({});
  });
});
