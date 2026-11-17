(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const V = node ? require("./validate.js") : root.HAKCore.validate;
  const latest = (rows, date) => rows.filter(row => row.from <= date && (!row.until || row.until >= date))
    .reduce((found, row) => !found || row.from > found.from ? row : found, null);

  function entitlement(db, employee, period) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw Error("Tháng hưởng không hợp lệ.");
    const [year, month] = period.split("-").map(Number);
    const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const accumulated = new Map();
    const assignments = (db.benefitAssignments || []).filter(row => row.employee === employee);
    const contracts = (db.hopdong || []).filter(row => row["Mã NV"] === employee).map(row => ({
      id: row["Số HĐLĐ"], from: V.normDate(row["Ngày vào làm"]),
      until: [V.normDate(row["Ngày chấm dứt"]), V.normDate(row["Ngày hết hạn"])].filter(Boolean).sort()[0]
    })).filter(row => row.from);
    for (let day = 1; day <= monthDays; day++) {
      const date = period + "-" + String(day).padStart(2, "0");
      const contract = latest(contracts, date);
      if (!contract) continue;
      const assignment = latest(assignments.filter(row => row.contract === contract.id), date);
      if (!assignment) continue;
      const rule = latest((db.benefitStandards || []).filter(row => row.code === assignment.code), date);
      if (!rule) continue;
      rule.items.forEach(item => {
        const prior = accumulated.get(item.code) || { code: item.code, name: item.name, unit: item.unit, numerator: 0 };
        accumulated.set(item.code, { ...prior, numerator: prior.numerator + item.quantity });
      });
    }
    return Array.from(accumulated.values(), ({ numerator, ...item }) => ({ ...item, allowance: Math.floor(numerator / monthDays) }));
  }

  function issued(db, period, ignoreId) {
    const totals = new Map();
    (db.benefitIssues || []).forEach(doc => {
      if (doc.period !== period || doc.id === ignoreId || doc.status !== "issued") return;
      doc.lines.forEach(line => {
        const key = JSON.stringify([line.employee, line.item]);
        totals.set(key, (totals.get(key) || 0) + line.quantity);
      });
    });
    return totals;
  }

  function reviewIssue(db, doc) {
    const issues = [], entries = [], cache = new Map(), seen = new Set();
    if (!doc || !V.normDate(doc.date) || V.normDate(doc.date) !== doc.date || doc.date.slice(0, 7) !== doc.period ||
        !String(doc.id || "").trim() || !Array.isArray(doc.lines) || !doc.lines.length) {
      return { issues: ["Cần mã phiếu, ngày cấp, dòng nhận và tháng hưởng trùng tháng cấp."], entries };
    }
    const totals = issued(db, doc.period, doc.id);
    doc.lines.forEach((line, index) => {
      if (!line || !line.employee || !line.item) { issues.push("Dòng " + (index + 1) + ": thiếu mã nhân viên hoặc mặt hàng."); return; }
      const { employee, item, quantity } = line;
      const key = JSON.stringify([employee, item]), label = "Dòng " + (index + 1) + " — " + employee + " / " + item;
      if (seen.has(key)) { issues.push(label + ": trùng nhân viên và mặt hàng trong phiếu."); return; }
      seen.add(key);
      if (!Number.isSafeInteger(quantity) || quantity <= 0) { issues.push(label + ": số lượng phải là số nguyên dương."); return; }
      if (!cache.has(employee)) cache.set(employee, entitlement(db, employee, doc.period));
      const eligible = cache.get(employee).find(entry => entry.code === item);
      if (!eligible) { issues.push(label + ": chưa có tiêu chuẩn phúc lợi áp dụng trong tháng."); return; }
      const before = eligible.allowance - (totals.get(key) || 0), after = before - quantity;
      entries.push({ employee, item, quantity, allowance: eligible.allowance, before, after });
      if (after < 0) issues.push(label + ": vượt định mức " + (-after) + " " + eligible.unit + ".");
    });
    return { issues, entries };
  }

  function validateChanges(table, before, next, who, mode) {
    const rows = next[table] || [], prior = before[table] || [];
    if (!Array.isArray(rows)) return "Dữ liệu phúc lợi sai cấu trúc.";
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const text = value => typeof value === "string" && value.trim();
    const date = value => text(value) && V.normDate(value) === value;
    const grants = who.perms || [];
    if (table === "benefitStandards" || table === "benefitAssignments") {
      if (!grants.includes(table === "benefitStandards" ? "dm.edit" : "hr.edit")) return "Bạn chưa có quyền cập nhật tiêu chuẩn phúc lợi.";
      if (!prior.every(row => rows.some(candidate => same(candidate, row)))) return "Tạo dòng hiệu lực mới để giữ tiêu chuẩn cũ.";
      const ids = new Set();
      for (const row of rows) {
        if (!row || !text(row.code) || !date(row.from) || (row.until && (!date(row.until) || row.until < row.from))) return "Thiếu mã hoặc ngày hiệu lực.";
        const id = JSON.stringify(table === "benefitStandards" ? [row.code, row.from] : [row.employee, row.contract, row.from]);
        if (ids.has(id)) return "Trùng ngày hiệu lực của tiêu chuẩn hoặc hợp đồng.";
        ids.add(id);
        if (table === "benefitStandards") {
          if (!Array.isArray(row.items) || !row.items.length || row.items.some(item => !item || !text(item.code) ||
              !text(item.name) || !text(item.unit) || !Number.isSafeInteger(item.quantity) || item.quantity < 0) ||
              new Set(row.items.map(item => item.code)).size !== row.items.length) return "Mặt hàng, đơn vị hoặc định mức tháng không hợp lệ.";
        } else if (!(next.benefitStandards || []).some(rule => rule.code === row.code && rule.from <= row.from) ||
          !(next.hopdong || []).some(contract => contract["Mã NV"] === row.employee && contract["Số HĐLĐ"] === row.contract)) {
          return "Không tìm thấy hợp đồng hoặc tiêu chuẩn có hiệu lực.";
        }
      }
      return "";
    }

    const ids = rows.map(row => row && row.id);
    if (ids.some(id => !text(id)) || new Set(ids).size !== ids.length) return "Mã phiếu cấp phát bị trùng hoặc thiếu.";
    const account = String(who.user || "").toLowerCase();
    const oldById = new Map(prior.map(doc => [doc.id, doc]));
    if (prior.some(doc => !ids.includes(doc.id))) return "Dùng thu hồi để giữ vết phiếu cấp phát.";
    for (const doc of rows) {
      const old = oldById.get(doc.id);
      if (same(old, doc)) continue;
      if (!old) {
        if (!grants.includes("hr.edit") || doc.maker !== account || doc.status !== "draft") return "Chỉ Nhân sự được lập phiếu nháp bằng tài khoản của mình.";
        const check = reviewIssue(next, doc);
        if (check.issues.length) return check.issues.join("; ");
        continue;
      }
      if (mode === "roles" ? !grants.includes("hr.approve") || old.maker === account : !grants.includes("system.admin")) {
        return "Cần người có quyền xác nhận phúc lợi; trong chế độ phân quyền phải khác người lập.";
      }
      if (old.status === "draft" && doc.status === "issued") {
        if (!same(doc, Object.assign({}, old, { status: "issued", reviewer: account, confirmedAt: doc.confirmedAt }))) return "Nội dung phiếu cấp phát đã thay đổi.";
        const check = reviewIssue(next, doc);
        if (!doc.confirmedAt || check.issues.length) return check.issues.join("; ") || "Thiếu thời điểm cấp phát.";
      } else if (["draft", "issued"].includes(old.status) && doc.status === "recalled") {
        if (!text(doc.reason) || !same(doc, Object.assign({}, old, { status: "recalled", recalledBy: account, reason: doc.reason }))) return "Thu hồi phiếu cần lý do.";
      } else return "Không được sửa nội dung phiếu đã ghi.";
    }
    return "";
  }

  const api = { entitlement, issued, reviewIssue, validateChanges };
  if (node) module.exports = api; else root.HAKCore.benefits = api;
})(typeof window !== "undefined" ? window : this);
