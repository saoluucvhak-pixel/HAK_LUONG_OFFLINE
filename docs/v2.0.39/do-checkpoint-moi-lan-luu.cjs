// Đo chi phí của phương án C (kịch bản 6c, issue #91): `PRAGMA wal_checkpoint(TRUNCATE)` sau MỖI lần lưu so với hành vi hiện tại (WAL tự checkpoint).
// KHÔNG sửa `main/`: phương án C được mô phỏng bằng cách bọc `store.tx` (chạy giao dịch thật rồi checkpoint). Dữ liệu GIẢ.
// Chạy: node docs/v2.0.39/do-checkpoint-moi-lan-luu.cjs [số NV=5000] [số lần lưu=120] [số vòng=3]
"use strict";
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const ROOT = path.resolve(__dirname, "../../LuongHAK_Offline");
const store = require(ROOT + "/main/sqlite-store.js"), { createSqliteStorage } = require(ROOT + "/main/sqlite-storage.js"), { regressionDataset } = require(ROOT + "/tests/fixtures/build.js");
const N = +process.argv[2] || 5000, SAVES = +process.argv[3] || 120, ROUNDS = +process.argv[4] || 3;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const realTx = store.tx;
function run(variant) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-ckpt-")), s = createSqliteStorage(dir, { exportDelayMs: 600000 }), d = regressionDataset(N);
  if (s.save(JSON.stringify(d)) !== true) throw new Error("không lưu được dữ liệu ban đầu");
  store.tx = variant === "C" ? (db, fn) => { const r = realTx(db, fn); db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); return r; } : realTx;
  const small = [], big = [];
  try {
    for (let i = 0; i < SAVES; i++) {
      const rows = i % 10 === 9 ? 50 : 1; for (let k = 0; k < rows; k++) d.nhanvien[(i * 37 + k * 101) % d.nhanvien.length]["Ghi chú đo"] = "lần " + i + "/" + k;
      const text = JSON.stringify(d), t0 = process.hrtime.bigint(), r = s.save(text), ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (r !== true) throw new Error(String(r)); (rows === 1 ? small : big).push(ms);
    }
  } finally { store.tx = realTx; }
  const wal = fs.existsSync(path.join(dir, "data.sqlite-wal")) ? fs.statSync(path.join(dir, "data.sqlite-wal")).size : 0;
  s.close(); return { small, big, wal };
}
const acc = { A: { small: [], big: [], wal: [] }, C: { small: [], big: [], wal: [] } };
for (let r = 0; r < ROUNDS; r++) for (const v of (r % 2 ? ["C", "A"] : ["A", "C"])) { const x = run(v); acc[v].small.push(...x.small); acc[v].big.push(...x.big); acc[v].wal.push(x.wal); }
const f = (n) => n.toFixed(1);
console.log("Dữ liệu giả " + N + " NV · " + SAVES + " lần lưu/vòng · " + ROUNDS + " vòng (xen kẽ A/C) · mỗi 10 lần có 1 lần sửa 50 dòng, còn lại sửa 1 dòng\n");
console.log("| phương án | lần lưu sửa 1 dòng p50 / p95 / max (ms) | lần sửa 50 dòng p50 / p95 / max (ms) | cỡ -wal cuối vòng (KB) |\n|---|---|---|---|");
for (const v of ["A", "C"]) console.log("| " + (v === "A" ? "A: hiện tại (WAL tự checkpoint)" : "C: checkpoint(TRUNCATE) mỗi lần lưu") + " | " + [pct(acc[v].small, .5), pct(acc[v].small, .95), Math.max(...acc[v].small)].map(f).join(" / ") + " | " + [pct(acc[v].big, .5), pct(acc[v].big, .95), Math.max(...acc[v].big)].map(f).join(" / ") + " | " + acc[v].wal.map((b) => Math.round(b / 1024)).join(", ") + " |");
console.log("\nTăng p50 (1 dòng): +" + f(pct(acc.C.small, .5) - pct(acc.A.small, .5)) + " ms · p95: +" + f(pct(acc.C.small, .95) - pct(acc.A.small, .95)) + " ms. Hệ điều hành/đĩa của máy chạy: " + os.platform() + " " + os.release() + " (đĩa CI/ổ SSD/HDD thật sẽ khác — xem phần chưa kiểm).");
