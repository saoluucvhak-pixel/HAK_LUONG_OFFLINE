"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../../core/repository.js");
const F = require("../fixtures/build.js");

test("renameEmployeeRefs cập nhật đủ r['Mã NV'] và các bảng tham chiếu đặc thù, bỏ qua auditlog/kyluong", () => {
  const db = {
    nhanvien: [{ "Mã NV": "NV01", "Họ và tên": "A" }, { "Mã NV": "NV02", "Họ và tên": "B" }],
    hopdong: [{ "Mã NV": "NV01", "Số HĐLĐ": "HD1" }, { "Mã NV": "NV02", "Số HĐLĐ": "HD2" }],
    chamcong: [{ "Mã NV": "NV01", "Kỳ": "2026-10" }],
    productionAttendance: [
      { date: "2026-10-05", team: "T1", employee: "NV01", reason: "Ca dài", user: "admin" },
      { date: "2026-10-05", team: "T1", employee: "NV02", reason: "Ca dài", user: "admin" },
    ],
    benefitAssignments: [
      { employee: "NV01", item: "SUA", allowance: 10 },
      { employee: "NV02", item: "SUA", allowance: 10 },
    ],
    benefitIssues: [
      {
        id: "BF-1",
        date: "2026-10-10",
        lines: [
          { employee: "NV01", item: "SUA", quantity: 2 },
          { employee: "NV02", item: "SUA", quantity: 1 },
          { employee: "NV01", item: "BH01", quantity: 1 },
        ],
      },
    ],
    benefitAdjustments: [
      {
        id: "ADJ-1",
        ref: "BF-1",
        kind: "resize",
        lines: [{ employee: "NV01", item: "BH01", size: "M", quantity: 1 }],
        to: [{ employee: "NV01", item: "BH01", size: "L", quantity: 1 }, { employee: "NV02", item: "BH01", size: "L", quantity: 1 }],
      },
    ],
    sl_chuyenky: [
      { id: "SL-2026-09-2026-10", source: "2026-09", target: "2026-10", taxOverrides: { NV01: "MT01", NV02: "MT02" } },
    ],
    kyluong: [{ ky: "2026-08", kq: { bangluong: [{ "Mã NV": "NV01" }] } }],
    kyluong_lichsu: [{ ky: "2026-08", kq: { bangluong: [{ "Mã NV": "NV01" }] } }],
    auditlog: [{ ts: "2026-10-01", "Mã NV": "NV01", detail: "old" }],
  };

  const counts = R.renameEmployeeRefs(db, "NV01", "NV99");

  assert.equal(db.nhanvien[0]["Mã NV"], "NV01");
  assert.equal(db.hopdong[0]["Mã NV"], "NV99");
  assert.equal(db.hopdong[1]["Mã NV"], "NV02");
  assert.equal(db.chamcong[0]["Mã NV"], "NV99");

  assert.equal(db.productionAttendance[0].employee, "NV99");
  assert.equal(db.productionAttendance[1].employee, "NV02");

  assert.equal(db.benefitAssignments[0].employee, "NV99");
  assert.equal(db.benefitAssignments[1].employee, "NV02");

  assert.equal(db.benefitIssues[0].lines[0].employee, "NV99");
  assert.equal(db.benefitIssues[0].lines[1].employee, "NV02");
  assert.equal(db.benefitIssues[0].lines[2].employee, "NV99");

  assert.equal(db.benefitAdjustments[0].lines[0].employee, "NV99");
  assert.equal(db.benefitAdjustments[0].to[0].employee, "NV99");
  assert.equal(db.benefitAdjustments[0].to[1].employee, "NV02");

  assert.deepEqual(db.sl_chuyenky[0].taxOverrides, { NV99: "MT01", NV02: "MT02" });

  assert.equal(db.kyluong[0].kq.bangluong[0]["Mã NV"], "NV01");
  assert.equal(db.kyluong_lichsu[0].kq.bangluong[0]["Mã NV"], "NV01");
  assert.equal(db.auditlog[0]["Mã NV"], "NV01");

  assert.deepEqual(counts, {
    hopdong: 1,
    chamcong: 1,
    productionAttendance: 1,
    benefitAssignments: 1,
    benefitIssues: 2,
    benefitAdjustments: 2,
    sl_chuyenky: 1,
  });
});

test("renameEmployeeRefs trả về {} khi oldCode === newCode hoặc thiếu tham số", () => {
  const db = { hopdong: [{ "Mã NV": "NV01" }] };
  assert.deepEqual(R.renameEmployeeRefs(db, "NV01", "NV01"), {});
  assert.deepEqual(R.renameEmployeeRefs(db, "", "NV02"), {});
  assert.deepEqual(R.renameEmployeeRefs(null, "NV01", "NV02"), {});
  assert.equal(db.hopdong[0]["Mã NV"], "NV01");
});

test("R-27 vẫn chặn đổi Mã NV khi nhân viên đã có trong bảng lương đã chốt", () => {
  const db = F.baseDb();
  const nv = { "Mã NV": "NV01", "Họ và tên": "A" };
  db.nhanvien.push(nv);
  db.kyluong = [{ ky: "2026-09", kq: { bangluong: [{ "Mã NV": "NV01" }] } }];
  const repo = R.createRepo({
    db: () => db,
    can: () => true,
    audit: () => {},
    uid: () => "1",
    tableName: (t) => t,
  });
  const plan = repo.plan("update", "nhanvien", nv, { "Mã NV": "NV99" });
  assert.equal(plan.ok, false);
  assert.equal(plan.code, "frozen");
});
