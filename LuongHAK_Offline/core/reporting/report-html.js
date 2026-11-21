// ===== HTML IN ẤN CỦA BÁO CÁO (nguồn cho PDF) =====
// Nhận view-model bảng (title, ky, congTy, loc, cols, groups, tong…) → trang HTML độc lập, KHÔNG script, KHÔNG tài nguyên ngoài.
// Mọi chuỗi từ dữ liệu đều qua esc(). Tiến trình chính in HTML này ra PDF (printToPDF) trong cửa sổ ẩn đã khóa mạng/script.
(function (root) {
  "use strict";
  var TR = (typeof module !== "undefined" && module.exports) ? require("./total-row.js") : root.HAKCore.totalRow;
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function money(v) { var x = Math.round(+v || 0); return x === 0 ? "–" : x.toLocaleString("vi-VN"); }
  function qty(v) { var x = +v; if (!isFinite(x) || x === 0) return "–"; return (Math.round(x * 1000) / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 }); }
  function isoToVn(label, v) {
    if (v == null || v === "") return v;
    var s = String(v);
    return /^Ngày/.test(String(label || "").trim()) && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : v;
  }
  function cell(c, v) { return c.kind === "money" ? money(v) : c.kind === "qty" ? qty(v) : esc(isoToVn(c.label || c.key, v)); }

  var NOWRAP_COL_RE = /^(Mã|Số tài khoản|STK|Ngân hàng|Kỳ|Ngày|Số chứng từ|Mã số thuế|MST)/;
  function isNowrapCol(label) { return NOWRAP_COL_RE.test(String(label || "").trim()); }

  var CSS = "@page{size:A4 landscape;margin:12mm 10mm 14mm 10mm}*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:8.5pt;color:#111;margin:0}" +
    "h1{font-size:14pt;margin:0 0 2mm;text-align:center}.sub{text-align:center;margin:0 0 1.5mm;color:#333}.loc{margin:2mm 0;padding:1.5mm 3mm;border:1px solid #bbb;background:#f6f6f6;font-size:8pt}" +
    ".warn{margin:2mm 0;padding:1.5mm 3mm;border:1px solid #c0362c;color:#c0362c;font-size:8pt}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{page-break-inside:avoid;break-inside:avoid}" +
    "th,td{border:.4pt solid #666;padding:1mm 1.5mm}th{background:#e8efe9;text-align:center}td.m,td.q{text-align:right;white-space:nowrap}td.t{text-align:left;white-space:nowrap}td.n{text-align:left;white-space:nowrap}" +
    "tr.sub{break-after:avoid}tr.sub td{background:#f1f1f1;font-weight:700}tr.tot{break-inside:avoid}tr.tot td{background:#dfe9e2;font-weight:700;border-top:1.2pt solid #333;white-space:nowrap}th.s,td.s{font-weight:700}" +
    "th.ky,td.ky{min-width:32mm}table.has-ky tbody tr td{height:9mm}" +
    ".sign{display:flex;justify-content:space-around;margin-top:10mm;text-align:center;page-break-inside:avoid;break-inside:avoid}.sign div{width:30%}";

  /** vm: kết quả internalPayroll.build() hoặc bảng cùng hình dạng. opt: { chuKy: [tên chức danh] } */
  function table(vm, opt) {
    opt = opt || {};
    // Bảng đã nhóm theo phòng ban → cột "Phòng ban" lặp thừa trong bản in, bỏ để cột tên đủ rộng
    vm = Object.assign({}, vm, { cols: vm.cols.filter(function (c) { return !(c.key === "Phòng ban" && vm.groups && vm.groups.length); }) });
    var h = "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'\"><title>" + esc(vm.title) + "</title><style>" + CSS + "</style></head><body>";
    h += "<h1>" + esc(String(vm.title || "").toLocaleUpperCase("vi-VN")) + "</h1><p class=\"sub\">" + [vm.congTy && esc(vm.congTy), vm.ky && "Kỳ " + esc(vm.ky), vm.trangThai && esc(vm.trangThai)].filter(Boolean).join(" · ") + "</p>";
    if (vm.loc && vm.loc.length) h += "<div class=\"loc\"><b>Bộ lọc:</b> " + vm.loc.map(esc).join(" · ") + " — hiển thị " + vm.soDong + "/" + vm.soDongGoc + " dòng</div>";
    if (vm.kiemTra && vm.kiemTra.lech && vm.kiemTra.lech.length) h += "<div class=\"warn\">⚠ " + vm.kiemTra.lech.length + " dòng có tổng các khoản ≠ Tổng thu nhập của engine: " + vm.kiemTra.lech.slice(0, 5).map(function (x) { return esc(x.maNV); }).join(", ") + (vm.kiemTra.lech.length > 5 ? "…" : "") + "</div>";
    h += "<table><thead><tr>" + vm.cols.map(function (c) { return "<th" + (c.strong ? " class=\"s\"" : "") + ">" + esc(c.label) + "</th>"; }).join("") + "</tr></thead><tbody>";
    var span = vm.cols.length, ni = Math.max(1, vm.cols.map(function (c) { return c.key; }).indexOf("Họ và tên")); // cột đặt nhãn "Cộng …"
    vm.groups.forEach(function (g) {
      h += "<tr class=\"sub\"><td colspan=\"" + span + "\">" + esc(g.ten) + " (" + g.rows.length + " người)</td></tr>";
      g.rows.forEach(function (r) { h += "<tr>" + vm.cols.map(function (c) { return "<td class=\"" + (c.kind === "money" ? "m" : c.kind === "qty" ? "q" : "t") + (c.strong ? " s" : "") + "\">" + cell(c, r[c.key]) + "</td>"; }).join("") + "</tr>"; });
      h += "<tr class=\"sub\">" + vm.cols.map(function (c, i) { return i === ni ? "<td class=\"t\">Cộng " + esc(g.ten) + "</td>" : "<td class=\"" + (c.kind === "money" ? "m" : "q") + "\">" + (g.tong[c.key] != null ? cell(c, g.tong[c.key]) : "") + "</td>"; }).join("") + "</tr>";
    });
    h += "<tr class=\"tot\">" + vm.cols.map(function (c, i) { return i === ni ? "<td class=\"t\">TỔNG CỘNG (" + vm.soDong + " người)</td>" : "<td class=\"" + (c.kind === "money" ? "m" : "q") + "\">" + (vm.tong[c.key] != null ? cell(c, vm.tong[c.key]) : "") + "</td>"; }).join("") + "</tr></tbody></table>";
    if (opt.chuKy && opt.chuKy.length) h += "<div class=\"sign\">" + opt.chuKy.map(function (x) { return "<div><b>" + esc(x) + "</b><br><i>(Ký, ghi rõ họ tên)</i></div>"; }).join("") + "</div>";
    return h + "</body></html>";
  }


  /** Nhiều bảng dạng mảng đối tượng (báo cáo lương, chuyển khoản…) → 1 trang HTML. vm: { title, ky, congTy, trangThai, loc[], ghiChu[], sheets:[{ name, rows }] } */
  function sheets(vm, opt) {
    opt = opt || {};
    var h = "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'\"><title>" + esc(vm.title) + "</title><style>" + CSS + "table{margin-bottom:4mm}h2{font-size:10.5pt;margin:4mm 0 1.5mm}td.t{white-space:normal;overflow-wrap:break-word}h2{break-after:avoid}</style></head><body>";
    h += "<h1>" + esc(String(vm.title || "").toLocaleUpperCase("vi-VN")) + "</h1><p class=\"sub\">" + [vm.congTy && esc(vm.congTy), vm.ky && esc(vm.ky), vm.trangThai && esc(vm.trangThai)].filter(Boolean).join(" · ") + "</p>";
    if (vm.loc && vm.loc.length) h += "<div class=\"loc\"><b>Bộ lọc:</b> " + vm.loc.map(esc).join(" · ") + "</div>";
    (vm.ghiChu || []).forEach(function (g) { h += "<div class=\"loc\">" + esc(g) + "</div>"; });
    var any = false;
    var sectionIndex = 0;
    (vm.sheets || []).forEach(function (sh) {
      var sectionStyle = opt.sectionPages && sectionIndex++ > 0 ? ' style="break-before:page"' : "";
      if (opt.sectionPages) h += "<h2" + sectionStyle + ">" + esc(sh.name) + "</h2>";
      if (!sh.rows || !sh.rows.length) {
        if (opt.sectionPages) h += '<p>Không có dữ liệu trong kỳ.</p>';
        return;
      }
      any = true;
      var cols = sh.cols && sh.cols.length ? sh.cols : Object.keys(sh.rows[0]).filter(function (k) { return k.charAt(0) !== "_"; });
      var num = {}; cols.forEach(function (c) { num[c] = sh.rows.some(function (r) { return typeof r[c] === "number"; }) && sh.rows.every(function (r) { return r[c] === "" || r[c] == null || typeof r[c] === "number"; }); });
      if (!opt.sectionPages && (vm.sheets || []).length > 1 && sh.name) h += "<h2>" + esc(sh.name) + "</h2>";
      // V10.1: bảng RỘNG (> 16 cột) không ép nhỏ chữ vào 1 trang — tách thành các phần cột, mỗi phần lặp cột nhận diện (STT/Mã NV/Họ tên) và tiêu đề nhóm
      var idN = 0; if (cols.length > 16) { var ix = cols.indexOf("Họ và tên"); idN = sh.repeatColumns || (ix >= 0 && ix < 4 ? ix + 1 : 2); }
      var segs = []; if (idN) { var rest = cols.slice(idN), per = 11; for (var k = 0; k < rest.length; k += per) segs.push(cols.slice(0, idN).concat(rest.slice(k, k + per))); } else segs.push(cols);
      var grpOf = {}; (sh.groups || []).forEach(function (g) { for (var q = g.from; q <= g.to; q++) grpOf[cols[q]] = g.label; });
      segs.forEach(function (sc, si) {
        var small = sc.length > 14 ? "font-size:6.5pt;" : sc.length > 9 ? "font-size:7.5pt;" : "", br = si > 0 ? "page-break-before:always;" : "";
        var hasKy = sc.some(function (c) { return /^Ký nhận$/i.test(c); });
        if (segs.length > 1) h += "<div class=\"loc\" style=\"" + br + "\">Phần " + (si + 1) + "/" + segs.length + " — các cột " + esc(sc.slice(idN).join(", ")) + "</div>";
        h += "<table" + (hasKy ? " class=\"has-ky\"" : "") + " style=\"" + small + "\"><thead>";
        if (sh.groups && sh.groups.length) {
          var gr = [], prev = null; sc.forEach(function (c, ci) { var lb = ci < idN && segs.length > 1 ? "NHÂN VIÊN" : (grpOf[c] || ""); if (prev && prev.l === lb) prev.n++; else { prev = { l: lb, n: 1 }; gr.push(prev); } });
          h += "<tr>" + gr.map(function (g) { return "<th colspan=\"" + g.n + "\" style=\"background:#d5e4d9\">" + esc(g.l) + "</th>"; }).join("") + "</tr>";
        }
        h += "<tr>" + sc.map(function (c) { return "<th" + (/^Ký nhận$/i.test(c) ? " class=\"ky\"" : "") + ">" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
        sh.rows.forEach(function (r, i) {
          var tot = i === sh.rows.length - 1 && TR.is(r);
          h += "<tr" + (tot ? " class=\"tot\"" : "") + ">" + sc.map(function (c) { var v = r[c]; var cls = (num[c] ? "m" : (isNowrapCol(c) ? "n" : "t")) + (/^Ký nhận$/i.test(c) ? " ky" : ""); return "<td class=\"" + cls + "\">" + (typeof v === "number" ? (Number.isInteger(v) ? money(v) : qty(v)) : esc(isoToVn(c, v))) + "</td>"; }).join("") + "</tr>";
        });
        h += "</tbody></table>";
      });
    });
    if (!any) h += "<div class=\"warn\">Không có dòng nào khớp bộ lọc.</div>";
    if (opt.chuKy && opt.chuKy.length) h += "<div class=\"sign\">" + opt.chuKy.map(function (x) { return "<div><b>" + esc(x) + "</b><br><i>(Ký, ghi rõ họ tên)</i></div>"; }).join("") + "</div>";
    return h + "</body></html>";
  }

  var api = { table: table, sheets: sheets, esc: esc };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.reportHtml = api; }
})(typeof window !== "undefined" ? window : this);
