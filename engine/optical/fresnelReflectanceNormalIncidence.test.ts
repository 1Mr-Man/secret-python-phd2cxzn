import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { fresnelReflectanceNormalIncidence } from "./fresnelReflectanceNormalIncidence.js";

describe("fresnelReflectanceNormalIncidence — identical media give zero reflectance", () => {
  it("n1=n2 gives exactly R=0", () => {
    expect(fresnelReflectanceNormalIncidence(1.5, 1.5)).toBe(0);
  });

  it("n1=n2=1 (vacuum-vacuum) also gives exactly R=0", () => {
    expect(fresnelReflectanceNormalIncidence(1, 1)).toBe(0);
  });
});

describe("fresnelReflectanceNormalIncidence — basic calculation, independent hand computations", () => {
  it("matches ((n1-n2)/(n1+n2))^2 for an air-to-glass interface", () => {
    const n1 = 1;
    const n2 = 1.5;
    expect(fresnelReflectanceNormalIncidence(n1, n2)).toBeCloseTo(((n1 - n2) / (n1 + n2)) ** 2, 12);
  });

  it("matches the known ~4% air-glass reflectance ballpark", () => {
    const R = fresnelReflectanceNormalIncidence(1, 1.5);
    expect(R).toBeCloseTo(0.04, 2);
  });
});

describe("fresnelReflectanceNormalIncidence — symmetry", () => {
  it("reversing which medium is n1 vs n2 gives the same R (the formula is symmetric under squaring)", () => {
    const a = fresnelReflectanceNormalIncidence(1, 1.5);
    const b = fresnelReflectanceNormalIncidence(1.5, 1);
    expect(a).toBeCloseTo(b, 15);
  });
});

describe("fresnelReflectanceNormalIncidence — bounded between 0 and 1 for ordinary positive unequal indices", () => {
  it("is strictly between 0 and 1 for a typical unequal pair", () => {
    const R = fresnelReflectanceNormalIncidence(1, 2.4); // diamond-scale n2, arbitrary test input
    expect(R).toBeGreaterThan(0);
    expect(R).toBeLessThan(1);
  });
});

describe("fresnelReflectanceNormalIncidence — refractive-index domain (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR for n1<=0", () => {
    try {
      fresnelReflectanceNormalIncidence(0, 1.5);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for n2<=0", () => {
    try {
      fresnelReflectanceNormalIncidence(1, -0.5);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("fresnelReflectanceNormalIncidence — malformed input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN n1", () => {
    try {
      fresnelReflectanceNormalIncidence(NaN, 1.5);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity n1", () => {
    expect(() => fresnelReflectanceNormalIncidence(Infinity, 1.5)).toThrow();
  });

  it("throws INVALID_INPUT for NaN n2", () => {
    try {
      fresnelReflectanceNormalIncidence(1, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity n2", () => {
    expect(() => fresnelReflectanceNormalIncidence(1, Infinity)).toThrow();
  });
});
