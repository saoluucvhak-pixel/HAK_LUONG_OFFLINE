// ===== CORE / IDENTITY — 1 người = 1 Số CCCD: chặn 1 người có 2 Mã NV (bị trả lương 2 lần) =====
// - payrollDuplicates: CCCD trùng giữa các nhân viên CÓ TRONG BẢNG LƯƠNG kỳ đang chốt → lỗi chặn chốt kỳ (như Mã NV trùng).
// - checkWrite: sửa ô / dán / form hồ sơ — gán CCCD đã thuộc người khác → từ chối.
// - blockImportItems: nhập Excel — dòng gán CCCD của người khác (đã có hoặc dòng khác trong cùng file) → "Xung đột (không ghi)".
// CCCD lấy từ Hồ sơ nhân sự (nhanvien) và Thông tin cá nhân (canhan, mọi bản hiệu lực). Không đổi engine / công thức lương.
(function (root) {
  "use strict";
  var TABLES = { nhanvien: 1, canhan: 1 }, COL = "Số CCCD";

  /** "049 090 001 234" / 49090001234 (Excel mất số 0) → "049090001234"; không đủ 12 số → "" (không xét trùng) */
  function normCCCD(v) {
    var s = String(v == null ? "" : v).replace(/\D/g, "");
    if (s.length === 11) s = "0" + s;
    return s.length === 12 ? s : "";
  }
  function owners(db) {
    var map = {};
    Object.keys(TABLES).forEach(function (t) {
      (db[t] || []).forEach(function (r) {
        var c = normCCCD(r && r[COL]), ma = r && r["Mã NV"]; if (!c || !ma) return;
        (map[c] = map[c] || {})[ma] = 1;
      });
    });
    return map;
  }
  /** Các Mã NV đang dùng CCCD này (đã sắp xếp) */
  function ownersOf(db, cccd) { var c = normCCCD(cccd), m = c && owners(db)[c]; return m ? Object.keys(m).sort() : []; }
  /** Mã NV KHÁC `ma` đang dùng CCCD này */
  function conflictFor(db, ma, cccd) { return ownersOf(db, cccd).filter(function (x) { return x !== ma; }); }

  /** maList: Mã NV có trong bảng lương kỳ → [{ cccd, ma: [...], msg }] cho mỗi CCCD dùng cho ≥ 2 người trong danh sách */
  function payrollDuplicates(db, maList) {
    var inKy = {}; (maList || []).forEach(function (m) { inKy[m] = 1; });
    var map = owners(db), out = [];
    Object.keys(map).sort().forEach(function (c) {
      var ma = Object.keys(map[c]).filter(function (m) { return inKy[m]; }).sort();
      if (ma.length > 1) out.push({ cccd: c, ma: ma, msg: "Số CCCD " + c + " dùng cho " + ma.length + " nhân viên trong bảng lương kỳ này: " + ma.join(", ") + " → 1 người đang bị TRẢ LƯƠNG 2 LẦN. Gộp về 1 Mã NV (hoặc sửa CCCD nhập sai) rồi tính lại." });
    });
    return out;
  }

  /** Ghi 1 dòng (before = dòng cũ hoặc null, patch = các ô mới) → "" nếu được, ngược lại là lý do từ chối */
  function checkWrite(db, table, before, patch) {
    if (!TABLES[table] || !patch || !(COL in patch)) return "";
    var c = normCCCD(patch[COL]), ma = patch["Mã NV"] || (before && before["Mã NV"]);
    if (!c || !ma) return "";
    var other = conflictFor(db, ma, c);
    return other.length ? "⛔ Số CCCD " + c + " đã thuộc nhân viên " + other.join(", ") + " — 1 người chỉ có 1 Mã NV (tránh trả lương 2 lần). Sửa hồ sơ của nhân viên đó thay vì tạo mã mới." : "";
  }

  /** Kế hoạch nhập Excel (core/importer.js plan().items): đánh dấu "conflict" các dòng add/update gán CCCD của người khác */
  function blockImportItems(db, table, items) {
    if (!TABLES[table]) return items;
    var key = function (it) { return { c: normCCCD(it.row[COL]), ma: it.row["Mã NV"] || (it.target && it.target["Mã NV"]) }; };
    var live = (items || []).filter(function (it) { return it && (it.action === "add" || it.action === "update"); }), rest = [], inFile = {};
    // 1. trùng với người ĐÃ CÓ trong dữ liệu → không ghi (chính người sở hữu CCCD đó vẫn được cập nhật)
    live.forEach(function (it) {
      var k = key(it); if (!k.c || !k.ma) return;
      var db0 = conflictFor(db, k.ma, k.c);
      if (db0.length) { it.action = "conflict"; it.reason = "Số CCCD " + k.c + " đã thuộc nhân viên " + db0.join(", ") + " — 1 người chỉ có 1 Mã NV (tránh trả lương 2 lần)"; return; }
      rest.push(it); (inFile[k.c] = inFile[k.c] || {})[k.ma] = 1;
    });
    // 2. các dòng còn lại trong cùng file dùng chung 1 CCCD cho nhiều Mã NV → không ghi dòng nào (không biết dòng nào đúng)
    rest.forEach(function (it) {
      var k = key(it), file0 = Object.keys(inFile[k.c] || {}).filter(function (x) { return x !== k.ma; }).sort();
      if (file0.length) { it.action = "conflict"; it.reason = "Số CCCD " + k.c + " trùng với dòng khác trong file (Mã NV " + file0.join(", ") + ") — 1 người chỉ có 1 Mã NV"; }
    });
    return items;
  }

  var api = { normCCCD: normCCCD, ownersOf: ownersOf, conflictFor: conflictFor, payrollDuplicates: payrollDuplicates, checkWrite: checkWrite, blockImportItems: blockImportItems };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.identity = api; }
})(typeof window !== "undefined" ? window : this);
