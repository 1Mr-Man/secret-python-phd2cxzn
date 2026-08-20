# Phase 2E-C3.1 — Infinite-Dilution Equation Cross-Check

**Status: RESEARCH/AUDIT ONLY.** No MIVM model code, `app/`, `index.html`,
`CalculationPipeline.ts`, or existing model file was touched. No numeric
MIVM parameter was added to production data. No commit or push was
performed.

This is the first phase in the 2E-C chain run against the actual git
repository (`1Mr-Man/secret-python-phd2cxzn`, branch
`claude/aucu-mivm-parameter-audit-0g5k95`), rather than the disconnected
zip checkout Phases 2E-C, 2E-C2, and 2E-C3 were performed in. `npm
install` succeeded, and the full test suite and typecheck were actually
run — not skipped as an environment limitation.

Authoritative state referenced: Phase 2E-B accepted, model
`thermodynamics.mivm.binary`, locked convention Hang & Tao (2023), Metals
13, 1773 ("Source B" in `docs/MIVM_MATHEMATICAL_AUDIT.md` and
`metadata.ts`'s header comment). Phase 2E-C3 derived, from scratch, the
`x_Au -> 0` and `x_Cu -> 0` infinite-dilution limits of this locked
equation (`docs/MIVM_PHASE_2E-C3_AUCU_ACTIVITY_PARAMETER_AUDIT.md §3`)
and explicitly flagged, but did not perform, a cross-check of that
derivation against this project's own already-accepted infinite-dilution
regression test. That cross-check is this phase's entire scope.

---

## 1. Executive Conclusion

**The Phase 2E-C3 derivation is confirmed correct, exactly, against the
accepted test.** `engine/models/thermodynamics/mivm/model.test.ts`
(lines 37-43) already contains an independent transcription of the
Oshakuade & Awe (2021) infinite-dilution limits, used as a standing
regression test (part of the 282 tests the whole suite runs). Mapping
Phase 2E-C3's `i=Au, j=Cu` labeling onto that test's `i`/`j` variables
term-for-term, and verifying numerically (not just by eye), both of
Phase 2E-C3's boxed equations reproduce the accepted test's formulas to
floating-point-exact precision (`diff = 0` in both cases, §4).

**This is a mathematics-only result.** It increases confidence that the
Phase 2E-C3 derivation was not fumbled algebraically. It does **not**
supply, corroborate, or otherwise touch any actual numeric Au-Cu value —
no `γ_Au^∞`/`γ_Cu^∞` data, no `Z_Au`/`Z_Cu`, no `V_m,Au`/`V_m,Cu` was
obtained or is needed for this specific check, and none is introduced
here. The Hang & Tao (2023) Table 3 candidate (`B_ij=1.163, B_ji=1.444`)
remains exactly as unverified as Phase 2E-C left it: orientation,
temperature, `Z`, and `V_m` are all still `UNAVAILABLE`. Production data
store for `thermodynamics.mivm.binary` / `Au-Cu` remains **empty**,
unchanged from Phase 2E-C / 2E-C2 / 2E-C3.

---

## 2. What Was Cross-Checked, and Against What

Phase 2E-C3 §3 derived, directly from the locked `lnGamma()` formula in
`model.ts` (confirmed identical to Hang & Tao (2023) Eq. 14 in Phase
2E-C §4.A), the `x_i -> 0` and `x_j -> 0` limits with `i=Au, j=Cu`:

```
ln γ_Au^∞ = 1 + ln( V_m,Au / (V_m,Cu · B_CuAu) )
              - (V_m,Au / V_m,Cu) · B_AuCu
              - (1/2) [ Z_Au ln(B_CuAu) + Z_Cu B_AuCu ln(B_AuCu) ]

ln γ_Cu^∞ = 1 + ln( V_m,Cu / (V_m,Au · B_AuCu) )
              - (V_m,Cu / V_m,Au) · B_CuAu
              - (1/2) [ Z_Cu ln(B_AuCu) + Z_Au B_CuAu ln(B_CuAu) ]
```

Independently, and prior to Phase 2E-C entirely, this repo's own
`model.test.ts` (part of the already-accepted Phase 2E-B test suite,
citing `docs/MIVM_MATHEMATICAL_AUDIT.md §3.5` and Oshakuade & Awe (2021)
Eqs. 6-8) contains its own standalone transcription:

```ts
// model.test.ts, lines 37-43
function lnGammaIInfiniteDilution(Bij, Bji, Zi, Zj, Vmi, Vmj) {
  return 1 - Math.log((Vmj * Bji) / Vmi) - (Vmi * Bij) / Vmj
           - 0.5 * (Zi * Math.log(Bji) + Zj * Bij * Math.log(Bij));
}

function lnGammaJInfiniteDilution(Bij, Bji, Zi, Zj, Vmi, Vmj) {
  return 1 - Math.log((Vmi * Bij) / Vmj) - (Vmj * Bji) / Vmi
           - 0.5 * (Zj * Math.log(Bij) + Zi * Bji * Math.log(Bji));
}
```

This is exactly the "existing accepted Oshakuade & Awe infinite-dilution
test" Phase 2E-C3 §3 and §14.3 named as the needed cross-check target —
located and read directly from source in this phase, not assumed.

---

## 3. Algebraic Mapping and Identity

Mapping Phase 2E-C3's Au/Cu-labeled quantities onto the test's generic
`i`/`j` quantities via `i=Au, j=Cu` (the same unverified-but-explicit
orientation assumption Phase 2E-C3 §3 itself used and flagged — this
cross-check does not resolve that ambiguity, it only checks the algebra
downstream of it):

```
B_ij := B_AuCu     B_ji := B_CuAu
Z_i  := Z_Au        Z_j  := Z_Cu
Vmi  := V_m,Au       Vmj  := V_m,Cu
```

**`lnGammaIInfiniteDilution` vs. `ln γ_Au^∞`:**

```
lnGammaIInfiniteDilution
  = 1 - ln((Vmj·Bji)/Vmi) - (Vmi·Bij)/Vmj - 0.5·(Zi·ln(Bji) + Zj·Bij·ln(Bij))
  = 1 + ln(Vmi/(Vmj·Bji)) - (Vmi/Vmj)·Bij - 0.5·(Zi·ln(Bji) + Zj·Bij·ln(Bij))
  = 1 + ln(V_m,Au/(V_m,Cu·B_CuAu)) - (V_m,Au/V_m,Cu)·B_AuCu
      - 0.5·(Z_Au·ln(B_CuAu) + Z_Cu·B_AuCu·ln(B_AuCu))
  = ln γ_Au^∞ (Phase 2E-C3 §3, term for term)
```

**`lnGammaJInfiniteDilution` vs. `ln γ_Cu^∞`:** by the same substitution,
using `-ln((Vmi·Bij)/Vmj) = +ln(Vmj/(Vmi·Bij))`, reduces term for term to
Phase 2E-C3's `ln γ_Cu^∞` boxed equation. (Full expansion omitted here
for brevity — it is the mirror image of the derivation above and was
checked the same way; see §4 for the numeric confirmation of both.)

**Result: the two formulas are algebraically identical**, not merely
similar. There is no sign flip, no swapped subscript, no missing factor
of 2, and no `B` vs. `1/B` inversion anywhere in either expression.

---

## 4. Numerical Verification

Algebra alone is not this project's evidentiary bar (Rule 8 — plausible
output is not verification of *correctness*, and hand algebra is
error-prone the same way a mis-transcription would be). Both formulas
were therefore evaluated directly, in Node, at the exact same input
values, independently of any test framework:

```
Bij=1.6, Bji=0.62, Zi=10, Zj=9, Vmi=1.02e-5, Vmj=0.85e-5

lnGammaIInfiniteDilution(...)              = -1.2534897681173431
Phase 2E-C3 ln(γ_Au^∞) formula, same inputs = -1.2534897681173431
diff = 0

lnGammaJInfiniteDilution(...)              = -0.8020972013888676
Phase 2E-C3 ln(γ_Cu^∞) formula, same inputs = -0.8020972013888676
diff = 0
```

Exact floating-point equality (`diff = 0`, not merely "close to within
tolerance") on both limits. These input values are the same
`FIXTURE` values `model.test.ts` itself uses, which that file's own
header comment (lines 12-16) explicitly labels: **"SYNTHETIC TEST
FIXTURE — NOT REAL LITERATURE DATA... not measured, fitted, or sourced
from any publication and must never be treated as real Au-Cu (or any
other alloy's) MIVM parameters."** This check therefore validates the
*equations*, using arbitrary well-behaved numbers chosen only to avoid
degeneracy — it does not validate, and was never intended to validate,
any actual Au-Cu numeric value.

For completeness, the already-accepted `model.test.ts` suite itself
(which independently performs the same comparison, via `computeMivmBinary()`
evaluated at `xi = 1e-9` / `xi = 1 - 1e-9` rather than the closed-form
limit directly) was re-run in this environment to confirm it still
passes:

```
$ npm test
 ✓ engine/models/thermodynamics/mivm/model.test.ts (30 tests) 46ms
 Test Files  22 passed (22)
      Tests  282 passed (282)

$ npm run typecheck
(clean, no output — both tsconfig.json and tsconfig.app.json pass)
```

This is a real, non-simulated run (network egress and `node_modules`
were both available in this environment, unlike the checkout Phases
2E-C/2E-C2/2E-C3 ran in) — 282/282, matching the count already cited as
accepted in the Phase 2E-B closeout. No test was added, removed, or
modified to reach this count; this is the pre-existing, unmodified
suite.

---

## 5. Interpretation

- **The equation-derivation chain from Phase 2E-B's locked model, through
  Phase 2E-C3's from-scratch infinite-dilution limits, is now
  cross-validated by two independent routes converging on the same
  result**: (a) this project's own pre-existing, Oshakuade-&-Awe-sourced
  regression test, and (b) Phase 2E-C3's fresh derivation directly from
  the locked `G_m^E/RT`/`ln γ_i` equations. Two independently-written
  formulas agreeing to floating-point precision is meaningfully stronger
  evidence than either one alone (the same triangulation logic
  `docs/MIVM_MATHEMATICAL_AUDIT.md §3.5` originally used to settle the
  Source-A-vs-Source-B convention question in Phase 2E-A/B).
- **This does not change the Au-Cu evidentiary picture at all.** It was
  always the *data* (γ∞, Z, V_m for the real Au-Cu system), not the
  *equations*, that Phase 2E-C3 stopped on (§4-§6 of that report). This
  phase closes out the one loose mathematical thread Phase 2E-C3 itself
  flagged (§3, §14.3) so that a future phase solving for `B_AuCu`/`B_CuAu`
  from real `γ_Au^∞`/`γ_Cu^∞` data can do so with justified confidence
  that the two equations it would be solving are the correct ones —
  without needing to re-derive or re-doubt them at that point.
- The `i=Au, j=Cu` orientation assumption is still exactly that — an
  assumption, carried through unchanged from Phase 2E-C §6 through Phase
  2E-C3 §3 into this cross-check. This phase checked that the algebra is
  *internally consistent* under that assumption; it did not, and could
  not, independently verify the assumption itself.

---

## 6. Production-Readiness Decision

**UNAVAILABLE — unchanged.** No numeric MIVM Au-Cu value is added to
`engine/data/parameterSets/`. `resolveMivmParameters()` continues to
correctly return `NOT_FOUND` for Au-Cu, confirmed by direct inspection of
`engine/models/thermodynamics/mivm/parameters.ts` this phase (its own
header comment already states no MIVM parameter set is registered
anywhere in the codebase — verified true by `ls engine/data/parameterSets/`,
which contains only `auCu.ts`, `index.ts`, `DATA_MANIFEST.md`, and
`auCu.test.ts`, no MIVM file). The Hang & Tao Table 3 candidate
(`B_ij=1.163, B_ji=1.444`) remains `PROVISIONAL`.

---

## 7. Recommendation for Next Phase

Per Phase 2E-C3 §14, and now with the equation cross-check closed out,
the highest-value next step is **Phase 2E-C4 — Primary Au-Cu
Thermodynamic Data Acquisition**, in the order Phase 2E-C3 itself
prioritized:

1. Obtain full text of Sundman, Fries & Oates (1998), *Calphad* 22(3),
   335-354 — already partially in this repo's provenance chain
   (`AU_CU_REGULAR_SOLUTION_SUNDMAN_1998` in `auCu.ts`, `status:
   "unavailable"`), and the most likely single source to contain or
   cite a primary `γ_Au^∞`/`γ_Cu^∞` number at a stated temperature.
2. Obtain full text of Edwards & Brodsky (1956), *J. Am. Chem. Soc.*
   78(13), 2983-2989 — the oldest primary measurement identified so far
   (effusion vapor-pressure activities, reportedly at 1550 K per
   secondary citation, not yet independently confirmed).
3. Only after (1)/(2) succeed: pursue `Z_Au`, `Z_Cu`, `V_m,Au`, `V_m,Cu`
   from Iida & Guthrie (1988) or Tao's own `Z_i` prediction formula
   (Phase 2E-C3 §5), since sourcing physical-property inputs is wasted
   effort without a usable `γ^∞` pair first.

This environment now has real network egress (§1) — unlike the checkout
Phase 2E-C3 ran in — so Phase 2E-C4's paywall-access attempts against
JACS/ScienceDirect may or may not fare differently here; that has not
been tested yet and is explicitly out of scope for this phase.

---

## Final Stop Condition

- **Files changed this phase:** one file created —
  `docs/MIVM_PHASE_2E-C3.1_INFINITE_DILUTION_CROSS_CHECK.md`. Three
  files from the prior (disconnected-checkout) phases were also imported
  verbatim into `docs/` as part of bringing this research chain into the
  actual repository, each with a short "Import note" prepended (no other
  edits to their content):
  - `docs/MIVM_PHASE_2E-C_AUCU_PARAMETER_AUDIT.md`
  - `docs/MIVM_PHASE_2E-C2_INDEPENDENT_RECONCILIATION.md`
  - `docs/MIVM_PHASE_2E-C3_AUCU_ACTIVITY_PARAMETER_AUDIT.md`
  No file under `app/`, `engine/models/`, `engine/data/parameterSets/`,
  or `index.html` was modified.
- **Test suite:** run for real — `npm install` (122 packages, 0
  vulnerabilities) then `npm test`: **282/282 tests pass, 22/22 test
  files pass.** No test was modified.
- **Typecheck:** `npm run typecheck` passes clean (both `tsconfig.json`
  and `tsconfig.app.json`).
- **Git status:** real git repo, branch
  `claude/aucu-mivm-parameter-audit-0g5k95`; working tree had only the
  four new/imported `docs/` files as untracked/modified changes at the
  time of this report — no other file touched.
- No commit or push was performed, per this research chain's own
  standing rule (commit/push only after explicit approval).
