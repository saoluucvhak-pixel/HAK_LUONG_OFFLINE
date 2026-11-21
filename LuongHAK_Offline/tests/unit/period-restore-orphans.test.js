"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const REPO = require("../../core/repository.js"), P = REPO.period;
const clone = (x) => JSON.parse(JSON.stringify(x));

function baseDb() {
  return {
    nhanvien: [
      { "Mã NV": "A", "Họ và tên": "An" },
      { "Mã NV": "B", "Họ và tên": "Bình" },
      { "Mã NV": "C", "Họ và tên": "Cường" }
    ],
    hopdong: [{ "Mã NV": "A", "Số HĐLĐ": "A/1" }],
    chitiethd: [{ "Mã NV": "A", "Số HĐLĐ": "A/1", "Hiệu lực từ": "2026-01-01", "Mã lương": "L1", "Phòng ban": "P1" }],
    nhanthan: [], thanhtoan: [], canhan: [],
    dm_luong: [{ "Mã lương": "L1", "Số tiền khoán": 100, "Hiệu lực từ": "2026-01-01" }],
    dm_phongban: [{ "Mã phòng ban": "P1", "Tên phòng ban": "Tổ 1", "Hiệu lực từ": "2026-01-01" }],
    chamcong: [
      { "Kỳ": "2026-09", "Mã NV": "A", "Hình thức công": "BT", "01": 1 },
      { "Kỳ": "2026-09", "Mã NV": "B", "Hình thức công": "BT", "01": 1 }
    ],
    sanluong: [], bandam: [], psluong: [], ungluong: [], tiencom: [],
    kyluong: [], kyluong_lichsu: [], payrollApprovals: [], _inputReviews: [],
    productionAttendance: [], sl_chuyenky: [],
    nghiphep: [], nghiom: [], khenthuong: [], noiquy: [],
    benefitAssignments: [], benefitIssues: [], benefitAdjustments: []
  };
}

test("T-18-1 allowDelete=true: không xóa nhân viên đang được nghiphep, nghiom, khenthuong, noiquy tham chiếu", () => {
  const pkg = P.slice(baseDb(), "2026-09");
  pkg.global.nhanvien = [{ "Mã NV": "A", "Họ và tên": "An" }]; // gói chỉ có A (thiếu B, C)

  const cur = baseDb();
  cur.nghiphep.push({ "Mã NV": "B", "Từ ngày": "2026-09-02", "Đến ngày": "2026-09-03" });
  cur.khenthuong.push({ "Mã NV": "C", "Nội dung": "Thưởng" });

  const plan = P.plan(cur, pkg, "2026-09", { allowDelete: true });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.deletes.rows, [], "không nhân viên nào được phép xóa vì đều đang có tham chiếu");
  const blockedIds = plan.deletes.blocked.map((b) => b.row["Mã NV"]).sort();
  assert.deepEqual(blockedIds, ["B", "C"]);
  assert.match(plan.deletes.blocked.find((b) => b.row["Mã NV"] === "B").reason, /nghiphep/);
  assert.match(plan.deletes.blocked.find((b) => b.row["Mã NV"] === "C").reason, /khenthuong/);

  const applied = clone(cur);
  const res = P.apply(applied, plan, pkg);
  assert.equal(res.ok, true);
  assert.deepEqual(applied.nhanvien.map((r) => r["Mã NV"]).sort(), ["A", "B", "C"]);
});

test("T-18-2 allowDelete=true: không xóa nhân viên đang được benefitAssignments, benefitIssues, benefitAdjustments tham chiếu", () => {
  const pkg = P.slice(baseDb(), "2026-09");
  pkg.global.nhanvien = [{ "Mã NV": "A", "Họ và tên": "An" }];

  const cur = baseDb();
  cur.nhanvien.push({ "Mã NV": "D", "Họ và tên": "Dũng" });
  cur.benefitAssignments.push({ employee: "B", code: "S1", from: "2026-01-01" });
  cur.benefitIssues.push({ id: "BI-1", period: "2026-09", status: "issued", lines: [{ employee: "C", item: "MILK", quantity: 10 }] });
  cur.benefitAdjustments.push({ id: "BA-1", ref: "BI-1", lines: [{ employee: "D", item: "MILK", quantity: 2 }] });

  const plan = P.plan(cur, pkg, "2026-09", { allowDelete: true });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.deletes.rows, []);
  const blockedIds = plan.deletes.blocked.map((b) => b.row["Mã NV"]).sort();
  assert.deepEqual(blockedIds, ["B", "C", "D"]);
  assert.match(plan.deletes.blocked.find((b) => b.row["Mã NV"] === "B").reason, /benefitAssignments/);
  assert.match(plan.deletes.blocked.find((b) => b.row["Mã NV"] === "C").reason, /benefitIssues/);
  assert.match(plan.deletes.blocked.find((b) => b.row["Mã NV"] === "D").reason, /benefitAdjustments/);
});

test("T-18-3 allowDelete=true: không xóa nhân viên đang được productionAttendance kỳ khác tham chiếu qua cột ma", () => {
  const pkg = P.slice(baseDb(), "2026-09");
  pkg.global.nhanvien = [{ "Mã NV": "A", "Họ và tên": "An" }];

  const cur = baseDb();
  cur.nhanvien = [{ "Mã NV": "A", "Họ và tên": "An" }, { "Mã NV": "B", "Họ và tên": "Bình" }];
  cur.productionAttendance.push({ date: "2026-10-05", ma: "B" });

  const plan = P.plan(cur, pkg, "2026-09", { allowDelete: true });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.deletes.rows, []);
  assert.deepEqual(plan.deletes.blocked.map((b) => b.row["Mã NV"]), ["B"]);
  assert.match(plan.deletes.blocked[0].reason, /2026-10/);
});

test("T-18-4 allowDelete=false: giữ nguyên hành vi không xóa gì", () => {
  const pkg = P.slice(baseDb(), "2026-09");
  pkg.global.nhanvien = [{ "Mã NV": "A", "Họ và tên": "An" }];

  const cur = baseDb();
  cur.nghiphep.push({ "Mã NV": "B", "Từ ngày": "2026-09-02" });
  const plan = P.plan(cur, pkg, "2026-09", { allowDelete: false });
  assert.equal(plan.deletes.allowed, false);
  const applied = clone(cur);
  P.apply(applied, plan, pkg);
  assert.deepEqual(applied.nhanvien.map((r) => r["Mã NV"]).sort(), ["A", "B", "C"]);
});

test("T-18-5 gói thiếu hẳn bảng thuộc nhóm kỳ (như chamcong) -> plan vẫn ok nhưng thêm cảnh báo rõ ràng vào warnings", () => {
  const cur = baseDb();
  const pkg = P.slice(cur, "2026-09");
  delete pkg.period.chamcong; // gói thiếu hẳn bảng chamcong

  const plan = P.plan(cur, pkg, "2026-09");
  assert.equal(plan.ok, true);
  assert.ok(Array.isArray(plan.warnings), "plan.warnings phải là mảng");
  assert.ok(plan.warnings.some((w) => /chamcong/.test(w) && /2/.test(w)), "warnings phải cảnh báo thiếu bảng chamcong và số dòng bị mất (2 -> 0)");

  // Gói đủ bảng nhóm kỳ -> không có cảnh báo thiếu bảng
  const fullPkg = P.slice(cur, "2026-09");
  const fullPlan = P.plan(cur, fullPkg, "2026-09");
  assert.ok(Array.isArray(fullPlan.warnings));
  assert.equal(fullPlan.warnings.length, 0);
});
