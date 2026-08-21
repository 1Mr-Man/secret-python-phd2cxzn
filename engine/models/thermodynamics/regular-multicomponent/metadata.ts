import type { PropertyDefinition } from "../../../core/Property.js";
import type { ModelReference } from "../../../core/Reference.js";
import type { ModelParameterSpec } from "../../ModelDefinition.js";

/**
 * Descriptive metadata for the multicomponent regular-solution
 * excess/total Gibbs-energy-of-mixing model.
 *
 * ============================================================
 * PROVENANCE — READ BEFORE TRUSTING THIS MODEL FOR PUBLICATION
 * ============================================================
 * This model derives no new thermodynamics of its own. It composes
 * three already-audited Phase 5 utilities, each unmodified:
 *
 *   - `idealMixingGibbsEnergy()` (engine/thermodynamics/idealMixingGibbsEnergy.ts,
 *     Phase 5C) — the ideal term, RT*sum(x_i*ln(x_i)).
 *   - `regularSolutionMixingEnthalpy()` + `InteractionMatrix` and its own
 *     validators (engine/thermodynamics/mixingEnthalpy.ts,
 *     interactionMatrix.ts, Phase 5D) — the excess term,
 *     sum over i<j of Omega_ij*x_i*x_j.
 *   - `totalMixingGibbsEnergy()` (engine/thermodynamics/totalMixingGibbsEnergy.ts,
 *     Phase 5F) — combines the two.
 *
 * The only new logic here is `extractInteractionMatrixFromParameters()`
 * in model.ts, which reconstructs an `InteractionMatrix` from this
 * model's flat `Omega_<canonicalPairKey>` parameter encoding — see that
 * function's own header comment. No shared parameter type
 * (`ParameterValue`, `CalculationRequest`, `ModelValidationContext`)
 * changed to support this (Phase 13B audit/lock).
 *
 * MODEL IDENTITY: this is a DISTINCT model from binary
 * `thermodynamics.regular-solution.scc0` — it does not output Scc(0)
 * (Phase 13A found no honest n-component generalization of Scc(0) exists
 * without inventing/sourcing a fluctuation-matrix convention, a separate
 * unresolved research question). Setting a 2-component system with one
 * `Omega_A-B` entry reduces this model's G^E to the exact same
 * `W*x(1-x)` form as Regular Solution's own excess term — but the binary
 * model's code is completely untouched and the two remain separately
 * registered, identifiable models.
 */

export const REGULAR_SOLUTION_MULTICOMPONENT_MODEL_ID = "thermodynamics.regular-solution.multicomponent";

export const outputProperties: PropertyDefinition[] = [
  {
    id: "GE",
    name: "Excess molar Gibbs energy of mixing (multicomponent regular solution)",
    domain: "thermodynamic",
    unit: "J/mol",
  },
  {
    id: "deltaGMix",
    name: "Total molar Gibbs energy of mixing (ideal + excess)",
    domain: "thermodynamic",
    unit: "J/mol",
  },
];

/**
 * Empty on purpose: unlike binary Regular Solution's single fixed `W`,
 * this model's actual parameter count is fully composition-dependent
 * (however many component pairs have both mole fractions > 0) — there is
 * no single always-required key to declare. See model.ts's
 * `extractInteractionMatrixFromParameters()` for the actual
 * `Omega_<canonicalPairKey>` convention and its validation.
 */
export const requiredParameters: ModelParameterSpec[] = [];

export const assumptions: string[] = [
  "Multicomponent system: at least 2 components (no upper limit).",
  "Excess Gibbs energy is the pairwise regular-solution sum: G^E = sum over i<j of Omega_ij*x_i*x_j — reusing engine/thermodynamics/mixingEnthalpy.ts's regularSolutionMixingEnthalpy() and InteractionMatrix unmodified.",
  "Ideal term reuses engine/thermodynamics/idealMixingGibbsEnergy.ts unmodified: Delta G_ideal = RT*sum(x_i*ln(x_i)).",
  "Every pair of components with both mole fractions > 0 requires an explicit Omega_ij entry — never defaulted to zero (the same rule InteractionMatrix's own validators already enforce, Phase 5D).",
  "Omega_ij is supplied via flat parameter keys `Omega_<canonicalPairKey(i,j)>` (e.g. 'Omega_Fe-Ni'), reconstructed into an InteractionMatrix inside this model — the shared CalculationRequest.parameters shape never changes.",
  "Distinct model from binary thermodynamics.regular-solution.scc0 — does not output Scc(0); that model is completely unmodified by this one.",
];

export const references: ModelReference[] = [
  {
    citation:
      "Composes engine/thermodynamics/idealMixingGibbsEnergy.ts (Phase 5C), engine/thermodynamics/mixingEnthalpy.ts + interactionMatrix.ts (Phase 5D), and engine/thermodynamics/totalMixingGibbsEnergy.ts (Phase 5F) — see each file's own header comment for its individual derivation and audit trail.",
    note: "No new thermodynamic equation is derived here; this model is an integration of already-audited utilities into a registered, validated ModelDefinition (Phase 13A/13B audit).",
  },
];

export const equations: string[] = [
  "G^E = sum over i<j of Omega_ij * x_i * x_j",
  "Delta G_mix = RT * sum(x_i * ln(x_i)) + G^E",
];

export const numericalMethod = "closed-form";
