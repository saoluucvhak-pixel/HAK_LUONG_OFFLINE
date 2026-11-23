"use strict";
// v2.1.4 — hợp đồng hết hạn thì KHÔNG trừ bảo hiểm từ tháng SAU (tháng hết hạn vẫn trừ), và rà soát nghỉ việc / hết hạn trước khi chốt kỳ.
// Không đổi engine.js / hr.js (khóa băm). Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const E = require("../../engine.js"), HR = require("../../hr.js"), LA = require("../../ui/leave-audit.js");
const PG = require("../../main/payroll-gate.js");
const { regressionDataset } = require("../fixtures/build.js");
const clone = (o) => JSON.parse(JSON.stringify(o));
const deps = { activeHD: HR.activeHD, soCong: (v) => E.tachCong(v).soCong };

function tinh(db, y, m, withRule) {
  const sp = HR.staffForPayroll(db, y, m); if (withRule) LA.applyExpiredNoBH(db, y, m, sp);
  const kq = E.tinhBangLuong(Object.assign({}, db, { nhansu: sp.list }), y, m, false);
  return { sp, kq, row: (ma) => kq.bangluong.find((r) => r["Mã NV"] === ma) };
}
function hetHan(db, ma, ngay) { Object.assign(db.hopdong.find((h) => h["Mã NV"] === ma), { "Hình thức HĐLĐ": "Xác định thời hạn", "Ngày hết hạn": ngay, "Ngày chấm dứt": "" }); }

test("U-LA-01 hết hạn 20/09/2026: tháng 9 VẪN trừ BH, tháng 10 KHÔNG trừ BH (và không truy thu)", () => {
  const db = clone(regressionDataset(30)); hetHan(db, "NV005", "2026-09-20");
  const t9 = tinh(db, 2026, 9, true), t10 = tinh(db, 2026, 10, true);
  assert.ok(t9.row("NV005")["BH trừ NLĐ"] > 0, "tháng hết hạn phải còn trừ BH");
  const r10 = t10.row("NV005"); assert.ok(r10, "vẫn có dòng lương theo công tháng 10");
  assert.equal(r10["BH trừ NLĐ"], 0); assert.equal(r10["KPCĐ trừ NLĐ"], 0); assert.equal(r10["Truy thu BH"], 0);
  assert.ok(r10["Tổng thu nhập"] > 0, "lương theo công không bị đổi");
  assert.ok(t10.sp.warn.some((w) => /NV005/.test(w) && /KHÔNG tính bảo hiểm/.test(w)));
});
test("U-LA-02 không có Ngày hết hạn hoặc hết hạn từ cuối tháng trở đi → không đổi gì (so với không áp quy tắc)", () => {
  const db = clone(regressionDataset(30)); hetHan(db, "NV005", "2026-10-31");
  const a = tinh(clone(db), 2026, 10, false), b = tinh(clone(db), 2026, 10, true);
  assert.deepEqual(b.kq.bangluong, a.kq.bangluong); assert.deepEqual(b.kq.bhxh, a.kq.bhxh);
  assert.equal(LA.applyExpiredNoBH(clone(db), 2026, 10, HR.staffForPayroll(db, 2026, 10)), 0);
});
test("U-LA-03 mốc đúng ngày: hết hạn 30/09 → T9 trừ, T10 không; hết hạn 01/10 → T10 vẫn trừ", () => {
  assert.equal(LA.hetHanTruocKy({ "Ngày hết hạn": "2026-09-30" }, 2026, 10), true);
  assert.equal(LA.hetHanTruocKy({ "Ngày hết hạn": "2026-09-30" }, 2026, 9), false);
  assert.equal(LA.hetHanTruocKy({ "Ngày hết hạn": "2026-10-01" }, 2026, 10), false);
  assert.equal(LA.hetHanTruocKy({ "Ngày hết hạn": "" }, 2026, 10), false);
});
test("U-LA-04 audit: nghỉ việc chưa có Ngày chấm dứt → chặn chốt; có công sau hết hạn → chỉ cảnh báo; có Ngày chấm dứt → không còn trong bảng lương", () => {
  const db = clone(regressionDataset(30));
  db.nhanvien.find((n) => n["Mã NV"] === "NV003")["Trạng thái"] = "Đã nghỉ việc"; hetHan(db, "NV003", "2026-09-30");
  hetHan(db, "NV005", "2026-09-30");
  const out = LA.audit(db, 2026, 10, deps), by = (ma) => out.filter((x) => x.ma === ma);
  assert.ok(by("NV003").some((x) => x.loai === "THIEU_NGAY_CHAM_DUT" && x.block));
  assert.ok(by("NV005").every((x) => !x.block) && by("NV005").some((x) => x.loai === "HET_HAN_CO_CONG"));
  db.hopdong.find((h) => h["Mã NV"] === "NV003")["Ngày chấm dứt"] = "2026-09-30";
  assert.equal(LA.audit(db, 2026, 10, deps).filter((x) => x.ma === "NV003").length, 0);
  assert.equal(HR.staffForPayroll(db, 2026, 10).list.some((x) => x["Mã nhân viên"] === "NV003"), false);
});
test("U-LA-05 hết hạn, không còn công, chưa chấm dứt → chặn chốt (KHONG_CONG_CON_LUONG)", () => {
  const db = clone(regressionDataset(30)); hetHan(db, "NV005", "2026-09-30");
  db.chamcong = db.chamcong.filter((r) => !(r["Mã NV"] === "NV005" && r["Kỳ"] === "2026-10"));
  assert.ok(LA.audit(db, 2026, 10, deps).some((x) => x.ma === "NV005" && x.loai === "KHONG_CONG_CON_LUONG" && x.block));
});
test("U-LA-06 cổng của tiến trình chính cũng chặn + cùng quy tắc không trừ BH", () => {
  const db = clone(regressionDataset(30)); db.nhanvien.find((n) => n["Mã NV"] === "NV003")["Trạng thái"] = "Đã nghỉ việc"; hetHan(db, "NV003", "2026-09-30"); hetHan(db, "NV005", "2026-09-30");
  const gate = PG.blockers(db, "2026-10", {});
  assert.ok(gate.some((b) => b.code === "NGHI_VIEC_CHUA_CHAM_DUT" && b.items.some((i) => /NV003/.test(i))), JSON.stringify(gate.map((b) => b.code)));
  const { kq } = PG.computeKy(db, "2026-10", {}), r4 = kq.bangluong.find((r) => r["Mã NV"] === "NV005");
  assert.equal(r4["BH trừ NLĐ"], 0);
});
