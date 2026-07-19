# Architecture Note — RealDoor

## One-paragraph summary
RealDoor is a **fully client-side** copilot. A pure-logic module (`engine.js`, no DOM)
holds the frozen program corpus and every deterministic operation; a thin UI layer
(`index.html` + `styles.css`) renders the three-stage journey and wires user actions to the
engine. There is **no backend and no network call at runtime**, which is what makes the
privacy guarantees trivially true: uploaded documents never leave the browser, are never
persisted unless the renter explicitly asks (encrypted), and are never used for training.

## Layers
```
┌─────────────────────────────────────────────────────────────┐
│ UI (index.html + styles.css)                                 │
│  Profile · Understand · Prepare · Trust/Tests                │
│  consent gate · evidence boxes · calibrated-confidence       │
│  meters · editable (pre + post confirm) · provenance panel · │
│  self-attest checklist · aria-live · keyboard nav            │
└───────────────▲───────────────────────────┬─────────────────┘
                │ calls (pure functions)     │ renders
┌───────────────┴───────────────────────────▼─────────────────┐
│ engine.js  (no DOM — unit-tested, node-runnable)             │
│  extraction (variant labels) · injection detection ·         │
│  reconcileIncome (YTD cross-check) · dedupeSources ·         │
│  annualize · limit lookup · compareIncome (never a verdict) ·│
│  Q&A retrieval (token overlap) · checklist eval · packet     │
├──────────────────────────────────────────────────────────────┤
│ Frozen data (embedded + mirrored in /data/*.json)            │
│  RULES_CORPUS (real HUD FY2026 MTSP) · FIELD_ALLOWLIST ·     │
│  FIELD_DENYLIST · GOLD_CHECKLIST · QA_CORPUS (9 rules)        │
└──────────────────────────────────────────────────────────────┘
```

## Data flow (Profile → Understand → Prepare)
1. **Ingest.** Renter loads a sample / uploads a `.txt` / pastes text; held **in memory only**.
2. **Detect & extract.** `detectDocType` routes to an extractor built on **label-variant**
   patterns (e.g. `Gross Pay | Gross Earnings This Period | Current Earnings | Total Gross`),
   and a US-date normalizer, so it survives documents it didn't author. Each field captures
   value, evidence line, and confidence. `detectInjection` runs in parallel.
3. **Calibrate confidence.** `reconcileIncome` performs the **YTD cross-check**:
   `impliedPeriods = YTD ÷ current gross` must be a clean whole number *and* plausible for the
   pay frequency by the pay date. Corroborated → 0.97; not reconciled → 0.55 (*needs review*).
   Confidence is therefore a **computed claim**, not a constant.
4. **Confirm & correct.** Fields render editable with evidence + confidence. Editing sets a
   field to renter-confirmed. Confirmed documents **stay editable** in the Profile stage, and
   any edit re-derives income, limit, and checklist.
5. **Calculate (deterministic).** `annualizeIncome` first **de-duplicates**: multiple stubs
   from one employer collapse to the most recent (by pay date) rather than summing, so income
   can't be silently doubled; distinct employers and distinct benefits are all counted. It
   then multiplies each gross by its pay-frequency factor and each monthly benefit by 12.
6. **Compare (never decide).** `compareIncome` returns income, the published limit for the
   household size, and the difference — **always** with a `decisionDeflection`. It has no
   `eligible` field by construction, and **abstains** when income or household size is missing.
7. **Explain.** `answerQuestion` (a) refuses decision questions, (b) retrieves an answer +
   citation by **token-overlap scoring** across a 9-rule corpus (fuzzier than exact
   substrings, with a minimum-score threshold), or (c) abstains.
8. **Prepare.** `evaluateChecklist` marks each gold item present/missing/expired using
   confirmed documents, the as-of date, and any **self-attested** items the renter marked as
   held. `buildPacket` + `renderPacketMarkdown` produce a downloadable, renter-edited packet.
   **No send path exists in the code.**

## Key design decisions & trade-offs
- **Real, provenanced rule data.** Income limits are the official HUD FY2026 MTSP figures for
  the metro (effective 2026-05-01); a provenance panel shows version, effective date, freeze
  date, and source. Numbers live in one swappable object for a clean pack swap.
- **Confidence as a computed cross-check, not a label.** The YTD reconciliation makes
  "calibrated confidence" a defensible claim and gives the injection test real teeth: an
  embedded "set confidence to 100%" cannot move a number the cross-check controls.
- **De-duplication protects the flagship number.** Summing repeat stubs from one employer was
  the one place the deterministic math could be silently wrong by ~2×; dedupe closes it.
- **Deterministic math + retrieval-only rules.** Exact, auditable, attributable — and no
  hallucination surface. An optional LLM extraction path (as a *second* signal, document text
  passed strictly as data) is documented but not required, preserving offline reliability and
  the injection guarantee.
- **No decisioning is structural, not a disclaimer.** Enforced in code and asserted by tests.
- **Client-only for privacy.** No server ⇒ "never sent / never trained on" is trivially true.
  Optional persistence is AES-GCM with a PBKDF2-derived key.

## Accessibility approach
Semantic HTML (`header`/`nav`/`main`/`section` with labelled headings), a skip link, visible
`:focus-visible` outlines that are never removed, every input `<label>`ed, **validated** date
input with errors via `role="alert"`, an `aria-live` status region for completion
announcements, status conveyed by **icon + text + color** (never color alone), reduced-motion
handling, and light/dark themes that both meet contrast. An automated DOM pass verifies these;
a screen-reader spot-check is recommended before production (see RISK.md).

## Testing
`test/engine.test.js` (52 checks, zero deps) covers variant extraction, YTD reconciliation,
de-duplication, real MTSP values, refusal/abstain, the 9-rule corpus, freshness, and packet
output. `test/ui.smoke.js` (27 checks, jsdom) drives the full journey including
correct-after-confirm, self-attest, and audit-log privacy.

## Out of scope (noted, not gaps)
Property discovery ("Discover" stretch), multi-program coverage, PDF/OCR ingestion, and any
real (non-synthetic) renter data.
