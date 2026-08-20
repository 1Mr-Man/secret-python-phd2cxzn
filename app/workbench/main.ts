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
import { parseCsv, type CsvParseResult } from "./csvImport.js";
import { buildMaterialResult, mountMaterialForm, type MaterialFormRow } from "./materialForm.js";
import { mountModelPicker } from "./modelPicker.js";
import type { ParameterFormHandle } from "./parameterForm.js";
import { mountParameterForm } from "./parameterForm.js";
import { renderResultsPanel } from "./resultsPanel.js";

const DEFAULT_ROWS: MaterialFormRow[] = [
  { symbol: "Au", fraction: 0.5 },
  { symbol: "Cu", fraction: 0.5 },
];

const CHART_COLOR = "#008080";

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

/**
 * Repopulates the "plot property" selector from the given model's own
 * outputProperties. The chart only ever plots ONE property at a time (see
 * sweepComposition below) — a model like MIVM has outputs spanning
 * different units (GmE in J/mol vs. five dimensionless ratios), and mixing
 * them on one Y-axis would be a scientifically meaningless chart, not
 * just an ugly one.
 */
function renderChartPropertySelectFor(model: ModelDefinition): void {
  const select = byId<HTMLSelectElement>("chart-property-select");
  select.innerHTML = "";
  for (const property of model.outputProperties) {
    const option = document.createElement("option");
    option.value = property.id;
    option.textContent = `${property.name} (${property.unit})`;
    select.appendChild(option);
  }
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

  const start = Number(byId<HTMLInputElement>("sweep-start").value);
  const end = Number(byId<HTMLInputElement>("sweep-end").value);
  const step = Number(byId<HTMLInputElement>("sweep-step").value);

  try {
    const sweep = runCompositionSweep({
      start,
      end,
      step,
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

    const plottedPropertyId = byId<HTMLSelectElement>("chart-property-select").value;
    const plottedProperty = selectedModel.outputProperties.find((property) => property.id === plottedPropertyId) ?? selectedModel.outputProperties[0];

    if (plottedProperty) {
      const series: ChartSeries[] = [
        {
          label: plottedProperty.name,
          color: CHART_COLOR,
          points: sweep.points.map((point) => {
            const value = point.result.values[plottedProperty.id];
            const scalar = Array.isArray(value) ? value[0]?.value : value?.value;
            return { x: point.x, y: scalar ?? 0 };
          }),
        },
      ];

      drawLineChart(byId<HTMLCanvasElement>("workbench-chart"), series, {
        title: `${selectedModel.name} — ${plottedProperty.name}`,
        xLabel: `Mole fraction of ${componentA.element.symbol}`,
        yLabel: `${plottedProperty.name} (${plottedProperty.unit})`,
      });
    }

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

function renderCsvImportResult(container: HTMLElement, result: CsvParseResult): void {
  container.innerHTML = "";

  if (result.headers.length === 0) {
    const message = document.createElement("p");
    message.textContent = result.issues[0] ?? "Nothing to show.";
    container.appendChild(message);
    return;
  }

  const table = document.createElement("table");
  const headerRow = document.createElement("tr");
  for (const header of result.headers) {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  for (const row of result.rows) {
    const tr = document.createElement("tr");
    for (const header of result.headers) {
      const td = document.createElement("td");
      const value = row[header];
      td.textContent = value === null || value === undefined ? "—" : String(value);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  container.appendChild(table);

  if (result.issues.length > 0) {
    const issuesBox = document.createElement("div");
    issuesBox.className = "issues";
    const heading = document.createElement("strong");
    heading.textContent = `${result.issues.length} issue(s) found:`;
    issuesBox.appendChild(heading);
    const list = document.createElement("ul");
    for (const issue of result.issues) {
      const li = document.createElement("li");
      li.textContent = issue;
      list.appendChild(li);
    }
    issuesBox.appendChild(list);
    container.appendChild(issuesBox);
  }
}

/** Parses the pasted CSV text and renders it as a table (plus any issues) — not wired into regression/curve-fitting, see csvImport.ts's header comment. */
export function importCsv(): void {
  const text = byId<HTMLTextAreaElement>("csv-import-input").value;
  renderCsvImportResult(byId("csv-import-result"), parseCsv(text));
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
      renderChartPropertySelectFor(model);
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
  renderChartPropertySelectFor(selectedModel);

  // Property assignment, not addEventListener: idempotent by construction,
  // so a second init() call against the same DOM (e.g. in tests, or any
  // future re-init flow) replaces rather than stacks each handler — a
  // second addEventListener would fire calculate() N times per click.
  byId<HTMLButtonElement>("calculate-button").onclick = calculate;
  byId<HTMLButtonElement>("sweep-button").onclick = sweepComposition;
  byId<HTMLButtonElement>("export-csv").onclick = exportCsv;
  byId<HTMLButtonElement>("csv-import-button").onclick = importCsv;
  byId<HTMLSelectElement>("chart-property-select").onchange = () => {
    if (lastSweepRows.length > 0) sweepComposition();
  };

  calculate();
}

window.addEventListener("DOMContentLoaded", init);
