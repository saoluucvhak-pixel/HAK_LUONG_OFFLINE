// ===== UI / HAK BH PERSON FIELDS (v2.1.19) — thêm "Số sổ BHXH" và "Ngày sinh" vào báo cáo Bảo hiểm chi tiết (A6-14 / Q10, chủ chọn "thêm" 24/11/2026) =====
// Chỉ GHÉP thêm cột theo Mã NV (không đổi số tiền, không đổi core/bh-report.js). Số sổ lấy từ danh sách tính lương (staffForPayroll → "Số sổ BHXH");
// Ngày sinh lấy từ hồ sơ cá nhân (canhan) bản có "Hiệu lực từ" mới nhất ≤ cuối kỳ. Hàm thuần; nạp bằng <script> hoặc require().
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.bhPersonFields = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  var SO = "Số sổ BHXH", NS = "Ngày sinh";
  function d10(v) { return v ? String(v).slice(0, 10) : ""; }
  function dmy(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || "")); return m ? m[3] + "/" + m[2] + "/" + m[1] : String(v || ""); } // hiển thị dd/mm/yyyy ở cả màn hình lẫn Excel (bh-xlsx không tự định dạng ngày)
  /** @param rows dòng BH chi tiết (có "Mã NV", "Họ và tên"); @param staff danh sách tính lương; @param canhan bảng hồ sơ cá nhân; @param kyEnd "yyyy-mm-dd" */
  function enrich(rows, staff, canhan, kyEnd) {
    var soBy = {}; (staff || []).forEach(function (s) { var m = s && s["Mã nhân viên"]; if (m != null) soBy[String(m)] = String(s[SO] == null ? "" : s[SO]).trim(); });
    var best = {}; (canhan || []).forEach(function (c) { var m = c && c["Mã NV"]; if (m == null) return; var from = d10(c["Hiệu lực từ"]); if (from && kyEnd && from > kyEnd) return; var k = String(m), cur = best[k]; if (!cur || from >= d10(cur["Hiệu lực từ"])) best[k] = c; });
    return (rows || []).map(function (r) {
      var out = {}, ma = r["Mã NV"] == null ? "" : String(r["Mã NV"]), isRow = ma !== "";
      Object.keys(r).forEach(function (k) {
        if (k === SO || k === NS) return; out[k] = r[k];
        if (k === "Họ và tên") { out[SO] = isRow ? (soBy[ma] || "") : ""; out[NS] = isRow && best[ma] ? dmy(best[ma][NS]) : ""; }
      });
      if (!(SO in out)) { out[SO] = isRow ? (soBy[ma] || "") : ""; out[NS] = isRow && best[ma] ? dmy(best[ma][NS]) : ""; }
      return out;
    });
  }
  /** Số người thiếu Số sổ / Ngày sinh (chỉ dòng có Mã NV) — để cảnh báo. */
  function missing(rows) { var a = 0, b = 0; (rows || []).forEach(function (r) { if (r["Mã NV"] === "" || r["Mã NV"] == null) return; if (!r[SO]) a++; if (!r[NS]) b++; }); return { soSo: a, ngaySinh: b }; }
  return { enrich: enrich, missing: missing, COLS: [SO, NS] };
});
