# Phase 2E-C3 — Au-Cu Infinite-Dilution Activity Data & MIVM Parameter Derivation

> **Import note:** originally produced in the same disconnected checkout
> as Phase 2E-C/2E-C2 (no `.git`, no network egress, no `node_modules`).
> Imported verbatim into this repository's `docs/` on branch
> `claude/aucu-mivm-parameter-audit-0g5k95`. This phase's own §3
> explicitly flagged an unperformed cross-check against the accepted
> Oshakuade & Awe infinite-dilution test in `model.test.ts` — that
> cross-check is now done, against the real test file, in
> `docs/MIVM_PHASE_2E-C3.1_INFINITE_DILUTION_CROSS_CHECK.md`.

**Status: RESEARCH/AUDIT ONLY.** No MIVM model code, `app/`, `index.html`,
`CalculationPipeline.ts`, or existing model file was touched. No numeric
value was added to `engine/data/parameterSets/`. No commit or push was
performed.

Authoritative state: Phase 2E-B accepted (model `thermodynamics.mivm.binary`,
locked convention Hang & Tao (2023), Metals 13, 1773). Phase 2E-C candidate
`B_ij=1.163, B_ji=1.444` (`PROVISIONAL`/`unavailable`; Table 5's
`2.423/0.515` flagged/rejected). Phase 2E-C2: Wang, Chen & Tao (2023),
Metals 13, 996 confirmed to contain no Au-Cu data and to use a
non-interchangeable `B_ij` definition.

---

## 1. Executive Conclusion

**This phase mathematically derives the two infinite-dilution limits of
the locked Hang & Tao (2023) activity-coefficient equation from first
principles (§3), and establishes precisely what data would be needed to
use them to solve for `B_AuCu`/`B_CuAu` (§2).** That identifiability
analysis is a real, load-bearing result of this phase, independent of
what data could or could not be found afterward.

**The data search (§4–§6), however, does not clear this project's
evidentiary bar.** Multiple primary experimental sources for Au-Cu
liquid-alloy thermodynamics were identified — a 1956 JACS paper
reporting effusion-vapor-pressure activity measurements (Edwards &
Brodsky), a Knudsen-cell mass-spectrometry study at 1733 K referenced by
a secondary source (attributed to "Hager et al."), the Sundman, Fries &
Oates (1998) CALPHAD assessment already known to this repo, and the
Hultgren et al. (1963/1973) critical compilation that several of these
other sources cite as their point of comparison. **None of these could
be read past their abstract/first page in this environment** (JACS,
ScienceDirect, and the Hultgren compilation are all paywalled or not
independently fetchable here), so **no actual numeric `γ_Au^∞` or
`γ_Cu^∞` value was independently verified this phase.** Likewise, no
independently-sourced numeric `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu` were
retrieved — only the general (element-agnostic) Tao coordination-number
prediction *formula*, which itself needs further sub-inputs
(`r_0i`, `r_mi`, `ΔH_mi`, `T_mi`) that were not retrieved for Au or Cu
specifically this phase.

Per this phase's own mandatory stop conditions — "γ-infinity data
cannot be independently verified" and "required Z/Vm definitions cannot
be established" — **this phase stops before Step 6 (parameter
derivation).** No `B_AuCu`/`B_CuAu` pair is derived. The Hang & Tao
Table 3 candidate (`1.163`/`1.444`) is **not compared numerically**
against anything, because there is nothing independently derived to
compare it against — Step 7's outcome is **D: cannot determine**, not
A/B/C.

**Classification: UNAVAILABLE**, unchanged from Phase 2E-C. Production
store remains empty.

---

## 2. Mathematical Identifiability Analysis

Given the derivation in §3, each infinite-dilution equation
(`ln γ_Au^∞`, `ln γ_Cu^∞`) is a single scalar equation containing **six**
symbols: `B_AuCu`, `B_CuAu`, `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu` (plus the
fixed numeric constants and `T` implicitly embedded in whichever
`γ^∞` values are used). Two equations cannot determine six unknowns.

**The system is identifiable for `(B_AuCu, B_CuAu)` specifically, and
only specifically, if `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu` are supplied
from an independent source and treated as known constants.** This
matches the standard MIVM parameterization procedure documented in the
literature surveyed across this project's prior phases (e.g. the Cu-Ni
MIVM paper cited in Phase 2E-C §6: "*required binary parameters B_ij and
B_ji were determined by using the Newton-Raphson methodology with the
aid of the experimental data of infinite dilution activity coefficients
γ_i^∞, γ_j^∞*" — with `Z` and `V_m` supplied separately, not fit). This
project's own locked model expects exactly that division of labor:
`Z_i`, `Z_j`, `V_mi`, `V_mj` are pure-component physical-property inputs,
external to the two-equation `B_ij`/`B_ji` fit.

**Given `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu` as known:** the system reduces
to two transcendental equations in two unknowns (`B_AuCu`, `B_CuAu`),
each equation containing `B` both linearly/rationally and inside a
natural log. This is:

- **In principle uniquely solvable numerically** (e.g. Newton–Raphson,
  as the cited literature does) for a *locally* unique root, given a
  reasonable starting guess and the physical constraint `B > 0` (both
  `B_ij` and `B_ji` are defined as `exp[...]`, Phase 2E-C §4.A, so are
  strictly positive by construction — this **does** eliminate
  spurious non-positive algebraic roots that an unconstrained numerical
  solver might otherwise find).
- **Not provably globally unique from the equation structure alone** —
  transcendental equations of this form can admit multiple positive
  roots depending on the specific `γ^∞`, `Z`, `V_m` values; verifying
  uniqueness for the *actual* Au-Cu case would require solving the
  system numerically with real inputs and checking the Jacobian/local
  behavior near the solution, which cannot be done without those real
  inputs (§4–§6 establish that none were independently verified this
  phase).
- **Numerical conditioning near plausible Au-Cu values was not
  assessed**, for the same reason — conditioning depends on the actual
  `γ^∞`, `Z`, `V_m` values, none of which are in hand.

**Conclusion of this step, per the phase's own instruction ("If the
system is underdetermined without Z/Vm, STOP and document that"):** the
system is **not underdetermined in principle** — it is exactly
determined given `Z`/`V_m` — but this phase **could not independently
establish** `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu` (§6), so in *practice*,
this phase has an underdetermined problem: two equations, two
formally-solvable unknowns, but the equations' own coefficients
(`Z`, `V_m`) are themselves unverified. This is documented rather than
worked around.

---

## 3. Infinite-Dilution Equations (Derived From the Locked Hang & Tao Form)

Starting from the Hang & Tao (2023) activity-coefficient equation
already confirmed against primary text in Phase 2E-C §4.A (their Eq. 14):

```
ln γ_i = 1 + ln( V_mi / (V_mi x_i + V_mj B_ji x_j) )
           - x_i V_mi / (V_mi x_i + x_j V_mj B_ji)
           - x_j V_mi B_ij / (V_mj x_j + x_i V_mi B_ij)
           - (x_j² / 2) [ Z_i B_ji² ln(B_ji) / (x_i + x_j B_ji)²
                        + Z_j B_ij ln(B_ij) / (x_j + B_ij x_i)² ]
```

Taking `i = Au`, `j = Cu` (per the same **unverified, convention-only**
orientation assumption already flagged in Phase 2E-C §6 — this
derivation does not resolve that ambiguity, it only carries it forward
explicitly).

**Limit 1 — `x_Au → 0`, `x_Cu → 1` (infinite dilution of Au in Cu, i.e. `γ_Au^∞`):**

- Term 1: `1`
- Term 2: `ln(V_mi/(0 + V_mj B_ji · 1)) = ln(V_m,Au / (V_m,Cu · B_CuAu))`
- Term 3: `-x_i V_mi/(...)` → `0` (numerator `x_i → 0`)
- Term 4: `-x_j V_mi B_ij/(V_mj x_j + x_i V_mi B_ij)` → `-(1)(V_m,Au)(B_AuCu)/(V_m,Cu·1 + 0) = -(V_m,Au/V_m,Cu) B_AuCu`
- Term 5: `-(x_j²/2)[...]` at `x_j=1, x_i=0`:
  `-(1/2)[ Z_Au · B_CuAu² ln(B_CuAu) / (B_CuAu)² + Z_Cu · B_AuCu ln(B_AuCu) / (1)² ]`
  `= -(1/2)[ Z_Au ln(B_CuAu) + Z_Cu B_AuCu ln(B_AuCu) ]`

**Result:**

```
ln γ_Au^∞ = 1 + ln( V_m,Au / (V_m,Cu · B_CuAu) )
              - (V_m,Au / V_m,Cu) · B_AuCu
              - (1/2) [ Z_Au ln(B_CuAu) + Z_Cu B_AuCu ln(B_AuCu) ]
```

**Limit 2 — `x_Cu → 0`, `x_Au → 1` (infinite dilution of Cu in Au, i.e. `γ_Cu^∞`)**, by the `i↔j` symmetry of the same general two-component `ln γ_j` expression (Hang & Tao's model is written with `i`/`j` interchangeable by relabeling — confirmed by the symmetric structure of their Eq. 13/14 itself, not assumed):

```
ln γ_Cu^∞ = 1 + ln( V_m,Cu / (V_m,Au · B_AuCu) )
              - (V_m,Cu / V_m,Au) · B_CuAu
              - (1/2) [ Z_Cu ln(B_AuCu) + Z_Au B_CuAu ln(B_CuAu) ]
```

These two equations are the direct, from-scratch limits of this
project's own already-accepted, already-locked equation — they were not
copied from any secondary paper's stated infinite-dilution formula.
**No secondary-paper infinite-dilution formula was used or needed for
this derivation step**, satisfying the instruction to derive
exclusively from the locked Phase 2E-B equations.

**Cross-check against the Phase 2E-B/Oshakuade & Awe triangulation:**
Phase 2E-B's accepted test suite includes an "infinite-dilution
comparison against Oshakuade & Awe (2021)" (per the Phase 2E-C prompt's
own authoritative-state summary). This document did **not** re-derive
or re-inspect that specific test in this phase — doing so would require
reading the actual test file and Oshakuade & Awe (2021) source text,
which is out of this phase's scope as framed (deriving the general
limit equations, not re-auditing an already-accepted test). This is
flagged as an open cross-check for Phase 2E-D: **the two boxed equations
above should be diffed line-by-line against whatever expression that
existing accepted test encodes**, as the cheapest possible independent
confirmation that this derivation was not fumbled. That diff was not
performed here.

---

## 4. Experimental Data Sources

| Candidate source | Access result | What it appears to contain (per abstract/citation-level evidence) |
|---|---|---|
| Edwards, R.K.; Brodsky, M.B. "The Thermodynamics of the Liquid Solutions in the Triad Cu-Ag-Au. II. The Cu-Au System." *J. Am. Chem. Soc.* **1956**, *78*(13), 2983–2989. | First page/abstract only (ACS paywall) | Title and citation context (via a secondary ScienceDirect source, §4 table below) indicate this reports Au-Cu liquid activities at **1550 K** from effusion vapor-pressure measurements. **No numeric value independently read.** |
| "Hager et al." — cited secondarily as reporting Au-Cu activities at **1733 K** via Knudsen-cell mass spectrometry | Not identified to a specific, independently-fetchable citation this phase; known only through a snippet of a paywalled ScienceDirect paper ("Densities of Au-X (X=Cu,Ni,Pd) binary melts...") that itself could not be fetched (`ROBOTS_DISALLOWED`) | Snippet-level only. **Not primary-verified**; full citation (journal, year, volume) not established this phase. |
| Sundman, B.; Fries, S.G.; Oates, W.A. "A thermodynamic assessment of the Au-Cu system." *Calphad* **1998**, *22*(3), 335–354. | Abstract only (ScienceDirect paywall); already in this repo as `AU_CU_REGULAR_SOLUTION_SUNDMAN_1998` with `status: "unavailable"` | A CALPHAD Redlich-Kister assessment of the full liquid phase, built from (among other things) whatever primary experimental activity data the authors compiled — but the assessment itself reports fitted `L0, L1, ...` polynomial coefficients, not directly `γ^∞`. Per Phase 2C/2D's own prior finding (already in `auCu.ts`), collapsing this to a usable value requires a real transformation, not extraction. |
| Hultgren, R.; Desai, P.D.; Hawkins, D.T.; Gleiser, M.; Kelley, K.K. *Selected Values of the Thermodynamic Properties of Binary Alloys*. ASM, 1973 (and the related 1963 *Selected Values of Thermodynamic Properties of Metals and Alloys*). | Not independently fetchable this phase (not an online, openly-readable document; referenced only via other papers' citation lists) | A critically-evaluated **compilation**, not itself a primary measurement — cited repeatedly (§ search results) as *the* reference point most Au-Cu thermodynamics papers compare against, including Sundman et al. 1998 and the Au-X densities paper. Per this project's Rule 1 (primary source first) this would need to be traced back to its own underlying primary sources even if it were readable, which it was not this phase. |
| Okamoto, H.; Chakrabarti, D.J.; Laughlin, D.E.; Massalski, T.B. "The Au-Cu (gold-copper) system." *J. Phase Equilib.* **1987**, *8*(5), 454. | Not fetched this phase (identified only via citation in a secondary source) | A phase-diagram/thermodynamic review; likely contains a critical evaluation of activity data but not independently confirmed this phase. |
| `AU_CU_REGULAR_SOLUTION_SUNDMAN_1998`, `AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997`, `AU_CU_QUASI_CHEMICAL_SU_WANG_2013` (existing repo records, `auCu.ts`) | Already in-repo, all `status: "unavailable"` | Per the instruction not to assume these contain `γ^∞` values: **inspected directly** (§4.1 below) — confirmed they do **not** contain any numeric value at all, `γ^∞` or otherwise; every parameter in every one of these records is explicitly `"unavailable"` with no `value` field populated. |

### 4.1 — Direct inspection of existing repo records (per explicit instruction not to assume)

`engine/data/parameterSets/auCu.ts` was re-opened and read directly this
phase (not assumed from memory of Phase 2E-C's summary). Confirmed:

- `AU_CU_REGULAR_SOLUTION_SUNDMAN_1998`: single parameter `W`, `status:
  "unavailable"`, no numeric value present in the source file.
- `AU_CU_REGULAR_SOLUTION_SINGH_SOMMER_1997`: single parameter `W`,
  `status: "unavailable"`, no numeric value present.
- `AU_CU_QUASI_CHEMICAL_SU_WANG_2013`: two parameters `Z`, `W`, both
  `status: "unavailable"`, no numeric value present.

**None of these three existing records contain a `γ^∞` value, or any
other numeric value.** This confirms the Phase 2E-C3 instructions'
caution was warranted — it would have been wrong to assume otherwise —
and also confirms these three records cannot be used as a data source
for this phase's derivation regardless of their citation relevance.

**No candidate data point in this table reaches "record: source, DOI,
composition, temperature, measured quantity, direct/derived,
uncertainty, method" (Step 4's requirement) with an actual number
attached**, because no actual number was independently read from any
primary or secondary text this phase. Per the phase's own Step 4
instruction, that means there is nothing further to tabulate at the
individual-data-point level — the table above **is** the complete,
honest record of what was found and not found.

---

## 5. Z Evidence

**No Au- or Cu-specific numeric `Z` value was independently verified
this phase.** What was found:

- Tao's own general coordination-number **prediction formula** (already
  documented via secondary citation in Phase 2E-C §9, and re-confirmed
  this phase from a different secondary source, an arXiv quasi-lattice-
  theory paper that reproduces it directly):

  ```
  Z_i = (4√(2π)/3) · [(r_mi³ - r_0i³)/(r_mi - r_0i)] · (0.6022 r_mi / V_mi)
        · exp[ ΔH_mi (T_mi - T) / (Z_c R T T_mi) ]
  ```

  where `Z_c = 12` (close-packed coordination number), `r_0i`/`r_mi` are
  radial-distribution-function-derived radii, `ΔH_mi`/`T_mi` are the
  melting enthalpy/temperature of pure `i`. This formula's *existence*
  is independently confirmed (it appears, attributed to Tao, in at
  least one non-Tao-group paper's own literature review). **Its
  application to Au and Cu specifically — i.e., actual numeric values
  of `r_0,Au`, `r_m,Au`, `ΔH_m,Au`, `T_m,Au` and the Cu equivalents —
  was not retrieved this phase.** `T_m,Au` and `T_m,Cu` (melting points)
  and `ΔH_m,Au`/`ΔH_m,Cu` (melting enthalpies) are well-known constants
  that could likely be sourced quickly from a standard reference, but
  `r_0i`/`r_mi` are RDF-specific radii that would need their own
  primary source (e.g. a specific liquid-Au and liquid-Cu structure
  factor measurement) — not something to be pulled from general
  chemistry knowledge, per this phase's explicit "do not manufacture
  missing values" instruction.
- **`Z = 10` was explicitly not assumed**, per the phase's direct
  instruction, even though it is documented (Phase 2E-C §9) as a common
  simplification in Tao-group papers, including apparently for an Au-Cu
  test case in Tao (2015/2016). That simplification's applicability to
  *this specific derivation* was not established and is not invoked.

**Classification: UNAVAILABLE.**

---

## 6. Molar-Volume Evidence

**No Au- or Cu-specific numeric `V_m` (liquid molar volume) value was
independently verified this phase**, for the same reason as `Z`: the
Iida & Guthrie (1988) *The Physical Properties of Liquid Metals*
reference — which is the source Tao's own papers cite for this quantity
(confirmed directly from the Wang-Chen-Tao (2023) reference list read in
Phase 2E-C2: "*Vmi and Vmj are the molar volumes of i and j [40]*" where
[40] is Iida & Guthrie) — is a physical book, not an online document,
and was not independently fetchable this phase. Search results
confirmed the book's existence and general subject matter (§ search
results) but not any specific tabulated Au or Cu value from inside it.

No molar-volume value was pulled from any other source, general
chemistry knowledge, or estimation. **Classification: UNAVAILABLE.**

---

## 7. Temperature Reconciliation

Not reached. Reconciling a temperature requires having at least two
candidate data points at different temperatures to reconcile in the
first place (per Rule: "do not combine values from incompatible
temperatures without an explicit thermodynamic transformation"); since
no numeric `γ^∞` value was obtained from any source (§4), there is
nothing yet to reconcile. For the record, the sources found do imply at
least two different candidate temperatures exist in the literature for
Au-Cu liquid measurements — 1550 K (Edwards & Brodsky, per secondary
citation) and 1733 K (the "Hager et al." Knudsen-cell measurement, per
secondary citation) — which is itself useful to flag for Phase 2E-D:
**any future attempt to use these sources will need an explicit
temperature-conversion step** (Hang & Tao's own Eq. 37–38, already
documented in Phase 2E-C §4.A, provides the formal mechanism: `T ln B =
T' ln B'`) rather than averaging or mixing raw values from the two
temperatures.

---

## 8. Parameter Derivation

**Not performed.** Per this phase's own mandatory stop conditions
("STOP without deriving production parameters if: γ-infinity data
cannot be independently verified... required Z/Vm definitions cannot be
established... only secondary/search-snippet evidence is available"),
all of which apply here (§4, §5, §6), **Step 6 is not executed.** No
`B_AuCu`/`B_CuAu` pair is derived, symbolically forced, or estimated.
This is a deliberate stop, not an oversight — the alternative (plugging
in plausible-looking `γ^∞`, `Z`, `V_m` numbers from general knowledge to
"complete" the derivation) is exactly what this phase's instructions,
and this project's Rule 8, prohibit.

---

## 9. Sensitivity / Uncertainty

Not assessable without a derived solution (§8). What §2 does establish,
independent of specific numbers: because `B` appears inside a natural
log in the enthalpy term, the equations are more sensitive to `B` near
`B → 0⁺` (where `ln B → -∞`) than at `B` of order 1 — so if a future
phase does obtain real inputs and solves this system, it should expect
the numerical conditioning to degrade for any component pair with a
strongly asymmetric `B_ij` vs. `B_ji` (one much less than 1, one much
greater), and should explicitly check the solver's Jacobian conditioning
near its converged solution rather than trusting convergence alone.

---

## 10. Comparison with 1.163 / 1.444

**Outcome D — cannot determine**, per the phase's own defined outcome
categories. There is no independently-derived pair to compare against
the Hang & Tao Table 3 candidate. This is explicitly *not* interpreted
as evidence for or against `1.163`/`1.444` — per the phase's own
instruction, "do NOT interpret disagreement as automatically proving
the Hang & Tao values are wrong," and symmetrically, the absence of a
comparison here must not be misread as agreement either. The candidate
remains exactly as uncertain as Phase 2E-C left it.

---

## 11. Independent Validation

Not performed — validation (Step 8 of the phase instructions:
substituting a derived pair back into the equations, checking
positivity/domain/Gibbs-Duhem/composition behavior) presupposes a
derived pair to validate, which §8 establishes does not exist this
phase.

---

## 12. Production-Readiness Decision

**UNAVAILABLE.** No value is proposed for `engine/data/parameterSets/`.
This is the default outcome per the phase's own instructions ("The
default remains UNAVAILABLE unless the evidence genuinely satisfies the
project's provenance rules"), and that default was not overridden
because the evidence did not reach the required bar. The Hang & Tao
Table 3 candidate (`B_ij=1.163, B_ji=1.444`) remains `PROVISIONAL`,
unchanged.

---

## 13. Remaining Uncertainties

- Whether `i = Au, j = Cu` (vs. the reverse) for the Hang & Tao
  candidate — still unresolved (carried from Phase 2E-C, and now also
  embedded, as an explicit assumption, in this phase's own §3
  derivation, which would need to be re-derived with the opposite
  labeling if that assumption turns out to be wrong).
- Whether the Phase 2E-B-accepted Oshakuade & Awe infinite-dilution test
  matches the two boxed equations in §3 exactly — flagged in §3 as an
  unperformed but cheap and valuable cross-check for Phase 2E-D.
- The actual numeric identity, citation completeness, and content of
  the "Hager et al." 1733 K Knudsen-cell source — only known this phase
  via an unreachable secondary citation; a future phase should establish
  its full bibliographic identity before relying on it further.
- Whether Edwards & Brodsky (1956) and/or the Sundman et al. (1998)
  CALPHAD assessment, if their full text were obtained, would actually
  report or allow computation of `γ_Au^∞`/`γ_Cu^∞` at a usable
  temperature — this phase established that these sources plausibly
  bear on the question but did not confirm their actual content.
- Whether Tao's `Z_i` prediction formula (§5) is even the source Hang &
  Tao (2023) themselves used for their Table 3 Au-Cu row, as opposed to
  a different `Z` value or assumption specific to that paper's own PRDF-
  based method (Phase 2E-C §4.A already noted Hang & Tao's paper itself
  reports no explicit `Z` value for Au-Cu) — these could be two
  unrelated `Z` sourcing questions that happen to share notation.

## 14. Recommendation for Phase 2E-D

1. **Do not add any Au-Cu MIVM value to production.** Unchanged.
2. If continued, the highest-value next actions, in order of expected
   payoff per unit effort, are:
   a. **Obtain full text of Sundman, Fries & Oates (1998)** — already
      partially in this repo's provenance chain (`auCu.ts`), and the
      most likely single source to contain, or cite the primary source
      of, an actual `γ_Au^∞`/`γ_Cu^∞` number at a stated temperature,
      since a CALPHAD assessment's whole purpose is reconciling exactly
      this kind of data.
   b. **Obtain full text of Edwards & Brodsky (1956)** — the oldest and
      most directly relevant primary measurement identified this phase.
   c. Only after (a)/(b): pursue `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu` from
      Iida & Guthrie (1988), since sourcing physical-property inputs is
      wasted effort if no usable `γ^∞` pair is ultimately obtained.
3. **Perform the §3 cross-check against the existing accepted
   Oshakuade & Awe infinite-dilution test** before any further
   derivation work — it is nearly free (the test already exists and is
   accepted) and would either confirm or immediately correct this
   phase's derivation before it is built upon further.
4. If (a) and (b) both fail (remain paywalled), this specific
   derivation route (experimental `γ^∞` → locked-convention `B_ij`,
   `B_ji`) should be marked, explicitly, as blocked by environment
   access rather than re-attempted identically in a Phase 2E-C4 — a
   materially different search strategy or a manually-supplied excerpt
   (per this project's own documented upgrade path for `"unavailable"`
   records) would be needed to make further progress.

---

## Final Stop Condition

- **Files changed this phase:** exactly one file created —
  `docs/MIVM_PHASE_2E-C3_AUCU_ACTIVITY_PARAMETER_AUDIT.md`. No other
  file was modified. `engine/data/parameterSets/auCu.ts` was **read**
  (§4.1) but not edited.
- **Code/data untouched:** confirmed — no `app/`, `index.html`,
  `CalculationPipeline.ts`, model file, or parameter-data file was
  modified.
- **Tests/build:** not run — same environment limitation as Phase 2E-C
  and 2E-C2 (`npm install` returns `403 Forbidden`; no `node_modules`
  present; network egress disabled). Not assumed passing; reported as
  not executed.
- **Git status:** not applicable — this checkout is an extracted zip
  archive, not a git clone (no `.git` directory).
- No commit or push was performed.
