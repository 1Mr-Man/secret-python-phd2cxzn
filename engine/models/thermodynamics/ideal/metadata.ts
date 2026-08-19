import type { PropertyDefinition } from "../../../core/Property.js";
import type { ModelReference } from "../../../core/Reference.js";
import type { ModelParameterSpec } from "../../ModelDefinition.js";

/**
 * Descriptive metadata for the standalone Ideal Solution Scc(0) model.
 *
 * Before Phase 2A this exact quantity (`Scc0Ideal`) was only ever produced
 * as a convenience side-output of the Quasi-Chemical model, for its own
 * comparison curve. It is unchanged numerically — the equation and the
 * golden values are identical — but now exists as its own model with its
 * own id, so it can be requested, compared, and swept independently of
 * Quasi-Chemical.
 */

export const IDEAL_SOLUTION_SCC0_MODEL_ID = "thermodynamics.ideal-solution.scc0";

export const outputProperties: PropertyDefinition[] = [
  {
    id: "Scc0",
    name: "Concentration-concentration structure factor at k=0 (ideal solution)",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
];

/** The ideal solution model has no free parameters — it is fixed by composition alone. */
export const requiredParameters: ModelParameterSpec[] = [];

export const assumptions: string[] = [
  "Binary system: exactly two components.",
  "No enthalpy of mixing (ΔH_mix = 0): the only contribution to the molar Gibbs energy of mixing is the ideal configurational entropy term.",
];

export const references: ModelReference[] = [
  {
    citation:
      "Bhatia-Thornton concentration-fluctuation relation Scc(0) = RT/(∂²G_M/∂x²), applied to the ideal-solution molar Gibbs energy of mixing G_M = RT[x ln x + (1−x) ln(1−x)].",
    note: "Standard result for a binary ideal solution; reduces exactly to Scc(0) = x(1−x). Matches the ideal-solution baseline already used for comparison by the Quasi-Chemical model (see engine/models/thermodynamics/quasi-chemical) and by the original Au–Cu prototype this project migrated from.",
  },
];

export const equations: string[] = ["Scc(0) = x(1-x)"];

export const numericalMethod = "closed-form";
