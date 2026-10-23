"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const X = require("../../xlsx.full.min.js");
test("Bundled patched SheetJS preserves Vietnamese text, money, identifiers and dates through XLSX", () => {
  assert.equal(X.version, "0.20.3");
  const rows = [["Mã NV", "Họ tên", "Tiền", "Chuỗi tiền", "Ngày"], ["00001", "Nguyễn Văn Thử", 20800000, "20.800.000", new Date(2026, 6, 1)]];
  const b = X.utils.book_new(); X.utils.book_append_sheet(b, X.utils.aoa_to_sheet(rows), "Dữ liệu");
  const round = X.read(X.write(b, { type: "buffer", bookType: "xlsx" }), { type: "buffer", cellDates: true });
  const actual = X.utils.sheet_to_json(round.Sheets["Dữ liệu"], { header: 1 });
  assert.deepEqual(actual[0], rows[0]);
  assert.deepEqual(actual[1].slice(0, 4), rows[1].slice(0, 4));
  assert.equal(actual[1][4].getFullYear(), 2026); assert.equal(actual[1][4].getMonth(), 6); assert.equal(actual[1][4].getDate(), 1);
});
