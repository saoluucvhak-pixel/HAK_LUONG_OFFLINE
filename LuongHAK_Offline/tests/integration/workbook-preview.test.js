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
    ["Ngày", "Mã NV", "Số suất cơm", "Dòng ví dụ"],
    ["2026-10-01", "A", 1, "VÍ DỤ"],
    [],
    ["2026-08-10", "A", 1],
    ["2026-10-10", "A", 1]
  ]), "Suất cơm");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV", "Dòng ví dụ"],
    ["VD", "2026-10-01", "51C-1", 1, "A", "VÍ DỤ"],
    ["PC-CHOT", "2026-08-10", "51C-1", 1, "A"],
    ["PC-MO", "2026-10-10", "51C-1", 1, "A"]
  ]), "Sản lượng");
  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const context = {
    XLSX, IMP, C: { inputBatch: batch }, HRT: {}, SAMPLES: {},
    db: { nhanvien: [{ "Mã NV": "A" }] },
    ALL: {
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
  const plans = context.planWorkbook(XLSX.read(bytes, { type: "buffer" }), null, "replace");
  assert.deepEqual(Array.from(plans, (p) => [p.sheet, p.sampleSkipped, ...Array.from(p.items, (it) => [it.line, it.action])]), [
    ["Suất cơm", 1, [4, "locked"], [5, "add"]],
    ["Sản lượng", 1, [3, "locked"], [4, "add"]]
  ]);
});
