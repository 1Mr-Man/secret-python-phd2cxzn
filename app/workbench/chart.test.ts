// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { drawLineChart, type ChartSeries } from "./chart.js";

/**
 * Same canvas-stubbing approach as app/main.test.ts: jsdom has no real 2D
 * context, so getContext("2d") is replaced with a recording proxy and
 * assertions check what drawing calls were made, not pixel output.
 */
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

describe("drawLineChart", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws one arc per point for a solid series, and none for a dashed series", () => {
    const calls = stubCanvasContext();
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 500;

    const series: ChartSeries[] = [
      { label: "Solid", color: "#008080", points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.1 }, { x: 1, y: 0.2 }] },
      { label: "Dashed", color: "#777", dashed: true, points: [{ x: 0, y: 0 }, { x: 1, y: 0.25 }] },
    ];
    drawLineChart(canvas, series, { title: "Test", xLabel: "x", yLabel: "y" });

    expect(calls.arc).toHaveLength(3);
  });

  it("renders the title and axis labels via fillText", () => {
    const calls = stubCanvasContext();
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 500;

    drawLineChart(canvas, [{ label: "S", color: "#000", points: [{ x: 0, y: 0 }] }], {
      title: "My Chart Title",
      xLabel: "X Axis",
      yLabel: "Y Axis",
    });

    const texts = calls.fillText!.map((args) => args[0]);
    expect(texts).toContain("My Chart Title");
    expect(texts).toContain("X Axis");
    expect(texts).toContain("Y Axis");
  });

  it("handles an empty series array without throwing", () => {
    stubCanvasContext();
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 500;

    expect(() => drawLineChart(canvas, [], { title: "Empty", xLabel: "x", yLabel: "y" })).not.toThrow();
  });

  it("returns early (no throw) when getContext yields null", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const canvas = document.createElement("canvas");
    expect(() => drawLineChart(canvas, [], { title: "t", xLabel: "x", yLabel: "y" })).not.toThrow();
  });
});
