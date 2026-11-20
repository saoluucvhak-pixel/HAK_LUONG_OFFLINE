// T-37 (rà soát 5 agent): hai đột biến từng SỐNG SÓT qua bộ test — (m1) bỏ .toUpperCase() ở khóa "Hình thức công" của importer;
// (m4) cắt cụt phần chia kl / số người có mặt trong phân bổ sản lượng. Các ca dưới CHỐT hành vi hiện tại (không đổi mã nghiệp vụ). Dữ liệu giả.
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const IMP = require("../../core/importer.js"), PA = require("../../core/production-alloc.js");

test("U-MUT-01 (m1) khóa chấm công: 'bt' / 'BT' / ' Bt ' / trống cùng một khóa; 'OT' khác khóa", () => {
  const k = (ht) => IMP.keyOf("chamcong", { "Kỳ": "2026-10", "Mã NV": "NV1", "Hình thức công": ht });
  assert.equal(k("bt"), k("BT")); assert.equal(k(" Bt "), k("BT")); assert.equal(k(""), k("BT"));
  assert.notEqual(k("OT"), k("BT"));
});
test("U-MUT-02 (m1) nhập Excel 2 dòng 'bt' và 'BT' cùng NV cùng kỳ → coi là CÙNG một dòng (không thêm 2 dòng)", () => {
  const db = { chamcong: [{ "Kỳ": "2026-10", "Mã NV": "NV1", "Hình thức công": "BT", "01": 1 }], nhanvien: [{ "Mã NV": "NV1", "Họ và tên": "A" }], kyluong: [] };
  const p = IMP.plan(db, "chamcong", ["Kỳ", "Mã NV", "Hình thức công", "02"], [{ "Kỳ": "2026-10", "Mã NV": "NV1", "Hình thức công": "bt", "02": 1 }], { lockedPeriods: {}, mode: "merge" });
  assert.equal(p.summary.add || 0, 0, JSON.stringify(p.items.map((i) => i.action)));
});
const TO = { T1: [{ ma: "A", hoTen: "An" }, { ma: "B", hoTen: "Bình" }, { ma: "C", hoTen: "Cường" }], T7: "ABCDEFG".split("").map((x) => ({ ma: x, hoTen: "Người " + x })) };
const mem = (d, pb) => TO[pb] || null;
test("U-MUT-03 (m4) phiếu 10 tấn / 3 người có mặt → mỗi người đúng 10/3 tấn (không cắt cụt), tổng = 10", () => {
  const r = PA.allocate([{ phieu: 1, ngay: "2026-10-01", kl: 10, maPB: "T1", vang: "" }], mem);
  assert.equal(r.shares.length, 3); r.shares.forEach((s) => assert.equal(s.kl, 10 / 3));
  assert.ok(Math.abs(r.shares.reduce((a, s) => a + s.kl, 0) - 10) < 1e-9); assert.equal(r.unallocated, 0);
});
test("U-MUT-04 (m4) phiếu 12,345 tấn / 7 người → mỗi người 12,345/7; người vắng không nhận", () => {
  const r = PA.allocate([{ phieu: 2, ngay: "2026-10-01", kl: 12.345, maPB: "T7", vang: "" }], mem);
  r.shares.forEach((s) => assert.equal(s.kl, 12.345 / 7)); assert.ok(Math.abs(r.shares.reduce((a, s) => a + s.kl, 0) - 12.345) < 1e-9);
  const r2 = PA.allocate([{ phieu: 3, ngay: "2026-10-01", kl: 10, maPB: "T1", vang: "C" }], mem);
  assert.deepEqual(r2.shares.map((s) => [s.ma, s.kl]), [["A", 5], ["B", 5]]);
});
