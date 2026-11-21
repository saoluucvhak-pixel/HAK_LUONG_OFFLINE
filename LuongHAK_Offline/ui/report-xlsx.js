// ===== UI / REPORT-XLSX — Excel báo cáo lương chuyên nghiệp (V9.4 mục V) =====
// Một sheet cho mỗi báo cáo (chỉ thêm sheet khi thật sự cần). Khối tiêu đề công ty / TÊN BÁO CÁO IN HOA / kỳ / phạm vi lọc / đơn vị tính / ngày lập,
// dòng tiêu đề cột, dòng tổng, khối chữ ký; A4 ngang (A3 khi > 14 cột), vừa chiều ngang trang, lặp dòng tiêu đề khi in, vùng in, đóng băng, AutoFilter.
// Mã NV / số tài khoản / CCCD / MST luôn là CHỮ (không mất số 0 đầu, không thành ký hiệu khoa học).
(function (root) {
  "use strict";
  var TEXT_COLS = /^(Mã NV|Mã nhân viên|Số tài khoản|STK|CCCD|Số CCCD|Mã số thuế|MST|Mã thuế|Số HĐLĐ|Số chứng từ|Mã PB|Mã phòng ban)$/i;
  var FILL = "FFE8F0E8", BORDER = { style: "thin", color: { argb: "FF9AA79F" } };
  function colLetter(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - m) / 26); } return s; }
  /**
   * @param X ExcelJS   @param vm { title, congTy, kyText, phamVi, donVi, ngayLap, trangThai, cols:[{key,label,kind}], rows, tong }
   * @param o { chuKy:[...], tenSheet, nguoiLap }
   */
  /** V10.1: chuỗi bắt đầu bằng = + - @ (hoặc tab/CR) có thể bị Excel/Sheets coi là công thức khi người dùng mở/sửa → thêm dấu nháy đơn đứng đầu (khiên CSV/formula-injection). */
  function safeText(v) { var t = v == null ? "" : String(v); return /^[=+\-@\t\r]/.test(t) ? "'" + t : t; }
  var ISO_D = /^(\d{4})-(\d{2})-(\d{2})$/;
  function isoToDate(t) { var m = ISO_D.exec(String(t || "")); if (!m) return null; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)); return d.getUTCMonth() === +m[2] - 1 ? d : null; }
  function sheetName(wb, raw) {
    var base = String(raw || "BaoCao").replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31).trim() || "BaoCao", name = base, k = 1;
    while (wb.getWorksheet(name)) { k++; name = base.slice(0, 31 - String(k).length - 1) + "_" + k; }
    return name;
  }
  function build(X, vm, o) {
    o = o || {};
    var wb = new X.Workbook(); wb.creator = o.nguoiLap || vm.nguoiLap || "Tính lương HAK"; wb.created = new Date();
    fill(wb, vm, o, o.tenSheet || vm.title);
    return wb;
  }
  /** V10.1: nhiều bảng (bảng chính + các bảng tổng hợp phụ) trong một file — mỗi bảng một sheet, cùng khối tiêu đề / chữ ký. vms[i].sheetName đặt tên sheet. */
  function buildMany(X, vms, o) {
    o = o || {};
    var wb = new X.Workbook(); wb.creator = o.nguoiLap || (vms[0] && vms[0].nguoiLap) || "Tính lương HAK"; wb.created = new Date();
    vms.forEach(function (vm) { fill(wb, vm, o, vm.sheetName || vm.title); });
    return wb;
  }
  function buildPayrollBundle(X, sheets, info) {
    var sources = {
      ThongTinKy: "Thông tin phiên bản và nguồn dữ liệu",
      HachToan: "Bảng lương của kỳ và chứng từ đã thanh toán",
      DoiChieuChiLuong: "Bảng lương của kỳ và sổ chứng từ tại thời điểm xuất"
    };
    var vms = sheets.map(function (sheet) {
      var totals = {};
      var cols = sheet.cols.map(function (label) {
        var vals = sheet.rows.map(function (row) { return row[label]; }).filter(function (v) { return v != null && v !== ""; });
        var quantity = /^(Tổng công|Công chuẩn|Số người|Số người phụ thuộc|Sản lượng|SL kỳ trước|Số xe|Công BT|KL \/ số xe|Mỗi người|Số ngày có SL|Bậc|STT)/i.test(label);
        var money = !quantity && !TEXT_COLS.test(label) && (/^(BH|CTY\.|NLĐ\.|Cộng BH|Lương|Bù SL|Phụ cấp|Tiền|Thu nhập|Tổng thu nhập|Tổng giảm trừ|Thuế|TNCN|Thực lĩnh|Còn thiếu|Truy thu|KPCĐ|Tạm ứng|Trừ khác|Số tiền|Đơn giá|Mức sàn|Giảm trừ|Phải trả|Đã chi|Đang chờ chi|Còn phải trả)/i.test(label));
        var numeric = vals.every(function (v) { return typeof v === "number" && Number.isFinite(v); });
        var kind = /^\d{2}$/.test(label) ? "attendance" : numeric && money ? "money" : numeric && quantity ? (vals.some(function (v) { return v % 1 !== 0; }) ? "qty3" : "qty") : "text";
        if (kind === "money" || (/^qty/.test(kind) && !/^(Công chuẩn|Số người|Bậc|STT|KL \/ số xe|Mỗi người)/.test(label))) {
          totals[label] = vals.reduce(function (sum, v) { return sum + v; }, 0);
        }
        return { key: label, label: label, kind: kind, wrap: /^(Diễn giải|Nội dung|Giá trị|Ghi chú|Người nhận|Phương pháp bù)$/.test(label) };
      });
      var groups = new Map();
      if (sheet.groupBy) sheet.rows.forEach(function (r) {
        var label = r[sheet.groupBy], group = groups.get(label) || { ten: label, rows: [], tong: { "Tổng công": 0 } };
        group.rows.push(r); group.tong["Tổng công"] += r["Tổng công"]; groups.set(label, group);
      });
      return Object.assign({}, info, { nhom: groups.size ? Array.from(groups.values()) : null, sheetName: sheet.name, title: sheet.title.toLocaleUpperCase("vi-VN"),
        phamVi: "Toàn kỳ", source: sheet.source || sources[sheet.name] || "Kết quả lương của kỳ",
        cols: cols, rows: sheet.rows, tong: totals, showTotal: sheet.name !== "ThongTinKy", preserveMoney: true,
        chuKy: sheet.name === "ThongTinKy" ? [] : undefined });
    });
    return buildMany(X, vms);
  }
  function fill(wb, vm, o, rawName) {
    var name = sheetName(wb, rawName);
    var ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 0 }] });
    var nc = vm.cols.length, last = colLetter(nc - 1);
    var put = function (r, v, st) { var c = ws.getCell(r, 1); c.value = v; if (st) Object.assign(c, st); };
    var merge = function (r) { if (nc > 1) ws.mergeCells("A" + r + ":" + last + r); };
    var r = 1;
    put(r, vm.congTy || "", { font: { bold: true, size: 11 } }); merge(r); r++;
    put(r, vm.title, { font: { bold: true, size: 15 }, alignment: { horizontal: "center", vertical: "middle" } }); merge(r); ws.getRow(r).height = 24; r++;
    put(r, vm.kyText || "", { font: { bold: true, size: 11 }, alignment: { horizontal: "center" } }); merge(r); r++;
    var isDraft = !!(vm.trangThai && /chưa chốt|tính tạm/i.test(vm.trangThai));
    var scopeStyle = isDraft
      ? { font: { italic: true, bold: true, size: 10, color: { argb: "FFC0362C" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDECEA" } }, alignment: { horizontal: "center", wrapText: true } }
      : { font: { italic: true, size: 10 }, alignment: { horizontal: "center", wrapText: true } };
    var metaParts = [
      "Phạm vi: " + (vm.phamVi || "Toàn bộ") + (vm.trangThai ? " · " + vm.trangThai : ""),
      "Đơn vị tính: " + (vm.donVi || "Đồng (VND)") + (vm.ngayLap ? " · Ngày lập: " + vm.ngayLap : "") + (vm.nguoiLap ? " · Người lập: " + vm.nguoiLap : "")
    ];
    if (vm.source) metaParts.push("Nguồn: " + vm.source);
    put(r, metaParts.join(" · "), scopeStyle); merge(r); r++;
    if (vm.groups && vm.groups.length) { // tiêu đề hai tầng: nhóm cột ở hàng trên
      vm.groups.forEach(function (g) {
        if (g.to > g.from) ws.mergeCells(r, g.from + 1, r, g.to + 1);
        var gc = ws.getCell(r, g.from + 1); gc.value = g.label; gc.font = { bold: true };
        gc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E7DD" } };
        gc.alignment = { horizontal: "center", vertical: "middle" };
        for (var k = g.from; k <= g.to; k++) ws.getCell(r, k + 1).border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
      });
      r++;
    }
    var hr = r; ws.getRow(hr).height = 32;
    vm.cols.forEach(function (c, i) {
      var cell = ws.getCell(hr, i + 1); cell.value = c.label;
      cell.font = { bold: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
    });
    r++;
    var q3 = function (c) { return c.kind === "qty3"; };
    var decCols = vm.cols.map(function (c) { return c.kind === "qty" && vm.rows.some(function (row) { var x = +row[c.key]; return isFinite(x) && Math.abs(x - Math.round(x)) > 1e-9; }); });
    var hasKy = vm.cols.some(function (c) { return /^Ký nhận$/i.test(c.label); });
    var writeRow = function (row) {
      vm.cols.forEach(function (c, i) {
        var cell = ws.getCell(r, i + 1), v = row[c.key];
        if (/^Ngày/.test(c.label) && isoToDate(v)) { cell.value = isoToDate(v); cell.numFmt = "dd/mm/yyyy"; cell.alignment = { horizontal: "center", vertical: "middle" }; }
        else if (TEXT_COLS.test(c.label) || c.kind === "text") { cell.value = safeText(v); cell.numFmt = "@"; cell.alignment = { vertical: "middle", wrapText: c.wrap || c.label === "Nội dung" || c.label === "Họ và tên" }; }
        else if (c.kind === "attendance") { cell.value = typeof v === "number" ? v : safeText(v); cell.numFmt = "0.###"; }
        else if (c.kind === "money") { cell.value = v === "" || v == null ? null : (vm.preserveMoney ? +v : Math.round(+v)); cell.numFmt = "#,##0;[Red]-#,##0"; }
        else { cell.value = v === "" || v == null ? null : +v; cell.numFmt = q3(c) ? "#,##0.000" : decCols[i] ? "#,##0.00" : "#,##0"; if (/^STT$/i.test(c.label)) cell.alignment = { horizontal: "center" }; }
        cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
      });
      if (hasKy) ws.getRow(r).height = Math.max(ws.getRow(r).height || 0, 28);
      r++;
    };
    var FILL_G = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF1EC" } }, FILL_S = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
    if (vm.nhom && vm.nhom.length) { // báo cáo nhóm theo phòng ban: dòng tiêu đề nhóm → các nhân viên → dòng cộng nhóm
      var iName = Math.max(0, vm.cols.map(function (c) { return c.key; }).indexOf("Họ và tên"));
      vm.nhom.forEach(function (g) {
        if (nc > 1) ws.mergeCells(r, 1, r, nc);
        var gc = ws.getCell(r, 1); gc.value = g.ten + " (" + g.rows.length + (vm.sheetName === "ChamCongTheoHinhThuc" ? " dòng)" : " người)"); gc.font = { bold: true }; gc.fill = FILL_G; gc.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }; r++;
        g.rows.forEach(writeRow);
        vm.cols.forEach(function (c, i) {
          var cell = ws.getCell(r, i + 1);
          if (i === iName) cell.value = "Cộng " + g.ten; else if (g.tong && g.tong[c.key] != null) { cell.value = +g.tong[c.key]; cell.numFmt = "#,##0;[Red]-#,##0"; }
          cell.font = { bold: true }; cell.fill = FILL_S; cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
        });
        r++;
      });
    } else vm.rows.forEach(writeRow);
    var lastData = r - 1, hasTotal = vm.rows.length && vm.showTotal !== false;
    if (hasTotal) {
      vm.cols.forEach(function (c, i) {
        var cell = ws.getCell(r, i + 1);
        if (i === 0) cell.value = vm.tongNhan || "TỔNG CỘNG";
        else if (vm.tong && vm.tong[c.key] != null && vm.tong[c.key] !== "") { cell.value = +vm.tong[c.key]; cell.numFmt = c.kind === "money" ? "#,##0" : q3(c) ? "#,##0.000" : (decCols[i] ? "#,##0.00" : "#,##0"); }
        cell.font = { bold: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } }; cell.border = { top: BORDER, left: BORDER, bottom: { style: "double", color: { argb: "FF444444" } }, right: BORDER };
      });
      lastData = r; r++;
    }
    // chữ ký
    r += 1;
    var ck = o.chuKy || vm.chuKy || ["Người lập", "Kế toán trưởng", "Giám đốc"], per = Math.max(1, Math.floor(nc / ck.length));
    ck.forEach(function (t, i) {
      var c0 = Math.min(nc, i * per + 1), c1 = Math.min(nc, (i + 1) * per);
      if (c1 > c0) ws.mergeCells(r, c0, r, c1);
      var cell = ws.getCell(r, c0); cell.value = t; cell.font = { bold: true }; cell.alignment = { horizontal: "center" };
      if (c1 > c0) ws.mergeCells(r + 1, c0, r + 1, c1);
      var c2 = ws.getCell(r + 1, c0); c2.value = "(Ký, ghi rõ họ tên)"; c2.font = { italic: true, size: 9 }; c2.alignment = { horizontal: "center" };
    });
    var sigEnd = r + 5;
    // độ rộng cột theo nội dung
    vm.cols.forEach(function (c, i) {
      var mx = String(c.label).length; vm.rows.forEach(function (row) { var v = row[c.key]; var L = v == null ? 0 : (c.kind === "money" ? String(Math.round(+v || 0)).length + 3 : String(v).length); if (L > mx) mx = L; });
      var isWrap = c.wrap || c.label === "Nội dung" || c.label === "Họ và tên";
      ws.getColumn(i + 1).width = /^Ký nhận$/i.test(c.label) ? 20 : Math.max(/^STT$/i.test(c.label) ? 6 : 9, Math.min(isWrap ? 48 : 32, mx + 2));
    });
    if (vm.cols.some(function (c) { return c.wrap || c.label === "Nội dung" || c.label === "Họ và tên"; }) && !vm.nhom) {
      vm.rows.forEach(function (row, i) {
        var lines = vm.cols.reduce(function (max, c, j) {
          return (c.wrap || c.label === "Nội dung" || c.label === "Họ và tên") ? Math.max(max, Math.ceil(String(row[c.key] || "").length / Math.max(8, ws.getColumn(j + 1).width - 4))) : max;
        }, 1);
        if (lines > 1) ws.getRow(hr + 1 + i).height = 17 * lines;
      });
    }
    // Bảng > 20 cột: KHÔNG ép vào 1 trang (chữ sẽ quá nhỏ) → A3 ngang, chia ~18 cột/trang, lặp cột nhận diện (Mã NV, Họ tên) ở mọi trang
    var wide = nc > 20, pagesW = wide ? Math.ceil(nc / 18) : 1, idName = -1;
    vm.cols.forEach(function (c, i) { if (idName < 0 && /^Họ và tên$/i.test(c.label)) idName = i; });
    ws.pageSetup = { paperSize: wide || nc > 14 ? 8 : 9, orientation: nc > 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: pagesW, fitToHeight: 0, horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }, printTitlesRow: (vm.groups && vm.groups.length ? (hr - 1) : hr) + ":" + hr };
    if (wide && idName >= 0) ws.pageSetup.printTitlesColumn = "A:" + colLetter(idName);
    ws.pageSetup.printArea = "A1:" + last + sigEnd;
    var escHF = function (s) { return String(s || "").replace(/&/g, "&&"); };
    ws.headerFooter = { oddFooter: "&L" + escHF(vm.congTy) + " · " + escHF(vm.title) + "&RTrang &P / &N" };
    ws.views = [{ state: "frozen", xSplit: nc > 8 && idName >= 0 ? idName + 1 : 0, ySplit: hr, topLeftCell: "A" + (hr + 1) }];
    if (vm.rows.length && !(vm.nhom && vm.nhom.length)) ws.autoFilter = { from: { row: hr, column: 1 }, to: { row: lastData - (hasTotal ? 1 : 0), column: nc } };
    ws.properties.defaultRowHeight = 18;
    return ws;
  }
  var api = { build: build, buildMany: buildMany, buildPayrollBundle: buildPayrollBundle, colLetter: colLetter, safeText: safeText };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else { root.HAKUi = root.HAKUi || {}; root.HAKUi.reportXlsx = api; }
})(typeof window !== "undefined" ? window : this);
