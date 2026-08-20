/**
 * Physical constants used by the engine's models.
 *
 * Only constants actually consumed by a shipped model are listed here —
 * new constants should be added alongside the model that first needs them,
 * with their source noted, rather than pre-populated speculatively.
 */
export const PhysicalConstants = {
  /**
   * Molar gas constant R, J/(mol·K).
   * Value matches the one used by the original Au–Cu Quasi-Chemical
   * prototype (script.js) that this engine migrates.
   */
  GAS_CONSTANT_R: 8.314,

  /**
   * Vacuum permeability μ0, H/m (equivalently T·m/A or N/A²).
   * CODATA 2018 recommended value: 1.25663706212e-6 H/m. Since the 2019
   * SI redefinition, μ0 is an experimentally-measured quantity (no
   * longer exactly 4π×10⁻⁷ by definition), though it remains extremely
   * close to that historical value — this is the measured CODATA figure,
   * not the pre-2019 exact definition. Added for Phase 7A's
   * `magneticFluxDensity()` (`B = μ0(H+M)`), its first consumer.
   */
  VACUUM_PERMEABILITY_MU0: 1.25663706212e-6,
} as const;
