"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("../../exceljs.min.js");
const PDF = require("../../main/pdf.js");
const RX = require("../../ui/report-xlsx.js");
const SX = require("../../ui/slip-xlsx.js");
const RH = require("../../core/reporting/report-html.js");

test("U-A606-01 main/pdf.js thoát HTML &, <, > ở footer và dùng cỡ chữ 8px hoặc 9px", async () => {
  let capturedOpts = null;
  const mockElectron = {
    BrowserWindow: function () {
      return {
        async loadURL() {},
        webContents: {
          on() {},
          setWindowOpenHandler() {},
          session: { webRequest: { onBeforeRequest() {} } },
          async printToPDF(opts) { capturedOpts = opts; return Buffer.from("%PDF-1.4\n/Type /Page\n%%EOF"); }
        },
        isDestroyed() { return false; },
        destroy() {}
      };
    }
  };
  await PDF.renderPdf(mockElectron, { html: "<html><body>hi</body></html>", footer: "A & B <test>" });
  assert.ok(capturedOpts, "printToPDF phải được gọi");
  assert.ok(capturedOpts.footerTemplate.includes("A &amp; B &lt;test&gt;"), "Footer phải thoát & thành &amp; và < thành &lt;");
  assert.match(capturedOpts.footerTemplate, /font-size:\s*[89]px/, "Cỡ chữ footer phải là 8px hoặc 9px");
});

test("U-A616-01 report-xlsx & slip-xlsx thoát & thành && trong headerFooter và in Người lập", () => {
  const wb = RX.buildMany(ExcelJS, [{
    title: "Lương & Thưởng",
    sheetName: "Luong",
    congTy: "Cty A & B",
    ngayLap: "20/11/2026",
    nguoiLap: "Nguyễn Văn Kế Toán",
    donVi: "Đồng (VND)",
    cols: [{ key: "Mã NV", label: "Mã NV", kind: "text" }, { key: "Thực lĩnh", label: "Thực lĩnh", kind: "money" }],
    rows: [{ "Mã NV": "NV01", "Thực lĩnh": 1000000 }],
    tong: { "Thực lĩnh": 1000000 }
  }]);
  const ws = wb.worksheets[0];
  assert.ok(ws.headerFooter.oddFooter.includes("Cty A && B"), "report-xlsx phải thoát & thành && cho tên công ty");
  assert.ok(ws.headerFooter.oddFooter.includes("Lương && Thưởng"), "report-xlsx phải thoát & thành && cho tiêu đề");
  const texts = [];
  ws.eachRow((r) => r.eachCell((c) => { if (c.value != null) texts.push(String(c.value)); }));
  assert.ok(texts.some((t) => t.includes("Ngày lập: 20/11/2026") && t.includes("Người lập: Nguyễn Văn Kế Toán")), "Dòng phụ Excel phải có Người lập cạnh Ngày lập");

  const swb = SX.build(ExcelJS, {
    congTy: "Cty X & Y",
    slips: [{ ky: "2026-09", maNV: "NV01", hoTen: "An", phongBan: "T1", lines: [{ label: "Lương", value: 1000000 }] }],
    rawCols: ["Mã NV"],
    rawRows: [{ "Mã NV": "NV01" }]
  });
  assert.ok(swb.worksheets[0].headerFooter.oddFooter.includes("Cty X && Y"), "slip-xlsx phải thoát & thành && trong oddFooter");
});

test("U-A621-01 report-html hiển thị Ngày lập · Người lập · Đơn vị tính trong dòng phụ khi vm có sẵn", () => {
  const html = RH.sheets({
    title: "Bảng tổng hợp",
    ky: "Kỳ 2026-09",
    congTy: "CÔNG TY TEST",
    ngayLap: "20/11/2026",
    nguoiLap: "Trần Thị B",
    donVi: "Đồng (VND)",
    sheets: [{ name: "S", cols: ["Mã NV"], rows: [{ "Mã NV": "NV01" }] }]
  });
  assert.ok(html.includes("Ngày lập 20/11/2026 · Người lập Trần Thị B · Đơn vị tính: Đồng (VND)"), "sheets() phải hiển thị dòng phụ Ngày lập · Người lập · Đơn vị tính");

  const thtml = RH.table({
    title: "Bảng lương",
    ky: "2026-09",
    congTy: "CÔNG TY TEST",
    ngayLap: "2026-11-20",
    nguoiLap: "Trần Thị B",
    donVi: "Đồng (VND)",
    cols: [{ key: "Mã NV", label: "Mã NV", kind: "text" }, { key: "Họ và tên", label: "Họ và tên", kind: "text" }],
    groups: [{ ten: "T1", rows: [{ "Mã NV": "NV01", "Họ và tên": "An" }], tong: {} }],
    tong: {},
    soDong: 1
  });
  assert.ok(thtml.includes("Ngày lập 20/11/2026 · Người lập Trần Thị B · Đơn vị tính: Đồng (VND)"), "table() phải hiển thị dòng phụ Ngày lập · Người lập · Đơn vị tính");
});
