"use strict";
// Q3 (chủ chọn "đo thử C", 24/11/2026): chi phí của phương án C = checkpoint(TRUNCATE) sau MỖI lần lưu so với hiện tại, ở 300 / 1.000 / 5.000 nhân viên.
// Chỉ ĐO, không đổi sản phẩm. Dữ liệu giả. Chạy: node tests/perf/wal-checkpoint-bench.js [lần lặp]
const fs = require("fs"), os = require("os"), path = require("path");
const { createSqliteStorage } = require("../../main/sqlite-storage.js"), store = require("../../main/sqlite-store.js");
const F = require("../fixtures/build.js");
const REP = Number(process.argv[2]) || 15;
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p95 = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)]; };
function run(N, withCheckpoint) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "walb-")), db = F.regressionDataset(N); db.schemaVersion = 2;
  const s = createSqliteStorage(D, { exportDelayMs: 600000 });
  if (!s.save(JSON.stringify(db))) throw new Error("không lưu được lần đầu");
  let side = null; if (withCheckpoint) side = store.open(path.join(D, "data.sqlite"));
  const times = [];
  for (let i = 0; i < REP; i++) {
    db.nhanvien[i % db.nhanvien.length]["Ghi chú"] = "lần " + i + " " + Date.now();
    const text = JSON.stringify(db), t0 = process.hrtime.bigint();
    const ok = s.save(text); if (withCheckpoint) side.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    times.push(Number(process.hrtime.bigint() - t0) / 1e6); if (!ok) throw new Error("lưu lỗi");
  }
  const walBytes = (() => { try { return fs.statSync(path.join(D, "data.sqlite-wal")).size; } catch (e) { return 0; } })();
  if (side) store.close(side); s.close(); return { med: med(times), p95: p95(times), walKB: Math.round(walBytes / 1024), recs: db.nhanvien.length };
}
const out = [];
for (const N of [300, 1000, 5000]) {
  const a = run(N, false), b = run(N, true);
  out.push({ nv: N, "hiện tại: trung vị ms": +a.med.toFixed(1), "p95 ms": +a.p95.toFixed(1), "+C: trung vị ms": +b.med.toFixed(1), "p95 ms (C)": +b.p95.toFixed(1), "chênh trung vị ms": +(b.med - a.med).toFixed(1), "WAL sau lưu (KB) hiện tại": a.walKB, "WAL (KB) với C": b.walKB });
}
console.table(out); console.log(JSON.stringify(out));
