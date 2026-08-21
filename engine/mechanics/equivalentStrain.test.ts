import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { createStrainTensor, type StrainTensor } from "./strainTensor.js";
import { equivalentStrain } from "./equivalentStrain.js";
import { principalStrains } from "./principalStrains.js";

describe("equivalentStrain — hydrostatic (isotropic) strain gives exactly 0", () => {
  it("a nonzero hydrostatic tensor still has zero equivalent (distortional) strain", () => {
    const tensor = createStrainTensor({ xx: 0.02, yy: 0.02, zz: 0.02, xy: 0, yz: 0, xz: 0 });
    expect(equivalentStrain(tensor)).toBe(0);
  });

  it("the zero tensor has zero equivalent strain", () => {
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0, yz: 0, xz: 0 });
    expect(equivalentStrain(tensor)).toBe(0);
  });
});

describe("equivalentStrain — pure tensorial shear golden value", () => {
  it("pure xy shear gives exactly 2|s|/sqrt(3)", () => {
    const s = 0.02;
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: s, yz: 0, xz: 0 });
    expect(equivalentStrain(tensor)).toBeCloseTo((2 * s) / Math.sqrt(3), 12);
  });

  it("pure yz shear gives the same golden value, using |s| for a negative shear", () => {
    const s = -0.015;
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0, yz: s, xz: 0 });
    expect(equivalentStrain(tensor)).toBeCloseTo((2 * Math.abs(s)) / Math.sqrt(3), 12);
  });
});

describe("equivalentStrain — uniaxial strain: exact only for the idealized incompressible case", () => {
  it("incompressible (isochoric) uniaxial strain gives exactly |epsilon|", () => {
    const eps = 0.006;
    const tensor = createStrainTensor({ xx: eps, yy: -eps / 2, zz: -eps / 2, xy: 0, yz: 0, xz: 0 });
    expect(equivalentStrain(tensor)).toBeCloseTo(Math.abs(eps), 12);
  });

  it("incompressible uniaxial with a negative (compressive) axial strain also gives |epsilon|", () => {
    const eps = -0.004;
    const tensor = createStrainTensor({ xx: eps, yy: -eps / 2, zz: -eps / 2, xy: 0, yz: 0, xz: 0 });
    expect(equivalentStrain(tensor)).toBeCloseTo(Math.abs(eps), 12);
  });

  it("a general (non-incompressible, e.g. nu=0.3) uniaxial strain does NOT equal |epsilon| in general", () => {
    const eps = 0.006;
    const nu = 0.3;
    const transverse = -nu * eps; // elastic uniaxial transverse strain, NOT the -eps/2 isochoric case
    const tensor = createStrainTensor({ xx: eps, yy: transverse, zz: transverse, xy: 0, yz: 0, xz: 0 });

    const result = equivalentStrain(tensor);
    expect(result).not.toBeCloseTo(Math.abs(eps), 6);
  });
});

describe("equivalentStrain — independent cross-check against principalStrains()", () => {
  function viaPrincipalStrains(tensor: StrainTensor): number {
    const { epsilon1, epsilon2, epsilon3 } = principalStrains(tensor);
    return Math.sqrt((2 / 9) * ((epsilon1 - epsilon2) ** 2 + (epsilon2 - epsilon3) ** 2 + (epsilon3 - epsilon1) ** 2));
  }

  it("agrees with the principal-strain formulation for an arbitrary tensor with shear", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: 0.02, zz: 0.03, xy: 0.002, yz: 0.0015, xz: 0.0005 });
    expect(equivalentStrain(tensor)).toBeCloseTo(viaPrincipalStrains(tensor), 9);
  });

  it("agrees for a second, unrelated arbitrary tensor", () => {
    const tensor = createStrainTensor({ xx: -0.004, yy: 0.011, zz: 0.0007, xy: -0.0031, yz: 0.0022, xz: -0.0009 });
    expect(equivalentStrain(tensor)).toBeCloseTo(viaPrincipalStrains(tensor), 9);
  });

  it("agrees for the pure-shear golden case too", () => {
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0.02, yz: 0, xz: 0 });
    expect(equivalentStrain(tensor)).toBeCloseTo(viaPrincipalStrains(tensor), 9);
  });
});

describe("equivalentStrain — near-hydrostatic with tiny shear: numerical robustness", () => {
  it("stays finite and correctly small (not spuriously zero) for a tiny shear perturbation", () => {
    const tinyShear = 1e-8;
    const tensor = createStrainTensor({ xx: 0.02, yy: 0.02, zz: 0.02, xy: tinyShear, yz: 0, xz: 0 });
    const result = equivalentStrain(tensor);

    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo((2 * tinyShear) / Math.sqrt(3), 15);
  });

  it("stays finite for a tensor with tiny (but nonzero) diagonal spread and no shear", () => {
    const tensor = createStrainTensor({ xx: 0.02 + 1e-9, yy: 0.02, zz: 0.02 - 1e-9, xy: 0, yz: 0, xz: 0 });
    const result = equivalentStrain(tensor);

    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("equivalentStrain — non-negativity", () => {
  it("is non-negative for a variety of arbitrary tensors, regardless of component signs", () => {
    const tensors = [
      createStrainTensor({ xx: 0.01, yy: -0.02, zz: 0.005, xy: -0.003, yz: 0.004, xz: -0.001 }),
      createStrainTensor({ xx: -0.01, yy: -0.01, zz: -0.01, xy: 0.002, yz: -0.002, xz: 0.002 }),
      createStrainTensor({ xx: 0, yy: 0.05, zz: -0.05, xy: 0, yz: 0, xz: 0 }),
    ];

    for (const tensor of tensors) {
      expect(equivalentStrain(tensor)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("equivalentStrain — invalid input delegates to validateStrainTensor() (INVALID_INPUT)", () => {
  it("rejects an asymmetric tensor", () => {
    const tensor = {
      components: [
        [0.01, 0.005, 0],
        [0.002, 0.02, 0],
        [0, 0, 0.03],
      ],
    } as StrainTensor;

    try {
      equivalentStrain(tensor);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects a non-3x3 tensor", () => {
    const tensor = { components: [[0.01, 0], [0, 0.02]] } as unknown as StrainTensor;
    expect(() => equivalentStrain(tensor)).toThrow();
  });

  it("rejects a tensor with a non-finite component", () => {
    const tensor = {
      components: [
        [NaN, 0, 0],
        [0, 0.01, 0],
        [0, 0, 0.02],
      ],
    } as StrainTensor;
    expect(() => equivalentStrain(tensor)).toThrow();
  });
});
