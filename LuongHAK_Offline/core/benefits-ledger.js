(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const R = node ? require("./benefits-rules.js") : root.HAKCore.benefitsRules;
  const { docType, sizeOf, entitlement, NO_STANDARD_NOTE } = R;
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


  const api = { LABEL, STATUS_LABEL, DETAIL_COLUMNS, ledger, report, detailReport, summaryReport, listVouchers, buildVoucher, snapshotLine, norm, setOf };
  if (node) module.exports = api; else root.HAKCore.benefitsLedger = api;
})(typeof window !== "undefined" ? window : this);
