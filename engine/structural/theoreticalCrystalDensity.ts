import { PhysicalConstants } from "../core/Constants.js";
import { EngineError } from "../core/Errors.js";

/**
 * Theoretical (X-ray) crystal density for a CUBIC unit cell:
 *
 *   V_cell = a³                                          [m³]
 *   ρ = Z*M / (N_A * V_cell)                              [kg/m³]
 *
 * `a` (lattice constant) is supplied in Å and converted internally:
 * 1 Å = 1e-10 m, so V_cell = (a_Å * 1e-10)³ m³. `Z` (atoms/formula units
 * per unit cell) and `M` (molar mass, kg/mol) are both plain
 * caller-supplied numbers — this function does NOT infer `Z` from any
 * `crystalStructure` string (e.g. "FCC" → 4) and does NOT look up `M`
 * from any `Element` record. That inference is the caller's
 * responsibility; baking it in here would make this "pure numerical
 * utility" silently depend on categorical material knowledge (Phase 9A
 * audit). Cubic unit cells only — no `b`/`c`/α/β/γ, no general
 * unit-cell-volume utility; non-cubic geometry is out of scope.
 */
export function theoreticalCrystalDensity(
  latticeConstantAngstrom: number,
  atomsPerUnitCell: number,
  molarMassKgPerMol: number,
): number {
  if (!Number.isFinite(latticeConstantAngstrom)) {
    throw new EngineError(
      "INVALID_INPUT",
      `theoreticalCrystalDensity() requires a finite latticeConstantAngstrom, got ${latticeConstantAngstrom}.`,
    );
  }
  if (!Number.isFinite(atomsPerUnitCell)) {
    throw new EngineError("INVALID_INPUT", `theoreticalCrystalDensity() requires a finite atomsPerUnitCell, got ${atomsPerUnitCell}.`);
  }
  if (!Number.isFinite(molarMassKgPerMol)) {
    throw new EngineError("INVALID_INPUT", `theoreticalCrystalDensity() requires a finite molarMassKgPerMol, got ${molarMassKgPerMol}.`);
  }

  if (latticeConstantAngstrom <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `theoreticalCrystalDensity() requires a strictly positive latticeConstantAngstrom (a physical lattice constant cannot be zero or negative), got ${latticeConstantAngstrom}.`,
    );
  }
  if (atomsPerUnitCell <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `theoreticalCrystalDensity() requires a strictly positive atomsPerUnitCell, got ${atomsPerUnitCell}.`,
    );
  }
  if (molarMassKgPerMol <= 0) {
    throw new EngineError(
      "SCIENTIFIC_DOMAIN_ERROR",
      `theoreticalCrystalDensity() requires a strictly positive molarMassKgPerMol, got ${molarMassKgPerMol}.`,
    );
  }

  const latticeConstantMeters = latticeConstantAngstrom * 1e-10;
  const unitCellVolumeCubicMeters = latticeConstantMeters ** 3;

  return (atomsPerUnitCell * molarMassKgPerMol) / (PhysicalConstants.AVOGADRO_CONSTANT * unitCellVolumeCubicMeters);
}
