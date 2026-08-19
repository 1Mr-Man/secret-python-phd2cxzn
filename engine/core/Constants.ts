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
} as const;
