/**
 * Renders a `CalculationResult` generically: a values table driven by the
 * model's own `outputProperties` (not a hardcoded key list), plus a
 * "Model & Assumptions" box built entirely from fields the pipeline
 * already attaches to every result (`equations`, `assumptions`,
 * `references`, `metadata.numericalMethod`, `parameterProvenance`) — see
 * engine/core/Calculation.ts. No new engine data is needed for this.
 */
import type { CalculationResult, PhysicalQuantity } from "../../engine/index.js";

function formatQuantity(value: PhysicalQuantity | PhysicalQuantity[] | undefined): string {
  if (value === undefined) return "—";
  if (Array.isArray(value)) return value.map((entry) => formatNumber(entry.value)).join(", ");
  return formatNumber(value.value);
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toPrecision(6) : String(value);
}

function appendListSection(container: HTMLElement, heading: string, items: string[]): void {
  if (items.length === 0) return;
  const h4 = document.createElement("h4");
  h4.textContent = heading;
  container.appendChild(h4);

  const ul = document.createElement("ul");
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

/** DOM: renders `result` into `container`, replacing its previous contents. */
export function renderResultsPanel(container: HTMLElement, result: CalculationResult): void {
  container.innerHTML = "";

  const table = document.createElement("table");
  const headerRow = document.createElement("tr");
  for (const heading of ["Property", "Value", "Unit"]) {
    const th = document.createElement("th");
    th.textContent = heading;
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  for (const property of result.outputProperties) {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = property.name;
    const valueTd = document.createElement("td");
    valueTd.textContent = formatQuantity(result.values[property.id]);
    const unitTd = document.createElement("td");
    unitTd.textContent = property.unit;
    tr.append(nameTd, valueTd, unitTd);
    table.appendChild(tr);
  }
  container.appendChild(table);

  if (result.warnings.length > 0) {
    const warningsBox = document.createElement("div");
    warningsBox.className = "warnings";
    appendListSection(warningsBox, "Warnings", result.warnings);
    container.appendChild(warningsBox);
  }

  const box = document.createElement("div");
  box.className = "model-assumptions";

  const heading = document.createElement("h3");
  heading.textContent = `Model: ${result.modelName}`;
  box.appendChild(heading);

  appendListSection(box, "Equations", result.equations ?? []);
  appendListSection(box, "Assumptions", result.assumptions ?? []);
  appendListSection(
    box,
    "References",
    (result.references ?? []).map((reference) => (reference.note ? `${reference.citation} — ${reference.note}` : reference.citation)),
  );

  const method = document.createElement("p");
  method.textContent = `Numerical method: ${result.metadata.numericalMethod}`;
  box.appendChild(method);

  appendListSection(
    box,
    "Parameter source",
    Object.entries(result.parameterProvenance).map(([key, source]) => `${key}: ${source.kind}${source.citation ? ` (${source.citation})` : ""}`),
  );

  container.appendChild(box);
}
