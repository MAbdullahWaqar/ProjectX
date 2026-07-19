# MTSP Transcription Evidence

**Region:** Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area
**Program Year:** 2026
**Effective Date:** 2026-05-01
**4-Person Area Median Income (AMI):** $164,600

## Verification Table

This table verifies the 50% and 60% HUD Multifamily Tax Subsidy Projects (MTSP) Income Limits hardcoded in `engine.js`.

Per HUD methodology, the 60% income limit is derived by multiplying the 50% Very Low-Income Limit (VLIL) by 1.2 and rounding to the nearest $10. 

| Household Size | 50% Limit (Base) | 60% Derivation (50% × 1.2) | 60% Limit (Rounded) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1 Person** | $60,000 | 60,000 × 1.2 = 72,000 | **$72,000** | ✅ Verified |
| **2 Persons** | $68,600 | 68,600 × 1.2 = 82,320 | **$82,320** | ✅ Verified |
| **3 Persons** | $77,150 | 77,150 × 1.2 = 92,580 | **$92,580** | ✅ Verified |
| **4 Persons** | $85,700 | 85,700 × 1.2 = 102,840 | **$102,840** | ✅ Verified |
| **5 Persons** | $92,600 | 92,600 × 1.2 = 111,120 | **$111,120** | ✅ Verified |
| **6 Persons** | $99,450 | 99,450 × 1.2 = 119,340 | **$119,340** | ✅ Verified |
| **7 Persons** | $106,300 | 106,300 × 1.2 = 127,560 | **$127,560** | ✅ Verified |
| **8 Persons** | $113,150 | 113,150 × 1.2 = 135,780 | **$135,780** | ✅ Verified |

## Notes on Derivation

1. **Source:** These limits map identically to the `byPercent['50']` and `byPercent['60']` arrays in `RULES_CORPUS` in `engine.js`.
2. **Methodology Check:** `106,300 * 1.2 = 127,560`, exactly matching the 7-person 60% limit.
3. **Rounding:** HUD rounds MTSP derivations to the nearest $10. In this dataset, all $1.2x$ derivations fell naturally on a multiple of 10, so no rounding adjustments were necessary.

This document serves as human-readable, auditable evidence for the limits programmed into the RealDoor application-readiness copilot, preventing "black box" math.
