import type { PropertyDefinition } from "../../../core/Property.js";
import type { ModelReference } from "../../../core/Reference.js";
import type { ModelParameterSpec } from "../../ModelDefinition.js";

/**
 * Descriptive metadata for the Au–Cu Quasi-Chemical Scc(0) model, kept
 * separate from the calculation itself (model.ts) so the "what this model
 * is" facts — references, ranges, units — can be read/audited without
 * reading any code that runs.
 */

export const QUASI_CHEMICAL_SCC0_MODEL_ID = "thermodynamics.quasi-chemical.scc0";

export const outputProperties: PropertyDefinition[] = [
  {
    id: "Scc0",
    name: "Concentration-concentration structure factor at k=0 (Quasi-Chemical)",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
  {
    id: "Scc0Ideal",
    name: "Concentration-concentration structure factor at k=0 (ideal-solution baseline)",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
  {
    id: "etaSquared",
    name: "η² — short-range-order interaction parameter",
    domain: "thermodynamic",
    unit: "dimensionless",
  },
];

export const requiredParameters: ModelParameterSpec[] = [
  {
    key: "Z",
    name: "Coordination number",
    unit: "dimensionless",
    description: "Number of nearest-neighbor sites per atom in the assumed lattice/liquid structure.",
  },
  {
    key: "W",
    name: "Interchange (ordering) energy",
    unit: "J/mol",
    description:
      "Regular-solution interchange energy parameter; negative values favor unlike-neighbor (ordering) pairs.",
  },
];

export const assumptions: string[] = [
  "Binary system: exactly two components (this migration preserves the original Au–Cu-only prototype's scope).",
  "Regular-solution / quasi-chemical pairwise interaction model with a single interchange energy W.",
  "Coordination number Z is constant across composition and temperature.",
];

export const references: ModelReference[] = [
  {
    citation: "Original prototype: script.js, calculateSccQC() (repository 1Mr-Man/secret-python-phd2cxzn).",
    note: "Migration source of truth — this model reproduces its arithmetic exactly.",
  },
];

export const equations: string[] = [
  "η² = exp(2W / (Z·R·T))",
  "β = √(1 + 4x(1−x)(η² − 1))",
  "Scc(0) = x(1−x) / [1 + (Z/2)·((1−β)/β)]   for 0 < x < 1",
  "Scc(0) = 0   at x = 0 or x = 1 (pure component)",
  "Scc_ideal(0) = x(1−x)",
];

export const numericalMethod = "closed-form";
