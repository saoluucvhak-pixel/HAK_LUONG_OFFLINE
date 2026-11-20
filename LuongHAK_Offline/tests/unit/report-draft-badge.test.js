"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("../../exceljs.min");
const reportHtml = require("../../core/reporting/report-html.js");
const reportXlsx = require("../../ui/report-xlsx.js");

const DRAFT_MSG = "BẢN NHÁP — TÍNH TẠM, kỳ chưa chốt; không dùng để ký/chi tiền";

test("P4.7 reportHtml.table hiện khung .warn BẢN NHÁP khi chưa chốt/tính tạm", () => {
  const base = {
    title: "Bảng tổng hợp lương",
    ky: "09/2026",
    congTy: "Công ty A",
    cols: [{ key: "Mã NV", label: "Mã NV", kind: "text" }, { key: "Họ và tên", label: "Họ và tên", kind: "text" }, { key: "Thực lĩnh", label: "Thực lĩnh", kind: "money" }],
    groups: [{ ten: "Tổ 1", rows: [{ "Mã NV": "NV01", "Họ và tên": "An", "Thực lĩnh": 1000 }], tong: { "Thực lĩnh": 1000 } }],
    tong: { "Thực lĩnh": 1000 },
    soDong: 1
  };
  const draft1 = reportHtml.table(Object.assign({}, base, { trangThai: "Chưa chốt — tính tạm" }));
  assert.match(draft1, new RegExp('<div class="warn">[^<]*' + DRAFT_MSG));
  const draft2 = reportHtml.table(Object.assign({}, base, { trangThai: "Dữ liệu tính tạm" }));
  assert.match(draft2, new RegExp('<div class="warn">[^<]*' + DRAFT_MSG));
  const closed = reportHtml.table(Object.assign({}, base, { trangThai: "Đã chốt · v1" }));
  assert.doesNotMatch(closed, /BẢN NHÁP — TÍNH TẠM/);
});

test("P4.7 reportHtml.sheets hiện khung .warn BẢN NHÁP khi chưa chốt/tính tạm", () => {
  const base = {
    title: "Bảng lương",
    ky: "Kỳ 09/2026",
    sheets: [{ name: "BangLuong", cols: ["Mã NV", "Thực lĩnh"], rows: [{ "Mã NV": "NV01", "Thực lĩnh": 1000 }] }]
  };
  const draft = reportHtml.sheets(Object.assign({}, base, { trangThai: "Chưa chốt — tính tạm" }));
  assert.match(draft, new RegExp('<div class="warn">[^<]*' + DRAFT_MSG));
  const closed = reportHtml.sheets(Object.assign({}, base, { trangThai: "Đã chốt" }));
  assert.doesNotMatch(closed, /BẢN NHÁP — TÍNH TẠM/);
});

test("P4.7 reportXlsx tô màu chữ và nền cảnh báo đỏ ở dòng phạm vi/trạng thái khi tạm", () => {
  const base = {
    title: "BẢNG LƯƠNG",
    congTy: "Công ty A",
    kyText: "Kỳ 09/2026",
    phamVi: "Toàn bộ",
    cols: [{ key: "Mã NV", label: "Mã NV", kind: "text" }, { key: "Thực lĩnh", label: "Thực lĩnh", kind: "money" }],
    rows: [{ "Mã NV": "NV01", "Thực lĩnh": 1000 }],
    tong: { "Thực lĩnh": 1000 }
  };
  const wbDraft = reportXlsx.build(ExcelJS, Object.assign({}, base, { trangThai: "Chưa chốt — tính tạm" }));
  const wsDraft = wbDraft.worksheets[0];
  const cellDraft = wsDraft.getCell(4, 1);
  assert.ok(cellDraft.font && cellDraft.font.color && cellDraft.font.color.argb, "dòng phạm vi phải có màu chữ cảnh báo đỏ");
  assert.ok(cellDraft.fill && cellDraft.fill.fgColor && cellDraft.fill.fgColor.argb, "dòng phạm vi phải có nền cảnh báo đỏ");

  const wbClosed = reportXlsx.build(ExcelJS, Object.assign({}, base, { trangThai: "Đã chốt" }));
  const cellClosed = wbClosed.worksheets[0].getCell(4, 1);
  assert.equal(cellClosed.fill && cellClosed.fill.fgColor, undefined, "kỳ đã chốt không tô nền cảnh báo");
});

test("P4.7 các màn hình xuất PDF/Excel gắn hậu tố _TAM khi kỳ chưa chốt", () => {
  const root = path.resolve(__dirname, "../../app-src");
  for (const rel of ["20-bao-cao-thanh-toan.js", "21-mau-bao-cao-rieng.js", "screens/tabBaoCaoLuong.js", "17-chot-ky.js"]) {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    assert.match(src, /_TAM/, rel + " phải gắn hậu tố _TAM cho tên file khi kỳ chưa chốt");
  }
});
