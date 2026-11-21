// P3.8 / T-30: File dữ liệu cũ thiếu bảng mới (vd. dm_congthuc_kiemthu) khi nâng cấp khởi tạo mảng rỗng []
// không được coi là thay đổi bảng đó lúc chưa đăng nhập (tránh toast đỏ "chưa đăng nhập (bảng dm_congthuc_kiemthu)").
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createPolicy, fileSig } = require("../../main/write-policy.js");
const PG = require("../../main/payroll-gate.js");
const { baseDb } = require("../fixtures/build.js");

function makeEnv(extra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-prelogin-"));
  const file = path.join(dir, "data.json");
  const db = baseDb();
  db.nguoidung = [{
    tenDangNhap: "nv1",
    vaiTro: "nhaplieu",
    hash: "h",
    salt: "s",
    iter: 1,
    khoa: false,
    dangNhapLuc: null
  }];
  db.baomat = [{ khoiPhuc: "x" }];
  db.auditlog = [{ luc: "t1", nguoi: "admin", thaoTac: "init" }];
  db.kyluong = [];
  db.kyluong_lichsu = [];
  delete db.dm_congthuc_kiemthu;
  Object.assign(db, extra || {});
  fs.writeFileSync(file, JSON.stringify(db));
  const pol = createPolicy({
    readText: () => fs.readFileSync(file, "utf8"),
    sigOf: fileSig(file),
    gate: PG
  });
  return { db, pol, file };
}

test("T-30.1 File cũ thiếu dm_congthuc_kiemthu: thêm bảng rỗng [] khi ghi dấu đăng nhập (who=null) không bị từ chối", () => {
  const { db, pol } = makeEnv();
  const next = JSON.parse(JSON.stringify(db));
  next.dm_congthuc_kiemthu = [];
  next.nguoidung[0].dangNhapLuc = "2026-11-20T10:00:00.000Z";
  next.auditlog.push({ luc: "t2", nguoi: "nv1", thaoTac: "Đăng nhập" });
  const res = pol.check(JSON.stringify(next), null);
  assert.equal(res.ok, true, "Mong đợi ok=true nhưng bị từ chối: " + (res.error || ""));
});

test("T-30.2 Chưa đăng nhập chèn dữ liệu thật vào bảng mới dm_congthuc_kiemthu vẫn bị chặn", () => {
  const { db, pol } = makeEnv();
  const next = JSON.parse(JSON.stringify(db));
  next.dm_congthuc_kiemthu = [{ "Mã tăng ca": "TC1", "Loại": "ca" }];
  const res = pol.check(JSON.stringify(next), null);
  assert.equal(res.ok, false);
  assert.match(res.error, /chưa đăng nhập/);
});

test("T-30.3 Chưa đăng nhập xóa sạch bảng dm_congthuc_kiemthu đã có dữ liệu trên đĩa vẫn bị chặn", () => {
  const { db, pol } = makeEnv({
    dm_congthuc_kiemthu: [{ "Mã tăng ca": "TC1", "Loại": "ca" }]
  });
  const next = JSON.parse(JSON.stringify(db));
  next.dm_congthuc_kiemthu = [];
  const res = pol.check(JSON.stringify(next), null);
  assert.equal(res.ok, false);
  assert.match(res.error, /chưa đăng nhập/);
});
