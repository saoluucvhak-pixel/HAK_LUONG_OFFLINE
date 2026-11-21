// P1.6 — T-04: phiếu cân vừa giao trực tiếp vừa chia tổ ở sanluong/bandam
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const SAFE = require("../../core/input-safety.js");

test("U-SAFE-MIXED-01: issues phát hiện phiếu cân vừa giao trực tiếp (có Mã NV) vừa chia tổ (không Mã NV) ở sanluong", () => {
  const db = {
    sanluong: [
      { "Kỳ": "2026-09", "Ngày cân": "2026-09-10", "Phiếu cân": "PC9", "Mã NV": "NV01", "KL hàng (Tấn)": "10" },
      { "Kỳ": "2026-09", "Ngày cân": "2026-09-10", "Phiếu cân": "PC9", "Mã NV": "", "Mã phòng ban": "02.01", "KL hàng (Tấn)": "10" }
    ]
  };
  const prob = SAFE.issues(db, "sanluong", "2026-09");
  assert.ok(prob.length >= 1, "Phải có ít nhất 1 lỗi về trộn phân bổ trực tiếp và theo tổ");
  assert.ok(prob.some(m => m.includes("trộn") && m.includes("PC9")), "Lỗi phải chỉ rõ phiếu PC9 bị trộn");
});

test("U-SAFE-MIXED-02: mutation từ chối thêm/sửa dòng sanluong làm trộn cách phân bổ của phiếu", () => {
  const db = {
    sanluong: [
      { "Kỳ": "2026-09", "Ngày cân": "2026-09-10", "Phiếu cân": "PC9", "Mã NV": "NV01", "KL hàng (Tấn)": "10" }
    ]
  };
  const newLine = { "Kỳ": "2026-09", "Ngày cân": "2026-09-10", "Phiếu cân": "PC9", "Mã NV": "", "Mã phòng ban": "02.01", "KL hàng (Tấn)": "10" };
  const err = SAFE.mutation(db, "sanluong", null, newLine);
  assert.ok(err, "mutation phải từ chối trộn cách phân bổ ở sanluong");
});
