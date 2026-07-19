/*
 * RealDoor — Application-Readiness Copilot
 * engine.js — pure logic + frozen program data.
 *
 * DESIGN PRINCIPLE:
 *   The AI extracts, explains, retrieves, calculates, and prepares.
 *   The renter confirms. A qualified human decides.
 *
 * No DOM code — unit-testable under Node, reused by the browser UI.
 * It never approves, denies, scores, ranks, or determines eligibility.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.RealDoorEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // FROZEN PROGRAM DATA (one metro, one program, one rule year)
  // ---------------------------------------------------------------------------
  // Income limits are the OFFICIAL FY2026 HUD MTSP limits for the
  // Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area, transcribed from the
  // MassHousing 2026 HUD Income & Rent Limits table (effective 2026-05-01).
  // Values by household size, index 0 = 1 person ... index 7 = 8 persons.
  const RULES_CORPUS = {
    version: '2026.3',
    frozenOn: '2026-07-19',
    program: 'Low-Income Housing Tax Credit (LIHTC)',
    ruleYear: 2026,
    metro: 'Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area',
    areaMedianIncome: 164600,
    incomeLimits: {
      source: 'HUD FY2026 Multifamily Tax Subsidy Projects (MTSP) Income Limits — Boston-Cambridge-Quincy, MA-NH HMFA (via MassHousing 2026 HUD Income & Rent Limits)',
      sourceUrl: 'https://www.huduser.gov/portal/datasets/mtsp.html',
      publisherUrl: 'https://www.masshousing.com/-/media/Files/Developers/Income-Rent-Limits/2026/2026-HUD-Income-Rent-Limits.pdf',
      effectiveDate: '2026-05-01',
      provenance: 'Official published figures. 60% column = 120% of the 50% column, rounded to the nearest $10 (HUD MTSP method).',
      byPercent: {
        '30': [36000, 41150, 46300, 51400, 55550, 59650, 63750, 67850],
        '50': [60000, 68600, 77150, 85700, 92600, 99450, 106300, 113150],
        '60': [72000, 82320, 92580, 102840, 111120, 119340, 127560, 135780],
        '80': [96000, 109700, 123400, 137100, 148100, 159050, 170050, 181000]
      }
    },
    rules: [
      {
        id: 'PROGRAM', title: 'Program & rule year',
        text: 'This copilot covers the Low-Income Housing Tax Credit (LIHTC) program for the Boston-Cambridge-Quincy, MA-NH HMFA, using the frozen FY2026 rule corpus. LIHTC unit eligibility uses HUD MTSP income limits, effective 2026-05-01.',
        source: 'HUD FY2026 MTSP Income Limits', sourceUrl: 'https://www.huduser.gov/portal/datasets/mtsp.html', effectiveDate: '2026-05-01'
      },
      {
        id: 'MTSP-LIMIT', title: 'Household income limit',
        text: 'A household’s anticipated annual gross income is compared against the MTSP income limit for the household size at the applicable set-aside (commonly 50% or 60% of Area Median Income). The limit varies by household size and metro. For 2026 the Boston-Cambridge-Quincy area median income (4-person) is $164,600.',
        source: 'HUD FY2026 MTSP Income Limits', sourceUrl: 'https://www.huduser.gov/portal/datasets/mtsp.html', effectiveDate: '2026-05-01'
      },
      {
        id: 'MIN-SET-ASIDE', title: 'Minimum set-aside',
        text: 'A LIHTC project must meet a minimum set-aside: 20% of units at or below 50% AMI (20/50), 40% at or below 60% AMI (40/60), or the Average Income Test. The set-aside a project elected determines which limit column applies to a unit.',
        source: 'Internal Revenue Code § 42(g)(1)', sourceUrl: 'https://www.law.cornell.edu/uscode/text/26/42', effectiveDate: '2018-03-23'
      },
      {
        id: 'INCOME-AVERAGING', title: 'Average Income Test',
        text: 'Under the Average Income Test, units may be designated at 20/30/40/50/60/70/80% AMI so long as the average of the designated limits does not exceed 60% AMI. Worked example: a project designates three units at 40%, 60% and 80% AMI — the average is (40 + 60 + 80) ÷ 3 = 60%, so the election is valid. Designating them at 50%, 70% and 80% would average 66.7% and would NOT be valid. This is why the 30%, 50%, 60% and 80% columns all matter.',
        source: 'Internal Revenue Code § 42(g)(1)(C)', sourceUrl: 'https://www.law.cornell.edu/uscode/text/26/42', effectiveDate: '2018-03-23'
      },
      {
        id: 'LIMIT-DERIVATION', title: 'How the 60% limit column is derived',
        text: 'HUD publishes the 50% AMI (Very Low Income) limits directly; the 60% MTSP column is 120% of the 50% column, rounded to the nearest $10. Worked example for a household of 3 in this metro: $77,150 × 1.20 = $92,580 — exactly the published 60% figure. The 30% and 80% columns are published directly by HUD.',
        source: 'HUD FY2026 MTSP Income Limits — methodology', sourceUrl: 'https://www.huduser.gov/portal/datasets/mtsp.html', effectiveDate: '2026-05-01'
      },
      {
        id: 'RENT-LIMIT', title: 'Maximum gross rent',
        text: 'LIHTC maximum gross rent for a unit is 30% of the imputed income limitation, paid monthly. Occupancy is imputed from bedrooms — 1 person for a studio, 1.5 persons per bedroom otherwise (a half person uses the average of the two adjacent household-size limits). Worked example, 2-bedroom at 60% AMI in this metro: imputed household = 3 persons, limit $92,580; maximum gross rent = $92,580 × 30% ÷ 12 = $2,314/month (gross rent includes a utility allowance where tenants pay utilities).',
        source: 'Internal Revenue Code § 42(g)(2)', sourceUrl: 'https://www.law.cornell.edu/uscode/text/26/42', effectiveDate: '1986-10-22'
      },
      {
        id: 'INCOME-DEF', title: 'What counts as annual income',
        text: 'Annual income is the anticipated total gross income from all household members, including wages, salaries, and the gross amount of periodic payments such as Social Security and SSI benefits, before payroll deductions.',
        source: 'HUD Handbook 4350.3, Chapter 5 (Determining Income)', sourceUrl: 'https://www.hud.gov/program_offices/administration/hudclips/handbooks/hsgh/4350.3', effectiveDate: '2013-06-01'
      },
      {
        id: 'ASSET-INCOME', title: 'Income from assets',
        text: 'When net family assets exceed $5,000, annual income includes the greater of the actual income from those assets or an imputed income calculated using the HUD passbook savings rate. Assets below $5,000 use actual asset income only.',
        source: 'HUD Handbook 4350.3, Chapter 5 (Assets)', sourceUrl: 'https://www.hud.gov/program_offices/administration/hudclips/handbooks/hsgh/4350.3', effectiveDate: '2013-06-01'
      },
      {
        id: 'STUDENT-RULE', title: 'Full-time student household rule',
        text: 'A unit occupied entirely by full-time students is generally not LIHTC-eligible unless an exception applies (e.g., married filing jointly; single parent with dependents; former foster youth; receiving certain assistance; or in a job-training program). Mixed households with at least one non-full-time-student are not restricted by this rule.',
        source: 'Internal Revenue Code § 42(i)(3)(D)', sourceUrl: 'https://www.law.cornell.edu/uscode/text/26/42', effectiveDate: '1986-10-22'
      },
      {
        id: 'NEXT-AVAILABLE-UNIT', title: 'The 140% Next Available Unit rule',
        text: 'If a current tenant’s income later rises above 140% of the applicable income limit, the unit can remain a qualified low-income unit, but the next available comparable-or-smaller unit in the building must be rented to a qualifying household. This is a continuing-compliance rule, not an intake test.',
        source: 'Internal Revenue Code § 42(g)(2)(D)(ii)', sourceUrl: 'https://www.law.cornell.edu/uscode/text/26/42', effectiveDate: '1989-12-19'
      },
      {
        id: 'PAYSTUB-FRESHNESS', title: 'How recent income documents must be',
        text: 'Verification documents such as pay stubs are valid for 120 days from the date of receipt: RealDoor treats an income document as current when dated within 120 days of the application date, and flags older ones as stale so they can be refreshed. Individual owners or management companies may apply a stricter window; check with the property.',
        source: 'HUD Handbook 4350.3 REV-1, Paragraph 5-13.B (Verification: effective term)', sourceUrl: 'https://www.hud.gov/program_offices/administration/hudclips/handbooks/hsgh/4350.3', effectiveDate: '2013-06-01'
      }
    ]
  };

  const FIELD_ALLOWLIST = {
    paystub: [
      { key: 'employer_name', label: 'Employer name', purpose: 'Label the income source and de-duplicate multiple stubs from one employer.' },
      { key: 'employee_name', label: 'Employee name', purpose: 'Confirm the document belongs to the renter.' },
      { key: 'pay_frequency', label: 'Pay frequency', purpose: 'Annualize gross pay deterministically.' },
      { key: 'pay_date', label: 'Pay date', purpose: 'Check document freshness and reconcile the YTD cross-check.' },
      { key: 'gross_pay_current', label: 'Current gross pay', purpose: 'Compute anticipated annual wage income.' },
      { key: 'gross_pay_ytd', label: 'Year-to-date gross pay', purpose: 'Cross-check the annualized figure and calibrate confidence.' }
    ],
    benefit: [
      { key: 'recipient_name', label: 'Recipient name', purpose: 'Confirm the document belongs to the renter.' },
      { key: 'benefit_type', label: 'Benefit type', purpose: 'Label the income source and de-duplicate benefit letters.' },
      { key: 'monthly_benefit_amount', label: 'Monthly benefit amount', purpose: 'Compute anticipated annual benefit income.' },
      { key: 'award_effective_date', label: 'Award effective date', purpose: 'Record when the benefit began.' },
      { key: 'letter_date', label: 'Letter date', purpose: 'Check the document freshness window.' }
    ]
  };
  const FIELD_DENYLIST = [
    'social_security_number', 'date_of_birth', 'race', 'ethnicity', 'national_origin',
    'sex', 'religion', 'disability_detail', 'familial_status', 'immigration_status',
    'street_address', 'bank_account_number'
  ];

  const GOLD_CHECKLIST = [
    { id: 'application_form', label: 'Completed program application form', category: 'Application', required: true, freshnessDays: null, satisfiedBy: ['application_form'], selfAttestable: true },
    { id: 'photo_id', label: 'Government-issued photo ID', category: 'Identity', required: true, freshnessDays: null, satisfiedBy: ['photo_id'], selfAttestable: true },
    { id: 'ssn_verification', label: 'Social Security number verification', category: 'Identity', required: true, freshnessDays: null, satisfiedBy: ['ssn_verification'], selfAttestable: true },
    { id: 'income_verification', label: 'Income verification (recent pay stubs)', category: 'Income', required: true, freshnessDays: 120, satisfiedBy: ['paystub'], selfAttestable: false },
    { id: 'benefit_verification', label: 'Benefit award / verification letter (if applicable)', category: 'Income', required: false, freshnessDays: 365, satisfiedBy: ['benefit'], selfAttestable: false },
    { id: 'asset_statement', label: 'Asset / bank statement (last 2 months)', category: 'Assets', required: true, freshnessDays: 60, satisfiedBy: ['asset_statement'], selfAttestable: true }
  ];

  // Retrieval intents. Answers come from RULES_CORPUS; scoring is token-overlap
  // plus a phrase-substring bonus, so reasonable paraphrases still match.
  const QA_CORPUS = [
    { id: 'income_definition', ruleId: 'INCOME-DEF', keywords: ['what counts as income', 'gross income', 'annual income', 'does ssi count', 'does social security count', 'which income'] },
    { id: 'income_limit', ruleId: 'MTSP-LIMIT', keywords: ['income limit', 'maximum income', 'how much can i make', 'how much can i earn', 'area median income', 'ami'] },
    { id: 'set_aside', ruleId: 'MIN-SET-ASIDE', keywords: ['set aside', 'set-aside', 'minimum set aside', '20 50', '40 60'] },
    { id: 'income_averaging', ruleId: 'INCOME-AVERAGING', keywords: ['income averaging', 'average income test', 'averaging'] },
    { id: 'rent_limit', ruleId: 'RENT-LIMIT', keywords: ['rent limit', 'maximum rent', 'max rent', 'how much rent', 'gross rent', 'rent cap', 'what rent'] },
    { id: 'limit_derivation', ruleId: 'LIMIT-DERIVATION', keywords: ['how is the 60', 'derived', 'derivation', '120% of the 50', 'rounded', 'where do the limits come from', 'how are limits calculated'] },
    { id: 'asset_income', ruleId: 'ASSET-INCOME', keywords: ['assets', 'asset income', 'savings', 'bank account', 'imputed income', 'passbook'] },
    { id: 'student_rule', ruleId: 'STUDENT-RULE', keywords: ['student', 'full time student', 'full-time student', 'college', 'students'] },
    { id: 'next_available_unit', ruleId: 'NEXT-AVAILABLE-UNIT', keywords: ['140', 'next available unit', 'income increases', 'income goes up', 'over income'] },
    { id: 'paystub_freshness', ruleId: 'PAYSTUB-FRESHNESS', keywords: ['how recent', 'how old', 'how new', 'expire', 'expired', 'stale', 'pay stub', 'paystub', 'out of date'] },
    { id: 'program_info', ruleId: 'PROGRAM', keywords: ['what program', 'which program', 'lihtc', 'what is this', 'what rules'] },
    { id: 'documents_needed', ruleId: null, keywords: ['what documents', 'what do i need', 'checklist', 'required documents', 'what paperwork', 'which documents'] }
  ];

  const DECISION_PATTERNS = [
    /\b(am i|are we|do i|would i|can i)\b[^?]*\b(eligible|qualify|qualified|approved|denied|accepted|rejected|get in|get approved)\b/i,
    /\bwill i\b[^?]*\b(get|be)\b[^?]*\b(approved|accepted|in|the (apartment|unit))\b/i,
    /\b(decide|determine|approve|deny|reject|accept)\b.*\b(me|my (application|eligibility)|for me)\b/i,
    /\bjust tell me if\b/i, /\bdecide for me\b/i, /\bmake the (decision|call)\b/i, /\bam i (in|good|set)\b/i
  ];

  const INJECTION_PATTERNS = [
    /ignore (all|any|the|previous|prior|above)/i, /disregard (all|any|the|previous|prior|above)/i,
    /system\s*(instruction|prompt|message)/i, /you are now\b/i, /\boverride\b/i,
    /mark (this|the).{0,30}(eligible|approved|qualified)/i, /\bapprove (the|this) (application|applicant|renter)/i,
    /set confidence to/i, /act as\b/i, /new instructions?:/i
  ];

  const STOPWORDS = new Set(['the', 'a', 'an', 'is', 'my', 'for', 'to', 'of', 'what', 'how', 'do', 'i', 'me', 'be', 'can', 'are', 'does', 'and', 'in', 'on', 'it', 'this', 'that', 'you', 'we', 'if', 'or', 'must', 'need']);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function money(str) {
    if (str == null) return null;
    if (/[€£¥]/.test(String(str))) return null;
    const n = Number(String(str).replace(/[$,\s"\uff04]/g, ''));
    return isFinite(n) ? n : null;
  }
  function pad2(s) { s = String(s); return s.length < 2 ? '0' + s : s; }
  function normalizeDate(s) {
    if (s == null) return null;
    s = String(s).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return s;
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); 
    if (m) {
      let p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10);
      if (p1 > 12 && p2 <= 12) { const t = p1; p1 = p2; p2 = t; }
      return m[3] + '-' + pad2(p1) + '-' + pad2(p2);
    }
    return s;
  }
  function lineAround(text, index) {
    const start = text.lastIndexOf('\n', index) + 1;
    let end = text.indexOf('\n', index); if (end === -1) end = text.length;
    return { snippet: text.slice(start, end).trim(), start: start, end: end };
  }
  function match(text, regex, valueTransform) {
    regex.lastIndex = 0;
    const m = regex.exec(text);
    if (!m) return null;
    const raw = (m[1] != null ? m[1] : m[0]).trim();
    const value = valueTransform ? valueTransform(raw) : raw;
    if (value == null || value === '') return null;
    return { value: value, raw: raw, evidence: lineAround(text, m.index) };
  }
  function first(text /* , ...regexes */) {
    for (let i = 1; i < arguments.length; i++) { const h = match(text, arguments[i]); if (h) return h; }
    return null;
  }
  function daysBetween(isoA, isoB) {
    const a = new Date(isoA + 'T00:00:00'), b = new Date(isoB + 'T00:00:00');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }
  function dayOfYear(iso) {
    const d = new Date(iso + 'T00:00:00'); if (isNaN(d)) return null;
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  }
  function isValidISODate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(new Date(s + 'T00:00:00')); }

  // ---------------------------------------------------------------------------
  // Untrusted-input handling
  // ---------------------------------------------------------------------------
  function detectInjection(text) {
    const findings = [];
    String(text).split(/\r?\n/).forEach(function (line, i) {
      for (const p of INJECTION_PATTERNS) { if (p.test(line)) { findings.push({ line: i + 1, text: line.trim().slice(0, 200) }); break; } }
    });
    return findings; // surfaced only; never executed or passed to a tool.
  }

  // ---------------------------------------------------------------------------
  // Extraction (Profile stage) — robust to label variants + computed confidence
  // ---------------------------------------------------------------------------
  const RE = {
    employee: [/(?:Employee Name|\bEmployee\b|\bEmp\b)[\s:|,\-]*(.+)/i, /^Name[\s:|,\-]*(.+)/im, /^([A-Z][a-z]+ [A-Z][a-z]+)$/m],
    frequency: [/(?:Pay Frequency|Pay Type|Frequency|Payroll Frequency|Freq)[\s:|,\-]*(.+)/i, /^(Bi-?weekly|Weekly|Semi-?monthly|Monthly|Annually)$/im],
    payDate: [/(?:Pay Date|Check Date|Pay\/Check Date|Date)[\s:|,\-]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i, /Pay Period[^\n]*\bto\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i, /^([0-9]{4}-[0-9]{2}-[0-9]{2})$/m],
    grossCur: [
      /(?:Current Gross Pay|Gross Pay This Period|Gross Earnings This Period|Current Earnings|Gross Wages|Total Gross|Current Gross|Gross Pay|Gross Earnings|Cur Gross|Total)[\s:|,\-]*(?:(?!\bnet\b)[a-z\s|]*[\s:|,\-]+)*("?\s*[$\uff04€£¥]?\s*[\d,]+\.\d{2}\s*"?)/i
    ],
    grossYtd: [
      /(?:YTD Gross Pay|Gross Pay YTD|Year[- ]to[- ]Date Gross|YTD Gross Earnings|Gross Earnings YTD|YTD Earnings|YTD Gross|\bYTD\b(?!\s+net))[\s:|,\-]*(?:(?!\bnet\b)[a-z\s|]*[\s:|,\-]+)*("?\s*[$\uff04€£¥]?\s*[\d,]+\.\d{2}\s*"?)/i,
      /Total(?:[\s:|,\-]+)"?\s*[$\uff04€£¥]?\s*[\d,]+\.\d{2}\s*"?(?:[\s:|,\-]+)("?\s*[$\uff04€£¥]?\s*[\d,]+\.\d{2}\s*"?)/i
    ],
    recipient: [/(?:Recipient|Beneficiary)[\s:|,\-]*(.+)/i, /^Name[\s:|,\-]*(.+)/im],
    benefitType: [/(?:Benefit Type|Type of Benefit|Program)[\s:|,\-]*(.+)/i, /^Supplemental Security Income(?:\s*\(SSI\))?$/im],
    benefitAmt: [/(?:Monthly Benefit Amount|Monthly Benefit|Monthly Payment|Monthly Amount|Benefit Amount)[\s:|,\-]*("?\s*[$\uff04€£¥]?\s*[\d,]+\.\d{2}\s*"?)/i],
    awardDate: [/(?:Effective Date|Award Date|Date of Entitlement)[\s:|,\-]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i],
    letterDate: [/(?:Date of Letter|Letter Date|Date Issued)[\s:|,\-]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i]
  };

  function detectDocType(text) {
    if (!/[a-z]{3,}/i.test(text)) return 'unknown';
    if (/earnings statement|gross (pay|earnings|wages)|pay (frequency|stub|type)|payroll|\bytd\b/i.test(text)) return 'paystub';
    if (/social security administration.*(benefit|award|payment)|benefit (type|verification|amount|letter)|award letter|beneficiary|supplemental security/is.test(text)) return 'benefit';
    return 'unknown';
  }
  function guessEmployer(text) {
    const lines = String(text).split(/\r?\n/).map(function (l) { return l.trim(); });
    for (const l of lines) { if (!l) continue; if (/statement|pay|earnings|employee|:/i.test(l)) continue; return { value: l, evidence: lineAround(text, text.indexOf(l)) }; }
    return null;
  }
  function guessEmployee(text, empHit) {
    const lines = String(text).split(/\r?\n/).map(l => l.trim());
    const empStr = empHit ? empHit.value : '';
    for (const l of lines) {
      if (/^([A-Z][a-z]+ [A-Z][a-z]+)$/.test(l) && l !== empStr && !/LLC|Inc|Corp/i.test(l)) {
        return { value: l, evidence: lineAround(text, text.indexOf(l)) };
      }
    }
    return null;
  }

  // Real YTD cross-check: does YTD reconcile with current gross for the frequency & date?
  function reconcileIncome(raw) {
    const gross = money(raw.gross_pay_current), ytd = money(raw.gross_pay_ytd);
    const mult = frequencyMultiplier(raw.pay_frequency);
    if (gross == null || ytd == null || gross === 0) return { available: false };
    const impliedPeriods = ytd / gross;
    const rounded = Math.round(impliedPeriods);
    const cleanInteger = Math.abs(impliedPeriods - rounded) <= 0.12 && rounded >= 1;
    let expectedPeriods = null, plausibleByDate = true;
    if (raw.pay_date && mult) {
      const doy = dayOfYear(raw.pay_date);
      if (doy != null) { expectedPeriods = Math.round(doy * mult / 365); plausibleByDate = rounded >= 1 && rounded <= expectedPeriods + 1; }
    }
    const corroborated = cleanInteger && plausibleByDate;
    let note;
    if (corroborated) note = 'YTD cross-check: $' + ytd.toLocaleString() + ' ÷ $' + gross.toLocaleString() + ' = ' + impliedPeriods.toFixed(1) + ' pay periods — a clean, date-plausible count, so the current gross is corroborated.';
    else if (!cleanInteger) note = 'YTD cross-check: $' + ytd.toLocaleString() + ' ÷ $' + gross.toLocaleString() + ' = ' + impliedPeriods.toFixed(2) + ' periods — not a clean whole number, so the current gross may be irregular. Confidence lowered; please verify.';
    else note = 'YTD cross-check: implies ' + rounded + ' periods but only ~' + expectedPeriods + ' are expected by ' + raw.pay_date + '. Confidence lowered; please verify.';
    return { available: true, impliedPeriods: impliedPeriods, roundedPeriods: rounded, expectedPeriods: expectedPeriods, cleanInteger: cleanInteger, plausibleByDate: plausibleByDate, corroborated: corroborated, note: note };
  }

  // 2026 SSI federal benefit rates (2.8% COLA announced October 2025). Used only
  // as a plausibility band to calibrate benefit-letter confidence — never as an
  // eligibility input.
  const SSI_FBR_2026 = {
    individual: 994, couple: 1491,
    source: 'SSA — SSI Federal Payment Amounts for 2026',
    sourceUrl: 'https://www.ssa.gov/oact/cola/SSI.html'
  };

  // Benefit-letter cross-check: date ordering sanity + (for SSI) a published
  // federal-benefit-rate plausibility band, so benefit confidences are computed
  // the same way pay stub confidences are.
  function reconcileBenefit(raw) {
    const amt = money(raw.monthly_benefit_amount);
    if (amt == null) return { available: false };
    const checks = [];
    if (isValidISODate(raw.award_effective_date) && isValidISODate(raw.letter_date)) {
      const inOrder = daysBetween(raw.award_effective_date, raw.letter_date) >= 0;
      checks.push({
        id: 'date_order', pass: inOrder,
        text: inOrder
          ? 'letter date ' + raw.letter_date + ' is on/after the award effective date ' + raw.award_effective_date
          : 'letter date ' + raw.letter_date + ' is BEFORE the award effective date ' + raw.award_effective_date + ' — dates are inconsistent'
      });
    }
    if (/\bssi\b|supplemental security income/i.test(String(raw.benefit_type || ''))) {
      // Band: above $0 and at or below the 2026 couple FBR plus headroom for
      // state supplements. Partial (reduced) SSI amounts are common and valid.
      const ceiling = SSI_FBR_2026.couple + 300;
      const inBand = amt > 0 && amt <= ceiling;
      checks.push({
        id: 'ssi_band', pass: inBand,
        text: inBand
          ? '$' + amt.toLocaleString() + '/month is within the plausible SSI range (2026 federal benefit rate: $' + SSI_FBR_2026.individual.toLocaleString() + ' individual / $' + SSI_FBR_2026.couple.toLocaleString() + ' couple, plus state supplement)'
          : '$' + amt.toLocaleString() + '/month is outside the plausible SSI range (2026 federal benefit rate: $' + SSI_FBR_2026.individual.toLocaleString() + ' individual / $' + SSI_FBR_2026.couple.toLocaleString() + ' couple) — please verify'
      });
    }
    if (!checks.length) return { available: true, corroborated: null, checks: checks, note: 'No cross-check applies (missing dates and non-SSI benefit type); amount taken as stated — please verify.' };
    const corroborated = checks.every(function (c) { return c.pass; });
    const note = 'Benefit cross-check: ' + checks.map(function (c) { return c.text; }).join('; ') + '.';
    return { available: true, corroborated: corroborated, checks: checks, note: note };
  }

  function mkField(key, hit, confidence, note) {
    if (!hit) return { key: key, value: null, confidence: 0, evidence: null, status: 'missing', note: note || null };
    return { key: key, value: hit.value, confidence: confidence, evidence: hit.evidence, status: confidence >= 0.7 ? 'ok' : 'needs_review', note: note || null };
  }

  function extractPaystub(text) {
    const emp = match(text, /Employer\s*:\s*(.+)/i) || guessEmployer(text);
    const empRe = [/(?:Employee Name|\bEmployee\b|\bEmp\b)[\s:|,\-]*(.+)/i, /^Name[\s:|,\-]*(.+)/im];
    const employee = first.apply(null, [text].concat(empRe)) || guessEmployee(text, emp);
    const freq = first.apply(null, [text].concat(RE.frequency));
    let payDateHit = first.apply(null, [text].concat(RE.payDate));
    if (payDateHit) payDateHit = { value: normalizeDate(payDateHit.value), evidence: payDateHit.evidence };
    const grossCur = first.apply(null, [text].concat(RE.grossCur.map(function (r) { return r; })));
    const grossYtd = first.apply(null, [text].concat(RE.grossYtd));
    const grossCurVal = grossCur ? { value: money(grossCur.value), evidence: grossCur.evidence } : null;
    const grossYtdVal = grossYtd ? { value: money(grossYtd.value), evidence: grossYtd.evidence } : null;

    const raw = {
      employer_name: emp ? emp.value : null,
      pay_frequency: freq ? freq.value : null,
      pay_date: payDateHit ? payDateHit.value : null,
      gross_pay_current: grossCurVal ? grossCurVal.value : null,
      gross_pay_ytd: grossYtdVal ? grossYtdVal.value : null
    };
    const rec = reconcileIncome(raw);
    const grossConf = rec.available ? (rec.corroborated ? 0.97 : 0.55) : (grossCurVal ? 0.82 : 0);
    const ytdConf = rec.available ? (rec.corroborated ? 0.95 : 0.55) : (grossYtdVal ? 0.8 : 0);

    return {
      docType: 'paystub', supported: true, injections: detectInjection(text), reconcile: rec,
      fields: [
        mkField('employer_name', emp, emp ? (match(text, /Employer\s*:/i) ? 0.9 : 0.6) : 0),
        mkField('employee_name', employee, 0.85),
        mkField('pay_frequency', freq, freq && frequencyMultiplier(freq.value) ? 0.95 : (freq ? 0.55 : 0)),
        mkField('pay_date', payDateHit, payDateHit && isValidISODate(payDateHit.value) ? 0.9 : (payDateHit ? 0.5 : 0)),
        mkField('gross_pay_current', grossCurVal, grossConf, rec.note),
        mkField('gross_pay_ytd', grossYtdVal, ytdConf, rec.note)
      ]
    };
  }

  function extractBenefit(text) {
    const recip = first.apply(null, [text].concat(RE.recipient));
    const btype = first.apply(null, [text].concat(RE.benefitType));
    const amt = first.apply(null, [text].concat(RE.benefitAmt));
    let award = first.apply(null, [text].concat(RE.awardDate));
    let letter = first.apply(null, [text].concat(RE.letterDate));
    const amtVal = amt ? { value: money(amt.value), evidence: amt.evidence } : null;
    if (award) award = { value: normalizeDate(award.value), evidence: award.evidence };
    if (letter) letter = { value: normalizeDate(letter.value), evidence: letter.evidence };
    const rec = reconcileBenefit({
      benefit_type: btype ? btype.value : null,
      monthly_benefit_amount: amtVal ? amtVal.value : null,
      award_effective_date: award ? award.value : null,
      letter_date: letter ? letter.value : null
    });
    const amtConf = !amtVal ? 0
      : rec.corroborated === true ? 0.95
        : rec.corroborated === false ? 0.55
          : 0.85;
    return {
      docType: 'benefit', supported: true, injections: detectInjection(text), reconcile: rec,
      fields: [
        mkField('recipient_name', recip, 0.85),
        mkField('benefit_type', btype, btype ? 0.9 : 0),
        mkField('monthly_benefit_amount', amtVal, amtConf, rec.available ? rec.note : null),
        mkField('award_effective_date', award, award && isValidISODate(award.value) ? 0.9 : (award ? 0.5 : 0)),
        mkField('letter_date', letter, letter && isValidISODate(letter.value) ? 0.9 : (letter ? 0.5 : 0))
      ]
    };
  }

  // Rebuild line structure from pdf.js textContent items so PDF documents flow
  // through the exact same regex extraction path as pasted text (data, never code).
  function pdfItemsToText(items) {
    let out = '', lastY = null;
    (items || []).forEach(function (it) {
      if (it.str == null) return;
      const y = it.transform ? it.transform[5] : null;
      if (lastY != null && y != null && Math.abs(y - lastY) > 2 && out && out[out.length - 1] !== '\n') out += '\n';
      out += it.str;
      if (it.hasEOL && out[out.length - 1] !== '\n') { out += '\n'; lastY = null; return; }
      if (y != null) lastY = y;
    });
    return out;
  }

  function extractDocument(text) {
    const docType = detectDocType(text);
    if (docType === 'paystub') return extractPaystub(text);
    if (docType === 'benefit') return extractBenefit(text);
    return { docType: 'unknown', supported: false, fields: [], injections: detectInjection(text), reconcile: { available: false } };
  }

  // ---------------------------------------------------------------------------
  // Deterministic math (Understand stage)
  // ---------------------------------------------------------------------------
  const FREQ_MULTIPLIER = {
    weekly: 52, 'bi-weekly': 26, biweekly: 26, 'semi-monthly': 24, semimonthly: 24,
    'semi monthly': 24, monthly: 12, annually: 1, annual: 1, yearly: 1
  };
  function frequencyMultiplier(freq) {
    if (!freq) return null;
    const key = String(freq).toLowerCase().trim();
    return FREQ_MULTIPLIER[key] != null ? FREQ_MULTIPLIER[key] : null;
  }
  function normEmployer(name) { return String(name || 'unknown').toLowerCase().replace(/\b(llc|inc|co|corp|ltd|company)\b/g, '').replace(/[^a-z0-9]/g, ''); }

  // De-duplicate income sources so two stubs from one employer are NOT summed.
  function dedupeSources(sources) {
    const paystubs = [], benefits = [], others = [];
    (sources || []).forEach(function (s) { (s.docType === 'paystub' ? paystubs : s.docType === 'benefit' ? benefits : others).push(s); });
    const byEmp = {};
    paystubs.forEach(function (s) {
      const k = normEmployer(s.fieldsByKey.employer_name);
      const cur = byEmp[k];
      const d = s.fieldsByKey.pay_date || '';
      if (!cur || d > (cur.fieldsByKey.pay_date || '')) byEmp[k] = s;
    });
    const byBen = {};
    benefits.forEach(function (s) {
      const k = String(s.fieldsByKey.benefit_type || 'benefit').toLowerCase();
      const cur = byBen[k];
      const d = s.fieldsByKey.letter_date || s.fieldsByKey.award_effective_date || '';
      if (!cur || d > (cur.fieldsByKey.letter_date || cur.fieldsByKey.award_effective_date || '')) byBen[k] = s;
    });
    const kept = Object.keys(byEmp).map(function (k) { return byEmp[k]; })
      .concat(Object.keys(byBen).map(function (k) { return byBen[k]; })).concat(others);
    return { kept: kept, collapsed: (sources || []).length - kept.length };
  }

  function annualizeIncome(sources) {
    const dd = dedupeSources(sources);
    const lines = []; let total = 0, uncertain = false;
    dd.kept.forEach(function (src) {
      const f = src.fieldsByKey || {};
      if (src.docType === 'paystub') {
        const gross = money(f.gross_pay_current), mult = frequencyMultiplier(f.pay_frequency);
        if (gross == null || mult == null) { uncertain = true; return; }
        const amt = gross * mult; total += amt;
        lines.push({ label: (f.employer_name || 'Employment') + ' (wages)', formula: '$' + gross.toLocaleString() + ' gross × ' + mult + ' pay periods/year', amount: amt });
      } else if (src.docType === 'benefit') {
        const monthly = money(f.monthly_benefit_amount);
        if (monthly == null) { uncertain = true; return; }
        const amt = monthly * 12; total += amt;
        lines.push({ label: (f.benefit_type || 'Benefit') + ' (periodic payments)', formula: '$' + monthly.toLocaleString() + '/month × 12 months', amount: amt });
      }
    });
    return { annual: Math.round(total), lines: lines, uncertain: uncertain, collapsed: dd.collapsed };
  }

  function lookupLimit(householdSize, amiPct) {
    const table = RULES_CORPUS.incomeLimits.byPercent[String(amiPct)];
    if (!table) return null;
    const n = Number(householdSize);
    if (!Number.isInteger(n) || n < 1 || n > table.length) return null;
    return { value: table[n - 1], amiPct: amiPct, householdSize: n, source: RULES_CORPUS.incomeLimits.source, sourceUrl: RULES_CORPUS.incomeLimits.sourceUrl, effectiveDate: RULES_CORPUS.incomeLimits.effectiveDate };
  }

  // LIHTC maximum gross rent: 30% of the imputed income limitation (IRC § 42(g)(2)).
  // Occupancy imputed from bedrooms: studio = 1 person, otherwise 1.5 persons per
  // bedroom; a half person uses the average of the two adjacent household limits.
  function rentLimit(bedrooms, amiPct) {
    const b = Number(bedrooms);
    if (!Number.isInteger(b) || b < 0 || b > 5) return null;
    const persons = b === 0 ? 1 : b * 1.5;
    const lo = lookupLimit(Math.floor(persons), amiPct), hi = lookupLimit(Math.ceil(persons), amiPct);
    if (!lo || !hi) return null;
    const imputed = (lo.value + hi.value) / 2;
    const monthly = Math.floor(imputed * 0.30 / 12);
    return {
      bedrooms: b, amiPct: amiPct, imputedPersons: persons, imputedIncomeLimit: imputed, monthlyGrossRent: monthly,
      formula: (persons === Math.floor(persons)
        ? '$' + imputed.toLocaleString() + ' (' + persons + '-person limit)'
        : '($' + lo.value.toLocaleString() + ' + $' + hi.value.toLocaleString() + ') ÷ 2 = $' + imputed.toLocaleString() + ' (' + persons + ' imputed persons)')
        + ' × 30% ÷ 12 = $' + monthly.toLocaleString() + '/month',
      source: 'Internal Revenue Code § 42(g)(2); limits: ' + RULES_CORPUS.incomeLimits.source,
      effectiveDate: RULES_CORPUS.incomeLimits.effectiveDate
    };
  }

  // INFORMATION ONLY — never an eligibility verdict.
  function compareIncome(annualIncome, householdSize) {
    if (annualIncome == null || Number.isNaN(annualIncome)) return { abstain: true, reason: 'No confirmed income yet. Confirm your income documents first.' };
    const n = Number(householdSize);
    if (!Number.isInteger(n) || n < 1) return { abstain: true, reason: 'Household size is not confirmed. Enter and confirm household size to see the published limit.' };
    const limit50 = lookupLimit(n, '50'), limit60 = lookupLimit(n, '60');
    if (!limit50 || !limit60) return { abstain: true, reason: 'No published limit is available for a household of ' + n + ' in the frozen table.' };
    return {
      abstain: false, annualIncome: annualIncome, householdSize: n, limits: [limit60, limit50],
      differenceTo60: limit60.value - annualIncome, differenceTo50: limit50.value - annualIncome,
      effectiveDate: RULES_CORPUS.incomeLimits.effectiveDate, source: RULES_CORPUS.incomeLimits.source, sourceUrl: RULES_CORPUS.incomeLimits.sourceUrl,
      decisionDeflection: 'This is information, not a decision. RealDoor does not determine eligibility. A qualified housing professional reviews your packet and decides.'
    };
  }

  // ---------------------------------------------------------------------------
  // Rules Q&A (retrieval with citation, or explicit refusal / abstention)
  // ---------------------------------------------------------------------------
  function getRule(id) { return RULES_CORPUS.rules.find(function (r) { return r.id === id; }) || null; }
  function citationFor(rule) { return rule ? { ruleId: rule.id, title: rule.title, source: rule.source, sourceUrl: rule.sourceUrl, effectiveDate: rule.effectiveDate } : null; }
  function tokenize(s) { return String(s).toLowerCase().replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(function (t) { return t && !STOPWORDS.has(t); }); }

  function answerQuestion(question, context) {
    const q = String(question || '').toLowerCase().trim();
    if (!q) return { type: 'abstain', text: 'Please type a question about the program rules.' };

    for (const p of DECISION_PATTERNS) {
      if (p.test(q)) return {
        type: 'refusal',
        text: 'I can’t decide whether you are eligible — that decision is made by a qualified housing professional. What I can show you is the rule, your confirmed input, and the deterministic calculation, so you and the reviewer can see exactly where you stand.',
        citation: citationFor(getRule('MTSP-LIMIT')),
        pointer: 'See the Understand stage: confirmed income, the published MTSP limit for your household size, and the effective date.'
      };
    }

    const qTokens = new Set(tokenize(q));
    let best = null, bestScore = 0;
    for (const intent of QA_CORPUS) {
      let overlap = 0;
      const intentTokens = new Set();
      intent.keywords.forEach(function (kw) { tokenize(kw).forEach(function (t) { intentTokens.add(t); }); if (q.indexOf(kw) !== -1) overlap += 3; });
      intentTokens.forEach(function (t) { if (qTokens.has(t)) overlap += 1; });
      if (overlap > bestScore) { bestScore = overlap; best = intent; }
    }

    if (best && bestScore >= 2) {
      if (best.id === 'documents_needed') {
        const required = GOLD_CHECKLIST.filter(function (i) { return i.required; }).map(function (i) { return i.label; });
        return { type: 'answer', text: 'For a ' + RULES_CORPUS.program + ' application, the required documents are: ' + required.join('; ') + '. A benefit letter is also used if you receive periodic benefits.', citation: { ruleId: 'GOLD-CHECKLIST', title: 'Application document checklist', source: 'RealDoor demo gold checklist', sourceUrl: null, effectiveDate: '2026-01-01' } };
      }
      if (best.id === 'income_limit') {
        const size = context && context.householdSize;
        const lim = size ? lookupLimit(size, '60') : null;
        const text = lim
          ? 'For a household of ' + lim.householdSize + ' in ' + RULES_CORPUS.metro + ', the 60% AMI limit is $' + lim.value.toLocaleString() + ' (50% AMI: $' + lookupLimit(size, '50').value.toLocaleString() + '), effective ' + lim.effectiveDate + '. This is the published limit, not a decision about you.'
          : 'The income limit depends on your household size and metro. Confirm your household size in the Understand stage and I will show the exact published limit from the HUD FY2026 MTSP table for ' + RULES_CORPUS.metro + '.';
        return { type: 'answer', text: text, citation: citationFor(getRule('MTSP-LIMIT')) };
      }
      const rule = getRule(best.ruleId);
      if (rule) return { type: 'answer', text: rule.text, citation: citationFor(rule) };
    }

    return { type: 'abstain', text: 'I don’t have an authoritative citation for that in the frozen FY' + RULES_CORPUS.ruleYear + ' ' + RULES_CORPUS.program + ' corpus, so I won’t guess. Try asking about the income limit, what counts as income, the set-aside, income averaging, the full-time-student rule, assets, or how recent pay stubs must be.' };
  }

  // ---------------------------------------------------------------------------
  // Checklist evaluation (Prepare stage)
  // ---------------------------------------------------------------------------
  function evaluateChecklist(confirmedDocs, presentIds, asOfDateISO) {
    confirmedDocs = confirmedDocs || []; presentIds = presentIds || [];
    const asOf = asOfDateISO || new Date().toISOString().slice(0, 10);
    return GOLD_CHECKLIST.map(function (item) {
      const matchingDoc = confirmedDocs.find(function (d) { return item.satisfiedBy.indexOf(d.docType) !== -1; });
      const manuallyPresent = presentIds.indexOf(item.id) !== -1;
      if (!matchingDoc && !manuallyPresent) {
        return Object.assign({}, item, { status: item.required ? 'missing' : 'optional_missing', reason: item.required ? 'Required item not yet provided.' : 'Optional item not provided.' });
      }
      if (matchingDoc && item.freshnessDays != null && matchingDoc.dateISO) {
        const age = daysBetween(matchingDoc.dateISO, asOf);
        if (age != null && age > item.freshnessDays) return Object.assign({}, item, { status: 'expired', reason: 'Dated ' + matchingDoc.dateISO + ' — ' + age + ' days old, older than the ' + item.freshnessDays + '-day window (as of ' + asOf + ').', documentDate: matchingDoc.dateISO, ageDays: age });
        return Object.assign({}, item, { status: 'present', reason: 'Dated ' + matchingDoc.dateISO + ' — within the ' + item.freshnessDays + '-day window.', documentDate: matchingDoc.dateISO, ageDays: age });
      }
      return Object.assign({}, item, { status: 'present', reason: manuallyPresent ? 'Marked present by renter (self-attested).' : 'Provided.' });
    });
  }

  // ---------------------------------------------------------------------------
  // Packet (Prepare stage) — renter-controlled, never auto-sent.
  // ---------------------------------------------------------------------------
  function buildPacket(state) {
    return {
      generatedAt: new Date().toISOString(),
      disclaimer: 'Prepared by the renter using RealDoor. This is an application-readiness packet, NOT an eligibility decision. RealDoor does not approve, deny, score, or rank. A qualified housing professional decides. RealDoor never sends this packet anywhere; only the renter can share it.',
      program: RULES_CORPUS.program, metro: RULES_CORPUS.metro, ruleYear: RULES_CORPUS.ruleYear, ruleVersion: RULES_CORPUS.version,
      corpusEffectiveDate: RULES_CORPUS.incomeLimits.effectiveDate, corpusFrozenOn: RULES_CORPUS.frozenOn,
      profile: state.profile || {}, income: state.income || null, comparison: state.comparison || null,
      checklist: state.checklist || [], includedItems: (state.checklist || []).filter(function (i) { return i.include !== false; }).map(function (i) { return i.id; }), note: state.note || ''
    };
  }
  function renderPacketMarkdown(packet) {
    const L = [];
    L.push('# RealDoor Application-Readiness Packet'); L.push('');
    L.push('> ' + packet.disclaimer); L.push('');
    L.push('- **Program:** ' + packet.program);
    L.push('- **Metro:** ' + packet.metro);
    L.push('- **Rule corpus:** ' + packet.ruleVersion + ' · limits effective ' + packet.corpusEffectiveDate + ' · frozen ' + packet.corpusFrozenOn);
    L.push('- **Generated:** ' + packet.generatedAt); L.push('');
    L.push('## Confirmed profile (allowlisted fields only)');
    const prof = packet.profile || {}, keys = Object.keys(prof);
    if (!keys.length) L.push('_No confirmed fields._');
    keys.forEach(function (k) { L.push('- **' + k + ':** ' + prof[k]); });
    L.push('');
    if (packet.income) {
      L.push('## Income calculation (deterministic)');
      (packet.income.lines || []).forEach(function (ln) { L.push('- ' + ln.label + ': ' + ln.formula + ' = $' + Math.round(ln.amount).toLocaleString()); });
      L.push('- **Anticipated annual household income:** $' + packet.income.annual.toLocaleString());
      if (packet.income.collapsed) L.push('- _' + packet.income.collapsed + ' duplicate income document(s) from the same source were de-duplicated (most recent kept) rather than summed._');
      L.push('');
    }
    if (packet.comparison && !packet.comparison.abstain) {
      L.push('## Published limit (information only, not a decision)');
      packet.comparison.limits.forEach(function (lim) { L.push('- ' + lim.amiPct + '% AMI limit, household of ' + lim.householdSize + ': $' + lim.value.toLocaleString() + ' (effective ' + lim.effectiveDate + ')'); });
      L.push('- **Source:** ' + packet.comparison.source);
      L.push('- ' + packet.comparison.decisionDeflection); L.push('');
    }
    L.push('## Document checklist');
    (packet.checklist || []).forEach(function (item) { if (item.include === false) return; const mark = item.status === 'present' ? '[x]' : '[ ]'; L.push('- ' + mark + ' ' + item.label + ' — **' + item.status.toUpperCase() + '** (' + (item.reason || '') + ')'); });
    if (packet.note) { L.push(''); L.push('## Renter note'); L.push(packet.note); }
    L.push(''); L.push('_RealDoor is a research prototype and is assistive, not adjudicative._');
    return L.join('\n');
  }

  return {
    RULES_CORPUS: RULES_CORPUS, FIELD_ALLOWLIST: FIELD_ALLOWLIST, FIELD_DENYLIST: FIELD_DENYLIST,
    GOLD_CHECKLIST: GOLD_CHECKLIST, QA_CORPUS: QA_CORPUS,
    detectDocType: detectDocType, detectInjection: detectInjection, extractDocument: extractDocument,
    pdfItemsToText: pdfItemsToText,
    extractPaystub: extractPaystub, extractBenefit: extractBenefit, reconcileIncome: reconcileIncome,
    reconcileBenefit: reconcileBenefit, SSI_FBR_2026: SSI_FBR_2026, rentLimit: rentLimit,
    frequencyMultiplier: frequencyMultiplier, dedupeSources: dedupeSources, annualizeIncome: annualizeIncome,
    lookupLimit: lookupLimit, compareIncome: compareIncome, answerQuestion: answerQuestion,
    evaluateChecklist: evaluateChecklist, buildPacket: buildPacket, renderPacketMarkdown: renderPacketMarkdown,
    money: money, daysBetween: daysBetween, normalizeDate: normalizeDate
  };
});
