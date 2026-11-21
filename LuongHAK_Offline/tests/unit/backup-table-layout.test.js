// P3.4 / T-29: Bảng thư mục lưu trữ & danh sách sao lưu không tràn/dính cột ở 1024px–1366px.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC_PATH = path.join(__dirname, "../../app-src/25-khoi-phuc-kiem-tra.js");
const CSS_PATH = path.join(__dirname, "../../style.css");

test("T-29.1 cardStorage dùng class bảng .bk-stg-tbl, ô đường dẫn .bk-path có title và ô thao tác .bk-act", () => {
  const src = fs.readFileSync(SRC_PATH, "utf8");
  assert.match(src, /bk-stg-tbl/, "thiếu class .bk-stg-tbl ở cardStorage");
  assert.match(src, /bk-path/, "thiếu class .bk-path cho cột đường dẫn");
  assert.match(src, /title:\s*pathText|title:\s*pTxt|bk-path[^}]*title:/, "ô đường dẫn .bk-path phải có thuộc tính title đầy đủ");
  assert.match(src, /bk-act/, "thiếu class .bk-act cho cột thao tác");
});

test("T-29.2 cardBackups dùng class bảng .bk-list-tbl, cột tên/tình trạng/thao tác có class wrap gọn", () => {
  const src = fs.readFileSync(SRC_PATH, "utf8");
  assert.match(src, /bk-list-tbl/, "thiếu class .bk-list-tbl ở cardBackups");
  assert.match(src, /bk-name/, "thiếu class .bk-name cho cột tên file sao lưu");
  assert.match(src, /bk-status/, "thiếu class .bk-status cho cột tình trạng");
  assert.match(src, /bk-act/, "thiếu class .bk-act cho cột nút khôi phục");
});

test("T-29.3 style.css định nghĩa quy tắc wrap/khoảng cách cho .bk-stg-tbl, .bk-list-tbl, .bk-path, .bk-act", () => {
  const css = fs.readFileSync(CSS_PATH, "utf8");
  assert.match(css, /\.bk-stg-tbl\b/, "style.css thiếu .bk-stg-tbl");
  assert.match(css, /\.bk-list-tbl\b/, "style.css thiếu .bk-list-tbl");
  assert.match(css, /\.bk-path\b[^}]*white-space:\s*normal/, ".bk-path phải cho phép white-space:normal");
  assert.match(css, /\.bk-path\b[^}]*(overflow-wrap:\s*anywhere|word-break:\s*break-word)/, ".bk-path phải wrap đường dẫn dài");
  assert.match(css, /\.bk-act\b[^}]*white-space:\s*normal/, ".bk-act phải cho phép xuống dòng gọn");
});
