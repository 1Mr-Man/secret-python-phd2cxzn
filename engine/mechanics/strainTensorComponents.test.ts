import { describe, expect, it } from "vitest";
import { createStrainTensor } from "./strainTensor.js";
import { normalStrainComponents, tensorialShearStrainComponents } from "./strainTensorComponents.js";

describe("normalStrainComponents", () => {
  it("extracts the three diagonal entries by name", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: 0.02, zz: 0.03, xy: 0.001, yz: 0.002, xz: 0.003 });
    expect(normalStrainComponents(tensor)).toEqual({ xx: 0.01, yy: 0.02, zz: 0.03 });
  });

  it("a pure-shear tensor (zero normal strain) extracts all zeros", () => {
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0.01, yz: 0.02, xz: 0.03 });
    expect(normalStrainComponents(tensor)).toEqual({ xx: 0, yy: 0, zz: 0 });
  });
});

describe("tensorialShearStrainComponents", () => {
  it("extracts the three off-diagonal entries by name, as raw TENSORIAL values (no factor of 2)", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: 0.02, zz: 0.03, xy: 0.02, yz: 0.015, xz: 0.005 });
    expect(tensorialShearStrainComponents(tensor)).toEqual({ xy: 0.02, yz: 0.015, xz: 0.005 });
  });

  it("a pure-diagonal tensor (zero shear) produces zero shear components", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: -0.02, zz: 0.03, xy: 0, yz: 0, xz: 0 });
    expect(tensorialShearStrainComponents(tensor)).toEqual({ xy: 0, yz: 0, xz: 0 });
  });
});
