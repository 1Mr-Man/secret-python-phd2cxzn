import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { curieWeissSusceptibility } from "./curieWeissSusceptibility.js";

describe("curieWeissSusceptibility — basic calculation, independent hand computations", () => {
  it("matches C/(T-theta) for an arbitrary paramagnetic case", () => {
    const C = 2.5; // K, arbitrary
    const T = 400; // K
    const theta = 100; // K
    expect(curieWeissSusceptibility(C, T, theta)).toBeCloseTo(C / (T - theta), 12);
  });

  it("theta = 0 reduces to the plain Curie law C/T", () => {
    const C = 1.2;
    const T = 300;
    expect(curieWeissSusceptibility(C, T, 0)).toBeCloseTo(C / T, 12);
  });

  it("a larger T-theta gap gives a smaller susceptibility", () => {
    const C = 1;
    const near = curieWeissSusceptibility(C, 150, 100);
    const far = curieWeissSusceptibility(C, 500, 100);
    expect(near).toBeGreaterThan(far);
  });
});

describe("curieWeissSusceptibility — divergence as T approaches theta from above", () => {
  it("grows without bound as T -> theta+", () => {
    const C = 1;
    const theta = 100;
    const chiNear = curieWeissSusceptibility(C, theta + 0.001, theta);
    const chiFar = curieWeissSusceptibility(C, theta + 10, theta);
    expect(chiNear).toBeGreaterThan(chiFar);
    expect(chiNear).toBeGreaterThan(100);
  });
});

describe("curieWeissSusceptibility — paramagnetic-domain boundary (SCIENTIFIC_DOMAIN_ERROR)", () => {
  it("throws SCIENTIFIC_DOMAIN_ERROR at T = theta exactly (the singularity)", () => {
    try {
      curieWeissSusceptibility(1, 100, 100);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });

  it("throws SCIENTIFIC_DOMAIN_ERROR for T < theta (mathematically defined but not the paramagnetic regime)", () => {
    try {
      curieWeissSusceptibility(1, 50, 100);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("SCIENTIFIC_DOMAIN_ERROR");
    }
  });
});

describe("curieWeissSusceptibility — invalid temperature (INVALID_CONDITION via validateConditions())", () => {
  it("throws for T = 0", () => {
    try {
      curieWeissSusceptibility(1, 0, -50);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_CONDITION");
    }
  });

  it("throws for a negative temperature", () => {
    expect(() => curieWeissSusceptibility(1, -300, -400)).toThrow();
  });

  it("throws for NaN temperature", () => {
    expect(() => curieWeissSusceptibility(1, NaN, 100)).toThrow();
  });

  it("throws for infinite temperature", () => {
    expect(() => curieWeissSusceptibility(1, Infinity, 100)).toThrow();
  });
});

describe("curieWeissSusceptibility — malformed C/theta (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN curieConstantK", () => {
    try {
      curieWeissSusceptibility(NaN, 300, 100);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity curieConstantK", () => {
    expect(() => curieWeissSusceptibility(Infinity, 300, 100)).toThrow();
  });

  it("throws INVALID_INPUT for NaN weissConstantK", () => {
    try {
      curieWeissSusceptibility(1, 300, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity weissConstantK", () => {
    expect(() => curieWeissSusceptibility(1, 300, -Infinity)).toThrow();
  });
});

describe("curieWeissSusceptibility — a negative weissConstantK is valid (antiferromagnetic-style theta)", () => {
  it("does not throw purely for theta < 0, as long as T > theta", () => {
    expect(() => curieWeissSusceptibility(1, 50, -20)).not.toThrow();
    expect(curieWeissSusceptibility(1, 50, -20)).toBeCloseTo(1 / 70, 12);
  });
});
