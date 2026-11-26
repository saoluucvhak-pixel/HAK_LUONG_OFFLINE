"use strict";
// Q3 (chủ chọn "đo thử C", 24/11/2026): chi phí của phương án C = checkpoint(TRUNCATE) sau MỖI lần lưu so với tắt checkpoint, ở 300 / 1.000 / 5.000 nhân viên.
// Chỉ ĐO, không đổi sản phẩm. Dữ liệu giả. Chạy: node tests/perf/wal-checkpoint-bench.js [lần lặp]
const fs = require("fs"), os = require("os"), path = require("path");
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const F = require("../fixtures/build.js");
const REP = Number(process.argv[2]) || 15;
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p95 = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)]; };
function run(N, withCheckpoint, heldReader) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "walb-")), db = F.regressionDataset(N); db.schemaVersion = 2;
  const s = createSqliteStorage(D, { exportDelayMs: 600000, checkpoint: withCheckpoint });
  let reader;
  try {
    if (s.save(JSON.stringify(db)) !== true) throw new Error("không lưu được lần đầu");
    if (heldReader) {
      reader = new (require("node:sqlite").DatabaseSync)(s.dbFile, { readOnly: true });
      reader.exec("BEGIN");
      reader.prepare("SELECT count(*) FROM records").get();
    }
    const times = [];
    for (let i = 0; i < REP; i++) {
      db.nhanvien[i % db.nhanvien.length]["Ghi chú"] = "lần " + i + " " + Date.now();
      const text = JSON.stringify(db), t0 = process.hrtime.bigint();
      const ok = s.save(text);
      times.push(Number(process.hrtime.bigint() - t0) / 1e6); if (ok !== true) throw new Error("lưu lỗi");
    }
    const walBytes = (() => { try { return fs.statSync(path.join(D, "data.sqlite-wal")).size; } catch (e) { return 0; } })();
    return { med: med(times), p95: p95(times), walKB: Math.round(walBytes / 1024), recs: db.nhanvien.length };
  } finally {
    if (reader) reader.close();
    s.close();
    fs.rmSync(D, { recursive: true, force: true });
  }
}
const out = [];
for (const N of [300, 1000, 5000]) {
  for (const heldReader of [false, true]) {
    const a = run(N, false, heldReader), b = run(N, true, heldReader);
    out.push({ nv: N, heldReader, "tắt checkpoint: trung vị ms": +a.med.toFixed(1), "p95 ms": +a.p95.toFixed(1), "bật checkpoint: trung vị ms": +b.med.toFixed(1), "p95 ms (C)": +b.p95.toFixed(1), "chênh trung vị ms": +(b.med - a.med).toFixed(1), "WAL sau lưu (KB) tắt checkpoint": a.walKB, "WAL (KB) với C": b.walKB });
  }
}
console.table(out); console.log(JSON.stringify(out));
