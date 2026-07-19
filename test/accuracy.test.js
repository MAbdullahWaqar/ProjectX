/*
 * Field-level accuracy harness: every sample document is extracted and every
 * field is compared against a gold value. Prints a single measured accuracy
 * number (correct / total, abstentions counted separately). A wrong value
 * fails the suite; an abstention (null) is reported but tolerated.
 * Run: node test/accuracy.test.js
 */
const fs = require('fs');
const path = require('path');
const E = require('../engine.js');

// Gold field values for each synthetic sample. `re:` entries match by regex
// (names where punctuation/suffix variance is acceptable); others are exact.
const GOLD = {
  'paystub_fresh.txt': {
    employer_name: { re: /greenline logistics/i },
    employee_name: { re: /^Maria Alvarez$/ },
    pay_frequency: { re: /^Biweekly$/i },
    pay_date: '2026-07-10',
    gross_pay_current: 2145,
    gross_pay_ytd: 27885
  },
  'paystub_altformat.txt': {
    employer_name: { re: /bay state home care/i },
    employee_name: { re: /^Maria Alvarez$/ },
    pay_frequency: { re: /^Weekly$/i },
    pay_date: '2026-07-11',
    gross_pay_current: 912.5,
    gross_pay_ytd: 25550
  },
  'paystub_stale.txt': {
    employer_name: { re: /greenline logistics/i },
    employee_name: { re: /^Maria Alvarez$/ },
    pay_frequency: { re: /^Biweekly$/i },
    pay_date: '2025-12-19',
    gross_pay_current: 2050,
    gross_pay_ytd: 53300
  },
  'ssa_benefit_letter.txt': {
    recipient_name: { re: /^Maria Alvarez$/ },
    benefit_type: { re: /supplemental security income/i },
    monthly_benefit_amount: 421,
    award_effective_date: '2026-01-01',
    letter_date: '2026-02-15'
  },
  'injection_test.txt': {
    employer_name: { re: /greenline logistics/i },
    employee_name: { re: /^Maria Alvarez$/ },
    pay_frequency: { re: /^Biweekly$/i },
    pay_date: '2026-07-10',
    gross_pay_current: 2145,
    gross_pay_ytd: 27885
  }
};

let correct = 0, abstained = 0, wrong = 0, total = 0;
const failures = [];

Object.keys(GOLD).forEach(function (file) {
  const text = fs.readFileSync(path.join(__dirname, '..', 'samples', file), 'utf8');
  const result = E.extractDocument(text);
  const byKey = {}; result.fields.forEach(f => byKey[f.key] = f.value);
  const gold = GOLD[file];
  Object.keys(gold).forEach(function (key) {
    total++;
    const got = byKey[key], want = gold[key];
    if (got == null) { abstained++; console.log('  ABSTAIN  ' + file + ' :: ' + key); return; }
    const match = want && want.re ? want.re.test(String(got).trim())
      : (typeof want === 'number' ? Number(got) === want : String(got).trim() === String(want));
    if (match) { correct++; }
    else { wrong++; failures.push(file + ' :: ' + key + ' — expected ' + (want.re || want) + ', got ' + JSON.stringify(got)); console.log('  WRONG    ' + file + ' :: ' + key + ' — expected ' + (want.re || want) + ', got ' + JSON.stringify(got)); }
  });
});

console.log('\nField-level accuracy on the sample corpus: ' + correct + '/' + total + ' fields correct, '
  + abstained + ' abstained, ' + wrong + ' wrong.');
if (wrong > 0) { console.log('Failures:\n  ' + failures.join('\n  ')); }
process.exit(wrong === 0 ? 0 : 1);
