// Đo chuỗi ghi của tiến trình chính (phân tích 1 lần → policy → kho năm → kho SQLite) ở 300 / 5.000 / 10.000 NV, kèm RSS và cỡ file. Dữ liệu GIẢ.
// Chạy: node docs/v2.0.34/perf-scale.cjs        (mỗi quy mô chạy trong tiến trình con riêng để RSS không lẫn nhau)
"use strict";
const path = require("path"), fs = require("fs"), os = require("os"), cp = require("child_process");
if (process.argv[2] === "child") {
  const N = +process.argv[3], R = path.resolve(__dirname, "../../LuongHAK_Offline") + path.sep;
  const { regressionDataset } = require(R + "tests/fixtures/build.js");
  const { createSqliteStorage } = require(R + "main/sqlite-storage.js");
  const { createPolicy } = require(R + "main/write-policy.js");
  const { createYearArchive } = require(R + "main/year-archive.js");
  const mb = (b) => Math.round(b / 1048576);
  let peak = 0; const rss = () => { peak = Math.max(peak, process.memoryUsage().rss); };
  const db = regressionDataset(N), dir = fs.mkdtempSync(path.join(os.tmpdir(), "scale-"));
  const storage = createSqliteStorage(dir, { exportSync: false }), years = createYearArchive({ storage, dir });
  const policy = createPolicy({ readText: () => { const l = storage.load(); return l && l.ok ? l.text : null; }, sigOf: () => storage.sig(), gate: null });
  const who = { user: { tenDangNhap: "admin" }, perms: null };
  const text0 = JSON.stringify(db); rss();
  let t = process.hrtime.bigint(); const first = storage.save(text0); const tFirst = Number(process.hrtime.bigint() - t) / 1e6; rss();
  if (first !== true) throw new Error("lưu lần đầu lỗi: " + first);
  t = process.hrtime.bigint(); storage.load(); const tLoad = Number(process.hrtime.bigint() - t) / 1e6; rss();
  const samples = [], ren = [];
  for (let i = 0; i < 25; i++) {
    db.nhanvien[i % db.nhanvien.length]["Họ và tên"] = "Sửa " + i;
    let a = process.hrtime.bigint(); const text = JSON.stringify(db); ren.push(Number(process.hrtime.bigint() - a) / 1e6);
    a = process.hrtime.bigint(); const parsed = JSON.parse(text); const v = policy.check(text, who, { parsed }); years.checkWrite(text, false, parsed); const r = storage.save(text, parsed);
    if (!v.ok || r !== true) throw new Error("không lưu được: " + (v.error || r));
    policy.commit(); samples.push(Number(process.hrtime.bigint() - a) / 1e6); rss();
  }
  const pct = (arr, p) => { const s = arr.slice(3).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
  const files = fs.readdirSync(dir).map((f) => [f, fs.statSync(path.join(dir, f)).size]).filter(([f]) => /^data\./.test(f));
  console.log(JSON.stringify({ N, docMB: +(text0.length / 1048576).toFixed(1), firstSaveMs: Math.round(tFirst), loadMs: Math.round(tLoad), mainChain: { p50: Math.round(pct(samples, 0.5)), p95: Math.round(pct(samples, 0.95)) }, rendererStringify: { p50: Math.round(pct(ren, 0.5)), p95: Math.round(pct(ren, 0.95)) }, rssPeakMB: mb(peak), files: files.map(([f, s]) => f + " " + mb(s) + "MB").join(", ") }));
  storage.close();
  // Tải nguội: mở lại kho từ đĩa (như khởi động app) trong CÙNG tiến trình để thấy thêm bộ nhớ
  const s2 = createSqliteStorage(dir, { exportSync: false }); t = process.hrtime.bigint(); const ld = s2.load(); const cold = Number(process.hrtime.bigint() - t) / 1e6; rss();
  if (!ld.ok) throw new Error("tải nguội lỗi: " + ld.error);
  console.log("COLD " + JSON.stringify({ N, coldLoadMs: Math.round(cold), rssPeakMB: mb(peak) })); s2.close(); process.exit(0);
}
const out = [];
for (const N of [300, 5000, 10000]) {
  const r = cp.spawnSync(process.execPath, ["--max-old-space-size=4096", __filename, "child", String(N)], { encoding: "utf8", timeout: 600000 });
  const line = (r.stdout || "").split("\n").filter((l) => l.startsWith("{")).pop(), cold = (r.stdout || "").split("\n").filter((l) => l.startsWith("COLD ")).pop();
  if (!line || !cold) { console.error("N=" + N + " lỗi:", r.stderr.slice(-400)); process.exit(1); }
  const o = JSON.parse(line); o.cold = JSON.parse(cold.slice(5)); out.push(o); console.log(line, cold);
}
console.log("\n| NV | Tài liệu | Lưu lần đầu | Tải nguội | Chuỗi ghi main p50 / p95 | Giao diện stringify p50 | RSS đỉnh (gồm tải nguội) | File |\n|---|---|---|---|---|---|---|---|");
for (const o of out) console.log("| " + o.N + " | " + o.docMB + " MB | " + o.firstSaveMs + " ms | " + o.cold.coldLoadMs + " ms | " + o.mainChain.p50 + " / " + o.mainChain.p95 + " ms | " + o.rendererStringify.p50 + " ms | " + o.cold.rssPeakMB + " MB | " + o.files + " |");
