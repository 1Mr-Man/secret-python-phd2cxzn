// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { elements } from "../../engine/index.js";
import { buildMaterialResult, mountMaterialForm, type MaterialFormRow } from "./materialForm.js";

const ALL = elements.ALL_ELEMENTS;

describe("buildMaterialResult — pure composition building", () => {
  it("builds a valid Composition for a well-formed binary row set", () => {
    const rows: MaterialFormRow[] = [
      { symbol: "Au", fraction: 0.5 },
      { symbol: "Cu", fraction: 0.5 },
    ];
    const result = buildMaterialResult(rows, ALL);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.composition.components).toHaveLength(2);
      expect(result.composition.components[0]!.element.symbol).toBe("Au");
    }
  });

  it("builds a valid Composition for a ternary row set", () => {
    const rows: MaterialFormRow[] = [
      { symbol: "Fe", fraction: 0.5 },
      { symbol: "Ni", fraction: 0.3 },
      { symbol: "Cr", fraction: 0.2 },
    ];
    const result = buildMaterialResult(rows, ALL);
    expect(result.ok).toBe(true);
  });

  it("flags an unknown element symbol without touching validateComposition", () => {
    const rows: MaterialFormRow[] = [
      { symbol: "Au", fraction: 0.5 },
      { symbol: "Xx", fraction: 0.5 },
    ];
    const result = buildMaterialResult(rows, ALL);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]!.message).toContain("Xx");
    }
  });

  it("flags fractions that don't sum to 1, via the engine's own validateComposition", () => {
    const rows: MaterialFormRow[] = [
      { symbol: "Au", fraction: 0.5 },
      { symbol: "Cu", fraction: 0.2 },
    ];
    const result = buildMaterialResult(rows, ALL);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]!.code).toBe("INVALID_COMPOSITION");
    }
  });
});

describe("mountMaterialForm — DOM wiring", () => {
  function setup(initialRows: MaterialFormRow[]) {
    const container = document.createElement("div");
    const changes: MaterialFormRow[][] = [];
    const handle = mountMaterialForm(container, {
      elements: ALL,
      initialRows,
      onChange: (rows) => changes.push(rows),
    });
    return { container, changes, handle };
  }

  it("renders one row per initial component", () => {
    const { container } = setup([
      { symbol: "Au", fraction: 0.5 },
      { symbol: "Cu", fraction: 0.5 },
    ]);
    expect(container.querySelectorAll('select[data-role="element-symbol"]')).toHaveLength(2);
    expect(container.querySelectorAll('input[data-role="fraction"]')).toHaveLength(2);
  });

  it("+ Add Component adds a row and notifies onChange", () => {
    const { container, changes } = setup([{ symbol: "Au", fraction: 1 }]);
    const addButton = [...container.querySelectorAll("button")].find((b) => b.textContent === "+ Add Component")!;
    addButton.click();

    expect(container.querySelectorAll('select[data-role="element-symbol"]')).toHaveLength(2);
    expect(changes.at(-1)).toHaveLength(2);
  });

  it("Remove is disabled on the last remaining row", () => {
    const { container } = setup([{ symbol: "Au", fraction: 1 }]);
    const removeButton = container.querySelector("button")!;
    expect(removeButton.disabled).toBe(true);
  });

  it("editing a fraction input notifies onChange with the new value", () => {
    const { container, changes } = setup([
      { symbol: "Au", fraction: 0.5 },
      { symbol: "Cu", fraction: 0.5 },
    ]);
    const input = container.querySelector('input[data-role="fraction"]') as HTMLInputElement;
    input.value = "0.7";
    input.dispatchEvent(new Event("input"));

    expect(changes.at(-1)![0]!.fraction).toBe(0.7);
  });

  it("getRows/setRows round-trip and re-render", () => {
    const { handle, container } = setup([{ symbol: "Au", fraction: 1 }]);
    handle.setRows([
      { symbol: "Fe", fraction: 0.6 },
      { symbol: "Ni", fraction: 0.4 },
    ]);
    expect(handle.getRows()).toEqual([
      { symbol: "Fe", fraction: 0.6 },
      { symbol: "Ni", fraction: 0.4 },
    ]);
    expect(container.querySelectorAll('select[data-role="element-symbol"]')).toHaveLength(2);
  });
});
