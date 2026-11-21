"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const RH = require("../../core/reporting/report-html.js");

test("U-A605-01 sheets() chuyển ngày ISO yyyy-mm-dd ở cột /^Ngày/ thành dd/mm/yyyy", () => {
  const html = RH.sheets({
    title: "Sổ vận hành",
    ky: "2026-09",
    congTy: "CÔNG TY TEST",
    sheets: [{
      name: "OPS",
      cols: ["Mã NV", "Ngày hạch toán", "Ngày cân", "Kỳ", "Ghi chú"],
      rows: [{
        "Mã NV": "NV001",
        "Ngày hạch toán": "2026-09-30",
        "Ngày cân": "2026-09-02",
        "Kỳ": "2026-09-01",
        "Ghi chú": "Ngày 2026-09-30"
      }]
    }]
  });

  assert.ok(html.includes("30/09/2026"), "Cột Ngày hạch toán phải hiển thị 30/09/2026");
  assert.ok(html.includes("02/09/2026"), "Cột Ngày cân phải hiển thị 02/09/2026");
  assert.equal(html.includes(">2026-09-30<"), false, "Không được để nguyên 2026-09-30 ở cột Ngày");
  assert.ok(html.includes(">2026-09-01<"), "Cột không bắt đầu bằng Ngày giữ nguyên giá trị");
  assert.ok(html.includes(">Ngày 2026-09-30<"), "Chuỗi không phải yyyy-mm-dd thuần giữ nguyên");
});

test("U-A605-02 table() cũng chuyển ngày ISO yyyy-mm-dd ở cột /^Ngày/ thành dd/mm/yyyy", () => {
  const html = RH.table({
    title: "Bảng test ngày",
    ky: "2026-09",
    congTy: "CÔNG TY TEST",
    cols: [
      { key: "Mã NV", label: "Mã NV", kind: "text" },
      { key: "Họ và tên", label: "Họ và tên", kind: "text" },
      { key: "Ngày vào", label: "Ngày vào", kind: "text" }
    ],
    groups: [{
      ten: "Tổ 1",
      rows: [{ "Mã NV": "NV01", "Họ và tên": "Nguyễn A", "Ngày vào": "2025-03-09" }],
      tong: {}
    }],
    tong: {},
    soDong: 1
  });

  assert.ok(html.includes("09/03/2025"), "table() phải hiển thị 09/03/2025 cho cột Ngày vào");
  assert.equal(html.includes("2025-03-09"), false, "table() không được để nguyên 2025-03-09");
});
