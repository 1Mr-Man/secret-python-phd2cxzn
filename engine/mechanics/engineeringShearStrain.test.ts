import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { createStrainTensor } from "./strainTensor.js";
import { tensorialShearStrainComponents } from "./strainTensorComponents.js";
import { engineeringShearStrain } from "./engineeringShearStrain.js";

describe("engineeringShearStrain — the factor-of-two conversion", () => {
  it("doubles a tensorial shear value", () => {
    expect(engineeringShearStrain(0.02)).toBeCloseTo(0.04, 12);
  });

  it("doubles a negative tensorial shear value, preserving sign", () => {
    expect(engineeringShearStrain(-0.01)).toBeCloseTo(-0.02, 12);
  });

  it("zero tensorial shear gives exactly 0 engineering shear", () => {
    expect(engineeringShearStrain(0)).toBe(0);
  });
});

describe("engineeringShearStrain — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN", () => {
    try {
      engineeringShearStrain(NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity", () => {
    expect(() => engineeringShearStrain(Infinity)).toThrow();
  });

  it("throws INVALID_INPUT for -Infinity", () => {
    expect(() => engineeringShearStrain(-Infinity)).toThrow();
  });
});

describe("engineeringShearStrain — end-to-end tensor -> tensorial -> engineering, catching the factor-of-two error", () => {
  it("a tensor with εxy=0.02 yields tensorial shear 0.02 and engineering shear 0.04, never the reverse", () => {
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0.02, yz: 0, xz: 0 });

    const tensorial = tensorialShearStrainComponents(tensor);
    expect(tensorial.xy).toBe(0.02);

    const engineering = engineeringShearStrain(tensorial.xy);
    expect(engineering).toBeCloseTo(0.04, 12);
    // Explicit regression guard: the two values must never be equal here —
    // that would indicate the factor of 2 got lost or double-applied.
    expect(engineering).not.toBe(tensorial.xy);
  });

  it("applies independently to all three off-diagonal components", () => {
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0.01, yz: 0.03, xz: -0.02 });
    const tensorial = tensorialShearStrainComponents(tensor);

    expect(engineeringShearStrain(tensorial.xy)).toBeCloseTo(0.02, 12);
    expect(engineeringShearStrain(tensorial.yz)).toBeCloseTo(0.06, 12);
    expect(engineeringShearStrain(tensorial.xz)).toBeCloseTo(-0.04, 12);
  });
});
