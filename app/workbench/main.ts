/**
 * DOM controller for the generic Materials Physics Workbench
 * (workbench.html). Unlike app/main.ts (the classic, single-model Au-Cu
 * calculator, left untouched), this file drives *any* model registered in
 * the engine against *any* material system — it has no per-model or
 * per-system knowledge of its own; every piece of that comes from the
 * selected `ModelDefinition` and the material rows the user builds.
 *
 * This file contains no scientific equations. If you're about to write
 * one here, it belongs in an engine model instead.
 */
import {
  elements,
  isEngineError,
  QUASI_CHEMICAL_SCC0_MODEL_ID,
  runCalculation,
  runCompositionSweep,
  type Composition,
  type Conditions,
  type ModelDefinition,
} from "../../engine/index.js";
import type { ChartSeries } from "./chart.js";
import { drawLineChart } from "./chart.js";
import type { ConditionsFormHandle } from "./conditionsForm.js";
import { mountConditionsForm } from "./conditionsForm.js";
import { downloadCsv, toCsv } from "./csvExport.js";
import { buildMaterialResult, mountMaterialForm, type MaterialFormRow } from "./materialForm.js";
import { mountModelPicker } from "./modelPicker.js";
import type { ParameterFormHandle } from "./parameterForm.js";
import { mountParameterForm } from "./parameterForm.js";
import { renderResultsPanel } from "./resultsPanel.js";

const DEFAULT_ROWS: MaterialFormRow[] = [
  { symbol: "Au", fraction: 0.5 },
  { symbol: "Cu", fraction: 0.5 },
];

const CHART_COLORS = ["#008080", "#c05621", "#5a5adb", "#0a7a4a", "#a0355a"];

let selectedModel: ModelDefinition;
let conditionsFormHandle: ConditionsFormHandle;
let parameterFormHandle: ParameterFormHandle;
let materialRows: MaterialFormRow[] = DEFAULT_ROWS.map((row) => ({ ...row }));
let lastSweepRows: Record<string, unknown>[] = [];

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

function showError(message: string | null): void {
  const el = byId<HTMLElement>("error-message");
  el.textContent = message ?? "";
  el.style.display = message ? "block" : "none";
}

/** The Conditions fields the currently selected model actually declares (required + optional), for the dynamic conditions form. */
function conditionFieldKeysFor(model: ModelDefinition): Array<keyof Conditions> {
  const required = model.requiredInputs.filter((key): key is keyof Conditions => key !== "composition");
  return [...required, ...(model.optionalInputs ?? [])];
}

function renderConditionsAndParametersFor(model: ModelDefinition, initialParameterValues: Record<string, number> = {}): void {
  const fieldKeys = conditionFieldKeysFor(model);
  conditionsFormHandle = mountConditionsForm(byId("conditions-form"), {
    fieldKeys,
    initialValues: fieldKeys.includes("temperatureK") ? { temperatureK: 1550 } : {},
  });
  parameterFormHandle = mountParameterForm(byId("parameter-form"), model.requiredParameters, initialParameterValues);
}

/** Validates the current material rows and returns a Composition, or shows the validation error and returns null. */
function getMaterial(): Composition | null {
  const result = buildMaterialResult(materialRows, elements.ALL_ELEMENTS);
  if (!result.ok) {
    showError(result.issues.map((issue) => issue.message).join(" "));
    return null;
  }
  return result.composition;
}

export function calculate(): void {
  showError(null);
  const composition = getMaterial();
  if (!composition) return;

  try {
    const result = runCalculation({
      material: { composition },
      modelId: selectedModel.id,
      conditions: conditionsFormHandle.getConditions(),
      parameters: parameterFormHandle.getValues(),
    });
    renderResultsPanel(byId("results-panel"), result);
  } catch (error) {
    showError(isEngineError(error) ? error.message : String(error));
  }
}

export function sweepComposition(): void {
  showError(null);
  const composition = getMaterial();
  if (!composition) return;
  if (composition.components.length !== 2) {
    showError("Composition sweep requires a binary (2-component) material system.");
    return;
  }
  const componentA = composition.components[0]!;
  const componentB = composition.components[1]!;

  try {
    const sweep = runCompositionSweep({
      start: 0,
      end: 1,
      step: 0.1,
      modelId: selectedModel.id,
      conditions: conditionsFormHandle.getConditions(),
      parameters: parameterFormHandle.getValues(),
      compositionAt: (x) => ({
        basis: "mole_fraction",
        components: [
          { element: componentA.element, fraction: x },
          { element: componentB.element, fraction: 1 - x },
        ],
      }),
    });

    const series: ChartSeries[] = selectedModel.outputProperties.map((property, index) => ({
      label: property.name,
      color: CHART_COLORS[index % CHART_COLORS.length]!,
      points: sweep.points.map((point) => {
        const value = point.result.values[property.id];
        const scalar = Array.isArray(value) ? value[0]?.value : value?.value;
        return { x: point.x, y: scalar ?? 0 };
      }),
    }));

    drawLineChart(byId<HTMLCanvasElement>("workbench-chart"), series, {
      title: `${selectedModel.name} — composition sweep`,
      xLabel: `Mole fraction of ${componentA.element.symbol}`,
      yLabel: selectedModel.outputProperties[0]?.name ?? "",
    });

    lastSweepRows = sweep.points.map((point) => {
      const row: Record<string, unknown> = { x: point.x };
      for (const property of selectedModel.outputProperties) {
        const value = point.result.values[property.id];
        row[property.id] = Array.isArray(value) ? value.map((entry) => entry.value).join(";") : value?.value;
      }
      return row;
    });
    byId<HTMLButtonElement>("export-csv").disabled = lastSweepRows.length === 0;

    const lastPoint = sweep.points[sweep.points.length - 1];
    if (lastPoint) renderResultsPanel(byId("results-panel"), lastPoint.result);
  } catch (error) {
    showError(isEngineError(error) ? error.message : String(error));
  }
}

export function exportCsv(): void {
  if (lastSweepRows.length === 0) return;
  downloadCsv(`${selectedModel.id}-sweep.csv`, toCsv(lastSweepRows));
}

export function init(): void {
  materialRows = DEFAULT_ROWS.map((row) => ({ ...row }));
  lastSweepRows = [];

  mountMaterialForm(byId("material-form"), {
    elements: elements.ALL_ELEMENTS,
    initialRows: materialRows,
    onChange: (rows) => {
      materialRows = rows;
    },
  });

  const modelPickerHandle = mountModelPicker(byId("model-picker"), {
    initialModelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
    onChange: (model) => {
      selectedModel = model;
      renderConditionsAndParametersFor(model);
      byId<HTMLButtonElement>("export-csv").disabled = true;
      lastSweepRows = [];
    },
  });

  selectedModel = modelPickerHandle.getSelectedModel()!;
  // Seed the same defaults the classic Au-Cu calculator (app/main.ts) ships,
  // since this model is the default selection here too — every other model
  // starts with blank parameter/condition inputs (see the onChange above).
  renderConditionsAndParametersFor(
    selectedModel,
    selectedModel.id === QUASI_CHEMICAL_SCC0_MODEL_ID ? { Z: 10, W: -21500 } : {},
  );

  byId<HTMLButtonElement>("calculate-button").addEventListener("click", calculate);
  byId<HTMLButtonElement>("sweep-button").addEventListener("click", sweepComposition);
  byId<HTMLButtonElement>("export-csv").addEventListener("click", exportCsv);

  calculate();
}

window.addEventListener("DOMContentLoaded", init);
