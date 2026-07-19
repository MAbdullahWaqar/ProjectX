/*
 * End-to-end PDF ingestion test: sample PDF -> pdf.js text extraction ->
 * engine.pdfItemsToText -> the same regex extraction path as pasted text.
 * Run: node test/pdf.test.js
 */
const fs = require('fs');
const path = require('path');
const E = require('../engine.js');

let pass = 0, fail = 0;
function ok(name, cond) { cond ? (pass++, console.log('  PASS  ' + name)) : (fail++, console.log('  FAIL  ' + name)); }

async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', 'samples', file)));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    text += E.pdfItemsToText(content.items) + '\n';
  }
  return text;
}

(async function () {
  const freshText = await pdfToText('paystub_fresh.pdf');
  const fresh = E.extractDocument(freshText);
  const byKey = {}; fresh.fields.forEach(f => byKey[f.key] = f.value);
  ok('PDF pay stub detected as paystub', fresh.docType === 'paystub');
  ok('PDF gross pay = 2145', byKey.gross_pay_current === 2145);
  ok('PDF pay date = 2026-07-10', byKey.pay_date === '2026-07-10');
  ok('PDF YTD cross-check corroborates (same as .txt path)', fresh.reconcile.corroborated === true);

  const benefitText = await pdfToText('ssa_benefit_letter.pdf');
  const benefit = E.extractDocument(benefitText);
  const bKey = {}; benefit.fields.forEach(f => bKey[f.key] = f.value);
  ok('PDF benefit letter detected', benefit.docType === 'benefit');
  ok('PDF monthly benefit = 421', bKey.monthly_benefit_amount === 421);
  ok('PDF benefit cross-check corroborates', benefit.reconcile.corroborated === true);

  const injText = await pdfToText('injection_test.pdf');
  const inj = E.extractDocument(injText);
  ok('PDF with embedded instruction still flagged as injection', inj.injections.length >= 1);
  ok('PDF injection cannot force confidence to 100%', inj.fields.find(f => f.key === 'gross_pay_current').confidence < 1);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('THREW:', e && e.stack || e); process.exit(2); });
