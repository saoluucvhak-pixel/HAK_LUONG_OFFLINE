"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("../../exceljs.min.js");
const PR = require("../../core/reporting/payroll-reports.js");
const RH = require("../../core/reporting/report-html.js");
const RX = require("../../ui/report-xlsx.js");

test("U-A619-01 PR.toRows đặt nhãn TỔNG CỘNG ở cột Họ và tên thay vì cột STT", () => {
  const vm = {
    cols: [
      { key: "STT", label: "STT", kind: "text" },
      { key: "Mã NV", label: "Mã NV", kind: "text" },
      { key: "Họ và tên", label: "Họ và tên", kind: "text" },
      { key: "Thực lĩnh", label: "Thực lĩnh", kind: "money" }
    ],
    rows: [{ "STT": 1, "Mã NV": "NV01", "Họ và tên": "Nguyễn Văn A", "Thực lĩnh": 5000000 }],
    tong: { "Thực lĩnh": 5000000 }
  };
  const out = PR.toRows(vm);
  const tot = out[out.length - 1];
  assert.equal(tot["STT"], "", "Cột STT của dòng tổng phải rỗng");
  assert.equal(tot["Họ và tên"], "TỔNG CỘNG", "Nhãn TỔNG CỘNG phải nằm ở cột Họ và tên");
});

test("U-A608-01 PDF HTML có min-width:32mm và chiều cao hàng >= 9mm khi có cột Ký nhận; tr.tot nowrap", () => {
  const html = RH.sheets({
    title: "Bảng chi tiền mặt",
    ky: "2026-09",
    congTy: "TEST",
    sheets: [{
      name: "TM",
      cols: ["STT", "Mã NV", "Họ và tên", "Thực lĩnh", "Ký nhận"],
      rows: [
        { "STT": 1, "Mã NV": "NV01", "Họ và tên": "Nguyễn Văn A", "Thực lĩnh": 5000000, "Ký nhận": "" },
        { "STT": "", "Mã NV": "", "Họ và tên": "TỔNG CỘNG", "Thực lĩnh": 5000000, "Ký nhận": "", _isTotal: true }
      ]
    }]
  });

  assert.match(html, /min-width:\s*32mm/, "Cột Ký nhận trên PDF phải có min-width:32mm");
  assert.match(html, /9mm/, "Hàng có cột Ký nhận trên PDF phải có chiều cao >= 9mm");
  assert.match(html, /tr\.tot\s*td\{[^}]*white-space:\s*nowrap/, "tr.tot td phải có white-space:nowrap");
});

test("U-A608-02 Excel report-xlsx đặt chiều cao hàng >= 28pt khi có cột Ký nhận", () => {
  const wb = RX.buildMany(ExcelJS, [{
    title: "BẢNG CHI TIỀN MẶT",
    sheetName: "ChiTM",
    congTy: "TEST",
    cols: [
      { key: "STT", label: "STT", kind: "text" },
      { key: "Họ và tên", label: "Họ và tên", kind: "text" },
      { key: "Thực lĩnh", label: "Thực lĩnh", kind: "money" },
      { key: "Ký nhận", label: "Ký nhận", kind: "text" }
    ],
    rows: [
      { "STT": 1, "Họ và tên": "Nguyễn Văn A", "Thực lĩnh": 5000000, "Ký nhận": "" }
    ],
    tong: { "Thực lĩnh": 5000000 }
  }]);
  const ws = wb.worksheets[0];
  let dataRowHeight = 0;
  ws.eachRow((row) => {
    if (row.getCell(2).value === "Nguyễn Văn A") dataRowHeight = row.height || 0;
  });
  assert.ok(dataRowHeight >= 28, "Chiều cao hàng dữ liệu khi có cột Ký nhận phải >= 28pt, thực tế: " + dataRowHeight);
});
