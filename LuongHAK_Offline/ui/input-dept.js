// Phòng ban/tổ của một nhân viên TẠI NGÀY NGHIỆP VỤ của dòng dữ liệu (ngày hạch toán, ngày tạm ứng, ngày ăn cơm, cuối kỳ chấm công).
// Dùng cho bộ lọc, tổng theo bộ lọc, Excel, PDF và in của các màn nhập liệu: không tra tổ HIỆN TẠI để lọc dữ liệu kỳ cũ.
// Không đủ căn cứ lịch sử (không có ngày, chưa có hợp đồng/phụ lục hiệu lực tại ngày đó) → trả tổ rỗng kèm basis, KHÔNG gán tổ hiện tại.
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var ISO = /^\d{4}-\d{2}-\d{2}/;
  /** HRM: module hr.js (hienHanh, buildIndex). Trả { at(ma, date) → { pb, basis } , missing() } ; bộ nhớ đệm theo (mã NV, ngày) trong đời của resolver. */
  function create(db, HRM) {
    var ix = HRM.buildIndex(db), memo = Object.create(null);
    function at(ma, date) {
      var day = String(date || "").slice(0, 10);
      if (!ISO.test(day)) return { pb: "", basis: "no-date" };
      var key = ma + "|" + day;
      if (memo[key]) return memo[key];
      var hh = HRM.hienHanh(db, ma, day, ix), result = { pb: "", basis: "missing" };
      var contract = hh.hd, detail = hh.ct;
      var started = contract && (!contract["Ngày vào làm"] || String(contract["Ngày vào làm"]).slice(0, 10) <= day);
      var effective = detail && ix.rows("chitiethd", ma).some(function (r) { return r["Số HĐLĐ"] === contract["Số HĐLĐ"] && String(r["Hiệu lực từ"] || "").slice(0, 10) <= day; });
      if (hh.pb && started && effective) result = { pb: hh.pb, basis: "ok" };
      return (memo[key] = result);
    }
    return { at: at };
  }
  var api = { create: create };
  if (node) module.exports = api; else { root.HAKUi = root.HAKUi || {}; root.HAKUi.inputDept = api; }
})(typeof window !== "undefined" ? window : this);
