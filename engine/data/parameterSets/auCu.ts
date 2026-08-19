import { REGULAR_SOLUTION_SCC0_MODEL_ID } from "../../models/thermodynamics/regular/index.js";
import { QUASI_CHEMICAL_SCC0_MODEL_ID } from "../../models/thermodynamics/quasi-chemical/index.js";
import type { ParameterSet } from "../../parameters/types.js";

/**
 * ============================================================================
 * Au-Cu — REAL literature records (Phase 2C, restructured Phase 2D)
 * ============================================================================
 *
 * NO NUMERICAL SCIENTIFIC VALUE HAS BEEN VERIFIED IN THIS PHASE (2D) EITHER.
 * Every ParameterSet in this file corresponds to an actual, identifiable
 * publication. NONE of them carries a numeric `value` — every parameter's
 * `status` is `"unavailable"`. This is not a placeholder waiting to be
 * filled with a best guess; it is the documented, honest outcome of Phase
 * 2C's research, now expressed with Phase 2D's structured `compatibility`
 * field instead of prose alone (see DATA_MANIFEST.md for the full
 * compatibility assessment and Phase 2D's ParameterStatus/
 * CompatibilityAssessment/DerivationRecord/VerificationRecord model).
 *
 * Why no value: this environment's network egress is blocked for every
 * publisher/repository domain that would let a specific numeric table
 * value be read and independently confirmed (Springer, Elsevier/
 * ScienceDirect, IOPscience, PubMed Central, ResearchGate, and the DOI
 * resolver itself were all tested and blocked — see DATA_MANIFEST.md).
 * Search-engine summaries could describe what each paper is ABOUT, but
 * none could surface an exact number from a results table, and a
 * paraphrased search summary is not an independently verified source.
 * Per this project's standing rule ("if a source cannot be independently
 * verified, do not add its numerical value to the production dataset"),
 * that means no value — not an approximate one, not a "looks about right"
 * one — goes in.
 *
 * These records exist anyway because the citation, the set-level
 * `compatibility` classification, and the fact that this specific
 * parameter is *known to be needed and not yet sourced* are themselves
 * useful, honest, now machine-readable data. A future phase with either
 * direct journal access or a manually-supplied excerpt can upgrade any of
 * these from `"unavailable"` to `"verified_direct"` by adding a `value`
 * and a `verification` record — the architecture requires no other change
 * to do so (see engine/parameters/resolve.ts and
 * engine/parameters/validateParameterRecord.ts).
 *
 * NOT auto-registered into the running parameter store — see
 * engine/index.ts, which still registers no parameter data by default.
 * A caller who wants to inspect these calls `registerParameterSet()` with
 * them explicitly (see auCu.test.ts).
 */

export const AU_CU_REGULAR_SOLUTION_SUNDMAN_1998: ParameterSet = {
  setId: "au-cu.regular-solution.sundman-fries-oates-1998",
  modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
  system: "Au-Cu",
  // Authoritative, set-level (Phase 2D Correction 1): a multi-term
  // Redlich-Kister CALPHAD fit is not the same mathematical object as this
  // model's single symmetric W. validateParameterSet() enforces that a
  // "requires_explicit_transformation" set can never contain a usable value.
  compatibility: "requires_explicit_transformation",
  parameters: [
    {
      key: "W",
      name: "Interaction (interchange) energy — value not extracted from source",
      unit: "J/mol",
      status: "unavailable",
      source: {
        kind: "literature",
        citation:
          "Sundman, B., Fries, S.G., Oates, W.A. (1998). A thermodynamic assessment of the Au-Cu system. Calphad, 22(3), 335-354.",
        publicationYear: 1998,
        note:
          "Real, identifiable CALPHAD assessment (ScienceDirect PII S0364591698000340; DOI not independently confirmed in this environment). Compatibility assessment (see DATA_MANIFEST.md): REQUIRES_EXPLICIT_TRANSFORMATION. Search-summary description confirms this assessment represents the liquid phase's excess Gibbs energy with a composition-dependent Redlich-Kister polynomial (L0, L1, ...), not this project's single symmetric W in G_M = G_M^ideal + W*x(1-x). Collapsing a multi-term Redlich-Kister fit to a single L0-as-W value is a real scientific transformation (it discards the asymmetry the higher-order terms exist to capture) and has NOT been performed. Independent of that, the full text (and therefore any specific L0 value) was not accessible for verification anyway.",
      },
    },
  ],
};

export const AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997: ParameterSet = {
  setId: "au-cu.regular-solution.singh-sommer-1997",
  modelId: REGULAR_SOLUTION_SCC0_MODEL_ID,
  system: "Au-Cu",
  // Set-level: form-compatible with this model's single-W equation (a
  // single interaction/order-energy parameter, same formalism) — but
  // "compatible in shape" is not "confirmed"; status stays "unavailable"
  // below because the actual table value was never independently read.
  compatibility: "directly_compatible",
  parameters: [
    {
      key: "W",
      name: "Interaction (interchange) energy — value not extracted from source",
      unit: "J/mol",
      status: "unavailable",
      source: {
        kind: "literature",
        citation:
          "Singh, R.N., Sommer, F. (1997). Segregation and immiscibility in liquid binary alloys. Reports on Progress in Physics, 60(1), 57-150.",
        doi: "10.1088/0034-4885/60/1/003",
        publicationYear: 1997,
        note:
          "Compatibility assessment (see DATA_MANIFEST.md): the most promising DIRECTLY_COMPATIBLE-IN-FORM candidate found — this review is known to tabulate a single interaction/order-energy W for many binary liquid alloys in essentially this project's own quasi-chemical/regular-solution formalism. However, this specific system's table entry (and even confirmation that Au-Cu is included) could not be retrieved: full-text access to IOPscience was blocked in this environment (see DATA_MANIFEST.md). No value verified, so none entered — 'form-compatible' is not the same as 'confirmed', and this record must not be upgraded to a numeric value without someone actually reading the table.",
      },
    },
  ],
};

export const AU_CU_QUASI_CHEMICAL_SU_WANG_2013: ParameterSet = {
  setId: "au-cu.quasi-chemical.su-wang-2013",
  modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
  system: "Au-Cu",
  // `compatibility` deliberately left UNSET, not forced into one of the
  // three buckets: whether this paper's η²/order-energy definition matches
  // this project's η² = exp(2W/(ZRT)) term for term genuinely could not be
  // determined (full text was unreachable). "Undetermined" is honestly
  // different from asserting compatibility either way — see DATA_MANIFEST.md.
  parameters: [
    {
      key: "Z",
      name: "Coordination number — value not extracted from source",
      unit: "dimensionless",
      status: "unavailable",
      source: {
        kind: "literature",
        citation:
          "Su, Y.-H., Wang, W.-L. (2013). Surface plasmon resonance of Au-Cu bimetallic nanoparticles predicted by a quasi-chemical model. Nanoscale Research Letters, 8, 408.",
        doi: "10.1186/1556-276X-8-408",
        publicationYear: 2013,
        note:
          "Compatibility assessment (see DATA_MANIFEST.md): a real, specifically-Au-Cu, specifically-quasi-chemical-model paper based on Gibbs free energy of mixing — the most directly relevant QC candidate found. Its exact equation form (does its eta-squared/order-energy definition match this project's η² = exp(2W/(ZRT)) term for term?) and its numeric Z/W could NOT be confirmed: full-text access via Springer, PubMed Central, and ResearchGate was blocked in this environment. This project's default T=1550K happens to match a temperature seen elsewhere in Au-Cu liquid-alloy literature searches, but per this project's own rule, that coincidence is explicitly NOT treated as evidence this paper is the origin of, or agrees with, any existing value in this codebase.",
      },
    },
    {
      key: "W",
      name: "Interchange (ordering) energy — value not extracted from source",
      unit: "J/mol",
      status: "unavailable",
      source: {
        kind: "literature",
        citation:
          "Su, Y.-H., Wang, W.-L. (2013). Surface plasmon resonance of Au-Cu bimetallic nanoparticles predicted by a quasi-chemical model. Nanoscale Research Letters, 8, 408.",
        doi: "10.1186/1556-276X-8-408",
        publicationYear: 2013,
        note: "Same source and same limitation as this set's Z entry above.",
      },
    },
  ],
};

/** Every real (currently unavailable) Au-Cu record this phase produced. */
export const AU_CU_KNOWN_SOURCES: ParameterSet[] = [
  AU_CU_REGULAR_SOLUTION_SUNDMAN_1998,
  AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997,
  AU_CU_QUASI_CHEMICAL_SU_WANG_2013,
];
