"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const RH = require("../../core/reporting/report-html.js");

test("U-A604-01 sheets() không dùng overflow-wrap:anywhere, dùng overflow-wrap:break-word và td.n nowrap", () => {
  const html = RH.sheets({
    title: "Danh sách chuyển khoản",
    ky: "2026-09",
    congTy: "CÔNG TY TEST",
    sheets: [{
      name: "CK",
      cols: ["Mã NV", "Họ và tên", "Số tài khoản", "STK", "Ngân hàng", "Kỳ", "Ngày hạch toán", "Số chứng từ", "Mã số thuế", "MST", "Diễn giải", "Thực lĩnh"],
      rows: [{
        "Mã NV": "NV0001",
        "Họ và tên": "Nguyễn Văn Một Tên Rất Dài Để Kiểm Tra Xuống Dòng Hợp Lý",
        "Số tài khoản": "19034567890123",
        "STK": "001122334455",
        "Ngân hàng": "Vietcombank CN HCM",
        "Kỳ": "2026-09",
        "Ngày hạch toán": "2026-09-30",
        "Số chứng từ": "PC-2026-001",
        "Mã số thuế": "8012345678",
        "MST": "0123456789",
        "Diễn giải": "Chi trả lương tháng 09/2026 cho nhân sự xưởng",
        "Thực lĩnh": 9500000
      }]
    }]
  });

  assert.equal(html.includes("overflow-wrap:anywhere"), false, "Không được dùng overflow-wrap:anywhere");
  assert.match(html, /overflow-wrap:\s*break-word/, "Phải dùng overflow-wrap:break-word cho văn bản dài");
  assert.match(html, /td\.n\{[^}]*white-space:\s*nowrap/, "Phải định nghĩa td.n{white-space:nowrap}");

  for (const val of ["NV0001", "19034567890123", "001122334455", "Vietcombank CN HCM", "2026-09", "30/09/2026", "PC-2026-001", "8012345678", "0123456789"]) {
    assert.ok(html.includes('<td class="n">' + val + '</td>'), "Cột định danh phải có class='n': " + val);
  }
  assert.ok(html.includes('<td class="t">Nguyễn Văn Một Tên Rất Dài'), "Cột Họ và tên giữ class='t'");
  assert.ok(html.includes('<td class="t">Chi trả lương tháng 09/2026'), "Cột Diễn giải giữ class='t'");
  assert.ok(html.includes('<td class="m">9.500.000</td>'), "Cột tiền giữ class='m'");
});
