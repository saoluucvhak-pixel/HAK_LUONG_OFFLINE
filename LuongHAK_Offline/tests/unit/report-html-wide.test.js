"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const RH = require("../../core/reporting/report-html.js");
const PER = require("../../core/reporting/period-reports.js");

const APP_SRC = path.join(__dirname, "../../app-src");

test("U-A601-01 21-mau-bao-cao-rieng.js sắp lại COLS_FULL cho PDF (Mã NV, Họ và tên đầu, repeatColumns:2, addTotal) và giữ nguyên 16-tinh-luong.js", () => {
  const tl = fs.readFileSync(path.join(APP_SRC, "16-tinh-luong.js"), "utf8");
  assert.match(tl, /var COLS_FULL\s*=\s*\["Kỳ sản lượng chuyển"/, "Không được đổi thứ tự COLS_FULL trên màn hình/Excel ở 16-tinh-luong.js");

  const bc = fs.readFileSync(path.join(APP_SRC, "21-mau-bao-cao-rieng.js"), "utf8");
  assert.match(bc, /repeatColumns\s*[:=]\s*2/, "21-mau-bao-cao-rieng.js phải đặt repeatColumns: 2 cho PDF Bảng lương đủ cột");
  assert.match(bc, /addTotal\(/, "21-mau-bao-cao-rieng.js phải gọi addTotal cho dòng tổng PDF");
  assert.match(bc, /\["Mã NV",\s*"Họ và tên"\]\.concat\(COLS_FULL\.filter/, "21-mau-bao-cao-rieng.js phải sắp lại Mã NV, Họ và tên đứng đầu khi xuất PDF");

  const fullCols = ["Mã NV", "Họ và tên", "Kỳ sản lượng chuyển", "SL kỳ trước (tấn)", "Lương SL kỳ trước", "Bù SL kỳ trước", "Phòng ban", "Công chuẩn", "Tổng công", "Lương thời gian", "Lương phụ", "Sản lượng (tấn)", "Lương sản lượng", "Lương bù SL", "Lương bơm dăm", "Tiền tăng ca", "Phụ cấp", "Phụ cấp công tác", "Lương hỗ trợ", "Tiền cơm", "Thưởng", "Thu nhập khác", "Tổng thu nhập", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Trừ khác", "Tạm ứng", "Thực lĩnh"];
  const row = { "Mã NV": "00123", "Họ và tên": "Nguyễn Văn A", "Kỳ sản lượng chuyển": "2026-08", "Phòng ban": "Tổ 1", "Tổng thu nhập": 10000000, "Thực lĩnh": 9000000 };
  const rows = PER.addTotal([row]);
  const html = RH.sheets({ title: "Bảng lương", ky: "Kỳ 2026-09", sheets: [{ name: "Bảng lương", cols: fullCols, rows, repeatColumns: 2 }] }, {});
  const tables = (html.match(/<table/g) || []).length;
  assert.ok(tables >= 2, "Bảng lương đủ cột phải tách phần");
  assert.equal((html.match(/00123/g) || []).length, tables, "Mỗi phần phải lặp Mã NV 00123");
  assert.equal((html.match(/Nguyễn Văn A/g) || []).length, tables, "Mỗi phần phải lặp Họ và tên");
  assert.match(html, /class="tot"/, "HTML phải có dòng tổng class='tot'");
});

test("U-A625-01 17-chot-ky.js exportPayrollBundlePdf truyền chuKy cho các sheet không phải ThongTinKy", () => {
  const ck = fs.readFileSync(path.join(APP_SRC, "17-chot-ky.js"), "utf8");
  const idx = ck.indexOf("function exportPayrollBundlePdf");
  assert.ok(idx >= 0, "Phải có exportPayrollBundlePdf");
  const block = ck.slice(idx, idx + 800);
  assert.match(block, /chuKy\s*:/, "exportPayrollBundlePdf phải truyền chuKy");
  assert.match(block, /ThongTinKy/, "exportPayrollBundlePdf phải phân biệt ThongTinKy không có chuKy");
});
