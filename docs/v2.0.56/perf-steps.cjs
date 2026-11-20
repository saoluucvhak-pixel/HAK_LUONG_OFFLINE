// Đo từng bước chuỗi ghi tiến trình chính (v2.0.56, 006). Chạy từ LuongHAK_Offline: REUSE=1 node --max-old-space-size=4096 ../docs/v2.0.56/perf-steps.cjs . 5000  (bỏ REUSE = đường cũ). Dữ liệu GIẢ.
"use strict";
const path = require("path"), fs = require("fs"), os = require("os");
const N = +(process.argv[3] || 5000), R = path.resolve(process.argv[2]) + path.sep;
const { regressionDataset } = require(R + "tests/fixtures/build.js");
const { createSqliteStorage } = require(R + "main/sqlite-storage.js");
const { createPolicy } = require(R + "main/write-policy.js");
const { createYearArchive } = require(R + "main/year-archive.js");
const db = regressionDataset(N), dir = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
const storage = createSqliteStorage(dir, { exportSync: false }), years = createYearArchive({ storage, dir });
const policy = createPolicy({ readText: () => { const l = storage.load(); return l && l.ok ? l.text : null; }, readObj: process.env.REUSE ? () => storage.currentDoc() : null, sigOf: () => storage.sig(), gate: null });
const who = { user: { tenDangNhap: "admin" }, perms: null };
storage.save(JSON.stringify(db));
const T = { stringify: [], parse: [], policy: [], years: [], save: [], total: [] };
const ms = (a) => Number(process.hrtime.bigint() - a) / 1e6;
for (let i = 0; i < 60; i++) {
  db.nhanvien[i % db.nhanvien.length]["Họ và tên"] = "Sửa " + i;
  let a = process.hrtime.bigint(); const text = JSON.stringify(db); T.stringify.push(ms(a));
  const a0 = process.hrtime.bigint();
  a = process.hrtime.bigint(); const parsed = JSON.parse(text); T.parse.push(ms(a));
  a = process.hrtime.bigint(); const v = policy.check(text, who, { parsed }); T.policy.push(ms(a));
  a = process.hrtime.bigint(); years.checkWrite(text, false, parsed); T.years.push(ms(a));
  a = process.hrtime.bigint(); const r = storage.save(text, parsed, process.env.REUSE ? policy.rowsFor(parsed) : null); T.save.push(ms(a));
  if (!v.ok || r !== true) throw new Error("lỗi " + (v.error || r));
  policy.commit(); T.total.push(ms(a0));
}
const pct = (arr, p) => { const s = arr.slice(3).sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
const out = {}; Object.keys(T).forEach((k) => { out[k] = pct(T[k], 0.5) + "/" + pct(T[k], 0.95); });
console.log(N, JSON.stringify(out)); storage.close();
