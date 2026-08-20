// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mountConditionsForm } from "./conditionsForm.js";

describe("mountConditionsForm — DOM wiring", () => {
  it("renders only the fields a model declared, in a fixed order", () => {
    const container = document.createElement("div");
    mountConditionsForm(container, { fieldKeys: ["temperatureK", "strain"] });

    const keys = [...container.querySelectorAll("[data-condition-key]")].map((el) => el.getAttribute("data-condition-key"));
    expect(keys).toEqual(["temperatureK", "strain"]);
  });

  it("omits pressure/magnetic/electric/strain entirely when not declared", () => {
    const container = document.createElement("div");
    mountConditionsForm(container, { fieldKeys: ["temperatureK"] });
    expect(container.querySelectorAll("[data-condition-key]")).toHaveLength(1);
  });

  it("seeds initial values and getConditions reads them back as a typed Conditions object", () => {
    const container = document.createElement("div");
    const handle = mountConditionsForm(container, {
      fieldKeys: ["temperatureK", "pressurePa"],
      initialValues: { temperatureK: 1550, pressurePa: 101325 },
    });

    expect(handle.getConditions()).toEqual({ temperatureK: 1550, pressurePa: 101325 });
  });

  it("builds a scalar StrainState from the strain input", () => {
    const container = document.createElement("div");
    const handle = mountConditionsForm(container, { fieldKeys: ["strain"], initialValues: { strain: 0.02 } });

    expect(handle.getConditions()).toEqual({ strain: { kind: "scalar", value: 0.02 } });
  });

  it("omits a field from the returned Conditions when its input is left blank", () => {
    const container = document.createElement("div");
    const handle = mountConditionsForm(container, { fieldKeys: ["temperatureK", "magneticFieldTeslas"] });

    expect(handle.getConditions()).toEqual({});
  });
});
