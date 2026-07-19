# Data, Model & Code License Manifest — RealDoor

A current manifest of every data source, model, and code dependency, with its license and
how it is used. Required by the challenge ("A current data, model, and code license manifest").

## Code
| Component | Source | License | Use |
|-----------|--------|---------|-----|
| RealDoor app (`index.html`, `engine.js`, `styles.css`, tests) | This repository (original work) | MIT | The application. |
| `jsdom` | npm (dev dependency only) | MIT | Runs the UI smoke tests headlessly. Not shipped in the app. |

There are **no runtime code dependencies** — the app is plain HTML/CSS/JS and loads nothing
from a network at runtime.

## Models
| Model | Provider | Use |
|-------|----------|-----|
| **None.** | — | RealDoor uses **no ML model at runtime**. Extraction is deterministic regex, math is plain arithmetic, and rules answers are retrieval from a frozen corpus. This is a deliberate choice: it removes hallucination and prompt-injection execution risk and makes every output auditable. |

> If a team later swaps the deterministic extractor for an LLM (e.g. for messier real PDFs),
> add the model, its provider, version, and terms here, and route document text as **data
> only** (never as instructions) to preserve the injection guarantee.

## Data
| Dataset / corpus | Source | License / terms | Use & limits |
|------------------|--------|-----------------|--------------|
| **HUD FY2026 MTSP Income Limits** — Boston-Cambridge-Quincy, MA-NH HMFA | huduser.gov/portal/datasets/mtsp.html; figures transcribed from the [MassHousing 2026 HUD Income & Rent Limits table](https://www.masshousing.com/-/media/Files/Developers/Income-Rent-Limits/2026/2026-HUD-Income-Rent-Limits.pdf) | U.S. Government public data (no copyright); MassHousing table is a public compliance resource | The official 30/50/60/80% AMI income-limit thresholds for LIHTC, effective 2026-05-01. If your event ships its own frozen MTSP pack, swap `RULES_CORPUS.incomeLimits.byPercent`. |
| **IRC § 42** (set-aside, income averaging, student rule, 140% rule) | law.cornell.edu/uscode/text/26/42 | U.S. statute (public) | Cited text for the LIHTC program rules in the corpus. |
| **HUD Handbook 4350.3, Ch. 5** | hud.gov | U.S. Government public document | Cited definition of "annual income" and asset-income treatment. |
| **Synthetic documents** (`/samples`) | Authored for this project | CC0 / public domain (original synthetic) | Pay stubs (incl. an alt-format stub and an injection-test doc) and a benefit letter. **No real personal data.** Names/employers are fictional. |
| **Gold checklist & Q&A corpus** (`/data`) | Authored for this project | MIT | The frozen application-document checklist, freshness windows, and rules Q&A intents. |

## Data-handling commitments
- Only **synthetic** documents are used; no real renter data is processed.
- Uploaded/pasted text is processed **in the browser only**, is **never sent to a server**,
  and is **never used to train** anything.
- Public datasets are used **only** to state published rules — **never** to profile
  applicants or infer protected traits.
