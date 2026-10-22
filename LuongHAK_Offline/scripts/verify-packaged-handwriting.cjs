'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const asar = require('@electron/asar');
const archive = path.resolve(process.argv[2] || 'dist/win-unpacked/resources/app.asar');
const code = asar.extractFile(archive, 'main/handwritten-digits.js').toString('utf8');
const outside = path.join(archive + '.unpacked', 'ocr', 'models', 'mnist-cnn.json');
const modelBytes = fs.existsSync(outside) ? fs.readFileSync(outside) : asar.extractFile(archive, 'ocr/models/mnist-cnn.json');
const model = JSON.parse(modelBytes.toString('utf8'));
const context = { module: { exports: {} }, Buffer };
vm.createContext(context); vm.runInContext(code, context);
const recognizer = context.module.exports.create(model);
const fixture = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../tests/fixtures/handwriting/mnist-test-100.json.gz'))));
for (const sample of fixture.samples) {
  const result = recognizer.classify(Float32Array.from(Buffer.from(sample.pixels, 'base64'), x => x / 255));
  assert.equal(Number(result.text), sample.logits.indexOf(Math.max(...sample.logits)));
}
console.log('PASS packaged offline handwriting CNN: model and runtime present; 100 ONNX reference cases match');
for (const digit of [0, 1]) {
  const choose = label => fixture.samples.find(s => s.label === label && recognizer.recognize({ w: 28, h: 28, data: Uint8Array.from(Buffer.from(s.pixels, 'base64'), x => 255 - x) }).status === 'CANDIDATE');
  const w = 76, h = 40, data = new Uint8Array(w * h).fill(255);
  for (const [sample, offset] of [[choose(digit), 2], [choose(5), 44]]) {
    const pixels = Buffer.from(sample.pixels, 'base64');
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) data[(y + 3) * w + x + offset] = 255 - pixels[y * 28 + x];
  }
  for (let y = 25; y < 29; y++) for (let x = 35; x < 37; x++) data[y * w + x] = 0;
  const result = recognizer.recognize({ w, h, data });
  assert.equal(result.text, digit + ',5'); assert.equal(result.status, 'CANDIDATE'); assert.equal(result.verified, false);
}
console.log('PASS packaged separated decimal proposals: 0,5 and 1,5 remain unverified');
// Exercise the real packaged Electron process too, including its unpacked-resource paths.
const os = require('node:os'), child = require('node:child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hak-cnn-packaged-'));
const reportPath = path.join(temp, 'ocr-selftest.json');
const executable = path.resolve(path.dirname(archive), '..', 'Tinh Luong HAK.exe');
const run = child.spawnSync(executable, [], {
  env: { ...process.env, HAK_OCR_SELFTEST: reportPath, HAK_USER_DATA: temp, HAK_NO_SHELL: '1' },
  windowsHide: true, timeout: 120000, encoding: 'utf8',
});
assert.equal(run.status, 0, 'packaged OCR self-test failed: ' + (run.error || run.stderr || ''));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert.equal(report.packaged, true);
assert.equal(report.handwriting && report.handwriting.model, model.id, 'packaged OCR service could not load the bundled CNN');
assert.notEqual(report.handwriting.status, 'UNAVAILABLE');
console.log('PASS frozen Electron OCR service loads the offline CNN from its installed resource layout');
