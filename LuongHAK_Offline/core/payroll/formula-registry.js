// ===== DYNAMIC PAYROLL FORMULA ENGINE — tra công thức theo mã + công ty + ngày hiệu lực (mục III.2/IV.1) =====
// Chỉ ĐỌC danh mục DM_PAYROLL_FORMULA (mảng record phẳng, giống các danh mục khác của app) — không
// gọi parser/evaluator ở đây, chỉ chọn ĐÚNG 1 bản ghi công thức cho (mã, công ty, kỳ) đang tính.
(function (root) {
  "use strict";

  /** "YYYY-MM-DD" → số để so sánh nhanh; null nếu rỗng/không hợp lệ. */
  function dateNum(s) {
    var k = String(s || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return k ? (+k[1]) * 10000 + (+k[2]) * 100 + (+k[3]) : null;
  }

  /**
   * @param records   mảng DM_PAYROLL_FORMULA (field tiếng Việt: "Mã công thức", "Loại", "Công ty",
   *                   "Hiệu lực từ", "Hiệu lực đến", "Trạng thái", "Biểu thức", "Tham số"...)
   * @param q         { code: "Mã công thức", type: "OVERTIME"|"ALLOWANCE"|"SUPPORT", companyId,
   *                   nam, thang }
   * @returns bản ghi công thức ĐANG HIỆU LỰC khớp nhất, hoặc null nếu không có.
   *   Ưu tiên: (1) chỉ xét Trạng thái = "Hiệu lực" — "Nháp"/"Đã duyệt" (chưa tới ngày)/"Ngừng" không
   *   được dùng để tính lương chính thức (mục VII.4); (2) khớp đúng Mã công thức + Loại; (3) khớp
   *   Công ty CỤ THỂ trước, bản không ghi Công ty (áp dụng mọi công ty) chỉ dùng khi không có bản
   *   riêng cho công ty đó; (4) trong các bản còn lại, lấy "Hiệu lực từ" lớn nhất mà vẫn <= cuối kỳ
   *   và ("Hiệu lực đến" trống hoặc >= đầu kỳ).
   */
  function resolve(records, q) {
    var dauKy = q.nam * 10000 + q.thang * 100 + 1, cuoiKy = q.nam * 10000 + q.thang * 100 + 31;
    var cand = (records || []).filter(function (r) {
      if (String(r["Trạng thái"] || "") !== "Hiệu lực") return false;
      if (String(r["Mã công thức"] || "") !== q.code) return false;
      if (q.type && r["Loại"] && String(r["Loại"]) !== q.type) return false;
      var tu = dateNum(r["Hiệu lực từ"]), den = dateNum(r["Hiệu lực đến"]);
      if (tu != null && tu > cuoiKy) return false;
      if (den != null && den < dauKy) return false;
      return true;
    });
    if (!cand.length) return null;
    var withCompany = q.companyId ? cand.filter(function (r) { return String(r["Công ty"] || "") === String(q.companyId); }) : [];
    var pool = withCompany.length ? withCompany : cand.filter(function (r) { return !r["Công ty"]; });
    if (!pool.length) pool = cand; // không có bản riêng công ty lẫn bản chung → vẫn trả bản khớp mã/kỳ gần nhất (để lộ xung đột ra ngoài, không âm thầm bỏ qua)
    var best = null;
    pool.forEach(function (r) {
      var tu = dateNum(r["Hiệu lực từ"]) || 0;
      if (!best || tu >= (dateNum(best["Hiệu lực từ"]) || 0)) best = r;
    });
    return best;
  }

  /** Các công thức (mọi trạng thái) của 1 mã — dùng cho màn hình "Lịch sử phiên bản" (mục VII.4). */
  function versionsOf(records, code, type) {
    return (records || []).filter(function (r) { return String(r["Mã công thức"] || "") === code && (!type || String(r["Loại"] || "") === type); })
      .sort(function (a, b) { return String(a["Hiệu lực từ"] || "") < String(b["Hiệu lực từ"] || "") ? 1 : -1; });
  }

  var api = { resolve: resolve, versionsOf: versionsOf, dateNum: dateNum };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.formulaRegistry = api; }
})(typeof window !== "undefined" ? window : this);
