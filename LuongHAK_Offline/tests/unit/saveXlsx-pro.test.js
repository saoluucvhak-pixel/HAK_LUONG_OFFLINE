"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ExcelJS = require("../../exceljs.min");
const reportXlsx = require("../../ui/report-xlsx.js");

function loadSaveXlsx(opts) {
  const src = fs.readFileSync(path.resolve(__dirname, "../../app-src/04-excel-nhap-lieu.js"), "utf8");
  const start = src.indexOf("function saveXlsx(");
  const end = src.indexOf("function templateSheet(");
  assert.ok(start >= 0 && end > start, "Không tìm thấy saveXlsx/proXlsx trong 04-excel-nhap-lieu.js");
  const slice = src.slice(start, end);

  const downloads = [];
  const xlsxCalls = [];
  const buildManyCalls = [];
  const buildCalls = [];

  const wrappedReportXlsx = opts.withReportXlsx === false ? null : {
    build: function (X, vmObj, o) {
      buildCalls.push({ vm: vmObj, o });
      return reportXlsx.build(X, vmObj, o);
    },
    buildMany: function (X, vms, o) {
      buildManyCalls.push({ vms, o });
      return reportXlsx.buildMany(X, vms, o);
    }
  };

  const sandbox = {
    window: {
      ExcelJS: opts.withExcelJS === false ? null : ExcelJS,
      HAKUi: wrappedReportXlsx ? { reportXlsx: wrappedReportXlsx } : {},
      XLSX: {
        utils: {
          book_new: () => ({ SheetNames: [], Sheets: {} }),
          aoa_to_sheet: (aoa) => ({ aoa }),
          book_append_sheet: (wb, ws, name) => { wb.SheetNames.push(name); wb.Sheets[name] = ws; }
        },
        writeFile: (wb, filename) => { xlsxCalls.push({ wb, filename }); }
      }
    },
    XLSX: null,
    need: () => true,
    formulaErrorsBlock: () => false,
    sheetName: (n) => String(n || "Sheet").slice(0, 31),
    excelCell: (c, v) => v,
    MONEYCOLS: /^(Số tiền|Thực lĩnh|Tổng thu nhập|Lương)/i,
    congTy: () => ({ "Tên công ty": "Công ty Test" }),
    kyLabel: () => "09/2026",
    kyStr: () => "2026-09",
    currentUser: () => "Tester",
    download: (filename, mime, buf) => { downloads.push({ filename, mime, buf }); },
    alert: (m) => { throw new Error("Unexpected alert: " + m); }
  };
  sandbox.XLSX = sandbox.window.XLSX;
  vm.createContext(sandbox);
  vm.runInContext(slice, sandbox);
  return { saveXlsx: sandbox.saveXlsx, downloads, xlsxCalls, buildManyCalls, buildCalls };
}

test("P4.8 saveXlsx kind='pro' hỗ trợ nhiều sheet qua reportXlsx.buildMany", async () => {
  const ctx = loadSaveXlsx({ withReportXlsx: true, withExcelJS: true });
  const sheets = [
    { name: "TongHop", cols: ["Mã NV", "Số tiền"], rows: [{ "Mã NV": "NV01", "Số tiền": 1000 }] },
    { name: "ChiTiet", cols: ["Mã NV", "Họ và tên"], rows: [{ "Mã NV": "NV01", "Họ và tên": "Nguyễn Văn A" }] }
  ];
  ctx.saveXlsx("BaoCao_NhieuSheet.xlsx", sheets, "pro");
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(ctx.buildManyCalls.length, 1, "phải gọi reportXlsx.buildMany cho mảng nhiều sheet");
  assert.equal(ctx.xlsxCalls.length, 0, "không fallback sang SheetJS thô khi có reportXlsx");
  assert.equal(ctx.downloads.length, 1);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(ctx.downloads[0].buf);
  assert.equal(wb.worksheets.length, 2);
  assert.equal(wb.worksheets[0].name, "TongHop");
  assert.equal(wb.worksheets[1].name, "ChiTiet");
});

test("P4.8 saveXlsx kind='pro' fallback về SheetJS thô khi thiếu reportXlsx", () => {
  const ctx = loadSaveXlsx({ withReportXlsx: false, withExcelJS: true });
  const sheets = [
    { name: "Sheet1", cols: ["Mã NV", "Số tiền"], rows: [{ "Mã NV": "NV01", "Số tiền": 1000 }] },
    { name: "Sheet2", cols: ["Mã NV"], rows: [{ "Mã NV": "NV02" }] }
  ];
  ctx.saveXlsx("Fallback.xlsx", sheets, "pro");
  assert.equal(ctx.xlsxCalls.length, 1, "phải fallback về XLSX.writeFile");
  assert.deepEqual(ctx.xlsxCalls[0].wb.SheetNames, ["Sheet1", "Sheet2"]);
});

test("P4.8 saveXlsx kind='pro' giữ nguyên tên và thứ tự cột chứng từ chuyển khoản", async () => {
  const ctx = loadSaveXlsx({ withReportXlsx: true, withExcelJS: true });
  const cols = ["Số chứng từ", "Kỳ", "Mã NV", "Họ và tên", "Số tài khoản", "Ngân hàng", "Số tiền"];
  const rows = [{ "Số chứng từ": "CT01", "Kỳ": "2026-09", "Mã NV": "001", "Họ và tên": "An", "Số tài khoản": "012345", "Ngân hàng": "VCB", "Số tiền": 5000000 }];
  ctx.saveXlsx("ChuyenKhoan_CT01.xlsx", [{ name: "ChuyenKhoan", cols, rows }], "pro");
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(ctx.downloads.length, 1);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(ctx.downloads[0].buf);
  const ws = wb.worksheets[0];
  const hr = ws.views && ws.views[0] && ws.views[0].ySplit ? ws.views[0].ySplit : 5;
  const headerRow = ws.getRow(hr).values.slice(1);
  assert.deepEqual(headerRow, cols);
});

test("P4.8 các caller truyền kind='pro' cho saveXlsx", () => {
  const root = path.resolve(__dirname, "../../app-src");
  const checks = [
    ["21-mau-bao-cao-rieng.js", /saveXlsx\([^;]+,\s*"pro"\s*\)/],
    ["screens/tabBaoCaoLuong.js", /saveXlsx\([^;]+,\s*"pro"\s*\)/],
    ["20-bao-cao-thanh-toan.js", /saveXlsx\("ChuyenKhoan_"[^;]+,\s*"pro"\s*\)/],
    ["screens/tabNhanSu.js", /saveXlsx\("SoQuanLyLaoDong\.xlsx"[^;]+,\s*"pro"\s*\)/],
    ["screens/tabNhanSu.js", /saveXlsx\("DanhSachNhanSu_loc\.xlsx"[^;]+,\s*"pro"\s*\)/]
  ];
  for (const [rel, re] of checks) {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    assert.match(src, re, rel + " phải truyền 'pro' vào saveXlsx");
  }
});
