// ===== CORE / PAYROLL-GATE — điều kiện CHẶN chốt kỳ / xuất bảng lương chính thức (V9.2 mục XV) =====
// Thuần dữ liệu, không phụ thuộc giao diện: dùng chung cho renderer (báo sớm) VÀ tiến trình chính (kiểm lại, không tin trạng thái renderer gửi).
(function (root) {
  "use strict";
  // Mỗi luật: mã, nhãn, hàm nhận kq (kết quả tinhBangLuong) → danh sách thông báo chi tiết
  var RULES = [
    { code: "INPUT_INVALID", ten: "Dữ liệu đầu vào sai hoặc trùng", test: function(kq) { return kq.inputErrors || []; } },
    { code: "INPUT_DRAFT", ten: "Dữ liệu nhập liệu chưa lưu để tính lương", test: function (kq) { return kq.nhapLieuChuaLuu || []; } },
    { code: "FORMULA_ERROR", ten: "Lỗi công thức tiền lương", test: function (kq) { return (kq.loiCongThuc || []).map(function (e) { return (e.maNV ? e.maNV + " · " : "") + e.loai + " '" + e.maCongThuc + "' — " + e.message; }); } },
    { code: "TAX_CONFIG_CONFLICT", ten: "Biểu thuế TNCN xung đột (bậc chồng nhau)", test: function (kq) { return (kq.loiThue || []).filter(function (e) { return e.loai === "CONFLICT"; }).map(function (e) { return e.maNV + " (mã '" + e.maThue + "'): " + e.message; }); } },
    { code: "TAX_CONFIG_ERROR", ten: "Cấu hình thuế TNCN lỗi (mã thuế, biểu thuế, giảm trừ)", test: function (kq) { return (kq.loiThue || []).filter(function (e) { return e.loai !== "CONFLICT"; }).map(function (e) { return e.maNV + " (mã '" + e.maThue + "'): " + e.message; }); } },
    { code: "CONG_CHUAN_ERROR", ten: "Công chuẩn của mã lương không hợp lệ", test: function (kq) { return (kq.loiCongChuan || []).map(function (e) { return e.maNV + " (mã lương '" + e.maLuong + "'): " + e.message; }); } },
    { code: "MA_LUONG_THIEU", ten: "Mã lương không có trong danh mục", test: function (kq) { return pick(kq, /chưa có trong Danh mục lương/); } },
    { code: "MA_TANG_CA_THIEU", ten: "Mã tăng ca không xác định", test: function (kq) { return pick(kq, /chưa có trong Danh mục tăng ca/); } },
    { code: "MA_BH_THIEU", ten: "Mã bảo hiểm không có trong danh mục", test: function (kq) { return pick(kq, /chưa có trong Danh mục bảo hiểm/); } },
    { code: "BH_TY_LE_THIEU", ten: "Thiếu tỷ lệ bảo hiểm người lao động ở mã đang dùng", test: function (kq) { return kq.loiTyLeBH || []; } }
  ];
  // ---- Tỷ lệ bảo hiểm NLĐ bị BỎ TRỐNG ----
  // Ô trống khác "0": 0 / 0% là khai rõ "không đóng khoản này", ô trống là chưa khai nên engine đọc thành 0 và lặng lẽ trừ thiếu.
  // Chỉ xét mã bảo hiểm ĐANG ĐƯỢC DÙNG trong kỳ (có người dùng mã và có căn cứ đóng > 0); mã cũ/không dùng không chặn kỳ.
  var NLD_BH_COLS = ["NLD.BHXH", "NLD.BHYT", "NLD.BHTN"];
  function rateBlank(v) { return v === undefined || v === null || String(v).trim() === ""; }
  /**
   * opts: { kq: kết quả tinhBangLuong, staff: danh sách nhân sự tính lương ("Mã nhân viên", "Họ và tên", "Mã BHXH"),
   *         catalog: { [mã bảo hiểm]: dòng danh mục đang hiệu lực trong kỳ } (engine.hieuLuc(db.dm_baohiem, "Mã bảo hiểm", nam, thang)) }
   * → [thông báo] mỗi (mã bảo hiểm, tên cột) một dòng, nêu người bị ảnh hưởng; rỗng = ổn. Không đổi cách engine đọc tỷ lệ hay tính tiền.
   */
  function insuranceRateIssues(opts) {
    opts = opts || {};
    var staff = {}, catalog = opts.catalog || {}, by = {}, order = [];
    (opts.staff || []).forEach(function (x) { staff[x["Mã nhân viên"]] = x; });
    ((opts.kq && opts.kq.bhxh) || []).forEach(function (row) {
      if (!(Number(row["Lương đóng BHXH"]) > 0)) return; // không phát sinh căn cứ đóng
      var s = staff[row["Mã NV"]]; if (!s) return;
      var code = String(s["Mã BHXH"] || "").trim(), cat = code ? catalog[code] : null;
      if (!cat) return; // mã chưa có trong danh mục: luật MA_BH_THIEU đã chặn
      NLD_BH_COLS.forEach(function (col) {
        if (!rateBlank(cat[col])) return;
        var key = code + "|" + col;
        if (!by[key]) { by[key] = { code: code, col: col, people: [] }; order.push(key); }
        by[key].people.push((row["Mã NV"] || "") + (s["Họ và tên"] ? " " + s["Họ và tên"] : ""));
      });
    });
    return order.map(function (key) {
      var g = by[key], list = g.people.slice(0, 30).join(", ") + (g.people.length > 30 ? " … và " + (g.people.length - 30) + " người khác" : "");
      return "Mã bảo hiểm '" + g.code + "': cột " + g.col + " để trống (chưa khai tỷ lệ). Nhập 0 hoặc 0% nếu không đóng khoản này. Ảnh hưởng " + g.people.length + " người: " + list;
    });
  }
  function pick(kq, re) { return (kq.canhbao || []).filter(function (w) { return re.test(String(w)); }).map(String); }
  /** → [{ code, ten, count, items:[...] }] — rỗng = không có gì chặn. */
  function blockers(kq, extra) {
    kq = kq || {}; var out = [];
    RULES.forEach(function (r) { var it = r.test(kq); if (it.length) out.push({ code: r.code, ten: r.ten, count: it.length, items: it }); });
    (extra || []).forEach(function (x) { if (x && x.items && x.items.length) out.push({ code: x.code, ten: x.ten, count: x.items.length, items: x.items }); });
    return out;
  }
  function summary(bl) { return (bl || []).map(function (b) { return b.code + " ×" + b.count; }).join(", "); }
  var PAYROLL_FILE = /(?<!khoi[ _-]?)(?<!san[ _-]?)(?<!so[ _-]?)(?<!sl[ _-]?)luong|thanhtoan|payslip|phieu ?luong|bangtinh|tonghop ?luong|kechuyenkhoan|ke ?chuyen ?khoan|chuyenkhoan/i;
  function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D"); }
  function isPayrollFile(name) { return PAYROLL_FILE.test(String(name || "")) || PAYROLL_FILE.test(slug(name)); }
  function requiresPayrollExportCheck(name) {
    var normalized = slug(name);
    return !/^mau[_ -]/i.test(normalized) && isPayrollFile(normalized.replace(/luong ?hak/ig, "").replace(/ma[ _-]?luong/ig, ""));
  }
  var api = { isPayrollFile: isPayrollFile, requiresPayrollExportCheck: requiresPayrollExportCheck, blockers: blockers, summary: summary, insuranceRateIssues: insuranceRateIssues, RULES: RULES.map(function (r) { return { code: r.code, ten: r.ten }; }) };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else { root.HAKCore = root.HAKCore || {}; root.HAKCore.gate = api; }
})(typeof window !== "undefined" ? window : this);
