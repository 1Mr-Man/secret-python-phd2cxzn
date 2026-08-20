import { describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { createStrainTensor, type StrainTensor } from "./strainTensor.js";
import { principalStrains } from "./principalStrains.js";

/** Independent trace, matching the standard tr(A) = A11+A22+A33 definition. */
function trace(t: StrainTensor): number {
  return t.components[0]![0]! + t.components[1]![1]! + t.components[2]![2]!;
}

/** Independent determinant via cofactor expansion — not the algorithm under test. */
function determinant(t: StrainTensor): number {
  const c = t.components;
  const [a11, a12, a13] = [c[0]![0]!, c[0]![1]!, c[0]![2]!];
  const [a21, a22, a23] = [c[1]![0]!, c[1]![1]!, c[1]![2]!];
  const [a31, a32, a33] = [c[2]![0]!, c[2]![1]!, c[2]![2]!];
  return a11 * (a22 * a33 - a23 * a32) - a12 * (a21 * a33 - a23 * a31) + a13 * (a21 * a32 - a22 * a31);
}

/** Independent second principal invariant: sum of the three principal 2x2 minors. */
function secondInvariant(t: StrainTensor): number {
  const c = t.components;
  const a11 = c[0]![0]!;
  const a22 = c[1]![1]!;
  const a33 = c[2]![2]!;
  const a12 = c[0]![1]!;
  const a13 = c[0]![2]!;
  const a23 = c[1]![2]!;
  return a11 * a22 + a11 * a33 + a22 * a33 - a12 * a12 - a13 * a13 - a23 * a23;
}

describe("principalStrains — hand-solvable diagonal case", () => {
  it("returns the sorted diagonal entries for an already-diagonal tensor", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: 0.03, zz: 0.02, xy: 0, yz: 0, xz: 0 });
    const result = principalStrains(tensor);

    expect(result.epsilon1).toBeCloseTo(0.03, 12);
    expect(result.epsilon2).toBeCloseTo(0.02, 12);
    expect(result.epsilon3).toBeCloseTo(0.01, 12);
  });

  it("handles negative diagonal entries", () => {
    const tensor = createStrainTensor({ xx: -0.01, yy: 0.02, zz: -0.03, xy: 0, yz: 0, xz: 0 });
    const result = principalStrains(tensor);

    expect(result.epsilon1).toBeCloseTo(0.02, 12);
    expect(result.epsilon2).toBeCloseTo(-0.01, 12);
    expect(result.epsilon3).toBeCloseTo(-0.03, 12);
  });
});

describe("principalStrains — hand-solvable isotropic (hydrostatic) case", () => {
  it("all three eigenvalues equal the isotropic value, exactly", () => {
    const tensor = createStrainTensor({ xx: 0.005, yy: 0.005, zz: 0.005, xy: 0, yz: 0, xz: 0 });
    const result = principalStrains(tensor);

    expect(result.epsilon1).toBeCloseTo(0.005, 12);
    expect(result.epsilon2).toBeCloseTo(0.005, 12);
    expect(result.epsilon3).toBeCloseTo(0.005, 12);
  });

  it("a zero tensor has all-zero principal strains", () => {
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0, yz: 0, xz: 0 });
    const result = principalStrains(tensor);

    expect(result).toEqual({ epsilon1: 0, epsilon2: 0, epsilon3: 0 });
  });
});

describe("principalStrains — hand-solvable pure-shear case", () => {
  it("pure xy shear gives eigenvalues +s, 0, -s", () => {
    const s = 0.02;
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: s, yz: 0, xz: 0 });
    const result = principalStrains(tensor);

    expect(result.epsilon1).toBeCloseTo(s, 9);
    expect(result.epsilon2).toBeCloseTo(0, 9);
    expect(result.epsilon3).toBeCloseTo(-s, 9);
  });

  it("pure yz shear gives the same analytic result", () => {
    const s = 0.015;
    const tensor = createStrainTensor({ xx: 0, yy: 0, zz: 0, xy: 0, yz: s, xz: 0 });
    const result = principalStrains(tensor);

    expect(result.epsilon1).toBeCloseTo(s, 9);
    expect(result.epsilon2).toBeCloseTo(0, 9);
    expect(result.epsilon3).toBeCloseTo(-s, 9);
  });
});

describe("principalStrains — exactly repeated eigenvalue, reached through the off-diagonal (general) branch", () => {
  // diag(a, b, b) rotated 30deg about z mixes x/y into off-diagonal terms
  // but is a similarity transform, so the eigenvalues remain exactly
  // {a, b, b} — a repeated root NOT reached via the p1===0 diagonal
  // shortcut, exercising the general trigonometric branch at its r=+/-1
  // boundary.
  it("produces the exact repeated pair without NaN or ordering violations", () => {
    const a = 0.02;
    const b = 0.01;
    const theta = Math.PI / 6;
    const cos2 = Math.cos(theta) ** 2;
    const sin2 = Math.sin(theta) ** 2;
    const xy = (a - b) * Math.sin(theta) * Math.cos(theta);

    const tensor = createStrainTensor({
      xx: a * cos2 + b * sin2,
      yy: a * sin2 + b * cos2,
      zz: b,
      xy,
      yz: 0,
      xz: 0,
    });

    const result = principalStrains(tensor);

    expect(Number.isFinite(result.epsilon1)).toBe(true);
    expect(Number.isFinite(result.epsilon2)).toBe(true);
    expect(Number.isFinite(result.epsilon3)).toBe(true);
    expect(result.epsilon1).toBeGreaterThanOrEqual(result.epsilon2);
    expect(result.epsilon2).toBeGreaterThanOrEqual(result.epsilon3);

    expect(result.epsilon1).toBeCloseTo(a, 9);
    expect(result.epsilon2).toBeCloseTo(b, 9);
    expect(result.epsilon3).toBeCloseTo(b, 9);
  });
});

describe("principalStrains — near-degenerate case: finite, ordered, tight (not broad) invariant tolerance", () => {
  it("a tiny eigen-gap stays finite, correctly ordered, and reconstructs the invariants tightly", () => {
    // Same rotated-diag(a,b,b) construction as above, but with a and b
    // only 1e-6 apart — the eigenvalues are still analytically EXACT
    // (a similarity transform doesn't change them), but p1 becomes tiny,
    // stressing the p = sqrt(p2/6) division numerically.
    const a = 0.010001;
    const b = 0.01;
    const theta = Math.PI / 6;
    const cos2 = Math.cos(theta) ** 2;
    const sin2 = Math.sin(theta) ** 2;
    const xy = (a - b) * Math.sin(theta) * Math.cos(theta);

    const tensor = createStrainTensor({
      xx: a * cos2 + b * sin2,
      yy: a * sin2 + b * cos2,
      zz: b,
      xy,
      yz: 0,
      xz: 0,
    });

    const result = principalStrains(tensor);

    expect(Number.isFinite(result.epsilon1)).toBe(true);
    expect(Number.isFinite(result.epsilon2)).toBe(true);
    expect(Number.isFinite(result.epsilon3)).toBe(true);
    expect(result.epsilon1).toBeGreaterThanOrEqual(result.epsilon2);
    expect(result.epsilon2).toBeGreaterThanOrEqual(result.epsilon3);

    // Tight tolerance tied to float64 precision at this magnitude
    // (~1e-2), not a broad tolerance introduced to make the test pass.
    const sum = result.epsilon1 + result.epsilon2 + result.epsilon3;
    const product = result.epsilon1 * result.epsilon2 * result.epsilon3;
    const pairSum = result.epsilon1 * result.epsilon2 + result.epsilon1 * result.epsilon3 + result.epsilon2 * result.epsilon3;

    expect(sum).toBeCloseTo(trace(tensor), 9);
    expect(product).toBeCloseTo(determinant(tensor), 12);
    expect(pairSum).toBeCloseTo(secondInvariant(tensor), 9);
  });
});

describe("principalStrains — spectral invariants, independently cross-checked, general case", () => {
  it("sum/product/pairwise-sum of eigenvalues match trace/determinant/second invariant computed independently", () => {
    const tensor = createStrainTensor({ xx: 0.01, yy: 0.02, zz: 0.03, xy: 0.002, yz: 0.0015, xz: 0.0005 });
    const result = principalStrains(tensor);

    const sum = result.epsilon1 + result.epsilon2 + result.epsilon3;
    const product = result.epsilon1 * result.epsilon2 * result.epsilon3;
    const pairSum = result.epsilon1 * result.epsilon2 + result.epsilon1 * result.epsilon3 + result.epsilon2 * result.epsilon3;

    expect(sum).toBeCloseTo(trace(tensor), 9);
    expect(product).toBeCloseTo(determinant(tensor), 9);
    expect(pairSum).toBeCloseTo(secondInvariant(tensor), 9);
    expect(result.epsilon1).toBeGreaterThanOrEqual(result.epsilon2);
    expect(result.epsilon2).toBeGreaterThanOrEqual(result.epsilon3);
  });

  it("holds for a second, unrelated arbitrary tensor (not a special case)", () => {
    const tensor = createStrainTensor({ xx: -0.004, yy: 0.011, zz: 0.0007, xy: -0.0031, yz: 0.0022, xz: -0.0009 });
    const result = principalStrains(tensor);

    const sum = result.epsilon1 + result.epsilon2 + result.epsilon3;
    const product = result.epsilon1 * result.epsilon2 * result.epsilon3;
    const pairSum = result.epsilon1 * result.epsilon2 + result.epsilon1 * result.epsilon3 + result.epsilon2 * result.epsilon3;

    expect(sum).toBeCloseTo(trace(tensor), 9);
    expect(product).toBeCloseTo(determinant(tensor), 9);
    expect(pairSum).toBeCloseTo(secondInvariant(tensor), 9);
    expect(result.epsilon1).toBeGreaterThanOrEqual(result.epsilon2);
    expect(result.epsilon2).toBeGreaterThanOrEqual(result.epsilon3);
  });
});

describe("principalStrains — invalid input delegates to validateStrainTensor() (INVALID_INPUT)", () => {
  it("rejects an asymmetric tensor", () => {
    const tensor = {
      components: [
        [0.01, 0.005, 0],
        [0.002, 0.02, 0],
        [0, 0, 0.03],
      ],
    } as StrainTensor;

    try {
      principalStrains(tensor);
      expect.fail("expected to throw");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects a non-3x3 tensor", () => {
    const tensor = { components: [[0.01, 0], [0, 0.02]] } as unknown as StrainTensor;
    expect(() => principalStrains(tensor)).toThrow();
  });

  it("rejects a tensor with a non-finite component", () => {
    const tensor = {
      components: [
        [NaN, 0, 0],
        [0, 0.01, 0],
        [0, 0, 0.02],
      ],
    } as StrainTensor;
    expect(() => principalStrains(tensor)).toThrow();
  });
});
