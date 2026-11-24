// v2.1.14 (A6-20): khối chữ ký mọi báo cáo có dòng "Ngày …… tháng …… năm ……" (điền tay) phía trên chức danh, theo biểu mẫu kế toán — ở PDF (HTML) và Excel.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("../../exceljs.min.js");
const RH = require("../../core/reporting/report-html.js");
const RX = require("../../ui/report-xlsx.js");
const sheetVm = { title: "Bảng chi tiền mặt", ky: "2026-09", congTy: "TEST", chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"],
  sheets: [{ name: "TM", cols: ["STT", "Mã NV", "Thực lĩnh"], rows: [{ "STT": 1, "Mã NV": "NV01", "Thực lĩnh": 5 }] }] };

test("U-SDL-01 PDF (sheets): dòng Ngày…tháng…năm… đứng TRƯỚC khối chữ ký; không có chữ ký thì không có dòng", () => {
  const html = RH.sheets(sheetVm, { chuKy: sheetVm.chuKy });
  const i = html.indexOf('<p class="sign-date">'), j = html.indexOf('<div class="sign">'); assert.ok(i > 0 && j > i, "dòng ngày trước khối ký");
  assert.match(html, /Ngày …… tháng …… năm ……/);
  assert.equal(/<p class="sign-date">/.test(RH.sheets(Object.assign({}, sheetVm, { chuKy: undefined }), {})), false, "không chuKy → không dòng ngày");
});
test("U-SDL-02 PDF (table): cùng quy tắc", () => {
  const vm = { title: "T", ky: "2026-09", congTy: "X", cols: [{ key: "a", label: "A", kind: "text" }], rows: [{ a: "1" }], groups: [{ ten: "G1", rows: [{ a: "1" }], tong: {} }], tong: {}, soDong: 1 };
  assert.match(RH.table(vm, { chuKy: ["Người lập"] }), /<p class="sign-date">[\s\S]*<div class="sign">/); assert.equal(/<p class="sign-date">/.test(RH.table(vm, {})), false);
});
test("U-SDL-03 Excel: có ô 'Ngày … tháng … năm …' ngay trên hàng chức danh đầu tiên (căn phải, nghiêng)", () => {
  const vm = { title: "BẢNG", congTy: "X", kyText: "K", ngayLap: "24/11/2026", cols: [{ key: "a", label: "A", kind: "text" }, { key: "b", label: "B", kind: "text" }, { key: "c", label: "C", kind: "text" }], rows: [{ a: "1", b: "2", c: "3" }], tong: {} };
  const ws = RX.build(ExcelJS, vm, { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"] }).worksheets[0];
  let dateRow = 0, nameRow = 0; ws.eachRow((row, n) => { row.eachCell((c) => { const v = String(c.value || ""); if (/^Ngày …… tháng …… năm ……$/.test(v)) dateRow = n; if (v === "Người lập") nameRow = n; }); });
  assert.ok(dateRow > 0 && nameRow > dateRow, "dòng ngày (" + dateRow + ") trước chức danh (" + nameRow + ")");
});
