"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../../core/input-batch.js");
const F = require("../fixtures/build.js");

const SL_COLS = ["Phiếu cân", "Ngày cân", "Mã phòng ban", "Mã NV", "KL hàng (Tấn)"];

function makeDb() {
  const db = F.baseDb();
  db.nhanvien.push({ "Mã NV": "NV01", "Họ và tên": "Nguyễn Văn A", "Trạng thái": "Đang làm việc" });
  db.dm_phongban.push({ "Mã phòng ban": "PB01", "Tên phòng ban": "Tổ 1" });
  return db;
}

test("plan() cảnh báo nearKey khi thay kỳ 10 bằng phiếu gần giống ở kỳ 9 (không chặn cứng)", () => {
  const db = makeDb();
  db.sanluong.push({
    "Phiếu cân": "PC-001",
    "Ngày cân": "2026-09-15",
    "Mã phòng ban": "PB01",
    "Mã NV": "NV01",
    "KL hàng (Tấn)": 5,
  });

  const plan = B.plan(db, "sanluong", "2026-10", SL_COLS, [
    { "Phiếu cân": "pc 001", "Ngày cân": "2026-10-05", "Mã phòng ban": "PB01", "Mã NV": "NV01", "KL hàng (Tấn)": 3 },
  ]);

  assert.equal(plan.rows.length, 1);
  assert.ok(Array.isArray(plan.nearWarnings), "plan.nearWarnings phải là mảng");
  assert.equal(plan.nearWarnings.length, 1);
  assert.equal(plan.nearWarnings[0].matchPeriod, "2026-09");
  assert.match(plan.nearWarnings[0].message, /2026-09/);
});

test("plan() giữ nguyên idempotent khi nhập lặp lại chính kỳ 10 (không tự cảnh báo chính mình)", () => {
  const db = makeDb();
  db.sanluong.push({
    "Phiếu cân": "PC-001",
    "Ngày cân": "2026-10-05",
    "Mã phòng ban": "PB01",
    "Mã NV": "NV01",
    "KL hàng (Tấn)": 3,
  });

  const plan = B.plan(db, "sanluong", "2026-10", SL_COLS, [
    { "Phiếu cân": "pc 001", "Ngày cân": "2026-10-05", "Mã phòng ban": "PB01", "Mã NV": "NV01", "KL hàng (Tấn)": 3 },
  ]);

  assert.equal(plan.remove.length, 1);
  assert.equal(plan.rows.length, 1);
  assert.deepEqual(plan.nearWarnings, []);
});

test("plan() không cảnh báo khi khóa khác hẳn hoặc ở chế độ xóa kỳ", () => {
  const db = makeDb();
  db.sanluong.push({
    "Phiếu cân": "PC-001",
    "Ngày cân": "2026-09-15",
    "Mã phòng ban": "PB01",
    "Mã NV": "NV01",
    "KL hàng (Tấn)": 5,
  });

  const replacePlan = B.plan(db, "sanluong", "2026-10", SL_COLS, [
    { "Phiếu cân": "PC-002", "Ngày cân": "2026-10-05", "Mã phòng ban": "PB01", "Mã NV": "NV01", "KL hàng (Tấn)": 4 },
  ]);
  assert.deepEqual(replacePlan.nearWarnings, []);

  const clearPlan = B.plan(db, "sanluong", "2026-10", SL_COLS, null);
  assert.deepEqual(clearPlan.nearWarnings, []);
});
