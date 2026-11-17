// File Excel MẪU để nhập liệu, có định dạng. Chỉ là trình bày: tên sheet, tên cột (dòng 1) và giá trị mẫu giữ nguyên như bản cũ
// nên nhập lại vào app vẫn đọc đúng. Sheet "Hướng dẫn" luôn đi kèm.
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var HEAD_FILL = "FF1F4E79", GUIDE_FILL = "FF7F6000", TAB = "FF2E75B6", SAMPLE_FILL = "FFFFF8E1", BORDER = { style: "thin", color: { argb: "FFBFBFBF" } };
  var MONEY = /^(Thưởng|Thu nhập (khác|từ|đến)|Trừ khác|Tạm ứng|Số tiền|Đơn giá|Lương|Trừ nhanh|Tiền)/;
  var DATE = /^(Ngày|Hiệu lực)/;
  var isDay = function (c) { return /^\d\d$/.test(c); };
  var border = function () { return { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }; };
  function width(col, rows) {
    var longest = String(col).length + 4;
    rows.slice(0, 20).forEach(function (r) { var v = r[col]; if (v != null && v !== "") longest = Math.max(longest, String(v).length + 4); });
    return isDay(col) ? 5 : Math.max(11, Math.min(34, longest));
  }
  var safeName = function (n) { return String(n || "Sheet").replace(/[\\/?*:\[\]]/g, "-").slice(0, 31); };
  function dataSheet(wb, sh, tab) {
    var ws = wb.addWorksheet(safeName(sh.name), { properties: { tabColor: { argb: tab } }, views: [{ state: "frozen", ySplit: 1 }] });
    var cols = sh.cols, rows = sh.rows || [];
    ws.columns = cols.map(function (c) { return { header: c, key: c, width: width(c, rows) }; });
    var head = ws.getRow(1);
    head.height = 32;
    head.eachCell(function (cell) {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = border();
    });
    rows.forEach(function (r) {
      var row = ws.addRow(cols.map(function (c) { return r[c] === undefined ? "" : r[c]; }));
      row.eachCell({ includeEmpty: true }, function (cell, n) {
        var c = cols[n - 1];
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SAMPLE_FILL } };
        cell.font = { italic: true, color: { argb: "FF7F6000" } };
        cell.border = border();
        if (typeof cell.value === "number") { cell.numFmt = MONEY.test(c) ? "#,##0" : "General"; cell.alignment = { horizontal: isDay(c) ? "center" : "right" }; }
        else cell.alignment = { vertical: "middle", horizontal: DATE.test(c) ? "center" : "left" };
      });
    });
    if (rows.length) {
      ws.getCell("A1").note = "Dòng nền vàng là VÍ DỤ. Xóa các dòng vàng rồi nhập dữ liệu thật. Không đổi tên cột ở dòng này.";
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    ws.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    return ws;
  }
  function guideSheet(wb, sh) {
    var ws = wb.addWorksheet(safeName(sh.name), { properties: { tabColor: { argb: GUIDE_FILL } } });
    ws.columns = [{ header: sh.cols[0], key: "a", width: 22 }, { header: sh.cols[1], key: "b", width: 96 }];
    var head = ws.getRow(1);
    head.height = 26;
    head.eachCell(function (cell) {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GUIDE_FILL } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = border();
    });
    (sh.rows || []).forEach(function (r) {
      var row = ws.addRow([r[sh.cols[0]], r[sh.cols[1]]]);
      row.getCell(1).font = { bold: true };
      row.eachCell(function (cell) { cell.alignment = { vertical: "top", wrapText: true }; cell.border = border(); });
    });
    ws.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    return ws;
  }
  /** sheets: [{ name, cols, rows }] — sheet tên "Hướng dẫn" được tô kiểu hướng dẫn. Trả về workbook ExcelJS. */
  function build(X, sheets, meta) {
    var wb = new X.Workbook();
    wb.creator = (meta && meta.creator) || "HAK Lương Offline";
    wb.created = new Date();
    sheets.forEach(function (sh) { if (sh.name === "Hướng dẫn") guideSheet(wb, sh); else dataSheet(wb, sh, TAB); });
    return wb;
  }
  var api = { build: build };
  if (node) module.exports = api; else { root.HAKUi = root.HAKUi || {}; root.HAKUi.templateXlsx = api; }
})(typeof window !== "undefined" ? window : this);
