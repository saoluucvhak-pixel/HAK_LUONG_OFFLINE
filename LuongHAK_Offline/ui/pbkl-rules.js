// Tham số lương khoán (SP = sản lượng, BD = ban/bơm dăm) để GIẢI THÍCH trong file Excel phân bổ.
// Dùng đúng API tra hiệu lực của engine (E.hieuLuc) — cùng nguồn với tính lương — thay vì chọn dòng đầu/cuối theo thứ tự mảng.
// Danh mục lấy từ bản chốt (kỳ đã chốt) hoặc danh mục hiện hành (kỳ chưa chốt) do nơi gọi truyền vào; thiếu căn cứ thì báo, không tính lại.
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var CODES = ["SP", "BD"];
  var ymd = function (s) { var m = String(s || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? +m[1] * 10000 + +m[2] * 100 + +m[3] : null; };
  var show = function (s) { var m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; };
  /** Các phiên bản của một mã có hiệu lực TRONG tháng (cắt theo ngày đầu/cuối tháng), sắp theo ngày hiệu lực. */
  function versionsOf(list, code, nam, thang) {
    var dau = nam * 10000 + thang * 100 + 1, cuoi = nam * 10000 + thang * 100 + 31;
    return list.filter(function (r) { return r["Mã lương"] === code; }).filter(function (r) {
      var tu = ymd(r["Hiệu lực từ"]), den = ymd(r["Hiệu lực đến"]);
      return !(tu != null && tu > cuoi) && !(den != null && den < dau);
    }).sort(function (a, b) { return (ymd(a["Hiệu lực từ"]) || 0) - (ymd(b["Hiệu lực từ"]) || 0); });
  }
  /** E: LuongEngine (hieuLuc, money). catalog: { dm_luong }. */
  function resolve(E, catalog, nam, thang, opts) {
    var need = (opts && opts.need) || CODES;
    var list = catalog && Array.isArray(catalog.dm_luong) ? catalog.dm_luong : null;
    var out = { giaKl: 0, giaBd: 0, mucSan: 0, nguong: 0, missing: [], multi: false, lines: [], noCatalog: !list };
    if (!list) { out.missing = need.slice(); out.lines.push("Thiếu căn cứ: không có danh mục lương đã lưu cho kỳ này — không tính lại để lấp chỗ trống."); return out; }
    var map = E.hieuLuc(list, "Mã lương", nam, thang), money = function (v) { return E.money(v) || 0; };
    var sp = map.SP, bd = map.BD;
    if (sp) { out.giaKl = money(sp["Số tiền khoán"]); out.mucSan = money(sp["Đơn giá bù lương"]); out.nguong = money(sp["Ngưỡng công bù theo tổ"]); } else if (need.indexOf("SP") >= 0) out.missing.push("SP");
    if (bd) out.giaBd = money(bd["Số tiền khoán"]); else if (need.indexOf("BD") >= 0) out.missing.push("BD");
    CODES.forEach(function (code) {
      var versions = versionsOf(list, code, nam, thang);
      if (versions.length < 2) return;
      out.multi = true;
      out.lines.push("Mã " + code + " có " + versions.length + " mức hiệu lực trong kỳ (app tính lương theo mức hiệu lực MỚI NHẤT của kỳ): " + versions.map(function (r) {
        return "từ " + (show(r["Hiệu lực từ"]) || "—") + (r["Hiệu lực đến"] ? " đến " + show(r["Hiệu lực đến"]) : "") + ": " + money(r["Số tiền khoán"]).toLocaleString("vi-VN") + " đ" +
          (code === "SP" ? ", mức sàn " + money(r["Đơn giá bù lương"]).toLocaleString("vi-VN") + " đ, ngưỡng công " + money(r["Ngưỡng công bù theo tổ"]) : "");
      }).join(" | ") + ".");
    });
    if (out.missing.length) out.lines.push("Thiếu căn cứ: danh mục lương của kỳ không có mã " + out.missing.join(", ") + " hiệu lực — các tham số tương ứng hiện 0, không phải mức đã áp dụng.");
    return out;
  }
  var api = { resolve: resolve };
  if (node) module.exports = api; else { root.HAKUi = root.HAKUi || {}; root.HAKUi.pbklRules = api; }
})(typeof window !== "undefined" ? window : this);
