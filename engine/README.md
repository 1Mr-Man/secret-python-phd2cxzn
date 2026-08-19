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
derived. Phase 2B turned that beginning into a real (still empty of
real data) parameter database architecture: canonical system identity
(Au-Cu and Cu-Au resolve to the same entry), a multi-set store, and a
resolver returning one of five explicit states (FOUND / NOT_FOUND /
OUT_OF_RANGE / PROVISIONAL / AMBIGUOUS) instead of ever guessing — see
"Parameter architecture" below. No UI, charts, database, or
authentication live in `engine/` itself: this directory has zero
dependency on the DOM, React, or any browser API, by design.

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
    ParameterSource.ts      Where a parameter value came from (user_supplied | literature | database | estimated) + doi/publicationYear
    SystemIdentity.ts         identifySystem(): canonical (order-independent) + ordered system identity
    Property.ts                 PropertyDomain, PropertyDefinition
    Validation.ts                 ValidationIssue/ValidationResult primitives
    Errors.ts                      EngineError + EngineErrorCode (the six validation categories — see Errors.ts)
    Calculation.ts                   CalculationRequest, CalculationResult, ModelCalculationOutput

  models/
    ModelDefinition.ts    The one interface every model implements
    registry.ts             register/resolve/list models by id
    index.ts                  Plugin manifest — the only file a new model's registration touches
    thermodynamics/
      ideal/                   Scc(0) = x(1-x) — IMPLEMENTED AND VERIFIED
      regular/                  Scc(0) = x(1-x)/[1-(2W/RT)x(1-x)] — IMPLEMENTED, derivation documented in metadata.ts
        parameters.ts              resolveRegularSolutionParameters(): this model's opt-in entry point into the resolver
      quasi-chemical/            The original migrated model — unchanged (golden model)
        metadata.ts                Descriptive facts: refs, parameters, equations, assumptions
        model.ts                     The calculation itself + validate()
        model.test.ts                 Golden-value regression tests

  parameters/       Parameter database architecture (types + a small, empty-by-default multi-set store + a resolver)
    types.ts            ParameterValue (status, uncertainty, notes), ParameterSet (setId, valid T/composition ranges)
    parameterStore.ts     register/find ParameterSet(s) by (modelId, CANONICAL system) — no data pre-seeded
    resolve.ts             resolveParameterSet(): FOUND/NOT_FOUND/OUT_OF_RANGE/PROVISIONAL/AMBIGUOUS — never guesses

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
- `core/SystemIdentity.test.ts`, `parameters/parameterStore.test.ts`, and
  `parameters/resolve.test.ts` cover canonical/reversed/ternary system
  identity, multi-set registration, and all five resolver states
  (including a test that resolves the real Quasi-Chemical model id
  against an empty store to confirm `NOT_FOUND` rather than a fabricated
  value). `models/thermodynamics/regular/parameters.test.ts` repeats the
  key cases through Regular Solution's own resolver wrapper, plus explicit
  cross-model/cross-system non-confusion checks.

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

## System identity

`core/SystemIdentity.ts`'s `identifySystem(composition)` returns:

```ts
{
  canonicalId: "Au-Cu",     // order-independent — Au-Cu and Cu-Au both give this
  orderedSymbols: ["Au", "Cu"],
  orderedLabel: "Au-Cu",    // order-preserving — see Material.ts's systemLabel()
}
```

Two identities, on purpose: `orderedLabel` is what `Material.ts`'s
pre-existing `systemLabel()` already produced (unchanged) and what an
order-sensitive model still needs — Quasi-Chemical and Regular Solution
both define `x` as `composition.components[0].fraction`, so which element
was listed first matters to *them*. `canonicalId` is order-INDEPENDENT —
built via `canonicalizeSystemLabel()`, which alphabetically sorts the
dash-separated symbols — and is what the parameter store keys its lookups
by, since a literature W value for "the Au-Cu system" is the same
physical quantity regardless of which element a caller lists first.
Generalizes to any component count without redesign: `identifySystem` on
an Au-Cu-Ni or Fe-Ni-Cr composition, in any input order, produces one
stable canonical id ("Au-Cu-Ni", "Cr-Fe-Ni").

Alphabetical sort is a genuine, named choice — not a silent assumption.
It's the standard, defensible default for metallic systems, but
`canonicalizeSystemLabel` is its own function specifically so a future
domain that needs a different canonicalization convention can introduce
one without touching `identifySystem`'s callers.

## Parameter architecture

Phase 2A built the *shape* of a parameter database; Phase 2B turns it
into one. Phase 2C went looking for real Au-Cu literature data to put in
it — `engine/data/parameterSets/auCu.ts` holds three real, cited records
(Sundman/Fries/Oates 1998, Singh/Sommer 1997, Su/Wang 2013), and every one
of them still has `status: "unavailable"`, because none could be
independently verified against a primary source in this environment. See
`engine/data/parameterSets/DATA_MANIFEST.md` for the full compatibility
assessment (including why a real CALPHAD Au-Cu assessment's Redlich-Kister
parameterization is not directly usable by this project's single-W Regular
Solution model) and exactly what was and wasn't retrievable. The parameter
store itself remains **empty by default** — those records are not
auto-registered — and no real numeric data exists anywhere in this
codebase. Every field below exists so that when real, cited, *verifiable*
data is available, it has somewhere honest to go.

- **`parameters/types.ts`** — `ParameterValue`: `key`, optional `name`,
  optional `value` (a number — **required** unless `status` is
  `"unavailable"`, in which case it **must be absent**; this is how a
  placeholder record says "we know this parameter is needed but have no
  verified number" without ever inventing one), `unit`, `source`
  (`core/ParameterSource.ts` — now also carrying optional `doi`/
  `publicationYear`), `status` (`"verified" | "provisional" |
  "unavailable"`), optional `uncertainty`, optional `notes`.
  `ParameterSet`: `setId` (uniquely identifies *this* set among possibly
  several competing ones for the same model+system), `modelId`, `system`
  (as the registrant wrote it — not forced to canonical order),
  `validTemperatureRangeK?`, `validCompositionRangeMoleFraction?`, and
  `parameters: ParameterValue[]`.
- **`parameters/parameterStore.ts`** — now `Map<string, ParameterSet[]>`
  (Phase 2A was one set per key; Phase 2B supports several, e.g. two
  literature sources both reporting W for Au-Cu), keyed by
  `(modelId, canonicalizeSystemLabel(system))` — registering under
  `"Cu-Au"` and looking up `"Au-Cu"` finds the same entries.
  `registerParameterSet` **appends** (Phase 2A's version overwrote) and
  rejects a duplicate `setId` within the same key. `findParameterSet`
  keeps its exact Phase 2A signature and behavior (`sets[0]`) for backward
  compatibility; the new `findAllParameterSets` exposes the full list.
  `toParameterRecord` skips any parameter with no value rather than
  coercing `undefined` into the `Record<string, number>` shape
  `CalculationRequest.parameters` expects.
- **`parameters/resolve.ts`** — `resolveParameterSet({ modelId, composition, conditions?, requiredKeys? })`
  is where "does an applicable parameter set exist" gets answered, as one
  of five explicit states, never a silent pick:

  | Status | Meaning |
  |---|---|
  | `FOUND` | Exactly one applicable, verified set. |
  | `PROVISIONAL` | Exactly one applicable set, but not independently verified. |
  | `NOT_FOUND` | Nothing registered for this (model, canonical system) — or everything registered is `"unavailable"`. |
  | `OUT_OF_RANGE` | Set(s) exist but none cover the requested temperature/composition. |
  | `AMBIGUOUS` | More than one set applies — the resolver refuses to pick one; every candidate is returned for the caller to choose from explicitly. |

  Contains no scientific equations and isn't specific to any model — the
  same function resolves Regular Solution's `W` or a future MIVM model's
  parameters identically (proven in `resolve.test.ts` by resolving a
  fixture registered under the real Quasi-Chemical model id).

  An `AMBIGUOUS` result isn't a dead end: the query can carry an optional
  `preferredSetId` (Phase 2C) so a caller who already knows which source
  they want (e.g. a user picking one of two displayed literature values)
  resolves directly to it instead of the resolver ever guessing between
  them. It has no effect unless a genuine ambiguity exists to narrow.

How a model requests and validates parameters hasn't changed since Phase
1a: `ModelDefinition.requiredParameters: ModelParameterSpec[]` declares
what's needed, and the model's own `validate()` checks presence/range
(now categorized as `INVALID_PARAMETER` — see Errors.ts). The resolver is
a separate, **opt-in** layer above that — `CalculationPipeline.ts` does
not call it, and no model's `calculate()`/`validate()` was changed to call
it either (see "Regular Solution's resolver integration" below for why).

## Regular Solution's resolver integration

`models/thermodynamics/regular/parameters.ts` exports
`resolveRegularSolutionParameters(material, conditions)` — a thin wrapper
around `resolveParameterSet({ modelId: REGULAR_SOLUTION_SCC0_MODEL_ID, composition: material.composition, conditions, requiredKeys: ["W"] })`.

This is deliberately **not** wired into `regular/model.ts`'s
`calculate()`/`validate()` or into `CalculationPipeline.ts`. A caller
(a future UI, a script, a test) uses it *before* building a
`CalculationRequest`, to find out whether a verified `W` exists for the
requested system/temperature and decide what to do — proceed, show
"parameter not available," ask the user to supply one — without the
engine ever guessing on the caller's behalf. Keeping this separate from
the pipeline is what keeps Regular Solution's `calculate()`/`validate()`
(and all 118 Phase 1a/1b/2A tests) at zero regression risk this phase.

Because the store ships with no real data, calling this against the real
Au-Cu system today returns `NOT_FOUND` — `parameters.test.ts` asserts
exactly that against the actual, unmodified production store, plus that
no numeric `W` value appears anywhere in the result. The same file also
registers synthetic (clearly-labeled, non-real) fixtures to exercise
`FOUND`, `OUT_OF_RANGE`, and `AMBIGUOUS`, and confirms a fixture
registered for a different system (Fe-Ni) or a different model
(Quasi-Chemical) is never returned for an Au-Cu Regular Solution query —
model- and system-scoping are structural (an exact `Map` key match, no
fuzzy fallback), not something that can be accidentally bypassed.

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

## What's deliberately not here (Phase 2B scope)

- Any UI, chart, form, or DOM code — the engine has zero dependency on
  React, the DOM, or any browser API. Phase 2B did not touch `app/` or
  `index.html` at all.
- **Real numeric data in the parameter store.** The store, resolver, and
  system-identity architecture are all implemented and tested, but
  `parameters/parameterStore.ts` still registers nothing by default — see
  "Parameter architecture" above for why, and `resolve.test.ts`/
  `regular/parameters.test.ts` for the tests proving the real Au-Cu system
  resolves to `NOT_FOUND` today rather than a fabricated value. Populating
  this with a real, cited dataset (starting with Au-Cu W/Z if a citable
  source is found) is the natural next step and needs no architecture
  changes — just `registerParameterSet()` calls with real `ParameterValue`
  entries.
- **`CalculationPipeline.ts` auto-resolving parameters from the store.**
  The resolver is opt-in (a caller resolves *before* building a
  `CalculationRequest`) rather than wired into the pipeline itself — see
  "Regular Solution's resolver integration" above for why this was the
  lower-risk design for this phase specifically.
- **MIVM, CALPHAD, and Self-Association models** — not implemented. Each
  needs its own equation identified/derived and verified the way Regular
  Solution was in Phase 2A, which both phases' briefs explicitly deferred
  to a separate, dedicated phase per model. When built, each gets a
  parameter architecture for free: `ParameterSet`/`ParameterValue` and
  `resolveParameterSet()` are already generic over `modelId` — a MIVM
  model registers its own parameter sets under its own model id and calls
  `resolveParameterSet({ modelId: MIVM_MODEL_ID, ... })` exactly the way
  Regular Solution's wrapper does, with no changes to `types.ts`,
  `parameterStore.ts`, or `resolve.ts`. Use the standard spelling
  "CALPHAD" (CALculation of PHAse Diagrams) when that model is built — it
  names a specific, well-established computational thermodynamics
  methodology, not a similarly-named approximation.
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
