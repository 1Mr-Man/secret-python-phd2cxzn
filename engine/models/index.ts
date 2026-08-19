import { registerModel } from "./registry.js";
import { quasiChemicalScc0Model } from "./thermodynamics/quasi-chemical/index.js";

/**
 * The plugin manifest. This is the ONE place a new model gets wired in —
 * add its import above and its registerModel(...) call below. Nothing else
 * in the engine (the pipeline, the registry, other models) changes.
 *
 * Future additions land here the same way, e.g.:
 *   import { idealSolutionModel } from "./thermodynamics/ideal-solution/index.js";
 *   registerModel(idealSolutionModel);
 */
export function registerBuiltInModels(): void {
  registerModel(quasiChemicalScc0Model);
}
