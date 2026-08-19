import { createElement, type Element } from "../core/Element.js";

/**
 * Minimal element identity seed data — symbol, name, atomic number, and
 * atomic mass only (standard IUPAC periodic-table values). No
 * domain-specific parameters (magnetic, electrical, optical, structural,
 * thermal, surface) are populated: those datasets are added later, per
 * model, as real sourced data — not invented here.
 *
 * These two entries exist because the Au–Cu Quasi-Chemical migration (see
 * engine/models/thermodynamics/quasi-chemical) needs two named elements to
 * build its binary composition.
 */
export const Au: Element = createElement("Au", "Gold", 79, { atomicMassGPerMol: 196.97 });
export const Cu: Element = createElement("Cu", "Copper", 29, { atomicMassGPerMol: 63.55 });
