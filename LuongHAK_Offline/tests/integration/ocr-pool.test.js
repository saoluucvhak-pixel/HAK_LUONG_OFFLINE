// OCR THẬT (Tesseract offline) qua bể luồng main/ocr-worker.js (v2.0.99): kết quả phải GIỐNG HỆT dịch vụ tuần tự và phân tích bảng chấm công vẫn đúng.
"use strict";
const test = require("node:test"), assert = require("node:assert");
const path = require("path");
const { readGrayPNG, collect } = require("../perf/ocr-pool-bench.js");
const TO = require("../../core/timesheet-ocr.js");
const { createOcrPool } = require("../../main/ocr-worker.js");
const APP = path.resolve(__dirname, "../.."), FIX = path.join(APP, "tests/fixtures/ocr");
let pool;
test.before(() => { pool = createOcrPool({ appDir: APP, size: 2 }); });
test.after(async () => { if (pool) await pool.terminate(); });

test("I-OCRP-01 selfTest trong luồng phụ đọc đúng '12'", { timeout: 120000 }, async () => {
  const r = await pool.selfTest(); assert.ok(r.ok && /12/.test(r.text), JSON.stringify(r));
});
test("I-OCRP-02 bảng in người × ngày qua bể 2 luồng: đúng tên, từng ngày, khớp Tổng công (như I-OCR-02) và bể dùng ≥ 2 luồng", { timeout: 180000 }, async () => {
  const r = await TO.analyze(readGrayPNG(path.join(FIX, "bang-cham-cong-mau.png")), { ocr: (items) => pool.batch(items) }), T = r.table;
  assert.strictEqual(r.period, "2026-09"); assert.strictEqual(T.layout, "A"); assert.strictEqual(T.days.length, 30);
  assert.deepStrictEqual(T.lines.map((l) => l.name), ["E2E Nhân Viên", "Phạm Minh Khoa", "Đỗ Thu Hằng"]);
  assert.deepStrictEqual(T.lines.map((l) => l.sum), [28.5, 20, 15]); assert.strictEqual(T.lines[0].values[27], 0.5);
  assert.ok(pool.stats().peakBusy >= 2, JSON.stringify(pool.stats()));
});
test("I-OCRP-03 cùng một lô ô: bể 2 luồng cho kết quả GIỐNG HỆT dịch vụ tuần tự (chữ + độ tin cậy, từng ô, đúng thứ tự)", { timeout: 240000 }, async () => {
  const { createOcrService } = require("../../main/ocr-service.js");
  const { batches } = await collect(path.join(FIX, "bang-cham-cong-mau.png")), items = [].concat(...batches);
  const svc = createOcrService({ appDir: APP, tesseract: require("../../ocr/tesseract-compat.js")(require("tesseract.js")) });
  try {
    const a = await svc.batch(items), b = await pool.batch(items);
    assert.strictEqual(b.length, items.length);
    assert.deepStrictEqual(b.map((x) => [x.text, x.conf]), a.map((x) => [x.text, x.conf]));
  } finally { await svc.terminate(); }
});
