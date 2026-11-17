// Ứng viên SQLite: chuyển JSON → SQLite trên bản sao, đối chiếu, idempotent, quay lui, giao dịch ghi một dòng. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const E = require("../../engine.js");
const store = require("../../main/sqlite-store.js");
const M = require("../../main/sqlite-migrate.js");
const { fixture } = require("../fixtures/production-carry");

const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-sqlite-"));
function sample() {
  const d = fixture();
  d.nhanvien.push({ "Mã NV": "0005", "Họ và tên": "Nguyễn Thị Ánh – Đặng", "Trạng thái": "Đang làm việc", "Ghi chú": null, "Rỗng": "", "Âm": -12.5, "Lẻ": 0.1 + 0.2, "Số CCCD": "001234567890" });
  d.nhanvien.push({ _id: "n-fixed-1", "Mã NV": "0006", "Họ và tên": "Có _id" });
  d.settingsLike = { theme: "dark", nested: { a: [1, 2, { b: null }] } }; d.version = 7; d.nothing = null; d.label = "chuỗi 😀";
  return d;
}
function write(dir, data) { const f = path.join(dir, "data.json"); fs.writeFileSync(f, JSON.stringify(data)); return f; }

test("U-SQL-01 chuyển → ứng viên đạt integrity/foreign_key, dựng lại GIỐNG NGUỒN từng ký tự (số 0 đầu, Unicode, null, âm, số lẻ, thứ tự khóa)", () => {
  const dir = tmpdir(), src = write(dir, sample()), cand = path.join(dir, "cand.sqlite"), before = M.sha256(fs.readFileSync(src));
  const rep = M.migrate(src, cand);
  assert.equal(rep.state, "ready"); assert.equal(rep.alreadyDone, false); assert.ok(rep.tables.nhanvien.rows >= 5 && /^[0-9a-f]{64}$/.test(rep.tables.nhanvien.checksum));
  assert.equal(M.sha256(fs.readFileSync(src)), before, "file nguồn không bị đổi");
  const v = M.verifyFiles(cand, src); assert.deepEqual(v.problems, []); assert.equal(v.ok, true);
  const out = path.join(dir, "back.json"), ex = M.exportJson(cand, out);
  assert.equal(fs.readFileSync(out, "utf8"), fs.readFileSync(src, "utf8"), "xuất ngược == nguồn (đường quay lui khi chưa có ghi mới)"); assert.equal(ex.sha256, before);
  const back = JSON.parse(fs.readFileSync(out, "utf8")); assert.equal(back.nhanvien.find((r) => r["Mã NV"] === "0005")["Mã NV"], "0005");
  assert.ok(!fs.existsSync(cand + "-wal") && !fs.existsSync(cand + ".tmp"), "ứng viên đứng một mình, không còn -wal/.tmp");
});

test("U-SQL-02 chạy lại cùng nguồn không nhân bản; khác nguồn bị từ chối, không ghi đè", () => {
  const dir = tmpdir(), src = write(dir, sample()), cand = path.join(dir, "cand.sqlite");
  M.migrate(src, cand); const size = fs.statSync(cand).size, rows = () => { const db = store.open(cand, { readonly: true }); try { return db.prepare("SELECT COUNT(*) c FROM records").get().c; } finally { db.close(); } };
  const n = rows(), again = M.migrate(src, cand);
  assert.equal(again.alreadyDone, true); assert.equal(rows(), n); assert.equal(fs.statSync(cand).size, size);
  const d2 = sample(); d2.nhanvien.push({ "Mã NV": "0007", "Họ và tên": "Mới" }); fs.writeFileSync(src, JSON.stringify(d2));
  assert.throws(() => M.migrate(src, cand), /không ghi đè/);
});

test("U-SQL-03 dòng trùng y hệt và _id trùng: mỗi dòng một id riêng, KHÔNG gộp; trùng khóa nghiệp vụ được báo", () => {
  const dir = tmpdir(), d = sample(), dup = { "Kỳ": "2026-09", "Mã NV": "A", "Hình thức công": "BT", "01": "1" };
  d.chamcong = [dup, { ...dup }, { ...dup, "01": "0.5" }]; d.nhanvien = [{ _id: "x", "Mã NV": "A" }, { _id: "x", "Mã NV": "B" }];
  const src = write(dir, d), cand = path.join(dir, "c.sqlite"), rep = M.migrate(src, cand);
  assert.equal(rep.tables.chamcong.rows, 3); assert.equal(rep.duplicates.filter((x) => x.table === "chamcong").length, 2, "2 dòng trùng khóa Kỳ+Mã NV+Hình thức công được báo");
  const db = store.open(cand, { readonly: true });
  try { const ids = db.prepare("SELECT id FROM records WHERE tbl='chamcong'").all().map((r) => r.id); assert.equal(new Set(ids).size, 3); const nv = db.prepare("SELECT id FROM records WHERE tbl='nhanvien' ORDER BY pos").all().map((r) => r.id); assert.equal(new Set(nv).size, 2); }
  finally { db.close(); }
  assert.deepEqual(M.verifyFiles(cand, src).problems, []);
});

test("U-SQL-04 id ổn định khi đổi thứ tự dòng (không dùng chỉ số mảng làm khóa)", () => {
  const rows = [{ a: 1 }, { a: 2 }, { a: 3 }], ids = M.idsFor("t", rows), rev = M.idsFor("t", rows.slice().reverse());
  assert.deepEqual(ids.slice().sort(), rev.slice().sort());
});

test("U-SQL-05 số nguyên ngoài miền an toàn bị chặn, không tạo ứng viên", () => {
  const dir = tmpdir(), d = sample(); d.ungluong = [{ "Mã NV": "A", "Tạm ứng": 9007199254740993 }];
  const src = write(dir, d), cand = path.join(dir, "c.sqlite");
  assert.throws(() => M.migrate(src, cand), (e) => /vượt miền an toàn/.test(e.message) && e.report.state === "blocked");
  assert.ok(!fs.existsSync(cand) && !fs.existsSync(cand + ".tmp"));
});

test("U-SQL-06 lỗi giữa chừng không để lại ứng viên dở: file hỏng không phải JSON; ngắt trong giao dịch", () => {
  const dir = tmpdir(), bad = path.join(dir, "bad.json"), cand = path.join(dir, "c.sqlite"); fs.writeFileSync(bad, "{ không phải json");
  assert.throws(() => M.migrate(bad, cand), /không phải JSON hợp lệ/); assert.ok(!fs.existsSync(cand));
  const src = write(dir, sample()); const orig = store.tx; let boom = true;
  store.tx = (db, fn) => orig(db, () => { const out = fn(); if (boom && fn.toString().includes("putTop")) throw new Error("mất điện giả lập"); return out; });
  try { assert.throws(() => M.migrate(src, cand), /mất điện giả lập/); } finally { store.tx = orig; boom = false; }
  assert.ok(!fs.existsSync(cand) && !fs.existsSync(cand + ".tmp") && !fs.existsSync(cand + ".tmp-wal"), "không có ứng viên dở");
  assert.equal(M.migrate(src, cand).state, "ready", "chạy lại sau lỗi vẫn thành công");
});

test("U-SQL-07 PRAGMA có hiệu lực thật; schema mới hơn app bị từ chối; file lạ không ghi đè", () => {
  const dir = tmpdir(), f = path.join(dir, "s.sqlite"), db = store.open(f);
  assert.equal(store.migrate(db), store.SCHEMA_VERSION); assert.deepEqual(db.pragmas, { foreign_keys: 1, journal_mode: "wal", synchronous: 2, busy_timeout: 5000 });
  assert.ok(store.isHakStore(db)); db.exec("PRAGMA user_version = " + (store.SCHEMA_VERSION + 1)); store.close(db);
  assert.throws(() => store.open(f), /mới hơn app/);
  const other = path.join(dir, "other.sqlite"), { DatabaseSync } = store.driver(), x = new DatabaseSync(other); x.exec("CREATE TABLE t(a)"); x.close();
  const y = store.open(other); assert.equal(store.isHakStore(y), false); y.close();
});

test("U-SQL-08 ghi một dòng: chỉ ghi đúng dòng đó + audit cùng giao dịch; idempotency; revision lỗi thời; hoàn tác khi audit lỗi", () => {
  const dir = tmpdir(), src = write(dir, sample()), cand = path.join(dir, "c.sqlite"); M.migrate(src, cand);
  const db = store.open(cand), total = () => Number(db.prepare("SELECT total_changes() t").get().t);
  const target = db.prepare("SELECT id, rev FROM records WHERE tbl='nhanvien' LIMIT 1").get(), row = JSON.parse(db.prepare("SELECT json FROM records WHERE tbl='nhanvien' AND id=?").get(target.id).json);
  const t0 = total(), r1 = store.applyChange(db, { requestId: "REQ-1", actor: "hr", action: "sua", table: "nhanvien", upsert: [{ id: target.id, row: { ...row, "Ghi chú": "đã sửa" }, expectedRev: target.rev }] });
  const delta = total() - t0; assert.equal(r1.written, 1); assert.ok(delta <= 6, "chỉ vài thay đổi (1 dòng + audit + request), không quét cả hồ sơ: " + delta);
  const dup = store.applyChange(db, { requestId: "REQ-1", table: "nhanvien", upsert: [{ id: target.id, row: { ...row, "Ghi chú": "LẦN HAI" } }] });
  assert.equal(dup.duplicate, true); assert.equal(JSON.parse(db.prepare("SELECT json FROM records WHERE id=?").get(target.id).json)["Ghi chú"], "đã sửa", "bấm đúp/retry không ghi lại");
  assert.throws(() => store.applyChange(db, { requestId: "REQ-2", table: "nhanvien", upsert: [{ id: target.id, row, expectedRev: target.rev }] }), /đã được sửa ở nơi khác/);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM applied_requests").get().c, 1, "yêu cầu lỗi không được ghi nhận");
  db.exec("CREATE TRIGGER no_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT, 'audit hỏng'); END");
  assert.throws(() => store.applyChange(db, { requestId: "REQ-3", table: "nhanvien", upsert: [{ id: target.id, row: { ...row, "Ghi chú": "KHÔNG ĐƯỢC LƯU" } }] }), /audit hỏng/);
  assert.equal(JSON.parse(db.prepare("SELECT json FROM records WHERE id=?").get(target.id).json)["Ghi chú"], "đã sửa", "audit lỗi → hoàn tác cả dữ liệu, không báo thành công");
  store.close(db);
});

test("U-SQL-09 cùng engine: bảng lương từ JSON nguồn và từ dữ liệu xuất lại từ SQLite GIỐNG HỆT, từng nhân viên, mọi kỳ có chấm công", () => {
  const dir = tmpdir(), d = fixture(), src = write(dir, d), cand = path.join(dir, "c.sqlite"); M.migrate(src, cand);
  const out = path.join(dir, "back.json"); M.exportJson(cand, out); const back = JSON.parse(fs.readFileSync(out, "utf8"));
  const kys = [...new Set((d.chamcong || []).map((r) => r["Kỳ"]))]; assert.ok(kys.length >= 1);
  const HR = require("../../hr.js");
  for (const ky of kys) {
    const [y, m] = ky.split("-").map(Number), run = (db) => { const s = HR.staffForPayroll(db, y, m); return E.tinhBangLuong(Object.assign({}, db, { nhansu: s.list }), y, m, false).bangluong; };
    assert.deepEqual(run(back), run(JSON.parse(JSON.stringify(d))), "kỳ " + ky);
  }
});
