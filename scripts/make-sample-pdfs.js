/*
 * Generates synthetic sample PDFs from the .txt samples, dependency-free.
 * Each PDF is a minimal single-page document (Helvetica, one text run per
 * line) so pdf.js text extraction reproduces the .txt content faithfully.
 * Run: node scripts/make-sample-pdfs.js
 */
const fs = require('fs');
const path = require('path');

function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

function textToPdf(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const content = ['BT', '/F1 11 Tf', '14 TL', '72 720 Td']
    .concat(lines.map(function (l) { return '(' + esc(l) + ') Tj T*'; }))
    .concat(['ET']).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + Buffer.byteLength(content) + ' >>\nstream\n' + content + '\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach(function (body, i) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
  });
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n'
    + offsets.map(function (o) { return String(o).padStart(10, '0') + ' 00000 n \n'; }).join('')
    + 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf, 'binary');
}

const samplesDir = path.join(__dirname, '..', 'samples');
fs.readdirSync(samplesDir).filter(function (f) { return f.endsWith('.txt'); }).forEach(function (f) {
  const out = path.join(samplesDir, f.replace(/\.txt$/, '.pdf'));
  fs.writeFileSync(out, textToPdf(fs.readFileSync(path.join(samplesDir, f), 'utf8')));
  console.log('wrote ' + out);
});
