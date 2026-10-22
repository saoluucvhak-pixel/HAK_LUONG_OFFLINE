// Umi-OCR làm ý kiến thứ hai cho ô số (main/umi-ocr.js): Tesseract thật + máy chủ Umi-OCR GIẢ LẬP trên 127.0.0.1.
// Máy chủ giả luôn đọc "0.5" → ô "0,5" của bảng mẫu phải AGREE, ô "1" phải DISAGREE kèm gợi ý; chữ Tesseract giữ nguyên.
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), http = require("node:http"), path = require("node:path"), fs = require("node:fs"), zlib = require("node:zlib");
const TO = require("../../core/timesheet-ocr.js");
const { createOcrService } = require("../../main/ocr-service.js");
const { createUmiClient } = require("../../main/umi-ocr.js");
const APP = path.resolve(__dirname, "../.."), FIX = path.join(APP, "tests/fixtures/ocr");

function readGrayPNG(file) {
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0; const idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString("ascii", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len); if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } if (type === "IDAT") idat.push(d); p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (w + 1)], row = raw.subarray(y * (w + 1) + 1, (y + 1) * (w + 1)); for (let x = 0; x < w; x++) { const a = x ? g[y * w + x - 1] : 0, up = y ? g[(y - 1) * w + x] : 0, c = x && y ? g[(y - 1) * w + x - 1] : 0; let v = row[x]; if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; } g[y * w + x] = v & 255; } }
  return { g, w, h };
}

test("I-UMI-01 ý kiến thứ hai đi tới từng ô của bảng: khác Tesseract → DISAGREE + gợi ý; giống → AGREE; số liệu bảng không đổi", { timeout: 240000 }, async () => {
  let calls = 0;
  const srv = http.createServer((rq, rs) => { let s = ""; rq.on("data", (d) => (s += d)); rq.on("end", () => { calls++; rs.end(JSON.stringify({ code: 100, data: [{ text: "0.5", score: 0.95, box: [[0, 0], [1, 0], [1, 1], [0, 1]], end: "" }] })); }); });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const svc = createOcrService({ appDir: APP, secondOpinion: createUmiClient({ port: srv.address().port }) });
  try {
    const r = await TO.analyze(readGrayPNG(path.join(FIX, "bang-cham-cong-mau.png")), { ocr: (i) => svc.batch(i) });
    const L = r.table.lines[0];
    assert.deepEqual(r.table.lines.map((l) => l.sum), [28.5, 20, 15]);          // Tesseract vẫn quyết định số liệu
    assert.equal(L.values[27], 0.5); assert.equal(L.cells[27].secondOpinion.status, "AGREE");
    assert.equal(L.values[1], 1); assert.deepEqual(L.cells[1].secondOpinion, { engine: "umi-ocr", status: "DISAGREE", text: "0,5", score: 0.95, offered: true });
    assert.ok(calls > 0);
  } finally { await svc.terminate(); await new Promise((c) => srv.close(c)); }
});

test("I-UMI-02 Umi-OCR không chạy: kết quả y như chỉ có Tesseract, ô ghi UNAVAILABLE", { timeout: 120000 }, async () => {
  const svc = createOcrService({ appDir: APP, secondOpinion: createUmiClient({ port: 1, timeoutMs: 500 }) });
  try {
    const r = await TO.analyze(readGrayPNG(path.join(FIX, "bang-cham-cong-mau.png")), { ocr: (i) => svc.batch(i) });
    assert.deepEqual(r.table.lines.map((l) => l.sum), [28.5, 20, 15]);
    assert.equal(r.table.lines[0].cells[1].secondOpinion.status, "UNAVAILABLE");
  } finally { await svc.terminate(); }
});
