import { registerModel } from "./registry.js";
import { idealSolutionScc0Model } from "./thermodynamics/ideal/index.js";
import { mivmBinaryModel } from "./thermodynamics/mivm/index.js";
import { quasiChemicalScc0Model } from "./thermodynamics/quasi-chemical/index.js";
import { regularSolutionScc0Model } from "./thermodynamics/regular/index.js";

/**
 * The plugin manifest. This is the ONE place a new model gets wired in —
 * add its import above and its registerModel(...) call below. Nothing else
 * in the engine (the pipeline, the registry, other models) changes.
 */
export function registerBuiltInModels(): void {
  registerModel(idealSolutionScc0Model);
  registerModel(regularSolutionScc0Model);
  registerModel(quasiChemicalScc0Model);
  registerModel(mivmBinaryModel);
}
