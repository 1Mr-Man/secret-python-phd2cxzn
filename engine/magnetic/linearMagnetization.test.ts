import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { linearMagnetization } from "./linearMagnetization.js";

describe("linearMagnetization — basic calculation, independent hand computations", () => {
  it("matches chi*H for a paramagnetic (positive chi) case", () => {
    const chi = 0.002;
    const H = 800;
    expect(linearMagnetization(chi, H)).toBeCloseTo(chi * H, 12);
  });

  it("matches chi*H for a diamagnetic (negative chi) case", () => {
    const chi = -0.0001;
    const H = 800;
    expect(linearMagnetization(chi, H)).toBeCloseTo(chi * H, 12);
  });

  it("zero susceptibility gives exactly 0 regardless of H", () => {
    expect(linearMagnetization(0, 1000)).toBe(0);
  });

  it("zero field gives exactly 0 regardless of chi", () => {
    expect(linearMagnetization(0.01, 0)).toBe(0);
  });
});

describe("linearMagnetization — sign", () => {
  it("positive chi and positive H give positive M", () => {
    expect(linearMagnetization(0.005, 200)).toBeGreaterThan(0);
  });

  it("negative chi (diamagnetic) and positive H give negative M — not rejected", () => {
    expect(() => linearMagnetization(-0.002, 200)).not.toThrow();
    expect(linearMagnetization(-0.002, 200)).toBeLessThan(0);
  });

  it("a negative H (opposing field direction) flips the sign of M for a fixed positive chi", () => {
    expect(linearMagnetization(0.01, -200)).toBeLessThan(0);
  });
});

describe("linearMagnetization — invalid input (INVALID_INPUT)", () => {
  it("throws INVALID_INPUT for NaN susceptibility", () => {
    try {
      linearMagnetization(NaN, 100);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for +Infinity susceptibility", () => {
    expect(() => linearMagnetization(Infinity, 100)).toThrow();
  });

  it("throws INVALID_INPUT for NaN fieldStrengthAPerM", () => {
    try {
      linearMagnetization(0.01, NaN);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("throws INVALID_INPUT for -Infinity fieldStrengthAPerM", () => {
    expect(() => linearMagnetization(0.01, -Infinity)).toThrow();
  });
});
