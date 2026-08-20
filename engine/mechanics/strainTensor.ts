import { EngineError } from "../core/Errors.js";

/**
 * A 3x3 strain tensor using the TENSORIAL (not engineering) convention:
 *
 *   ε_ij = (1/2)(∂u_i/∂x_j + ∂u_j/∂x_i)
 *
 * `components[i][j] = ε_ij`, with index 0/1/2 = x/y/z:
 *
 *   components[0][0]=εxx  components[0][1]=εxy  components[0][2]=εxz
 *   components[1][0]=εyx  components[1][1]=εyy  components[1][2]=εyz
 *   components[2][0]=εzx  components[2][1]=εzy  components[2][2]=εzz
 *
 * A valid strain tensor is symmetric (εxy=εyx, εyz=εzy, εxz=εzx) — a
 * defining structural property of the small-strain tensor, not an
 * optional check.
 *
 * IMPORTANT — shear convention: this stores TENSORIAL shear strain, not
 * engineering shear strain (γ_ij = 2ε_ij). A consumer feeding an
 * off-diagonal component into an engineering formula (e.g. Phase 6A's
 * `shearModulus()`, which expects γ) MUST convert explicitly via
 * `engineeringShearStrain()` (`engineeringShearStrain.ts`) — never assume
 * the raw tensor value already carries the factor of 2 (Phase 6B audit).
 *
 * Only 3x3 is supported — 2x2/plane-strain is out of scope (Phase 6B
 * audit). Principal strains/eigenvalues and von Mises/equivalent strain
 * are also deliberately deferred, not part of this type or module.
 */
export interface StrainTensor {
  components: number[][];
}

/**
 * Named-component constructor: builds the symmetric 3x3 array from six
 * independent values (three normal, three TENSORIAL shear) rather than
 * requiring a caller to hand-write a symmetric matrix, then validates the
 * result through the exact same path as any other tensor
 * (`validateStrainTensor()`).
 */
export function createStrainTensor(input: {
  xx: number;
  yy: number;
  zz: number;
  xy: number;
  yz: number;
  xz: number;
}): StrainTensor {
  const tensor: StrainTensor = {
    components: [
      [input.xx, input.xy, input.xz],
      [input.xy, input.yy, input.yz],
      [input.xz, input.yz, input.zz],
    ],
  };

  validateStrainTensor(tensor);
  return tensor;
}

/**
 * Structural validation only: exactly 3x3, every component finite, and
 * symmetric. All failures are `INVALID_INPUT` — a malformed shape or a
 * broken symmetry means the input doesn't represent a valid strain
 * tensor at all; it is not a physical-domain boundary being crossed
 * (Phase 6B audit, matching `interactionMatrix.ts`'s
 * `validateInteractionMatrixStructure()` precedent for matrix-shaped
 * structural validation).
 */
export function validateStrainTensor(tensor: StrainTensor): void {
  const { components } = tensor;

  if (components.length !== 3) {
    throw new EngineError("INVALID_INPUT", `StrainTensor must have exactly 3 rows, got ${components.length}.`);
  }

  for (let i = 0; i < 3; i++) {
    const row = components[i]!;
    if (row.length !== 3) {
      throw new EngineError("INVALID_INPUT", `StrainTensor row ${i} must have exactly 3 columns, got ${row.length}.`);
    }
    for (let j = 0; j < 3; j++) {
      const value = row[j]!;
      if (!Number.isFinite(value)) {
        throw new EngineError("INVALID_INPUT", `StrainTensor component [${i}][${j}] must be finite, got ${value}.`);
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const upper = components[i]![j]!;
      const lower = components[j]![i]!;
      if (upper !== lower) {
        throw new EngineError(
          "INVALID_INPUT",
          `StrainTensor is not symmetric: components[${i}][${j}]=${upper} !== components[${j}][${i}]=${lower}.`,
        );
      }
    }
  }
}
