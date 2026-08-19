// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculate } from "./main.js";

/**
 * Verifies the actual DOM wiring end to end: reading the page's real input
 * ids, running the calculation through the engine (via qcAdapter), and
 * rendering the results table / chart from that result — the same path
 * `onclick="calculate()"` and `window.onload` trigger in the browser.
 *
 * jsdom does not implement a real 2D canvas context (that requires the
 * native `canvas` package), so `getContext("2d")` is stubbed with a
 * recording proxy: every method call is captured by name so the chart
 * assertions can check what drawGraph() *told the canvas to draw* without
 * needing real pixel output.
 */

function setupDom(): void {
  document.body.innerHTML = `
    <input id="temperature" type="number" value="1550">
    <input id="coordination" type="number" value="10">
    <input id="energy" type="number" value="-21500">
    <input id="step" type="number" value="0.1">
    <div id="results"></div>
    <canvas id="chart" width="900" height="500"></canvas>
  `;
}

function stubCanvasContext(): Record<string, unknown[][]> {
  const calls: Record<string, unknown[][]> = {};
  const ctx = new Proxy(
    {},
    {
      get(_target, prop: string) {
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

describe("app/main.ts — UI wired to the engine", () => {
  let calls: Record<string, unknown[][]>;

  beforeEach(() => {
    setupDom();
    calls = stubCanvasContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the page's real input ids and renders the golden results table via the engine", () => {
    calculate();

    const resultsHtml = document.getElementById("results")!.innerHTML;

    expect(resultsHtml).toContain("1550 K");
    expect(resultsHtml).toContain("-21500 J/mol");
    expect(resultsHtml).toContain("0.716285"); // η²
    expect(resultsHtml).toContain("0.070492"); // Scc(0) QC at x=0.10
    expect(resultsHtml).toContain("0.090000"); // Scc(0) ideal at x=0.10
    expect(resultsHtml).toContain("0.131040"); // Scc(0) QC at x=0.50
    expect(resultsHtml).toContain("0.250000"); // Scc(0) ideal at x=0.50
  });

  it('exposes window.calculate for the existing onclick="calculate()" button markup', () => {
    expect(window.calculate).toBe(calculate);
  });

  it("draws the chart from the same engine-derived points as the results table", () => {
    calculate();

    const titleCall = calls.fillText?.find((args) => String(args[0]).includes("1550 K"));
    expect(titleCall).toBeDefined();
    // One marker per table row: x = 0.1 .. 1.0 at step 0.1 => 10 points.
    expect(calls.arc).toHaveLength(10);
  });

  it("wires window.onload to run the same calculation automatically, as the original prototype did", () => {
    // jsdom's dispatchEvent does not reliably route through the window.onload
    // IDL property in this environment (a plain addEventListener("load", ...)
    // does fire — verified separately), so the handler itself is invoked
    // directly here rather than through a synthetic "load" Event. This still
    // proves what matters: main.ts wires window.onload to a function, and
    // that function runs the real engine-backed calculation.
    expect(document.getElementById("results")!.innerHTML).toBe("");
    expect(typeof window.onload).toBe("function");

    (window.onload as unknown as () => void)();

    expect(document.getElementById("results")!.innerHTML).toContain("0.716285");
  });
});
