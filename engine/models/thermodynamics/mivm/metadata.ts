import type { PropertyDefinition } from "../../../core/Property.js";
import type { ModelReference } from "../../../core/Reference.js";
import type { ModelParameterSpec } from "../../ModelDefinition.js";

/**
 * Descriptive metadata for the binary Molecular Interaction Volume Model
 * (MIVM) — molar excess Gibbs energy and activity coefficients.
 *
 * QUICK DISAMBIGUATION (two Tao-coauthored 2023 Metals papers are
 * involved and are easy to mix up — this happened once already during
 * review): this implementation is Source B (Hang & Tao, Metals
 * 2023,13,1773, doi:10.3390/met13101773). If you're looking at an
 * equation with a separate lambda_ij/lambda_ji term, that is Source A
 * (Wang/Chen/Tao, Metals 2023,13,996) — NOT what this file implements.
 * Source B's enthalpy term uses ln(B_ij)/ln(B_ji) directly, no lambda.
 * See docs/MIVM_MATHEMATICAL_AUDIT.md's §3.4 disambiguation table for
 * the full side-by-side comparison.
 *
 * ============================================================
 * PROVENANCE — READ BEFORE TRUSTING THIS MODEL FOR PUBLICATION
 * ============================================================
 * MIVM was proposed by Tao, D.P., "A new model of thermodynamics of
 * liquid mixtures and its application to liquid alloys," Thermochimica
 * Acta 363 (2000) 105-113, doi:10.1016/S0040-6031(00)00603-1. That
 * original 2000 text has NOT been directly inspected in this
 * environment — every attempt to reach it (ScienceDirect, the DOI
 * resolver, several mirrors, academic search APIs) returned
 * EGRESS_BLOCKED. See docs/MIVM_MATHEMATICAL_AUDIT.md for the full
 * research trail.
 *
 * The equations implemented below come from two sources this project
 * DID read directly, character-for-character, from supplied PDFs:
 *
 *   - Hang, J.; Tao, D. "Estimation of Two Component Activities of
 *     Binary Liquid Alloys by the Pair Potential Energy Containing a
 *     Polynomial of the Partial Radial Distribution Function." Metals
 *     2023, 13, 1773. doi:10.3390/met13101773 (their Eqs. 13-14) —
 *     "Source B" in the audit.
 *   - Oshakuade, O.M.; Awe, O.E. "Computation of infinite dilute
 *     activity coefficients for Ga-X (X=In, Tl) and thermodynamic
 *     activities of all components in liquid Ga-In-Tl alloys."
 *     arXiv:2102.13199 [cond-mat.mtrl-sci] (2021) — fully independent
 *     of Tao's own research group; their Eqs. 6-8 provided the
 *     infinite-dilution limits used to algebraically triangulate the
 *     B_ij/B_ji subscript convention below.
 *
 * A THIRD source read directly in the same audit, Wang, C.; Chen, X.;
 * Tao, D. "Estimation of Component Activities and Molar Excess Gibbs
 * Energy of 19 Binary Liquid Alloys..." Metals 2023, 13, 996
 * (doi:10.3390/met13050996) — "Source A" — gives a form with the
 * B_ij/B_ji subscripts SWAPPED relative to Source B. This audit
 * algebraically checked both candidates against Source B/C's
 * independently-derived infinite-dilution limits (docs/
 * MIVM_MATHEMATICAL_AUDIT.md §3.5) and found only Source B's
 * convention reduces correctly. Source A is a documented outlier
 * (plausibly a subscript-labeling slip in that one paper), not a
 * second legitimate formulation.
 *
 * ============================================================
 * WHY THIS SPECIFIC B_ij/B_ji CONVENTION
 * ============================================================
 * The implementation below uses the Source-B convention because it
 * was independently algebraically triangulated against Oshakuade &
 * Awe (2021) and the Tao-authored 2023 formulation. Tao (2000) remains
 * the primary historical source but has NOT been directly inspected in
 * this environment. DO NOT "simplify" or swap the B_ij/B_ji subscripts
 * below without re-reading docs/MIVM_MATHEMATICAL_AUDIT.md §6.3-6.4 and
 * §3.5 first — that swap is exactly the discrepancy this project spent
 * real effort resolving, and undoing it silently would reintroduce a
 * known, previously-documented error.
 *
 * ============================================================
 * SCOPE — WHAT THIS MODEL DOES NOT DO
 * ============================================================
 * - This is the ORIGINAL MIVM (Source A's/B's four-parameter
 *   B_ij/B_ji/Z_i/Z_j/V_mi/V_mj form), NOT the Modified MIVM (M-MIVM).
 *   M-MIVM's enthalpy term is documented (Source A) to differ from
 *   MIVM's; the two must never be conflated. No M-MIVM equation is
 *   implemented anywhere in this file or model.ts.
 * - Binary systems only. No multicomponent generalization — the audit
 *   (§7) found the general N-component form but could not extract its
 *   exact term arrangement cleanly enough to implement responsibly.
 * - No Scc(0). The Bhatia-Thornton relation (already used by Ideal/
 *   Regular/Quasi-Chemical) could in principle apply to MIVM's G_M once
 *   it is trusted, but that is a distinct follow-on step the audit
 *   explicitly declined to bundle into this phase (§12).
 * - `lnGammaJ` is NOT independently quoted by either source read — it
 *   is obtained by exchange symmetry (swap i<->j, B_ij<->B_ji,
 *   Z_i<->Z_j, V_mi<->V_mj throughout the quoted `lnGammaI` formula),
 *   implemented by literally reusing the same function with swapped
 *   arguments rather than transcribing a second, independently-derived
 *   formula. See model.ts.
 */

export const MIVM_BINARY_MODEL_ID = "thermodynamics.mivm.binary";

export const outputProperties: PropertyDefinition[] = [
  {
    id: "GmE",
    name: "Molar excess Gibbs energy of mixing (binary MIVM)",
    domain: "thermodynamic",
    unit: "J/mol",
  },
  {
    id: "GmE_RT",
    name: "Molar excess Gibbs energy of mixing, normalized by RT (binary MIVM)",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
  {
    id: "lnGammaI",
    name: "Natural log of the activity coefficient of component i",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
  {
    id: "lnGammaJ",
    name: "Natural log of the activity coefficient of component j",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
  {
    id: "gammaI",
    name: "Activity coefficient of component i (exp(lnGammaI))",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
  {
    id: "gammaJ",
    name: "Activity coefficient of component j (exp(lnGammaJ))",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
];

export const requiredParameters: ModelParameterSpec[] = [
  {
    key: "B_ij",
    name: "MIVM interaction parameter B_ij",
    unit: "dimensionless",
    description:
      "Pair-potential-derived interaction parameter for the i-relative-to-j direction, in the Source-B convention (see this file's header comment). Must be > 0 (it appears inside ln(B_ij)). Asymmetric: B_ij != B_ji in general.",
  },
  {
    key: "B_ji",
    name: "MIVM interaction parameter B_ji",
    unit: "dimensionless",
    description:
      "Pair-potential-derived interaction parameter for the j-relative-to-i direction, in the Source-B convention. Must be > 0 (it appears inside ln(B_ji)). Asymmetric: B_ji != B_ij in general.",
  },
  {
    key: "Z_i",
    name: "First coordination number of pure component i",
    unit: "dimensionless",
    description: "First coordination number of pure liquid component i. Must be > 0.",
  },
  {
    key: "Z_j",
    name: "First coordination number of pure component j",
    unit: "dimensionless",
    description: "First coordination number of pure liquid component j. Must be > 0.",
  },
  {
    key: "V_mi",
    name: "Molar volume of pure component i",
    unit: "m3/mol",
    description: "Molar volume of pure liquid component i at the query temperature. Must be > 0.",
  },
  {
    key: "V_mj",
    name: "Molar volume of pure component j",
    unit: "m3/mol",
    description: "Molar volume of pure liquid component j at the query temperature. Must be > 0.",
  },
];

export const assumptions: string[] = [
  "Binary system: exactly two components.",
  "Original (four-parameter) MIVM, NOT M-MIVM — see this file's header comment for the distinction.",
  "B_ij, B_ji, Z_i, Z_j, V_mi, V_mj are all supplied as already-fitted/known inputs; this model does not itself fit B_ij/B_ji from infinite-dilution activity coefficients or from any other data (that fitting procedure is future scope, not implemented here).",
  "Source-B B_ij/B_ji subscript convention (see header comment) — algebraically triangulated, not read directly from Tao (2000).",
  "No Scc(0) output — out of scope for this phase (docs/MIVM_MATHEMATICAL_AUDIT.md §12).",
  "No multicomponent (ternary+) support — binary only.",
];

export const references: ModelReference[] = [
  {
    citation:
      "Tao, D.P. A new model of thermodynamics of liquid mixtures and its application to liquid alloys. Thermochimica Acta 2000, 363, 105-113. doi:10.1016/S0040-6031(00)00603-1.",
    note: "Primary historical source (MIVM's origin). NOT directly inspected in this environment — every access attempt was network-blocked. Cited here for completeness; the equations below were read from the two sources below, not from this paper.",
  },
  {
    citation:
      "Hang, J.; Tao, D. Estimation of Two Component Activities of Binary Liquid Alloys by the Pair Potential Energy Containing a Polynomial of the Partial Radial Distribution Function. Metals 2023, 13, 1773. doi:10.3390/met13101773.",
    note: "Source B — read directly from a supplied PDF. Their Eqs. 13-14 are the G_m^E/RT and ln(gamma_i) equations implemented in model.ts, in the B_ij/B_ji convention this model uses.",
  },
  {
    citation:
      "Oshakuade, O.M.; Awe, O.E. Computation of infinite dilute activity coefficients for Ga-X (X=In, Tl) and thermodynamic activities of all components in liquid Ga-In-Tl alloys. arXiv:2102.13199 [cond-mat.mtrl-sci], 2021.",
    note: "Read directly from a supplied PDF. Fully independent of Tao's own research group. Their Eqs. 6-8 (infinite-dilution limits, cited by them to Tao 2000 and later Tao papers) were used to algebraically resolve which of two disagreeing 2023 restatements (Source A vs Source B) matches the correct B_ij/B_ji convention — see docs/MIVM_MATHEMATICAL_AUDIT.md §3.5.",
  },
];

export const equations: string[] = [
  "G_m^E/RT = x_i*ln(V_mi/(x_i*V_mi + x_j*V_mj*B_ji)) + x_j*ln(V_mj/(x_j*V_mj + x_i*V_mi*B_ij)) - (x_i*x_j/2)*[Z_i*B_ji*ln(B_ji)/(x_i+x_j*B_ji) + Z_j*B_ij*ln(B_ij)/(x_j+x_i*B_ij)]",
  "ln(gamma_i) = 1 + ln(V_mi/(V_mi*x_i + V_mj*B_ji*x_j)) - x_i*V_mi/(V_mi*x_i+V_mj*B_ji*x_j) - x_j*V_mi*B_ij/(V_mj*x_j+x_i*V_mi*B_ij) - (x_j^2/2)*[Z_i*B_ji^2*ln(B_ji)/(x_i+x_j*B_ji)^2 + Z_j*B_ij*ln(B_ij)/(x_j+B_ij*x_i)^2]",
  "ln(gamma_j) obtained from ln(gamma_i) by exchange symmetry: swap i<->j, B_ij<->B_ji, Z_i<->Z_j, V_mi<->V_mj",
];

export const numericalMethod = "closed-form";
