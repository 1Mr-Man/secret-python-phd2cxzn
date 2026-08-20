// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIVM_BINARY_MODEL_ID } from "../../engine/index.js";
import { calculate, exportCsv, init, sweepComposition } from "./main.js";

function setupDom(): void {
  document.body.innerHTML = `
    <div id="error-message"></div>
    <div id="material-form"></div>
    <div id="model-picker"></div>
    <div id="conditions-form"></div>
    <div id="parameter-form"></div>
    <button id="calculate-button" type="button"></button>
    <button id="sweep-button" type="button"></button>
    <button id="export-csv" type="button" disabled></button>
    <div id="results-panel"></div>
    <canvas id="workbench-chart" width="900" height="500"></canvas>
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

  it("sweepComposition() draws a chart series per output property and enables CSV export", () => {
    const calls = stubCanvasContext();
    init();

    sweepComposition();

    // 11 points (x = 0, 0.1, ..., 1.0) per solid series; Quasi-Chemical has
    // 3 output properties (etaSquared, Scc0, Scc0Ideal), so 33 arcs total.
    expect(calls.arc).toHaveLength(33);
    expect((document.getElementById("export-csv") as HTMLButtonElement).disabled).toBe(false);
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
});
