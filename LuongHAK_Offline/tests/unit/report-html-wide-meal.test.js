"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const RH = require("../../core/reporting/report-html.js");

test("U-A611-01 table() cho phép Họ và tên xuống dòng max-width:55mm và tách phần khi > 16 cột", () => {
  const cols = [
    { key: "STT", label: "STT", kind: "qty" },
    { key: "Mã NV", label: "Mã NV", kind: "text" },
    { key: "Họ và tên", label: "Họ và tên", kind: "text" }
  ];
  const row = { STT: 1, "Mã NV": "NV01", "Họ và tên": "Nguyễn Thị Một Tên Rất Dài Đủ Sáu Mươi Ký Tự Để Kiểm Tra Không Tràn Giấy" };
  const tong = {};
  for (let i = 1; i <= 18; i++) {
    const k = "Khoản " + i;
    cols.push({ key: k, label: k, kind: "money" });
    row[k] = 100000;
    tong[k] = 100000;
  }
  const html = RH.table({
    title: "Bảng tính lương nội bộ",
    ky: "2026-09",
    congTy: "TEST",
    cols,
    groups: [{ ten: "Tổ 1", rows: [row], tong }],
    tong,
    soDong: 1
  });

  assert.match(html, /max-width:\s*55mm/, "table() phải giới hạn max-width:55mm cho Họ và tên");
  assert.match(html, /white-space:\s*normal/, "table() phải cho phép white-space:normal cho Họ và tên");
  const tables = (html.match(/<table/g) || []).length;
  assert.ok(tables >= 2, "table() > 16 cột phải tách phần để không cắt cột cuối, thực tế: " + tables);
  assert.ok(html.includes("Khoản 18"), "Phải giữ đủ cột cuối Khoản 18");
});

test("U-A609-01 sheets() bảng suất cơm 31 ngày tách tối đa 2 phần, bảng thường giữ per=11", () => {
  const mealCols = ["STT", "Mã NV", "Họ và tên"];
  const mealRow = { STT: 1, "Mã NV": "NV01", "Họ và tên": "Nguyễn Văn A" };
  for (let d = 1; d <= 31; d++) {
    const k = String(d).padStart(2, "0");
    mealCols.push(k);
    mealRow[k] = 1;
  }
  mealCols.push("Tổng suất", "Tiền cơm");
  mealRow["Tổng suất"] = 31;
  mealRow["Tiền cơm"] = 930000;

  const mealHtml = RH.sheets({
    title: "Bảng chấm cơm",
    ky: "2026-09",
    congTy: "TEST",
    sheets: [{ name: "SuatCom", cols: mealCols, rows: [mealRow] }]
  });
  const mealTables = (mealHtml.match(/<table/g) || []).length;
  assert.ok(mealTables <= 2, "Bảng suất cơm 31 ngày chỉ được tách tối đa 2 phần, thực tế: " + mealTables);
  assert.ok(mealHtml.includes("Tiền cơm"), "Phải giữ đủ cột cuối Tiền cơm");
});
