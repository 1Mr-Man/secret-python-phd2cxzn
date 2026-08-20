import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import type { StrainTensor } from "./strainTensor.js";
import { createStrainTensor, validateStrainTensor } from "./strainTensor.js";

describe("createStrainTensor — construction", () => {
  it("places each named component at its documented index", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: 0.02, zz: 0.03, xy: 0.001, yz: 0.002, xz: 0.003 });

    expect(tensor.components[0]![0]).toBe(0.01); // xx
    expect(tensor.components[1]![1]).toBe(0.02); // yy
    expect(tensor.components[2]![2]).toBe(0.03); // zz
    expect(tensor.components[0]![1]).toBe(0.001); // xy
    expect(tensor.components[1]![0]).toBe(0.001); // yx === xy
    expect(tensor.components[1]![2]).toBe(0.002); // yz
    expect(tensor.components[2]![1]).toBe(0.002); // zy === yz
    expect(tensor.components[0]![2]).toBe(0.003); // xz
    expect(tensor.components[2]![0]).toBe(0.003); // zx === xz
  });

  it("a pure-diagonal (all shear zero) tensor constructs without throwing", () => {
    expect(() => createStrainTensor({ xx: 0.01, yy: -0.003, zz: 0.002, xy: 0, yz: 0, xz: 0 })).not.toThrow();
  });

  it("propagates validateStrainTensor's rejection of a non-finite component", () => {
    try {
      createStrainTensor({ xx: NaN, yy: 0, zz: 0, xy: 0, yz: 0, xz: 0 });
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });
});

describe("validateStrainTensor — shape (INVALID_INPUT)", () => {
  it("accepts a well-formed symmetric 3x3 tensor", () => {
    const tensor: StrainTensor = {
      components: [
        [0.01, 0.001, 0.002],
        [0.001, 0.02, 0.003],
        [0.002, 0.003, 0.03],
      ],
    };
    expect(() => validateStrainTensor(tensor)).not.toThrow();
  });

  it("rejects a 2x2 matrix", () => {
    const tensor = { components: [[0.01, 0.001], [0.001, 0.02]] } as unknown as StrainTensor;
    try {
      validateStrainTensor(tensor);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects a 4x4 matrix", () => {
    const row4 = [0, 0, 0, 0];
    const tensor = { components: [row4, row4, row4, row4] } as unknown as StrainTensor;
    expect(() => validateStrainTensor(tensor)).toThrow();
  });

  it("rejects a ragged matrix (rows of unequal length)", () => {
    const tensor = {
      components: [[0.01, 0.001, 0.002], [0.001, 0.02], [0.002, 0.003, 0.03]],
    } as unknown as StrainTensor;
    try {
      validateStrainTensor(tensor);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects an empty matrix", () => {
    const tensor = { components: [] } as unknown as StrainTensor;
    expect(() => validateStrainTensor(tensor)).toThrow();
  });
});

describe("validateStrainTensor — finiteness (INVALID_INPUT)", () => {
  it("rejects a NaN component", () => {
    const tensor: StrainTensor = {
      components: [
        [NaN, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    };
    try {
      validateStrainTensor(tensor);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects an Infinity component", () => {
    const tensor: StrainTensor = {
      components: [
        [0, 0, 0],
        [0, Infinity, 0],
        [0, 0, 0],
      ],
    };
    expect(() => validateStrainTensor(tensor)).toThrow();
  });

  it("rejects a -Infinity component", () => {
    const tensor: StrainTensor = {
      components: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, -Infinity],
      ],
    };
    expect(() => validateStrainTensor(tensor)).toThrow();
  });
});

describe("validateStrainTensor — symmetry (INVALID_INPUT)", () => {
  it("rejects an asymmetric tensor: components[0][1] !== components[1][0]", () => {
    const tensor: StrainTensor = {
      components: [
        [0.01, 0.005, 0],
        [0.002, 0.02, 0],
        [0, 0, 0.03],
      ],
    };
    try {
      validateStrainTensor(tensor);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects an asymmetric tensor: components[1][2] !== components[2][1]", () => {
    const tensor: StrainTensor = {
      components: [
        [0.01, 0, 0],
        [0, 0.02, 0.004],
        [0, 0.001, 0.03],
      ],
    };
    expect(() => validateStrainTensor(tensor)).toThrow();
  });

  it("rejects an asymmetric tensor: components[0][2] !== components[2][0]", () => {
    const tensor: StrainTensor = {
      components: [
        [0.01, 0, 0.007],
        [0, 0.02, 0],
        [0.001, 0, 0.03],
      ],
    };
    expect(() => validateStrainTensor(tensor)).toThrow();
  });

  it("accepts an exactly-symmetric tensor with nonzero shear on every off-diagonal", () => {
    const tensor: StrainTensor = {
      components: [
        [0.01, 0.02, 0.03],
        [0.02, 0.04, 0.05],
        [0.03, 0.05, 0.06],
      ],
    };
    expect(() => validateStrainTensor(tensor)).not.toThrow();
  });
});
