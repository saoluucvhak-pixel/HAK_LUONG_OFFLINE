"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../../core/benefits");
const item = (quantity) => [{ code: "MILK", name: "Sữa", unit: "hộp", quantity }];
const db = {
  hopdong: [{ "Mã NV": "A", "Số HĐLĐ": "H1", "Ngày vào làm": "2026-10-10", "Ngày hết hạn": "2026-10-20" }],
  benefitStandards: [{ code: "S1", from: "2026-10-01", items: item(15) }, { code: "S2", from: "2026-10-01", items: item(30) }],
  benefitAssignments: [{ employee: "A", contract: "H1", code: "S1", from: "2026-10-01" },
    { employee: "A", contract: "H1", code: "S2", from: "2026-10-15" }]
};
test("Định mức theo số ngày hiệu lực, đổi giữa tháng và làm tròn một lần", () => {
  assert.equal(B.entitlement(db, "A", "2026-10")[0].allowance, 8);
  assert.deepEqual(B.entitlement(db, "A", "2026-11"), []);
});
test("Xem trước cấp phát trừ số đã cấp, loại phiếu nháp và báo vượt hoặc trùng", () => {
  const line = { employee: "A", item: "MILK", quantity: 3 };
  const data = { ...db, benefitIssues: [
    { id: "P1", period: "2026-10", status: "issued", lines: [line] },
    { id: "P2", period: "2026-10", status: "draft", lines: [line] }
  ] };
  const doc = { id: "P3", date: "2026-10-15", period: "2026-10", lines: [{ ...line, quantity: 6 }] };
  const preview = B.reviewIssue(data, doc);
  assert.equal(preview.entries[0].before, 5);
  assert.equal(preview.entries[0].after, -1);
  assert.match(preview.issues[0], /vượt định mức/);
  assert.match(B.reviewIssue(data, { ...doc, lines: [line, line] }).issues[0], /trùng nhân viên/);
  assert.match(B.reviewIssue(data, { ...doc, period: "2026-09" }).issues[0], /trùng tháng cấp/);
});
test("Bảo vệ sổ cấp phát theo chế độ một người và phân quyền", () => {
  const doc = { id: "P1", date: "2026-10-15", period: "2026-10", maker: "maker", status: "draft",
    lines: [{ employee: "A", item: "MILK", quantity: 4 }] };
  const maker = { user: "maker", perms: ["hr.edit", "hr.approve"] };
  const reviewer = { user: "reviewer", perms: ["hr.approve"] };
  const draft = { ...db, benefitIssues: [doc] };
  assert.equal(B.validateChanges("benefitIssues", db, draft, maker, "roles"), "");
  const issue = (user) => ({ ...db, benefitIssues: [{ ...doc, status: "issued", reviewer: user, confirmedAt: "2026-10-15T08:00:00.000Z" }] });
  assert.match(B.validateChanges("benefitIssues", draft, issue("maker"), maker, "roles"), /khác người lập/);
  assert.equal(B.validateChanges("benefitIssues", draft, issue("reviewer"), reviewer, "roles"), "");
  assert.equal(B.validateChanges("benefitIssues", draft, issue("maker"), { ...maker, perms: ["system.admin"] }, "single"), "");
  const issued = issue("reviewer");
  assert.match(B.validateChanges("benefitIssues", issued, db, reviewer, "roles"), /thu hồi/);
  const recalled = { ...db, benefitIssues: [{ ...issued.benefitIssues[0], status: "recalled", recalledBy: "reviewer", reason: "Nhập nhầm" }] };
  assert.equal(B.validateChanges("benefitIssues", issued, recalled, reviewer, "roles"), "");
  assert.equal(B.issued(recalled, "2026-10").size, 0);
});
test("Thời điểm xác nhận cấp phát phải là chuỗi ISO UTC thật, cùng chuẩn với duyệt bảng lương", () => {
  const doc = { id: "P1", date: "2026-10-15", period: "2026-10", maker: "maker", status: "draft", lines: [{ employee: "A", item: "MILK", quantity: 4 }] };
  const reviewer = { user: "reviewer", perms: ["hr.approve"] }, draft = { ...db, benefitIssues: [doc] };
  const confirm = (confirmedAt) => B.validateChanges("benefitIssues", draft, { ...db, benefitIssues: [{ ...doc, status: "issued", reviewer: "reviewer", confirmedAt }] }, reviewer, "roles");
  assert.equal(confirm(new Date().toISOString()), "", "đúng định dạng do ứng dụng tạo ra");
  for (const bad of ["", undefined, null, 20261015, "khong-phai-ngay", "2026-10-15", "2026-10-15T08:00:00Z", "2026-13-40T08:00:00.000Z", "2026-02-30T08:00:00.000Z"])
    assert.match(confirm(bad), /Thời điểm cấp phát không hợp lệ/, "phải từ chối: " + String(bad));
});
