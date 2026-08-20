/**
 * The Workbench's "Material System" builder: an n-component composition
 * editor (add/remove rows, pick an element, type a mole fraction) that
 * turns into a `Composition` via the same `composition()`/
 * `validateComposition()` the engine already uses — this file adds no new
 * composition rules of its own, it only drives the existing ones from a
 * dynamic list of rows instead of the old calculator's two hardcoded
 * Au/Cu inputs.
 */
import {
  composition,
  validateComposition,
  type Component,
  type Composition,
  type Element,
  type ValidationIssue,
} from "../../engine/index.js";

export interface MaterialFormRow {
  symbol: string;
  fraction: number;
}

export type MaterialFormResult =
  | { ok: true; composition: Composition }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Pure: turns the current rows into a validated Composition (or the
 * validation issues blocking it) — no DOM involved, so this is the part
 * that's cheap to unit test directly.
 */
export function buildMaterialResult(rows: MaterialFormRow[], elements: Element[]): MaterialFormResult {
  const bySymbol = new Map(elements.map((element) => [element.symbol, element]));
  const unknownSymbols = rows.map((row) => row.symbol).filter((symbol) => !bySymbol.has(symbol));

  if (unknownSymbols.length > 0) {
    return {
      ok: false,
      issues: [
        {
          code: "INVALID_COMPOSITION",
          severity: "error",
          message: `Unknown element symbol(s): ${[...new Set(unknownSymbols)].join(", ")}.`,
        },
      ],
    };
  }

  const components: Component[] = rows.map((row) => ({ element: bySymbol.get(row.symbol)!, fraction: row.fraction }));
  const built = composition(components);
  const validation = validateComposition(built);

  return validation.valid ? { ok: true, composition: built } : { ok: false, issues: validation.issues };
}

export interface MaterialFormHandle {
  getRows(): MaterialFormRow[];
  setRows(rows: MaterialFormRow[]): void;
}

export interface MaterialFormOptions {
  elements: Element[];
  initialRows: MaterialFormRow[];
  /** Called after every add/remove/edit with a fresh copy of the current rows. */
  onChange: (rows: MaterialFormRow[]) => void;
}

/** DOM: renders the row editor into `container` and wires up add/remove/edit interactions. */
export function mountMaterialForm(container: HTMLElement, options: MaterialFormOptions): MaterialFormHandle {
  let rows: MaterialFormRow[] = options.initialRows.map((row) => ({ ...row }));

  function notify(): void {
    options.onChange(rows.map((row) => ({ ...row })));
  }

  function render(): void {
    container.innerHTML = "";

    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    for (const heading of ["Element", "Mole fraction", ""]) {
      const th = document.createElement("th");
      th.textContent = heading;
      headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    rows.forEach((row, index) => {
      const tr = document.createElement("tr");

      const symbolTd = document.createElement("td");
      const select = document.createElement("select");
      select.dataset.role = "element-symbol";
      for (const element of options.elements) {
        const option = document.createElement("option");
        option.value = element.symbol;
        option.textContent = `${element.symbol} — ${element.name}`;
        option.selected = element.symbol === row.symbol;
        select.appendChild(option);
      }
      select.addEventListener("change", () => {
        rows[index]!.symbol = select.value;
        notify();
      });
      symbolTd.appendChild(select);
      tr.appendChild(symbolTd);

      const fractionTd = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.001";
      input.min = "0";
      input.max = "1";
      input.dataset.role = "fraction";
      input.value = String(row.fraction);
      input.addEventListener("input", () => {
        rows[index]!.fraction = Number(input.value);
        notify();
      });
      fractionTd.appendChild(input);
      tr.appendChild(fractionTd);

      const removeTd = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.disabled = rows.length <= 1;
      removeButton.addEventListener("click", () => {
        rows.splice(index, 1);
        render();
        notify();
      });
      removeTd.appendChild(removeButton);
      tr.appendChild(removeTd);

      table.appendChild(tr);
    });

    container.appendChild(table);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "+ Add Component";
    addButton.addEventListener("click", () => {
      const used = new Set(rows.map((row) => row.symbol));
      const next = options.elements.find((element) => !used.has(element.symbol)) ?? options.elements[0];
      if (!next) return;
      rows.push({ symbol: next.symbol, fraction: 0 });
      render();
      notify();
    });
    container.appendChild(addButton);
  }

  render();

  return {
    getRows: () => rows.map((row) => ({ ...row })),
    setRows: (newRows) => {
      rows = newRows.map((row) => ({ ...row }));
      render();
    },
  };
}
