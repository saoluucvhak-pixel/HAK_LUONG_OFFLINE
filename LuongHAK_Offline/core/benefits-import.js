(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const R = node ? require("./benefits-rules.js") : root.HAKCore.benefitsRules;
  const L = node ? require("./benefits-ledger.js") : root.HAKCore.benefitsLedger;
  const V = node ? require("./validate.js") : root.HAKCore.validate;
  const { docType, sizeOf, reviewIssue } = R;
  const { buildVoucher, STATUS_LABEL } = L;
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

  const api = { TEMPLATE_COLUMNS, planImport };
  if (node) module.exports = api; else root.HAKCore.benefitsImport = api;
})(typeof window !== "undefined" ? window : this);
