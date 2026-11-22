// Đo bể luồng OCR (v2.0.99) với Tesseract THẬT trên ô cắt từ ảnh mẫu giả lập: tuần tự (dịch vụ cũ) so với bể 1/2/3 luồng.
// Chạy: node tests/perf/ocr-pool-bench.js   (không cần Electron; dữ liệu giả; in JSON)
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib"), os = require("os");
const APP = path.resolve(__dirname, "../..");
const TO = require(path.join(APP, "core/timesheet-ocr.js")), { createOcrService } = require(path.join(APP, "main/ocr-service.js")), { createOcrPool } = require(path.join(APP, "main/ocr-worker.js"));
function readGrayPNG(file) {
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0; const idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString("ascii", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len); if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } if (type === "IDAT") idat.push(d); p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (w + 1)], row = raw.subarray(y * (w + 1) + 1, (y + 1) * (w + 1)); for (let x = 0; x < w; x++) { const a = x ? g[y * w + x - 1] : 0, up = y ? g[(y - 1) * w + x] : 0, c = x && y ? g[(y - 1) * w + x - 1] : 0; let v = row[x]; if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; } g[y * w + x] = v & 255; } }
  return { g, w, h };
}
/** Thu các lô ô thật mà TO.analyze gửi cho OCR (để đo trên đúng loại ô của ứng dụng). */
async function collect(file) {
  const svc = createOcrService({ appDir: APP, tesseract: require(path.join(APP, "ocr/tesseract-compat.js"))(require("tesseract.js")) }), batches = [];
  const result = await TO.analyze(readGrayPNG(file), { ocr: (items) => { batches.push(items); return svc.batch(items); } });
  await svc.terminate(); return { batches, result };
}
const rss = () => Math.round(process.memoryUsage().rss / 1048576);
module.exports = { readGrayPNG, collect };
if (require.main === module) (async () => {
  const FIX = path.join(APP, "tests/fixtures/ocr"), { batches } = await collect(path.join(FIX, "bang-cham-cong-mau.png"));
  const once = [].concat(...batches), items = [].concat(once, once, once, once); // 4 trang: đủ việc để thấy song song (mỗi luồng khởi động Tesseract ~0,4 s)
  const digit = items.filter((x) => x.mode === "digit").length, out = { cpu: os.cpus().length, items: items.length, digit };
  const svc = createOcrService({ appDir: APP, tesseract: require(path.join(APP, "ocr/tesseract-compat.js"))(require("tesseract.js")) });
  await svc.selfTest(); await svc.batch(once.slice(0, 10)); let t = Date.now(); const base = await svc.batch(items); out.tuanTu_ms = Date.now() - t; await svc.terminate();
  for (const n of [1, 2, 3]) {
    const pool = createOcrPool({ appDir: APP, size: n }); await pool.batch(once.slice(0, 6 * n)); /* khởi động đủ n luồng trước khi đo */ t = Date.now();
    const r = await pool.batch(items); const ms = Date.now() - t;
    out["bể" + n] = { ms, giongTuanTu: JSON.stringify(r.map((x) => [x.text, x.conf])) === JSON.stringify(base.map((x) => [x.text, x.conf])), peakBusy: pool.stats().peakBusy, rssMB: rss() };
    await pool.terminate();
  }
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
