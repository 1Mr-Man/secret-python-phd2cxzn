# Materials Engine

A framework-agnostic TypeScript calculation engine for metals-and-alloys
physics. Phase 1a built the core architecture plus one migrated model (the
Au–Cu Quasi-Chemical Scc(0) calculation). Phase 1b connected it to the
existing calculator page — see `../ARCHITECTURE.md` for how `app/` calls
into this engine and why the boundary is drawn there. No UI, charts,
database, or authentication live in `engine/` itself: this directory has
zero dependency on the DOM, React, or any browser API, by design.

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
    Material.ts        Composition, Component, Material, classifySystem, validateComposition
    Conditions.ts       Temperature/pressure/strain/field state, validateConditions
    Units.ts             PhysicalQuantity (value + unit label)
    Constants.ts          Physical constants actually used by a shipped model
    Reference.ts           Citation shape
    Property.ts             PropertyDomain, PropertyDefinition
    Validation.ts             ValidationIssue/ValidationResult primitives
    Errors.ts                  EngineError + EngineErrorCode
    Calculation.ts               CalculationRequest, CalculationResult, ModelCalculationOutput

  models/
    ModelDefinition.ts    The one interface every model implements
    registry.ts             register/resolve/list models by id
    index.ts                  Plugin manifest — the only file a new model's registration touches
    thermodynamics/
      quasi-chemical/
        metadata.ts             Descriptive facts: refs, parameters, equations, assumptions
        model.ts                  The calculation itself + validate()
        model.test.ts              Golden-value regression tests

  pipeline/
    CalculationPipeline.ts   The one calculation pipeline, model-agnostic
    CalculationPipeline.test.ts

  data/
    elements.ts          Minimal seed data (Au, Cu identity only)

  index.ts              Public API barrel — the only import path for app/
  version.ts            ENGINE_VERSION

app/                   UI — see ../ARCHITECTURE.md
  qcAdapter.ts             Translates DOM inputs <-> CalculationRequest/Result; the only file here that imports engine/
  main.ts                   DOM rendering (table, canvas chart) — no equations, no engine imports
```

Data flows one direction: `models/*` depends on `core/*`; `pipeline/*`
depends on `core/*` and `models/registry.ts` (never on a specific model);
`index.ts` re-exports the public surface. Nothing in `core/` imports from
`models/` or `pipeline/`, and nothing in `engine/` imports from `app/`.

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

Run everything with:

```
npm run typecheck   # tsc --noEmit
npm test             # vitest run
```

## What's deliberately not here (Phase 1a scope)

- Any UI, chart, form, or DOM code — the engine has zero dependency on
  React, the DOM, or any browser API.
- A parameter database (default `W`/`Z` per system, sourced from
  literature). Callers supply parameters explicitly for now.
- Any model beyond Quasi-Chemical — Ideal Solution, Regular Solution,
  MIVM, CALPHAD, Self-Association, and the magnetic/surface/structural/
  optical/electrical domains are architected for (see `PropertyDomain`,
  `ModelDefinition`) but not implemented.
- Ternary/multicomponent support in any model — the core types
  (`classifySystem`, n-component `composition()`) already handle it, but
  Quasi-Chemical's `validate()` intentionally restricts itself to binary,
  matching what the original equation set actually describes.
- Unit conversion — units are carried as labels, not converted.
