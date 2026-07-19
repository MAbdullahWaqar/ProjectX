/*
 * Builds realdoor-artifact.html: a single self-contained file for the
 * claude.ai Artifact host (which wraps it in <!doctype>/<head>/<body> and
 * serves it under a strict CSP that blocks external files).
 *
 * From the multi-file app it: inlines styles.css (minus the @font-face rules,
 * since the Inter woff2 files can't be fetched in the sandbox — the CSS falls
 * back to the system stack), inlines engine.js and app.js as <script> blocks,
 * and drops the CSP <meta> (the host provides its own; keeping script-src
 * 'self' would block the inlined scripts).
 *
 * PDF upload degrades gracefully in the artifact (see app.js) because
 * vendor/pdfjs can't be loaded there; text/sample flows are fully functional.
 * Run: node scripts/build-artifact.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let css = read('styles.css').replace(/@font-face\s*\{[^}]*\}\s*/g, '');
const engine = read('engine.js');
const app = read('app.js');

// Pull the <body> inner content out of index.html, stripping the script tags
// and anything the artifact host supplies itself.
let html = read('index.html');
let body = html.slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'));
body = body
  .replace(/\s*<script src="engine\.js"><\/script>/, '')
  .replace(/\s*<script src="app\.js"><\/script>/, '')
  .trim();

const out = [
  '<title>RealDoor — Application-Readiness Copilot</title>',
  '<style>',
  css.trim(),
  '</style>',
  '',
  body,
  '',
  '<script>' + engine + '</script>',
  '<script>' + app + '</script>',
  ''
].join('\n');

fs.writeFileSync(path.join(ROOT, 'realdoor-artifact.html'), out);
console.log('wrote realdoor-artifact.html (' + out.length + ' bytes)');
