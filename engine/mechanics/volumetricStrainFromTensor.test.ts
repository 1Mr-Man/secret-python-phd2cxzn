import { describe, expect, it } from "vitest";
import { createStrainTensor } from "./strainTensor.js";
import { volumetricStrain } from "./volumetricStrain.js";
import { volumetricStrainFromTensor } from "./volumetricStrainFromTensor.js";

describe("volumetricStrainFromTensor — trace of the tensor", () => {
  it("equals the sum of the three normal strain components", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: 0.02, zz: -0.005, xy: 0.001, yz: 0.002, xz: 0.003 });
    expect(volumetricStrainFromTensor(tensor)).toBeCloseTo(0.01 + 0.02 - 0.005, 12);
  });

  it("shear components do not affect the trace", () => {
    const withShear = createStrainTensor({ xx: 0.01, yy: 0.02, zz: 0.03, xy: 0.05, yz: 0.06, xz: 0.07 });
    const withoutShear = createStrainTensor({ xx: 0.01, yy: 0.02, zz: 0.03, xy: 0, yz: 0, xz: 0 });

    expect(volumetricStrainFromTensor(withShear)).toBeCloseTo(volumetricStrainFromTensor(withoutShear), 12);
  });

  it("an all-zero tensor has zero trace", () => {
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0, yz: 0, xz: 0 });
    expect(volumetricStrainFromTensor(tensor)).toBe(0);
  });

  it("a pure hydrostatic (isotropic) tensor sums three equal normal strains", () => {
    const tensor = createStrainTensor({ xx: 0.001, yy: 0.001, zz: 0.001, xy: 0, yz: 0, xz: 0 });
    expect(volumetricStrainFromTensor(tensor)).toBeCloseTo(0.003, 12);
  });
});

describe("volumetricStrainFromTensor — distinct from 6A's exact volumetricStrain(), not composed with it", () => {
  it("the small-strain trace and the exact (V-V0)/V0 form diverge at non-infinitesimal strain", () => {
    // A 50% linear expansion on all three axes: exact volumetric strain is
    // (1.5^3 - 1)/1 = 2.375, but the small-strain trace approximation is
    // only 0.5+0.5+0.5 = 1.5 — the two are NOT the same calculation, and
    // this function only ever computes the trace form.
    const tensor = createStrainTensor({ xx: 0.5, yy: 0.5, zz: 0.5, xy: 0, yz: 0, xz: 0 });
    const traceForm = volumetricStrainFromTensor(tensor);
    const exactForm = volumetricStrain(1.5 * 1.5 * 1.5, 1);

    expect(traceForm).toBeCloseTo(1.5, 12);
    expect(exactForm).toBeCloseTo(2.375, 12);
    expect(traceForm).not.toBeCloseTo(exactForm, 3);
  });

  it("the two forms agree closely only in the small-strain limit", () => {
    const smallStrain = 0.001;
    const tensor = createStrainTensor({ xx: smallStrain, yy: smallStrain, zz: smallStrain, xy: 0, yz: 0, xz: 0 });
    const traceForm = volumetricStrainFromTensor(tensor);
    const V0 = 1;
    const V = (1 + smallStrain) ** 3;
    const exactForm = volumetricStrain(V, V0);

    expect(traceForm).toBeCloseTo(exactForm, 4);
  });
});
