"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("../../exceljs.min");
const PR_PERIOD = require("../../core/reporting/period-reports.js");
const IPAY = require("../../core/reporting/internal-payroll.js");
const PRP = require("../../core/reporting/payroll-reports.js");
const RX = require("../../ui/report-xlsx.js");

test("P4.10 A6-22 period-reports và các màn hình dùng nhãn kỳ đệm số 0 (09/2026)", () => {
  assert.equal(PR_PERIOD.kyLabel("2026-09"), "Tháng 09/2026");
  const ht = PR_PERIOD.bcHachToan({ bangluong: [{ "Phòng ban": "SX", "Tổng thu nhập": 1000, "Thực lĩnh": 1000 }] }, 2026, 9, null, [], []);
  assert.equal(ht.rows[0]["Kỳ"], "09/2026");

  const root = path.resolve(__dirname, "../../app-src");
  for (const rel of ["21-mau-bao-cao-rieng.js", "screens/tabSlips.js", "screens/tabBaoCaoLuong.js"]) {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(src, /["'](?:Kỳ|Tháng|tháng|THÁNG|kỳ)\s*"\s*\+\s*(?:st\.)?thang\s*\+\s*"\/"/, rel + " không được ghép thang chưa đệm 0");
  }
});

test("P4.10 A6-23 IPAY.toXlsxVm truyền nhom: vm.groups để Excel có nhóm phòng ban", () => {
  const vm = IPAY.build({
    bangluong: [
      { "Mã NV": "001", "Họ và tên": "An", "Phòng ban": "Tổ 1", "Công chuẩn": 26, "Tổng công": 26, "Lương thời gian": 5000000, "Tổng thu nhập": 5000000 },
      { "Mã NV": "002", "Họ và tên": "Bình", "Phòng ban": "Tổ 2", "Công chuẩn": 26, "Tổng công": 26, "Lương thời gian": 6000000, "Tổng thu nhập": 6000000 }
    ]
  }, { nam: 2026, thang: 9, tenCongTy: "CTY TEST", chot: true });
  const xvm = IPAY.toXlsxVm(vm);
  assert.equal(xvm.nhom, vm.groups, "toXlsxVm phải truyền nhom: vm.groups");
  const wb = RX.build(ExcelJS, xvm);
  const ws = wb.worksheets[0];
  let hasGroup = false;
  ws.eachRow((row) => {
    if (/Tổ 1 \(1 người\)/.test(String(row.getCell(1).value || ""))) hasGroup = true;
  });
  assert.ok(hasGroup, "Excel bảng tính nội bộ phải có dòng nhóm phòng ban");
});

test("P4.10 A6-24 THUE_TNCN bổ sung cột Mã NV (không thêm CCCD) và truyền cảnh báo thiếu MST khi in PDF", () => {
  const vm = PRP.build("THUE_TNCN", {
    bangluong: [
      { "Mã NV": "00123", "Họ và tên": "An", "Phòng ban": "SX", "Chức vụ": "CN", "Tổng thu nhập": 15000000, "Thuế TNCN": 200000, _ct: { maThueTNCN: "LT01", phuongPhapThue: "Lũy tiến", thuNhapChiuThue: 15000000, giamTruBanThan: 11000000, soNPT: 0, thuNhapTinhThue: 4000000 } }
    ],
    chot: true
  }, { nam: 2026, thang: 9, tenCongTy: "CTY TEST", nhanVien: { "00123": { "Mã số thuế": "" } } });
  const labels = vm.cols.map((c) => c.label);
  assert.ok(labels.includes("Mã NV"), "THUE_TNCN phải có cột Mã NV");
  assert.ok(!labels.some((l) => /CCCD/i.test(l)), "không thêm cột CCCD (B-12)");
  assert.equal(vm.rows[0]["Mã NV"], "00123");
  assert.ok(vm.canhbao.some((w) => /mã số thuế/i.test(w)), "phải có cảnh báo thiếu MST");

  const paySrc = fs.readFileSync(path.resolve(__dirname, "../../app-src/20-bao-cao-thanh-toan.js"), "utf8");
  assert.match(paySrc, /ghiChu:\s*vm\.canhbao/, "payPdf phải truyền ghiChu: vm.canhbao để hiện cảnh báo khi in");
});
