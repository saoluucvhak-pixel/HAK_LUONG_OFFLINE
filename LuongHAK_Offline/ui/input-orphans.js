// ===== UI / HAK INPUT ORPHANS (v2.1.11) — Mã NV "mồ côi" ở Thưởng/Trừ (psluong), Tạm ứng (ungluong), Suất cơm (tiencom) của MỘT kỳ (rà soát A2-03 / T-02) =====
// Vấn đề: dòng có Mã NV sai hoa/thường hoặc không có trong Nhân sự bị engine BỎ QUA im lặng (không trừ tạm ứng / không trả thưởng) mà không có cảnh báo nào chặn chốt.
// Không sửa engine/core (khóa băm): chỉ phát hiện ở lớp app để CHẶN CHỐT kỳ. KHÔNG tự sửa dữ liệu. Có thể nạp bằng <script> hoặc require() (để test).
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.inputOrphans = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  var TABLES = [["psluong", "Thưởng/Trừ"], ["ungluong", "Tạm ứng"], ["tiencom", "Suất cơm"]];
  /**
   * @param db dữ liệu; @param ky "yyyy-mm"; @param deps { rowPeriod: (table,row) => "yyyy-mm" | null }
   * @returns [{ table, label, ma, gan, msg }] — mỗi Mã NV mồ côi một dòng (gom theo bảng + mã); gan = mã Nhân sự khác hoa/thường (nếu có)
   */
  function audit(db, ky, deps) {
    var emp = {}, lower = {};
    (db.nhanvien || []).forEach(function (n) { var m = n && n["Mã NV"]; if (m != null && m !== "") { emp[String(m)] = 1; lower[String(m).trim().toLowerCase()] = String(m); } });
    var out = [], seen = {};
    TABLES.forEach(function (t) {
      (db[t[0]] || []).forEach(function (r) {
        if (!r || r["Mã NV"] == null || String(r["Mã NV"]) === "") return;
        if (deps && deps.rowPeriod && deps.rowPeriod(t[0], r) !== ky) return;
        var ma = String(r["Mã NV"]);
        if (emp[ma]) return;
        var k = t[0] + "|" + ma; if (seen[k]) return; seen[k] = 1;
        var gan = lower[ma.trim().toLowerCase()] || "";
        out.push({ table: t[0], label: t[1], ma: ma, gan: gan, msg: t[1] + ": Mã NV \"" + ma + "\" không khớp Nhân sự" + (gan ? " (gần giống \"" + gan + "\" — sai hoa/thường hoặc có khoảng trắng)" : " (mã không tồn tại)") + " → khoản này bị BỎ QUA khi tính lương. Sửa Mã NV cho đúng rồi tính lại." });
      });
    });
    return out;
  }
  return { audit: audit, TABLES: TABLES };
});
