"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../core/input-safety.js");

test("P2.8 T-16: trùng y hệt Mã NV trong nhanvien bị chặn bởi inputSafety.problems và assertPeriod", () => {
  const db = {
    nhanvien: [
      { "Mã NV": "NV001", "Họ và tên": "Nguyễn Văn A" },
      { "Mã NV": "NV001", "Họ và tên": "Nguyễn Văn A" }
    ],
    chamcong: [],
    sanluong: [],
    bandam: []
  };

  const probs = S.problems(db, "2026-09");
  assert.ok(probs.length >= 1, "Phải báo lỗi khi trùng Mã NV trong nhanvien");
  assert.match(probs[0], /NV001/);
  assert.match(probs[0], /trùng Mã NV/i);
  assert.throws(() => S.assertPeriod(db, "2026-09"), /NV001/);
});

test("P2.8 T-16: hai nhân viên khác Mã NV nhưng trùng Họ và tên KHÔNG bị chặn", () => {
  const db = {
    nhanvien: [
      { "Mã NV": "NV001", "Họ và tên": "Nguyễn Văn A" },
      { "Mã NV": "NV002", "Họ và tên": "Nguyễn Văn A" }
    ],
    chamcong: [],
    sanluong: [],
    bandam: []
  };

  const probs = S.problems(db, "2026-09");
  assert.deepEqual(probs, []);
  assert.doesNotThrow(() => S.assertPeriod(db, "2026-09"));
});
