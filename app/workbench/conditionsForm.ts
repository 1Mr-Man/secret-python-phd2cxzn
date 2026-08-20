/**
 * Renders inputs for whichever `Conditions` fields a model actually asks
 * for (via `requiredInputs`/`optionalInputs`), instead of the old
 * calculator's one hardcoded temperature field. `strain` gets its own
 * scalar input (the `StrainState` tensor form is out of scope for this
 * generic form — a model that needs a tensor can still be driven directly
 * via the engine API).
 */
import type { Conditions } from "../../engine/index.js";

type SimpleConditionKey = "temperatureK" | "pressurePa" | "magneticFieldTeslas" | "electricFieldVPerM";

const FIELD_DEFS: Array<{ key: SimpleConditionKey; label: string; unit: string }> = [
  { key: "temperatureK", label: "Temperature", unit: "K" },
  { key: "pressurePa", label: "Pressure", unit: "Pa" },
  { key: "magneticFieldTeslas", label: "Magnetic field", unit: "T" },
  { key: "electricFieldVPerM", label: "Electric field", unit: "V/m" },
];

export interface ConditionsFormHandle {
  getConditions(): Conditions;
}

export interface ConditionsFormOptions {
  /** The union of a model's requiredInputs (minus "composition") and optionalInputs. */
  fieldKeys: Array<keyof Conditions>;
  initialValues?: Partial<Record<SimpleConditionKey, number>> & { strain?: number };
}

/** DOM: renders only the condition inputs a model actually declared, into `container`. */
export function mountConditionsForm(container: HTMLElement, options: ConditionsFormOptions): ConditionsFormHandle {
  container.innerHTML = "";
  const inputs = new Map<SimpleConditionKey, HTMLInputElement>();
  let strainInput: HTMLInputElement | undefined;

  for (const def of FIELD_DEFS) {
    if (!options.fieldKeys.includes(def.key)) continue;

    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = `${def.label} (${def.unit})`;
    wrapper.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.dataset.conditionKey = def.key;
    const initial = options.initialValues?.[def.key];
    input.value = initial === undefined ? "" : String(initial);
    wrapper.appendChild(input);

    container.appendChild(wrapper);
    inputs.set(def.key, input);
  }

  if (options.fieldKeys.includes("strain")) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = "Linear strain ε (dimensionless)";
    wrapper.appendChild(label);

    strainInput = document.createElement("input");
    strainInput.type = "number";
    strainInput.step = "any";
    strainInput.dataset.conditionKey = "strain";
    const initial = options.initialValues?.strain;
    strainInput.value = initial === undefined ? "" : String(initial);
    wrapper.appendChild(strainInput);

    container.appendChild(wrapper);
  }

  return {
    getConditions: () => {
      const conditions: Conditions = {};

      const temperature = inputs.get("temperatureK");
      if (temperature && temperature.value !== "") conditions.temperatureK = Number(temperature.value);

      const pressure = inputs.get("pressurePa");
      if (pressure && pressure.value !== "") conditions.pressurePa = Number(pressure.value);

      const magneticField = inputs.get("magneticFieldTeslas");
      if (magneticField && magneticField.value !== "") conditions.magneticFieldTeslas = Number(magneticField.value);

      const electricField = inputs.get("electricFieldVPerM");
      if (electricField && electricField.value !== "") conditions.electricFieldVPerM = Number(electricField.value);

      if (strainInput && strainInput.value !== "") {
        conditions.strain = { kind: "scalar", value: Number(strainInput.value) };
      }

      return conditions;
    },
  };
}
