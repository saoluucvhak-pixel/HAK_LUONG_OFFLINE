// 006 (hiệu năng lưu 5.000 NV): chuỗi ghi của tiến trình chính KHÔNG phân tích lại bản cũ sau mỗi lần lưu (dùng lại đối tượng kho SQLite đang giữ),
// và chuỗi JSON từng dòng tính một lần dùng chung cho kiểm quy tắc + so dòng SQLite. Kết quả kiểm và dữ liệu ghi phải GIỐNG HỆT đường cũ. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const { createPolicy } = require("../../main/write-policy.js");
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { createYearArchive } = require("../../main/year-archive.js");
const PG = require("../../main/payroll-gate.js");
const P = require("../../core/permissions.js");
const { baseDb } = require("../fixtures/build.js");
const clone = (o) => JSON.parse(JSON.stringify(o));
const admin = { user: { tenDangNhap: "admin", vaiTro: "admin" }, perms: P.ROLES.admin.perms.slice() };

function seed() {
  const db = baseDb(); db.nguoidung = [{ tenDangNhap: "admin", vaiTro: "admin", hash: "h", salt: "s", iter: 1, khoa: false }];
  db.nhanvien = [{ "Mã NV": "A", "Họ và tên": "An" }, { "Mã NV": "B", "Họ và tên": "Bình" }]; db.baomat = [{ khoiPhuc: "x" }]; db.auditlog = []; db.kyluong = []; db.kyluong_lichsu = [];
  return db;
}
function rig(withReuse) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spr-")), storage = createSqliteStorage(dir, { exportSync: false }), reads = { n: 0, years: 0 };
  const load0 = storage.load.bind(storage); storage.load = function () { reads.n++; return load0(); };
  const pol = createPolicy(Object.assign({ readText: () => { const l = storage.load(); return l && l.ok ? l.text : null; }, sigOf: () => storage.sig(), gate: PG },
    withReuse ? { readObj: () => storage.currentDoc && storage.currentDoc() } : {}));
  const years = createYearArchive({ storage, dir });
  const save = (db) => { const text = JSON.stringify(db), parsed = JSON.parse(text); const v = pol.check(text, admin, { parsed }); if (!v.ok) return v; if (storage.hasDataFile()) years.checkWrite(text, false, parsed); const r = storage.save(text, parsed, withReuse ? pol.rowsFor(parsed) : undefined); if (r === true) pol.commit(); return { ok: r === true, v }; };
  return { dir, storage, pol, years, reads, save };
}

test("U-SPR-01 kho SQLite có currentDoc(): đúng bản đang lưu, kèm sig hiện tại", () => {
  const r = rig(true), db = seed(); assert.equal(r.save(db).ok, true);
  assert.equal(typeof r.storage.currentDoc, "function", "thiếu storage.currentDoc");
  const c = r.storage.currentDoc(); assert.equal(c.sig, r.storage.sig()); assert.equal(JSON.stringify(c.doc), JSON.stringify(db));
});

test("U-SPR-02 sau lần lưu đầu, các lần lưu tiếp KHÔNG đọc/phân tích lại bản cũ (kiểm quy tắc + kho năm)", () => {
  const r = rig(true), db = seed(); assert.equal(r.save(db).ok, true); const n0 = r.reads.n;
  for (let i = 0; i < 3; i++) { db.nhanvien[0]["Họ và tên"] = "Sửa " + i; assert.equal(r.save(db).ok, true); }
  assert.equal(r.reads.n - n0, 0, "đọc lại bản cũ " + (r.reads.n - n0) + " lần trong 3 lần lưu");
});

test("U-SPR-03 kết quả kiểm (cho phép / từ chối) và dữ liệu ghi GIỐNG HỆT đường cũ", () => {
  const mods = [(d) => { d.nhanvien[0]["Họ và tên"] = "X"; }, (d) => { d.nguoidung[0].hash = "forged"; }, (d) => { d.nhanvien.push({ "Mã NV": "C", "Họ và tên": "Cường" }); },
    (d) => { d.nhanvien.splice(0, 1); }, (d) => { d.workflowSettings = [{ mode: "roles" }]; }, (d) => { d.chamcong = (d.chamcong || []).concat([{ "Mã NV": "A", "Kỳ": "2026-09", "Hình thức công": "BT", "01": 1 }]); }];
  const a = rig(false), b = rig(true), da = seed(), dbb = seed(); a.save(da); b.save(dbb);
  for (const m of mods) {
    const x = clone(da), y = clone(dbb); m(x); m(y);
    const ra = a.save(x), rb = b.save(y);
    assert.equal(!!ra.ok, !!rb.ok, "khác kết quả: " + JSON.stringify(ra).slice(0, 200) + " | " + JSON.stringify(rb).slice(0, 200));
    if (!ra.ok) assert.equal(ra.error || (ra.v && ra.v.error), rb.error || (rb.v && rb.v.error));
    assert.equal(a.storage.load().text, b.storage.load().text, "dữ liệu ghi khác nhau");
    if (ra.ok) { Object.assign(da, x); Object.keys(da).forEach((k) => { if (!(k in x)) delete da[k]; }); Object.assign(dbb, y); Object.keys(dbb).forEach((k) => { if (!(k in y)) delete dbb[k]; }); }
  }
});

test("U-SPR-04 chuỗi từng dòng của kiểm quy tắc ghép lại đúng bằng JSON.stringify(bảng) (cùng ý nghĩa so bảng như trước)", () => {
  const r = rig(true), db = seed(); const text = JSON.stringify(db), parsed = JSON.parse(text); r.pol.check(text, admin, { parsed });
  const rows = r.pol.rowsFor && r.pol.rowsFor(parsed);
  assert.ok(rows && Array.isArray(rows.nhanvien), "policy.rowsFor(parsed) phải trả chuỗi từng dòng để kho SQLite dùng lại");
  assert.equal("[" + rows.nhanvien.join(",") + "]", JSON.stringify(db.nhanvien));
  assert.equal(r.pol.rowsFor(JSON.parse(text)), null, "đối tượng khác → không trả (tránh dùng nhầm)");
});
