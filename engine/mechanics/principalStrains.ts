import type { StrainTensor } from "./strainTensor.js";
import { validateStrainTensor } from "./strainTensor.js";

/**
 * Principal strains — the eigenvalues of the strain tensor: the strain
 * values along the three orthogonal axes for which all shear components
 * vanish. Ordered descending: `epsilon1 >= epsilon2 >= epsilon3`.
 *
 * Eigenvalues only — no eigenvectors/principal directions. Nothing in
 * this codebase consumes a principal direction yet, and a repeated
 * eigenvalue has a non-unique eigenspace, which would need its own audit
 * (Phase 6C audit).
 */
export interface PrincipalStrains {
  epsilon1: number;
  epsilon2: number;
  epsilon3: number;
}

/**
 * Solves for the eigenvalues of a real symmetric 3x3 matrix via the
 * closed-form trigonometric method — Smith, O.K., "Eigenvalues of a
 * symmetric 3x3 matrix," Communications of the ACM 4(4), 1961 — not an
 * iterative approximation (e.g. Jacobi rotations). This is deterministic
 * and exact (up to floating-point rounding), with no convergence
 * tolerance or iteration count to choose, matching this project's
 * established closed-form style (Phase 6C audit).
 *
 * Reuses `validateStrainTensor()` for all input validation rather than
 * duplicating it — a valid (finite, exactly symmetric) real matrix
 * always has three real eigenvalues, so there is no
 * `SCIENTIFIC_DOMAIN_ERROR` case here; a malformed tensor throws
 * `INVALID_INPUT` via the reused validator.
 *
 * The `p1 === 0` branch (already-diagonal tensor) is kept as an explicit
 * special case: the general formula would otherwise divide by zero
 * (`p === 0`) for a diagonal input. Repeated eigenvalues reached via the
 * general branch need no special-casing — the formula produces them
 * directly. `r` is clamped to `[-1, 1]` before `Math.acos(r)`: `r` is
 * mathematically constrained to that range but can drift a few ULPs
 * outside it from floating-point rounding, which would otherwise make
 * `acos` return `NaN`.
 */
export function principalStrains(tensor: StrainTensor): PrincipalStrains {
  validateStrainTensor(tensor);

  const c = tensor.components;
  const a11 = c[0]![0]!;
  const a22 = c[1]![1]!;
  const a33 = c[2]![2]!;
  const a12 = c[0]![1]!;
  const a13 = c[0]![2]!;
  const a23 = c[1]![2]!;

  const p1 = a12 * a12 + a13 * a13 + a23 * a23;

  if (p1 === 0) {
    const [epsilon1, epsilon2, epsilon3] = [a11, a22, a33].sort((x, y) => y - x) as [number, number, number];
    return { epsilon1, epsilon2, epsilon3 };
  }

  const q = (a11 + a22 + a33) / 3;
  const p2 = (a11 - q) ** 2 + (a22 - q) ** 2 + (a33 - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6);

  // B = (1/p) * (A - q*I)
  const b11 = (a11 - q) / p;
  const b22 = (a22 - q) / p;
  const b33 = (a33 - q) / p;
  const b12 = a12 / p;
  const b13 = a13 / p;
  const b23 = a23 / p;

  const detB = b11 * (b22 * b33 - b23 * b23) - b12 * (b12 * b33 - b23 * b13) + b13 * (b12 * b23 - b22 * b13);

  let r = detB / 2;
  r = Math.max(-1, Math.min(1, r));

  const phi = Math.acos(r) / 3;

  const eigA = q + 2 * p * Math.cos(phi);
  const eigC = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  const eigB = 3 * q - eigA - eigC;

  // eigA/eigC are analytically the largest/smallest roots and eigB (via
  // the trace identity) the middle one, but at or near a repeated
  // eigenvalue the accumulated rounding across these three independent
  // expressions can leave two of them a few ULPs out of order (e.g. a
  // value that should equal the eigenvalue below it lands a hair above).
  // Sorting here makes the documented epsilon1>=epsilon2>=epsilon3
  // contract hold unconditionally rather than "usually."
  const [epsilon1, epsilon2, epsilon3] = [eigA, eigB, eigC].sort((x, y) => y - x) as [number, number, number];

  return { epsilon1, epsilon2, epsilon3 };
}
