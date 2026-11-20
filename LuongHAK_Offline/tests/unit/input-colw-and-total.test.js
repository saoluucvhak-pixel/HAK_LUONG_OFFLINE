"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const s00 = fs.readFileSync(path.join(root, "app-src", "00-mo-dau-dinh-nghia-bang.js"), "utf8");
const s07 = fs.readFileSync(path.join(root, "app-src", "07-bang-nhap-lieu.js"), "utf8");

test("T-24: COLW có Biển số và Số xe tối thiểu 120px", () => {
  const m = s00.match(/var COLW\s*=\s*(\{[\s\S]*?\});/);
  assert.ok(m, "Tìm thấy khai báo COLW");
  const colw = new Function("return " + m[1])();
  assert.ok(colw["Biển số"] >= 120, `COLW["Biển số"] phải >= 120, hiện tại: ${colw["Biển số"]}`);
  assert.ok(colw["Số xe"] >= 120, `COLW["Số xe"] phải >= 120, hiện tại: ${colw["Số xe"]}`);
});

test("T-24: ô text trong bảng nhập liệu đồng bộ title = giá trị đầy đủ", () => {
  assert.match(s07, /inp\.title\s*=\s*inp\.value/, "Phải gán inp.title = inp.value cho ô nhập text");
});

test("T-27: nút Đối soát theo nhân viên được tách vào hàng flex riêng, không chen giữa chữ tổng", () => {
  const idx = s07.indexOf("Đối soát theo nhân viên");
  assert.ok(idx > 0, "Tìm thấy nút Đối soát theo nhân viên");
  const block = s07.slice(Math.max(0, idx - 450), idx + 200);
  assert.match(block, /display:\s*flex/, "Bao bọc tổng và nút đối soát trong hàng flex riêng");
  assert.doesNotMatch(block, /pcTot\.appendChild\(btn\("Đối soát theo nhân viên"/, "Không gắn trực tiếp nút vào pcTot");
});
