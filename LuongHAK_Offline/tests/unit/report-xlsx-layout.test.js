"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("../../exceljs.min");
const RX = require("../../ui/report-xlsx.js");
const PBKL = require("../../ui/pbkl-xlsx.js");

test("P4.9 report-xlsx bật wrapText cho cột Họ và tên và thu gọn banner (ySplit <= 5)", () => {
  const vm = {
    title: "BẢNG LƯƠNG",
    congTy: "CÔNG TY TEST",
    kyText: "Kỳ 09/2026",
    phamVi: "Toàn bộ",
    ngayLap: "20/11/2026",
    cols: [
      { key: "STT", label: "STT", kind: "qty" },
      { key: "Mã NV", label: "Mã NV", kind: "text" },
      { key: "Họ và tên", label: "Họ và tên", kind: "text" },
      { key: "Thực lĩnh", label: "Thực lĩnh", kind: "money" }
    ],
    rows: [{ "STT": 1, "Mã NV": "001", "Họ và tên": "Nguyễn Thị Minh Khai Rất Dài Cần Xuống Dòng", "Thực lĩnh": 10000000 }],
    tong: { "Thực lĩnh": 10000000 }
  };
  const wb = RX.build(ExcelJS, vm);
  const ws = wb.worksheets[0];
  const hr = ws.views[0].ySplit;
  assert.ok(hr <= 5, "banner thu gọn 3-4 hàng để ySplit <= 5 (hiện tại: " + hr + ")");
  assert.equal(ws.getCell(hr + 1, 3).alignment.wrapText, true, "cột Họ và tên phải bật wrapText");
});

test("P4.9 report-xlsx giữ nguyên khổ giấy A3 (paperSize=8) khi > 14 cột (B-15)", () => {
  const cols = [];
  const row = {};
  for (let i = 1; i <= 16; i++) {
    const k = "C" + i;
    cols.push({ key: k, label: k, kind: "money" });
    row[k] = i * 1000;
  }
  const wb = RX.build(ExcelJS, {
    title: "BẢNG RỘNG",
    congTy: "CÔNG TY TEST",
    kyText: "09/2026",
    cols,
    rows: [row],
    tong: row
  });
  assert.equal(wb.worksheets[0].pageSetup.paperSize, 8, "giữ thiết kế V9.4 A3 khi > 14 cột");
});

test("P4.9 pbkl-xlsx có paperSize=9 (A4) và printTitlesRow trong pageSetup", () => {
  const wb = PBKL.template(ExcelJS, "sanluong", { donVi: "CÔNG TY TEST", thang: "09/2026" });
  assert.ok(wb.worksheets.length >= 1);
  // Kiểm tra file kết quả phân bổ
  const res = {
    dateKeys: ["2026-09-01"],
    byDept: { "01": { tenPB: "Tổ 1", total: 10, unallocated: 0, byDay: { "2026-09-01": 10 } } },
    empCount: { "01": 1 },
    byEmp: { NV01: { hoTen: "An", maPB: "01", tenPB: "Tổ 1", total: 10, days: 1, byDay: { "2026-09-01": 10 } } },
    audit: [],
    warnings: []
  };
  const out = PBKL.report(ExcelJS, { sl: res, raw: { sl: [] } }, { donVi: "CÔNG TY TEST", thang: "09/2026" });
  const ws = out.getWorksheet("Phan bo theo phong ban");
  assert.equal(ws.pageSetup.paperSize, 9, "pbkl-xlsx phải đặt paperSize=9 (A4)");
  assert.ok(ws.pageSetup.printTitlesRow, "pbkl-xlsx phải có printTitlesRow");
});
