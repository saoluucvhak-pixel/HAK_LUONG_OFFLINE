"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("P4.11 A6-13 @media print cho .slips.gon tối ưu font-size/padding/margin để vừa >= 2 phiếu/trang A4", () => {
  const css = fs.readFileSync(path.resolve(__dirname, "../../style.css"), "utf8");
  const printBlocks = css.match(/@media\s+print\s*\{[\s\S]*?\}\s*(?=\n|$)/g) || [];
  const compactBlock = printBlocks.find((b) => /\.slips\.gon\s+\.slip/.test(b));
  assert.ok(compactBlock, "style.css phải có khối @media print cho .slips.gon .slip");
  assert.match(compactBlock, /break-inside\s*:\s*avoid/, "phải có break-inside: avoid");
  assert.match(compactBlock, /\.slips\.gon\s+\.slip[^}]*font-size\s*:/, ".slips.gon .slip trong @media print phải thu gọn font-size");
  assert.match(compactBlock, /\.slips\.gon\s+\.slip\s+table\s+td[^}]*padding\s*:/, ".slips.gon .slip table td trong @media print phải thu gọn padding");
  assert.match(compactBlock, /\.slips\.gon\s+\.card[^}]*padding\s*:/, ".slips.gon .card trong @media print phải thu gọn padding");
});

test("P4.11 A6-13 slipEl không thay đổi số liệu và không thêm khối ký (B-13)", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../app-src/21-mau-bao-cao-rieng.js"), "utf8");
  const start = src.indexOf("function slipEl(");
  const end = src.indexOf("var PP_THUE =");
  assert.ok(start >= 0 && end > start);
  const slipFn = src.slice(start, end);
  assert.doesNotMatch(slipFn, /Ký, ghi rõ|Người nhận|Giám đốc/, "không thêm khối ký vào phiếu lương (B-13)");
  assert.match(slipFn, /slipLines\(b\)/, "giữ nguyên slipLines(b)");
});
