// ===== UI / HAK TRANSFER LIST (v2.1.11) — "Danh sách chuyển khoản" xuất từ màn Tính lương (rà soát A6-03, chủ chọn phương án (b) ngày 24/11/2026) =====
// Trước: lọc HTTT = Chuyển khoản và Thực lĩnh > 0, KHÔNG trừ số đã chi / đang chờ chi, không kiểm tài khoản, xuất được cả kỳ chưa chốt mà không ghi nhãn → có thể chuyển trùng/lệch.
// Nay (cùng quy tắc với "Bảng kê chuyển khoản" rp_ck, core/reporting/payroll-reports.js): Số tiền = ĐỀ NGHỊ CHI (thực lĩnh − đã chi − đang chờ chi); người đã chi đủ thì không có dòng;
// cột Đã thanh toán / Đang chờ chi; cột Kiểm tra (thiếu/sai số tài khoản, thiếu ngân hàng, vượt chi); kỳ CHƯA chốt ghi rõ "TẠM TÍNH". Hàm thuần; nạp bằng <script> hoặc require().
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.transferList = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  var COLS = ["STT", "Mã NV", "Họ và tên", "Số tài khoản", "Ngân hàng", "Thực lĩnh", "Đã thanh toán", "Đang chờ chi", "Số tiền", "Nội dung", "Kiểm tra"];
  var COLS_TAM = COLS.concat(["Trạng thái"]);
  function s(v) { return v == null ? "" : String(v).trim(); }
  /**
   * @param bangluong rows bảng lương kỳ; @param ky "yyyy-mm"; @param opts { chot: bool, lines: sổ chứng từ, outstanding: (rows, lines, ky) => [...] (core/payment-ledger), isChuyenKhoan: (httt) => bool }
   * @returns { name, cols, rows, tam, warnings: [text] }
   */
  function build(bangluong, ky, opts) {
    var mm = String(ky).split("-"), tam = !opts.chot;
    var sel = (bangluong || []).filter(function (x) { return opts.isChuyenKhoan(x["HTTT"]) && Number(x["Thực lĩnh"]) > 0; });
    var os = opts.outstanding(sel, opts.lines || [], ky), by = {}; os.forEach(function (o) { by[o.maNV] = o; });
    var rows = [], warnings = [], acc = {};
    sel.forEach(function (x) {
      var o = by[x["Mã NV"]]; if (!o || !(o.deNghiChi > 0)) return; // đã chi đủ / đang chờ chi đủ → không chuyển nữa
      var stk = s(x["Số tài khoản"]), nh = s(x["Ngân hàng"]), loi = [];
      if (!stk) loi.push("thiếu số tài khoản"); else if (!/^[0-9A-Za-z .\-]{6,30}$/.test(stk)) loi.push("số tài khoản không hợp lệ");
      if (!nh) loi.push("thiếu ngân hàng");
      if (o.vuotChi > 0) loi.push("đã chi/đang chờ chi vượt thực lĩnh");
      if (stk) { if (acc[stk] && acc[stk] !== x["Mã NV"]) loi.push("trùng số tài khoản với " + acc[stk]); acc[stk] = x["Mã NV"]; }
      var r = { "STT": rows.length + 1, "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"], "Số tài khoản": stk, "Ngân hàng": nh, "Thực lĩnh": o.thucLinh, "Đã thanh toán": o.daTra, "Đang chờ chi": o.dangCho, "Số tiền": o.deNghiChi,
        "Nội dung": "Luong T" + (+mm[1]) + "/" + mm[0] + " " + x["Mã NV"], "Kiểm tra": loi.length ? "CẦN SỬA: " + loi.join("; ") : "Đạt" };
      if (tam) r["Trạng thái"] = "TẠM TÍNH — kỳ chưa chốt, KHÔNG dùng để chuyển tiền";
      rows.push(r);
    });
    var bad = rows.filter(function (r) { return r["Kiểm tra"] !== "Đạt"; }).length;
    if (bad) warnings.push(bad + " dòng cần sửa trước khi chuyển (xem cột Kiểm tra).");
    if (tam) warnings.push("Kỳ chưa chốt: danh sách chỉ để xem trước, số liệu có thể đổi.");
    return { name: tam ? "ChuyenKhoan_TAM" : "ChuyenKhoan", cols: tam ? COLS_TAM : COLS, rows: rows, tam: tam, warnings: warnings };
  }
  return { build: build, COLS: COLS, COLS_TAM: COLS_TAM };
});
