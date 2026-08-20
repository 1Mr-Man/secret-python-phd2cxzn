# Architecture: UI ↔ Engine boundary

This document explains how the UI talks to the calculation engine
(`engine/`), and why the boundary between them is drawn where it is. Since
Phase 3 there are **two** pages, both built the same way (plain HTML +
vanilla TS, no framework) and both importing only from `engine/index.ts`:

- `index.html` + `app/main.ts`/`app/qcAdapter.ts` — the original,
  single-model Au-Cu Quasi-Chemical calculator (Phase 1b). Unchanged by
  every phase since — see "What Phase 3 intentionally did not change"
  below.
- `workbench.html` + `app/workbench/*` — the generic Materials Physics
  Workbench (Phase 3), which can drive *any* registered model against
  *any* material system. See "Request → response flow for the generic
  Workbench page" below.

For the engine's own internals (core types, the model plugin contract, the
calculation pipeline), see `engine/README.md`.

## The dependency rule

```
app/ (UI)
  │  imports
  ▼
engine/index.ts  (the ONLY file app/ is allowed to import from)
  │
  ▼
engine/{core,models,pipeline}/*
```

`app/` may only import from `engine/index.ts` — never reach into
`engine/core/*`, `engine/models/*`, or `engine/pipeline/*` directly. This
is enforced by convention (not a lint rule yet): every file under `app/`
that imports the engine — `app/qcAdapter.ts` (classic calculator) and,
since Phase 3, several files under `app/workbench/` (`main.ts`,
`materialForm.ts`, `modelPicker.ts`, `parameterForm.ts`,
`conditionsForm.ts`, `resultsPanel.ts`) — imports exclusively from
`engine/index.ts`. Keep it that way as more screens are added.

The reverse import — `engine/` depending on anything in `app/`, the DOM,
or a UI framework — must never happen. `engine/` has no dependency on
React, the DOM, `window`, or any browser API. That's what makes it usable
from a future CLI, a test suite, a notebook, or a different UI entirely,
without change.

## Request → response flow for the Au–Cu calculator page

```
index.html inputs (#temperature, #coordination, #energy, #step)
        │  read by
        ▼
app/main.ts : calculate()
        │  calls
        ▼
app/qcAdapter.ts : runQcSweep(T, Z, W, step)
        │  for each composition point x, builds
        ▼
app/qcAdapter.ts : buildQcRequest(x, T, Z, W)  →  CalculationRequest
        │  passed to
        ▼
engine/index.ts : runCalculation(request)
        │  (validate → resolve model → model-validate → calculate →
        │   normalize — see engine/README.md)
        ▼
engine : CalculationResult
        │  scalars pulled out by
        ▼
app/qcAdapter.ts  →  QcSweepPoint[] { x, scc0, scc0Ideal }, etaSquared
        │  returned to
        ▼
app/main.ts : builds the results table HTML + calls drawGraph()
        │  writes to
        ▼
index.html : #results (table), #chart (canvas)
```

Concretely, for one row of the table:

```ts
// app/qcAdapter.ts
const request: CalculationRequest = {
  material: { composition: binaryComposition(elements.Au, x, elements.Cu, 1 - x) },
  modelId: QUASI_CHEMICAL_SCC0_MODEL_ID,
  conditions: { temperatureK },
  parameters: { Z, W },
};

const result: CalculationResult = runCalculation(request);
// result.values.Scc0, result.values.Scc0Ideal, result.values.etaSquared
```

`app/main.ts` never sees a `CalculationRequest` or `CalculationResult` —
only the small `QcSweepPoint`/`QcSweepResult` shapes `qcAdapter.ts`
produces from them. That indirection is the "UI result adapter" layer:
it's the one place that knows both "what the engine returns" and "what
this screen needs to render," so neither side has to know about the
other's shape.

## Request → response flow for the generic Workbench page

```
workbench.html : Material System / Model / Conditions / Parameters cards
        │  built by
        ▼
app/workbench/materialForm.ts, modelPicker.ts, conditionsForm.ts, parameterForm.ts
        │  each collects its own piece: Composition, ModelDefinition,
        │  Conditions, Record<string, number>
        ▼
app/workbench/main.ts : calculate() / sweepComposition()
        │  assembles a CalculationRequest from those pieces, passes it to
        ▼
engine/index.ts : runCalculation(request) / runCompositionSweep(request)
        │  (the exact same pipeline the classic calculator uses — see
        │   above; nothing engine-side is Workbench-specific)
        ▼
engine : CalculationResult / CompositionSweepResult
        │  rendered generically by
        ▼
app/workbench/resultsPanel.ts (values table + "Model & Assumptions" box,
driven entirely by result.outputProperties/equations/assumptions/
references/parameterProvenance — no per-model knowledge)
app/workbench/chart.ts (one selected output property plotted at a time —
see "Why the chart only ever plots one property" below)
app/workbench/csvExport.ts / csvImport.ts
        │  write to
        ▼
workbench.html : #results-panel, #workbench-chart, #csv-import-result
```

Unlike `app/qcAdapter.ts` (which knows it's building a Quasi-Chemical
request for Au-Cu specifically), `app/workbench/main.ts` has **no
per-model or per-system knowledge**: `selectedModel.id`,
`selectedModel.requiredParameters`, `selectedModel.outputProperties`, and
the user-built `Composition` are the only things it ever reads to build a
request or render a result. Adding a new model to `engine/models/index.ts`
makes it appear in the Workbench's model picker automatically — nothing in
`app/workbench/*` needs to change.

### Why the chart only ever plots one property

`app/workbench/main.ts`'s `sweepComposition()` reads a single selected
output-property id from `#chart-property-select` and draws exactly that
one series. This was a deliberate Phase 4 fix, not the original Phase 3
behavior: plotting every one of a model's `outputProperties` together
would mix units on one Y-axis (e.g. MIVM's `GmE` in J/mol alongside five
dimensionless activity-coefficient ratios) — scientifically meaningless,
not just visually messy. CSV export is unaffected by this: it still
exports every output property as a column, which is correct for a data
table in a way it wouldn't be for a chart.

## Where UI formatting happens

Everything number-formatting- or DOM-related lives in `app/main.ts` only:

- Reading `<input>` values (`readNumber()`)
- `toFixed()` formatting for the table
- Building the results `<table>` HTML string
- All `CanvasRenderingContext2D` calls (`drawGraph()`) — axes, grid,
  curves, markers, legend, title

None of it computes a physical quantity. `drawGraph()`'s ideal-solution
dashed curve, for example, does not compute `x(1−x)` itself — it plots
`scc0Ideal` values that `qcAdapter.computeIdealCurve()` already got from
the engine, read off the Quasi-Chemical model's bundled ideal-baseline
output. As of Phase 2A a standalone Ideal Solution model also exists
(`engine/models/thermodynamics/ideal/`) — the UI simply hasn't been wired
to call it yet, since Phase 2A's brief was engine correctness, not UI
changes (see "What Phase 2A intentionally did not change" below).

## Why scientific calculations don't belong in the UI

- **One source of truth.** The Scc(0) equations exist in exactly one
  place (`engine/models/thermodynamics/quasi-chemical/model.ts`). If the
  UI recomputed them, a future edit to one copy and not the other would
  silently diverge — the exact failure mode this migration eliminates
  (script.js's calculation is gone; app/main.ts contains no equations).
- **Testability.** `engine/models/.../model.test.ts` and
  `app/qcAdapter.test.ts` both check the same golden values, but the
  engine's tests need no DOM, and prove the *math*; the adapter's tests
  prove the *wiring*. A regression in either is caught at the layer where
  it actually happened.
- **Reuse.** Any future consumer — a CLI, a batch script computing a
  composition sweep for a report, a different frontend — calls
  `runCalculation()` and gets the same numbers, with no UI code to
  duplicate or diverge from.
- **Traceability.** `CalculationResult` carries the model's equations,
  assumptions, and references (`result.equations`, `result.assumptions`,
  `result.references`) as data, sourced from one place. A UI that
  computed its own numbers would have no equivalent record of what
  produced them.

## What Phase 1b intentionally did not change

- The visual page (layout, styling, input ids, the static equation display
  box) is unchanged — only what runs *behind* the Calculate button
  changed, from local arithmetic to an engine call.
- The static formula box in `index.html` (the `.formula` div) still shows
  its original hand-written text; it is not (yet) generated from
  `result.equations`. Wiring it up would change what's displayed (the
  engine's equation strings include the boundary condition and the ideal
  baseline, which the original box didn't show) — left for a deliberate
  future decision rather than an incidental one made while integrating
  the pipeline.
- No new scientific model, alloy system, or property domain was added —
  see `engine/README.md` for what remains Phase 2+ scope.

## What Phase 2A intentionally did not change

Phase 2A (Ideal Solution, Regular Solution, model comparison, composition
sweep, parameter architecture — see `engine/README.md`) is an engine-only
phase. Nothing in `app/` or `index.html` changed:

- `app/qcAdapter.ts` and `app/main.ts` still call only the Quasi-Chemical
  model, exactly as Phase 1b left them. The new Ideal/Regular Solution
  models, `compareModels()`, and `runCompositionSweep()` are all reachable
  through `engine/index.ts` but nothing in the UI imports them yet.
- The rendered page is byte-for-byte the same as after Phase 1b — same
  inputs, same table, same chart, same golden numbers.

Wiring a model picker, a comparison view, or a sweep-driven chart into the
UI is future work, deliberately out of scope here so this phase could
focus on getting the underlying science and its architecture right first.

## What Phase 2B intentionally did not change

Phase 2B (parameter database architecture: system identity, a multi-set
store, a resolver — see `engine/README.md`) is also engine-only, and even
narrower within the engine than Phase 2A:

- `app/` and `index.html` are byte-for-byte unchanged again.
- `engine/pipeline/CalculationPipeline.ts` is unchanged. Parameter
  resolution is a separate, opt-in step (`resolveParameterSet()` /
  `resolveRegularSolutionParameters()`) a caller runs *before* building a
  `CalculationRequest` — the pipeline itself still just takes whatever
  `request.parameters` it's given, exactly as in Phase 1a. This was a
  deliberate choice to keep every one of the 118 pre-existing tests (and
  the pipeline's already-settled behavior) at zero risk while the
  parameter architecture matured.
- `engine/models/thermodynamics/regular/model.ts`'s `calculate()` and
  `validate()` are unchanged — the new `parameters.ts` in that same folder
  is an addition alongside them, not a modification to them.
- No real parameter values were added anywhere. Resolving the real Au-Cu
  system today still returns `NOT_FOUND` — that's the correct, tested
  behavior, not a gap to paper over before it's backed by a citable
  source.

## What Phase 3 intentionally did not change

Phase 3 (the generic Workbench, `workbench.html` + `app/workbench/*` —
see "Request → response flow for the generic Workbench page" above) is
purely additive:

- `index.html`, `app/main.ts`, and `app/qcAdapter.ts` are byte-for-byte
  unchanged (one exception: a single `<a href="/workbench.html">` nav
  link added to `index.html`'s subtitle — outside every DOM id
  `app/main.test.ts` asserts on). The classic calculator's 282 tests and
  golden values were re-verified unaffected.
- No engine file changed. `Material.ts`, `Conditions.ts`,
  `ModelDefinition.ts`, `registry.ts`, `CalculationPipeline.ts`,
  `CompositionSweep.ts`, and `ModelComparison.ts` were already fully
  domain/model-agnostic before Phase 3 — the gap Phase 3 closed was
  entirely in the application layer, not the engine.
- `engine/data/elements.ts` gained 8 more elements (Fe, Ni, Co, Cr, Mn,
  Al, Zn, Ti) alongside Au/Cu — identity/atomic-mass data, not model
  parameters, so this didn't need the literature-audit discipline that
  governs `ParameterSet` records.

## What Phase 4 intentionally did not change

Phase 4 (foundation cleanup: unit conversion, the chart's one-property-at-
a-time fix, CSV import, docs, CI, configurable sweep bounds, a Workbench
`init()` idempotency fix) touched only `engine/core/UnitConversion.ts`
(new), `engine/index.ts` (barrel export), `engine/core/Units.ts` (a
doc-comment update, no shape change), `app/workbench/*`, `workbench.html`,
this file, `engine/README.md`, the root `README.md`, and
`.github/workflows/ci.yml`:

- No existing model's equation, `metadata.ts` unit string, or
  `PhysicalConstants.GAS_CONSTANT_R` value changed — `UnitConversion.ts`
  is opt-in and not wired into `CalculationPipeline.ts`.
- `index.html`, `app/main.ts`, and `app/qcAdapter.ts` remain untouched
  from Phase 3.
- New general thermodynamic-quantity calculators (mixing entropy/
  enthalpy/Gibbs energy/chemical potential/activity, a multicomponent
  interaction matrix) were deliberately deferred to their own future
  phase, matching the precedent every other model in this repo followed
  (its own dedicated, audited phase) rather than being folded into a
  foundation-infrastructure phase.

## What Phase 5 intentionally did not change

Phase 5 added `engine/thermodynamics/` — six pure, model-independent
thermodynamic-quantity utility functions (see `engine/README.md`'s
"Thermodynamic utilities (Phase 5)" section for the full list and their
equations) — and is engine-only, touching no file this document describes:

- `index.html`, `app/main.ts`, `app/qcAdapter.ts`, `workbench.html`, and
  every file under `app/workbench/*` are byte-for-byte unchanged. None of
  the six new utilities are wired into either page yet — they're callable
  through `engine/index.ts` but nothing in the UI imports them.
- No existing model (`Ideal`, `Regular`, `Quasi-Chemical`, `MIVM`),
  `CalculationPipeline.ts`, the parameter-provenance architecture, or
  `engine/data/parameterSets/` changed. The new utilities are not
  `ModelDefinition`s: they carry no `modelId` and never run through the
  pipeline.
