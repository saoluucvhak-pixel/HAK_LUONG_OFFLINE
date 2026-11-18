// Đo dung lượng gói Full Backup có/không có bản chụp SQLite ở dữ liệu GIẢ (300 / 5.000 / 10.000 NV) + thời gian tạo gói. Chạy: node docs/v2.0.38/do-dung-luong-goi.cjs
"use strict";
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const ROOT = path.resolve(__dirname, "../../LuongHAK_Offline");
const FB = require(ROOT + "/main/fullbackup.js"), { createSqliteStorage } = require(ROOT + "/main/sqlite-storage.js"), { regressionDataset } = require(ROOT + "/tests/fixtures/build.js");
const mb = (n) => (n / 1048576).toFixed(2);
console.log("| NV | data.sqlite (MB) | data.json (MB) | gói KHÔNG bản chụp (MB) | gói CÓ bản chụp (MB) | tăng (MB) | tăng (%) | tạo bản chụp (ms) | tạo gói có/không (ms) |\n|---|---|---|---|---|---|---|---|---|");
for (const n of (process.argv[2] ? [Number(process.argv[2])] : [300, 5000, 10000])) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-size-")), s = createSqliteStorage(dir, { exportDelayMs: 600000 }), d = regressionDataset(n);
  if (s.save(JSON.stringify(d)) !== true) throw new Error("không lưu được");
  const text = s.load().text, t0 = Date.now(), sn = s.snapshotForPackage(path.join(dir, "snap.sqlite")); const tSnap = Date.now() - t0;
  const t1 = Date.now(), plain = FB.create({ dataText: text, destDir: path.join(dir, "a") }), tPlain = Date.now() - t1;
  const t2 = Date.now(), withS = FB.create({ dataText: text, destDir: path.join(dir, "b"), sqliteSnapshot: sn }), tWith = Date.now() - t2;
  if (!plain.ok || !withS.ok || !withS.sqliteSnapshot) throw new Error("gói lỗi: " + JSON.stringify([plain.error, withS.error, withS.warnings]));
  console.log("| " + n + " | " + mb(fs.statSync(path.join(dir, "data.sqlite")).size) + " | " + mb(Buffer.byteLength(text)) + " | " + mb(plain.size) + " | " + mb(withS.size) + " | " + mb(withS.size - plain.size) + " | " + ((withS.size / plain.size - 1) * 100).toFixed(0) + "% | " + tSnap + " | " + tWith + "/" + tPlain + " |");
  s.close();
}
