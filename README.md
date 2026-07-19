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
- **One rule year:** FY2026 — a frozen, versioned corpus (v2026.2)
- **Real published limits:** official HUD FY2026 MTSP figures, effective **2026-05-01** (see [Data provenance](#data-provenance))
- **Synthetic docs only.** No real renter data.

---

## Run it

No build step, no dependencies to view.

```bash
open index.html            # macOS — just open the file
# or serve it (recommended; enables the optional encrypted-save feature)
npm start                  # -> http://localhost:5173
```

### Run the tests

```bash
npm test                   # 52 engine tests (pure logic) — zero dependencies
npm run test:ui            # 27 end-to-end UI-flow tests in jsdom (installs jsdom)
```

`npm test` covers variant-label extraction, the YTD reconciliation that calibrates
confidence, income de-duplication, the real MTSP numbers, the refusal/abstain logic, the
deepened rule corpus, checklist freshness, and packet generation. `npm run test:ui` drives
the real journey in a DOM: consent → extract → confirm → correct → math → Q&A → checklist
(incl. self-attest) → packet → the three safety tests.

---

## The three-stage journey

**01 · Profile — human-confirmed extraction**
Upload/paste a synthetic pay stub or benefit letter (samples included, incl. an *alt-format*
stub with different labels). RealDoor extracts **only allowlisted fields**, shows the
**exact source text (evidence box)** behind each value, and a **confidence score calibrated
by a real YTD cross-check** (`YTD ÷ current gross` must be a clean, date-plausible number of
pay periods) — not a constant. Low-confidence fields are flagged *needs review*. You
**confirm or correct** before reuse, and confirmed fields **remain editable** — corrections
flow downstream.

**02 · Understand — cited rules & deterministic math**
Enter and confirm household size. RealDoor annualizes income **deterministically in code**,
**de-duplicates** multiple stubs from one employer (keeping the most recent instead of
double-counting), then shows the **official published MTSP limit** for your household size
with its **source and effective date**. It **never labels you eligible** — the comparison is
always paired with a deflection to human review, and it **abstains** when an input is
missing. A rules Q&A over a **9-rule corpus** (income definition, set-aside, income
averaging, assets, full-time-student rule, 140% rule, freshness…) retrieves answers **with
citations** using token-overlap matching, **refuses** decision questions, and says *"I won't
guess"* when out of scope.

**03 · Prepare — renter-controlled packet**
The gold checklist flags each item **present / missing / expired** (a pay stub older than
120 days is flagged expired). Items you physically hold (ID, SSN card, application form,
asset statement) can be **marked present** so the packet can actually be completed. You
choose what to include, add a note, then **preview, download (.md/.json), and delete**.
**RealDoor never sends the packet anywhere.**

---

## Required Acceptance Demo — where each step lives

| # | Demo step | Where |
|---|-----------|-------|
| 1 | Upload a synthetic document, show extracted evidence | Profile → *Pay stub (current)* → **Extract fields** (evidence boxes + YTD-calibrated confidence) |
| 2 | Correct one field, show downstream values update | Profile → edit *Current gross pay* on the **confirmed** doc → Understand recomputes income & limit |
| 3 | Ask a rules question, show the authoritative citation | Understand → *"What is the income limit for my household?"* |
| 4 | Show the deterministic calculation and its effective date | Understand → income breakdown + limit table (`effective 2026-05-01`) |
| 5 | Identify a missing/expired item, then export the packet | Load *Pay stub (stale)* → Prepare shows **expired** → **Download packet** |
| 6 | Run the refusal, prompt-injection, and session-deletion tests | Trust & tests → the three buttons (each reports PASS live) |

## Non-negotiable controls — demonstrated live (not just claimed)

| Control | How RealDoor satisfies it |
|---------|---------------------------|
| **No decisioning** | Never approves/denies/scores/ranks. `compareIncome` cannot emit a verdict (a test asserts the object never contains `eligible`/`approved`). Decision questions are deflected. Verified by the Refusal test. |
| **No hidden proxies** | Only the published field allowlist is used (shown in-app under *"Data we use & why"*). A denylist of sensitive fields is published and never extracted or inferred. |
| **Consent & correction** | Extraction gated by consent; every field editable **before and after** confirmation; the audit log records consent, actions, and rule versions — **never raw document contents or derived financials** (a UI test asserts pay values, names, and computed income never appear in the log). |
| **Privacy & security** | In-browser, ephemeral by default (no server, no training on uploads). Export + one-click session deletion. Optional **AES-GCM encrypted** local snapshot (Web Crypto, PBKDF2 key). |
| **Untrusted input** | Document text is treated as data. Embedded instructions are **surfaced and ignored** — verified by the Injection test (real fields still extract; confidence stays set by the YTD cross-check, **not** forced to 100%). |
| **Accessibility (WCAG 2.2 AA)** | Semantic landmarks/headings, keyboard-complete, visible focus, labeled inputs with validated errors, `aria-live` status, status by **text + icon + color** (never color alone), reduced-motion, light/dark. |

## Judging-rubric mapping

| Criterion | Weight | Where to look |
|-----------|-------:|---------------|
| Profile accuracy | 25% | Evidence boxes, **YTD-reconciled** confidence, variant-label extraction, editable-after-confirm, *needs review* abstention |
| Rules and math | 25% | Cited 9-rule Q&A + deterministic, **de-duplicated** annualization + **official** MTSP limit with effective date |
| Safety and privacy | 20% | Trust & tests panel: refusal, injection, deletion; allowlist/denylist; audit log (no derived financials); encrypted save |
| Accessibility | 15% | Keyboard journey, focus, `aria-live`, validated errors, non-color status |
| End-to-end usefulness | 15% | Full Profile → Understand → Prepare flow → completable (self-attest), editable, renter-controlled packet |

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
  index.html            # the whole app (self-contained UI; loads engine.js + styles.css)
  engine.js             # pure logic + frozen data (no DOM) — unit-tested, node-runnable
  styles.css            # accessible styles (WCAG 2.2 AA, light/dark)
  data/                 # canonical copies of the frozen corpus (rules, checklist, Q&A)
  samples/              # synthetic pay stubs (incl. alt-format), benefit letter, injection doc
  test/engine.test.js   # 52 dependency-free logic tests
  test/ui.smoke.js      # 27 jsdom end-to-end flow tests
  ARCHITECTURE.md · RISK.md · LICENSE-MANIFEST.md
```

**RealDoor is a research prototype. It is assistive, not adjudicative.**
