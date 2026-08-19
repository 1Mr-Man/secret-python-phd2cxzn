import type { PropertyDefinition } from "../../../core/Property.js";
import type { ModelReference } from "../../../core/Reference.js";
import type { ModelParameterSpec } from "../../ModelDefinition.js";

/**
 * Descriptive metadata for the Regular Solution Scc(0) model.
 *
 * ============================================================
 * PROVENANCE — READ BEFORE TRUSTING THIS MODEL FOR PUBLICATION
 * ============================================================
 * Unlike the Quasi-Chemical model (migrated verbatim from an existing,
 * working prototype) and the Ideal Solution model (already used as a
 * comparison baseline inside that prototype), this project contained no
 * prior Regular Solution equation to migrate. The equation below was
 * DERIVED for this engine, not copied from project code or a pasted
 * literature source:
 *
 *   1. Standard thermodynamic fluctuation relation (Bhatia-Thornton):
 *        Scc(0) = RT / (∂²G_M/∂x²)
 *   2. Standard regular-solution (Bragg-Williams) molar Gibbs energy of
 *      mixing, using the SAME interchange-energy parameter W the
 *      Quasi-Chemical model already uses:
 *        G_M = RT[x ln x + (1−x) ln(1−x)] + W x(1−x)
 *   3. ∂²G_M/∂x² = RT/[x(1−x)] − 2W, giving:
 *        Scc(0) = x(1−x) / [1 − (2W/RT) x(1−x)]
 *
 * This was cross-checked, not just derived on paper: the regular solution
 * is the Z→∞ (no short-range order / mean-field) limit of quasi-chemical
 * theory, so this formula must equal the limit of the Quasi-Chemical
 * model already in this codebase as Z grows with W and T fixed.
 * `model.test.ts` verifies this numerically — QC(Z=10,000,000) at the
 * Au–Cu reference conditions agrees with this formula to 7 significant
 * figures. That convergence test, run against the project's own
 * golden-tested QC model, is the closest thing to project-derived
 * authority this model has; there is no external citation attached
 * because none was verified against this exact formulation.
 */

export const REGULAR_SOLUTION_SCC0_MODEL_ID = "thermodynamics.regular-solution.scc0";

export const outputProperties: PropertyDefinition[] = [
  {
    id: "Scc0",
    name: "Concentration-concentration structure factor at k=0 (regular solution, mean-field)",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
];

export const requiredParameters: ModelParameterSpec[] = [
  {
    key: "W",
    name: "Interaction (interchange) energy",
    unit: "J/mol",
    description:
      "Coefficient of x(1-x) in the regular-solution molar Gibbs energy of mixing G_M = G_M^ideal + W x(1-x). Same physical role and sign convention as the Quasi-Chemical model's W: negative favors unlike-neighbor (ordering) pairs. Unlike Quasi-Chemical, this model has no coordination-number parameter — it is the Z -> infinity limit, so no short-range-order correction is applied.",
  },
];

export const assumptions: string[] = [
  "Binary system: exactly two components.",
  "Mean-field (Bragg-Williams) regular solution: random mixing, no explicit short-range order — the Z -> infinity limit of quasi-chemical theory.",
  "Molar Gibbs energy of mixing: G_M = RT[x ln x + (1-x) ln(1-x)] + W x(1-x).",
  "Scc(0) is undefined (the mean-field treatment predicts thermodynamic instability / spinodal decomposition) where 1 - (2W/RT)x(1-x) <= 0; the model reports this as a scientific-domain validation error rather than returning a negative or infinite value.",
];

export const references: ModelReference[] = [
  {
    citation:
      "Derived for this engine from the Bhatia-Thornton concentration-fluctuation relation Scc(0) = RT/(∂²G_M/∂x²), applied to the regular-solution molar Gibbs energy of mixing G_M = RT[x ln x + (1-x)ln(1-x)] + W x(1-x).",
    note: "Not copied from an existing project source or an external paper. Verified as the exact Z -> infinity limit of this project's golden-tested Quasi-Chemical model at matching (T, W) — see the convergence test in model.test.ts. Treat as engine-internal derivation, not a literature citation, until checked against a named published source.",
  },
];

export const equations: string[] = [
  "Scc(0) = x(1-x) / [1 - (2W/RT)x(1-x)]",
  "Undefined (thermodynamically unstable) when 1 - (2W/RT)x(1-x) <= 0",
];

export const numericalMethod = "closed-form";
