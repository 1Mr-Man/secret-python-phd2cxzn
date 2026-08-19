# Scientific Data Manifest — Phase 2C data, Phase 2D architecture

This document describes every parameter record in this codebase, where
it came from, and exactly how confident the engine should be in it. It
exists so nobody has to read source code to answer "where did this
number come from" — though for every real record here, the honest
answer is still **"nowhere yet — here is what we know and why we
stopped."**

**No new numeric value, and no upgrade of any record's verification
status, was added in Phase 2D.** Phase 2C produced the three real,
cited Au-Cu records below; Phase 2D gave the codebase a stronger,
more precise vocabulary for describing records exactly like these
(structured `compatibility`, `VerificationRecord`, `DerivationRecord`,
`SourceLocation`, and a stricter four-value `ParameterStatus`) and
restated all three records in that vocabulary — without touching any
of their citations or adding a single number.

## Environment constraint (read this first)

This phase's research was done with `WebSearch` (search-engine-generated
summaries) and `WebFetch`/direct HTTP (full-page retrieval). Every
full-text retrieval attempt was blocked by this environment's network
egress proxy — tested and confirmed blocked: `link.springer.com`,
`www.ncbi.nlm.nih.gov` and `pmc.ncbi.nlm.nih.gov`, `www.researchgate.net`,
`doi.org`, `www.sciencedirect.com`, `arxiv.org`, `iopscience.iop.org`,
and even `en.wikipedia.org`. `WebSearch` summaries remained reachable,
but every one relevant to this phase explicitly stated it could not
surface an exact numeric table value from a paper's results.

This means: **no numeric parameter value could be independently verified
against a primary source in this environment.** Per this project's
standing rule — "if a source cannot be independently verified, do not
add its numerical value to the production dataset" — that is why every
record below has `status: "unavailable"` and no `value`, regardless of
how well-identified or plausible the source is. A future phase with
direct journal access (or a human pasting in a verified excerpt) can
upgrade any record below to `"verified_direct"` by adding a `value` and
a `VerificationRecord` (see "Phase 2D architecture: the status/
compatibility/resolution vocabulary" below) — no other architecture
change is required. Upgrading via a documented transformation of an
already-verified number instead uses `"verified_derived"` plus a
`DerivationRecord`.

## Verified production data vs. test fixtures vs. internal derivations

Four categories exist in this codebase, and they must never be confused:

| Category | Where it lives | Example |
|---|---|---|
| **Verified production data** | `engine/data/parameterSets/*.ts`, `status: "verified_direct"` or `"verified_derived"` | None exist yet — see below. |
| **Real-but-unavailable production data** | `engine/data/parameterSets/*.ts`, `status: "unavailable"` | All three records below. Real citations, no value. |
| **Test fixtures (synthetic)** | `*.test.ts` files only, values like `-99999`, `-12345`, `-20000` | e.g. `parameterStore.test.ts`'s `exampleSet()`, `resolve.test.ts`'s `makeSet()`, the Regular Solution and Quasi-Chemical end-to-end fixtures in `toRequestParameters.test.ts`. Every fixture's `source.note`/`citation` says "SYNTHETIC TEST FIXTURE — not real data" or equivalent, and none is ever exported from a `data/` file. |
| **Internally derived equations** | `engine/models/thermodynamics/regular/metadata.ts` | The Regular Solution *equation itself* (not a parameter value) — derived from the Bhatia-Thornton relation and verified as the Z→∞ limit of the Quasi-Chemical model already in this codebase. This is a different kind of thing from a sourced numeric parameter and is documented separately in that file and in `engine/README.md`. |

## Phase 2D architecture: the status / compatibility / resolution vocabulary

Phase 2D introduced three concepts that describe a parameter record from
three genuinely different angles. They are easy to conflate, so this
project keeps them as three separate fields/types rather than folding
any pair together:

```
PARAMETER STATUS   -> "What is the verification state of THIS NUMBER?"
                       (ParameterValue.status, stored)
COMPATIBILITY      -> "Can THIS SOURCE be used by THIS MODEL at all,
                       without changing its scientific meaning?"
                       (ParameterSet.compatibility, stored, authoritative)
RESOLUTION STATUS  -> "What happened when the engine tried to answer
                       ONE QUERY for a (model, system, conditions)?"
                       (ParameterResolutionStatus, computed at query
                       time, NEVER stored)
```

**`ParameterStatus`** (`engine/parameters/types.ts`) — exactly four values:

| Value | Meaning |
|---|---|
| `verified_direct` | The exact value was read directly from the cited source. Requires a `VerificationRecord` with `method: "direct_read"` or `"cross_checked"`. |
| `verified_derived` | Computed via a documented, reviewable transformation from directly-verified inputs. Requires both a `DerivationRecord` (the transformation, its assumptions, and the source values it started from) and a `VerificationRecord` with `method: "derived"`. |
| `provisional` | A numeric value exists but has not been independently checked. Usable, but the resolver flags it (`ParameterResolutionStatus: "PROVISIONAL"`) rather than silently treating it as equivalent to a verified status. |
| `unavailable` | No numeric value. `value` MUST be omitted. This is how "we know this parameter exists and matters, but haven't sourced it" is represented — never by a guessed number. |

**`CompatibilityAssessment`** (`engine/parameters/compatibility.ts`) — a
question about SHAPE, independent of whether any specific number has
been checked yet: `"directly_compatible"`, `"requires_explicit_transformation"`,
or `"not_compatible"`. Authoritative at the `ParameterSet` level — a
whole source parameterization either is or isn't the right mathematical
shape for a given model's equation. `undefined` at the set level means
"not yet assessed," which is honestly different from asserting
compatibility either way (see the Su & Wang record below, which leaves
this unset on purpose rather than guessing). A parameter-level override
(`ParameterValue.compatibility`) is allowed only as a rare exception and
only when it is equally or MORE restrictive than its set's
classification — `validateParameterSet()` rejects an override that
would claim to be more permissive, so a blocked set can never have a
usable value smuggled in through one of its own parameters.

**`VerificationRecord`** — how *this project* came to trust a value
(`method: "direct_read" | "cross_checked" | "derived"`, optional
`location: SourceLocation`, `verifiedBy`, `verifiedAt`). Distinct from
`ParameterSource`, which describes the publication itself.

**`DerivationRecord`** — required whenever `status` is
`"verified_derived"`: `transformationEquation` (the transformation
itself, as text), `assumptions` (every one, stated explicitly),
`sourceValues` (the directly-verified numbers it was computed from,
keyed by name), and optional `derivedBy`/`derivedAt`. This is what stops
`"verified_derived"` from being a label for an undocumented calculation.

**`SourceLocation`** — a structured pointer into a publication
(`type: "table" | "equation" | "figure" | "page" | "section" | "other"`,
optional `identifier`, `page`, `description`), used inside
`VerificationRecord.location` and `DerivationRecord`'s inputs so "Table
3, p. 112" is machine-readable rather than only present as free-text
prose. None of the three records below carry one, because none has a
`VerificationRecord` at all — nothing was ever read closely enough to
verify.

**Resolver outcomes** (`ParameterResolutionStatus`, computed by
`resolveParameterSet()` per query, never stored on any record):

| Outcome | Meaning |
|---|---|
| `FOUND` | Exactly one applicable, non-provisional set with usable values. |
| `PROVISIONAL` | Exactly one applicable set, but at least one of its values is `status: "provisional"`. |
| `NOT_FOUND` | No set is registered for this (model, canonical system), or every registered set has no usable value — this is every real Au-Cu query's outcome today. |
| `OUT_OF_RANGE` | Set(s) exist but none cover the requested temperature/composition. |
| `AMBIGUOUS` | More than one applicable set exists — the resolver refuses to silently pick one; a caller must resolve explicitly (`preferredSetId`). |

**`AMBIGUOUS` is a resolver outcome only — it is never a stored
`ParameterStatus`.** A parameter's own verification state never becomes
"ambiguous"; what can be ambiguous is *which of several parameter sets*
should answer a given query. Conflating the two would let a data-quality
concept (multiple competing sources exist) leak into a per-number field
that is supposed to describe one specific value's own trustworthiness —
they answer different questions and are validated by different code
(`validateParameterValue`/`validateParameterSet` for status;
`resolveParameterSet` for resolution).

## Candidate sources investigated

### 1. Sundman, Fries & Oates (1998) — Regular Solution, Au-Cu

| Field | Value |
|---|---|
| System | Au-Cu |
| Model this was evaluated against | Regular Solution (`thermodynamics.regular-solution.scc0`) |
| Parameter | W (interaction/interchange energy) |
| Value | **none entered** |
| Unit | J/mol (the unit this project's model requires; not confirmed as the source's own reporting unit) |
| setId | `au-cu.regular-solution.sundman-fries-oates-1998` |
| Status | `unavailable` |
| Source title | "A thermodynamic assessment of the Au-Cu system" |
| Authors | B. Sundman, S.G. Fries, W.A. Oates |
| Journal | Calphad, vol. 22, issue 3, pp. 335–354 |
| Publication year | 1998 |
| Persistent identifier | ScienceDirect PII `S0364591698000340`; DOI not independently confirmed |
| Validity range | Unknown — not retrieved |
| **Compatibility assessment** | **REQUIRES_EXPLICIT_TRANSFORMATION** — stored as `ParameterSet.compatibility: "requires_explicit_transformation"` (Phase 2D; authoritative, set-level, machine-readable — see the architecture section above). Search-summary description confirms this is a CALPHAD-style assessment using a composition-dependent Redlich-Kister polynomial (L₀, L₁, …) for the liquid phase's excess Gibbs energy, plus a Compound Energy Formalism treatment of the ordered solid phases. This project's Regular Solution model is a single symmetric term, `G_M = G_M^ideal + W·x(1−x)` — equivalent to using only L₀ and discarding L₁ and higher. That truncation is a real scientific transformation (it throws away exactly the asymmetry a multi-term fit exists to capture) and has **not** been performed. Even setting that aside, no specific L-parameter value was retrievable to transform in the first place. Because the set-level compatibility is `requires_explicit_transformation`, `validateParameterSet()` requires (and confirms) every parameter in this set has `status: "unavailable"` — it structurally cannot contain a directly usable value. |
| Notes | Real, credible, well-known CALPHAD reference (Sundman is a principal author of the Thermo-Calc/CALPHAD software lineage) — a strong candidate for a *future*, explicitly-reviewed transformation, or for a future generalized Redlich-Kister-capable model, but not for this phase's simple W. |

### 2. Singh & Sommer (1997) — Regular Solution / Quasi-Chemical, Au-Cu

| Field | Value |
|---|---|
| System | Au-Cu |
| Model this was evaluated against | Regular Solution (`thermodynamics.regular-solution.scc0`) |
| Parameter | W (interaction/interchange energy) |
| Value | **none entered** |
| Unit | J/mol |
| setId | `au-cu.regular-solution.singh-sommer-1997` |
| Status | `unavailable` |
| Source title | "Segregation and immiscibility in liquid binary alloys" |
| Authors | R.N. Singh, F. Sommer |
| Journal | Reports on Progress in Physics, vol. 60, no. 1, pp. 57–150 |
| Publication year | 1997 |
| Persistent identifier | DOI `10.1088/0034-4885/60/1/003` |
| Validity range | Unknown — not retrieved |
| **Compatibility assessment** | **DIRECTLY_COMPATIBLE, in form — unconfirmed in substance.** Stored as `ParameterSet.compatibility: "directly_compatible"` (Phase 2D). This review is a well-known survey that tabulates a single interaction/order-energy parameter for many binary liquid alloy systems in essentially the same quasi-chemical/regular-solution formalism this project already uses. If its Au-Cu entry (assuming one exists) reports a value in this same G_M-with-single-W convention, it would need no transformation. But the table itself — and even confirmation Au-Cu is in it — could not be retrieved (IOPscience access blocked). "Compatible in principle" is explicitly not the same claim as "confirmed": `compatibility: "directly_compatible"` says only that a value from this source, if verified, would need no transformation to be usable — it makes no claim that a value has been checked, which is exactly why `status` is still `"unavailable"` below. This record must not be upgraded to a number without someone actually reading the table. |
| Notes | The single most promising lead this phase produced for Regular Solution. Recommended starting point for Phase 2D if direct access becomes available. |

### 3. Su & Wang (2013) — Quasi-Chemical, Au-Cu

| Field | Value |
|---|---|
| System | Au-Cu |
| Model this was evaluated against | Quasi-Chemical (`thermodynamics.quasi-chemical.scc0`) |
| Parameters | Z (coordination number), W (interchange energy) |
| Value | **none entered for either** |
| Unit | Z: dimensionless; W: J/mol |
| setId | `au-cu.quasi-chemical.su-wang-2013` |
| Status | `unavailable` |
| Source title | "Surface plasmon resonance of Au-Cu bimetallic nanoparticles predicted by a quasi-chemical model" |
| Authors | Yen-Hsun Su, Wen-Lin Wang |
| Journal | Nanoscale Research Letters, vol. 8, article 408 |
| Publication year | 2013 |
| Persistent identifier | DOI `10.1186/1556-276X-8-408` |
| Validity range | Unknown — not retrieved |
| **Compatibility assessment** | **UNDETERMINED — cannot be classified with confidence.** `ParameterSet.compatibility` is left `undefined` (Phase 2D) rather than forced into one of the three buckets — `undefined` is a distinct, honest state from any of `directly_compatible`/`requires_explicit_transformation`/`not_compatible`, meaning "not yet assessed," never "assessed as compatible." This is a real, specifically-Au-Cu, specifically-quasi-chemical-model paper built on Gibbs free energy of mixing — the closest topical match to this project's own Quasi-Chemical model found anywhere in this search. But whether its η²/order-energy definition matches this project's `η² = exp(2W/(ZRT))` term for term (rather than, say, a per-bond-pair convention with a different prefactor, or a different reference state) could not be checked, because the full text was unreachable. Per this phase's explicit instruction, no attempt was made to infer W or Z from this source, from Regular Solution's W, or from coordination-number intuition. |
| Notes | This project's existing UI default (T = 1550 K) coincides with a temperature that appears elsewhere in Au-Cu liquid-alloy literature searches. **This is explicitly not treated as evidence of a match** — numerical or contextual agreement with the existing golden output is not proof of a source's correctness or origin, per this project's own rule. |

## Summary

- **Real parameters added to production data:** 0 with a numeric value, in Phase 2C or Phase 2D. 3 `ParameterSet` records with full citation metadata, all `status: "unavailable"`, now additionally carrying Phase 2D's structured `compatibility` classification (or an explicit, honest "not yet assessed" `undefined`).
- **Sources rejected outright:** none — every source found was either genuinely relevant but unverifiable (above) or too generic to cite specifically (e.g. general references to "Hultgren et al." compilations that did not resolve to a specific, checkable Au-Cu entry in search results, and so were not written up as formal candidates at all).
- **QC data:** left entirely empty, per Phase 2C's explicit instruction, because no independently verifiable, format-compatible source was established. This is the documented, intended outcome, not a gap to be quietly filled later without the same scrutiny. Phase 2D added `resolveQuasiChemicalParameters()` (mirroring Regular Solution's existing resolver wrapper) so this data, once real values exist, has somewhere to resolve into — but introduced no numeric QC parameter itself.
- **Regular Solution data:** likewise empty of any usable number, for the same underlying reason (verification, not literature existence, is the blocker) — see Sundman et al. and Singh & Sommer above.
- **Phase 2D verification status:** unchanged from Phase 2C. No record was upgraded from `"unavailable"` to `"verified_direct"` or `"verified_derived"`; no `VerificationRecord` or `DerivationRecord` was added to any of the three records above, because none of them has had a number independently checked. All three pass `validateParameterSet()` with zero issues — they are structurally consistent, not scientifically confirmed.

None of this changes any existing model equation, golden test value, or UI output. See `../../README.md` (in particular "Parameter architecture" and "What's deliberately not here") and `../../../ARCHITECTURE.md` for how this connects to the rest of the engine.
