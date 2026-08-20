/**
 * Renders one labeled numeric input per entry in a model's own
 * `requiredParameters` (`ModelParameterSpec[]`) — whatever the selected
 * model declares it needs (W/Z for Quasi-Chemical, B_ij/B_ji/Z_i/Z_j/
 * V_mi/V_mj for MIVM, etc.). This file has no per-model knowledge; it
 * only reads the spec the model already carries.
 */
import type { ModelParameterSpec } from "../../engine/index.js";

export interface ParameterFormHandle {
  getValues(): Record<string, number>;
}

/** DOM: renders the parameter inputs into `container`, seeded from `initialValues` where a key matches. */
export function mountParameterForm(
  container: HTMLElement,
  parameters: ModelParameterSpec[],
  initialValues: Record<string, number> = {},
): ParameterFormHandle {
  container.innerHTML = "";
  const inputs = new Map<string, HTMLInputElement>();

  for (const spec of parameters) {
    const wrapper = document.createElement("div");

    const label = document.createElement("label");
    label.textContent = `${spec.name} (${spec.unit})`;
    if (spec.description) label.title = spec.description;
    wrapper.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.dataset.parameterKey = spec.key;
    const initial = initialValues[spec.key];
    input.value = initial === undefined ? "" : String(initial);
    wrapper.appendChild(input);

    container.appendChild(wrapper);
    inputs.set(spec.key, input);
  }

  return {
    getValues: () => {
      const values: Record<string, number> = {};
      for (const [key, input] of inputs) {
        values[key] = Number(input.value);
      }
      return values;
    },
  };
}
