'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const asar = require('@electron/asar');
const archive = path.resolve(process.argv[2] || 'dist/win-unpacked/resources/app.asar');
const code = asar.extractFile(archive, 'main/handwritten-digits.js').toString('utf8');
const model = JSON.parse(asar.extractFile(archive, 'ocr/models/mnist-cnn.json').toString('utf8'));
const context = { module: { exports: {} }, Buffer };
vm.createContext(context); vm.runInContext(code, context);
const recognizer = context.module.exports.create(model);
const fixture = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../tests/fixtures/handwriting/mnist-test-100.json.gz'))));
for (const sample of fixture.samples) {
  const result = recognizer.classify(Float32Array.from(Buffer.from(sample.pixels, 'base64'), x => x / 255));
  assert.equal(Number(result.text), sample.logits.indexOf(Math.max(...sample.logits)));
}
console.log('PASS packaged offline handwriting CNN: model and runtime present; 100 ONNX reference cases match');
