// Báo cáo cấp phát (sữa phúc lợi + bảo hộ lao động): dựng dữ liệu cho Excel và PDF từ CÙNG kết quả C.benefits.report mà màn hình đang hiển thị.
// Chỉ trình bày: không tính lại số liệu. Dòng cộng theo đơn vị nằm trong bảng; cột không bị bỏ; không dùng khóa nội bộ (bắt đầu bằng "_").
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var SIGN = ["Người lập", "Người nhận ký nhận", "Giám đốc"];
  var pad = function (n) { return ("0" + n).slice(-2); };
  var dmy = function (d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); };

  /** Các dòng xuất ra Excel/PDF: đúng cột của báo cáo, theo thứ tự, không có khóa nội bộ. */
  function exportRows(rep) {
    return rep.rows.map(function (row) { var out = {}; rep.columns.forEach(function (column) { out[column] = row[column] == null ? "" : row[column]; }); return out; });
  }
  /** Tiêu đề, kỳ / khoảng ngày, phạm vi lọc và tên file. f = bộ lọc đang áp dụng; scopeText = mô tả bộ lọc của HAK Smart Filter. */
  function meta(rep, ctx) {
    var f = ctx.filters || {}, from = f.tu ? ctx.fmtDate(f.tu) : "…", to = f.den ? ctx.fmtDate(f.den) : "…";
    var ky = f.tu || f.den ? "Từ " + from + " đến " + to : f.thang ? "Tháng hưởng " + f.thang.slice(5) + "/" + f.thang.slice(0, 4) : "Tất cả thời gian";
    var kind = ctx.type === "all" ? "Sữa phúc lợi và bảo hộ lao động" : ctx.labels[ctx.type];
    return { title: "Báo cáo cấp phát — " + (rep.mode === "detail" ? "Chi tiết" : "Tổng hợp"), ky: ky,
      scope: kind + " · " + ctx.scopeText + (ctx.bySize && rep.mode === "summary" ? " · tách theo kích cỡ" : ""), file: "BaoCaoCapPhat_" + (rep.mode === "detail" ? "ChiTiet" : "TongHop") };
  }
  /** vm cho ui/report-xlsx.js: khối tiêu đề (đơn vị, tên báo cáo, kỳ, phạm vi lọc, ngày xuất), cột số căn phải, đóng băng, bộ lọc, chữ ký. */
  function excelVm(rep, m, who) {
    var rows = exportRows(rep), now = who.now || new Date();
    var cols = rep.columns.map(function (c) {
      var numeric = rows.some(function (r) { return typeof r[c] === "number"; }) && rows.every(function (r) { return r[c] === "" || typeof r[c] === "number"; });
      return { key: c, label: c, kind: numeric ? "qty" : "text", wrap: /^(Ghi chú|Mặt hàng|Tổ\/Phòng ban)/.test(c) };
    });
    return { title: m.title.toLocaleUpperCase("vi-VN"), sheetName: rep.mode === "detail" ? "ChiTiet" : "TongHop", congTy: who.congTy || "", kyText: m.ky, phamVi: m.scope,
      donVi: "Theo đơn vị tính của từng mặt hàng", ngayLap: dmy(now), cols: cols, rows: rows, tong: {}, showTotal: false, nguoiLap: who.user || "" };
  }
  /** vm cho RH.sheets (PDF): tên đơn vị, tên báo cáo, kỳ, phạm vi lọc, ngày xuất; bảng lặp tiêu đề khi sang trang; vùng chữ ký ở opt.chuKy. */
  function pdfVm(rep, m, who) {
    var now = who.now || new Date();
    return { title: m.title, ky: m.ky, congTy: who.congTy || "", loc: [m.scope], ghiChu: ["Ngày xuất: " + dmy(now)], sheets: [{ name: m.title, cols: rep.columns, rows: exportRows(rep) }] };
  }
  var api = { SIGN: SIGN, exportRows: exportRows, meta: meta, excelVm: excelVm, pdfVm: pdfVm };
  if (node) module.exports = api; else { root.HAKUi = root.HAKUi || {}; root.HAKUi.dispenseReport = api; }
})(typeof window !== "undefined" ? window : this);
