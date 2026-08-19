import { describe, expect, it } from "vitest";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../engine/index.js";
import { buildQcRequest, computeIdealCurve, runQcSweep } from "./qcAdapter.js";

/**
 * Same reference conditions as engine/models/thermodynamics/quasi-chemical
 * /model.test.ts and the original prototype's page defaults: T=1550K,
 * Z=10, W=-21500 J/mol, step=0.1.
 */
const T = 1550;
const Z = 10;
const W = -21500;
const STEP = 0.1;

const GOLDEN: Record<string, { scc0: number; ideal: number }> = {
  "0.10": { scc0: 0.070492, ideal: 0.09 },
  "0.20": { scc0: 0.104788, ideal: 0.16 },
  "0.30": { scc0: 0.121453, ideal: 0.21 },
  "0.40": { scc0: 0.128924, ideal: 0.24 },
  "0.50": { scc0: 0.13104, ideal: 0.25 },
  "0.60": { scc0: 0.128924, ideal: 0.24 },
  "0.70": { scc0: 0.121453, ideal: 0.21 },
  "0.80": { scc0: 0.104788, ideal: 0.16 },
};

describe("buildQcRequest", () => {
  it("builds a CalculationRequest targeting the Quasi-Chemical model with a binary Au-Cu composition", () => {
    const request = buildQcRequest(0.3, T, Z, W);

    expect(request.modelId).toBe(QUASI_CHEMICAL_SCC0_MODEL_ID);
    expect(request.conditions).toEqual({ temperatureK: T });
    expect(request.parameters).toEqual({ Z, W });
    expect(request.material.composition.components).toHaveLength(2);
    expect(request.material.composition.components[0]).toMatchObject({
      element: { symbol: "Au" },
      fraction: 0.3,
    });
    expect(request.material.composition.components[1]).toMatchObject({
      element: { symbol: "Cu" },
      fraction: 0.7,
    });
  });
});

describe("runQcSweep — UI-facing golden reproduction (T=1550K, Z=10, W=-21500 J/mol)", () => {
  const { etaSquared, points } = runQcSweep(T, Z, W, STEP);

  it("reproduces η² for the reference conditions", () => {
    expect(etaSquared).toBeCloseTo(0.716285, 5);
  });

  it("produces the same composition grid as the original prototype's sweep (x = 0.1 … 1.0)", () => {
    expect(points.map((point) => point.x.toFixed(2))).toEqual([
      "0.10",
      "0.20",
      "0.30",
      "0.40",
      "0.50",
      "0.60",
      "0.70",
      "0.80",
      "0.90",
      "1.00",
    ]);
  });

  it.each(Object.entries(GOLDEN))("reproduces Scc(0) and the ideal baseline at x=%s", (xKey, expected) => {
    const point = points.find((p) => p.x.toFixed(2) === xKey);
    expect(point).toBeDefined();
    expect(point!.scc0).toBeCloseTo(expected.scc0, 5);
    expect(point!.scc0Ideal).toBeCloseTo(expected.ideal, 5);
  });
});

describe("computeIdealCurve", () => {
  it("returns the ideal-solution baseline x(1-x) at the sampled points, read from the engine", () => {
    const curve = computeIdealCurve(T, Z, W, 4); // x = 0, 0.25, 0.5, 0.75, 1
    expect(curve.map((p) => p.x)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(curve.map((p) => Number(p.scc0Ideal.toFixed(6)))).toEqual([0, 0.1875, 0.25, 0.1875, 0]);
  });
});
