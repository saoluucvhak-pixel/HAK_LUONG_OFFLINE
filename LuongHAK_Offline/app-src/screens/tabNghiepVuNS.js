  function tabNghiepVuNS() {
    var w = h("div"), card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    bar.appendChild(btn(st.benefitIssues ? "Về nghiệp vụ nhân sự" : "Cấp phát phúc lợi", "", function () {
      st.benefitIssues = !st.benefitIssues; render();
    }));
    if (st.benefitIssues) { card.appendChild(bar); card.appendChild(benefitIssueScreen()); w.appendChild(card); return w; }
    var F = st.nvf = st.nvf || { q: "", loai: "", tt: "", tu: "", den: "" };
    var kb = SFC.periodBounds(kyStr()) || ["", ""]; // Từ–Đến mặc định = ngày đầu và cuối của kỳ lương đang chọn; người dùng sửa tay thì giữ nguyên
    if (!F.tuManual) F.tu = kb[0]; if (!F.denManual) F.den = kb[1];
    var q = h("input", { class: "i", placeholder: "🔍 Tìm mã / tên nhân viên, mã phiếu (không cần dấu)", value: F.q, style: "min-width:260px", "aria-label": "Tìm nhân viên" });
    var sel = function (key, lab, opts) { var e = h("select", { "aria-label": lab }); e.appendChild(h("option", { value: "", text: lab + ": tất cả" })); opts.forEach(function (o) { e.appendChild(h("option", { value: o, text: o })); }); e.value = F[key]; e.addEventListener("change", function () { F[key] = e.value; render(); }); return e; };
    var dt = function (key, lab) { var e = dateField(F[key], { "aria-label": lab, title: lab }); e.addEventListener("change", function () { var iv = dateIso(e); if (iv === null) { toast("⚠ Ngày không hợp lệ — nhập dd/MM/yyyy"); return; } F[key] = iv; F[key + "Manual"] = true; render(); }); return e; };
    q.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { F.q = q.value; render(); } }); q.addEventListener("change", function () { F.q = q.value; render(); });
    if (can("hr.edit")) bar.appendChild(btn("＋ Lập đề nghị", "pri", function () { nvnsForm(null); }));
    bar.appendChild(q); bar.appendChild(sel("loai", "Loại", NVNS_LOAI)); bar.appendChild(sel("tt", "Trạng thái", ["Nháp", "Chờ duyệt", "Đã duyệt", "Từ chối"]));
    bar.appendChild(h("label", { text: "Từ" })); bar.appendChild(dt("tu", "Từ ngày")); bar.appendChild(h("label", { text: "đến" })); bar.appendChild(dt("den", "Đến ngày"));
    bar.appendChild(btn("Đặt lại", "", function () { st.nvf = null; render(); }));
    card.appendChild(bar);
    var qf = fold(F.q);
    var rows = (db.nghiepvu_nhansu || []).filter(function (r) {
      if (F.loai && r["Loại nghiệp vụ"] !== F.loai) return false; if (F.tt && r["Trạng thái"] !== F.tt) return false;
      if (F.tu && String(r["Từ ngày"] || "") < F.tu) return false; if (F.den && String(r["Từ ngày"] || "") > F.den) return false;
      return !qf || fold(r["Mã NV"] + " " + nvnsTen(r["Mã NV"]) + " " + r["Mã phiếu"]).indexOf(qf) >= 0;
    }).sort(function (a, b) { return String(b["Từ ngày"] || "") < String(a["Từ ngày"] || "") ? -1 : 1; });
    var out = rows.map(function (r) { return { "Mã phiếu": r["Mã phiếu"], "Mã NV": r["Mã NV"], "Họ và tên": nvnsTen(r["Mã NV"]), "Loại nghiệp vụ": r["Loại nghiệp vụ"], "Từ ngày": fmtDate(r["Từ ngày"]), "Đến ngày": fmtDate(r["Đến ngày"]), "Số ngày": r["Số ngày"] || "", "Lý do": r["Lý do"] || "", "Trạng thái": r["Trạng thái"], "Người đề nghị": r["Người đề nghị"] || "", "Người duyệt": r["Người duyệt"] || "", "Ngày duyệt": fmtDate(r["Ngày duyệt"]), "Ghi vào hồ sơ": r["Đã ghi vào hồ sơ"] || "" }; });
    var cols = ["Mã phiếu", "Mã NV", "Họ và tên", "Loại nghiệp vụ", "Từ ngày", "Đến ngày", "Số ngày", "Lý do", "Trạng thái", "Người đề nghị", "Người duyệt", "Ngày duyệt", "Ghi vào hồ sơ"];
    var tools = h("div", { class: "bar noprint" });
    tools.appendChild(h("span", { class: "hint", style: "margin:0", text: rows.length + " phiếu" }));
    tools.appendChild(h("span", { class: "sp" }));
    tools.appendChild(btn("⬇ Excel", "", function () { saveXlsx("NghiepVuNhanSu.xlsx", [{ name: "Nghiep vu nhan su", cols: cols, rows: out }]); }));
    tools.appendChild(btn("⬇ PDF", "", function () { exportSheetsPdf({ title: "BÁO CÁO NGHIỆP VỤ NHÂN SỰ", ky: (F.tu || F.den) ? "Từ " + (F.tu ? fmtDate(F.tu) : "…") + " đến " + (F.den ? fmtDate(F.den) : "…") : "Tất cả thời gian", sheets: [{ name: "Nghiệp vụ nhân sự", rows: out }] }, "NghiepVuNhanSu.pdf"); }));
    tools.appendChild(btn("🖨 In", "", function () { if (!need("export", "in")) return; window.print(); }));
    card.appendChild(tools);
    var t = h("table", { class: "nvns" }), hr = h("tr");
    cols.concat([""]).forEach(function (c) { hr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [hr]));
    var tb = h("tbody");
    rows.forEach(function (r, i) {
      var tr = h("tr", { "data-nvns": r["Mã phiếu"] });
      cols.forEach(function (c) { var v = out[i][c]; tr.appendChild(h("td", { class: "t", text: v == null ? "" : v })); });
      var act = h("td", { class: "t noprint", style: "white-space:nowrap" }), tt = r["Trạng thái"];
      if (can("hr.edit") && tt === "Nháp") { act.appendChild(btn("Sửa", "", function () { nvnsForm(r); })); act.appendChild(btn("Gửi duyệt", "pri", function () { if (nvnsDoi(r, "Chờ duyệt")) { save(); render(); toast("Đã gửi duyệt " + r["Mã phiếu"]); } })); act.appendChild(btn("✕", "red ghost", function () { if (!confirm("Xóa nháp " + r["Mã phiếu"] + "?")) return; if (commit(REPO.plan("remove", "nghiepvu_nhansu", r, null, { what: "xóa đề nghị nháp" }), { action: "Xóa đề nghị nhân sự nháp" })) { save(); render(); } }, "Xóa nháp")); }
      if (tt === "Chờ duyệt" && can("hr.approve")) {
        if (can("hr.edit")) act.appendChild(btn("Duyệt", "pri", function () { nvnsDuyet(r); }));
        else act.appendChild(h("span", { class: "hint", text: "Cần người có quyền ghi hồ sơ" }));
        act.appendChild(btn("Từ chối", "red", function () { if (!need("hr.approve", "từ chối nghiệp vụ nhân sự")) return; askText("Từ chối " + r["Mã phiếu"], "Phiếu chuyển sang 'Từ chối', không ghi vào hồ sơ.", { label: "Lý do từ chối", required: true, multiline: true, okText: "Từ chối" }, function (ly) { if (nvnsDoi(r, "Từ chối", { "Người duyệt": currentUser(), "Ngày duyệt": HRM.today(), "Lý do từ chối": ly })) { save(); render(); toast("Đã từ chối " + r["Mã phiếu"]); } }); }));
      }
      act.appendChild(btn("Lịch sử", "ghost", function () {
        var hist = (db.auditlog || []).filter(function (a) { return ((a.chiTiet || "") + (a.thaoTac || "")).indexOf(r["Mã phiếu"]) >= 0 || /nhân sự/i.test(a.thaoTac || "") && ((a.chiTiet || "").indexOf(r["Mã NV"]) >= 0); }).slice(-30).reverse();
        var b = h("div"); b.appendChild(hist.length ? simpleTable(hist.map(function (a) { return { "Thời điểm": fmtTime(a.luc || ""), "Người": a.nguoi || "", "Thao tác": a.thaoTac || "", "Chi tiết": a.chiTiet || "" }; })) : h("div", { class: "empty", text: "Chưa có lịch sử." }));
        modal("Lịch sử phiếu " + r["Mã phiếu"], b, function (close) { return [btn("Đóng", "", close)]; }, { wide: true });
      }));
      tr.appendChild(act); tb.appendChild(tr);
    });
    t.appendChild(tb);
    card.appendChild(rows.length ? h("div", { class: "tw" }, [t]) : h("div", { class: "empty", text: "Chưa có phiếu nghiệp vụ nhân sự nào khớp bộ lọc." }));
    card.appendChild(h("div", { class: "hint", text: "Quy trình: Nháp → Chờ duyệt → Đã duyệt / Từ chối. Chỉ khi Đã duyệt hệ thống mới ghi vào hồ sơ (nghỉ phép/ốm → Nghỉ phép/Nghỉ ốm của hợp đồng hiện hành; nghỉ việc → ngày chấm dứt hợp đồng; điều chuyển/đổi chức vụ → Quá trình công tác và phụ lục lương theo ngày hiệu lực). Người đề nghị không tự duyệt phiếu của mình (trừ Admin)." }));
    w.appendChild(card); return w;
  }
