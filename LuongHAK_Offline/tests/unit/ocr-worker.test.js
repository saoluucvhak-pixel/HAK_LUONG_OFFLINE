"use strict";
// v2.0.99 (PROMPT 4): bể luồng OCR ocr/ocr-worker.js — kiểm bằng dịch vụ giả (nhanh); OCR thật nằm ở tests/integration/ocr-pool.test.js.
const test = require("node:test"), assert = require("node:assert/strict");
const path = require("node:path");
const { createOcrPool, defaultSize } = require("../../ocr/ocr-worker.js");
const FAKE = path.join(__dirname, "../fixtures/fake-ocr-service.js");
const mk = (o) => createOcrPool(Object.assign({ appDir: path.join(__dirname, "../.."), serviceModule: FAKE, size: 3 }, o));
const items = (n, f) => Array.from({ length: n }, (_, i) => Object.assign({ text: "T" + i }, f ? f(i) : {}));

test("I-OCRW-01 kết quả giữ ĐÚNG thứ tự gửi vào dù các ô xong lệch thời gian", async () => {
  const p = mk(); try {
    const r = await p.batch(items(30, (i) => ({ delay: (30 - i) % 7 * 8 })));
    assert.deepEqual(r.map((x) => x.text), items(30).map((x) => x.text));
  } finally { await p.terminate(); }
});
test("I-OCRW-02 chạy song song thật: nhiều luồng cùng bận, ô được chia cho ≥ 2 luồng; 1 luồng thì tuần tự", async () => {
  const p = mk(); try {
    const t0 = Date.now(); const r = await p.batch(items(12, () => ({ delay: 120 }))), ms = Date.now() - t0;
    assert.ok(new Set(r.map((x) => x.thread)).size >= 2, "dùng ≥ 2 luồng"); assert.ok(p.stats().peakBusy >= 2, JSON.stringify(p.stats()));
    assert.ok(ms < 12 * 120 * 0.7, "song song phải nhanh hơn tuần tự rõ rệt: " + ms + " ms");
  } finally { await p.terminate(); }
  const one = mk({ size: 1 }); try { const r = await one.batch(items(4, () => ({ delay: 10 }))); assert.equal(new Set(r.map((x) => x.thread)).size, 1); assert.equal(one.stats().peakBusy, 1); } finally { await one.terminate(); }
});
test("I-OCRW-03 tiến độ: onProgress tăng dần tới đúng tổng", async () => {
  const p = mk(); try {
    const seen = []; await p.batch(items(10, () => ({ delay: 10 })), { onProgress: (d, t) => seen.push([d, t]) });
    assert.equal(seen.length, 10); assert.deepEqual(seen.map((x) => x[0]), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); assert.ok(seen.every((x) => x[1] === 10));
  } finally { await p.terminate(); }
});
test("I-OCRW-04 hủy: ngừng giao ô mới, báo OCR_CANCELLED, không treo; bể dùng lại được", async () => {
  const p = mk({ size: 2 }); try {
    let n = 0; const flag = { c: false };
    await assert.rejects(p.batch(items(40, () => ({ delay: 30 })), { shouldCancel: () => flag.c, onProgress: () => { if (++n === 3) flag.c = true; } }), /OCR_CANCELLED/);
    assert.ok(p.stats().done < 40, "không chạy hết lô sau khi hủy");
    const r = await p.batch(items(3)); assert.equal(r.length, 3);
  } finally { await p.terminate(); }
});
test("I-OCRW-05 lỗi một ô: lô báo lỗi đó (không treo, không nuốt)", async () => {
  const p = mk(); try {
    await assert.rejects(p.batch(items(6, (i) => (i === 2 ? { fail: "x" } : {}))), /lỗi giả lập x/);
    assert.equal((await p.batch(items(2))).length, 2, "bể vẫn dùng được sau lỗi");
  } finally { await p.terminate(); }
});
test("I-OCRW-06 luồng chết đột ngột giữa chừng: ô dở được làm lại ở luồng khác, kết quả vẫn đủ và đúng thứ tự", async () => {
  const p = mk({ size: 2 }); try {
    const mark = path.join(require("node:os").tmpdir(), "ocrw-crash-" + process.pid + "-" + Date.now()); // nhớ: chỉ chết đúng 1 lần
    const r = await p.batch(items(8, (i) => (i === 3 ? { crash: mark } : { delay: 15 }))); require("node:fs").rmSync(mark, { force: true });
    assert.deepEqual(r.map((x) => x.text), items(8).map((x) => x.text)); assert.ok(p.stats().retried >= 1, JSON.stringify(p.stats()));
  } finally { await p.terminate(); }
});
test("I-OCRW-07 ô làm luồng chết lần nào cũng chết: báo lỗi sau 2 lần thử, không lặp vô hạn", async () => {
  const p = mk({ size: 2 }); try { await assert.rejects(p.batch(items(3, (i) => (i === 1 ? { crashAlways: true } : {}))), /dừng đột ngột|Luồng OCR/); } finally { await p.terminate(); }
});
test("I-OCRW-08 không khởi động được luồng → tự chạy trực tiếp trong tiến trình hiện tại, vẫn đúng kết quả", async () => {
  const p = mk({ workerFile: path.join(__dirname, "khong-ton-tai.js") }); try {
    const r = await p.batch(items(5)); assert.deepEqual(r.map((x) => x.text), items(5).map((x) => x.text)); assert.equal(p.stats().fallback, true);
    assert.equal((await p.selfTest()).ok, true);
  } finally { await p.terminate(); }
});
test("I-OCRW-09 ý kiến thứ hai (Umi) vẫn ở tiến trình chính: luồng phụ gọi qua tin nhắn, trạng thái/bộ nhớ đệm không nhân đôi", async () => {
  let calls = 0; const so = { async read(png) { calls++; return { status: "OK", len: png.length }; } };
  const p = mk({ secondOpinion: so }); try {
    const r = await p.batch(items(4, () => ({ umi: true }))); assert.equal(calls, 4);
    assert.ok(r.every((x) => x.second && x.second.status === "OK" && x.second.len === 3));
  } finally { await p.terminate(); }
});
test("I-OCRW-10 selfTest chạy trong luồng phụ; terminate dừng sạch (không còn luồng, không treo)", async () => {
  const p = mk(); const s = await p.selfTest(); assert.ok(s.ok && s.thread > 0, JSON.stringify(s));
  await p.batch(items(3)); await p.terminate(); assert.equal(p.stats().threads, 0);
});
test("I-OCRW-11 nhiều lô gọi cùng lúc: mỗi lô nhận đúng kết quả của mình, không lẫn", async () => {
  const p = mk(); try {
    const [a, b, c] = await Promise.all([p.batch(items(6, (i) => ({ text: "A" + i, delay: 10 }))), p.batch(items(6, (i) => ({ text: "B" + i, delay: 5 }))), p.batch(items(6, (i) => ({ text: "C" + i })))]);
    assert.deepEqual(a.map((x) => x.text), [0, 1, 2, 3, 4, 5].map((i) => "A" + i)); assert.deepEqual(b.map((x) => x.text), [0, 1, 2, 3, 4, 5].map((i) => "B" + i)); assert.deepEqual(c.map((x) => x.text), [0, 1, 2, 3, 4, 5].map((i) => "C" + i));
  } finally { await p.terminate(); }
});
test("I-OCRW-12 số luồng mặc định: HAK_OCR_THREADS (1–8), nếu không thì min(nhân−1, 2) và ≥ 1", () => {
  const old = process.env.HAK_OCR_THREADS;
  try { process.env.HAK_OCR_THREADS = "5"; assert.equal(defaultSize(), 5); process.env.HAK_OCR_THREADS = "99"; const d = defaultSize(); assert.ok(d >= 1 && d <= 2); delete process.env.HAK_OCR_THREADS; assert.ok(defaultSize() >= 1 && defaultSize() <= 2); }
  finally { if (old === undefined) delete process.env.HAK_OCR_THREADS; else process.env.HAK_OCR_THREADS = old; }
});
test("I-OCRW-13 main.js dùng bể luồng và vẫn giữ lệnh ocr-cancel / ocr-progress / sanitizeOcrItems", () => {
  const src = require("node:fs").readFileSync(path.join(__dirname, "../../main.js"), "utf8");
  assert.match(src, /createOcrPool\(\{ appDir: __dirname, secondOpinion: ocrControl/); assert.match(src, /ocrSvc\(\)\.batch\(safe, \{ shouldCancel/);
  assert.match(src, /sanitizeOcrItems\(items\)/); assert.match(src, /"ocr-cancel"/); assert.match(src, /e\.sender\.send\("ocr-progress"/);
});
