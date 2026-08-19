# Architecture: UI ↔ Engine boundary

This document explains how the page (`index.html` + `app/`) talks to the
calculation engine (`engine/`), and why the boundary between them is drawn
where it is. For the engine's own internals (core types, the model plugin
contract, the calculation pipeline), see `engine/README.md`.

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
is enforced by convention today (Phase 1b has one screen and one file that
imports the engine — `app/qcAdapter.ts`), not by a lint rule yet; keep it
that way as more screens are added.

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
