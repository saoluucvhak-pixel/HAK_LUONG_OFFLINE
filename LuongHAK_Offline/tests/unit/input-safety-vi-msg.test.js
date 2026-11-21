"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../core/input-safety.js");

test("P2.4 T-20: thông báo lỗi khối lượng/số xe dùng tên bảng tiếng Việt và hướng dẫn sửa", () => {
  const db = {
    sanluong: [{ "Ngày cân": "2026-09-02", "Phiếu cân": "P01", "KL hàng (Tấn)": "abc" }],
    bandam: [{ "Ngày cân": "2026-09-02", "Phiếu cân": "B01", "Mã NV": "NV01", "KL hàng (Tấn)": "0" }],
    chamcong: [{ "Kỳ": "", "Mã NV": "NV01" }]
  };

  const slIssues = S.issues(db, "sanluong", "2026-09");
  assert.equal(slIssues.length, 1);
  assert.match(slIssues[0], /^Sản lượng dòng 1:/);
  assert.doesNotMatch(slIssues[0], /\bsanluong dòng/);
  assert.match(slIssues[0], /nhập số lớn hơn 0/);
  assert.match(slIssues[0], /ô đỏ/);

  const bdIssues = S.issues(db, "bandam", "2026-09");
  assert.equal(bdIssues.length, 1);
  assert.match(bdIssues[0], /^Ban dăm dòng 1:/);
  assert.doesNotMatch(bdIssues[0], /\bbandam dòng/);
  assert.match(bdIssues[0], /nhập số lớn hơn 0/);

  const ccIssues = S.issues(db, "chamcong", "2026-09");
  assert.equal(ccIssues.length, 1);
  assert.match(ccIssues[0], /^Chấm công dòng 1:/);
});
