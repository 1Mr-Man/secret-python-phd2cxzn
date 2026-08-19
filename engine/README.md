# Materials Engine

A framework-agnostic TypeScript calculation engine for metals-and-alloys
physics. Phase 1a built the core architecture plus one migrated model (the
Au–Cu Quasi-Chemical Scc(0) calculation). Phase 1b connected it to the
existing calculator page — see `../ARCHITECTURE.md` for how `app/` calls
into this engine and why the boundary is drawn there. Phase 2A added two
more independent thermodynamic models (Ideal Solution, Regular Solution),
a model-comparison mechanism, a composition-sweep utility, and the
beginnings of a parameter-provenance architecture — see "The three
thermodynamic Scc(0) models" below for exactly what is verified versus
derived. No UI, charts, database, or authentication live in `engine/`
itself: this directory has zero dependency on the DOM, React, or any
browser API, by design.

## Why this exists

The original prototype (`script.js`) mixed physics, DOM binding, and
canvas rendering in one file, for one hardcoded system (Au–Cu). This engine
pulls the physics out into something that can grow to cover thermodynamic,
magnetic, surface, structural, optical, and electrical properties, across
pure metals through multicomponent alloys, under multiple theoretical
models — without rewriting itself every time a model is added.

## Architecture

```
engine/
  core/            Domain vocabulary every model shares
    Element.ts        Element identity + optional per-domain parameter groups
    Material.ts        Composition, Component, Material, classifySystem, systemLabel, validateComposition
    Conditions.ts       Temperature/pressure/strain/field state, validateConditions
    Units.ts             PhysicalQuantity (value + unit label)
    Constants.ts          Physical constants actually used by a shipped model
    Reference.ts           Citation shape
    ParameterSource.ts      Where a parameter value came from (user_supplied | literature | database | estimated)
    Property.ts               PropertyDomain, PropertyDefinition
    Validation.ts               ValidationIssue/ValidationResult primitives
    Errors.ts                    EngineError + EngineErrorCode (the six validation categories — see Errors.ts)
    Calculation.ts                 CalculationRequest, CalculationResult, ModelCalculationOutput

  models/
    ModelDefinition.ts    The one interface every model implements
    registry.ts             register/resolve/list models by id
    index.ts                  Plugin manifest — the only file a new model's registration touches
    thermodynamics/
      ideal/                   Scc(0) = x(1-x) — IMPLEMENTED AND VERIFIED
      regular/                  Scc(0) = x(1-x)/[1-(2W/RT)x(1-x)] — IMPLEMENTED, derivation documented in metadata.ts
      quasi-chemical/            The original migrated model — unchanged (golden model)
        metadata.ts                Descriptive facts: refs, parameters, equations, assumptions
        model.ts                     The calculation itself + validate()
        model.test.ts                 Golden-value regression tests

  parameters/       Parameter architecture (types + a small, empty-by-default lookup store)
    types.ts            ParameterValue, ParameterSet
    parameterStore.ts     register/find a ParameterSet by (modelId, system) — no data pre-seeded

  comparison/
    ModelComparison.ts   compareModels(): run N registered models against the same material/conditions

  pipeline/
    CalculationPipeline.ts   The one calculation pipeline, model-agnostic
    CompositionSweep.ts        runCompositionSweep(): sweep one model across a composition range

  data/
    elements.ts          Minimal seed data (Au, Cu identity only)

  index.ts              Public API barrel — the only import path for app/
  version.ts            ENGINE_VERSION

app/                   UI — see ../ARCHITECTURE.md
  qcAdapter.ts             Translates DOM inputs <-> CalculationRequest/Result; the only file here that imports engine/
  main.ts                   DOM rendering (table, canvas chart) — no equations, no engine imports
```

Data flows one direction: `models/*`, `comparison/*`, and `parameters/*`
depend on `core/*`; `pipeline/*` depends on `core/*` and
`models/registry.ts` (never on a specific model); `comparison/` depends on
`pipeline/CalculationPipeline.ts` the same way any other caller would;
`index.ts` re-exports the public surface. Nothing in `core/` imports from
`models/`, `pipeline/`, `comparison/`, or `parameters/`, and nothing in
`engine/` imports from `app/`.

## The calculation pipeline

Every model — today's Quasi-Chemical, tomorrow's Ideal Solution, Regular
Solution, MIVM, CALPHAD, Self-Association, or a magnetic/surface/optical
model — runs through the same seven steps in `runCalculation()`:

```
CalculationRequest
  -> input validation        (validateComposition + baseline validateConditions)
  -> model resolution        (registry.resolveModel(modelId))
  -> model validation        (required-condition check + the model's own validate())
  -> calculation               (model.calculate() — the only model-specific call)
  -> result normalization    (wrap model output into the standard envelope, apply requestedOutputs)
  -> validation/result metadata
  -> CalculationResult
```

`pipeline/CalculationPipeline.ts` contains no equations and never imports a
model module directly. If you find yourself wanting to special-case a model
inside the pipeline, that logic belongs in the model's `validate` or
`calculate` instead.

## Adding a new model

Adding MIVM, CALPHAD, or any other model never touches the pipeline or the
registry's internals. The steps are:

1. Create `engine/models/<category>/<model-id>/`.
2. Write `metadata.ts`: id, name, domain, output properties, required
   parameters, assumptions, references, and the equations as display
   strings.
3. Write `model.ts`: a pure `calculate(request)` function plus a
   `validate(context)` function, assembled into a `ModelDefinition` object
   (see `models/ModelDefinition.ts` for the full contract).
4. Add a `model.test.ts` with at least one golden/reference case.
5. Register it in `engine/models/index.ts` — one import, one
   `registerModel(...)` call. That file is the plugin manifest; it is the
   *only* place that changes to add a model.

The registry (`engine/models/registry.ts`) then makes it resolvable by id
and listable (optionally filtered by `PropertyDomain`) without any other
file knowing it exists.

## The three thermodynamic Scc(0) models

| Model | Status | Equation | Parameters |
|---|---|---|---|
| Ideal Solution | **IMPLEMENTED AND VERIFIED** | `Scc(0) = x(1-x)` | none |
| Regular Solution | **IMPLEMENTED** — derived and internally verified, not sourced from an existing project equation or a checked external citation (see below) | `Scc(0) = x(1-x) / [1 - (2W/RT)x(1-x)]` | `W` (interaction energy, J/mol) |
| Quasi-Chemical | **IMPLEMENTED AND VERIFIED** — unchanged from Phase 1a/1b | `Scc(0) = x(1-x) / [1 + (Z/2)((1-β)/β)]` (see below) | `Z`, `W` |

**Why Ideal and Quasi-Chemical are "verified" and Regular is labeled
differently:** Ideal Solution's `Scc(0) = x(1-x)` was already the
comparison baseline inside the original prototype and the Quasi-Chemical
model, with known values supplied directly by this project's own task
history. Quasi-Chemical is migrated verbatim from working code. Regular
Solution had no equivalent — this project never contained a Regular
Solution equation to migrate, and no external citation was pasted in
either. Per the "never invent a scientific equation" rule, it would have
been safer to leave it as an empty scaffold — but a defensible equation
*was* available: `Scc(0) = RT/(∂²G_M/∂x²)` (the standard Bhatia-Thornton
concentration-fluctuation relation) applied to the standard regular
solution free energy `G_M = G_M^ideal + W x(1-x)`, using the exact same
`W` the Quasi-Chemical model already uses. This was then **checked, not
just derived**: the regular solution is the mathematical Z→∞ (mean-field)
limit of quasi-chemical theory, so the derived formula must equal the
limit of this project's own golden-tested Quasi-Chemical model as Z grows
with T and W fixed. `models/thermodynamics/regular/model.test.ts` verifies
this numerically — `computeScc0QuasiChemical(x, W, 10_000_000, T)` agrees
with the regular-solution formula to 6+ significant figures. Full
derivation and this reasoning are in
`models/thermodynamics/regular/metadata.ts`; treat its `references` entry
as an engine-internal derivation record, not a literature citation, until
someone checks it against a named published source.

## How the Au–Cu Quasi-Chemical model is implemented

`engine/models/thermodynamics/quasi-chemical/model.ts` migrates
`calculateSccQC()` from the repository's original `script.js` with
identical arithmetic:

```
η²      = exp(2W / (Z·R·T))
β       = √(1 + 4x(1−x)(η² − 1))
Scc(0)  = x(1−x) / [1 + (Z/2)·((1−β)/β)]     for 0 < x < 1
Scc(0)  = 0                                    at x = 0 or x = 1
```

with the ideal-solution baseline `Scc_ideal(0) = x(1−x)` computed alongside
it, exactly as the original page displays both curves.

Two differences from the original, both structural rather than
mathematical:

- The function takes one composition point `x` per call instead of
  sweeping an array. A composition sweep (what produces the page's
  table/chart) is a caller-level concern — call `runCalculation` once per
  `x` — and is deliberately not built into the engine. Phase 1b's
  `app/qcAdapter.ts` (`runQcSweep`) is exactly that caller.
- `x` is read from `material.composition.components[0].fraction`; the
  model's `validate()` requires exactly two components, matching the
  original's binary-only scope.

`Z` and `W` are treated as **model parameters** (`CalculationRequest.parameters`),
not conditions — they characterize the Au–Cu pair interaction, not an
external state variable like temperature. There is no parameter database
yet (see "What's deliberately not here" below), so a caller must supply
`{ Z, W }` explicitly on every request.

## How tests verify scientific behavior

- `model.test.ts` calls the underlying `computeScc0QuasiChemical()`
  function directly with the reference conditions (T = 1550 K, Z = 10,
  W = −21500 J/mol) and checks its output against the exact table the
  original prototype produces — η² and Scc(0) at x = 0.1 … 0.8, plus the
  ideal-solution baseline — using `toBeCloseTo` (tolerance, not exact
  float equality). It also checks the x = 0/1 boundary and the x ↔ 1−x
  symmetry the closed-form equation implies.
- The same file exercises the `ModelDefinition` contract itself:
  `validate()` on a well-formed request, and on each way a request can be
  malformed (non-binary composition, missing/invalid Z, missing W).
- `CalculationPipeline.test.ts` re-runs the golden x = 0.5 case through the
  *full* pipeline (not just the raw function) to prove request → validation
  → resolution → calculation → result normalization reproduces the same
  numbers, plus each pipeline failure mode (missing model id, unknown
  model, invalid composition, missing condition, missing parameters).
- `registry.test.ts` and `Material.test.ts` / `Conditions.test.ts` cover
  the pieces those two test files don't: registration/resolution/listing,
  and composition/condition validation in isolation.

- `engine/models/thermodynamics/ideal/model.test.ts` and
  `.../regular/model.test.ts` follow the same pattern: golden/derived
  values, boundary and symmetry checks, and the `ModelDefinition` contract
  (`validate()`/`calculate()`). Regular Solution's suite additionally
  includes the Z→∞ convergence check against Quasi-Chemical described
  above, and a spinodal (scientific-domain) validation test.
- `comparison/ModelComparison.test.ts` and `pipeline/CompositionSweep.test.ts`
  cover the new cross-model and cross-composition mechanisms — see their
  sections below.

Run everything with:

```
npm run typecheck   # tsc --noEmit
npm test             # vitest run
```

## Model comparison

`engine/comparison/ModelComparison.ts` runs the same material/conditions
through an arbitrary list of registered model ids and returns one entry
per model:

```ts
const comparison = compareModels({
  material,
  conditions,
  modelIds: [IDEAL_SOLUTION_SCC0_MODEL_ID, REGULAR_SOLUTION_SCC0_MODEL_ID, QUASI_CHEMICAL_SCC0_MODEL_ID],
  parametersByModel: {
    [REGULAR_SOLUTION_SCC0_MODEL_ID]: { W: -21500 },
    [QUASI_CHEMICAL_SCC0_MODEL_ID]: { Z: 10, W: -21500 },
  },
});
// comparison.entries: [{ modelId, result }, { modelId, result }, { modelId, result }]
```

Like the pipeline, this file contains no equations — it calls
`runCalculation()` once per model id and collects the outcome. It differs
from the pipeline in one deliberate way: a per-model failure (unknown id,
missing parameter, spinodal composition) becomes an `entries[i].error`
instead of throwing, so one bad model doesn't hide the other N-1 results.
Adding MIVM to a comparison later is passing its id in `modelIds` — this
file never changes.

## Composition sweep

`engine/pipeline/CompositionSweep.ts`'s `runCompositionSweep()` runs one
model repeatedly across a range of a single swept scalar (composition
fraction) and returns one `CalculationResult` per point:

```ts
const { points, warnings } = runCompositionSweep({
  start: 0, end: 1, step: 0.1,
  modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
  conditions: { temperatureK: 1550 },
  parameters: { Z: 10, W: -21500 },
  compositionAt: (x) => binaryComposition(Au, x, Cu, 1 - x),
});
```

`compositionAt` is the only binary-specific thing about a call site — the
sweep utility itself just needs "a number in, a Composition out," so the
same function works for an n-ary sweep later without changes here.

Composition values are generated by index (`x_i = start + i·step`), not by
repeated addition (`x += step`), specifically to avoid the classic
floating-point accumulation bug (`0.30000000000000004`); each value is
then rounded to the precision implied by the `step` the caller passed.
`CompositionSweep.test.ts` asserts the output round-trips through
`JSON.stringify`/`parse` unchanged and checks a non-dividing step (e.g.
0.3 over `[0, 1]`) stops at the last point that fits rather than
overshooting `end`. Unlike `compareModels()`, a sweep fails fast: it's one
model's behavior across a range, so a bad point is a real problem with
that request, not something to paper over.

## Parameter architecture

Phase 2A does not build a parameter database — it builds the *shape* one
will eventually fill:

- **`core/ParameterSource.ts`**: `{ kind: "user_supplied" | "literature" | "database" | "estimated", citation?, note? }`.
  Every `CalculationResult.parameterProvenance` entry has one of these —
  defaulting to `user_supplied` for any parameter without an explicit
  `CalculationRequest.parameterSources` entry, which is accurate for every
  caller today (nothing resolves parameters from a source on the caller's
  behalf yet). This is purely additive to `CalculationRequest`/
  `CalculationResult` — omitting the new field is unchanged behavior, so
  Phase 1a/1b callers (`app/qcAdapter.ts`) needed no changes.
- **`parameters/types.ts`**: `ParameterValue` (one sourced number) and
  `ParameterSet` (a full `(modelId, system)` parameter set, with an
  optional `temperatureRangeK` for future temperature-dependent
  parameters).
- **`parameters/parameterStore.ts`**: `registerParameterSet` /
  `findParameterSet` / `toParameterRecord` — an in-memory lookup, **empty
  by default**. Nothing is pre-seeded: this project has no verified
  literature source for the Au-Cu `W`/`Z` values used elsewhere in tests
  and the UI (they are demo inputs, not sourced constants), and seeding
  the store with them would misrepresent their provenance. A future phase
  populates this from a real, cited dataset without changing the
  surrounding API — a model still just requests `requiredParameters` by
  key; where those numbers come from is this store's problem, not the
  model's.

How a model requests and validates parameters hasn't changed since Phase
1a: `ModelDefinition.requiredParameters: ModelParameterSpec[]` declares
what's needed, and the model's own `validate()` checks presence/range
(now categorized as `INVALID_PARAMETER` — see Errors.ts).

## Scientific traceability

Every `CalculationResult` carries, unconditionally: `modelId`, `modelName`,
`domain`, `outputProperties`, `values` + `units`, `inputSummary`
(material, conditions, `parametersUsed`), `parameterProvenance` (source of
each parameter), `warnings`, `validation`, `equations`, `assumptions`,
`references`, and `metadata` (timestamp, numerical method, engine
version). Nothing here is fabricated: `references` for Ideal and
Quasi-Chemical point at real, checkable sources (the original prototype
and the standard fluctuation formalism); Regular Solution's `references`
entry says plainly that it's an engine-internal derivation, not a citation
— see "The three thermodynamic Scc(0) models" above.

## What's deliberately not here (Phase 2A scope)

- Any UI, chart, form, or DOM code — the engine has zero dependency on
  React, the DOM, or any browser API.
- A populated parameter database — `parameters/parameterStore.ts` exists
  and is tested, but ships empty (see "Parameter architecture" above).
  Callers still supply parameters explicitly.
- **MIVM, CALPHAD, and Self-Association models** — not implemented. Each
  needs its own equation identified/derived and verified the way Regular
  Solution was in this phase (see "The three thermodynamic Scc(0) models"),
  which Phase 2A's brief explicitly deferred to a separate, dedicated
  phase per model. Use the standard spelling "CALPHAD" (CALculation of
  PHAse Diagrams) when that model is built — it names a specific,
  well-established computational thermodynamics methodology, not a
  similarly-named approximation.
- **Magnetic, optical, electrical, structural, surface, and linear-strain
  properties** — none implemented. The `PropertyDomain` union
  (`core/Property.ts`) already lists these domains and `ModelDefinition`
  is domain-agnostic, but no model in any of these domains exists yet.
  Each plugs in exactly like Ideal/Regular/Quasi-Chemical did: a new
  `engine/models/<domain>/<model-id>/` folder implementing
  `ModelDefinition`, registered in `models/index.ts`, resolvable through
  the same registry/pipeline/comparison/sweep machinery with zero changes
  to any of those files. What changes per new domain is only the
  `Conditions` fields it reads (e.g. a magnetic model reading
  `magneticFieldTeslas`, already a field on `Conditions` since Phase 1a)
  and, likely, new `Element` parameter groups (`core/Element.ts` already
  has empty `magnetic`/`optical`/`electrical`/`structural`/`surface`
  groups reserved for exactly this).
- Ternary/multicomponent support in any of the three current models — the
  core types (`classifySystem`, n-component `composition()`,
  `CompositionSweep`'s generic `compositionAt`) already handle it, but
  each model's `validate()` intentionally restricts itself to binary,
  matching what each model's equation, as established, actually
  describes.
- Unit conversion — units are carried as labels, not converted.
