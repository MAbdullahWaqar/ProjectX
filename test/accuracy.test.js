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
let stressCorrect = 0, stressAbstained = 0, stressWrong = 0, stressTotal = 0;
const failures = [];

function evalDoc(file, basePath, goldSet, isStress) {
  const wantGold = goldSet[file];
  if (wantGold === null) {
    const text = fs.readFileSync(path.join(basePath, file), 'utf8');
    const result = E.extractDocument(text);
    isStress ? stressTotal++ : total++;
    if (result.docType === 'unknown') {
      isStress ? stressCorrect++ : correct++;
    } else {
      isStress ? stressWrong++ : wrong++;
      failures.push(file + ' — expected unknown document, got ' + result.docType);
      console.log('  WRONG    ' + file + ' — expected unknown, got ' + result.docType);
    }
    return;
  }

  const text = fs.readFileSync(path.join(basePath, file), 'utf8');
  const result = E.extractDocument(text);
  const byKey = {}; result.fields.forEach(f => byKey[f.key] = f.value);
  Object.keys(wantGold).forEach(function (key) {
    isStress ? stressTotal++ : total++;
    const got = byKey[key], want = wantGold[key];
    if (want === null && got === null) {
       isStress ? stressCorrect++ : correct++;
       return;
    }
    if (got == null) { 
        isStress ? stressAbstained++ : abstained++; 
        console.log('  ABSTAIN  ' + file + ' :: ' + key); 
        return; 
    }
    if (want === null && got != null) {
       isStress ? stressWrong++ : wrong++;
       failures.push(file + ' :: ' + key + ' — expected abstain (null), got ' + JSON.stringify(got));
       console.log('  WRONG    ' + file + ' :: ' + key + ' — expected abstain, got ' + JSON.stringify(got));
       return;
    }
    let match = false;
    if (want && want.re) {
       const regex = typeof want.re === 'string' ? new RegExp(want.re, 'i') : want.re;
       match = regex.test(String(got).trim());
    } else {
       match = (typeof want === 'number' ? Number(got) === want : String(got).trim() === String(want));
    }
    if (match) { isStress ? stressCorrect++ : correct++; }
    else { 
        isStress ? stressWrong++ : wrong++; 
        failures.push(file + ' :: ' + key + ' — expected ' + (want.re || want) + ', got ' + JSON.stringify(got)); 
        console.log('  WRONG    ' + file + ' :: ' + key + ' — expected ' + (want.re || want) + ', got ' + JSON.stringify(got)); 
    }
  });
}

Object.keys(GOLD).forEach(f => evalDoc(f, path.join(__dirname, '..', 'samples'), GOLD, false));

const stressGold = require('./stress-gold.json');
Object.keys(stressGold).forEach(f => evalDoc(f, path.join(__dirname, '..', 'samples', 'stress'), stressGold, true));

const allCorrect = correct + stressCorrect;
const allTotal = total + stressTotal;
const allAbstained = abstained + stressAbstained;
const allWrong = wrong + stressWrong;

console.log('\n--- Field-level Accuracy ---');
console.log('Base corpus:   ' + correct + '/' + total + ' fields correct, ' + abstained + ' abstained, ' + wrong + ' wrong.');
console.log('Stress corpus: ' + stressCorrect + '/' + stressTotal + ' fields correct, ' + stressAbstained + ' abstained, ' + stressWrong + ' wrong.');
console.log('Combined:      ' + allCorrect + '/' + allTotal + ' fields correct, ' + allAbstained + ' abstained, ' + allWrong + ' wrong.');

if (allWrong > 0) { console.log('Failures:\n  ' + failures.join('\n  ')); }
process.exit(allWrong === 0 ? 0 : 1);
