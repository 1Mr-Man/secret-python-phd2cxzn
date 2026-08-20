import { createElement, type Element } from "../core/Element.js";

/**
 * Minimal element identity seed data — symbol, name, atomic number, and
 * atomic mass only (standard IUPAC periodic-table values). No
 * domain-specific parameters (magnetic, electrical, optical, structural,
 * thermal, surface) are populated: those datasets are added later, per
 * model, as real sourced data — not invented here.
 *
 * Atomic number and standard atomic weight are objective, universally
 * agreed physical constants (IUPAC 2021 Table of Standard Atomic Weights,
 * conventional values) — unlike a model parameter such as MIVM's B_ij or
 * Quasi-Chemical's W, they carry no model-specific derivation or fitting
 * question, so they don't need the literature-audit-before-production
 * discipline documented in engine/data/parameterSets/DATA_MANIFEST.md.
 *
 * Au and Cu exist because the Au–Cu Quasi-Chemical migration (see
 * engine/models/thermodynamics/quasi-chemical) needs two named elements to
 * build its binary composition. The rest (Fe, Ni, Co, Cr, Mn, Al, Zn, Ti)
 * are common alloy-forming elements added so the Workbench's Material
 * System builder (app/workbench/materialForm.ts) can demonstrate
 * ternary/multicomponent composition entry meaningfully — this is still
 * only identity/mass data, not a model parameter, and it being present
 * does not imply any model has verified parameters for these elements yet
 * (see resolveMivmParameters / resolveRegularSolutionParameters / etc.,
 * which independently return NOT_FOUND for anything not in
 * engine/data/parameterSets/).
 */
export const Au: Element = createElement("Au", "Gold", 79, { atomicMassGPerMol: 196.97 });
export const Cu: Element = createElement("Cu", "Copper", 29, { atomicMassGPerMol: 63.55 });
export const Fe: Element = createElement("Fe", "Iron", 26, { atomicMassGPerMol: 55.845 });
export const Ni: Element = createElement("Ni", "Nickel", 28, { atomicMassGPerMol: 58.693 });
export const Co: Element = createElement("Co", "Cobalt", 27, { atomicMassGPerMol: 58.933 });
export const Cr: Element = createElement("Cr", "Chromium", 24, { atomicMassGPerMol: 51.996 });
export const Mn: Element = createElement("Mn", "Manganese", 25, { atomicMassGPerMol: 54.938 });
export const Al: Element = createElement("Al", "Aluminium", 13, { atomicMassGPerMol: 26.982 });
export const Zn: Element = createElement("Zn", "Zinc", 30, { atomicMassGPerMol: 65.38 });
export const Ti: Element = createElement("Ti", "Titanium", 22, { atomicMassGPerMol: 47.867 });

/** Every seeded element, for UI code that needs to list them (e.g. a composition builder's element picker). */
export const ALL_ELEMENTS: Element[] = [Au, Cu, Fe, Ni, Co, Cr, Mn, Al, Zn, Ti];
