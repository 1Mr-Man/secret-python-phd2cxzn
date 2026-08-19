# Scientific Data Manifest — Phase 2C

This document describes every parameter record this phase produced,
where it came from, and exactly how confident the engine should be in
it. It exists so nobody has to read source code to answer "where did
this number come from" — though in this phase's case, the honest answer
for every real record is **"nowhere yet — here is what we know and why
we stopped."**

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
upgrade any record below to `"verified"` by adding a `value` — no other
architecture change is required.

## Verified production data vs. test fixtures vs. internal derivations

Three categories exist in this codebase, and they must never be confused:

| Category | Where it lives | Example |
|---|---|---|
| **Verified production data** | `engine/data/parameterSets/*.ts`, `status: "verified"` | None exist yet — see above. |
| **Real-but-unavailable production data** | `engine/data/parameterSets/*.ts`, `status: "unavailable"` | All three records below. Real citations, no value. |
| **Test fixtures (synthetic)** | `*.test.ts` files only, values like `-99999`, `-12345`, `-20000` | e.g. `parameterStore.test.ts`'s `exampleSet()`, `resolve.test.ts`'s `makeSet()`, the Regular Solution end-to-end fixture in `auCu.test.ts`. Every fixture's `source.note` says "test fixture, not real data" or equivalent, and none is ever exported from a `data/` file. |
| **Internally derived equations** | `engine/models/thermodynamics/regular/metadata.ts` | The Regular Solution *equation itself* (not a parameter value) — derived from the Bhatia-Thornton relation and verified as the Z→∞ limit of the Quasi-Chemical model already in this codebase. This is a different kind of thing from a sourced numeric parameter and is documented separately in that file and in `engine/README.md`. |

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
| **Compatibility assessment** | **REQUIRES_EXPLICIT_TRANSFORMATION.** Search-summary description confirms this is a CALPHAD-style assessment using a composition-dependent Redlich-Kister polynomial (L₀, L₁, …) for the liquid phase's excess Gibbs energy, plus a Compound Energy Formalism treatment of the ordered solid phases. This project's Regular Solution model is a single symmetric term, `G_M = G_M^ideal + W·x(1−x)` — equivalent to using only L₀ and discarding L₁ and higher. That truncation is a real scientific transformation (it throws away exactly the asymmetry a multi-term fit exists to capture) and has **not** been performed. Even setting that aside, no specific L-parameter value was retrievable to transform in the first place. |
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
| **Compatibility assessment** | **DIRECTLY_COMPATIBLE, in form — unconfirmed in substance.** This review is a well-known survey that tabulates a single interaction/order-energy parameter for many binary liquid alloy systems in essentially the same quasi-chemical/regular-solution formalism this project already uses. If its Au-Cu entry (assuming one exists) reports a value in this same G_M-with-single-W convention, it would need no transformation. But the table itself — and even confirmation Au-Cu is in it — could not be retrieved (IOPscience access blocked). "Compatible in principle" is explicitly not the same claim as "confirmed," and this record must not be upgraded to a number without someone actually reading the table. |
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
| **Compatibility assessment** | **UNDETERMINED — cannot be classified with confidence.** This is a real, specifically-Au-Cu, specifically-quasi-chemical-model paper built on Gibbs free energy of mixing — the closest topical match to this project's own Quasi-Chemical model found anywhere in this search. But whether its η²/order-energy definition matches this project's `η² = exp(2W/(ZRT))` term for term (rather than, say, a per-bond-pair convention with a different prefactor, or a different reference state) could not be checked, because the full text was unreachable. Per this phase's explicit instruction, no attempt was made to infer W or Z from this source, from Regular Solution's W, or from coordination-number intuition. |
| Notes | This project's existing UI default (T = 1550 K) coincides with a temperature that appears elsewhere in Au-Cu liquid-alloy literature searches. **This is explicitly not treated as evidence of a match** — numerical or contextual agreement with the existing golden output is not proof of a source's correctness or origin, per this project's own rule. |

## Summary

- **Real parameters added to production data:** 0 with a numeric value. 3 `ParameterSet` records with full citation metadata and `status: "unavailable"`.
- **Sources rejected outright:** none — every source found was either genuinely relevant but unverifiable (above) or too generic to cite specifically (e.g. general references to "Hultgren et al." compilations that did not resolve to a specific, checkable Au-Cu entry in search results, and so were not written up as formal candidates at all).
- **QC data:** left entirely empty, per this phase's explicit instruction, because no independently verifiable, format-compatible source was established. This is the documented, intended outcome, not a gap to be quietly filled later without the same scrutiny.
- **Regular Solution data:** likewise empty of any usable number, for the same underlying reason (verification, not literature existence, is the blocker) — see Sundman et al. and Singh & Sommer above.

None of this changes any existing model equation, golden test value, or UI output. See `../../README.md` and `../../../ARCHITECTURE.md` for how this connects to the rest of the engine.
