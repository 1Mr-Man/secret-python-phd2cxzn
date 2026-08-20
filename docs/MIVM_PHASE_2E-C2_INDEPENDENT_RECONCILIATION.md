# Phase 2E-C2 — Independent Au-Cu MIVM Parameter Reconciliation

> **Import note:** originally produced in the same disconnected checkout
> as Phase 2E-C (no `.git`, no network egress). Imported verbatim into
> this repository's `docs/` on branch `claude/aucu-mivm-parameter-audit-0g5k95`.
> See `docs/MIVM_PHASE_2E-C3.1_INFINITE_DILUTION_CROSS_CHECK.md` for the
> first phase in this chain run against this real repo.

**Status: RESEARCH/AUDIT ONLY.** No MIVM model code, `app/`, `index.html`,
`CalculationPipeline.ts`, or existing model file was touched. No numeric
MIVM parameter was added to production data. No commit or push was
performed.

Authoritative state referenced: Phase 2E-B accepted (commit `8566e11`,
model `thermodynamics.mivm.binary`, locked convention Hang & Tao (2023),
Metals 13, 1773). Phase 2E-C completed
(`docs/MIVM_PHASE_2E-C_AUCU_PARAMETER_AUDIT.md`), candidate `B_ij=1.163,
B_ji=1.444` remains `PROVISIONAL`/`unavailable`.

---

## 1. Executive Conclusion

**Wang, Chen & Tao (2023), Metals 13, 996 does not contain an Au-Cu
parameter row.** Its full text was directly retrieved (open access, CC
BY) and its complete alloy list is stated explicitly in-text:

> "the specific alloys were Al-Au, Al-Cu, Al-Co, Al-Ge, Al-In, Al-Mg,
> Al-Si, Al-Sn, Bi-Pb, Co-Ni, Cs-K, Cu-Fe, Cu-Mg, Cu-Sb, Cu-Zr, Fe-Ni,
> K-Na, Mg-Si, and Mg-Zn" — 19 systems, none of which is Au-Cu.

This answers the primary objective's question 1 directly and negatively:
**there is no Au-Cu parameter set in this paper to compare, transform,
or reconcile.** Questions 2–10 of the primary objective (what are its
`B_ij`/`B_ji`, what convention, temperature, `Z`, molar volumes, direct
vs. derived, underlying source) are therefore **moot for Au-Cu
specifically** — there is nothing to report for a row that does not
exist.

This negative result is still useful, and is not a wasted search: it
rules out the most obvious "second source" this project could have used
to cross-check the Hang & Tao (2023) Table 3 candidate (§Phase 2E-C
§15.4), and it surfaces a substantive, previously-undocumented finding
about the two conventions that matters regardless of Au-Cu's absence —
see §3 below.

**Net result of this phase:** production data store remains **empty**
for `thermodynamics.mivm.binary` / `Au-Cu`, unchanged from Phase 2E-C.
No transformation was performed because there is nothing on the
Wang-Chen-Tao side to transform.

---

## 2. Wang-Chen-Tao (2023) Evidence

Full text retrieved directly (MDPI PDF, CC BY 4.0):

> Wang, C.; Chen, X.; Tao, D. "Estimation of Component Activities and
> Molar Excess Gibbs Energy of 19 Binary Liquid Alloys from Partial Pair
> Distribution Functions in Literature." *Metals* **2023**, *13*(5), 996.
> https://doi.org/10.3390/met13050996

Answering the ten specific questions from the Phase 2E-C2 objective:

1. **Does it contain an Au-Cu parameter row?** **No.** Confirmed by the
   paper's own explicit, complete list of its 19 alloys (quoted in §1),
   its worked example (Al-Cu), and its results tables/figures (Table 3,
   Figures 4–7), none of which reference Au-Cu. This is a direct textual
   fact, not an inference from a partial table.
2. **What are its `B_ij`/`B_ji` values [for Au-Cu]?** N/A — no such row
   exists.
3. **What convention does it use?** Confirmed directly from its Eq. 14
   (§3 below) — the convention described in the Phase 2E-C2 prompt as
   "Wang-Chen-Tao": first volume-denominator term (`x_i`-associated)
   uses `B_ij`, second (`x_j`-associated) uses `B_ji`.
4. **Does it use `λ_ij`/`λ_ji`?** **Yes**, confirmed directly — Eq. 14's
   enthalpy term is built from `λ_ij`, `λ_ji` (Eq. 16), not `ln B_ij`,
   `ln B_ji`.
5. **What does its Au-Cu ordering mean?** N/A — no Au-Cu row.
6. **Does it give temperature?** N/A for Au-Cu. (For its actual 19
   alloys, yes — e.g. the worked Al-Cu example is explicitly at
   `T = 1400 K`, §3.)
7. **Does it give Z values?** N/A for Au-Cu. (For its actual alloys, yes
   — local coordination numbers `Z_ii, Z_ij, Z_jj, Z_ji` are computed
   per-system, e.g. Table 2's worked Al-Cu example: `Z_ii=5.32,
   Z_ij=3.78, Z_ji=5.68, Z_jj=2.26`.)
8. **Does it give molar volumes?** Not as a standalone tabulated number
   in the retrieved text (its `B_ij`/`B_ji` formula, Eq. 15, does not
   even use `V_mi`/`V_mj` directly — see §3) — molar volume appears only
   symbolically in the general MIVM equation (Eq. 14), sourced generi-
   cally to Iida & Guthrie (ref. [40]) rather than tabulated per-element
   in this paper.
9. **Is [an Au-Cu] parameter set directly reported or derived?** N/A —
   no such set exists in this source.
10. **What underlying source/data produced the values?** N/A for Au-Cu.
    (For its real 19 alloys: each system's own cited PPDF literature
    source, e.g. Al-Cu ← Roik et al. 2010, ref. [50].)

---

## 3. Convention Comparison

Both papers' full model equations were now read directly (not from
search paraphrase), which makes it possible to state the comparison
precisely rather than approximately.

### Hang & Tao (2023), Metals 13, 1773 — Eq. 13/14 (already documented in Phase 2E-C):

```
G_m^E/RT = x_i ln( V_mi / (x_i V_mi + x_j V_mj B_ji) )
         + x_j ln( V_mj / (x_j V_mj + x_i V_mi B_ij) )
         - (x_i x_j/2) [ Z_i B_ji ln(B_ji) / (x_i + x_j B_ji)
                        + Z_j B_ij ln(B_ij) / (x_j + x_i B_ij) ]

B_ij = exp[ -(ε_ij - ε_jj)/kT ]   B_ji = exp[ -(ε_ji - ε_ii)/kT ]
```

### Wang, Chen & Tao (2023), Metals 13, 996 — Eq. 14/15/16 (newly read this phase):

```
G_m^E/RT = x_i ln( V_mi / (x_i V_mi + x_j V_mj B_ij) )
         + x_j ln( V_mj / (x_j V_mj + x_i V_mi B_ji) )
         + (x_i x_j/2) [ Z_i B_ij λ_ij / (x_i + x_j B_ij)
                        + Z_j B_ji λ_ji / (x_j + x_i B_ji) ]

B_ij = [∫_r0^r1 r² g_ij(r) dr] / [∫_r0^r1 r² g_ii(r) dr]
B_ji = [∫_r0^r1 r² g_ij(r) dr] / [∫_r0^r1 r² g_jj(r) dr]

λ_ij = (ε_ij - ε_ii)/kT     λ_ji = (ε_ji - ε_jj)/kT
```

This confirms, at the level of the actual retrieved equations (not a
paraphrase), everything the Phase 2E-C2 prompt asserted about the two
conventions' first/second volume-denominator assignment and
`ln(B)`-vs-`λ` enthalpy form. **But it also surfaces something the
prompt's convention description did not state, and that is more
consequential than the sign/ordering swap:**

**`B_ij` does not mean the same physical quantity in the two papers.**

- In Hang & Tao (2023), `B_ij` is an **energy-based Boltzmann-type
  factor**: `exp[-(ε_ij - ε_jj)/kT]`, i.e. essentially a pair-potential
  ratio, dimensionless by construction of the exponential.
- In Wang, Chen & Tao (2023), `B_ij` is a **structure-based ratio of
  L-PPDF radial integrals** — effectively a ratio of local coordination
  numbers (`≈ Z_ij / Z_ii` in spirit, per their Eq. 2 definitions of
  `Z_ii`, `Z_ij`) — and involves **no exponential, no `ε`, and no
  explicit `T` dependence in its own defining formula** (Eq. 15).
  The temperature/energy content in Wang-Chen-Tao's model instead lives
  entirely in the separate `λ_ij`/`λ_ji` terms (Eq. 16), which — not
  `B_ij` — are the Boltzmann-type, `ε`-based quantities in that paper's
  formulation, structurally closer to what Hang & Tao call `ln(B_ij)`.

In other words: **Wang-Chen-Tao's `λ_ij` plays the energy role that
Hang-Tao's `ln(B_ij)` plays; Wang-Chen-Tao's `B_ij` plays a structural
role that has no equivalently-named counterpart in Hang-Tao's formula
at all** (Hang & Tao's structural/volume information is instead carried
entirely by `V_mi`, `V_mj` and the plain mole fractions in the
denominators, not by a separate structural `B`). The shared symbol
`B_ij` across the two papers is very likely a source of the exact
same-symbol-different-meaning confusion this project's Rule 3 exists to
prevent — and this phase's direct-equation read is what caught it; a
search-snippet-level comparison would not have.

---

## 4. Explicit Transformation Analysis

**Not applicable this phase, and not attempted**, for two independent
reasons:

1. There is no Wang-Chen-Tao Au-Cu numeric value to transform (§1, §2).
2. Even in the abstract, a term-by-term algebraic substitution between
   the two `B_ij` definitions is **not a simple relabeling**. Because
   Hang-Tao's `B_ij` is an energy-domain quantity and Wang-Chen-Tao's
   `B_ij` is a structure-domain quantity (§3), converting one paper's
   `(B_ij, B_ji)` pair into the other's would require going back to
   each paper's own underlying `ε_ij`, `ε_ii`, `ε_jj` and/or `g_ij(r)`,
   `g_ii(r)`, `g_jj(r)` — not simply plugging one paper's `B_ij` number
   into the other's formula. Since Wang-Chen-Tao has no Au-Cu row at
   all, none of those underlying quantities exist for Au-Cu in that
   source either, so this transformation cannot be attempted even in
   principle from this pairing. This finding is recorded for the
   benefit of any future phase that might be tempted to substitute
   Hang & Tao's Au-Cu `B_ij=1.163` into a Wang-Chen-Tao-convention
   calculation, or vice versa, by symbol-matching alone — **that
   substitution would be a Rule 3 violation even though the symbols
   match**, because the symbols denote different physical quantities.

---

## 5. Au-Cu Parameter Comparison

| Parameter | Hang & Tao 2023 | Wang, Chen & Tao 2023 | Independent source | Unit | Temperature | Orientation | Direct/Derived | Compatible? | Production status |
|---|---|---|---|---|---|---|---|---|---|
| B_ij | 1.163 (Table 3, asymmetric method) | **N/A — no Au-Cu row exists** | Not found this phase | dimensionless (but see §3: not the same physical quantity between papers) | UNKNOWN | UNVERIFIED | Derived (PRDF/pair-potential route) | N/A (nothing to compare against) | UNAVAILABLE |
| B_ji | 1.444 (Table 3) | **N/A** | Not found this phase | dimensionless | UNKNOWN | UNVERIFIED | Derived | N/A | UNAVAILABLE |
| B_ij (alt.) | 2.423 (Table 5, symmetric method — flagged, §Phase 2E-C §4.A) | N/A | Not found | dimensionless | UNKNOWN | UNVERIFIED | Derived | N/A | UNAVAILABLE (data-quality flag) |
| B_ji (alt.) | 0.515 (Table 5) | N/A | Not found | dimensionless | UNKNOWN | UNVERIFIED | Derived | N/A | UNAVAILABLE (data-quality flag) |
| Z_Au, Z_Cu | Not reported | N/A (no Au-Cu row; and this paper's own `Z_ii/Z_ij/Z_jj/Z_ji` are per-system L-PPDF-derived local numbers, not portable element constants — see §6) | Not found this phase | dimensionless | — | — | — | — | UNAVAILABLE |
| V_m,Au, V_m,Cu | Not reported | Not reported per-element (generic reference to Iida & Guthrie only) | Not found this phase | cm³/mol (assumed) | — | — | — | — | UNAVAILABLE |

No cell in this table changes Phase 2E-C's conclusion: **no row is
`VERIFIED_DIRECT` or eligible for production.**

---

## 6. Z and Molar-Volume Evidence

Wang, Chen & Tao (2023) does **not** use element-level constant
coordination numbers (`Z_Au`, `Z_Cu`) the way this project's locked
Hang & Tao convention does. Instead it computes **system-and-composition-
specific local coordination numbers** `Z_ii`, `Z_ij`, `Z_jj`, `Z_ji`
directly from each alloy's own L-PPDF integral (Eq. 2), per composition
point. Its worked Al-Cu example at `x_Cu = 0.4`, `T = 1400 K` gives
`Z_ii=5.32, Z_ij=3.78, Z_ji=5.68, Z_jj=2.26` — these are **not**
transferable "the coordination number of pure Al" / "of pure Cu"
constants; they are properties of that specific Al-Cu mixture at that
specific composition and temperature, extracted from that specific
PPDF data set. This is a materially different `Z` concept from the
`Z_i`/`Z_j` this project's locked Hang & Tao model expects (which are
first coordination numbers of the **pure** substances, composition-
independent inputs). Even if Wang-Chen-Tao had reported Au-Cu, its `Z`
values could not be dropped into `resolveMivmParameters`'s `Z_i`/`Z_j`
slots without an explicit, documented reduction (e.g., is `Z_i` meant
to be `Z_ii` at the dilute limit? An average? Neither paper states an
equivalence). This is flagged for Phase 2E-D per this project's Rule 5
(never silently convert between different physical definitions).

Molar volumes (`V_mi`, `V_mj`) are referenced in Wang-Chen-Tao's general
model equation (Eq. 14) but, per the retrieved text, are cited generi-
cally to Iida & Guthrie (1988) rather than tabulated per-element in this
paper's own tables. Notably, this paper's own `B_ij`/`B_ji` formula
(Eq. 15) does **not** actually use `V_mi`/`V_mj` at all — only the
overall `G_m^E` equation does. No Au-Cu-specific molar volume was found
in this source (moot, since the alloy is absent) or independently
sourced this phase.

---

## 7. Temperature Evidence

No Au-Cu-specific temperature exists in this source (moot). For
context: this paper's own worked example (Al-Cu) uses `T = 1400 K`,
sourced from the specific PPDF literature reference for that alloy
(Roik et al. 2010) — illustrating that in this paper's methodology,
temperature is tied to whichever specific PPDF measurement/simulation
was used per alloy, not a single project-wide default. This reinforces
Phase 2E-C's §7 point that any future Au-Cu MIVM parameter (from either
convention) needs its temperature traced to the specific underlying
structural data set, not assumed.

---

## 8. Index-Orientation Evidence

No Au-Cu row exists, so no new orientation evidence was obtained from
this source. Wang-Chen-Tao's own convention for reading a system name
(e.g. "Al-Cu") is not stated more explicitly than Hang-Tao's was —
i.e., this paper does not resolve the general `i`-vs-`j` orientation
ambiguity flagged in Phase 2E-C §6/§15.1 for the Hang & Tao Au-Cu row
either; it simply doesn't have its own Au-Cu row to be ambiguous about.

---

## 9. Independent-Source Assessment

The **first target** (Wang, Chen & Tao 2023) returned a definitive
**negative** result for Au-Cu. Per the Phase 2E-C2 instructions, the
**secondary targets** listed (Tao 2015/2016 full text, original
references behind the Au-Cu tables, Iida & Guthrie-type physical-
property sources, the Bai et al. 2020 structural source, or any
independent non-Tao-group publication) were **not pursued this phase**
— the instructions frame them as fallback targets "if the Wang-Chen-Tao
paper does not provide sufficient information," and establishing that
negative result thoroughly (§1–§2) was itself the substantial finding
of this phase. Pursuing all five secondary targets in the same phase
would extend well beyond a single reconciliation pass and risks
shortcuts; they are better queued explicitly for Phase 2E-D or a
Phase 2E-C3, rather than rushed here.

---

## 10. Production-Readiness Decision

**Unchanged from Phase 2E-C: no.** No numeric MIVM Au-Cu value — from
either Hang & Tao (2023) or Wang, Chen & Tao (2023) — is promoted to
`VERIFIED_DIRECT` or added to `engine/data/parameterSets/`. The
Wang-Chen-Tao paper cannot serve as the independent corroborating
source Phase 2E-C §15.4 asked for, because it simply does not cover
Au-Cu. The Hang & Tao Table 3 candidate (`B_ij=1.163, B_ji=1.444`)
remains exactly where Phase 2E-C left it: `PROVISIONAL`/`unavailable`,
single-source, with orientation/temperature/`Z`/`V_m` still unresolved.

---

## 11. Remaining Uncertainties

- All uncertainties carried over from Phase 2E-C §16 remain fully open
  (RDF-derived vs. activity-fitted equivalence question; the Table 5
  Au-Cu/Al-Ca duplication anomaly; single-composition/single-temperature
  basis of the only candidate found).
- **New this phase:** confirmation that "`B_ij`" is not a stable,
  cross-paper-comparable symbol even within the Tao research group's
  own 2023 output — two papers from overlapping authors, published
  months apart, use the same variable name for two different physical
  quantities (Boltzmann energy factor vs. structural RDF-integral
  ratio). This raises the bar for how carefully any *future* secondary
  source (§9) must be read before its numbers are treated as
  transformable into this project's locked convention — matching
  symbol names between sources is not sufficient evidence of
  compatibility, and must not be used as a shortcut.
- Whether Wang-Chen-Tao's `Z_ii/Z_ij/Z_jj/Z_ji` local-coordination-
  number framework is even in-principle reducible to the pure-substance
  `Z_i`/`Z_j` this project's locked model needs, for any alloy — not
  just Au-Cu — is itself an open modeling question raised by this
  phase's reading, independent of Au-Cu's absence.

## 12. Recommendation for Phase 2E-D

1. Continue to treat `thermodynamics.mivm.binary` / `Au-Cu` as
   correctly `NOT_FOUND` in production. No change from Phase 2E-C.
2. If a `PROVISIONAL` record is added per Phase 2E-C §17.2, its note
   should now also state explicitly that Wang, Chen & Tao (2023) was
   checked and does not cover Au-Cu, so a future phase doesn't
   re-spend effort re-checking that specific paper.
3. Of the five secondary targets named in this phase's instructions,
   the most promising next step is **not** re-attempting the paywalled
   Tao (2015/2016) or Bai et al. (2020) sources (already known-blocked,
   Phase 2E-C §4.B/§4.C) but instead a **fresh, non-Tao-group** search
   specifically for Au-Cu MIVM parameters — e.g., checking whether any
   of the many CALPHAD/experimental Au-Cu assessments already
   catalogued in this repo's non-MIVM `auCu.ts` (Sundman 1998, Singh &
   Sommer 1997) report infinite-dilution activity coefficients
   `γ_Au^∞`, `γ_Cu^∞` that a future phase could use to derive
   activity-fitted (not PRDF-derived) `B_ij`/`B_ji` directly in the
   locked Hang & Tao convention, matching that convention's own
   documented standard parameterization route (Phase 2E-C §10) rather
   than relying on the structurally different PRDF-derived route this
   phase and Phase 2E-C have both been confined to.

---

## Final Stop Condition

- **Files changed this phase:** exactly one file created —
  `docs/MIVM_PHASE_2E-C2_INDEPENDENT_RECONCILIATION.md`. No other file
  in the repository was modified.
- **Test/build status:** not run — same environment limitation as
  Phase 2E-C (`npm install` returns `403 Forbidden`, no `node_modules`
  present, network egress disabled for this container). Not assumed to
  be passing; reported as not executed.
- **Git status:** not applicable — this checkout is an extracted zip
  archive, not a git clone (no `.git` directory).
- No commit or push was performed.
