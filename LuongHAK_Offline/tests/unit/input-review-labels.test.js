"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../../core/input-review.js");

test("P2.3 T-26: sửa 1 ô chỉ đếm 1 dòng chưa lưu, không đếm đôi thành nháp + bản lưu cũ", () => {
  const row = { "Phiếu cân": "P1", "Ngày cân": "2026-10-01", "KL hàng (Tấn)": 2 };
  const db = { sanluong: [row, { ...row, "Phiếu cân": "P2" }, { ...row, "Phiếu cân": "P3" }] };
  R.initialize(db);

  // Sửa 1 ô của dòng đầu
  db.sanluong[0]["KL hàng (Tấn)"] = 5;
  const lblEdit = R.statusLabel(db, "sanluong", "2026-10");
  assert.match(lblEdit, /2 dòng đã lưu giữ nguyên, 1 dòng chưa lưu để tính lương \(đã sửa\/thêm\/xóa\)/);
  assert.doesNotMatch(lblEdit, /bản lưu cũ đã sửa\/xóa/);

  // Thêm 1 dòng mới (tổng: 2 giữ nguyên, 1 sửa + 1 thêm = 2 chưa lưu)
  db.sanluong.push({ ...row, "Phiếu cân": "P4" });
  const lblAdd = R.statusLabel(db, "sanluong", "2026-10");
  assert.match(lblAdd, /2 dòng đã lưu giữ nguyên, 2 dòng chưa lưu để tính lương \(đã sửa\/thêm\/xóa\)/);
});

test("P2.3 T-26: xóa 1 dòng đã lưu đếm 1 dòng chưa lưu để tính lương", () => {
  const row = { "Phiếu cân": "P1", "Ngày cân": "2026-10-01", "KL hàng (Tấn)": 2 };
  const db = { sanluong: [row, { ...row, "Phiếu cân": "P2" }] };
  R.initialize(db);
  db.sanluong.splice(1, 1);
  const lblDel = R.statusLabel(db, "sanluong", "2026-10");
  assert.match(lblDel, /1 dòng đã lưu giữ nguyên, 1 dòng chưa lưu để tính lương \(đã sửa\/thêm\/xóa\)/);
});
