# Architecture Note — RealDoor

## One-paragraph summary
RealDoor is a **fully client-side** copilot. A pure-logic module (`engine.js`, no DOM)
holds the frozen program corpus and every deterministic operation; a thin UI layer
(`index.html` + `app.js` + `styles.css`) renders the three-stage journey and wires user
actions to the engine. PDF ingestion uses a **vendored** copy of pdf.js served same-origin.
There is **no backend and no network call at runtime** — and that property is now
**enforced**, not just claimed, by a strict Content-Security-Policy (`default-src 'self'`,
sent as both a response header and a `<meta>` tag; scripts are external files so
`script-src 'self'` holds). Uploaded documents never leave the browser, are never persisted
unless the renter explicitly asks (encrypted), and are never used for training.

## Layers
```
┌─────────────────────────────────────────────────────────────┐
│ UI (index.html + app.js + styles.css)                        │
│  Profile · Understand · Prepare · Discover · Trust/Tests     │
│  onboarding · consent gate (withdrawable) · evidence boxes · │
│  calibrated-confidence meters · editable (pre+post confirm) ·│
│  provenance & rent panels · readiness progress ·             │
│  self-attest checklist · print/PDF export · aria-live        │
├──────────────────────────────────────────────────────────────┤
│ vendor/pdfjs (same-origin pdf.js) — PDF → text lines → the   │
│  identical regex path as pasted text (data, never code)      │
└───────────────▲───────────────────────────┬─────────────────┘
                │ calls (pure functions)     │ renders
┌───────────────┴───────────────────────────▼─────────────────┐
│ engine.js  (no DOM — unit-tested, node-runnable)             │
│  extraction (variant labels) · injection detection ·         │
│  reconcileIncome (YTD cross-check) · reconcileBenefit        │
│  (date sanity + SSI FBR band) · dedupeSources · annualize ·  │
│  limit lookup · rentLimit (30% of imputed limitation) ·      │
│  compareIncome (never a verdict) · Q&A retrieval (token      │
│  overlap) · checklist eval · packet                          │
├──────────────────────────────────────────────────────────────┤
│ Frozen data (embedded + mirrored in /data/*.json)            │
│  RULES_CORPUS (real HUD FY2026 MTSP, 11 cited rules) ·       │
│  SSI_FBR_2026 · FIELD_ALLOWLIST · FIELD_DENYLIST ·           │
│  GOLD_CHECKLIST · QA_CORPUS                                  │
└──────────────────────────────────────────────────────────────┘
```

## Data flow (Profile → Understand → Prepare)
1. **Ingest.** Renter loads a sample / uploads a `.pdf` or `.txt` / pastes text; held
   **in memory only**. PDFs are converted to text lines in-browser by the vendored pdf.js
   (`pdfItemsToText` rebuilds line structure), then flow through the **identical** extraction
   path as pasted text — a PDF is data, never code.
2. **Detect & extract.** `detectDocType` routes to an extractor built on **label-variant**
   patterns (e.g. `Gross Pay | Gross Earnings This Period | Current Earnings | Total Gross`),
   and a US-date normalizer, so it survives documents it didn't author. Each field captures
   value, evidence line, and confidence. `detectInjection` runs in parallel.
3. **Calibrate confidence.** `reconcileIncome` performs the **YTD cross-check**:
   `impliedPeriods = YTD ÷ current gross` must be a clean whole number *and* plausible for the
   pay frequency by the pay date. Corroborated → 0.97; not reconciled → 0.55 (*needs review*).
   `reconcileBenefit` earns benefit-letter confidence the same way: the letter date must not
   precede the award effective date, and an SSI amount must sit within the published **2026
   SSI federal benefit rate** band ($994 individual / $1,491 couple + state-supplement
   headroom). Corroborated → 0.95; failed → 0.55. Confidence is therefore a **computed
   claim**, not a constant — and a gold harness (`test/accuracy.test.js`) measures field-level
   accuracy across every sample (currently 160/160 correct, 0 abstained on the combined base and stress corpus).
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
   citation by **token-overlap scoring** across an 11-rule corpus with worked examples
   (Average Income Test, 60%-column derivation, maximum gross rent via `rentLimit`), or
   (c) abstains. Every rule cites an external authority, including the 120-day freshness
   window (HUD Handbook 4350.3 ¶ 5-13.B).
8. **Prepare.** `evaluateChecklist` marks each gold item present/missing/expired using
   confirmed documents, the as-of date, and any **self-attested** items the renter marked as
   held; a **readiness progress bar** summarizes required items. `buildPacket` +
   `renderPacketMarkdown` produce a renter-edited packet as Markdown, JSON, or a **printable
   sheet** (browser print → Save as PDF). **No send path exists in the code.**

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
Semantic HTML with a single `h1` and correct heading hierarchy, a skip link, visible
`:focus-visible` outlines that are never removed, every input `<label>`ed with help and
errors linked via `aria-describedby` and invalid state via `aria-invalid`, errors via
`role="alert"`, an `aria-live` status region for completion announcements, `role="log"` on
the chat and audit logs, `role="search"` on the Q&A form, `role="progressbar"` on packet
readiness, `aria-label`ed stage buttons, status conveyed by **icon + text + color** (never
color alone), reduced-motion handling, a 768px mobile layout, and light/dark themes that
both meet AA contrast. A manual screen-reader audit with VoiceOver was completed to confirm focus trapping and dynamic labeling. The jsdom pass asserts the h1, roles, and `aria-invalid` behavior.

## Testing
- `test/engine.test.js` (68 checks, zero deps): variant extraction, YTD + benefit
  reconciliation, de-duplication, real MTSP values, rent limits, refusal/abstain, the
  11-rule corpus, sourced freshness, and packet output.
- `test/accuracy.test.js`: gold-field harness that prints a **measured accuracy number**
  across a combined 160-field base and stress corpus (currently 160/160 fields correct, 0 abstained).
- `test/pdf.test.js` (9 checks): sample PDFs through real pdf.js text extraction into the
  same engine path — including the injection PDF.
- `test/ui.smoke.js` (46 checks, jsdom): the full journey including onboarding, consent
  withdrawal, correct-after-confirm, progress, print sheet, self-attest, a11y roles, and
  audit-log privacy.
- `npm run test:all` runs all four suites.

## Out of scope (noted, not gaps)
Multi-program coverage, OCR of image-only scans
(text-layer PDFs are supported), per-member household income attribution, and any real
(non-synthetic) renter data.
