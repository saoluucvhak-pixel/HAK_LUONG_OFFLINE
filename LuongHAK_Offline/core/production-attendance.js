(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const V = node ? require("./validate.js") : root.HAKCore.validate;
  const key = (row) => JSON.stringify([row.date, row.team, row.employee]);

  function affected(db, entries) {
    const HR = node ? require("../hr.js") : root.HRM;
    const byPeriod = new Map(), rows = [];
    for (const entry of entries) {
      const period = entry.date.slice(0, 7);
      if (!byPeriod.has(period)) {
        const [year, month] = period.split("-").map(Number);
        const baseline = Object.assign({}, db, { productionAttendance: [] });
        byPeriod.set(period, ["sanluong", "bandam"].flatMap(table => {
          const { audit, attendanceReview } = HR.sanLuongKy(baseline, year, month, table).alloc;
          return attendanceReview.filter(receipt => audit.some(line => line.phieu === receipt.phieu &&
            line.ngay === receipt.ngay && line.maPB === receipt.maPB && !line.pending)).map(receipt => ({ table, ...receipt }));
        }));
      }
      for (const receipt of byPeriod.get(period)) {
        if (receipt.ngay === entry.date && receipt.maPB === entry.team &&
            receipt.employees.some(employee => employee.ma === entry.employee)) rows.push({ entry, receipt });
      }
    }
    return rows;
  }

  function checkChanges(before, next, who) {
    const prior = before.productionAttendance || [], rows = next.productionAttendance || [];
    if (!Array.isArray(rows) || !who.perms.includes("input.edit")) return "Cần quyền sửa đầu vào sản lượng.";
    if (rows.some(row => !row || !row.employee || !row.team || !row.date || V.normDate(row.date) !== row.date ||
      !String(row.reason || "").trim()) || new Set(rows.map(key)).size !== rows.length) return "Xác nhận ca dài thiếu thông tin hoặc bị trùng.";
    const oldByKey = new Map(prior.map(row => [key(row), row])), newByKey = new Map(rows.map(row => [key(row), row]));
    const add = rows.filter(row => JSON.stringify(oldByKey.get(key(row))) !== JSON.stringify(row));
    const removed = prior.filter(row => !newByKey.has(key(row)));
    for (const row of add.concat(removed)) {
      const period = row.date.slice(0, 7);
      if ([...(before.kyluong || []), ...(next.kyluong || [])].some(snap => snap.ky === period) ||
          (before._yearArchives || []).some(ref => ref.active && String(ref.year) === period.slice(0, 4)) ||
          (before.sl_chuyenky || []).some(carry => carry.source === period)) return "Kỳ " + period + " đã khóa xác nhận ca dài.";
    }
    if (add.some(row => row.user !== String(who.user || "").toLowerCase())) return "Người xác nhận phải là tài khoản đang đăng nhập.";
    const eligible = new Set(affected(next, add).map(row => key(row.entry)));
    if (add.some(row => !eligible.has(key(row)))) return "Chỉ xác nhận cho người thuộc phiếu có chênh lệch và tổ có chấm công ngày phân bổ.";
    return "";
  }

  const api = { key, affected, checkChanges };
  if (node) module.exports = api; else root.HAKCore.productionAttendance = api;
})(typeof window !== "undefined" ? window : this);
