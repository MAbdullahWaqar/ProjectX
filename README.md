# RealDoor — Application-Readiness Copilot

**Hack-Nation 6th Global AI Hackathon · Challenge 03 (RealPage)**

A renter-side copilot that turns synthetic household documents into a human-confirmed
profile, explains one affordable-housing program's rules **with citations**, flags
missing or expired documents, and produces a **renter-controlled application-readiness
packet — without ever deciding eligibility.**

> **Design principle:** The AI extracts, explains, retrieves, calculates, and prepares.
> **The renter confirms. A qualified human decides.**

- **One metro:** Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area
- **One program:** Low-Income Housing Tax Credit (LIHTC), using HUD MTSP income limits
- **One rule year:** FY2026 — a frozen, versioned corpus (v2026.3)
- **Real published limits:** official HUD FY2026 MTSP figures, effective **2026-05-01** (see [Data provenance](#data-provenance))
- **Synthetic docs only.** No real renter data.

---

## Run it

No build step. pdf.js and the Inter font are **vendored** into the repo (`vendor/`), so the
app runs entirely same-origin — a strict CSP blocks any external request.

```bash
npm start                  # -> http://localhost:5173 (serves with CSP + security headers)
# or: open index.html      # macOS — works too; serving is recommended
```

### Run the tests

```bash
npm test                   # 68 engine tests (pure logic) — zero dependencies
npm run test:accuracy      # gold-field harness -> prints "160/160 fields correct, 0 abstained"
npm run test:pdf           # 9 tests: sample PDFs through real pdf.js into the same engine path
npm run test:ui            # 46 end-to-end UI-flow tests in jsdom
npm run test:all           # all four suites
```

`npm test` covers variant-label extraction, the YTD and benefit-letter reconciliations that
calibrate confidence, income de-duplication, the real MTSP numbers, rent limits, the
refusal/abstain logic, the 11-rule corpus, checklist freshness, and packet generation.
`npm run test:accuracy` measures field-level extraction accuracy against gold values across a combined 160-field base and stress corpus. `npm run test:ui` drives the real journey in a DOM: onboarding → consent
(incl. withdrawal) → extract → confirm → correct → math → Q&A → checklist (incl.
self-attest + progress) → packet (incl. print sheet) → the three safety tests.

---

## The four-stage journey

**01 · Profile — human-confirmed extraction**
Upload a synthetic pay stub or benefit letter — **PDF or text** (samples included in both
formats, incl. an *alt-format* stub with different labels; PDFs are read in-browser by
vendored pdf.js and flow through the identical extraction path as pasted text). RealDoor
extracts **only allowlisted fields**, shows the **exact source text (evidence box)** behind
each value, and a **confidence score calibrated by independent cross-checks**: pay stubs by
the YTD reconciliation (`YTD ÷ current gross` must be a clean, date-plausible number of pay
periods), benefit letters by date-order sanity plus the published **2026 SSI federal benefit
rate** plausibility band — never a constant. An in-app legend explains what each confidence
level means. Low-confidence fields are flagged *needs review*. You **confirm or correct**
before reuse, and confirmed fields **remain editable** — corrections flow downstream.
Consent is **withdrawable** at any time, with one-click deletion of confirmed documents.

**02 · Understand — cited rules & deterministic math**
Enter and confirm household size. RealDoor annualizes income **deterministically in code**,
**de-duplicates** multiple stubs from one employer (keeping the most recent instead of
double-counting), then shows the **official published MTSP limit** for your household size
with its **source and effective date**. It **never labels you eligible** — the comparison is
always paired with a deflection to human review, and it **abstains** when an input is
missing. A published **maximum-gross-rent table** (30% of the imputed income limitation,
1.5 persons per bedroom) is computed deterministically from the same frozen limits. A rules
Q&A over an **11-rule corpus** (income definition, set-aside, income averaging with a worked
example, the 60%-column derivation, rent limits, assets, full-time-student rule, 140% rule,
freshness sourced to HUD Handbook 4350.3 ¶ 5-13.B…) retrieves answers **with citations**
using token-overlap matching, **refuses** decision questions, and says *"I won't guess"*
when out of scope.

**03 · Prepare — renter-controlled packet**
A **readiness progress bar** shows how many required items are ready and which need
attention. The gold checklist flags each item **present / missing / expired** (a pay stub
older than 120 days is flagged expired, per HUD Handbook 4350.3 ¶ 5-13.B). Items you
physically hold (ID, SSN card, application form, asset statement) can be **marked present**
so the packet can actually be completed. You choose what to include, add a note, then
**preview, print (→ Save as PDF), download (.md/.json), and delete**.
**04 · Discover — regional housing directory**
A directory of participating LIHTC properties in the Boston-Cambridge-Quincy area. **Note: This list is purely informational.** RealDoor does not filter, rank, or score these properties based on your profile, nor can it predict availability or eligibility. Contact properties directly for current waitlists.

---

## Required Acceptance Demo — where each step lives

| # | Demo step | Where |
|---|-----------|-------|
| 1 | Upload a synthetic document, show extracted evidence | Profile → upload `samples/paystub_fresh.pdf` (or click *Pay stub (current)*) → **Extract fields** (evidence boxes + cross-check-calibrated confidence) |
| 2 | Correct one field, show downstream values update | Profile → edit *Current gross pay* on the **confirmed** doc → Understand recomputes income & limit |
| 3 | Ask a rules question, show the authoritative citation | Understand → *"What is the income limit for my household?"* |
| 4 | Show the deterministic calculation and its effective date | Understand → income breakdown + limit table (`effective 2026-05-01`) |
| 5 | Identify a missing/expired item, then export the packet | Load *Pay stub (stale)* → Prepare shows **expired** + progress bar → **Print / Save as PDF** or **Download packet** |
| 6 | Run the refusal, prompt-injection, and session-deletion tests | Trust & tests → the three buttons (each reports PASS live) |

## Non-negotiable controls — demonstrated live (not just claimed)

| Control | How RealDoor satisfies it |
|---------|---------------------------|
| **No decisioning** | Never approves/denies/scores/ranks. `compareIncome` cannot emit a verdict (a test asserts the object never contains `eligible`/`approved`). Decision questions are deflected. Verified by the Refusal test. |
| **No hidden proxies** | Only the published field allowlist is used (shown in-app under *"Data we use & why"*). A denylist of sensitive fields is published and never extracted or inferred. |
| **Consent & correction** | Extraction gated by consent; every field editable **before and after** confirmation; the audit log records consent, actions, and rule versions — **never raw document contents or derived financials** (a UI test asserts pay values, names, and computed income never appear in the log). |
| **Consent & correction** (withdrawal) | Consent is **withdrawable**: unchecking it blocks new extraction and offers one-click deletion of already-confirmed documents (tested). |
| **Privacy & security** | In-browser, ephemeral by default (no server, no training on uploads). A strict **CSP** (`default-src 'self'`, header + meta) blocks all external requests; scripts are external files (`script-src 'self'`); the dev server adds `nosniff`, referrer, and frame-ancestors protections and blocks path traversal. Export + one-click session deletion. Optional **AES-GCM encrypted** local snapshot (Web Crypto, PBKDF2 key, `type="password"` input). |
| **Untrusted input** | Document text — including PDF text — is treated as data. Embedded instructions are **surfaced and ignored** — verified by the Injection test and a PDF-injection test (real fields still extract; confidence stays set by the YTD cross-check, **not** forced to 100%). |
| **Accessibility (WCAG 2.2 AA)** | Single `h1` + semantic landmarks/headings, keyboard-complete, visible focus, labeled inputs with `aria-describedby`-linked help/errors and `aria-invalid`, `role="log"`/`role="search"`/`role="progressbar"` where they belong, `aria-live` status, status by **text + icon + color** (never color alone), reduced-motion, mobile layout, light/dark with AA contrast. **A manual screen-reader audit with VoiceOver was completed.** |

## Judging-rubric mapping

| Criterion | Weight | Where to look |
|-----------|-------:|---------------|
| Profile accuracy | 25% | **Measured: 160/160 gold fields correct** (`npm run test:accuracy`) on combined base and stress corpus; PDF + text ingestion; evidence boxes; **YTD- and benefit-reconciled** confidence with an in-app legend; variant-label extraction; editable-after-confirm; *needs review* abstention |
| Rules and math | 25% | Cited 11-rule Q&A with worked examples + deterministic, **de-duplicated** annualization + **official** MTSP limit and **rent-limit table** with effective dates; freshness window sourced to HUD 4350.3 ¶ 5-13.B |
| Safety and privacy | 20% | Trust & tests panel: refusal, injection (text + PDF), deletion; consent withdrawal; strict CSP; allowlist/denylist; audit log (no derived financials); encrypted save |
| Accessibility | 15% | Single h1, keyboard journey, focus, `aria-live`, `aria-describedby`/`aria-invalid` errors, log/search/progressbar roles, non-color status, mobile layout |
| End-to-end usefulness | 15% | Onboarding → full Profile → Understand → Prepare flow → progress bar → completable (self-attest), editable, renter-controlled packet incl. **Print / Save as PDF** |

## Data provenance

Income limits are the **official HUD FY2026 MTSP Income Limits** for the
Boston-Cambridge-Quincy, MA-NH HMFA, effective **2026-05-01**, transcribed from the
[MassHousing 2026 HUD Income & Rent Limits table](https://www.masshousing.com/-/media/Files/Developers/Income-Rent-Limits/2026/2026-HUD-Income-Rent-Limits.pdf)
(underlying dataset: [HUD MTSP](https://www.huduser.gov/portal/datasets/mtsp.html)). The
in-app **Data provenance** panel (Understand stage) shows the loaded corpus version, effective
date, freeze date, area median income ($164,600), and source. The 60% column equals 120% of
the 50% column rounded to the nearest $10, per the HUD MTSP method.

> If your event ships its own frozen 2026 MTSP pack, replace the single object
> `RULES_CORPUS.incomeLimits.byPercent` in `engine.js` (mirrored in `data/rules-corpus.json`)
> — everything else (program, year, citations, effective date, formulas) is already wired.

## Project structure

```
RealDoor/
  index.html            # UI shell (strict CSP; loads engine.js + app.js + styles.css)
  app.js                # UI layer (render + events; onboarding, progress, print, PDF upload)
  engine.js             # pure logic + frozen data (no DOM) — unit-tested, node-runnable
  styles.css            # accessible styles (WCAG 2.2 AA, light/dark, mobile, print)
  vendor/               # same-origin pdf.js (Apache-2.0) + Inter font (OFL) — no CDN
  data/                 # canonical copies of the frozen corpus (rules, checklist, Q&A)
  samples/              # synthetic docs as .txt AND .pdf (incl. alt-format + injection)
  scripts/serve.js      # dev server with CSP/security headers + traversal guard
  scripts/make-sample-pdfs.js  # regenerates the sample PDFs from the .txt sources
  test/engine.test.js   # 68 dependency-free logic tests
  test/accuracy.test.js # gold-field harness -> "160/160 fields correct, 0 abstained"
  test/pdf.test.js      # 9 tests: PDFs through real pdf.js into the engine
  test/ui.smoke.js      # 46 jsdom end-to-end flow tests
  ARCHITECTURE.md · RISK.md · LICENSE-MANIFEST.md
```

**RealDoor is a research prototype. It is assistive, not adjudicative.**
