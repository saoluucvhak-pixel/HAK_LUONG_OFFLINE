'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const rules = require('../../core/ocr-learning/rules.js');
const source = fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8');
const start = source.indexOf('  function ocrNum('), end = source.indexOf('  /** Sự kiện "chuỗi tên', start);
assert.ok(start > 0 && end > start, 'test the actual OCR-to-import preparation functions');
function prepare(page) {
  const context = { C: { ocrRules: rules, ocrLearn: { cellKey: () => 'demo-cell' } }, db: { nhanvien: [{ 'Mã NV': 'NV1' }] }, kyStr: () => '2026-02', nameEventOf: () => null };
  vm.createContext(context); vm.runInContext(source.slice(start, end), context);
  return JSON.parse(JSON.stringify(context.ocrRows([page])));
}
const line = vals => ({ ma: 'NV1', kind: 'Công', name: 'Người giả lập', vals });
const page = (lines, days = [1, 2]) => ({ name: 'DEMO.png', ky: '2026-02', days, lines });
test('OCR import gate preserves explicit zero and never creates zero for a blank', () => {
  const p = page([line({ 1: ' ', 2: '0' })]), before = JSON.stringify(p), result = prepare(p);
  assert.equal(result.chamcong.length, 1); assert.equal(result.chamcong[0]['02'], '0');
  assert.equal(Object.hasOwn(result.chamcong[0], '01'), false); assert.equal(JSON.stringify(p), before);
});
test('OCR import gate rejects duplicate or out-of-period day columns', () => {
  for (const days of [[1, 1], [1, 30]]) { const r = prepare(page([line({ 1: '1' })], days)); assert.equal(r.chamcong.length, 0); assert.ok(r.skip.length); }
});
test('OCR import gate does not import either duplicated employee row', () => {
  const r = prepare(page([line({ 1: '1' }), line({ 2: '1' })])); assert.equal(r.chamcong.length, 0); assert.equal(r.skip.length, 2);
});
test('OCR import gate skips invalid values but preserves a separate valid employee type', () => {
  const good = line({ 1: '0,5' }); good.kind = 'Tăng ca';
  const r = prepare(page([line({ 1: '0x10' }), good])); assert.equal(r.chamcong.length, 1); assert.equal(r.chamcong[0]['Hình thức công'], 'TC'); assert.equal(r.skip.length, 1);
});
test('OCR import gate carries total disagreement to explicit review, not an automatic correction', () => {
  const row = line({ 1: '1' }); row.src = { totals: { cong: 2 } };
  const r = prepare(page([row])); assert.equal(r.chamcong[0]['01'], '1'); assert.equal(r.review.length, 1);
});
