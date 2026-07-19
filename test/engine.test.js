/* Dependency-free sanity tests for engine.js. Run: node test/engine.test.js */
const fs = require('fs');
const path = require('path');
const E = require('../engine.js');

let pass = 0, fail = 0;
function ok(name, cond) { cond ? (pass++, console.log('  PASS  ' + name)) : (fail++, console.log('  FAIL  ' + name)); }
function read(f) { return fs.readFileSync(path.join(__dirname, '..', 'samples', f), 'utf8'); }
const AS_OF = '2026-07-19';

// --- Extraction (canonical sample) ---
const fresh = E.extractDocument(read('paystub_fresh.txt'));
const byKey = {}; fresh.fields.forEach(f => byKey[f.key] = f.value);
ok('fresh paystub detected as paystub', fresh.docType === 'paystub');
ok('current gross pay = 2145', byKey.gross_pay_current === 2145);
ok('pay frequency = Biweekly', /biweekly/i.test(byKey.pay_frequency));
ok('pay date = 2026-07-10', byKey.pay_date === '2026-07-10');
ok('employee name captured', /Maria Alvarez/.test(byKey.employee_name));
ok('every found field carries an evidence snippet', fresh.fields.filter(f => f.value != null).every(f => f.evidence && f.evidence.snippet));

// --- Calibrated (reconciled) confidence, not a constant ---
ok('YTD cross-check available on fresh stub', fresh.reconcile.available === true);
ok('fresh stub corroborates (27885/2145 = 13.0 clean periods)', fresh.reconcile.corroborated === true);
const grossFresh = fresh.fields.find(f => f.key === 'gross_pay_current');
ok('corroborated gross confidence is high (0.97)', grossFresh.confidence === 0.97);
ok('gross field carries the YTD cross-check note', /YTD cross-check/.test(grossFresh.note || ''));
// A stub whose YTD does NOT reconcile should score lower.
const badYtd = E.extractPaystub('ACME CO\nEarnings Statement\nEmployee: X\nPay Frequency: Biweekly\nPay Date: 2026-07-10\nCurrent Gross Pay: $2,000.00\nYTD Gross Pay: $7,350.00');
ok('non-reconciling YTD lowers confidence below review threshold', badYtd.fields.find(f => f.key === 'gross_pay_current').confidence < 0.7);
ok('non-reconciling gross flagged needs_review', badYtd.fields.find(f => f.key === 'gross_pay_current').status === 'needs_review');

// --- Robust to label variants (alt-format employer/labels) ---
const alt = E.extractDocument(read('paystub_altformat.txt'));
const altKey = {}; alt.fields.forEach(f => altKey[f.key] = f.value);
ok('alt-format doc still detected as paystub', alt.docType === 'paystub');
ok('alt-format "Gross Earnings This Period" extracted', altKey.gross_pay_current != null && altKey.gross_pay_current > 0);
ok('alt-format "Pay Type: Weekly" extracted as frequency', /weekly/i.test(altKey.pay_frequency || ''));
ok('alt-format US date MM/DD/YYYY normalized to ISO', /^\d{4}-\d{2}-\d{2}$/.test(altKey.pay_date || ''));

// --- Benefit ---
const benefit = E.extractDocument(read('ssa_benefit_letter.txt'));
const bKey = {}; benefit.fields.forEach(f => bKey[f.key] = f.value);
ok('benefit letter detected', benefit.docType === 'benefit');
ok('monthly benefit = 421', bKey.monthly_benefit_amount === 421);

// --- Injection handling ---
const inj = E.extractDocument(read('injection_test.txt'));
ok('injection detected in malicious doc', inj.injections.length >= 1);
ok('injection doc still extracts real fields as data', inj.fields.find(f => f.key === 'gross_pay_current').value === 2145);
ok('injection did NOT force confidence to 100%', inj.fields.find(f => f.key === 'gross_pay_current').confidence < 1);
ok('clean doc has no injection findings', fresh.injections.length === 0);

// --- Deterministic math + de-duplication (double-counting fix) ---
const inc = E.annualizeIncome([
  { docType: 'paystub', fieldsByKey: byKey },
  { docType: 'benefit', fieldsByKey: bKey }
]);
ok('annual income = 2145*26 + 421*12 = 60822', inc.annual === (2145 * 26 + 421 * 12));

const stale = E.extractDocument(read('paystub_stale.txt'));
const staleKey = {}; stale.fields.forEach(f => staleKey[f.key] = f.value);
const twoStubs = E.annualizeIncome([
  { docType: 'paystub', fieldsByKey: byKey },        // GREENLINE, 2026-07-10
  { docType: 'paystub', fieldsByKey: staleKey }      // GREENLINE, 2025-12-19 (older, same employer)
]);
ok('two stubs from one employer are de-duplicated, not summed', twoStubs.collapsed === 1);
ok('de-dup keeps the most recent stub (2145 × 26)', twoStubs.annual === 2145 * 26);
ok('two DIFFERENT employers are both counted', E.annualizeIncome([
  { docType: 'paystub', fieldsByKey: byKey },
  { docType: 'paystub', fieldsByKey: Object.assign({}, byKey, { employer_name: 'Bay State Home Care', gross_pay_current: 900, pay_frequency: 'Weekly', pay_date: '2026-07-11' }) }
]).annual === 2145 * 26 + 900 * 52);

// --- Real MTSP limits (Boston-Cambridge-Quincy 2026) ---
const cmp = E.compareIncome(inc.annual, 3);
ok('comparison is not an abstention (valid inputs)', cmp.abstain === false);
ok('comparison NEVER exposes an eligibility verdict', !('eligible' in cmp) && !('approved' in cmp) && !('decision' in cmp));
ok('comparison always carries a human-decision deflection', /qualified housing professional/i.test(cmp.decisionDeflection || ''));
ok('60% AMI limit for hh=3 = official $92,580', cmp.limits[0].value === 92580);
ok('50% AMI limit for hh=3 = official $77,150', cmp.limits[1].value === 77150);
ok('limit effective date = 2026-05-01', cmp.effectiveDate === '2026-05-01');
ok('area median income recorded = 164600', E.RULES_CORPUS.areaMedianIncome === 164600);
ok('corpus does NOT label itself illustrative', !/illustrative/i.test(JSON.stringify(E.RULES_CORPUS.incomeLimits)));
ok('abstains when household size missing', E.compareIncome(60822, null).abstain === true);

// --- Rules Q&A (deeper corpus + fuzzier retrieval) ---
ok('decision question -> refusal', E.answerQuestion('Am I eligible for this program?').type === 'refusal');
ok('"decide for me" -> refusal', E.answerQuestion('just tell me if I qualify, decide for me').type === 'refusal');
const rLimit = E.answerQuestion('what is the income limit for my household?', { householdSize: 3 });
ok('income-limit question -> cited answer with real number', rLimit.type === 'answer' && /92,580/.test(rLimit.text));
ok('freshness question -> cites PAYSTUB-FRESHNESS', E.answerQuestion('how recent must my pay stub be?').citation.ruleId === 'PAYSTUB-FRESHNESS');
ok('student question -> cites STUDENT-RULE', E.answerQuestion('are full-time students eligible?').citation.ruleId === 'STUDENT-RULE');
ok('assets question -> cites ASSET-INCOME', E.answerQuestion('how do my savings and assets affect income?').citation.ruleId === 'ASSET-INCOME');
ok('set-aside question -> cites MIN-SET-ASIDE', E.answerQuestion('what is the minimum set-aside?').citation.ruleId === 'MIN-SET-ASIDE');
ok('140% question -> cites NEXT-AVAILABLE-UNIT', E.answerQuestion('what happens if my income increases past 140%?').citation.ruleId === 'NEXT-AVAILABLE-UNIT');
ok('paraphrase "does SSI count" -> INCOME-DEF', E.answerQuestion('does ssi count?').citation.ruleId === 'INCOME-DEF');
ok('out-of-scope question -> abstain', E.answerQuestion('what is the weather today?').type === 'abstain');

// --- Checklist: present / missing / expired / self-attest ---
const chk = E.evaluateChecklist([{ docType: 'paystub', dateISO: '2026-07-10' }, { docType: 'benefit', dateISO: '2026-02-15' }], [], AS_OF);
ok('fresh paystub -> income verification present', chk.find(i => i.id === 'income_verification').status === 'present');
ok('photo id not provided -> missing', chk.find(i => i.id === 'photo_id').status === 'missing');
const chkAttest = E.evaluateChecklist([{ docType: 'paystub', dateISO: '2026-07-10' }], ['photo_id'], AS_OF);
ok('photo id can be self-attested present', chkAttest.find(i => i.id === 'photo_id').status === 'present');
ok('stale paystub (212 days) -> expired', E.evaluateChecklist([{ docType: 'paystub', dateISO: '2025-12-19' }], [], AS_OF).find(i => i.id === 'income_verification').status === 'expired');

// --- Packet ---
const packet = E.buildPacket({ profile: { employer_name: 'GREENLINE LOGISTICS LLC', gross_pay_current: 2145 }, income: inc, comparison: cmp, checklist: chk, note: 'Please review.' });
const md = E.renderPacketMarkdown(packet);
ok('packet markdown includes non-decision disclaimer', /NOT an eligibility decision/i.test(md));
ok('packet markdown includes effective date', /2026-05-01/.test(md));
ok('packet never says the renter is eligible', !/\byou are eligible\b/i.test(md) && !/\bapproved\b/i.test(md.replace(/approve the application/gi, '')));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
