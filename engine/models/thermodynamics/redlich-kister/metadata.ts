import type { PropertyDefinition } from "../../../core/Property.js";
import type { ModelReference } from "../../../core/Reference.js";
import type { ModelParameterSpec } from "../../ModelDefinition.js";

/**
 * Descriptive metadata for the binary Redlich-Kister excess-Gibbs-energy
 * model.
 *
 * ============================================================
 * PROVENANCE — READ BEFORE TRUSTING THIS MODEL FOR PUBLICATION
 * ============================================================
 * The Redlich-Kister polynomial FORM itself is a real, well-established,
 * citable expansion (Redlich & Kister, 1948 — see references below). What
 * is cited is the mathematical form only — NOT any specific numeric
 * coefficient for any real system. No Au-Cu (or any other) production
 * parameter set exists for this model as of Phase 12B; every test uses
 * clearly-labeled synthetic coefficients. Obtaining and independently
 * verifying real coefficients (e.g. from Sundman, Fries & Oates 1998, or
 * Singh & Sommer 1997 — both investigated but not retrievable in this
 * environment, see the Phase 12A audit) is a separate future data-
 * onboarding step, not a prerequisite for this model's own correctness.
 *
 * SCOPE (Phase 12 audit/lock): single-phase (liquid/disordered), binary
 * only. Explicitly NOT implemented: the Compound Energy Formalism,
 * ordered/solid phases, phase equilibrium or phase selection, and
 * multicomponent Redlich-Kister — this engine has no phase-state or
 * multi-phase-equilibrium concept at all yet, and Sundman et al.'s own
 * assessment applies CEF specifically to Au-Cu's *solid* ordered phases,
 * not its liquid phase, so a liquid-only model needs none of that
 * machinery.
 *
 * MODEL IDENTITY: this is a distinct model from Regular Solution, not a
 * generalization of it. Setting L0=W and every higher-order term to zero
 * makes this model's excess Gibbs energy term reduce exactly to Regular
 * Solution's `W*x(1-x)` (see model.test.ts's regression test) — but the
 * two remain separately identifiable in the registry/provenance system,
 * since Regular Solution is permanently fixed at that one special case
 * while this model supports the full, generally asymmetric expansion.
 */

export const REDLICH_KISTER_BINARY_MODEL_ID = "thermodynamics.redlich-kister.binary";

export const outputProperties: PropertyDefinition[] = [
  {
    id: "GE",
    name: "Excess molar Gibbs energy of mixing (Redlich-Kister)",
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
 * Only L0 is declared here — this model's actual coefficient count is
 * data-dependent (however many `L0`, `L1`, `L2`, ... a given parameter
 * set supplies), which this fixed, model-level `ModelParameterSpec[]`
 * cannot express. `requiredParameters` is descriptive metadata only —
 * `CalculationPipeline.ts` never reads it (confirmed directly, Phase 12B
 * parameter-schema audit) — the actual variable-arity contiguity check
 * lives entirely in `extractRedlichKisterCoefficients()` in model.ts.
 */
export const requiredParameters: ModelParameterSpec[] = [
  {
    key: "L0",
    name: "Zeroth-order Redlich-Kister coefficient",
    unit: "J/mol",
    description:
      "Coefficient of (x_A-x_B)^0 in G^E = x_A*x_B*sum(L_k*(x_A-x_B)^k). Always required. Higher-order terms L1, L2, ... are optional and, if present, must be contiguous starting from L0 — a missing lower-order term is never treated as zero (see model.ts's extractRedlichKisterCoefficients). Setting L0=W with no higher terms reproduces Regular Solution's W*x(1-x) excess term exactly.",
  },
];

export const assumptions: string[] = [
  "Binary system: exactly two components.",
  "Single phase (liquid/disordered) only — no Compound Energy Formalism, no ordered/solid phases, no phase equilibrium or phase selection.",
  "Molar Gibbs energy of mixing: G_M = RT[x_A ln x_A + x_B ln x_B] + G^E, with G^E = x_A*x_B*sum_{k=0}^{n} L_k*(x_A-x_B)^k.",
  "Coefficients L0..Ln must be contiguous (no gaps) — a missing intermediate term is rejected as INVALID_PARAMETER, never silently defaulted to zero.",
  "No numeric production parameter set exists for any real system as of Phase 12B — every test uses labeled synthetic coefficients.",
];

export const references: ModelReference[] = [
  {
    citation:
      "Redlich, O.; Kister, A.T. (1948). \"Algebraic Representation of Thermodynamic Properties and the Classification of Solutions\". Industrial and Engineering Chemistry. 40 (2): 345-348.",
    note: "Cites the general polynomial FORM only. No numeric coefficient for any system (including Au-Cu) is taken from, or verified against, any source in this model or its tests — see the Phase 12A/12B audits for the Au-Cu literature trail (Sundman, Fries & Oates 1998; Singh & Sommer 1997), neither of which yielded a retrievable, independently-verifiable number in this environment.",
  },
];

export const equations: string[] = [
  "G^E = x_A*x_B * sum_{k=0}^{n} L_k * (x_A - x_B)^k",
  "G_M = RT[x_A ln x_A + x_B ln x_B] + G^E",
];

export const numericalMethod = "closed-form";
