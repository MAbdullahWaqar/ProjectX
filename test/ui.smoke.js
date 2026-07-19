const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
// Inline engine.js and app.js so jsdom runs them without a network fetch.
html = html.replace('<script src="engine.js"></script>', () => '<script>' + engine + '</script>');
html = html.replace('<script src="app.js"></script>', () => '<script>' + app + '</script>');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => '');

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n)); };

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { document } = dom.window;

function click(id) { document.getElementById(id).dispatchEvent(new dom.window.Event('click')); }
function change(id) { document.getElementById(id).dispatchEvent(new dom.window.Event('change')); }
function setVal(id, v) { document.getElementById(id).value = v; }

setTimeout(() => {
  try {
    ok('app boots with Profile stage visible', !document.getElementById('stage-profile').hidden);

    // Structure & accessibility
    ok('page has exactly one h1 (the brand)', document.querySelectorAll('h1').length === 1 && /RealDoor/.test(document.querySelector('h1').textContent));
    ok('CSP meta tag present with script-src self', /script-src 'self'/.test((document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || ''));
    ok('passphrase input is type=password', document.getElementById('passphrase').type === 'password');
    ok('audit log has role=log', document.getElementById('auditLog').getAttribute('role') === 'log');
    ok('chatlog has role=log', document.getElementById('chatlog').getAttribute('role') === 'log');
    ok('Q&A form has role=search', document.getElementById('askForm').getAttribute('role') === 'search');
    ok('as-of field links its help and error via aria-describedby', /asOfErr/.test(document.getElementById('asOf').getAttribute('aria-describedby') || ''));

    // Onboarding shows on first run and dismisses
    ok('onboarding overlay visible on first run', !document.getElementById('onboarding').hidden);
    click('obSkip');
    ok('onboarding dismissed', document.getElementById('onboarding').hidden);

    // Invalid as-of date sets aria-invalid
    setVal('asOf', 'not-a-date'); change('asOf');
    ok('invalid as-of date flagged with aria-invalid', document.getElementById('asOf').getAttribute('aria-invalid') === 'true');
    setVal('asOf', '2026-07-19'); change('asOf');
    ok('valid as-of date clears aria-invalid', !document.getElementById('asOf').hasAttribute('aria-invalid'));

    // Extract blocked without consent
    setVal('pasteArea', document.querySelector('[data-sample="fresh"]') ? '' : '');
    click('extractBtn');
    ok('extraction blocked before consent', !document.getElementById('consentErr').hidden);

    // Consent + load fresh sample + extract
    document.getElementById('consentChk').checked = true; change('consentChk');
    document.querySelector('[data-sample="fresh"]').dispatchEvent(new dom.window.Event('click'));
    click('extractBtn');
    const evidence = document.querySelectorAll('#extractResult .evidence');
    ok('extraction renders evidence boxes', evidence.length >= 4);
    ok('extraction renders confidence meters', document.querySelectorAll('#extractResult .meter').length >= 4);

    // Confirm the document
    const confirmBtn = Array.from(document.querySelectorAll('#extractResult button')).find(b => /confirm/i.test(b.textContent));
    ok('confirm button present', !!confirmBtn);
    confirmBtn.dispatchEvent(new dom.window.Event('click'));
    ok('confirmed doc appears', /paystub/i.test(document.getElementById('confirmedDocs').textContent));

    // Add benefit letter
    document.getElementById('consentChk').checked = true; change('consentChk');
    document.querySelector('[data-sample="benefit"]').dispatchEvent(new dom.window.Event('click'));
    click('extractBtn');
    const cb2 = Array.from(document.querySelectorAll('#extractResult button')).find(b => /confirm/i.test(b.textContent));
    cb2.dispatchEvent(new dom.window.Event('click'));

    // Understand stage: household + income + limit
    document.querySelector('nav.stages [data-stage="understand"]').dispatchEvent(new dom.window.Event('click'));
    setVal('householdSize', '3'); change('householdSize');
    const incomeTxt = document.getElementById('incomeCalc').textContent;
    ok('income calc shows annual 60,822', /60,822/.test(incomeTxt));
    const limitTxt = document.getElementById('limitBox').textContent;
    ok('limit box shows official 60% AMI value 92,580', /92,580/.test(limitTxt));
    ok('limit box shows effective date 2026-05-01', /2026-05-01/.test(limitTxt));
    ok('limit box carries non-decision deflection', /does not determine eligibility/i.test(limitTxt));
    // Provenance panel renders real source
    document.querySelector('nav.stages [data-stage="understand"]').dispatchEvent(new dom.window.Event('click'));
    ok('provenance panel names HUD MTSP source', /HUD FY2026 Multifamily Tax Subsidy/i.test(document.getElementById('provenanceBody').textContent));
    ok('rent table shows deterministic 2BR 60% limit $2,314/mo', /2,314/.test(document.getElementById('rentBox').textContent));

    // Abstain when household cleared
    setVal('householdSize', ''); change('householdSize');
    ok('abstains without household size', /Abstaining/i.test(document.getElementById('limitBox').textContent));
    setVal('householdSize', '3'); change('householdSize');

    // Rules Q&A
    document.querySelector('[data-ask]').dispatchEvent(new dom.window.Event('click')); // income limit
    ok('Q&A renders a cited answer', /Cited answer/i.test(document.getElementById('chatlog').textContent));
    setVal('askInput', 'Am I eligible?');
    document.getElementById('askForm').dispatchEvent(new dom.window.Event('submit'));
    ok('decision question deflected in chat', /deflected/i.test(document.getElementById('chatlog').textContent));

    // Prepare stage: checklist + packet
    document.querySelector('nav.stages [data-stage="prepare"]').dispatchEvent(new dom.window.Event('click'));
    const chkTxt = document.getElementById('checklist').textContent;
    ok('checklist marks income verification present', /Income verification/i.test(chkTxt) && /present/i.test(chkTxt));
    ok('checklist marks photo ID missing', /photo ID/i.test(chkTxt) && /missing/i.test(chkTxt));
    // Progress indicator reflects required-item readiness
    ok('progress shows 1 of 5 required items ready', /1 of 5 required items ready/.test(document.getElementById('progressBox').textContent));
    ok('progress bar exposes role=progressbar with value', document.querySelector('#progressBox [role="progressbar"]').getAttribute('aria-valuenow') === '20');
    // Mark-as-present: self-attest the photo ID and confirm it flips to present
    const attId = 'att_photo_id';
    ok('photo ID has a self-attest control', !!document.getElementById(attId));
    document.getElementById(attId).checked = true; change(attId);
    const photoLi = Array.from(document.querySelectorAll('#checklist li')).find(li => /Government-issued photo ID/i.test(li.textContent));
    ok('photo ID flips to present after self-attest', !!photoLi && /present/i.test(photoLi.textContent) && !/missing/i.test(photoLi.textContent));
    ok('progress advances to 2 of 5 after self-attest', /2 of 5 required items ready/.test(document.getElementById('progressBox').textContent));
    click('previewBtn');
    const preview = document.getElementById('packetPreview').textContent;
    ok('packet preview includes non-decision disclaimer', /NOT an eligibility decision/i.test(preview));
    // Printable export renders the print sheet (renter-initiated)
    dom.window.print = function () {}; // jsdom has no real print dialog
    click('printBtn');
    const sheet = document.getElementById('printSheet').textContent;
    ok('print sheet renders packet with disclaimer', /NOT an eligibility decision/i.test(sheet));
    ok('print sheet includes the checklist statuses', /PRESENT/.test(sheet) && /MISSING/.test(sheet));

    // Consent withdrawal: unchecking blocks extraction and offers deletion of confirmed docs
    document.querySelector('nav.stages [data-stage="profile"]').dispatchEvent(new dom.window.Event('click'));
    document.getElementById('consentChk').checked = false; change('consentChk');
    ok('consent withdrawal surfaces a deletion offer for confirmed docs', /Consent withdrawn/i.test(document.getElementById('consentWithdrawn').textContent) && /Delete confirmed documents/i.test(document.getElementById('consentWithdrawn').textContent));
    document.getElementById('consentChk').checked = true; change('consentChk');
    ok('re-consenting clears the withdrawal notice', document.getElementById('consentWithdrawn').textContent === '');

    // Post-confirmation correction: edit a confirmed field and confirm downstream updates
    document.querySelector('nav.stages [data-stage="profile"]').dispatchEvent(new dom.window.Event('click'));
    const editId = 'edit_doc_1_gross_pay_current';
    const editInput = document.getElementById(editId);
    ok('confirmed document field is editable post-confirmation', !!editInput);
    editInput.value = '3000'; editInput.dispatchEvent(new dom.window.Event('change'));
    document.querySelector('nav.stages [data-stage="understand"]').dispatchEvent(new dom.window.Event('click'));
    ok('post-confirmation edit updates income (3000*26 + 421*12 = 83,052)', /83,052/.test(document.getElementById('incomeCalc').textContent));

    // Trust tests
    document.querySelector('nav.stages [data-stage="trust"]').dispatchEvent(new dom.window.Event('click'));
    click('testRefusal');
    ok('refusal test PASS', /PASS/.test(document.getElementById('testOutput').textContent) && /Refusal test/.test(document.getElementById('testOutput').textContent));
    click('testInjection');
    ok('injection test PASS', /PASS/.test(document.getElementById('testOutput').textContent) && /injection/i.test(document.getElementById('testOutput').textContent));
    click('testDelete');
    ok('deletion test PASS', /PASS/.test(document.getElementById('testOutput').textContent) && /deletion/i.test(document.getElementById('testOutput').textContent));

    // Audit log has entries but no raw doc content
    const logTxt = document.getElementById('auditLog').textContent;
    ok('audit log records actions', /session_started/.test(logTxt) && /document_confirmed/.test(logTxt));
    ok('audit log has no raw pay values or names', !/2,145\.00/.test(logTxt) && !/Maria Alvarez/.test(logTxt));
    ok('audit log has no derived financials (annual income)', !/60822/.test(logTxt) && !/83052/.test(logTxt));

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail === 0 ? 0 : 1);
  } catch (e) {
    console.error('THREW:', e && e.stack || e);
    process.exit(2);
  }
}, 200);
