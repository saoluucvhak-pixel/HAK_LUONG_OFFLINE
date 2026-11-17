(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const V = node ? require("./validate.js") : root.HAKCore.validate;
  // Cùng định dạng với core/workflow-approval.js (validApprovalTime): chuỗi ISO UTC có mili giây, đúng một ngày giờ có thật.
  const validTime = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  const latest = (rows, date) => rows.filter(row => row.from <= date && (!row.until || row.until >= date))
    .reduce((found, row) => !found || row.from > found.from ? row : found, null);
  // Phiên bản "đang chi phối" tại một ngày = bản có hiệu lực từ MỚI NHẤT không muộn hơn ngày đó. Nếu bản đó đã hết hạn thì
  // KHÔNG có định mức từ ngày hết hạn; không tự quay lại bản cũ hơn. Chỉ khi người dùng tạo phiên bản hiệu lực mới thì mới có lại.
  const governing = (rows, date) => rows.filter(row => row.from <= date)
    .reduce((found, row) => !found || row.from > found.from ? row : found, null);
  const covers = (row, date) => !!row && row.from <= date && (!row.until || row.until >= date);

  /** Phiên bản của tiêu chuẩn `code` tại `date`: { status: "ok" | "expired" | "none", rule } (expired: rule là bản đã hết hạn). */
  function standardAt(db, code, date) {
    const rule = governing((db.benefitStandards || []).filter(row => row.code === code), date);
    return { status: !rule ? "none" : covers(rule, date) ? "ok" : "expired", rule };
  }
  /** Thông báo cho người dùng khi tiêu chuẩn không có hiệu lực tại ngày bắt đầu áp dụng; rỗng nếu hợp lệ. */
  function standardProblem(db, code, date) {
    const found = standardAt(db, code, date);
    if (found.status === "none") return "Tiêu chuẩn " + code + " chưa có phiên bản hiệu lực từ ngày " + date + ".";
    if (found.status === "expired") return "Tiêu chuẩn " + code + " đã hết hạn ngày " + found.rule.until + ", không gắn được từ ngày " + date + ". Tạo phiên bản hiệu lực mới cho tiêu chuẩn này trước.";
    return "";
  }

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
      const assignment = governing(assignments.filter(row => row.contract === contract.id), date);
      if (!covers(assignment, date)) continue;
      const found = standardAt(db, assignment.code, date);
      if (found.status !== "ok") continue;
      const rule = found.rule;
      rule.items.forEach(item => {
        const prior = accumulated.get(item.code) || { code: item.code, name: item.name, unit: item.unit, numerator: 0 };
        accumulated.set(item.code, { ...prior, numerator: prior.numerator + item.quantity });
      });
    }
    return Array.from(accumulated.values(), ({ numerator, ...item }) => ({ ...item, allowance: Math.floor(numerator / monthDays) }));
  }

  const GROUPS = ["Quần áo", "Áo mưa", "Giày", "Mũ"];
  /** Loại phiếu: "milk" (sữa phúc lợi, mặc định cho dữ liệu cũ) hoặc "ppe" (bảo hộ lao động). */
  const docType = doc => doc && doc.type === "ppe" ? "ppe" : "milk";
  const sizeOf = line => String((line && line.size) || "").trim();
  /** Số đã thu hồi (một phần hoặc đổi cỡ) theo phiếu gốc: Map [ref, employee, item, size] → số lượng. */
  function recalledByRef(db, ignoreId) {
    const totals = new Map();
    (db.benefitAdjustments || []).forEach(adj => {
      if (adj.id === ignoreId) return;
      (adj.lines || []).forEach(line => {
        const key = JSON.stringify([adj.ref, line.employee, line.item, sizeOf(line)]);
        totals.set(key, (totals.get(key) || 0) + line.quantity);
      });
    });
    return totals;
  }

  /** Số thực cấp sữa theo (nhân viên, mặt hàng) trong tháng hưởng: phiếu đã xác nhận trừ phần thu hồi một phần. */
  function issued(db, period, ignoreId) {
    const totals = new Map(), docs = new Map((db.benefitIssues || []).map(doc => [doc.id, doc]));
    docs.forEach(doc => {
      if (docType(doc) !== "milk" || doc.period !== period || doc.id === ignoreId || doc.status !== "issued") return;
      doc.lines.forEach(line => {
        const key = JSON.stringify([line.employee, line.item]);
        totals.set(key, (totals.get(key) || 0) + line.quantity);
      });
    });
    (db.benefitAdjustments || []).forEach(adj => {
      const doc = docs.get(adj.ref);
      if (!doc || docType(doc) !== "milk" || doc.period !== period || doc.status !== "issued") return;
      (adj.lines || []).forEach(line => {
        const key = JSON.stringify([line.employee, line.item]);
        totals.set(key, (totals.get(key) || 0) - line.quantity);
      });
    });
    return totals;
  }

  /**
   * Báo cáo phúc lợi tháng theo (nhân viên, mặt hàng): định mức còn hiệu lực + số ĐÃ CẤP theo phiếu đã xác nhận (status "issued";
   * phiếu nháp và phiếu đã thu hồi không cộng). Mặt hàng đã từng cấp trong tháng nhưng nay không còn định mức hiệu lực (tiêu chuẩn
   * bị thay thế/hết hạn) vẫn có dòng với số đã cấp và ghi chú NO_STANDARD_NOTE — số liệu đã cấp không bị mất.
   * Mỗi dòng: { employee, name, code, itemName, unit, allowance, given, remaining, over, docs: [mã phiếu], note }.
   */
  const NO_STANDARD_NOTE = "Không còn định mức hiệu lực";
  function monthlyReport(db, period) {
    const given = issued(db, period), docs = new Map();
    (db.benefitIssues || []).forEach(doc => {
      if (docType(doc) !== "milk" || doc.period !== period || doc.status !== "issued") return;
      (doc.lines || []).forEach(line => {
        const key = JSON.stringify([line.employee, line.item]);
        const list = docs.get(key) || []; if (!list.includes(doc.id)) list.push(doc.id); docs.set(key, list);
      });
    });
    const catalog = new Map();
    (db.benefitStandards || []).slice().sort((a, b) => String(a.from).localeCompare(String(b.from))).forEach(rule =>
      (rule.items || []).forEach(item => catalog.set(item.code, { name: item.name, unit: item.unit })));
    const people = new Map();
    (db.nhanvien || []).forEach(row => people.set(row["Mã NV"], row["Họ và tên"] || ""));
    given.forEach((_, key) => { const employee = JSON.parse(key)[0]; if (!people.has(employee)) people.set(employee, ""); });
    const rows = [];
    people.forEach((name, employee) => {
      const seen = new Set();
      entitlement(db, employee, period).forEach(item => {
        const key = JSON.stringify([employee, item.code]), taken = given.get(key) || 0; seen.add(item.code);
        rows.push({ employee, name, code: item.code, itemName: item.name, unit: item.unit, allowance: item.allowance, given: taken,
          remaining: Math.max(0, item.allowance - taken), over: Math.max(0, taken - item.allowance), docs: docs.get(key) || [], note: "" });
      });
      given.forEach((taken, key) => {
        const [owner, code] = JSON.parse(key); if (owner !== employee || seen.has(code)) return;
        const info = catalog.get(code) || { name: code, unit: "" };
        rows.push({ employee, name, code, itemName: info.name, unit: info.unit, allowance: 0, given: taken, remaining: 0, over: 0, docs: docs.get(key) || [], note: NO_STANDARD_NOTE });
      });
    });
    return rows;
  }

  function reviewMilk(db, doc) {
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

  /** Rà phiếu bảo hộ lao động: nhân viên có thật, vật tư còn sử dụng, đúng cỡ, số lượng nguyên dương, không trùng dòng. */
  function reviewPpe(db, doc) {
    const issues = [], entries = [], seen = new Set();
    if (!doc || !V.normDate(doc.date) || V.normDate(doc.date) !== doc.date || doc.date.slice(0, 7) !== doc.period ||
        !String(doc.id || "").trim() || !Array.isArray(doc.lines) || !doc.lines.length) {
      return { issues: ["Cần mã phiếu, ngày cấp, dòng nhận và tháng hưởng trùng tháng cấp."], entries };
    }
    const people = new Set((db.nhanvien || []).map(row => row["Mã NV"])), items = new Map((db.benefitPpeItems || []).map(item => [item.code, item]));
    doc.lines.forEach((line, index) => {
      if (!line || !line.employee || !line.item) { issues.push("Dòng " + (index + 1) + ": thiếu mã nhân viên hoặc mã vật tư."); return; }
      const { employee, item, quantity } = line, size = sizeOf(line), label = "Dòng " + (index + 1) + " — " + employee + " / " + item + (size ? " / cỡ " + size : "");
      const key = JSON.stringify([employee, item, size]);
      if (seen.has(key)) { issues.push(label + ": trùng nhân viên, vật tư và kích cỡ trong phiếu."); return; }
      seen.add(key);
      if (!people.has(employee)) issues.push(label + ": không có nhân viên này.");
      const catalog = items.get(item), sizes = catalog ? catalog.sizes || [] : [];
      if (!catalog) issues.push(label + ": vật tư chưa có trong danh mục bảo hộ lao động.");
      else {
        if (catalog.active === false) issues.push(label + ": vật tư đã ngừng sử dụng, không cấp mới.");
        if (sizes.length && !size) issues.push(label + ": vật tư này cần chọn kích cỡ.");
        else if (sizes.length && !sizes.includes(size)) issues.push(label + ": sai kích cỡ (hợp lệ: " + sizes.join(", ") + ").");
        else if (!sizes.length && size) issues.push(label + ": vật tư này không có kích cỡ.");
      }
      if (!Number.isSafeInteger(quantity) || quantity <= 0) { issues.push(label + ": số lượng phải là số nguyên dương."); return; }
      entries.push({ employee, item, size, quantity });
    });
    return { issues, entries };
  }
  const reviewIssue = (db, doc) => docType(doc) === "ppe" ? reviewPpe(db, doc) : reviewMilk(db, doc);

  /** Kiểm tra một dòng danh mục vật tư bảo hộ; rỗng nếu hợp lệ. */
  function ppeItemProblem(item) {
    const text = value => typeof value === "string" && value.trim();
    if (!item || !text(item.code) || !text(item.name) || !text(item.group) || !text(item.unit)) return "Vật tư cần mã, tên, nhóm hàng và đơn vị tính.";
    if (typeof item.active !== "boolean") return "Cần ghi rõ trạng thái sử dụng của vật tư " + item.code + ".";
    if (item.spec != null && typeof item.spec !== "string") return "Quy cách vật tư " + item.code + " không hợp lệ.";
    if (!Array.isArray(item.sizes) || item.sizes.some(size => !text(size)) || new Set(item.sizes.map(size => size.trim())).size !== item.sizes.length) return "Danh sách kích cỡ của " + item.code + " không hợp lệ hoặc trùng.";
    return "";
  }

  /** Số còn có thể thu hồi theo từng dòng của phiếu đã xác nhận: [{ employee, item, size, issued, recalled, remaining }]. */
  function recallable(db, voucherId, ignoreAdjustment) {
    const doc = (db.benefitIssues || []).find(row => row.id === voucherId), taken = recalledByRef(db, ignoreAdjustment), totals = new Map();
    if (!doc || doc.status !== "issued") return [];
    doc.lines.forEach(line => {
      const key = JSON.stringify([line.employee, line.item, sizeOf(line)]), entry = totals.get(key) || { employee: line.employee, item: line.item, size: sizeOf(line), issued: 0 };
      entry.issued += line.quantity; totals.set(key, entry);
    });
    return Array.from(totals.entries(), ([key, entry]) => {
      const recalled = taken.get(JSON.stringify([voucherId, entry.employee, entry.item, entry.size])) || 0;
      return { ...entry, recalled, remaining: entry.issued - recalled };
    });
  }

  /** Thu hồi một phần / đổi cỡ: tham chiếu phiếu gốc đã xác nhận, ghi lý do + người thao tác + thời điểm, không vượt số còn lại. */
  function adjustmentProblem(db, adj) {
    const text = value => typeof value === "string" && value.trim();
    const doc = (db.benefitIssues || []).find(row => row.id === (adj && adj.ref));
    if (!adj || !text(adj.id)) return "Điều chỉnh cần mã.";
    if (!doc) return "Không tìm thấy phiếu gốc " + (adj.ref || "") + ".";
    if (doc.status !== "issued") return "Chỉ thu hồi hoặc điều chỉnh phiếu đã xác nhận.";
    if (!["recall", "resize"].includes(adj.kind)) return "Loại điều chỉnh không hợp lệ.";
    if (!text(adj.reason)) return "Cần ghi lý do thu hồi hoặc điều chỉnh.";
    if (!text(adj.by) || !validTime(adj.at)) return "Thiếu người thao tác hoặc thời điểm điều chỉnh.";
    if (adj.date != null && (!V.normDate(adj.date) || V.normDate(adj.date) !== adj.date || adj.date < doc.date)) return "Ngày giao dịch không hợp lệ hoặc trước ngày cấp gốc.";
    if (!Array.isArray(adj.lines) || !adj.lines.length) return "Cần ít nhất một dòng thu hồi.";
    const remaining = new Map(recallable(db, doc.id, adj.id).map(entry => [JSON.stringify([entry.employee, entry.item, entry.size]), entry]));
    const used = new Map();
    for (const line of adj.lines) {
      if (!line || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) return "Số lượng thu hồi phải là số nguyên dương.";
      const key = JSON.stringify([line.employee, line.item, sizeOf(line)]), entry = remaining.get(key);
      if (!entry) return "Dòng " + line.employee + " / " + line.item + (sizeOf(line) ? " / cỡ " + sizeOf(line) : "") + " không có trong phiếu " + doc.id + ".";
      const total = (used.get(key) || 0) + line.quantity; used.set(key, total);
      if (total > entry.remaining) return "Thu hồi vượt số lượng còn lại của " + line.employee + " / " + line.item + (sizeOf(line) ? " / cỡ " + sizeOf(line) : "") + " (còn " + entry.remaining + ").";
    }
    if (adj.kind === "resize") {
      if (docType(doc) !== "ppe") return "Chỉ đổi cỡ cho phiếu bảo hộ lao động.";
      if (!Array.isArray(adj.to) || !adj.to.length) return "Đổi cỡ cần các dòng cấp cỡ mới.";
      const catalog = new Map((db.benefitPpeItems || []).map(item => [item.code, item])), out = new Map(), inn = new Map();
      adj.lines.forEach(line => out.set(JSON.stringify([line.employee, line.item]), (out.get(JSON.stringify([line.employee, line.item])) || 0) + line.quantity));
      for (const line of adj.to) {
        const item = catalog.get(line && line.item), size = sizeOf(line);
        if (!line || !item) return "Cỡ mới: vật tư không có trong danh mục.";
        if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) return "Cỡ mới: số lượng phải là số nguyên dương.";
        if (!(item.sizes || []).includes(size)) return "Cỡ mới " + size + " của " + line.item + " không hợp lệ.";
        if (adj.lines.some(old => old.employee === line.employee && old.item === line.item && sizeOf(old) === size)) return "Cỡ mới phải khác cỡ thu hồi.";
        const key = JSON.stringify([line.employee, line.item]); inn.set(key, (inn.get(key) || 0) + line.quantity);
      }
      if (out.size !== inn.size || Array.from(out).some(([key, quantity]) => inn.get(key) !== quantity)) return "Đổi cỡ: số lượng cấp cỡ mới phải bằng số lượng thu hồi cỡ cũ của từng người.";
    } else if (adj.to !== undefined && adj.to !== null && !(Array.isArray(adj.to) && !adj.to.length)) return "Thu hồi không kèm dòng cấp mới.";
    return "";
  }

  function validateChanges(table, before, next, who, mode) {
    const rows = next[table] || [], prior = before[table] || [];
    if (!Array.isArray(rows)) return "Dữ liệu phúc lợi sai cấu trúc.";
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const text = value => typeof value === "string" && value.trim();
    const date = value => text(value) && V.normDate(value) === value;
    const grants = who.perms || [];
    if (table === "benefitPpeItems") {
      if (!grants.includes("dm.edit")) return "Bạn chưa có quyền cập nhật danh mục đồ bảo hộ lao động.";
      const codes = rows.map(row => row && row.code);
      if (new Set(codes).size !== codes.length) return "Mã vật tư bảo hộ bị trùng.";
      for (const row of rows) { const problem = ppeItemProblem(row); if (problem) return problem; }
      // Không xóa vật tư và không đổi mã: vật tư đã cấp chỉ được ngừng sử dụng để phiếu cũ vẫn tra cứu được.
      if (prior.some(old => !rows.some(row => row.code === old.code))) return "Ngừng sử dụng vật tư thay vì xóa để phiếu cũ còn tra cứu được.";
      return "";
    }
    if (table === "benefitAdjustments") {
      const account = String(who.user || "").toLowerCase();
      if (!prior.every(old => rows.some(row => same(row, old)))) return "Điều chỉnh đã ghi không được sửa hoặc xóa.";
      const ids = rows.map(row => row && row.id);
      if (ids.some(id => !text(id)) || new Set(ids).size !== ids.length) return "Mã điều chỉnh bị trùng hoặc thiếu.";
      for (const adj of rows) {
        if (prior.some(old => same(old, adj))) continue;
        const problem = adjustmentProblem(next, adj); if (problem) return problem;
        const doc = (next.benefitIssues || []).find(row => row.id === adj.ref);
        if (mode === "roles" ? !grants.includes("hr.approve") || doc.maker === account : !grants.includes("system.admin")) return "Cần người có quyền xác nhận phúc lợi; trong chế độ phân quyền phải khác người lập phiếu gốc.";
        if (String(adj.by).toLowerCase() !== account) return "Người thao tác phải là tài khoản đang đăng nhập.";
      }
      return "";
    }
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
        } else {
          if (!(next.hopdong || []).some(contract => contract["Mã NV"] === row.employee && contract["Số HĐLĐ"] === row.contract)) return "Không tìm thấy hợp đồng của nhân viên.";
          // Chỉ kiểm dòng mới hoặc vừa đổi: dòng cũ giữ nguyên (đã bất biến ở trên), không bị chặn ngược khi sau đó có thêm phiên bản tiêu chuẩn.
          if (!prior.some(old => same(old, row))) { const problem = standardProblem(next, row.code, row.from); if (problem) return problem; }
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
      if (doc.type !== undefined && !["milk", "ppe"].includes(doc.type)) return "Loại phiếu cấp phát không hợp lệ.";
      if (old && old.status === "draft" && doc.status === "draft") {
        // Sửa nháp: chỉ người lập, giữ nguyên mã phiếu, loại phiếu và người lập; nội dung phải qua đủ kiểm tra như phiếu mới.
        if (!grants.includes("hr.edit") || old.maker !== account || doc.maker !== old.maker || doc.id !== old.id || docType(doc) !== docType(old)) return "Chỉ người lập được sửa phiếu nháp của mình.";
        const check = reviewIssue(next, doc);
        if (check.issues.length) return check.issues.join("; ");
        continue;
      }
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
        if (!validTime(doc.confirmedAt)) return "Thời điểm cấp phát không hợp lệ.";
        if (check.issues.length) return check.issues.join("; ");
      } else if (["draft", "issued"].includes(old.status) && doc.status === "recalled") {
        if (!text(doc.reason) || !same(doc, Object.assign({}, old, { status: "recalled", recalledBy: account, reason: doc.reason }))) return "Thu hồi phiếu cần lý do.";
      } else return "Không được sửa nội dung phiếu đã ghi.";
    }
    return "";
  }

  const api = { entitlement, issued, reviewIssue, validateChanges, standardAt, standardProblem, monthlyReport, NO_STANDARD_NOTE,
    GROUPS, docType, sizeOf, ppeItemProblem, recallable, adjustmentProblem, validTime, latest, governing, covers };
  if (node) module.exports = api; else root.HAKCore.benefitsRules = api;
})(typeof window !== "undefined" ? window : this);
