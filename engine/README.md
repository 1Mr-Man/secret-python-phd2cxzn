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
"Parameter architecture" below. Phase 2E-A/B added a fourth model, MIVM
(binary; production Au-Cu parameter data still unavailable — see "What's
deliberately not here" below). Phase 3 added `app/workbench/*` +
`workbench.html`, a generic UI driving any registered model against any
material system, alongside (not replacing) the original Au-Cu calculator
— see `../ARCHITECTURE.md`. Phase 4 added real unit conversion
(`core/UnitConversion.ts`) as an opt-in module. Phase 5 added
`engine/thermodynamics/` — six pure, model-independent thermodynamic-
quantity utilities (ideal mixing entropy, activity, ideal mixing Gibbs
energy, a multicomponent pairwise interaction matrix + regular-solution
mixing enthalpy, relative chemical potential, total mixing Gibbs energy)
— see "Thermodynamic utilities (Phase 5)" below. Phase 6 added
`engine/mechanics/` in four sub-phases: 6A nine scalar utilities (linear/
percentage/volumetric/thermal strain, elastic stress, and the four
independent moduli), 6B a 3x3 strain-tensor representation with
construction/validation/component-extraction and the explicit
tensorial-to-engineering shear conversion, 6C principal strains (a
closed-form symmetric eigensolver), and 6D the tensorial von Mises
equivalent strain — see "Scalar and tensor mechanics utilities (Phase
6)" below. No UI, charts, database, or authentication live in `engine/`
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

  thermodynamics/    Pure, model-independent thermodynamic-quantity utilities (Phase 5) — no modelId, never run through the pipeline
    mixingEntropy.ts           idealMixingEntropy(): ideal molar entropy of mixing
    activity.ts                    activity(): a_i = gamma_i * x_i
    idealMixingGibbsEnergy.ts        idealMixingGibbsEnergy(): RT * sum(x_i ln x_i)
    interactionMatrix.ts               InteractionMatrix type, its validators, canonicalPairKey(), buildInteractionLookup()
    mixingEnthalpy.ts                    regularSolutionMixingEnthalpy(): sum over i<j of Omega_ij * x_i * x_j
    chemicalPotential.ts                   relativeChemicalPotential(): RT * ln(a_i), relative to the pure-component reference
    totalMixingGibbsEnergy.ts                totalMixingGibbsEnergy(): ideal + excess Gibbs energy of mixing

  mechanics/         Pure, model-independent scalar and tensor mechanics utilities (Phase 6) — no modelId, never run through the pipeline
    linearStrain.ts, percentageStrain.ts, volumetricStrain.ts,
    thermalStrain.ts, elasticStress.ts, youngsModulus.ts,
    shearModulus.ts, bulkModulus.ts, poissonsRatio.ts         6A — scalar utilities
    strainTensor.ts, strainTensorComponents.ts,
    engineeringShearStrain.ts, volumetricStrainFromTensor.ts  6B — 3x3 strain tensor
    principalStrains.ts                                       6C — eigenvalues
    equivalentStrain.ts                                       6D — von Mises equivalent strain

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

Every model — today's Ideal Solution, Regular Solution, Quasi-Chemical, and
MIVM, or a future CALPHAD, Self-Association, or magnetic/surface/optical
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

Adding CALPHAD, Self-Association, or any other model never touches the
pipeline or the registry's internals — MIVM (below) was added this way
without changing any of the files this section describes. The steps are:

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

Phase 2A built the *shape* of a parameter database; Phase 2B turned it
into one; Phase 2C went looking for real Au-Cu literature data to put in
it; Phase 2D made the *quality* of that data structured and checkable
instead of prose-only. **No numerical scientific value has been verified
in any of these phases.** `engine/data/parameterSets/auCu.ts` holds three
real, cited records (Sundman/Fries/Oates 1998, Singh/Sommer 1997,
Su/Wang 2013), and every one of them still has `status: "unavailable"`,
because none could be independently verified against a primary source in
this environment. See `engine/data/parameterSets/DATA_MANIFEST.md` for
the full compatibility assessment. The parameter store itself remains
**empty by default** — those records are not auto-registered — and no
real numeric data exists anywhere in this codebase.

### Three separate questions, three separate concepts

Phase 2D's central architectural rule: these must never be conflated,
because they're genuinely different questions with different answers.

```
PARAMETER STATUS     "What is the verification state of THIS NUMBER?"
      |                (ParameterValue.status — stored, per value)
      v
COMPATIBILITY         "Can this SOURCE's parameterization even be used
      |                 by this model, in shape?"
      |                (ParameterSet.compatibility — stored, per set,
      |                 authoritative)
      v
RESOLUTION STATUS     "What happened when the engine tried to resolve
                        a QUERY against what's registered?"
                       (ParameterResolutionStatus — computed at query
                        time, never stored — see resolve.ts)
```

A set can be `"directly_compatible"` in shape while every value inside it
is still `"unavailable"` (nobody has confirmed a number yet) — Singh &
Sommer's Au-Cu record is exactly this. A set can never be
`"not_compatible"` (or `"requires_explicit_transformation"`) and contain
a usable value — `validateParameterSet` enforces this structurally, not
just by convention. And `AMBIGUOUS` is never something you'll find stored
on a record — it only exists as an answer to a specific query, computed
fresh each time from whatever happens to be registered.

- **`parameters/types.ts`** — `ParameterValue`: `key`, optional `name`,
  optional `value` (required unless `status` is `"unavailable"`, in which
  case it **must be absent** — this is how a placeholder record says "we
  know this parameter is needed but have no verified number" without ever
  inventing one), `unit`, `source` (`core/ParameterSource.ts`), `status`
  (`ParameterStatus`, below), optional `uncertainty`, optional
  `derivation` (`DerivationRecord`), optional `verification`
  (`VerificationRecord`), a rare optional per-value `compatibility`
  override, optional `notes`. `ParameterSet` adds the **authoritative**
  `compatibility?: CompatibilityAssessment` field, plus everything from
  Phase 2B (`setId`, `modelId`, `system`, the two valid-range fields).
- **`parameters/compatibility.ts`** (new, Phase 2D) — `CompatibilityAssessment`
  (`"directly_compatible" | "requires_explicit_transformation" | "not_compatible"`),
  `SourceLocation` (`{ type: "table"|"equation"|"figure"|"page"|"section"|"other", identifier?, page?, description? }`
  — structured, e.g. `{type:"table", identifier:"3", page:112}` for
  "Table 3, p. 112", never free text alone), `DerivationRecord`
  (`transformationEquation`, `assumptions`, `sourceValues`, `derivedBy?`,
  `derivedAt?`), and `VerificationRecord` (`method: "direct_read"|"cross_checked"|"derived"`,
  `location?: SourceLocation`, `verifiedBy?`, `verifiedAt?`).
- **`ParameterStatus`** (`parameters/types.ts`) is now four values:
  `"verified_direct"` (read straight off a cited source — the strongest
  status), `"verified_derived"` (computed via a documented, reviewable
  transformation from directly-verified inputs — see `DerivationRecord`),
  `"provisional"` (a number exists, not independently checked), and
  `"unavailable"` (no number at all). Splitting the old single `"verified"`
  into two was low-risk: `resolve.ts` never tested that literal string —
  it only ever checked for `"provisional"` (demote) and `"unavailable"`
  (exclude) — so the split cost zero resolver logic changes, only test
  fixture literals.
- **`parameters/validateParameterRecord.ts`** (new, Phase 2D) —
  `validateParameterValue()` and `validateParameterSet()`, structural
  checks that don't judge whether a *number* is scientifically correct
  (that's a human/literature question) but do enforce internal
  consistency: an `"unavailable"` value can't carry a value, derivation,
  or uncertainty; `"verified_direct"` requires a `verification` record
  (method `direct_read` or `cross_checked`) and forbids a `derivation`;
  `"verified_derived"` requires both a `verification` record (method
  `derived`) *and* a complete `DerivationRecord` — non-empty
  `transformationEquation`, at least one `assumptions` entry, and
  non-empty `sourceValues` — so "verified_derived" can never become a
  label for an undocumented calculation; a `literature`/`database` source
  should carry a `citation`; a set-level `"requires_explicit_transformation"`
  or `"not_compatible"` classification forbids every parameter in that
  set from having a usable status; and a parameter-level `compatibility`
  override may only be *equally or more restrictive* than its set's — an
  override can never claim to be more permissive than the authoritative
  set-level classification.
- **`parameters/parameterStore.ts`** — `Map<string, ParameterSet[]>`
  keyed by `(modelId, canonicalizeSystemLabel(system))`; registering
  under `"Cu-Au"` and looking up `"Au-Cu"` finds the same entries.
  `registerParameterSet` **validates first** (Phase 2D.1 —
  `validateParameterSet()`, throwing before anything is written on
  failure), then rejects a duplicate `setId` within the same key, then
  **appends**; `findParameterSet` keeps its original single-result
  signature for backward compatibility; `findAllParameterSets` exposes
  the full list. `toParameterRecord` skips any parameter with no value.
- **`parameters/resolve.ts`** — `resolveParameterSet({ modelId, composition, conditions?, requiredKeys?, preferredSetId? })`
  answers "does an applicable, unambiguous, usable parameter set exist"
  as one of five states, never a silent pick:

  | Status | Meaning |
  |---|---|
  | `FOUND` | Exactly one applicable set with a usable (non-provisional) value. |
  | `PROVISIONAL` | Exactly one applicable set, but at least one relevant value isn't independently verified. |
  | `NOT_FOUND` | Nothing registered for this (model, canonical system) — or everything registered is `"unavailable"`. |
  | `OUT_OF_RANGE` | Set(s) exist but none cover the requested temperature/composition. |
  | `AMBIGUOUS` | More than one set applies — the resolver refuses to pick one; every candidate is returned for the caller to choose from explicitly. |

  Contains no scientific equations and isn't specific to any model — the
  same function resolves Regular Solution's `W`, Quasi-Chemical's `Z`/`W`,
  or a future MIVM model's parameters identically. An `AMBIGUOUS` result
  isn't a dead end: `preferredSetId` lets a caller who already knows which
  source they want resolve directly to it, and it can only ever *narrow*
  a genuine ambiguity, never invent one.
- **`parameters/toRequestParameters.ts`** (new, Phase 2D) —
  `toRequestParameters(resolution, requiredKeys?)` converts a `FOUND` or
  `PROVISIONAL` resolution into the exact `{ parameters, parameterSources }`
  shape `CalculationRequest` expects, copying each value's `source`
  through unchanged. This mechanizes what Phase 2C's end-to-end test did
  by hand — a caller can no longer forget to carry provenance through —
  and throws for any other resolution status (`NOT_FOUND`/`OUT_OF_RANGE`/
  `AMBIGUOUS`), since there is no single resolved set to convert and
  building a request from one of those would either fabricate a parameter
  or silently pick among competing sources.

How a model requests and validates parameters hasn't changed since Phase
1a: `ModelDefinition.requiredParameters: ModelParameterSpec[]` declares
what's needed, and the model's own `validate()` checks presence/range.
The resolver (and everything built on it) is a separate, **opt-in** layer
above that — `CalculationPipeline.ts` does not call it, and no model's
`calculate()`/`validate()` was changed to call it either.

## Resolver integration: Regular Solution and Quasi-Chemical

Both `models/thermodynamics/regular/parameters.ts`
(`resolveRegularSolutionParameters`) and
`models/thermodynamics/quasi-chemical/parameters.ts`
(`resolveQuasiChemicalParameters`, added Phase 2D) are thin wrappers
around `resolveParameterSet`, scoped to their own model id and their own
required keys (`["W"]` for Regular Solution; `["Z", "W"]` for
Quasi-Chemical) — mirrors of each other, both taking the same optional
`preferredSetId`.

Neither is wired into its model's `calculate()`/`validate()` or into
`CalculationPipeline.ts`. A caller (a future UI, a script, a test) uses
one *before* building a `CalculationRequest`, to find out whether a
verified value exists for the requested system/temperature and decide
what to do — proceed, show "parameter not available," ask the user to
supply one — without the engine ever guessing on the caller's behalf.
Keeping this separate from the pipeline is what keeps every model's
`calculate()`/`validate()` (and all 232 tests as of Phase 2D) at zero
regression risk when this layer changes.

Because the store ships with no real data, calling either wrapper against
the real Au-Cu system today returns `NOT_FOUND` — `parameters.test.ts`
(both models') asserts exactly that against the actual, unmodified
production store, plus that no numeric value appears anywhere in the
result. The same files register synthetic (clearly-labeled, non-real)
fixtures to exercise `FOUND`, `OUT_OF_RANGE`, and `AMBIGUOUS`, and confirm
a fixture registered for a different system or a different model is never
returned for an Au-Cu query — model- and system-scoping are structural
(an exact `Map` key match, no fuzzy fallback), not something that can be
accidentally bypassed.

`parameters/toRequestParameters.test.ts` chains the whole thing together
end to end for both models: register a fixture → resolve it → convert
with `toRequestParameters` → `runCalculation` → check
`CalculationResult.parameterProvenance` carries the exact same `source`
object the fixture was registered with. Quasi-Chemical's version of this
test also checks the resulting `Scc0` against the existing golden value —
proof this whole new layer changes nothing about the equation itself.

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

## Thermodynamic utilities (Phase 5)

`engine/thermodynamics/` (distinct from `engine/models/thermodynamics/`
above) holds six pure functions — no `modelId`, never registered, never
run through `CalculationPipeline.ts` — each one a standalone
model-independent thermodynamic quantity rather than a full model:

- `idealMixingEntropy(composition)` — `ΔS_mix^ideal = -R*sum(x_i*ln(x_i))`
- `activity(gamma_i, x_i)` — `a_i = gamma_i * x_i`
- `idealMixingGibbsEnergy(composition, temperatureK)` — `ΔG_mix^ideal = RT*sum(x_i*ln(x_i))`
- `InteractionMatrix` + `regularSolutionMixingEnthalpy(composition, matrix)` —
  a multicomponent pairwise interaction table (`Ω_ij`, canonicalized via
  `SystemIdentity.ts`'s existing `canonicalizeSystemLabel()`) and
  `ΔH_mix = sum over i<j of Ω_ij * x_i * x_j`
- `relativeChemicalPotential(activity, temperatureK)` — `Δμ_i = RT*ln(a_i)`,
  relative to the pure-component reference state, never absolute `μ_i`
- `totalMixingGibbsEnergy(idealGibbsEnergy, excessGibbsEnergy)` —
  `ΔG_mix = ΔG_mix^ideal + G^E`, a plain sum of two caller-supplied terms

Each composes with the existing models at the call site rather than being
called by them or reimplementing their math: e.g.
`totalMixingGibbsEnergy(idealMixingGibbsEnergy(...), mivmResult.GmE)`. `Ω_ij`
is deliberately the same interaction-energy convention as Regular
Solution's `W` only — never Quasi-Chemical's `W` or MIVM's `B_ij`/`B_ji`,
which are non-interchangeable conventions (see `interactionMatrix.ts`'s
header comment). Validation reuses `validateComposition()` and
`validateConditions()` rather than introducing a second validation system.
See each file's own header comment for its full derivation and scope
notes.

## Scalar and tensor mechanics utilities (Phase 6)

`engine/mechanics/` (distinct from any future `engine/models/<domain>/`
mechanical model) holds pure functions — no `modelId`, never registered,
never run through `CalculationPipeline.ts` — built in four sub-phases,
each individually audited:

- **6A — scalar utilities**: `linearStrain(L, L0)` = `(L-L0)/L0`;
  `percentageStrain(strain)` = `strain*100`; `volumetricStrain(V, V0)` =
  the exact `(V-V0)/V0`; `thermalStrain(alpha, deltaT)` = `alpha*deltaT`;
  `elasticStress(E, strain)` = `E*strain` (uniaxial linear-elastic
  regime only — deliberately not named `stress()`); and four
  independent moduli, `youngsModulus(stress, strain)`,
  `shearModulus(shearStress, shearStrain)`,
  `bulkModulus(deltaP, volumetricStrain)`,
  `poissonsRatio(transverseStrain, axialStrain)` — no E/G/K/ν relation
  formula is implemented; each is computed only from its own defining
  ratio.
- **6B — 3x3 strain tensor**: `StrainTensor` stores **tensorial** shear
  strain (`ε_ij`, not engineering `γ_ij=2ε_ij`) — `createStrainTensor()`
  builds one from named components and validates it;
  `validateStrainTensor()` enforces exactly 3x3, finite, and exactly
  symmetric; `normalStrainComponents()` / `tensorialShearStrainComponents()`
  extract by name; `engineeringShearStrain(ε_ij)` = `2*ε_ij` is the one
  explicit, separately-named conversion to engineering shear — never
  applied implicitly; `volumetricStrainFromTensor(tensor)` = `tr(ε)`, the
  small-strain approximation, distinct from and never composed with 6A's
  exact `volumetricStrain()`.
- **6C — principal strains**: `principalStrains(tensor)` returns
  `{epsilon1, epsilon2, epsilon3}` (`epsilon1>=epsilon2>=epsilon3`), the
  eigenvalues of the strain tensor via the closed-form analytic
  trigonometric method for a real symmetric 3x3 matrix (Smith, 1961) —
  not an iterative solver. Eigenvalues only, no eigenvectors.
- **6D — von Mises equivalent strain**: `equivalentStrain(tensor)` — a
  single-state distortional-strain scalar computed directly from the
  tensor's raw tensorial components (never via `principalStrains()` or
  `engineeringShearStrain()`), using the `4/3` shear coefficient correct
  for the tensorial convention. Not a von Mises stress, not a yield
  criterion, and not the path-dependent accumulated equivalent plastic
  strain of flow-plasticity theory — see the file's own header comment.

All validation reuses `validateStrainTensor()` (6B) rather than each
later utility duplicating it, and every error is `INVALID_INPUT` —
there is no `SCIENTIFIC_DOMAIN_ERROR` case anywhere in this module
except 6A's zero-denominator/non-positive-modulus checks. Deliberately
out of scope: eigenvectors, von Mises *stress*, yield strength/criteria,
stress-strain curves, plasticity, composition-dependent mechanical
models, and any mechanical material data — see each phase's own audit
for why. See each file's own header comment for its full derivation.

## What's deliberately not here (through Phase 2D)

> **Update, Phase 2E-B onward:** this section is a dated snapshot — read
> its heading. Since Phase 2D, MIVM was implemented (Phase 2E-B; binary,
> tests passing — see the MIVM bullet below for what's still genuinely
> missing), the generic Workbench UI was added (Phase 3, `workbench.html`
> + `app/workbench/*` — see `ARCHITECTURE.md`), and real unit conversion
> was added (Phase 4, `core/UnitConversion.ts` — see the unit-conversion
> bullet below). Everything else in this list is still accurate as of
> Phase 4. Don't re-implement anything this note already says is done.

- Any UI, chart, form, or DOM code — the engine has zero dependency on
  React, the DOM, or any browser API. No phase through 2D has touched
  `app/` or `index.html`.
- **Any verified numeric value in the parameter store.** The store,
  resolver, system-identity, compatibility, and validation architecture
  are all implemented and tested, but `parameters/parameterStore.ts`
  still registers nothing by default, and the three real, cited Au-Cu
  records in `data/parameterSets/auCu.ts` all remain `status:
  "unavailable"` after Phase 2D as well — see "Parameter architecture"
  above and `DATA_MANIFEST.md` for why, and `resolve.test.ts` /
  `regular/parameters.test.ts` / `quasi-chemical/parameters.test.ts` for
  the tests proving the real Au-Cu system resolves to `NOT_FOUND` today
  rather than a fabricated or prematurely-trusted value. Upgrading any
  record from `"unavailable"` to `"verified_direct"` or
  `"verified_derived"` needs no architecture change — just a `value` and
  a `verification`/`derivation` record satisfying `validateParameterRecord.ts`.
- ~~`validateParameterSet`/`validateParameterValue` are not wired into
  `registerParameterSet`~~ — **fixed in Phase 2D.1.** Through Phase 2D,
  validation was an opt-in check a data author had to remember to run
  before registering a set; `registerParameterSet()` now calls
  `validateParameterSet()` itself and throws — before anything is
  written to the store, and before the pre-existing duplicate-setId
  check — if the set fails any of `validateParameterRecord.ts`'s rules.
  Registration is now all-or-nothing: a caller can no longer observe a
  set in the store that contradicts its own stated status/compatibility.
  Fixing this touched every pre-2D.1 test fixture across the codebase
  that predated the `verification`/`derivation` fields (adding the now-
  required `VerificationRecord` to each, and a missing `citation` where
  one was absent) — see `parameterStore.test.ts`'s "registration-time
  validation" tests for the rejection cases (an unavailable parameter
  carrying a value, a verified_* status missing its record, a blocked
  set containing a usable value, a less-restrictive parameter-level
  override, a missing citation) and for confirmation that a rejected set
  never partially enters the store. `toRequestParameters.ts` still keeps
  its own independent, redundant checks (never emitting an `unavailable`
  parameter, refusing a blocked set) as defense-in-depth beneath this
  gate, not instead of it — belt and suspenders, not either/or.
- **`CalculationPipeline.ts` auto-resolving parameters from the store.**
  The resolver is opt-in (a caller resolves *before* building a
  `CalculationRequest`) rather than wired into the pipeline itself — see
  "Resolver integration: Regular Solution and Quasi-Chemical" above for
  why this was the lower-risk design.
- **MIVM** — **implemented since Phase 2E-B** (`engine/models/thermodynamics/mivm/`,
  binary, Hang & Tao (2023) convention — see that model's `metadata.ts`
  header and `docs/MIVM_MATHEMATICAL_AUDIT.md` for the full derivation and
  source-disambiguation trail). What's still genuinely missing is
  **production parameter data**: no verified Au-Cu `B_ij`/`B_ji`/`Z_i`/
  `Z_j`/`V_mi`/`V_mj` values exist anywhere in `engine/data/parameterSets/`
  — `resolveMivmParameters()` correctly returns `NOT_FOUND` for every
  system, and the Phase 2E-C/C2/C3/C3.1 audit trail (`docs/`) documents
  exactly why every candidate source found so far didn't clear this
  project's provenance bar. Do not add a numeric MIVM value without
  reading that audit trail first.
- **CALPHAD and Self-Association models** — not implemented. Each needs
  its own equation identified/derived and verified the way Regular
  Solution was in Phase 2A and MIVM was in Phase 2E-A/B, which every phase
  building a new model has explicitly deferred to its own dedicated phase.
  When built, each gets a parameter architecture for free:
  `ParameterSet`/`ParameterValue` and `resolveParameterSet()` are already
  generic over `modelId` — a new model registers its own parameter sets
  under its own model id and calls `resolveParameterSet({ modelId:
  NEW_MODEL_ID, ... })` exactly the way Regular Solution's and MIVM's
  wrappers do, with no changes to `types.ts`, `parameterStore.ts`, or
  `resolve.ts`. Use the standard spelling "CALPHAD" (CALculation of PHAse
  Diagrams) when that model is built — it names a specific,
  well-established computational thermodynamics methodology, not a
  similarly-named approximation.
- **Magnetic, optical, electrical, structural, surface, and mechanical
  (`mechanical_strain`) properties — no `ModelDefinition` in any of
  these domains exists yet.** Mechanical is the one exception with real
  code: Phase 6 added `engine/mechanics/`'s pure scalar/tensor utilities
  (see "Scalar and tensor mechanics utilities (Phase 6)" above) — but
  those are standalone functions, not a registered model; nothing in the
  `mechanical_strain` domain is resolvable through
  `runCalculation()`/the registry/comparison/sweep machinery. The
  `PropertyDomain` union (`core/Property.ts`) already lists all of these
  domains and `ModelDefinition` is domain-agnostic. Each plugs in
  exactly like Ideal/Regular/Quasi-Chemical did: a new
  `engine/models/<domain>/<model-id>/` folder implementing
  `ModelDefinition`, registered in `models/index.ts`, resolvable through
  the same registry/pipeline/comparison/sweep machinery with zero changes
  to any of those files. What changes per new domain is only the
  `Conditions` fields it reads (e.g. a magnetic model reading
  `magneticFieldTeslas`, already a field on `Conditions` since Phase 1a)
  and, likely, new `Element` parameter groups (`core/Element.ts` already
  has empty `magnetic`/`optical`/`electrical`/`structural`/`surface`
  groups reserved for exactly this).
- Ternary/multicomponent support in any current model (Ideal, Regular,
  Quasi-Chemical, MIVM — all binary-only) — the core types
  (`classifySystem`, n-component `composition()`, `CompositionSweep`'s
  generic `compositionAt`) already handle an n-component `Composition`,
  and the Workbench's Material System builder (Phase 3) can construct one,
  but each model's `validate()` intentionally restricts itself to binary,
  matching what each model's equation, as established, actually describes.
  A ternary composition run against any of them correctly surfaces that
  model's own "requires exactly 2 components" validation error — that's
  the honest current behavior, not a bug to route around.
- ~~Unit conversion — units are carried as labels, not converted.~~
  **Added in Phase 4**: `core/UnitConversion.ts` (`convert()` /
  `convertQuantity()`), a registry-based converter for the unit families
  the project's models/Conditions actually use plus the near-term ones
  strain/magnetism/electrical will need. It's opt-in — no existing
  model's `quantity()` call site or unit string changed, and it isn't
  wired into `CalculationPipeline.ts`.
