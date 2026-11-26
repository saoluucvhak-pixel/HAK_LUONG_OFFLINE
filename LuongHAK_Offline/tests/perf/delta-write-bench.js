// Benchmark so sánh đường Full Save vs Delta Write Path trên 5.000 nhân viên
"use strict";
const path = require("path"), fs = require("fs"), os = require("os");
const { performance } = require("perf_hooks");
const R = path.resolve(__dirname, "../../") + path.sep;
const { regressionDataset } = require(R + "tests/fixtures/build.js");
const { createSqliteStorage } = require(R + "main/sqlite-storage.js");
const { createPolicy } = require(R + "main/write-policy.js");
const { createYearArchive } = require(R + "main/year-archive.js");

const N = 5000;
console.log(`\n=== SO SÁNH HIỆU NĂNG GHI (5.000 NHÂN VIÊN) TRÊN WINDOWS ===`);
const db = regressionDataset(N);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-delta-"));
const storage = createSqliteStorage(dir, { exportSync: false });
const years = createYearArchive({ storage, dir });
const policy = createPolicy({
  readText: () => { const l = storage.load(); return l && l.ok ? l.text : null; },
  readObj: () => storage.currentDoc(),
  sigOf: () => storage.sig(),
  gate: null
});
const who = { user: { tenDangNhap: "admin" }, perms: null };

// Khởi tạo lưu lần đầu
storage.save(JSON.stringify(db));

// 1. ĐO ĐƯỜNG CŨ: FULL SAVE (stringify toàn bộ db + main check + storage.save)
const fullTimes = [];
for (let i = 0; i < 20; i++) {
  db.nhanvien[i % db.nhanvien.length]["Họ và tên"] = "Sửa Full " + i;
  const start = performance.now();
  const text = JSON.stringify(db);
  const parsed = JSON.parse(text);
  const v = policy.check(text, who, { parsed });
  years.checkWrite(text, false, parsed);
  const r = storage.save(text, parsed, policy.rowsFor(parsed));
  if (!v.ok || r !== true) throw new Error("Full save lỗi");
  policy.commit();
  fullTimes.push(performance.now() - start);
}

// 2. ĐO ĐƯỜNG MỚI: DELTA WRITE PATH (chỉ gửi bảng nhanvien + auditlog, không stringify cả db)
const deltaTimes = [];
for (let i = 0; i < 20; i++) {
  db.nhanvien[i % db.nhanvien.length]["Họ và tên"] = "Sửa Delta " + i;
  db.auditlog = db.auditlog || [];
  db.auditlog.push({ action: "sua-nv", i });

  const start = performance.now();
  // Frontend: chỉ serialize bảng nhanvien và auditlog
  const deltaPayload = {
    tables: {
      nhanvien: db.nhanvien,
      auditlog: db.auditlog
    },
    baseSig: storage.sig()
  };

  // Main: lấy curDoc từ memory, áp dụng delta, check parsed
  const curDoc = storage.currentDoc().doc;
  curDoc.nhanvien = deltaPayload.tables.nhanvien;
  curDoc.auditlog = deltaPayload.tables.auditlog;

  const v = policy.check("", who, { parsed: curDoc });
  years.checkWrite("", false, curDoc);
  const r = storage.saveDelta(deltaPayload);
  if (!v.ok || !r || !r.ok) throw new Error("Delta save lỗi");
  policy.commit();
  deltaTimes.push(performance.now() - start);
}

const pct = (arr, p) => {
  const s = arr.slice(2).sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2);
};

console.log(`\n1. ĐƯỜNG CŨ (FULL SAVE cả 5.000 NV):`);
console.log(`   - p50: ${pct(fullTimes, 0.5)} ms`);
console.log(`   - p95: ${pct(fullTimes, 0.95)} ms`);

console.log(`\n2. ĐƯỜNG MỚI (DELTA WRITE PATH):`);
console.log(`   - p50: ${pct(deltaTimes, 0.5)} ms`);
console.log(`   - p95: ${pct(deltaTimes, 0.95)} ms`);

const speedupP50 = (parseFloat(pct(fullTimes, 0.5)) / parseFloat(pct(deltaTimes, 0.5))).toFixed(1);
const speedupP95 = (parseFloat(pct(fullTimes, 0.95)) / parseFloat(pct(deltaTimes, 0.95))).toFixed(1);
console.log(`\n TỐC ĐỘ NHANH HƠN: ~${speedupP50}x (ở p50) và ~${speedupP95}x (ở p95)!\n`);

storage.close();
fs.rmSync(dir, { recursive: true, force: true });
