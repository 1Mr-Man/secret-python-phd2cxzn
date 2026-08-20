// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIVM_BINARY_MODEL_ID } from "../../engine/index.js";
import { calculate, exportCsv, importCsv, init, sweepComposition } from "./main.js";

function setupDom(): void {
  document.body.innerHTML = `
    <div id="error-message"></div>
    <div id="material-form"></div>
    <div id="model-picker"></div>
    <div id="conditions-form"></div>
    <div id="parameter-form"></div>
    <input id="sweep-start" type="number" value="0">
    <input id="sweep-end" type="number" value="1">
    <input id="sweep-step" type="number" value="0.1">
    <button id="calculate-button" type="button"></button>
    <button id="sweep-button" type="button"></button>
    <button id="export-csv" type="button" disabled></button>
    <div id="results-panel"></div>
    <select id="chart-property-select"></select>
    <canvas id="workbench-chart" width="900" height="500"></canvas>
    <textarea id="csv-import-input"></textarea>
    <button id="csv-import-button" type="button"></button>
    <div id="csv-import-result"></div>
  `;
}

function stubCanvasContext(): Record<string, unknown[][]> {
  const calls: Record<string, unknown[][]> = {};
  const ctx = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "measureText") {
          return (...args: unknown[]) => {
            (calls[prop] ??= []).push(args);
            return { width: 100 };
          };
        }
        return (...args: unknown[]) => {
          (calls[prop] ??= []).push(args);
        };
      },
      set() {
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
  return calls;
}

describe("app/workbench/main.ts — generic Workbench wired to the engine", () => {
  beforeEach(() => {
    setupDom();
    stubCanvasContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("init() defaults to Au 0.5/Cu 0.5, Quasi-Chemical, T=1550K, Z=10, W=-21500 — and auto-calculates the same golden result the classic calculator produces at x=0.5", () => {
    init();

    const temperatureInput = document.querySelector('[data-condition-key="temperatureK"]') as HTMLInputElement;
    const zInput = document.querySelector('[data-parameter-key="Z"]') as HTMLInputElement;
    const wInput = document.querySelector('[data-parameter-key="W"]') as HTMLInputElement;
    expect(temperatureInput.value).toBe("1550");
    expect(zInput.value).toBe("10");
    expect(wInput.value).toBe("-21500");

    // app/main.test.ts asserts this exact number for Au 0.5/Cu 0.5 at T=1550, Z=10, W=-21500.
    expect(document.getElementById("results-panel")!.textContent).toContain("0.131040");
  });

  it("calculate() re-runs with edited parameter values and updates the results panel", () => {
    init();
    (document.querySelector('[data-parameter-key="W"]') as HTMLInputElement).value = "-30000";

    calculate();

    const resultsText = document.getElementById("results-panel")!.textContent!;
    expect(resultsText).not.toContain("0.131040");
  });

  it("shows a validation error and skips calculation when mole fractions don't sum to 1", () => {
    init();
    const fractionInputs = document.querySelectorAll('[data-role="fraction"]') as NodeListOf<HTMLInputElement>;
    fractionInputs[0]!.value = "0.9";
    fractionInputs[0]!.dispatchEvent(new Event("input"));

    calculate();

    const errorEl = document.getElementById("error-message")!;
    expect(errorEl.style.display).toBe("block");
    expect(errorEl.textContent).toContain("sum to 1");
  });

  it("switching the model repopulates the parameter form with that model's own parameters", () => {
    init();
    expect(document.querySelectorAll("[data-parameter-key]")).toHaveLength(2); // Z, W

    const select = document.querySelector('select[data-role="model-select"]') as HTMLSelectElement;
    select.value = MIVM_BINARY_MODEL_ID;
    select.dispatchEvent(new Event("change"));

    const parameterKeys = [...document.querySelectorAll("[data-parameter-key]")].map((el) => el.getAttribute("data-parameter-key"));
    expect(parameterKeys).toEqual(["B_ij", "B_ji", "Z_i", "Z_j", "V_mi", "V_mj"]);
  });

  it("sweepComposition() draws exactly ONE property's series — never mixes units on one axis — and enables CSV export", () => {
    const calls = stubCanvasContext();
    init();

    sweepComposition();

    // 11 points (x = 0, 0.1, ..., 1.0), one series only: the chart must
    // never plot Quasi-Chemical's 3 output properties together, since a
    // model like MIVM would otherwise mix J/mol and dimensionless outputs
    // on the same Y-axis.
    expect(calls.arc).toHaveLength(11);
    expect((document.getElementById("export-csv") as HTMLButtonElement).disabled).toBe(false);
  });

  it("the CSV export still contains every output property as a column, even though the chart only plots one", () => {
    let capturedCsvText = "";
    class FakeBlob {
      constructor(parts: string[]) {
        capturedCsvText = parts.join("");
      }
    }
    vi.stubGlobal("Blob", FakeBlob);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue("blob:mock"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    init();
    sweepComposition();
    exportCsv();

    expect(capturedCsvText).toContain("etaSquared");
    expect(capturedCsvText).toContain("Scc0");
    expect(capturedCsvText).toContain("Scc0Ideal");
  });

  it("switching the model repopulates the chart property selector with that model's own output properties", () => {
    init();
    const select = document.getElementById("chart-property-select") as HTMLSelectElement;
    const initialOptions = [...select.options].map((o) => o.value);
    expect(initialOptions).toEqual(["Scc0", "Scc0Ideal", "etaSquared"]);

    const modelSelect = document.querySelector('select[data-role="model-select"]') as HTMLSelectElement;
    modelSelect.value = MIVM_BINARY_MODEL_ID;
    modelSelect.dispatchEvent(new Event("change"));

    const mivmOptions = [...select.options].map((o) => o.value);
    expect(mivmOptions).toEqual(["GmE", "GmE_RT", "lnGammaI", "lnGammaJ", "gammaI", "gammaJ"]);
  });

  it("respects custom sweep start/end/step bounds instead of the hardcoded 0/1/0.1 default", () => {
    const calls = stubCanvasContext();
    init();
    (document.getElementById("sweep-start") as HTMLInputElement).value = "0.2";
    (document.getElementById("sweep-end") as HTMLInputElement).value = "0.8";
    (document.getElementById("sweep-step") as HTMLInputElement).value = "0.2";

    sweepComposition();

    // x = 0.2, 0.4, 0.6, 0.8 -> 4 points, one series.
    expect(calls.arc).toHaveLength(4);
  });

  it("init() is idempotent: calling it twice never double-wires the top-level buttons (no addEventListener stacking)", () => {
    // Instance-level spies (not HTMLButtonElement.prototype) so this doesn't
    // also catch materialForm's own legitimate dynamic Add/Remove buttons.
    const calculateButton = document.getElementById("calculate-button") as HTMLButtonElement;
    const sweepButton = document.getElementById("sweep-button") as HTMLButtonElement;
    const exportButton = document.getElementById("export-csv") as HTMLButtonElement;
    const calculateSpy = vi.spyOn(calculateButton, "addEventListener");
    const sweepSpy = vi.spyOn(sweepButton, "addEventListener");
    const exportSpy = vi.spyOn(exportButton, "addEventListener");

    init();
    init();

    expect(calculateSpy).not.toHaveBeenCalled();
    expect(sweepSpy).not.toHaveBeenCalled();
    expect(exportSpy).not.toHaveBeenCalled();

    calculateButton.click();
    expect(document.getElementById("results-panel")!.textContent).toContain("0.131040");
  });

  it("exportCsv() triggers a browser download once a sweep has run", () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue("blob:mock"), revokeObjectURL: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    init();
    sweepComposition();
    exportCsv();

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("exportCsv() is a no-op before any sweep has run", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    init();

    exportCsv();

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("importCsv() parses the pasted CSV text and renders it as a table", () => {
    init();
    (document.getElementById("csv-import-input") as HTMLTextAreaElement).value = "x,y\n1,2\n3,4";

    importCsv();

    const resultEl = document.getElementById("csv-import-result")!;
    const headerCells = [...resultEl.querySelectorAll("th")].map((th) => th.textContent);
    expect(headerCells).toEqual(["x", "y"]);
    expect(resultEl.querySelectorAll("tbody tr, tr")).toBeTruthy(); // table rendered
    expect(resultEl.textContent).toContain("1");
    expect(resultEl.textContent).toContain("4");
  });

  it("importCsv() surfaces parse issues (missing/non-numeric cells) instead of silently dropping them", () => {
    init();
    (document.getElementById("csv-import-input") as HTMLTextAreaElement).value = "x,y\n1,\n2,abc";

    importCsv();

    const resultText = document.getElementById("csv-import-result")!.textContent!;
    expect(resultText).toContain("missing value");
    expect(resultText).toContain("not a valid number");
  });
});
