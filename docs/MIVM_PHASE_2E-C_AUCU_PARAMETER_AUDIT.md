# Phase 2E-C — Au-Cu MIVM Parameter Research & Data Audit

> **Import note:** this phase was originally carried out in a disconnected
> checkout (an extracted zip archive, no `.git`, no network egress for
> `npm install`) — see this document's own "Final Stop Condition" below.
> It is imported verbatim into this repository's `docs/` on branch
> `claude/aucu-mivm-parameter-audit-0g5k95` as the historical record of
> that research pass; its environment-limitation notes describe that
> original checkout, not this repository. See
> `docs/MIVM_PHASE_2E-C3.1_INFINITE_DILUTION_CROSS_CHECK.md` for the
> first phase in this chain actually run against this real repo, with a
> working test suite.

**Status: RESEARCH/AUDIT ONLY.** No implementation code, no `app/`, no
`index.html`, no `CalculationPipeline.ts`, and no model-equation file was
touched in this phase. No numeric MIVM parameter has been added to any
production data file. This document is the complete deliverable for this
phase, per the Phase 2E-C instructions.

Authoritative state referenced: Phase 2E-B accepted, commit `8566e11`,
model `thermodynamics.mivm.binary`, convention = **Hang & Tao (2023),
Metals 13, 1773** (not Wang, Chen & Tao (2023), Metals 13, 996).

---

## 1. Executive Conclusion

A real, open-access, directly-read primary source containing actual
numeric `B_ij`/`B_ji` values for an Au-Cu system **was found and its full
text was independently retrieved in this environment**:

> Hang, J.; Tao, D. "Estimation of Two Component Activities of Binary
> Liquid Alloys by the Pair Potential Energy Containing a Polynomial of
> the Partial Radial Distribution Function." *Metals* **2023**, *13*(10),
> 1773. https://doi.org/10.3390/met13101773 (CC BY 4.0, MDPI).

This is the *same* paper this project already adopted as its locked MIVM
equation convention in Phase 2E-B — confirmed again here directly from
the primary text (§4 below). Its Table 3 and Table 5 report `B_ij`/`B_ji`
for a system labeled **"Au-Cu"**.

**However, none of these numbers can be promoted to production in this
phase**, for reasons that are the actual point of this audit, not a
formality:

1. **They are not the quantity this project's MIVM implementation
   expects.** They were not fitted from experimental infinite-dilution
   activity coefficients (`γ_i^∞`, `γ_j^∞`) — the standard MIVM
   parameterization method used in essentially every other Tao-group
   paper (e.g., the Cu-Ni MIVM paper cited in §6). They were instead
   *back-calculated* from pair-potential energies derived from a single
   **partial radial distribution function (PRDF)** data set, at fixed
   composition `x_Au = x_Cu = 0.5`, taken from one molecular-dynamics/
   X-ray-diffraction structural study (Bai et al. 2020 — §7). That is a
   materially different derivation method, explicitly flagged by this
   project's own Rule 8 ("a number that produces plausible MIVM output is
   not evidence it's the right number") and Rule 5 (never silently
   convert between different physical definitions).
2. **Two internally inconsistent values exist in the same paper** for the
   same nominal system — `B_ij=1.163, B_ji=1.444` (asymmetric RDF-
   integration method, Table 3) vs. `B_ij=2.423, B_ji=0.515` (symmetric
   RDF-integration method, Table 5) — and the second of these is
   **numerically identical, digit-for-digit, to the paper's Al-Ca row in
   the same table**, which is either a genuine coincidence, a
   transcription/typesetting duplication in the published PDF, or a
   real error. This was not something a plausibility check alone would
   catch (Rule 8), and it was not something this audit can resolve
   without a second independent source, which was not found.
3. **`Z_i`, `Z_j`, `V_mi`, `V_mj` are not given** for Au or Cu anywhere in
   this paper's retrieved text. The model equation *uses* these symbols,
   but no numeric coordination-number or molar-volume values for Au or
   Cu are tabulated in the source. All four are `UNAVAILABLE`.
4. **Index orientation (`i=Au, j=Cu` vs. `i=Cu, j=Au`) is not stated
   explicitly** anywhere in the retrieved text. It can only be *assumed*
   from the "Au-Cu" column-header naming convention used consistently
   elsewhere in the same table (first-named element = `i`), which this
   project's own Rule 4 says must not be silently assumed.
5. **Temperature is not stated** for the Au-Cu entry specifically. The
   underlying structural data (Bai et al. 2020) covers "melt to
   disordered solid solution" via high-temperature XRD; the specific
   liquidus/measurement temperature was not recoverable — that paper is
   paywalled at Scientific.net in this environment (§7).

**Net result of this phase:** production data store remains **empty**
for `thermodynamics.mivm.binary` / `Au-Cu`, exactly as it was before this
phase — and per this project's Rule 10, that is a successful, honestly
documented research outcome, not a failure. A `PROVISIONAL` (not
`VERIFIED_DIRECT`) record is proposed for future upgrade — see §13.

---

## 2. Search Strategy

Searches were run (via live web search and direct `web_fetch` of primary
publisher pages) in this order:

1. General MIVM + Au-Cu parameter searches (`Bij`, `Bji`, coordination
   number, molar volume) to survey the field.
2. Targeted search for the two specific 2023 Metals papers named in the
   authoritative state (Hang & Tao 2023, Metals 13, 1773; Wang, Chen &
   Tao 2023, Metals 13, 996) to re-confirm the locked convention and
   check both for Au-Cu tables.
3. Direct `web_fetch` of the Hang & Tao (2023) MDPI page and PDF —
   **succeeded**, full text retrieved (MDPI/DOAJ open access, unlike the
   publisher domains blocked in Phase 2C/2E-A).
4. `web_fetch` of the Tao (2015/2016) *Metall. Mater. Trans. B* paper
   (identified in Phase 2E-A's audit as mentioning an Au-Cu test case for
   the `Z=10` simplification) — reached the abstract page; full text is
   paywalled (Springer "Buy article PDF" wall), consistent with prior
   phases' documented `EGRESS_BLOCKED`-equivalent finding for that
   specific publisher/article.
5. Search for the primary structural-data source underlying the Hang &
   Tao Au-Cu row (reference [37] in that paper) — Bai et al. (2020),
   *Materials Science Forum* 993, 273–280 — to check composition/
   temperature. Abstract-level detail only; full text paywalled at
   Scientific.net.
6. Search to check whether Wang, Chen & Tao (2023, Metals 13, 996) — the
   *other* (non-adopted) convention paper — independently reports Au-Cu.
   No evidence found that Au-Cu is among its 19 alloys; not confirmed
   either way without a direct fetch of that paper's own tables (not
   performed, since it uses the non-adopted convention and was
   deprioritized once the same-convention Hang & Tao source was secured).

No search-engine-snippet-only number was used as a basis for any
conclusion below; every numeric claim in §5 was read directly from
fetched primary-source full text.

---

## 3. Candidate Sources

| # | Source | Access result | Contains numeric Au-Cu MIVM values? |
|---|---|---|---|
| A | Hang, J.; Tao, D. *Metals* 2023, 13, 1773. DOI: 10.3390/met13101773 | **Full text retrieved** (open access CC BY) | **Yes** — `B_ij`, `B_ji` (two methods) |
| B | Tao, D.P. *Metall. Mater. Trans. B* 47, 1–9 (2016). DOI: 10.1007/s11663-015-0460-5 | Abstract only; full text paywalled | Abstract confirms Au-Cu was used as a test system for the `Z_i=Z=10` simplified MIVM form; no numeric table accessible |
| C | Bai, Y.W. et al. *Materials Science Forum* 993, 273–280 (2020). DOI: 10.4028/www.scientific.net/MSF.993.273 | Abstract only; full text paywalled at Scientific.net | Underlying PRDF/structural source for Source A's Au-Cu row; confirms composition Au₅₀Cu₅₀, no explicit temperature recovered |
| D | Wang, C.; Chen, X.; Tao, D. *Metals* 2023, 13, 996. DOI: 10.3390/met13050996 | Abstract-level only (not fully fetched this phase) | Not confirmed to include Au-Cu among its 19 alloys; uses the **non-adopted** (Wang-Chen-Tao) convention regardless |
| E | Tao, D.P. *Thermochim. Acta* 363, 105–113 (2000) — original MIVM paper | Not accessed this phase (previously documented as blocked in Phase 2E-A) | Unknown; would need direct access to confirm whether it contains any binary alloy parameter tables at all (Phase 2E-A's finding was that it likely does not, per secondary description) |
| F | `AU_CU_KNOWN_SOURCES` (this repo, Phase 2C/2D, `engine/data/parameterSets/auCu.ts`) | Already in-repo | Regular-solution and quasi-chemical records only, all `status: "unavailable"`. Not MIVM. No overlap/conflict with this phase's findings. |

---

## 4. Source-by-Source Evidence

### 4.A — Hang & Tao (2023), Metals 13, 1773 (PRIMARY, directly read)

Full text confirms this is the **exact convention already locked** by
this project in Phase 2E-B. From the retrieved text (Eq. 13):

```
G_m^E / RT = x_i ln( V_mi / (x_i V_mi + x_j V_mj B_ji) )
           + x_j ln( V_mj / (x_j V_mj + x_i V_mi B_ij) )
           - (x_i x_j / 2) [ (Z_i B_ji ln B_ji)/(x_i + x_j B_ji)
                            + (Z_j B_ij ln B_ij)/(x_j + x_i B_ij) ]
```

— i.e., the **first** volume-denominator term (associated with `x_i`)
uses `B_ji`, the **second** (associated with `x_j`) uses `B_ij`, and the
enthalpy/entropy correction term is built from `ln B_ji` and `ln B_ij`
respectively. This matches, term for term, the "Hang & Tao (2023)"
convention description given in the Phase 2E-C authoritative-state
instructions, and is textually distinct from the alternative
Wang-Chen-Tao convention description (`λ_ij`/`λ_ji`-based enthalpy term)
— i.e., **Rule 3's convention check is satisfied and reconfirmed directly
from source text**, not from a search paraphrase.

Table 1 (symmetry ranking of 36 binary liquid alloys) lists a system
literally named **`Au-Cu`**, with symmetry degree `S_ij = 0.0364`.

Table 2 (PRDF literature sources for the 36 alloys) cites, for the Au-Cu
row, reference **[37]**: *Bai, Y.W.; Zhao, X.L.; Bian, X.F.; Song, K.K.;
Zhao, Y. "Structure Evolution of Au50Cu50 Alloy from Melt to the
Disordered Solid Solution." Materials Science Forum 2020, 993, 273–280.*

**Table 3 (asymmetric RDF-integration method) — Au-Cu row:**

```
System   MIVM: Bij   Bji     RSM: Ωij  Wilson: Aij  Aji   NRTL: τij  τji
Au-Cu    1.163       1.444   -2.877    0.812        2.068 0.151     0.368
```

**Table 5 (symmetric RDF-integration method) — Au-Cu row:**

```
System   MIVM: Bij   Bji     RSM: Ωij  Wilson: Aij  Aji   NRTL: τij  τji
Au-Cu    2.423       0.515   -1.229    1.692        0.737 0.885    -0.664
```

**Data-quality flag (must be disclosed, not silently dropped):** in
Table 5, the row for `Al-Ca` — a chemically and physically unrelated
system — carries the *exact same seven numbers* (`2.423, 0.515, -1.229,
1.692, 0.737, 0.885, -0.664`) as the Au-Cu row. This is either (a) a
genuine, if startling, coincidence, (b) a copy/typesetting duplication
error in the published MDPI PDF, or (c) evidence that one of the two rows
was mis-transcribed by the original authors. No erratum was found. This
alone is sufficient reason this value cannot be treated as
`VERIFIED_DIRECT` production data without independent corroboration.

The paper reports **no numeric `Z_i`, `Z_j`, `V_mi`, `V_mj`** for any of
the 36 systems in its retrieved tables — these are used symbolically in
the model equation and in the derivation of `B_ij`/`B_ji` from pair
potentials (Eq. 37: `B_ij = exp[-(ε_ij - ε_jj)/kT]`), but the specific
numeric inputs are not shown in the accessible text.

The paper does **not** state, for the "Au-Cu" column header, whether
`i = Au, j = Cu` or the reverse. The only basis for an assumption is that
every other two-element system name in the same tables (`Al-Zn`, `Cu-Ni`,
etc.) is conventionally read left-to-right as `i-j`, which is a
convention, not a stated fact for this specific pair.

### 4.B — Tao (2015/2016), Metall. Mater. Trans. B 47, 1–9

Abstract (fully readable, not paywalled) states: *"their simplified forms
are proposed for predicting easily thermodynamic properties of a
multicomponent liquid system and are preliminarily tested to be
coordinated mutually in the binary liquid alloys Au-Cu, Cd-Zn, Ca-Zn, and
Ni-Pb."* This independently corroborates that Au-Cu is a recognized MIVM
test system in the Tao group's literature, and is consistent with — but
gives no numeric values to check against — Source A. Full text (which
would contain the actual `Z_i=Z=10`-simplified-form numbers) is behind a
Springer paywall (`meta-access: No` on the fetched page); **not
independently verified in this environment**, matching the
`EGRESS_BLOCKED`-equivalent pattern already documented for this
publisher in this repo's `DATA_MANIFEST.md`.

### 4.C — Bai et al. (2020), Materials Science Forum 993, 273–280

Confirms composition **Au₅₀Cu₅₀** (i.e., `x_Au = x_Cu = 0.5`) via
high-temperature X-ray diffraction plus Reverse Monte Carlo simulation,
covering "melt to disordered solid solution." No specific numeric
temperature was recoverable from the accessible abstract/snippet text;
full text is paywalled at Scientific.net. This is the *sole* structural
data source underlying Source A's Au-Cu `B_ij`/`B_ji` values — meaning
Source A's Au-Cu numbers ultimately rest on a single structural
measurement at a single (unconfirmed) temperature and a single
(equiatomic) composition, not on a temperature/composition series or
independent replication.

### 4.D — Wang, Chen & Tao (2023), Metals 13, 996

Confirmed (via its own abstract and via citation in Source A) to use the
**non-adopted** convention for this project (per the Phase 2E-C
instructions' own description: `λ_ij`/`λ_ji`-based enthalpy term, opposite
first/second volume-denominator assignment). Whether it separately
reports Au-Cu was **not conclusively determined this phase** — it covers
19 binary liquid alloys via the same PRDF methodology as Source A, and
given the overlapping author group and methodology, it may or may not
include Au-Cu. Even if it does, per Rule 3 its numbers would need an
explicit convention-transformation before they could be compared to or
combined with Source A's — they are not directly interchangeable.
Recommendation for Phase 2E-D: fetch this paper's full text directly if
a second, convention-transformable data point is wanted for
cross-checking.

### 4.E — Tao (2000), Thermochim. Acta 363, 105–113

Not re-accessed this phase. Per Phase 2E-A's prior audit, this is the
*original* MIVM paper (model derivation), not primarily a parameter-table
paper; it was not re-tested for Au-Cu-specific data in this phase since
Source A already provided a directly-read, convention-matching numeric
candidate. Flagged for Phase 2E-D if a from-first-principles derivation
is later wanted.

### 4.F — This repo's existing Au-Cu records (`auCu.ts`)

Reviewed for consistency. These are Regular-Solution and Quasi-Chemical
model records (not MIVM), all already correctly marked
`status: "unavailable"`. No conflict with this phase's findings; MIVM
has no existing Au-Cu record in this repo prior to this phase.

---

## 5. Candidate Value Table

| Parameter | Value | Unit | i/j orientation | Temperature | Composition | Source | Table/Eq/Page | Direct/Derived | Compatibility | Production status |
|---|---:|---|---|---|---|---|---|---|---|
| B_ij | 1.163 | dimensionless | UNVERIFIED (assumed i=Au, j=Cu by column-order convention) | UNKNOWN | x=0.5 (Au₅₀Cu₅₀) | Hang & Tao (2023), Metals 13, 1773 | Table 3 ("asymmetric method"), p.10 | Derived (back-calculated from PRDF-based pair potential, Eq. 37) — not fitted from activity data | Directly compatible in form (same Hang & Tao equation this project already locked) | PROVISIONAL |
| B_ji | 1.444 | dimensionless | UNVERIFIED (assumed j=Cu) | UNKNOWN | x=0.5 | Hang & Tao (2023), Metals 13, 1773 | Table 3, p.10 | Derived, same basis as above | Directly compatible in form | PROVISIONAL |
| B_ij | 2.423 | dimensionless | UNVERIFIED | UNKNOWN | x=0.5 | Hang & Tao (2023), Metals 13, 1773 | Table 5 ("symmetric method"), p.12 | Derived, same basis | Directly compatible in form, **but duplicate-row data-quality flag (§4.A)** | UNAVAILABLE (flagged, not to be used) |
| B_ji | 0.515 | dimensionless | UNVERIFIED | UNKNOWN | x=0.5 | Hang & Tao (2023), Metals 13, 1773 | Table 5, p.12 | Derived, same basis | Same flag as above | UNAVAILABLE (flagged, not to be used) |
| Z_i | — | dimensionless | — | — | — | — | Not reported in any accessible source this phase | — | — | UNAVAILABLE |
| Z_j | — | dimensionless | — | — | — | — | Not reported in any accessible source this phase | — | — | UNAVAILABLE |
| V_mi | — | cm³/mol (assumed, not confirmed) | — | — | — | — | Not reported in any accessible source this phase | — | — | UNAVAILABLE |
| V_mj | — | cm³/mol (assumed, not confirmed) | — | — | — | — | Not reported in any accessible source this phase | — | — | UNAVAILABLE |

No row in this table is `VERIFIED_DIRECT`. See §13 for exactly what
would need to change for the `B_ij=1.163, B_ji=1.444` row to be upgraded
to `VERIFIED_DIRECT` or a properly documented `VERIFIED_DERIVED`.

---

## 6. Parameter Convention / Orientation

- **Mathematical convention:** Hang & Tao (2023) form, **confirmed
  directly from primary-source equations** (§4.A) to match this
  project's already-locked Phase 2E-B convention. This is now verified
  at a stronger evidentiary level than Phase 2E-A's audit achieved (that
  audit worked from search-engine paraphrases; this phase read the
  actual equations).
- **Index orientation (`i`/`j` = `Au`/`Cu`):** **UNVERIFIED.** The source
  never states this explicitly for the Au-Cu pair. Convention elsewhere
  in the same table (alphabetical/first-named = `i`) would suggest
  `i=Au, j=Cu`, but per this project's Rule 4, that must be recorded as
  an assumption, not a fact, and must not be used to silently populate
  data.

---

## 7. Temperature Validity

Not established. Source A performs a temperature-conversion between an
"original" `T` and a "desired" `T'` (Eq. 37–38) but never states the
original `T` used for the Au-Cu row specifically anywhere in the
retrieved text. The underlying structural source (Bai et al. 2020, §4.C)
covers a melt-to-solid range via high-temperature XRD but its specific
temperature(s) were not recoverable (paywalled). **Any future use of
these `B_ij`/`B_ji` values must first pin down this temperature**, since
MIVM's `B_ij`/`B_ji` are only valid at (or explicitly converted from) a
specific `T`.

## 8. Volume Definitions

Not established for Au-Cu specifically — see §5/§9. Source A's general
model text calls `V_mi`/`V_mj` "molar volumes" without further
specification (pure-component vs. partial vs. atomic); no Au-Cu-specific
values were found to check against that general definition.

## 9. Coordination-Number Definitions

Not established for Au-Cu specifically. General literature surveyed
this phase (search results, §"Research Targets" coverage) repeatedly
shows `Z_i = Z = 10` used as a common simplification across many Tao-
group MIVM papers (including, per Source B's abstract, apparently for
the Au-Cu test case specifically) — but this is a *pattern observed
elsewhere*, not a number confirmed to have been used, or to be
appropriate, for Source A's specific Au-Cu row. Per Rule 8, that pattern
is not itself verification and is not proposed for production use.

## 10. Direct vs. Derived Classification

Both Table 3 and Table 5 `B_ij`/`B_ji` candidates are **derived**, not
directly reported experimental fits: they are back-calculated from
pair-potential energies which are themselves back-calculated from a
single PRDF structural data set (§4.A, §4.C), via Eq. 37 of Source A.
This is a legitimate, fully-specified derivation chain (source inputs:
PRDF → pair potential via Eq. 16–29 → `ε_ij`, `ε_ii`, `ε_jj` → `B_ij`,
`B_ji` via Eq. 37) — but it is a *different* derivation route than the
infinite-dilution-activity-coefficient fitting Rule 3/Rule 7 of this
project's standing methodology implicitly expects as the "normal" MIVM
parameterization, and than the field's dominant practice (§ "Research
Targets" coverage: Cu-Ni, Sn-based, Ca-based, etc. MIVM papers all fit
from `γ_i^∞`, `γ_j^∞`). This does not make Source A's numbers wrong, but
it does mean they answer a different question than "what `B_ij`/`B_ji`
best reproduces Au-Cu's experimental activity data" — they answer "what
`B_ij`/`B_ji` is consistent with one particular simulated/measured
Au₅₀Cu₅₀ liquid structure." Whether that distinction matters for this
engine's purposes is a scientific judgment call for Phase 2E-D, not this
audit.

## 11. Compatibility Assessment

- **Model-form compatibility:** Directly compatible — same equation,
  same parameter roles, confirmed by direct equation comparison (§4.A,
  §6). No `requires_explicit_transformation` classification needed *for
  the equation form itself*.
- **Data-fitness compatibility:** Open question, not resolved this
  phase — see §10. Recorded as `compatibility: undetermined` rather than
  `directly_compatible`, matching this project's precedent for
  genuinely-undetermined cases (e.g., `AU_CU_QUASI_CHEMICAL_SU_WANG_2013`
  in the existing `auCu.ts`).

## 12. Conflicting Parameter Sets

Yes — within a single source. Table 3 vs. Table 5 of Source A give two
different `(B_ij, B_ji)` pairs for nominally the same Au-Cu system,
because they use two different RDF-integration methods (asymmetric vs.
symmetric) to extract the underlying pair potentials from the same
PRDF data. Source A's own §5 conclusion states the asymmetric method is
generally *preferred* ("the estimation of binary liquid alloy activity
favors using the asymmetric method"), which would favor the Table 3 pair
(`B_ij=1.163, B_ji=1.444`) over the Table 5 pair — **except** that the
Table 5 pair is the one flagged with the Al-Ca-duplication data-quality
issue (§4.A), which is a separate concern from which integration method
is preferred and does not by itself validate the Table 3 pair.

## 13. Recommended Production Set

**None recommended for promotion to `VERIFIED_DIRECT` in this phase.**

If Phase 2E-D wants to carry a `PROVISIONAL` MIVM Au-Cu record forward
(visible in the parameter store as a known-but-not-yet-verified
candidate, the same way this repo already carries `PROVISIONAL`/
`unavailable` non-MIVM Au-Cu records), the best-supported candidate is:

- `B_ij = 1.163`, `B_ji = 1.444` (Hang & Tao 2023, Table 3, asymmetric
  method) — chosen over the Table 5 pair because (a) it is not affected
  by the Al-Ca duplication anomaly and (b) the source paper's own
  conclusion favors the asymmetric-method results generally.
- This must remain `status: "unavailable"` / `compatibility:
  undetermined` (not `"verified_direct"`) until: index orientation is
  confirmed from source, a temperature is pinned down, and `Z_i`, `Z_j`,
  `V_mi`, `V_mj` are independently sourced (e.g., from the same
  literature values Tao's group conventionally uses — commonly citing
  Iida & Guthrie's tables — but that must be confirmed against an actual
  source, not assumed by pattern-matching, per Rule 8).

## 14. Values That Must Remain Unavailable

- `B_ij = 2.423`, `B_ji = 0.515` (Table 5 pair) — blocked by the Al-Ca
  duplication data-quality flag until independently corroborated.
- `Z_i`, `Z_j`, `V_mi`, `V_mj` for Au and Cu — not found in any source
  accessed this phase.
- Any number from Tao (2015/2016, Source B) — full text inaccessible
  (paywalled) in this environment.
- Any specific temperature for the Au-Cu row — not found.

## 15. Exact Provenance Required Before Production Insertion

For the Table 3 `B_ij=1.163, B_ji=1.444` candidate to become
`VERIFIED_DIRECT` (or a documented `VERIFIED_DERIVED`), a future phase
would need, at minimum:

1. Explicit confirmation (from Source A's actual PDF page, not just the
   extracted-text table) of whether the "Au-Cu" column represents
   `i=Au, j=Cu` or the reverse — check the paper's own worked example or
   any prose sentence that names an activity coefficient explicitly
   (e.g. "γ_Au" or "γ_Cu") in connection with this row.
2. The specific temperature Source A used for this row (may require
   reading Bai et al. 2020 directly, past its paywall, since Source A's
   Table 3/5 do not restate it).
3. `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu` at that temperature, from a source
   Source A itself would recognize as authoritative for its own model
   inputs (Source A's own reference list, e.g. Iida & Guthrie-type
   physical-property compilations, is the natural place to check first —
   not assumed).
4. Ideally, independent corroboration of the Table 3 values against a
   second, non-Al-Ca-duplicated source (e.g., a direct fetch of Source B
   once un-paywalled, or Source D if it independently covers Au-Cu) —
   given that Table 5's internal duplication anomaly is reason for some
   caution about this paper's table-production pipeline generally, not
   just about Table 5.

## 16. Scientific Uncertainties

- Whether RDF/pair-potential-derived `B_ij`/`B_ji` (Source A's method) is
  scientifically equivalent, for this engine's purposes, to the
  activity-coefficient-fitted `B_ij`/`B_ji` that is MIVM's more common
  parameterization route elsewhere in the literature. Both are
  legitimate applications of the same underlying MIVM equation, but they
  answer different empirical questions and may not agree with each
  other quantitatively for the same real system.
- The unexplained Table 5 Au-Cu/Al-Ca numeric duplication (§4.A) is an
  open, unresolved data-quality question about the published source
  itself, not about this project's handling of it.
- Whether the Au₅₀Cu₅₀-specific (equiatomic) structural data underlying
  Source A's row is representative enough to license a composition-
  independent `B_ij`/`B_ji` pair (which MIVM's own theory assumes these
  parameters to be) — a single-composition structural snapshot is a
  narrower empirical basis than a multi-composition activity-coefficient
  fit would be.

## 17. Implementation Recommendation for Phase 2E-D

1. Do **not** add any numeric MIVM value to `engine/data/parameterSets/`
   in this phase. Continue returning `NOT_FOUND` for
   `resolveMivmParameters(Au-Cu, ...)`, exactly as `mivm/parameters.ts`
   already documents as the correct, honest current behavior.
2. If desired, add a **`PROVISIONAL`, `status: "unavailable"`**
   `ParameterSet` record (mirroring the existing `auCu.ts` pattern for
   the non-MIVM models) capturing the Table 3 candidate and its full
   caveats from this report, so that the specific gap ("Hang & Tao 2023
   has a same-convention Au-Cu candidate, but index orientation,
   temperature, and `Z`/`V_m` are still missing") is itself
   machine-readable and doesn't need to be re-discovered from scratch by
   a future phase. This is documentation-as-data, not a numeric
   production value, and is consistent with Rule 7/Rule 9's provenance
   architecture.
3. A worthwhile next research step (not performed this phase, to keep
   scope to what's requested): directly fetch Wang, Chen & Tao (2023,
   Metals 13, 996) full text to check whether it independently reports
   Au-Cu, which — after an explicit, documented convention
   transformation per Rule 3 — could serve as the independent second
   source needed by §15.4.

---

## Final Stop Condition

- **Test suite:** could not be run in this environment — this checkout
  has no `node_modules` and `bash_tool` network egress is disabled here
  (`npm install` returns `403 Forbidden` against the npm registry), so
  `npm test` (`vitest run`) could not be executed to confirm no
  accidental changes to test results. This is an environment limitation,
  not a result; it is reported honestly rather than assumed to be "fine."
- **Git status:** this checkout is an extracted zip archive
  (`/mnt/user-data/uploads/secret-python-phd2cxzn-main.zip`), not a git
  clone — there is no `.git` directory, so `git status` is not
  applicable here. (`git status` reports: `fatal: not a git repository`.)
- **Files changed this phase:** exactly one file was created —
  this document, `docs/MIVM_PHASE_2E-C_AUCU_PARAMETER_AUDIT.md`. No file
  under `app/`, `engine/models/`, `engine/data/parameterSets/`, or
  `index.html` was modified, per the phase's explicit constraints. No
  commit or push was performed.
