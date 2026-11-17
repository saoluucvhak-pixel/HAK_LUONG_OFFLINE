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

  // ===================== Cấp phát thống nhất: sổ cái, báo cáo, nhập Excel =====================
  const norm = value => String(value == null ? "" : value).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, " ").trim();
  const NO_DEPT = { code: "", name: "(Chưa có tổ/phòng ban)" };
  const LABEL = { milk: "Sữa phúc lợi", ppe: "Bảo hộ lao động" };

  function catalogOf(db) {
    const milk = new Map(), ppe = new Map((db.benefitPpeItems || []).map(item => [item.code, item]));
    (db.benefitStandards || []).slice().sort((a, b) => String(a.from).localeCompare(String(b.from))).forEach(rule =>
      (rule.items || []).forEach(item => milk.set(item.code, { name: item.name, unit: item.unit })));
    return { milk, ppe };
  }
  /** Thông tin lịch sử ghi vào dòng phiếu tại ngày cấp (tổ, tên người, tên và đơn vị vật tư), để báo cáo cũ không đổi khi đổi tổ hoặc đổi tên vật tư. */
  function snapshotLine(db, type, line, date, deptOf) {
    const catalog = catalogOf(db), person = (db.nhanvien || []).find(row => row["Mã NV"] === line.employee), dept = (deptOf && deptOf(line.employee, date)) || NO_DEPT;
    const item = type === "ppe" ? catalog.ppe.get(line.item) : catalog.milk.get(line.item);
    return { ...line, size: sizeOf(line), employeeName: person ? person["Họ và tên"] || "" : "", dept: dept.code || "", deptName: dept.name || "",
      itemName: item ? item.name : line.item, unit: item ? item.unit : "" };
  }
  function buildVoucher(db, input, deptOf) {
    const type = input.type === "ppe" ? "ppe" : "milk";
    return { id: input.id, type, date: input.date, period: input.date.slice(0, 7), place: input.place || "", purpose: input.purpose || "", note: input.note || "",
      lines: input.lines.map(line => snapshotLine(db, type, line, input.date, deptOf)), maker: input.maker, status: "draft" };
  }

  /**
   * Sổ cái cấp phát: mỗi dòng là MỘT lượt cấp hoặc thu hồi. Phiếu nháp có "counted: false" (không tính thực cấp).
   * Mỗi lượt giữ tổ/phòng ban, tên và đơn vị vật tư, cỡ ĐÃ LƯU trên dòng cấp gốc tại ngày cấp — kể cả lượt thu hồi và lượt cấp thay thế
   * khi đổi cỡ (lấy từ chính dòng gốc, không tra lại tổ hiện tại). Chỉ dòng cũ thiếu thông tin lịch sử mới suy ra từ hồ sơ hợp đồng tại ngày cấp
   * (deptSource "history") hoặc đánh dấu thiếu căn cứ (deptSource "missing") để người dùng đối chiếu.
   * ngày (date) = ngày giao dịch của lượt (ngày cấp, hoặc ngày thu hồi/đổi cỡ); origDate = ngày cấp của phiếu gốc; period = tháng hưởng của phiếu gốc.
   */
  function ledger(db, deptOf, all) {
    const catalog = catalogOf(db), people = new Map((db.nhanvien || []).map(row => [row["Mã NV"], row["Họ và tên"] || ""])), entries = [];
    const docs = new Map((db.benefitIssues || []).map(doc => [doc.id, doc]));
    const fill = (type, line, date) => {
      const item = type === "ppe" ? catalog.ppe.get(line.item) : catalog.milk.get(line.item);
      let dept, deptSource;
      if (line.deptName != null && line.dept != null) { dept = { code: line.dept, name: line.deptName }; deptSource = "snapshot"; }
      else { const found = deptOf && deptOf(line.employee, date); if (found) { dept = found; deptSource = "history"; } else { dept = NO_DEPT; deptSource = "missing"; } }
      return { employee: line.employee, employeeName: line.employeeName != null ? line.employeeName : people.get(line.employee) || "", dept: dept.code || "", deptName: dept.name || NO_DEPT.name, deptSource,
        item: line.item, itemName: line.itemName || (item ? item.name : line.item), unit: line.unit || (item ? item.unit : ""), size: sizeOf(line) };
    };
    const original = (doc, line) => (doc.lines || []).find(row => row.employee === line.employee && row.item === line.item && sizeOf(row) === sizeOf(line)) || null;
    const clock = at => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(at || "")) ? String(at).slice(0, 10) + " " + String(at).slice(11, 16) : "";
    docs.forEach(doc => {
      const type = docType(doc), wasIssued = doc.status === "issued" || (doc.status === "recalled" && !!doc.confirmedAt);
      if (doc.status === "recalled" && !wasIssued && !all) return; // nháp bị hủy: chưa từng cấp (chỉ hiện ở danh sách phiếu)
      (doc.lines || []).forEach(line => {
        const base = { ...fill(type, line, doc.date), type, voucher: doc.id, date: doc.date, origDate: doc.date, period: doc.period, place: doc.place || "", status: doc.status, note: line.note || "", reviewer: doc.reviewer || "", quantity: line.quantity };
        entries.push({ ...base, kind: "issue", counted: wasIssued, by: doc.reviewer || "" });
        // Phiếu cũ thu hồi toàn bộ không lưu ngày thu hồi: dùng ngày cấp gốc và nói rõ để đối chiếu
        if (doc.status === "recalled" && wasIssued) entries.push({ ...base, kind: "recall", counted: true, by: doc.recalledBy || "", note: (doc.reason || "") + " · Phiếu cũ: không lưu ngày thu hồi, hiển thị theo ngày cấp gốc" });
      });
    });
    (db.benefitAdjustments || []).forEach(adj => {
      const doc = docs.get(adj.ref); if (!doc) return;
      const type = docType(doc), date = String(adj.at || "").slice(0, 10), when = clock(adj.at);
      const shared = { type, voucher: doc.id, adjustment: adj.id, date, origDate: doc.date, period: doc.period, place: doc.place || "", status: doc.status, reviewer: doc.reviewer || "", counted: true, by: adj.by || "" };
      (adj.lines || []).forEach(line => entries.push({ ...fill(type, { ...(original(doc, line) || line), size: sizeOf(line) }, doc.date), ...shared,
        note: (adj.reason || "") + (when ? " · lúc " + when : ""), quantity: line.quantity, kind: "recall" }));
      (adj.to || []).forEach(line => {
        const from = (adj.lines || []).map(old => original(doc, old)).find(row => row && row.employee === line.employee && row.item === line.item) || line;
        entries.push({ ...fill(type, { ...from, size: sizeOf(line) }, doc.date), ...shared, note: "Đổi cỡ: " + (adj.reason || "") + (when ? " · lúc " + when : ""), quantity: line.quantity, kind: "issue", resized: true });
      });
    });
    return entries;
  }

  const setOf = value => Array.isArray(value) ? value : value ? [value] : [];
  const deptMatches = (entry, f) => !setOf(f.dept).length || setOf(f.dept).includes(entry.dept) || setOf(f.dept).includes(entry.deptName);
  function matchEntry(entry, f) {
    if (f.tu && entry.date < f.tu) return false;
    if (f.den && entry.date > f.den) return false;
    if (f.thang && entry.period !== f.thang) return false;
    if (!deptMatches(entry, f)) return false;
    if (setOf(f.place).length && !setOf(f.place).includes(entry.place)) return false;
    if (setOf(f.item).length && !setOf(f.item).includes(entry.item)) return false;
    if (setOf(f.size).length && !setOf(f.size).includes(entry.size)) return false;
    if (setOf(f.status).length && !setOf(f.status).includes(entry.status)) return false;
    if (f.voucher && !norm(entry.voucher).includes(norm(f.voucher))) return false;
    if (f.q && !norm([entry.employee, entry.employeeName, entry.voucher].join(" ")).includes(norm(f.q))) return false;
    return true;
  }
  const KIND_LABEL = { issue: "Cấp", recall: "Thu hồi" };
  const STATUS_LABEL = { draft: "Nháp", issued: "Đã cấp", recalled: "Đã thu hồi" };
  const DETAIL_COLUMNS = ["Ngày giao dịch", "Ngày cấp gốc", "Loại cấp phát", "Mã phiếu", "Mã điều chỉnh", "Lượt", "Mã NV", "Họ và tên", "Tổ/Phòng ban tại ngày cấp", "Mặt hàng", "Kích cỡ", "Đơn vị", "Số lượng", "Người xác nhận", "Địa điểm", "Tháng hưởng", "Ghi chú"];
  const MISSING_DEPT = "(Thiếu căn cứ tổ tại ngày cấp — cần đối chiếu)";
  const MULTI_DEPT = "Nhân viên chuyển tổ trong tháng (định mức tính theo nhân viên/tháng)";
  /** Tổ hiển thị ở chi tiết: bản đã lưu hiện nguyên; dòng cũ suy ra từ hồ sơ hợp đồng thì ghi nguồn; thiếu căn cứ thì nói rõ. */
  const deptText = entry => entry.deptSource === "missing" ? MISSING_DEPT : entry.deptSource === "history" ? entry.deptName + " (suy ra từ hồ sơ hợp đồng tại ngày cấp)" : entry.deptName;

  /**
   * Báo cáo chi tiết: từng lượt cấp / thu hồi / đổi cỡ (và nháp nếu bộ lọc trạng thái có "draft"). Mỗi dòng có _voucher để mở phiếu gốc.
   * "Ngày giao dịch" là ngày phát sinh lượt (lọc khoảng ngày theo cột này); "Ngày cấp gốc" và "Tháng hưởng" là của phiếu gốc.
   * Chỉ bỏ cột "Loại cấp phát" khi đã chọn một loại (để bảng không quá rộng khi in).
   */
  function detailReport(db, opts) {
    const f = (opts && opts.filters) || {}, type = (opts && opts.type) || "all", wantDraft = setOf(f.status).includes("draft");
    const rows = ledger(db, opts && opts.deptOf).filter(entry => (type === "all" || entry.type === type) && (entry.counted || wantDraft) && matchEntry(entry, f))
      .sort((a, b) => a.date.localeCompare(b.date) || a.voucher.localeCompare(b.voucher) || (a.adjustment || "").localeCompare(b.adjustment || "") || a.employee.localeCompare(b.employee) || a.itemName.localeCompare(b.itemName))
      .map(entry => ({ "Ngày giao dịch": entry.date, "Ngày cấp gốc": entry.origDate, "Loại cấp phát": LABEL[entry.type], "Mã phiếu": entry.voucher, "Mã điều chỉnh": entry.adjustment || "",
        "Lượt": entry.counted ? (KIND_LABEL[entry.kind] + (entry.resized ? " (đổi cỡ)" : "")) : "Nháp", "Mã NV": entry.employee, "Họ và tên": entry.employeeName,
        "Tổ/Phòng ban tại ngày cấp": deptText(entry), "Mặt hàng": entry.itemName, "Kích cỡ": entry.size, "Đơn vị": entry.unit, "Số lượng": entry.quantity, "Người xác nhận": entry.by,
        "Địa điểm": entry.place, "Tháng hưởng": entry.period, "Ghi chú": entry.note, _voucher: entry.voucher }));
    return { mode: "detail", columns: type === "all" ? DETAIL_COLUMNS : DETAIL_COLUMNS.filter(column => column !== "Loại cấp phát"), rows, totals: [] };
  }

  /**
   * Báo cáo tổng hợp: nhóm theo tổ/phòng ban ĐÃ LƯU trên từng lượt, mã vật tư, đơn vị tính (và cỡ nếu bySize). Một người có thể có lượt ở nhiều tổ:
   * mỗi lượt vào đúng tổ của nó, không dồn vào tổ đầu tiên hay tổ hiện tại. Đã cấp − thu hồi = thực cấp; phiếu nháp không tính.
   * Sữa có thêm định mức, còn lại, vượt — tính MỘT lần cho mỗi (nhân viên, mặt hàng, tháng hưởng): người chỉ ở một tổ thì định mức nằm ở tổ đó;
   * người chuyển tổ trong tháng thì định mức nằm ở dòng riêng "Nhân viên chuyển tổ trong tháng" (chưa có quy tắc nói tổ nào chịu định mức),
   * còn số đã cấp/thu hồi vẫn theo từng tổ. Cộng riêng theo đơn vị tính ở cuối bảng.
   */
  function summaryReport(db, opts) {
    const f = (opts && opts.filters) || {}, type = (opts && opts.type) || "all", bySize = !!(opts && opts.bySize), deptOf = (opts && opts.deptOf) || (() => null);
    const all = ledger(db, deptOf).filter(entry => entry.counted && (type === "all" || entry.type === type));
    const base = all.filter(entry => matchEntry(entry, { ...f, dept: [] })), inScope = base.filter(entry => deptMatches(entry, f));
    const groups = new Map(), key = value => JSON.stringify(value);
    const deptKey = entry => entry.deptSource === "missing" ? "__MISSING__" : entry.dept, deptName = entry => entry.deptSource === "missing" ? MISSING_DEPT : entry.deptName;
    const group = (entry, code, name, multi) => {
      const k = key([entry.type, code, entry.item, entry.unit, bySize ? entry.size : ""]);
      if (!groups.has(k)) groups.set(k, { type: entry.type, dept: name, multi: !!multi, item: entry.itemName, size: bySize ? entry.size : "", unit: entry.unit, people: new Set(), given: 0, recalled: 0, allowance: 0, remaining: 0, over: 0, noStandard: false });
      return groups.get(k);
    };
    inScope.forEach(entry => {
      const g = group(entry, deptKey(entry), deptName(entry));
      if (entry.kind === "issue") { g.given += entry.quantity; g.people.add(entry.employee); } else g.recalled += entry.quantity;
    });
    // Sữa: định mức theo (nhân viên, mặt hàng, tháng hưởng), tính một lần
    if (type === "all" || type === "milk") {
      const cells = new Map(), cell = (employee, item, month) => { const k = key([employee, item, month]); if (!cells.has(k)) cells.set(k, { employee, item, month, net: 0, depts: new Map(), sample: null }); return cells.get(k); };
      base.filter(entry => entry.type === "milk").forEach(entry => {
        const c = cell(entry.employee, entry.item, entry.period); c.net += entry.kind === "issue" ? entry.quantity : -entry.quantity;
        c.depts.set(deptKey(entry), { code: deptKey(entry), name: deptName(entry), entry }); c.sample = c.sample || entry;
      });
      const months = new Set(f.thang ? [f.thang] : []);
      if (!f.thang && f.tu && f.den) for (let m = f.tu.slice(0, 7); m <= f.den.slice(0, 7); m = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1)).toISOString().slice(0, 7)) months.add(m);
      const lastDay = month => month + "-" + String(new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate()).padStart(2, "0");
      months.forEach(month => (db.nhanvien || []).forEach(person => entitlement(db, person["Mã NV"], month).forEach(item => {
        const probe = { type: "milk", employee: person["Mã NV"], employeeName: person["Họ và tên"] || "", item: item.code, itemName: item.name, unit: item.unit, size: "", date: lastDay(month), period: month, place: "", status: "issued", voucher: "", kind: "issue", quantity: 0 };
        const found = deptOf(probe.employee, probe.date); Object.assign(probe, { dept: found ? found.code || "" : "", deptName: found ? found.name || "" : NO_DEPT.name, deptSource: found ? "history" : "missing" });
        if (!matchEntry(probe, { ...f, tu: "", den: "", dept: [], place: [], voucher: "", status: [] })) return;
        const c = cell(probe.employee, item.code, month); c.sample = c.sample || probe;
        if (!c.depts.size) c.depts.set(deptKey(probe), { code: deptKey(probe), name: deptName(probe), entry: probe });
      })));
      cells.forEach(c => {
        const entitled = entitlement(db, c.employee, c.month).find(item => item.code === c.item), allowance = entitled ? entitled.allowance : 0, owners = Array.from(c.depts.values());
        if (!c.sample || (!allowance && c.net <= 0)) return;
        const share = { allowance, remaining: Math.max(0, allowance - c.net), over: Math.max(0, c.net - allowance), noStandard: !allowance && c.net > 0 };
        const apply = g => { g.allowance += share.allowance; g.remaining += share.remaining; g.over += share.over; if (share.noStandard) g.noStandard = true; };
        if (owners.length > 1) {
          if (!owners.some(owner => deptMatches(owner.entry, f))) return;
          const g = group(c.sample, "__MULTI__", MULTI_DEPT, true); g.people.add(c.employee); apply(g);
        } else if (owners.length === 1 && deptMatches(owners[0].entry, f)) apply(group(c.sample, owners[0].code, owners[0].name));
      });
    }
    const columns = ["Loại cấp phát", "Tổ/Phòng ban", "Mặt hàng"].concat(bySize ? ["Kích cỡ"] : [], ["Đơn vị", "Số người nhận", "Đã cấp", "Thu hồi", "Thực cấp"], type === "ppe" ? [] : ["Định mức", "Còn lại", "Vượt", "Ghi chú"]);
    const kept = Array.from(groups.values()).filter(g => g.given || g.recalled || g.allowance)
      .sort((a, b) => a.type.localeCompare(b.type) || Number(a.multi) - Number(b.multi) || a.dept.localeCompare(b.dept) || a.item.localeCompare(b.item) || a.size.localeCompare(b.size));
    const rows = kept.map(g => {
      const row = { "Loại cấp phát": LABEL[g.type], "Tổ/Phòng ban": g.dept, "Mặt hàng": g.item };
      if (bySize) row["Kích cỡ"] = g.size;
      Object.assign(row, { "Đơn vị": g.unit, "Số người nhận": g.people.size }, g.multi ? { "Đã cấp": "", "Thu hồi": "", "Thực cấp": "" } : { "Đã cấp": g.given, "Thu hồi": g.recalled, "Thực cấp": g.given - g.recalled });
      if (type !== "ppe") Object.assign(row, g.type === "milk"
        ? { "Định mức": g.allowance, "Còn lại": g.remaining, "Vượt": g.over, "Ghi chú": g.multi ? "Định mức tính theo nhân viên/tháng cho " + g.people.size + " người chuyển tổ; số đã cấp và thu hồi của họ nằm ở các dòng tổ ở trên" : g.noStandard ? NO_STANDARD_NOTE : "" }
        : { "Định mức": "", "Còn lại": "", "Vượt": "", "Ghi chú": "" });
      return row;
    });
    const byUnit = new Map();
    kept.forEach(g => {
      const k = g.type + "|" + g.unit, total = byUnit.get(k) || { type: g.type, unit: g.unit, given: 0, recalled: 0, allowance: 0, remaining: 0, over: 0 };
      if (!g.multi) { total.given += g.given; total.recalled += g.recalled; }
      total.allowance += g.allowance; total.remaining += g.remaining; total.over += g.over; byUnit.set(k, total);
    });
    const totals = Array.from(byUnit.values(), total => {
      const row = { "Loại cấp phát": LABEL[total.type], "Tổ/Phòng ban": "CỘNG", "Mặt hàng": "Tổng theo đơn vị tính: " + (total.unit || "(không đơn vị)"), "Đơn vị": total.unit, "Đã cấp": total.given, "Thu hồi": total.recalled, "Thực cấp": total.given - total.recalled, _total: true };
      if (type !== "ppe" && total.type === "milk") Object.assign(row, { "Định mức": total.allowance, "Còn lại": total.remaining, "Vượt": total.over });
      columns.forEach(column => { if (!(column in row)) row[column] = ""; });
      return row;
    });
    return { mode: "summary", columns, rows: rows.concat(totals), totals };
  }

  /** Danh sách phiếu cho màn hình: mỗi phiếu một dòng, lọc theo loại và bộ lọc dùng chung với báo cáo (phiếu khớp nếu có dòng khớp). */
  function listVouchers(db, opts) {
    const f = (opts && opts.filters) || {}, type = (opts && opts.type) || "all", found = new Map();
    ledger(db, opts && opts.deptOf, true).forEach(entry => {
      if (entry.kind !== "issue" || entry.adjustment || (type !== "all" && entry.type !== type) || !matchEntry(entry, f)) return;
      found.set(entry.voucher, true);
    });
    return (db.benefitIssues || []).filter(doc => found.has(doc.id)).map(doc => ({
      id: doc.id, type: docType(doc), date: doc.date, period: doc.period, place: doc.place || "", people: new Set((doc.lines || []).map(line => line.employee)).size,
      lines: (doc.lines || []).length, status: doc.status, maker: doc.maker || "", reviewer: doc.reviewer || "", purpose: doc.purpose || "" }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }
  const report = (db, opts) => opts && opts.mode === "detail" ? detailReport(db, opts) : summaryReport(db, opts);

  // ---------- Nhập Excel: dòng phẳng (mỗi dòng một người nhận một mặt hàng) → phiếu nháp ----------
  const TEMPLATE_COLUMNS = {
    milk: ["Mã phiếu", "Ngày cấp", "Địa điểm", "Mã NV", "Mã mặt hàng", "Số lượng", "Ghi chú"],
    ppe: ["Mã phiếu", "Ngày cấp", "Địa điểm", "Mã NV", "Mã vật tư", "Kích cỡ", "Số lượng", "Lý do", "Ghi chú"]
  };
  const cellText = value => value == null ? "" : String(value).trim();
  /**
   * rows: [{ row: số dòng Excel, values: { "Mã phiếu": ..., ... } }]. Trả { vouchers: [{ id, action, doc, rows, issues }], errors }.
   * action: new (phiếu nháp mới) · same (đã có phiếu y hệt: bỏ qua, không cộng lần hai) · replace (cập nhật phiếu nháp cùng mã) · error.
   * Mọi lỗi nêu số dòng Excel: thiếu mã, sai ngày, sai cỡ, vượt định mức, trùng dòng, đầu phiếu không nhất quán.
   */
  function planImport(db, type, rows, who, deptOf) {
    type = type === "ppe" ? "ppe" : "milk";
    const groups = new Map(), errors = [], itemKey = type === "ppe" ? "Mã vật tư" : "Mã mặt hàng", people = new Set((db.nhanvien || []).map(row => row["Mã NV"]));
    const fail = (list, row, message) => { list.push("Dòng Excel " + row + ": " + message); };
    rows.forEach(({ row, values }) => {
      const id = cellText(values["Mã phiếu"]);
      if (!id) { fail(errors, row, "thiếu mã phiếu."); return; }
      const group = groups.get(id) || { id, lines: [], rows: [], issues: [], head: null };
      groups.set(id, group);
      const date = V.normDate(values["Ngày cấp"]) || "", place = cellText(values["Địa điểm"]), purpose = cellText(values["Lý do"]);
      if (!date) fail(group.issues, row, "ngày cấp trống hoặc sai định dạng (cần ngày hợp lệ, ví dụ 2026-11-17 hoặc 17/11/2026).");
      if (!group.head) group.head = { date, place, purpose, row };
      else if (group.head.date !== date || group.head.place !== place || group.head.purpose !== purpose) fail(group.issues, row, "đầu phiếu " + id + " không nhất quán với dòng " + group.head.row + " (ngày cấp, địa điểm hoặc lý do khác nhau).");
      const employee = cellText(values["Mã NV"]), item = cellText(values[itemKey]), size = cellText(values["Kích cỡ"]), quantity = Number(String(values["Số lượng"] == null ? "" : values["Số lượng"]).trim().replace(",", "."));
      if (!employee) fail(group.issues, row, "thiếu mã nhân viên.");
      else if (!people.has(employee)) fail(group.issues, row, "không có nhân viên " + employee + "." + (typeof values["Mã NV"] === "number" ? " Ô Mã NV là số — số 0 đầu có thể đã mất, hãy nhập ô dạng Text (ví dụ 0005)." : ""));
      if (!item) fail(group.issues, row, "thiếu " + itemKey.toLowerCase() + ".");
      if (cellText(values["Số lượng"]) === "" || !Number.isSafeInteger(quantity) || quantity <= 0) fail(group.issues, row, "số lượng phải là số nguyên dương.");
      const dup = group.lines.find(line => line.employee === employee && line.item === item && sizeOf(line) === size);
      if (dup) fail(group.issues, row, "trùng dòng " + dup.row + " (cùng nhân viên, " + (type === "ppe" ? "vật tư, kích cỡ" : "mặt hàng") + ").");
      group.lines.push({ employee, item, size, quantity, note: cellText(values["Ghi chú"]), row });
      group.rows.push(row);
    });
    const vouchers = [], projected = { ...db, benefitIssues: (db.benefitIssues || []).slice() };
    groups.forEach(group => {
      const existing = (db.benefitIssues || []).find(doc => doc.id === group.id), issues = group.issues.slice();
      const lines = group.lines.map(({ row, ...line }) => line);
      let doc = null;
      const valid = group.head && group.head.date;
      if (valid) {
        doc = buildVoucher(db, { type, id: group.id, date: group.head.date, place: group.head.place, purpose: group.head.purpose, lines: lines.map(line => ({ employee: line.employee, item: line.item, size: line.size, quantity: line.quantity, note: line.note })), maker: who }, deptOf);
        if (type === "milk") doc.lines.forEach(line => { delete line.size; });
        const probe = { ...projected, benefitIssues: projected.benefitIssues.filter(row => row.id !== group.id) };
        const reported = new Set(group.issues.map(message => (/^Dòng Excel (\d+)/.exec(message) || [])[1]));
        reviewIssue(probe, doc).issues.forEach(message => {
          const at = /^Dòng (\d+)/.exec(message), source = at ? group.lines[Number(at[1]) - 1] : null;
          if (source && reported.has(String(source.row))) return; // dòng này đã có lỗi riêng: không báo trùng
          issues.push(source ? message.replace(/^Dòng \d+/, "Dòng Excel " + source.row) : group.id + " · " + message);
        });
      }
      if (issues.length) doc = null;
      let action = "new";
      if (existing) {
        const sig = voucher => JSON.stringify([docType(voucher), voucher.date, voucher.place || "", (voucher.lines || []).map(line => [line.employee, line.item, sizeOf(line), line.quantity]).sort()]);
        if (docType(existing) !== type) { issues.push(group.id + " · mã phiếu đã dùng cho loại cấp phát khác."); action = "error"; }
        else if (doc && sig(existing) === sig(doc)) action = "same";
        else if (existing.status !== "draft") { issues.push(group.id + " · phiếu đã " + (STATUS_LABEL[existing.status] || existing.status).toLowerCase() + " với nội dung khác — dùng thu hồi/điều chỉnh, không nhập đè."); action = "error"; }
        else if (existing.maker !== who) { issues.push(group.id + " · phiếu nháp của " + existing.maker + ", chỉ người lập được cập nhật."); action = "error"; }
        else action = "replace";
      }
      if (issues.length) action = "error";
      if (doc && existing && action === "replace") { doc.maker = existing.maker; }
      if (doc && action !== "error" && action !== "same") projected.benefitIssues = projected.benefitIssues.filter(row => row.id !== group.id).concat(Object.assign({}, doc, { status: "issued" }));
      vouchers.push({ id: group.id, action, doc: action === "error" ? null : doc, rows: group.rows, issues, lines: group.lines });
    });
    return { vouchers, errors, columns: TEMPLATE_COLUMNS[type] };
  }

  const api = { entitlement, issued, reviewIssue, validateChanges, standardAt, standardProblem, monthlyReport, NO_STANDARD_NOTE,
    GROUPS, docType, sizeOf, ppeItemProblem, recallable, adjustmentProblem,
    LABEL, STATUS_LABEL, TEMPLATE_COLUMNS, DETAIL_COLUMNS, ledger, report, detailReport, summaryReport, listVouchers, planImport, buildVoucher, snapshotLine };
  if (node) module.exports = api; else root.HAKCore.benefits = api;
})(typeof window !== "undefined" ? window : this);
