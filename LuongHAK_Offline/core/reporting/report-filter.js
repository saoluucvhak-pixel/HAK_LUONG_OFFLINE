// ===== REPORT FILTER ENGINE — bộ lọc dùng chung cho mọi báo cáo (Master V5 mục "HAK Reporting Center") =====
// Một đặc tả lọc (spec) thuần dữ liệu, dùng chung cho màn hình, xuất Excel và xuất PDF để 3 nơi luôn ra CÙNG tập dòng.
//   spec = { phongBan: [tên PB], maLuong: [mã], httt: [text], tuKhoa: "chuỗi", maNV: [mã], chiCoThuNhap: bool, thucLinhTu: số, thucLinhDen: số }
// Không đổi dữ liệu gốc; lọc không phân biệt hoa/thường và dấu tiếng Việt cho từ khóa.
(function (root) {
  "use strict";

  function fold(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim(); }
  function list(v) { return (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]).map(function (x) { return String(x).trim(); }).filter(Boolean); }
  function numOrNull(v) { if (v === "" || v == null) return null; var x = +v; return isFinite(x) ? x : null; }

  /** Chuẩn hóa spec nhận từ giao diện/file đã lưu: bỏ khóa lạ, ép kiểu — spec rỗng = không lọc gì. */
  function normalize(spec) {
    spec = spec || {};
    return {
      phongBan: list(spec.phongBan), maLuong: list(spec.maLuong), httt: list(spec.httt), maNV: list(spec.maNV),
      tuKhoa: String(spec.tuKhoa == null ? "" : spec.tuKhoa).trim(),
      chiCoThuNhap: !!spec.chiCoThuNhap, thucLinhTu: numOrNull(spec.thucLinhTu), thucLinhDen: numOrNull(spec.thucLinhDen)
    };
  }
  function isEmpty(spec) {
    var s = normalize(spec);
    return !s.phongBan.length && !s.maLuong.length && !s.httt.length && !s.maNV.length && !s.tuKhoa && !s.chiCoThuNhap && s.thucLinhTu == null && s.thucLinhDen == null;
  }

  /** Dòng bảng lương nằm trong spec không. Mọi điều kiện cùng phải đúng (AND); các giá trị trong 1 danh sách là HOẶC. */
  function matchRow(r, spec) {
    var s = spec;
    if (s.phongBan.length && s.phongBan.indexOf(String(r["Phòng ban"] == null ? "" : r["Phòng ban"])) < 0) return false;
    if (s.maLuong.length) { var ml = r._ct && r._ct.maLuong ? String(r._ct.maLuong) : ""; if (s.maLuong.indexOf(ml) < 0 && !s.maLuong.some(function (m) { return ml.split(/\s*,\s*/).indexOf(m) >= 0; })) return false; }
    if (s.httt.length) { var parts = String(r["HTTT"] == null ? "" : r["HTTT"]).split(/\s*,\s*/); if (!s.httt.some(function (m) { return parts.indexOf(m) >= 0; })) return false; }
    if (s.maNV.length && s.maNV.indexOf(String(r["Mã NV"])) < 0) return false;
    if (s.tuKhoa) { var hay = fold(r["Mã NV"] + " " + r["Họ và tên"]); if (hay.indexOf(fold(s.tuKhoa)) < 0) return false; }
    if (s.chiCoThuNhap && !(+r["Tổng thu nhập"] > 0)) return false;
    var tl = +r["Thực lĩnh"] || 0;
    if (s.thucLinhTu != null && tl < s.thucLinhTu) return false;
    if (s.thucLinhDen != null && tl > s.thucLinhDen) return false;
    return true;
  }

  /** @returns { rows, total, kept, removed } — giữ nguyên thứ tự gốc. */
  function apply(rows, spec) {
    var s = normalize(spec), src = rows || [];
    var out = isEmpty(s) ? src.slice() : src.filter(function (r) { return matchRow(r, s); });
    return { rows: out, total: src.length, kept: out.length, removed: src.length - out.length };
  }

  /** Các lựa chọn có thật trong dữ liệu để dựng ô chọn (không gợi ý giá trị không tồn tại). */
  function options(rows) {
    var pb = {}, ml = {}, ht = {};
    (rows || []).forEach(function (r) {
      pb[r["Phòng ban"] || ""] = 1;
      String(r._ct && r._ct.maLuong || "").split(/\s*,\s*/).filter(Boolean).forEach(function (m) { ml[m] = 1; });
      String(r["HTTT"] || "").split(/\s*,\s*/).filter(Boolean).forEach(function (m) { ht[m] = 1; });
    });
    var k = function (o) { return Object.keys(o).filter(function (x) { return x !== ""; }).sort(); };
    return { phongBan: k(pb), maLuong: k(ml), httt: k(ht) };
  }

  /** Mô tả bộ lọc bằng chữ — in ở đầu báo cáo/PDF/Excel để người đọc biết số liệu đã bị lọc. */
  function describe(spec) {
    var s = normalize(spec), out = [];
    if (s.phongBan.length) out.push("Phòng ban: " + s.phongBan.join(", "));
    if (s.maLuong.length) out.push("Mã lương: " + s.maLuong.join(", "));
    if (s.httt.length) out.push("Hình thức thanh toán: " + s.httt.join(", "));
    if (s.maNV.length) out.push("Mã NV: " + s.maNV.join(", "));
    if (s.tuKhoa) out.push("Từ khóa: “" + s.tuKhoa + "”");
    if (s.chiCoThuNhap) out.push("Chỉ người có thu nhập");
    if (s.thucLinhTu != null) out.push("Thực lĩnh ≥ " + s.thucLinhTu);
    if (s.thucLinhDen != null) out.push("Thực lĩnh ≤ " + s.thucLinhDen);
    return out;
  }

  var api = { normalize: normalize, isEmpty: isEmpty, apply: apply, options: options, describe: describe, fold: fold };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.reportFilter = api; }
})(typeof window !== "undefined" ? window : this);
