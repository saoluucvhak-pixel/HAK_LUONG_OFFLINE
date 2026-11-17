"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const B = require("../../core/benefits.js");
const original = { id: "BH1", type: "ppe", date: "2026-10-20", period: "2026-10", status: "issued", reviewer: "boss", lines: [{ employee: "NV1", item: "GIAY", size: "40", quantity: 3, dept: "T1", deptName: "Tổ gốc", employeeName: "Nhân viên thử", itemName: "Giày", unit: "đôi" }] };
const adjustment = { id: "DC1", ref: "BH1", kind: "recall", at: "2026-10-31T18:00:00.000Z", by: "hr", reason: "Trả", lines: [{ employee: "NV1", item: "GIAY", size: "40", quantity: 1 }] };
const db = (adj) => ({ nhanvien: [], benefitPpeItems: [], benefitIssues: [original], benefitAdjustments: [adj] });
test("Thu hồi cũ 01:00 ngày 1/11 VN không lọt báo cáo ngày 31/10; giữ tháng hưởng và tổ gốc", () => {
  const data = db(adjustment);
  const nov = B.detailReport(data, { filters: { tu: "2026-11-01", den: "2026-11-30" } });
  assert.equal(nov.rows.length, 1);
  assert.equal(nov.rows[0]["Ngày giao dịch"], "2026-11-01");
  assert.equal(nov.rows[0]["Tháng hưởng"], "2026-10");
  assert.equal(nov.rows[0]["Tổ/Phòng ban tại ngày cấp"], "Tổ gốc");
  assert.match(nov.rows[0]["Ghi chú"], /2026-11-01 01:00/);
  assert.equal(B.detailReport(data, { filters: { tu: "2026-10-31", den: "2026-10-31" } }).rows.length, 0);
});
test("Ngày nghiệp vụ được chọn độc lập với giờ ghi nhận; không sửa phiếu gốc", () => {
  const data = db({ ...adjustment, date: "2026-11-02" }), before = JSON.stringify(data);
  assert.equal(B.adjustmentProblem(data, data.benefitAdjustments[0]), "");
  const rows = B.detailReport(data, { filters: { tu: "2026-11-02", den: "2026-11-02" } }).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0]["Ngày cấp gốc"], "2026-10-20");
  assert.equal(JSON.stringify(data), before);
});
test("Chặn ngày giao dịch rỗng, ngày không tồn tại và trước ngày cấp", () => {
  for (const date of ["", "2026-02-30", "2026-10-19"]) assert.match(B.adjustmentProblem(db(adjustment), { ...adjustment, date }), /Ngày giao dịch/);
});
test("Đổi cỡ qua năm mới: hai lượt cùng ngày VN, cùng tổ gốc", () => {
  const data = db({ ...adjustment, kind: "resize", at: "2026-12-31T18:00:00Z", to: [{ employee: "NV1", item: "GIAY", size: "41", quantity: 1 }] });
  const rows = B.detailReport(data, { filters: { tu: "2027-01-01", den: "2027-01-01" } }).rows;
  assert.equal(rows.length, 2); assert.deepEqual(rows.map(r => r["Số lượng"]), [1, 1]);
  assert.ok(rows.every(r => r["Tổ/Phòng ban tại ngày cấp"] === "Tổ gốc" && r["Ngày giao dịch"] === "2027-01-01"));
});
