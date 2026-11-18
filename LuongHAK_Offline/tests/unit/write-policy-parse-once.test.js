// Đường ghi giai đoạn 1: bản cũ đọc + phân tích một lần; kết quả kiểm quyền không đổi; bản cũ không bị đột biến. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const { createPolicy, fileSig } = require("../../main/write-policy.js");
const PG = require("../../main/payroll-gate.js");
const { baseDb } = require("../fixtures/build.js");
const P = require("../../core/permissions.js");
const clone = (o) => JSON.parse(JSON.stringify(o));
const who = (user, role) => ({ user, perms: P.ROLES[role].perms.slice() });

function setup(polOpts, sigFn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wpo-")), file = path.join(dir, "data.json");
  const db = baseDb();
  db.nguoidung = [{ tenDangNhap: "admin", vaiTro: "admin", hash: "h", salt: "s", iter: 1, khoa: false }];
  db.nhanvien = [{ "Mã NV": "A", "Họ và tên": "An" }]; db.baomat = [{ khoiPhuc: "x" }]; db.auditlog = []; db.kyluong = []; db.kyluong_lichsu = [];
  fs.writeFileSync(file, JSON.stringify(db));
  const reads = { n: 0 };
  const pol = createPolicy(Object.assign({ readText: () => { reads.n++; return fs.readFileSync(file, "utf8"); }, sigOf: sigFn || fileSig(file), gate: PG }, polOpts || {}));
  return { db, file, pol, reads };
}

test("U-WPO-01: mỗi lần kiểm chỉ đọc bản cũ một lần (trước đây nhiều lần), kể cả khi đổi nhiều bảng", () => {
  const s = setup(), d = clone(s.db); d.nhanvien[0]["Họ và tên"] = "Sửa"; d.auditlog.push({ luc: "t", nguoi: "admin", thaoTac: "a" });
  const v = s.pol.check(JSON.stringify(d), who("admin", "admin"));
  assert.equal(v.ok, true); assert.ok(s.reads.n <= 1, "readText gọi " + s.reads.n + " lần");
});

test("U-WPO-02: kết quả có/không parsed giống hệt nhau (cho phép và từ chối), và bản cũ bị deep-freeze không gây lỗi", () => {
  const scenarios = [
    (d) => { d.nhanvien[0]["Họ và tên"] = "Sửa"; },
    (d) => { d.nguoidung[0].hash = "forged"; },
    (d) => { d.baomat = [{ khoiPhuc: "mine" }]; },
    (d) => { d.auditlog.push({ luc: "t", nguoi: "admin", thaoTac: "a" }); },
    (d) => { d.chamcong = (d.chamcong || []).concat([{ "Mã NV": "A", "Kỳ": "2026-09" }]); },
  ];
  for (const w of [null, who("admin", "admin")]) {
    for (const mod of scenarios) {
      const a = setup({ freezeOld: true }), b = setup({ freezeOld: true });
      const d1 = clone(a.db), d2 = clone(b.db); mod(d1); mod(d2);
      const t1 = JSON.stringify(d1), t2 = JSON.stringify(d2);
      assert.deepEqual(a.pol.check(t1, w), b.pol.check(t2, w, { parsed: JSON.parse(t2) }));
    }
  }
});

test("U-WPO-03: bản cũ được làm mới khi sig đổi và sau commit (kể cả sig không đổi); không dùng bản cũ cũ", () => {
  let sig = "a"; const s = setup({}, () => sig), admin = who("admin", "admin");
  const d1 = clone(s.db); d1.nguoidung[0].hash = "forged";
  assert.equal(s.pol.check(JSON.stringify(d1), admin).ok, true, "admin được đổi (bản cũ là gốc)");
  // ghi file ngoài app với sig KHÔNG đổi + commit → phải đọc lại
  fs.writeFileSync(s.file, JSON.stringify(d1)); s.pol.commit();
  const before = s.reads.n;
  const d2 = clone(d1); d2.nhanvien[0]["Họ và tên"] = "B";
  assert.equal(s.pol.check(JSON.stringify(d2), admin).ok, true);
  assert.ok(s.reads.n > before, "sau commit phải đọc lại bản cũ");
  // đổi sig → đọc lại
  fs.writeFileSync(s.file, JSON.stringify(Object.assign(clone(d2), { auditlog: [{ luc: "x", nguoi: "a", thaoTac: "b" }] }))); sig = "b";
  const n2 = s.reads.n; s.pol.check(JSON.stringify(d2), admin); assert.ok(s.reads.n > n2, "sig đổi → đọc lại");
});

test("U-WPO-04: văn bản không hợp lệ vẫn bị từ chối như cũ, có hoặc không có parsed", () => {
  const s = setup();
  assert.equal(s.pol.check("không phải json", null).ok, false);
  assert.match(s.pol.check("[1,2]", null).error, /không hợp lệ/);
  assert.match(s.pol.check("không phải json", null, { parsed: null }).error, /không hợp lệ/);
});

test("U-WPO-05: wiring main.js phân tích một lần và truyền parsed cho policy, kho năm, kho dữ liệu", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");
  assert.match(src, /policy\(\)\.check\(text, who, \{[^}]*parsed \}\)/);
  assert.match(src, /years\.checkWrite\(text,.*,parsed\)/);
  assert.match(src, /storage\.save\(text, parsed\)/);
});
