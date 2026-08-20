// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { binaryComposition, elements, QUASI_CHEMICAL_SCC0_MODEL_ID, runCalculation } from "../../engine/index.js";
import { renderResultsPanel } from "./resultsPanel.js";

function runQcAtHalf() {
  return runCalculation({
    material: { composition: binaryComposition(elements.Au, 0.5, elements.Cu, 0.5) },
    modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
    conditions: { temperatureK: 1550 },
    parameters: { Z: 10, W: -21500 },
  });
}

describe("renderResultsPanel — real engine result end to end", () => {
  it("renders a values table row per output property, with its own name/value/unit", () => {
    const result = runQcAtHalf();
    const container = document.createElement("div");
    renderResultsPanel(container, result);

    const rows = [...container.querySelectorAll("table tr")].slice(1); // skip header
    expect(rows.length).toBe(result.outputProperties.length);

    const scc0Property = result.outputProperties.find((p) => p.id === "Scc0")!;
    const scc0Row = rows.find((row) => row.children[0]!.textContent === scc0Property.name)!;
    expect(scc0Row.children[2]!.textContent).toBe(scc0Property.unit);
  });

  it("renders the Model & Assumptions box from the result's own equations/assumptions/references", () => {
    const result = runQcAtHalf();
    const container = document.createElement("div");
    renderResultsPanel(container, result);

    const box = container.querySelector(".model-assumptions")!;
    expect(box.querySelector("h3")!.textContent).toBe(`Model: ${result.modelName}`);
    expect(box.textContent).toContain(result.metadata.numericalMethod);
    if (result.equations && result.equations.length > 0) {
      expect(box.textContent).toContain(result.equations[0]);
    }
  });

  it("renders parameter provenance for every user-supplied parameter", () => {
    const result = runQcAtHalf();
    const container = document.createElement("div");
    renderResultsPanel(container, result);

    const box = container.querySelector(".model-assumptions")!;
    expect(box.textContent).toContain("Z: user_supplied");
    expect(box.textContent).toContain("W: user_supplied");
  });

  it("omits the warnings section entirely when there are no warnings", () => {
    const result = runQcAtHalf();
    expect(result.warnings).toEqual([]);
    const container = document.createElement("div");
    renderResultsPanel(container, result);

    expect(container.querySelector(".warnings")).toBeNull();
  });

  it("clears previous content on re-render", () => {
    const result = runQcAtHalf();
    const container = document.createElement("div");
    container.innerHTML = "<p>stale content</p>";
    renderResultsPanel(container, result);

    expect(container.textContent).not.toContain("stale content");
  });
});
