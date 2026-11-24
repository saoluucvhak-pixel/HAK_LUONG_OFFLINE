"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const SH = require("../../ui/screen-hints.js");
test("U-HINT-1: mỗi bước của quy trình có chú thích đúng nội dung chủ chốt", () => {
  assert.match(SH.text("chamcong"), /Nhập liệu/);
  assert.match(SH.text("bangtinh"), /chỉ gồm lương và phụ cấp/);
  assert.match(SH.text("rp_tonghop"), /khoản thu khác/);
  assert.match(SH.text("rp_thanhtoan"), /khấu trừ/);
  assert.match(SH.text("baocaoluong"), /Báo cáo lương/);
});
test("U-HINT-2: màn không thuộc quy trình / khóa lạ → rỗng, không ném lỗi", () => {
  assert.equal(SH.text("home"), ""); assert.equal(SH.text("constructor"), ""); assert.equal(SH.text(undefined), "");
});
test("U-HINT-3: số bước ghi đúng thứ tự 1→5", () => {
  ["chamcong", "bangtinh", "rp_tonghop", "rp_thanhtoan", "baocaoluong"].forEach((k, i) => assert.ok(SH.text(k).startsWith("Bước " + (i + 1) + "/5"), k));
});
