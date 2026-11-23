// v2.1.5 — thư mục sao lưu SQLite chọn được (khóa cài đặt `sqliteDir`): bản chụp vẫn ghi trong thư mục dữ liệu TRƯỚC, rồi chép có kiểm SHA-256 sang thư mục đã chọn;
// thư mục mất kết nối chỉ báo lỗi (không mất bản trong thư mục dữ liệu, không chặn sao lưu). Dữ liệu giả, fs thật.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { fixture } = require("../fixtures/production-carry");

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const snaps = (d) => { try { return fs.readdirSync(d).filter((x) => /^snap_.*\.sqlite$/.test(x)).sort(); } catch (e) { return []; } };
function fresh() { const dir = tmp("hak-sqd-"), s = createSqliteStorage(dir, { exportDelayMs: 600000 }); assert.equal(s.save(JSON.stringify(JSON.parse(JSON.stringify(fixture())))), true); return { dir, s }; }

test("U-SQD-01 đã chọn thư mục SQLite → mỗi lần sao lưu chép bản mới nhất + lịch sử sang đó, SHA-256 khớp bản trong thư mục dữ liệu", () => {
  const { s } = fresh(), sd = tmp("hak-sqd-out-");
  s.writeSettings(Object.assign({}, s.readSettings(), { sqliteDir: sd }));
  assert.ok(s.backup("thu"), "sao lưu phải thành công");
  const local = snaps(s.backupDir), out = snaps(sd);
  assert.ok(local.length >= 1 && out.length >= 1, "có bản chụp ở cả hai nơi");
  assert.equal(sha(path.join(sd, out[out.length - 1])), sha(path.join(s.backupDir, out[out.length - 1])), "SHA-256 từng bản khớp");
  assert.equal(sha(path.join(sd, "data-snapshot.sqlite")), sha(path.join(s.backupDir, "data-snapshot.sqlite")));
  assert.equal(s.snapshotStatus().sqliteDir, sd);
  assert.equal(s.snapshotStatus().lastError, "");
});
test("U-SQD-02 không chọn thư mục → hành vi cũ (chỉ thư mục dữ liệu), sqliteDir rỗng", () => {
  const { s } = fresh(); assert.ok(s.backup("thu"));
  assert.equal(s.snapshotStatus().sqliteDir, ""); assert.ok(snaps(s.backupDir).length >= 1);
});
test("U-SQD-03 thư mục đã chọn mất kết nối → báo lỗi trên giao diện, bản trong thư mục dữ liệu VẪN có, sao lưu JSON vẫn thành công", () => {
  const { s } = fresh(), gone = path.join(tmp("hak-sqd-gone-"), "khong-co");
  s.writeSettings(Object.assign({}, s.readSettings(), { sqliteDir: gone }));
  const r = s.backup("thu"); assert.ok(r, "sao lưu JSON không bị chặn");
  assert.ok(snaps(s.backupDir).length >= 1 && fs.existsSync(path.join(s.backupDir, "data-snapshot.sqlite")), "bản trong thư mục dữ liệu còn");
  assert.match(s.snapshotStatus().lastError, /thư mục SQLite đã chọn/);
  assert.equal(fs.existsSync(gone), false, "không tự tạo thư mục mất kết nối");
});
test("U-SQD-04 nhiều lần sao lưu: thư mục đã chọn được dọn theo cùng quy tắc giữ bản (không phình vô hạn)", () => {
  const { s } = fresh(), sd = tmp("hak-sqd-out-");
  s.writeSettings(Object.assign({}, s.readSettings(), { sqliteDir: sd }));
  for (let i = 0; i < 14; i++) { assert.equal(s.save(JSON.stringify(Object.assign(JSON.parse(JSON.stringify(fixture())), { _n: i }))), true); assert.ok(s.backup("thu")); }
  const n = snaps(sd).length, nLocal = snaps(s.backupDir).length; assert.ok(n < 15 && n >= 1, "thư mục chọn: " + n + " / thư mục dữ liệu: " + nLocal); assert.ok(n <= nLocal, "không nhiều hơn bản gốc: " + n + " vs " + nLocal);
});
