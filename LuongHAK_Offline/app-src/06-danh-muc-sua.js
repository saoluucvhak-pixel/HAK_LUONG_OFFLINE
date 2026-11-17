  // ---------- Danh mục: Xem → Sửa → Lưu/Hủy (V9.4) — KHÔNG tự lưu khi nhập ----------
  /** Trạng thái sửa từng bảng danh mục: { mode:"edit"|"new", ri, draft, dirty, state:"EDITING"|"VALIDATING"|"SAVING" , err } */
  function cedit(key) { st.cedit = st.cedit || {}; return st.cedit[key] || null; }
  function catDirtyKeys() { return Object.keys(st.cedit || {}).filter(function (k) { return st.cedit[k] && st.cedit[k].dirty; }); }
  /** Hỏi trước khi bỏ thay đổi chưa lưu (chuyển menu). Trả true nếu được phép đi tiếp. */
  function leaveOk() {
    var d = catDirtyKeys(); if (!d.length) { st.cedit = {}; return true; }
    if (!confirm("Có thay đổi CHƯA LƯU ở danh mục " + d.map(function (k) { return (ALL[k] && ALL[k].ten) || k; }).join(", ") + ".\nBỏ thay đổi và chuyển đi?")) return false;
    st.cedit = {}; return true;
  }
  /** Mã đã được dùng ở đâu (để quyết định Xóa hay Ngừng hiệu lực). Quét các bảng nghiệp vụ + bảng lương đã chốt. */
  function catUsage(key, row, def) {
    var codes = []; (def.cols || []).forEach(function (c) { if (/^Mã/.test(c) && String(row[c] == null ? "" : row[c]).trim().length >= 2) codes.push(String(row[c]).trim()); });
    var out = { n: 0, where: [], closed: false };
    if (!codes.length) return out;
    var skip = { auditlog: 1, nguoidung: 1, baomat: 1, kyluong: 1, kyluong_lichsu: 1 };
    Object.keys(db).forEach(function (t) {
      if (t === key || skip[t] || !Array.isArray(db[t]) || /^dm_/.test(t)) return;
      var hit = 0; db[t].forEach(function (r) { for (var k in r) { if (typeof r[k] === "string" && codes.indexOf(r[k].trim()) >= 0) { hit++; break; } } });
      if (hit) { out.n += hit; out.where.push(((ALL[t] && ALL[t].ten) || (HR[t] && HR[t].ten) || t) + " (" + hit + ")"); }
    });
    var js = ""; try { js = JSON.stringify(db.kyluong || []); } catch (e) { js = ""; }
    if (js && codes.some(function (c2) { return js.indexOf('"' + c2 + '"') >= 0; })) { out.closed = true; out.where.push("kỳ lương đã chốt"); }
    return out;
  }
  function catHistory(key, row, def) {
    var codes = []; (def.cols || []).forEach(function (c) { if (/^Mã/.test(c) && row[c]) codes.push(String(row[c])); });
    var tn = (def.ten || key), rows = (db.auditlog || []).filter(function (e) { var s = String(e.chiTiet || "") + " " + String(e.thaoTac || ""); return s.indexOf(key) >= 0 || s.indexOf(tn) >= 0 ? (!codes.length || codes.some(function (c) { return s.indexOf(c) >= 0; })) : false; }).slice(-80).reverse();
    var body = h("div"); if (!rows.length) body.appendChild(h("div", { class: "hint", text: "Chưa có thao tác nào được ghi cho dòng này." }));
    else body.appendChild(simpleTable(rows.map(function (e) { return { "Lúc": fmtTime(e.luc), "Người": e.nguoi || "", "Thao tác": e.thaoTac || "", "Chi tiết": String(e.chiTiet || "").slice(0, 160) }; })));
    modal("Lịch sử — " + tn + (codes.length ? " · " + codes.join(" / ") : ""), body, function (close) { return [btn("Đóng", "", close)]; });
  }
  function productionReperiodScreen(after) {
    if (!need("input.edit")) return;
    var source = kyStr(), body = h("div"), target = h("input", { type: "month", value: st.nam + "-" + ("0" + Math.min(12, st.thang + 1)).slice(-2), "aria-label": "Kỳ sản lượng mới" });
    body.appendChild(h("p", { text: "Chuyển hẳn sản lượng " + source + " sang kỳ mới: người/tổ/công, đơn giá và bù đều theo kỳ mới. Giữ số ngày trong tháng (ví dụ 09/09 → 09/10), giữ ngày gốc để tra cứu. Kỳ nguồn không còn các phiếu này. Dữ liệu chuyển ở trạng thái Nháp, cần kiểm tra và Lưu để tính lương." }));
    body.appendChild(target);
    modal("Chuyển thành sản lượng kỳ mới", body, function (close) { return [btn("Đóng", "", close), btn("Xem trước", "pri", function () {
      var plan, preview;
      try {
        plan = C.productionCarry.reperiod(db, source, target.value);
        preview = C.productionCarry.previewReperiod(db, plan);
      } catch (e) { alert(e.message); return; }
      var revision = dbRev;
      var detail = h("div");
      detail.appendChild(h("p", { text: "Chuyển " + plan.rows.length + " phiếu: " + source + " → " + plan.target + ". Kiểm tra ngày phân bổ và cột NV vắng trước khi xác nhận. Phiếu chờ phân bổ vẫn được chuyển ở trạng thái Nháp." }));
      var pending = preview.receipts.filter(function (r) { return r.pending > 0; });
      detail.appendChild(h("p", { text: pending.length + " phiếu chờ phân bổ · " + qtyText(pending.reduce(function (total, r) { return total + r.pending; }, 0)) + " tấn." }));
      detail.appendChild(h("h3", { text: "Chi tiết phiếu và nhân viên vắng" }));
      detail.appendChild(simpleTable(preview.receipts.map(function (entry) {
        var r = entry.row;
        return { "Phiếu": r["Phiếu cân"], "Ngày cân gốc": fmtDate(r["Ngày cân gốc"]), "Ngày phân bổ": fmtDate(r["Ngày cân"]), "Tấn": entry.quantity, "Tổ": r["Mã phòng ban"], "Mã NV trực tiếp": r["Mã NV"], "NV vắng": r["NV vắng"], "Số người nhận": entry.count, "Tấn chờ phân bổ": entry.pending, "Ghi chú": entry.note };
      })));
      if (preview.warnings.length) {
        detail.appendChild(h("details", {}, [h("summary", { text: "Cảnh báo phân bổ (" + preview.warnings.length + ")" }), h("ul", {}, preview.warnings.map(function (warning) { return h("li", { text: warning }); }))]));
      }
      detail.appendChild(h("h3", { text: "Tổng khối lượng theo nhân viên" }));
      detail.appendChild(simpleTable(preview.employees.map(function (r) { return { "Mã NV": r.code, "Họ tên": r.name, "Tấn": r.quantity }; })));
      modal("Xem trước chuyển hẳn sản lượng", detail, function (finish) { return [btn("Hủy", "", finish), btn("Xác nhận chuyển hẳn", "pri", function () {
        if (!need("input.edit")) return;
        if (dbRev !== revision || JSON.stringify(db.sanluong || []) !== plan.token) { alert("Dữ liệu đã đổi; hãy xem trước lại."); return; }
        if (!backupOrBlock("truoc-chuyen-han-sl-" + source, "chuyển hẳn sản lượng")) return;
        if (!txn(["sanluong", "_inputReviews", "schemaVersion"], function () {
          var fresh = C.productionCarry.reperiod(db, source, plan.target);
          C.inputReview.initialize(db);
          db.sanluong = db.sanluong.filter(function (r) { return fresh.moving.indexOf(r) < 0; }).concat(fresh.rows);
          audit("Chuyển hẳn sản lượng", source + " → " + plan.target + "; " + fresh.rows.length + " phiếu; phân bổ theo kỳ mới; Nháp");
        })) { alert("Chưa chuyển: " + lastTxnError); return; }
        finish(); close(); after(); render(); toast("Đã chuyển thành SL " + plan.target + ". Kiểm tra rồi Lưu để tính lương ở cả kỳ nguồn và kỳ mới.");
      })]; });
    })]; });
  }

  function productionCarryScreen(after) {
    if (!need("payroll.calc")) return;
    var closeCarry, body = h("div"), source = kyStr(), target = h("input", { type: "month", value: st.nam + "-" + ("0" + Math.min(12, st.thang + 1)).slice(-2), "aria-label": "Kỳ chi trả sản lượng" });
    body.appendChild(h("p", { text: "Kỳ phát sinh " + source + ": chia theo người, tổ và công thực tế kỳ này. Đơn giá và bù theo kỳ chi trả. Chuyển toàn bộ sản lượng của kỳ; không đổi ngày cân." }));
    body.appendChild(h("label", { text: "Kỳ tính vào lương: " })); body.appendChild(target);
    (db.sl_chuyenky || []).forEach(function (r) { body.appendChild(h("div", { class: "bar" }, [h("span", { text: r.source + " → " + r.target }), btn("Hủy chuyển", "red ghost", function () {
      if (!need("payroll.calc") || !confirm("Hủy chuyển " + r.source + " → " + r.target + "?")) return;
      if (!backupOrBlock("truoc-huy-chuyen-sl", "hủy chuyển SL")) return;
      if (!txn(["sl_chuyenky"], function () { var ix = (db.sl_chuyenky || []).findIndex(function (x) { return x.id === r.id; }); if (ix < 0) return false; db.sl_chuyenky.splice(ix, 1); C.productionCarry.validate(db, { sl_chuyenky: [r], kyluong: db.kyluong }); audit("Hủy chuyển SL", r.source + " → " + r.target); })) { alert("Chưa hủy: " + lastTxnError); return; }
      closeCarry(); after(); render(); toast("Đã hủy chuyển kỳ");
    })])); });
    closeCarry = modal("Sản lượng phát sinh / kỳ chi trả", body, function (close) { return [btn("Đóng", "", close), btn("Xem trước chuyển kỳ", "pri", function () {
      var record, pays, temp, targetKy = target.value;
      try { record = C.productionCarry.draft(db, source, targetKy); temp = Object.assign({}, db, { sl_chuyenky: (db.sl_chuyenky || []).concat([record]) }); pays = C.productionCarry.payments(temp, targetKy, st.bu, { quyChe: quyChe() }).filter(function (p) { return p.id === record.id; }); } catch (e) { alert(e.message); return; }
      var detail = h("div", {}, [h("p", { text: "Phát sinh " + source + " → lương " + targetKy + ". Đơn giá và quy chế bù chính thức kỳ chi trả; công/người/ngày làm theo kỳ phát sinh. Khoản chuyển ghi vào Thu nhập khác và chịu xử lý thuế của kỳ chi trả. Kỳ nguồn không tính lại khoản SL/bù đã chuyển." })]);
      var warningAck = null;
      if ((record.warnings || []).length) {
        detail.appendChild(h("div", { class: "warn", text: "Sản lượng đã phân bổ đủ nhưng còn cảnh báo cần đối chiếu:\n" + record.warnings.join("\n"), style: "white-space:pre-wrap" }));
        warningAck = h("input", { type: "checkbox", "aria-label": "Đã kiểm tra cảnh báo phân bổ" });
        detail.appendChild(h("label", {}, [warningAck, document.createTextNode(" Tôi đã kiểm tra các cảnh báo và xác nhận danh sách người nhận, công và phần sản lượng trong bảng dưới là đúng.")]));
      }
      var taxInputs = Object.create(null);
      pays.filter(function (p) { return p.retired; }).forEach(function (p) { var select = h("select", { "aria-label": "Mã thuế chi trả " + p.ma }, [h("option", { value: "", text: "— Chọn mã thuế kỳ chi trả —" })].concat((db.dm_tncn || []).map(function (r) { return h("option", { value: r["Mã thuế TNCN"], text: r["Mã thuế TNCN"] + " — " + (r["Tên thuế TNCN"] || "") }); }))); taxInputs[p.ma] = select; detail.appendChild(h("div", { class: "fld" }, [h("label", { text: p.ma + " — đã nghỉ: cần chọn mã thuế khi chi trả khoản cũ" }), select])); });
      detail.appendChild(simpleTable(pays.map(function (p) { return { "Mã NV": p.ma, "Họ tên": p.name, "Tấn": p.quantity, "Lương SL": p.salary, "Bù SL": p.topup, "Tổng trước thuế": p.salary + p.topup, "Lưu ý": p.retired ? "Chỉ nhận khoản chuyển" : "Đang có HĐ" }; })));
      var revision = dbRev;
      modal("Xem trước: chia " + source + ", trả " + targetKy, detail, function (finish) { return [btn("Hủy", "", finish), btn("Xác nhận chuyển kỳ", "pri", function () {
        if (!need("payroll.calc")) return;
        if (dbRev !== revision) { alert("Dữ liệu đã đổi; hãy xem trước lại."); return; }
        var missingTax = Object.keys(taxInputs).filter(function (ma) { return !taxInputs[ma].value; }); if (missingTax.length) { alert("Chọn mã thuế chi trả cho " + missingTax.join(", ")); return; }
        if (warningAck && !warningAck.checked) { alert("Hãy kiểm tra cảnh báo và xác nhận danh sách phân bổ trước khi chuyển kỳ."); return; }
        if (!backupOrBlock("truoc-chuyen-sl-" + source, "chuyển kỳ chi trả")) return;
        if (!txn(["sl_chuyenky", "schemaVersion"], function () { var r = C.productionCarry.draft(db, source, targetKy); r.warningsAcknowledged = !!(warningAck && warningAck.checked); r.taxOverrides = Object.create(null); Object.keys(taxInputs).forEach(function (ma) { r.taxOverrides[ma] = taxInputs[ma].value; }); db.schemaVersion = Math.max(4, db.schemaVersion || 0); db.sl_chuyenky.push(r); C.productionCarry.validate(db, db); audit("Chuyển kỳ chi trả SL", source + " → " + targetKy + "; đơn giá/bù kỳ chi trả; người/công kỳ phát sinh"); })) { alert("Chưa chuyển: " + lastTxnError); return; }
        finish(); close(); after(); render(); toast("Đã chuyển kỳ chi trả; kiểm tra lại lương " + targetKy);
      })]; });
    })]; });
  }

  function bandamDirectExcelTemplate() {
    if (!window.ExcelJS) { alert("Thiếu thư viện Excel — chưa tạo mẫu."); return; }
    var book = new window.ExcelJS.Workbook(), sheet = book.addWorksheet("Ban dăm xuất hàng");
    sheet.columns = [{ header: "Phiếu cân", key: "phieu", width: 20 }, { header: "Ngày cân", key: "ngay", width: 16 }, { header: "Biển số", key: "xe", width: 18 }, { header: "Số xe", key: "soxe", width: 16 }, { header: "Mã NV", key: "ma", width: 24 }];
    [1, 3, 5].forEach(function (n) { sheet.getColumn(n).numFmt = "@"; });
    sheet.getColumn(2).numFmt = "dd/mm/yyyy"; sheet.getColumn(4).numFmt = "0.###";
    sheet.views = [{ state: "frozen", ySplit: 1 }]; sheet.getRow(1).font = { bold: true };
    var guide = book.addWorksheet("Hướng dẫn"); guide.getColumn(1).width = 110;
    guide.addRow(["Điền số phiếu, ngày cân, số xe được giao và Mã NV có trong Nhân sự. Mỗi dòng là phần xe giao cho nhân viên đó; không ghi thêm dòng chia tổ cho cùng phiếu."]);
    guide.addRow(["Mã NV, số phiếu và biển số đã định dạng Chữ để giữ số 0 đầu. Không đổi tên cột. Nhập tại Ban dăm xuất hàng → Nhập Excel."]);
    guide.eachRow(function (r) { r.alignment = { wrapText: true }; r.height = 40; });
    book.xlsx.writeBuffer().then(function (buf) { download("Mau_BomDam_GiaoTrucTiep.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); }).catch(function (e) { alert("Không tạo được mẫu: " + e.message); });
  }

  function bandamEntryForm(ri, after, initialMode) {
    if (!need("input.edit")) return;
    var row = ri == null ? null : db.bandam[ri], token = row ? JSON.stringify(row) : "", body = h("div"), f = {};
    var mode = h("select", { "aria-label": "Cách phân bổ bơm dăm" }, [h("option", { value: "direct", text: "Trực tiếp theo Mã NV" }), h("option", { value: "team", text: "Chia theo tổ / phòng ban" })]);
    mode.value = row ? (row["Mã NV"] ? "direct" : "team") : initialMode || "team"; mode.disabled = true;
    body.appendChild(h("div", { class: "fld" }, [h("label", { text: "Cách phân bổ" }), mode]));
    body.appendChild(h("p", { class: "hint", text: "Trực tiếp: số xe của dòng này giao cho đúng nhân viên đã chọn, không chia lại cho tổ. Theo tổ: chia theo người có mặt và NV vắng như hiện tại. Hồ sơ và đơn giá kỳ lương vẫn được áp dụng." }));
    ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)"].forEach(function (col) {
      f[col] = h("input", { class: "i", "aria-label": col === "KL hàng (Tấn)" ? "Số xe được giao" : col, type: col === "Ngày cân" ? "date" : "text", value: row ? row[col] || "" : col === "Ngày cân" ? kyStr() + "-01" : col === "KL hàng (Tấn)" ? "1" : "" });
      body.appendChild(h("div", { class: "fld" }, [h("label", { text: col === "KL hàng (Tấn)" ? "Số xe được giao" : col }), f[col]]));
    });
    var direct = h("div", { class: "fld" }), team = h("div");
    f["Mã NV"] = h("select", { "aria-label": "Nhân viên nhận bơm dăm" }, [h("option", { value: "", text: "— Chọn nhân viên —" })].concat(db.nhanvien.map(function (n) { return h("option", { value: n["Mã NV"], text: n["Mã NV"] + " — " + (n["Họ và tên"] || "") }); })));
    f["Mã NV"].value = row && row["Mã NV"] || "";
    direct.appendChild(h("label", { text: "Nhân viên nhận phiếu" })); direct.appendChild(f["Mã NV"]); body.appendChild(direct);
    f["Mã phòng ban"] = h("select", { "aria-label": "Tổ nhận bơm dăm" }, [h("option", { value: "", text: "— Chọn tổ —" })].concat((db.dm_phongban || []).map(function (r) { return h("option", { value: r["Mã phòng ban"], text: r["Mã phòng ban"] + " — " + (r["Tên phòng ban"] || "") }); })));
    f["Mã phòng ban"].value = row && row["Mã phòng ban"] || ""; f["NV vắng"] = h("input", { class: "i", "aria-label": "NV vắng bơm dăm", value: row && row["NV vắng"] || "" });
    team.appendChild(h("div", { class: "fld" }, [h("label", { text: "Tổ / phòng ban" }), f["Mã phòng ban"]])); team.appendChild(h("div", { class: "fld" }, [h("label", { text: "NV vắng" }), f["NV vắng"]])); body.appendChild(team);
    var drawMode = function () { direct.style.display = mode.value === "direct" ? "" : "none"; team.style.display = mode.value === "team" ? "" : "none"; }; mode.addEventListener("change", drawMode); drawMode();
    modal((row ? "Sửa" : "Thêm") + " phiếu Ban dăm xuất hàng", body, function (close) { return [btn("Hủy", "", close), btn("Lưu phiếu Ban dăm xuất hàng", "pri", function () {
      if (!need("input.edit")) return;
      if (row && JSON.stringify(db.bandam[ri]) !== token) { alert("Phiếu đã thay đổi — mở lại để sửa."); return; }
      var input = { mode: mode.value }; Object.keys(f).forEach(function (k) { input[k] = f[k].value; }); var data;
      try { data = C.bandamEntry.build(db, input, row ? db.bandam[ri] : null); } catch (e) { alert(e.message); return; }
      if (!txn(["bandam"], function () { return !!commit(REPO.plan(row ? "update" : "insert", "bandam", row ? db.bandam[ri] : null, data), { action: "Lưu phiếu Ban dăm xuất hàng " + (mode.value === "direct" ? "trực tiếp" : "theo tổ") }); })) { alert("Chưa lưu phiếu: " + lastTxnError); return; }
      close(); after(); toast("Đã giữ phiếu ở Nháp — bấm Lưu để tính lương");
    })]; });
  }

  function inputRowEdit(key, def, ri, after) {
    var original = JSON.stringify(db[key][ri]), body = h("div"), fields = {};
    def.cols.forEach(function (col) { var input = h("input", { class: "i", value: db[key][ri][col] == null ? "" : db[key][ri][col], "aria-label": col }); fields[col] = input; body.appendChild(h("div", { class: "fld" }, [h("label", { text: col }), input])); });
    modal("Sửa " + def.ten, body, function (close) { return [btn("Hủy", "", close), btn("Lưu thay đổi", "pri", function () {
      if (!need("input.edit")) return;
      if (JSON.stringify(db[key][ri]) !== original) { alert("Dữ liệu đã đổi; hãy mở lại dòng."); return; }
      var values = {}, bad = [];
      def.cols.forEach(function (col) { var n = VAL.normCell(col, fields[col].value); if (n.error) bad.push(col + ": " + n.error); values[col] = n.value; });
      if (bad.length) { alert(bad.join("\n")); return; }
      if (!txn([key], function () { var result = commit(REPO.plan("update", key, db[key][ri], values), { action: "Sửa dòng nhập liệu" }); return !!result; })) { alert("Chưa lưu: " + lastTxnError); return; }
      close(); after(); toast("Đã giữ thay đổi — kiểm tra trạng thái Lưu để tính lương");
    })]; });
  }
  function leaveReviewModal(locked, after) {
    var ky = kyStr(), snap = kyChot(ky), saved = snap && snap.input;
    var review = snap ? saved && saved.leaveReview : C.leaveReconciliation.reconcile(db, ky);
    var body = h("div", { "data-leave-review": ky });
    if (!review) body.appendChild(h("p", { class: "hint", text: "Bản chốt này chưa lưu bảng đối chiếu đơn nghỉ." }));
    var choices = [];
    if (review) {
      review.warnings.forEach(function (warning) {
        body.appendChild(h("p", { class: "warn", text: warning.ma + " · " + tenNV(warning.ma) + (warning.contract ? " · HĐ " + warning.contract : "") + ": phép đến hết kỳ " +
          fmt(warning.used) + " / " + fmt(warning.limit) + " ngày theo Quyền lợi phép, vượt " + fmt(warning.excess) + " ngày. Phần vượt cần đổi sang loại nghỉ phù hợp trước khi chốt." }));
      });
      body.appendChild(h("p", { class: "hint", text: "Đơn và công PN khớp chỉ tính một lần. Chọn từng ngày cần bổ sung. Với đơn chưa rõ lịch nghỉ từng ngày, hãy kiểm tra và chấm tay." }));
      var cols = ["Mã NV", "Ngày", "Loại nghỉ", "Công theo đơn", "Từng hình thức công", "Đối chiếu", "Chọn áp dụng", "Dữ liệu nguồn"];
      var rows = review.entries.map(function (entry) {
        var controls = h("div", { class: "bar" }), check;
        if (entry.apply && !locked && !review.warnings.some(function (x) { return x.ma === entry.ma && x.contract === entry.contract; })) {
          check = h("input", { type: "checkbox", "aria-label": "Áp dụng " + entry.ma + " ngày " + entry.date });
          choices.push({ entry: entry, check: check });
        }
        if (!snap && can("hr.edit") && entry.orders.length) {
          entry.orders.slice(0, 3).forEach(function (order) {
            controls.appendChild(btn("Mở đơn " + order.type, "", function () {
              if (db[order.table].indexOf(order.row) >= 0) hrForm(order.table, order.row, {}, function () { after(); leaveReviewModal(locked, after); });
            }));
          });
        }
        if (!locked) {
          var field = entry.date.slice(8);
          db.chamcong.filter(function (r) {
            return VAL.normKy(r["Kỳ"]) === ky && r["Mã NV"] === entry.ma && E.tachCong(r[field]).soCong > 0;
          }).forEach(function (r) {
            controls.appendChild(btn("Mở dòng " + (r["Hình thức công"] || "BT"), "", function () {
              var index = db.chamcong.indexOf(r);
              if (index >= 0) inputRowEdit("chamcong", S.chamcong, index, function () { after(); leaveReviewModal(locked, after); });
            }));
          });
        }
        return { "Mã NV": entry.ma, "Ngày": fmtDate(entry.date), "Loại nghỉ": entry.orders.map(function (o) { return o.type; }).join(", "),
          "Công theo đơn": entry.expected ?? (entry.orders.length === 1 ? entry.orders[0].amount : null),
          "Từng hình thức công": Object.keys(entry.forms || {}).sort().map(function (code) { return code + ": " + fmt(entry.forms[code]); }).join(" · "),
          "Đối chiếu": entry.status, "Chọn áp dụng": check, "Dữ liệu nguồn": controls };
      });
      body.appendChild(simpleTable(rows, null, cols));
    }
    modal("Đối chiếu đơn nghỉ — " + kyLabel(ky), body, function (close) {
      var actions = [btn("Đóng", "", close)];
      if (choices.length) actions.push(btn("Áp dụng phép đã duyệt", "pri", function () {
        if (!need("input.edit") || kyStr() !== ky || kyChot(ky)) return;
        var picked = new Set(choices.filter(function (x) { return x.check.checked; }).map(function (x) { return x.entry.ma + "|" + x.entry.date; }));
        if (!picked.size) { toast("Chọn ngày phép cần bổ sung."); return; }
        var current = C.leaveReconciliation.reconcile(db, ky);
        var live = current.entries.filter(function (x) {
          return x.apply && picked.has(x.ma + "|" + x.date) && !current.warnings.some(function (w) { return w.ma === x.ma && w.contract === x.contract; });
        });
        if (live.length !== picked.size) { alert("Dữ liệu đã đổi. Mở lại đối chiếu trước khi áp dụng."); return; }
        if (!txn(["chamcong", "_inputReviews"], function () {
          var byEmployee = new Map();
          live.forEach(function (x) {
            if (!byEmployee.has(x.ma)) byEmployee.set(x.ma, {});
            byEmployee.get(x.ma)[x.date.slice(8)] = x.expected;
          });
          for (var pair of byEmployee) {
            var ma = pair[0], values = pair[1], rows = db.chamcong.filter(function (r) {
              return VAL.normKy(r["Kỳ"]) === ky && r["Mã NV"] === ma && String(r["Hình thức công"] || "").trim().toUpperCase() === "PN";
            });
            if (rows.length > 1 || (rows.length && Object.keys(values).some(function (d) {
              return String(rows[0][d] ?? "").trim() !== "" && String(rows[0][d]).trim() !== "0";
            }))) { alert(ma + ": dòng PN đã có dữ liệu hoặc có nhiều dòng PN. Kiểm tra trên bảng công."); return false; }
            var plan = rows.length ? REPO.plan("update", "chamcong", rows[0], values) :
              REPO.plan("insert", "chamcong", null, Object.assign({ "Kỳ": ky, "Mã NV": ma, "Hình thức công": "PN" }, values));
            if (!commit(plan, { action: "Áp dụng phép đã duyệt" })) return false;
          }
          return true;
        })) { alert(lastTxnError || "Chưa áp dụng công phép."); return; }
        close(); after(); toast("Đã bổ sung " + live.length + " ngày theo lựa chọn. Kiểm tra và bấm Lưu để tính lương.");
      }));
      return actions;
    }, { wide: true });
  }

  function inputPeriodBatch(key, replacing, after) {
    if (!need("input.edit")) return;
    var period = kyStr();
    var preview = function (raw, name) {
      var plan; try { plan = C.inputBatch.plan(db, key, period, ALL[key].cols, raw); } catch (e) { alert(e.message); return; }
      var body = h("div", {}, [h("p", { text: ALL[key].ten + " — " + kyLabel(period) }), h("p", { text: "Sẽ xóa " + plan.remove.length + " dòng; thêm " + plan.rows.length + " dòng. Các kỳ khác giữ nguyên." }), h("p", { text: name || "Xóa dữ liệu của kỳ đã chọn" })]);
      if (plan.totals.length) body.appendChild(h("p", { text: "Trong số dòng sẽ xóa có " + plan.totals.length + " dòng tổng không có ngày cân đang lưu: " + plan.totals.map(function (r) { return r["Phiếu cân"]; }).join(", ") }));
      if (plan.unresolved.length) body.appendChild(h("p", { class: "warn", text: plan.unresolved.length + " phiếu đang lưu thiếu ngày hợp lệ vẫn cần đối chiếu. Các phiếu này chưa được xóa vì chưa xác định được kỳ." }));
      if (plan.ignored.length) body.appendChild(h("p", { text: "Bỏ qua dòng tổng trong Excel — " + plan.ignored.map(function (r) { return "dòng " + r.line + " (" + r.label + ")"; }).join(", ") }));
      modal(replacing ? "Thay toàn bộ dữ liệu kỳ" : "Xóa dữ liệu kỳ", body, function (close) { return [btn("Hủy", "", close), btn("Xác nhận " + (replacing ? "thay dữ liệu" : "xóa kỳ"), "red", function () {
        if (!need("input.edit")) return;
        if (period !== kyStr() || JSON.stringify(db[key] || []) !== plan.token) { alert("Dữ liệu hoặc kỳ đã đổi — mở lại xem trước."); return; }
        if (!backupOrBlock("truoc-thay-" + key + "-" + period, "thay/xóa " + ALL[key].ten)) return;
        if (!txn([key], function () {
          var now = C.inputBatch.plan(db, key, period, ALL[key].cols, raw);
          for (var i = 0; i < now.remove.length; i++) if (!commit(REPO.plan("remove", key, now.remove[i], null), { audit: false })) return false;
          for (var j = 0; j < now.rows.length; j++) if (!commit(REPO.plan("insert", key, null, now.rows[j]), { audit: false })) return false;
          audit("Thay/xóa dữ liệu kỳ", key + " " + period + ": xóa " + now.remove.length + " (dòng tổng: " + now.totals.length + "), thêm " + now.rows.length);
        })) { alert("Chưa thay dữ liệu: " + lastTxnError); return; }
        close(); after(); toast("Đã lưu dữ liệu kỳ " + period);
      })]; });
    };
    if (!replacing) { preview(null, ""); return; }
    readWorkbook(function (wb, name) {
      var sheet = wb.SheetNames.filter(function (n) { return n === sheetName(ALL[key].ten); })[0] || wb.SheetNames[0];
      var raw = key === "sanluong" ? IMP.rowsFromAoa(XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: true, defval: "" }), key, ALL[key].cols).rows : XLSX.utils.sheet_to_json(wb.Sheets[sheet], { raw: true, defval: "" });
      preview(raw, name);
    });
  }

