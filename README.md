# Materials Physics Research Workbench

A TypeScript calculation engine and web UI for metals-and-alloys physics,
built up in phases from a single Au-Cu concentration-fluctuation
(`Scc(0)`) calculator into a generic platform that can drive any
registered thermodynamic model against any material system.

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/1Mr-Man/secret-python-phd2cxzn)

## Two pages, one engine

- **`workbench.html`** — the generic Materials Physics Workbench. Build
  an n-component material system, pick any registered model, fill in its
  conditions/parameters, calculate a single point or sweep composition,
  and export/import CSV data.
- **`index.html`** — the original Au-Cu Quasi-Chemical `Scc(0)`
  calculator, preserved unchanged as this project's first validated
  module rather than thrown away.

Both pages import only from `engine/index.ts`; neither contains a
scientific equation. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the
full UI ↔ engine boundary and request/response flow for each page.

## Current capabilities

- **Four implemented thermodynamic models**, all for binary systems:
  Ideal Solution, Regular Solution, Quasi-Chemical (`Scc(0)`), and MIVM
  (molar excess Gibbs energy + activity coefficients). See
  [`engine/README.md`](engine/README.md) for exactly what's verified
  versus internally derived for each.
- **Material System builder** supporting n-component (binary/ternary/
  multicomponent) composition entry — a model that only supports binary
  systems correctly reports "requires exactly 2 components" rather than
  silently miscomputing.
- **Model comparison**, **composition sweeps** (configurable start/end/
  step), a **generic results panel** (values table + a "Model &
  Assumptions" box built from each model's own equations/assumptions/
  references — no per-model UI code), and a **chart** that plots exactly
  one output property at a time (never mixes units like J/mol and
  dimensionless ratios on one axis).
- **CSV export** (any sweep result) and **CSV import** (paste-and-parse,
  with explicit issues for missing/non-numeric cells — not wired into
  regression/fitting yet).
- **Real unit conversion** (`engine/core/UnitConversion.ts`) for the unit
  families in active use plus the near-term ones strain/magnetism/
  electrical models will need — opt-in, not applied automatically to any
  model's inputs/outputs.
- **Pure, model-independent calculation utilities** — not
  `ModelDefinition`s, composable with the four models above at the call
  site, callable through `engine/index.ts` but not wired into the UI:
  - `engine/thermodynamics/`: ideal mixing entropy, activity, ideal
    mixing Gibbs energy, a multicomponent pairwise interaction matrix +
    regular-solution mixing enthalpy, relative chemical potential, and
    total mixing Gibbs energy. See
    [`engine/README.md`](engine/README.md#thermodynamic-utilities-phase-5).
  - `engine/mechanics/`: scalar strain/stress/moduli utilities, a 3x3
    strain tensor (construction, validation, and the explicit
    tensorial-to-engineering shear conversion), principal strains (a
    closed-form eigensolver), and the von Mises equivalent strain. See
    [`engine/README.md`](engine/README.md#scalar-and-tensor-mechanics-utilities-phase-6).
- **A parameter-provenance architecture** (`engine/parameters/`): every
  parameter record is typed `verified_direct` / `verified_derived` /
  `provisional` / `unavailable`, and the resolver returns an explicit
  `FOUND` / `NOT_FOUND` / `OUT_OF_RANGE` / `PROVISIONAL` / `AMBIGUOUS`
  status rather than ever guessing.

## Scientific provenance policy

This project's standing rule, applied consistently across every phase:
**a number that produces plausible output is not evidence it's correct.**
No model equation is implemented without being read from (or derived and
cross-checked against) a real, cited source. No numeric parameter value
enters `engine/data/parameterSets/` without being independently verified
against a primary source — see
[`engine/data/parameterSets/DATA_MANIFEST.md`](engine/data/parameterSets/DATA_MANIFEST.md)
and, for the deepest example of this discipline in practice, the MIVM
Au-Cu parameter research trail in `docs/MIVM_PHASE_2E-C*.md`. **An empty
or `unavailable` parameter store is a legitimate, successful outcome of
that research, not a gap to paper over.**

## Current limitations

- No CALPHAD or Self-Association models yet — deferred to their own
  dedicated, audited phases (see `engine/README.md`).
- No `ModelDefinition` (registered, pipeline-runnable model) exists yet
  for the magnetic, structural, surface, optical, electrical, or
  mechanical-strain property domains. Mechanical is the one exception
  with real code: `engine/mechanics/` (above) has pure scalar/tensor
  utilities, but nothing in the `mechanical_strain` domain is
  resolvable through `runCalculation()`/the registry/comparison/sweep
  machinery. `PropertyDomain` (`engine/core/Property.ts`) and
  `Conditions` (`engine/core/Conditions.ts`, already carrying
  `strain`/`magneticFieldTeslas`/`electricFieldVPerM`) are ready for a
  model in any of these domains; none has been built and audited yet.
- No verified MIVM Au-Cu parameter data (`B_ij`, `B_ji`, `Z_i`, `Z_j`,
  `V_mi`, `V_mj`) — every candidate source investigated so far didn't
  clear this project's provenance bar; see `docs/MIVM_PHASE_2E-C*.md`.
- Every implemented model is binary-only; the Material System builder
  supports more, the models don't yet.
- CSV import parses and displays a dataset only — it is not wired into
  regression/curve-fitting.
- Unit conversion (`UnitConversion.ts`) is a standalone utility, not
  applied automatically by the calculation pipeline or exposed as a
  unit-picker in the UI yet.

## Running, testing, building

```sh
npm install
npm run dev         # vite dev server — serves both index.html and workbench.html
npm test            # vitest run — the full test suite
npm run typecheck   # tsc --noEmit, engine + app
npm run build        # vite build — emits dist/index.html and dist/workbench.html
```

## Architecture and roadmap

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the UI ↔ engine boundary, request/
  response flow for both pages, and a phase-by-phase record of what each
  phase deliberately did and didn't change.
- [`engine/README.md`](engine/README.md) — the engine's internal
  architecture, the model plugin contract, the parameter-provenance
  system, and exactly what's implemented versus deferred.
- This project is built in phases, each scientific model or foundation
  piece scoped and verified on its own before the next begins — see
  either document's phase history for the pattern to follow when adding
  the next one.
