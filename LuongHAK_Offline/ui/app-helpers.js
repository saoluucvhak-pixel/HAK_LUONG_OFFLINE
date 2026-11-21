// ===== HÀM TRỢ GIÚP GIAO DIỆN (tách từ app.js) =====
// Chỉ gồm các hàm KHÔNG đọc hay ghi trạng thái của app (db, st, session, ...): DOM, định dạng, Excel, ô nhập, hộp thoại.
// Nội dung từng hàm giữ nguyên như khi còn nằm trong app.js. Phải nạp trước app.js.
(function () {
  "use strict";
  // Bí danh module, khai báo giống hệt trong app.js.
  var C = window.HAKCore;
  var VAL = C.validate;
  var RP = C.repo;
  var FML = C.formula;
  var LF = C.lf;
  function cleanImportedData(d) {
    var msg = [], nulls = VAL.cleanNullCells(d), tot = C.inputBatch && C.inputBatch.removeTotals ? C.inputBatch.removeTotals(d) : [];
    if (nulls) msg.push(nulls + " ô chấm công ghi chữ \"null\" (từ hệ thống cũ) đã chuyển thành ô trống");
    if (tot.length) {
      var tan = tot.reduce(function (s0, x) { return s0 + (parseFloat(String(x.row["KL hàng (Tấn)"]).replace(",", ".")) || 0); }, 0);
      msg.push("Đã loại " + tot.length + " dòng tổng (\"" + tot.map(function (x) { return x.row["Phiếu cân"]; }).join("\", \"") + "\") không có ngày cân khỏi Sản lượng / Ban dăm xuất hàng" + (tan ? " (cộng " + tan.toLocaleString("vi-VN", { maximumFractionDigits: 3 }) + " tấn — đây là số tổng, không phải phiếu thật)" : ""));
    }
    return msg;
  }
  function applyTheme(t) { document.documentElement.setAttribute("data-theme", t === "dark" ? "dark" : "light"); }
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { var t = $("#toast"); t.textContent = m; t.className = "show"; clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ""; }, 2800); }
  function qtyText(v) { if (v === "" || v == null) return ""; var x = +v; return isFinite(x) ? (Math.round(x * 1000) / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 }) : String(v); }
  function fmt(n) { return typeof n === "number" ? n.toLocaleString("vi-VN") : (n == null ? "" : n); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function sheetName(t) { return t.replace(/[\\\/\?\*\[\]:]/g, "").replace(/\s+/g, " ").trim().slice(0, 31); }
  function slug(t) { return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, ""); }
  function pwWeak(v) { // cùng quy tắc với main/backup-crypt.js (main kiểm lại lần nữa)
    if (v.length < 10) return "Mật khẩu tối thiểu 10 ký tự";
    if (/^(.)\1+$/.test(v)) return "Mật khẩu không được lặp một ký tự";
    var k = 0; [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].forEach(function (r) { if (r.test(v)) k++; });
    return k < 2 ? "Mật khẩu cần kết hợp ít nhất 2 loại: chữ thường, chữ hoa, số, ký tự đặc biệt" : "";
  }
  function dateFix(i) {
    var t = i.value.trim(), n = t ? VAL.normDate(t) : "";
    if (n === null) { i.classList.add("invalid"); i.setAttribute("aria-invalid", "true"); i.title = "Ngày không hợp lệ — nhập ngày dạng dd/MM/yyyy, ví dụ 15/09/2026 (năm 4 chữ số)"; return; }
    i.classList.remove("invalid"); i.removeAttribute("aria-invalid"); i.title = i.getAttribute("aria-label") || "";
    if (n) i.value = n.slice(8, 10) + "/" + n.slice(5, 7) + "/" + n.slice(0, 4);
  }
  function dateIso(i) { var t = i.value.trim(); return t ? VAL.normDate(t) : ""; }
  function moneyText(v) { var t = String(v == null ? "" : v).trim(); if (!t) return ""; var n = VAL.parseMoney(t); return isNaN(n) ? t : n.toLocaleString("vi-VN", { maximumFractionDigits: 4 }); }
  function moneyLive(inp) {
    var v = inp.value, m = /^(-?)([\d.]+)(,\d*)?$/.exec(v); if (!m) return;
    var g = m[2].split("."), okGroups = g.length === 1 || (g.slice(1, -1).every(function (x) { return x.length === 3; }) && (g[g.length - 1].length === 3 || g[g.length - 1].length === 4) && g[0].length >= 1 && g[0].length <= 3);
    if (!okGroups) return;
    var digits = g.join(""), out = m[1] + digits.replace(/\B(?=(\d{3})+$)/g, ".") + (m[3] || "");
    if (out === v) return;
    var pos = inp.selectionStart, before = v.slice(0, pos == null ? v.length : pos).replace(/[^\d,]/g, "").length;
    inp.value = out;
    try { var c = 0, i = 0; while (i < out.length && c < before) { if (/[\d,]/.test(out.charAt(i))) c++; i++; } inp.setSelectionRange(i, i); } catch (e) {}
  }
  function catPass(def, r, cf) {
    if (cf.tt && String(r["Trạng thái"] == null ? "" : r["Trạng thái"]).trim() !== cf.tt) return false;
    if (cf.hl) {
      var t = new Date(), today = t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
      var from = LF.isoDay(r["Hiệu lực từ"]), to = LF.isoDay(r["Hiệu lực đến"]);
      if (cf.hl === "dang" && !((!from || from <= today) && (!to || to >= today))) return false;
      if (cf.hl === "chua" && !(from && from > today)) return false;
      if (cf.hl === "het" && !(to && to < today)) return false;
    }
    return true;
  }
  function missingReq(fields, data) {
    var miss = fields.filter(function (f) { return f.req && !data[f.k]; }).map(function (f) { return f.label || f.k; });
    fields.forEach(function (f) { if (f.t === "date" && data[f.k] && !/^\d{4}-\d{2}-\d{2}$/.test(String(data[f.k]))) miss.push((f.label || f.k) + " (ngày không hợp lệ — nhập dd/MM/yyyy)"); });
    fields.forEach(function (f) {
      if (f.maxChoices && HRM.split(data[f.k]).length > f.maxChoices) miss.push(f.k + " (chọn tối đa " + f.maxChoices + " mã)");
    });
    return miss;
  }
  function retroText(imp) { return RP.retroText(imp); }
  function thueIsCha(r) { return r["Mã thuế TNCN"] && (r["Bậc"] === "" || r["Bậc"] == null); }
  function ctVarFromRow(name, b, nam, thang) {
    var c = (b && b["_ct"]) || {};
    switch (name) {
      case "CONG_CHUAN": return c.congChuan;
      case "CONG_CHUAN_2": return c.congChuan2;
      case "CONG_TINH_LUONG": case "CONG_HUONG_PHU_CAP": case "CONG_THUC_TE": return b && b["Tổng công"];
      case "CONG_BT": return c.congBT;
      case "CONG_TC": return c.congTangCa;
      case "CONG_CHU_NHAT": return c.congChuNhat;
      case "CONG_LE": return c.congLe;
      case "CONG_PHEP": return c.congPhep;
      case "CONG_DI_CHUYEN": return c.congDiChuyen;
      case "CONG_TRUNG_CHUYEN": return c.congTrungChuyen;
      case "LUONG_THOA_THUAN": return b && b["Lương thỏa thuận"];
      case "DON_GIA_CONG": return c.donGiaTG;
      case "SL_TAN": return b && b["Sản lượng (tấn)"];
      case "SO_XE": return b && b["Số xe bơm dăm"];
      case "LUONG_SAN_LUONG": return b && b["Lương sản lượng"];
      case "LUONG_BU": return b && b["Lương bù SL"];
      case "SO_NGAY_COM": case "SO_NGAY_DUOC_HUONG": return b && b["Ngày cơm"];
      case "SO_NGAY_THANG": return new Date(nam, thang, 0).getDate();
      default: return null;
    }
  }
  function ctRefVars(expr) {
    var found = [], seen = {};
    (String(expr || "").match(/[A-Za-zÀ-ỹ_][A-Za-zÀ-ỹ0-9_]*/g) || []).forEach(function (w) {
      if (FML.variables.isKnown(w) && !seen[w]) { seen[w] = 1; found.push(w); }
    });
    return found;
  }
  function kyLabel(ky) { var m = String(ky).split("-"); return "Tháng " + (+m[1]) + "/" + m[0]; }
  function fmtTime(isoS) { var d = new Date(isoS); return isNaN(d) ? "" : d.toLocaleString("vi-VN"); }
  function kyKey(nam, thang) { return nam + "-" + ("0" + thang).slice(-2); }
  function n0(v) { return +v || 0; }

  function pdfFallbackPrint(html) {
    var f = document.createElement("iframe"); f.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px"; document.body.appendChild(f);
    f.srcdoc = html; f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("Không mở được hộp thoại in"); } setTimeout(function () { f.remove(); }, 60000); };
  }
  function opsFmtCell(c, v) {
    if (v === "" || v == null) return "";
    if (c.kind === "money") return fmt(+v);
    if (c.kind === "qty" || c.kind === "qty3") { var x = +v; return isFinite(x) ? x.toLocaleString("vi-VN", { maximumFractionDigits: 3 }) : String(v); }
    return /^Ngày/.test(c.label) && /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(8, 10) + "/" + String(v).slice(5, 7) + "/" + String(v).slice(0, 4) : String(v);
  }
  function loadScript(src) { return new Promise(function (ok, bad) { if (document.querySelector('script[src="' + src + '"]')) return ok(); var sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = function () { bad(new Error("Không nạp được " + src)); }; document.head.appendChild(sc); }); }
  function canvasOf(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function attRecordId(table, r) { return C.attLinks.recordId(table, r); }
  function grayOf(cv) { var d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height); return { g: C.grid.toGray(d.data, cv.width, cv.height), w: cv.width, h: cv.height }; }
  function grayCanvas(g, w, h) { var cv = canvasOf(w, h), cx = cv.getContext("2d"), im = cx.createImageData(w, h); for (var i = 0, j = 0; i < g.length; i++, j += 4) { im.data[j] = im.data[j + 1] = im.data[j + 2] = g[i]; im.data[j + 3] = 255; } cx.putImageData(im, 0, 0); return cv; }
  function titleName(title) { var t = (title || []).filter(function (x) { return /lịch|lich/i.test(C.tsparse.fold(x)); })[0] || ""; return t.replace(/^.*?(lịch làm|lich lam)\s*/i, "").trim(); }
  function ocrRef(L, li, d) { return (L.ma || "#" + li) + "|" + d; }
  function libEnrich(lr, res, pg) {
    if (pg.mode && pg.mode !== "so") return Promise.resolve();
    var items = [], refs = {};
    ((res.table && res.table.lines) || []).forEach(function (l, li) { Object.keys(l.cells || {}).forEach(function (d) { if (!/^\d+$/.test(d)) return; var c = l.cells[d]; if (c && c.ink && c.bb) { var k = li + "|" + d; items.push({ cell: c, key: k }); refs[k] = { l: l, d: d, c: c }; } }); });
    return lr.lookupCells(res, items, "so").then(function (m) {
      Object.keys(m).forEach(function (k) {
        var r = m[k], x = refs[k]; if (!r || !x) return;
        if (r.status === "AUTO_ACCEPT") { var n = parseFloat(String(r.label).replace(",", ".")); if (isFinite(n)) { if (x.l.values[x.d] !== n) x.c.libFrom = x.l.values[x.d]; x.l.values[x.d] = n; x.c.valSrc = "thư viện mẫu"; x.c.libStatus = "AUTO"; x.c.libScore = r.score; x.c.unsure = false; } }
        else if (r.status === "SUGGESTED") { x.c.libStatus = "SUG"; x.c.libLabel = r.label; x.c.libScore = r.score; if (String(x.l.values[x.d]) !== String(r.label).replace(",", ".")) x.c.unsure = true; }
      });
    });
  }
  function layoutCheck(res, pg) {
    pg.layoutSig = C.ocrLayout && window.hakOcrLib && window.hakOcrLib.layoutMatch ? C.ocrLayout.signature(res) : null; pg.layoutStatus = ""; pg.layoutInfo = "";
    if (!pg.layoutSig) return Promise.resolve();
    return window.hakOcrLib.layoutMatch(pg.layoutSig).then(function (r) { if (r && r.ok && r.match) { pg.layoutStatus = r.match.status; pg.layoutId = r.match.id; pg.layoutInfo = r.match.reason || (r.match.status === "MATCH" ? "khớp bố cục \"" + r.match.name + "\" (" + Math.round(r.match.score * 100) + "%)" : ""); } }, function () {});
  }
  function markStopped(pg) { pg.stopped = true; pg.status = "Đã dừng — bấm Đọc lại để đọc trang này"; }
  function ocrImportedCells(plans, meta) {
    var out = [], seen = {};
    (plans || []).forEach(function (p) { var m = meta[p.table]; if (!m) return; p.items.forEach(function (it) { if (it.action !== "add" && it.action !== "update" && it.action !== "merged") return; var mm = m[(it.line || 0) - 1]; if (mm) mm.cells.forEach(function (c) { if (!seen[c.key]) { seen[c.key] = 1; out.push(c); } }); }); });
    return out;
  }
  function summarize(o) { return "Nhân viên: " + ((o.nhanvien || []).length) + " · Chấm công: " + ((o.chamcong || []).length) + " dòng · Kỳ đã chốt: " + ((o.kyluong || []).length); }
  function chotSummary(o) { var m = {}; (o.kyluong || []).forEach(function (k) { if (k && k.ky) m[k.ky] = "v" + (k.version || 1) + " · " + fmt((k.totals && k.totals.thucLinh) || 0); }); return m; }
  function fold(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); }
  function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function fileGone() { toast("Không còn file này trong thư mục lưu (đã bị xóa / đổi tên / chuyển đi)"); }
  window.HAKAppHelpers = {
    cleanImportedData: cleanImportedData, applyTheme: applyTheme, $: $, toast: toast, qtyText: qtyText, fmt: fmt, esc: esc, sheetName: sheetName,
    slug: slug, pwWeak: pwWeak, dateFix: dateFix, dateIso: dateIso, moneyText: moneyText, moneyLive: moneyLive, catPass: catPass, missingReq: missingReq,
    retroText: retroText, thueIsCha: thueIsCha, ctVarFromRow: ctVarFromRow, ctRefVars: ctRefVars, kyLabel: kyLabel, fmtTime: fmtTime, kyKey: kyKey, n0: n0,
    addTotal: C.periodReports.addTotal, pdfFallbackPrint: pdfFallbackPrint, opsFmtCell: opsFmtCell, loadScript: loadScript, canvasOf: canvasOf, attRecordId: attRecordId, grayOf: grayOf, grayCanvas: grayCanvas,
    titleName: titleName, ocrRef: ocrRef, libEnrich: libEnrich, layoutCheck: layoutCheck, markStopped: markStopped, ocrImportedCells: ocrImportedCells, summarize: summarize, chotSummary: chotSummary,
    fold: fold, fmtSize: fmtSize, fileGone: fileGone
  };
})();
