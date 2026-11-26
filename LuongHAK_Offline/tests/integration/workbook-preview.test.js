"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const XLSX = require("../../xlsx.full.min.js");
const IMP = require("../../core/importer.js");
const batch = require("../../core/input-batch.js");

test("Workbook preview keeps the physical row of a closed period on each sheet", () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Ngày", "Mã NV", "Số suất cơm", "Dòng ví dụ", "__line"],
    ["2026-10-01", "A", 1, "VÍ DỤ"],
    [],
    ["2026-08-10", "A", 1, "", 999],
    ["2026-10-10", "A", 1]
  ]), "Suất cơm");
  const production = {};
  XLSX.utils.sheet_add_aoa(production, [
    ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV", "Dòng ví dụ"],
    ["VD", "2026-10-01", "51C-1", 1, "A", "VÍ DỤ"],
    ["PC-CHOT", "2026-08-10", "51C-1", 1, "A"],
    ["PC-MO", "2026-10-10", "51C-1", 1, "A"]
  ], { origin: "A2" });
  XLSX.utils.book_append_sheet(wb, production, "Sản lượng");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Trợ giúp"]]), "Hướng dẫn");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Ngày", "Mã NV"]]), "Suất cơm đổi tên");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Ngày hạch toán", "Mã NV", "Số chứng từ", "Tạm ứng"],
    ["2026-08-02", "A", "KHOA", 100],
    ["2026-11-02", "A", "MO", 200]
  ]), "Ứng tháng mới");
  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const context = {
    XLSX, IMP, C: { inputBatch: batch }, HRT: {}, SAMPLES: {},
    db: { nhanvien: [{ "Mã NV": "A" }] },
    ALL: {
      ungluong: { ten: "Tạm ứng", cols: ["Ngày hạch toán", "Mã NV", "Số chứng từ", "Tạm ứng"] },
      tiencom: { ten: "Suất cơm", cols: ["Ngày", "Mã NV", "Số suất cơm"] },
      sanluong: { ten: "Sản lượng", cols: ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV"] }
    },
    fold: (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(),
    sheetName: (s) => s,
    lockedMap: () => ({ "2026-08": true }),
    kyStr: () => "2026-10"
  };
  const source = fs.readFileSync(require.resolve("../../app-src/04-excel-nhap-lieu.js"), "utf8");
  vm.runInNewContext(source.slice(source.indexOf("  var SAMPLE_COL"), source.indexOf("  // replan(mode)")), context);
  const parsed = XLSX.read(bytes, { type: "buffer" });
  const plans = context.planWorkbook(parsed, null, "replace");
  assert.deepEqual(Array.from(context.workbookSheetStatus(parsed.SheetNames, plans), (s) => [s.Sheet, s["Trạng thái"]]), [
    ["Suất cơm", "Sẽ nhập theo bản xem trước"],
    ["Sản lượng", "Sẽ nhập theo bản xem trước"],
    ["Hướng dẫn", "Sheet hướng dẫn"],
    ["Suất cơm đổi tên", "Chưa nhận diện — bỏ qua"],
    ["Ứng tháng mới", "Chưa nhận diện — bỏ qua"]
  ]);
  assert.deepEqual(Array.from(plans, (p) => [p.sheet, p.sampleSkipped, ...Array.from(p.items, (it) => [it.line, it.action])]), [
    ["Suất cơm", 1, [4, "locked"], [5, "add"]],
    ["Sản lượng", 1, [4, "locked"], [5, "add"]]
  ]);
  const mapped = context.planWorkbook(parsed, null, "replace", null, new Map([["Ứng tháng mới", "ungluong"]]));
  const advance = mapped.find((p) => p.table === "ungluong");
  assert.equal(advance.sheet, "Ứng tháng mới");
  assert.deepEqual(Array.from(advance.items, (it) => [it.line, it.action]), [[2, "locked"], [3, "add"]]);

  const invalid = context.planWorkbook(parsed, null, "merge", null, new Map([["Suất cơm đổi tên", "ungluong"]]));
  const rejected = invalid.find((p) => p.table === "ungluong");
  assert.match(rejected.headerError, /Ngày hạch toán.*Tạm ứng/);
  assert.equal(rejected.items.length, 0);

  // A mapped sheet cannot silently replace an automatically recognized sheet.
  const duplicateTarget = context.planWorkbook(parsed, null, "merge", null, new Map([["Suất cơm đổi tên", "tiencom"]]));
  assert.equal(duplicateTarget.find((p) => p.table === "tiencom").sheet, "Suất cơm");

});
