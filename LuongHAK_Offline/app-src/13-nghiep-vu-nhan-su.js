  // ---------- Nghiệp vụ nhân sự (V10): đề nghị → chờ duyệt → duyệt/từ chối; duyệt xong mới ghi vào hồ sơ ----------
  var NVNS_LOAI = HR.nghiepvu_nhansu.f.filter(function (f) { return f.k === "Loại nghiệp vụ"; })[0].o;
  var NVNS_NGHI = { "Nghỉ phép năm": "Nghỉ hằng năm", "Nghỉ việc riêng có lương": "Nghỉ việc riêng có hưởng lương", "Nghỉ không lương": "Nghỉ không hưởng lương", "Nghỉ thai sản": "Nghỉ thai sản" };
  function fmtDate(v) { return v ? dispVal({ t: "date" }, v) : ""; }
  function nvnsTen(ma) { var n = db.nhanvien.filter(function (r) { return r["Mã NV"] === ma; })[0]; return n ? n["Họ và tên"] : ""; }
  function nvnsNextMa() { var mx = 0; (db.nghiepvu_nhansu || []).forEach(function (r) { var m = /(\d+)$/.exec(r["Mã phiếu"] || ""); if (m && +m[1] > mx) mx = +m[1]; }); return "NVNS" + ("00000" + (mx + 1)).slice(-5); }
  function nvnsCongTrung(r) {
    var tu = VAL.normDate(r["Từ ngày"]), den = VAL.normDate(r["Đến ngày"]) || tu, ma = r["Mã NV"];
    if (!tu || !NVNS_NGHI[r["Loại nghiệp vụ"]] && r["Loại nghiệp vụ"] !== "Nghỉ ốm") return 0;
    var days = new Set();
    (db.chamcong || []).forEach(function (c) {
      if (c["Mã NV"] !== ma) return;
      var ky = VAL.normKy(c["Kỳ"]);
      if (!ky) return;
      var maxDay = new Date(+ky.slice(0, 4), +ky.slice(5), 0).getDate();
      DAYS.slice(0, maxDay).forEach(function (field) {
        var date = ky + "-" + field;
        if (date >= tu && date <= den && E.tachCong(c[field]).soCong > 0) days.add(date);
      });
    });
    return days.size;
  }
  function nvnsGhiHoSo(r) {
    var ma = r["Mã NV"], loai = r["Loại nghiệp vụ"], tu = String(r["Từ ngày"] || "").slice(0, 10), den = String(r["Đến ngày"] || "").slice(0, 10);
    var nv = db.nhanvien.filter(function (x) { return x["Mã NV"] === ma; })[0];
    if (!nv) return { ok: false, msg: "Không tìm thấy nhân viên " + ma };
    if (!VAL.normDate(tu)) return { ok: false, msg: "Ngày hiệu lực không hợp lệ." };
    var hh = HRM.hienHanh(db, ma, tu);
    hh.hd = HRM.activeHD(db, ma, tu, tu);
    if (!hh.hd) return { ok: false, msg: "Nhân viên " + ma + " chưa có hợp đồng hiệu lực vào " + tu + "." };
    var soHD = hh.hd["Số HĐLĐ"], tag = "Từ " + r["Mã phiếu"];
    if (NVNS_NGHI[loai] || loai === "Nghỉ ốm") {
      var isOm = loai === "Nghỉ ốm", tb = isOm ? "nghiom" : "nghiphep";
      var vals = { "Mã NV": ma, "Số HĐLĐ": soHD, "Từ ngày": tu, "Đến ngày": den, "Số ngày nghỉ": r["Số ngày"] || "", "Trạng thái duyệt": "Đã duyệt", "Ghi chú": tag + ": " + (r["Lý do"] || "") };
      if (!isOm) { vals["Loại nghỉ"] = NVNS_NGHI[loai]; vals["Người duyệt"] = currentUser(); } else vals["Có giấy chứng nhận BHXH"] = "Không";
      var p = REPO.plan("insert", tb, null, vals, { what: "ghi " + loai.toLowerCase() + " vào hồ sơ" });
      if (!commit(p, { action: "Nghiệp vụ nhân sự — ghi " + loai + " " + ma })) return { ok: false, msg: "Repository từ chối ghi " + HR[tb].ten + " (xem thông báo)." };
      return { ok: true, msg: "Đã ghi vào " + HR[tb].ten + " của hợp đồng " + soHD };
    }
    if (loai === "Nghỉ việc") {
      if (!tu) return { ok: false, msg: "Thiếu ngày nghỉ việc" };
      if (!commit(REPO.plan("update", "hopdong", hh.hd, { "Ngày chấm dứt": tu }, { what: "chấm dứt hợp đồng" }), { confirm: true, action: "Nghiệp vụ nhân sự — nghỉ việc " + ma + " từ " + tu })) return { ok: false, msg: "Không ghi được ngày chấm dứt hợp đồng." };
      if (!commit(REPO.plan("update", "nhanvien", nv, { "Trạng thái": "Đã nghỉ việc" }, { what: "trạng thái nhân viên" }), { audit: false })) return { ok: false, msg: "Không đổi được trạng thái nhân viên." };
      return { ok: true, msg: "Đã ghi ngày chấm dứt hợp đồng " + soHD + " và chuyển nhân viên sang 'Đã nghỉ việc'" };
    }
    var isTransfer = loai === "Điều chuyển bộ phận";
    var isRole = loai === "Đổi chức vụ";
    if (!isTransfer && !isRole) return { ok: false, msg: "Loại nghiệp vụ chưa được hỗ trợ." };
    var revisions = db.chitiethd.filter(function (row) { return row["Mã NV"] === ma && row["Số HĐLĐ"] === soHD; });
    var prior = revisions.filter(function (row) {
      return !row["Hiệu lực từ"] || VAL.normDate(row["Hiệu lực từ"]) < tu;
    }).sort(function (a, b) { return String(b["Hiệu lực từ"] || "").localeCompare(String(a["Hiệu lực từ"] || "")); })[0];
    if (!prior) return { ok: false, msg: "Cần phụ lục gốc hiệu lực trước ngày biến động." };
    if (revisions.some(function (row) { return VAL.normDate(row["Hiệu lực từ"]) >= tu; })) {
      return { ok: false, msg: "Đã có phụ lục từ ngày hiệu lực này trở đi. Kiểm tra lịch sử phụ lục trước khi duyệt." };
    }
    var pb = r["Phòng ban mới"] || prior["Phòng ban"], cv = r["Chức vụ mới"] || prior["Chức vụ"];
    if (isTransfer && !r["Phòng ban mới"]) return { ok: false, msg: "Thiếu phòng ban mới." };
    if (isRole && !r["Chức vụ mới"]) return { ok: false, msg: "Thiếu chức vụ mới." };
    if (pb === prior["Phòng ban"] && cv === prior["Chức vụ"]) return { ok: false, msg: "Phòng ban và chức vụ trùng phụ lục hiện hành." };
    var annex = Object.assign(HR.chitiethd.defaults({ "Mã NV": ma, "Số HĐLĐ": soHD }, prior), {
      "Hiệu lực từ": tu, "Phòng ban": pb, "Chức vụ": cv, "Loại biến động": loai,
      "Số quyết định": r["Mã phiếu"], "Ghi chú": tag + ": " + (r["Lý do"] || "")
    });
    var plan = REPO.plan("insert", "chitiethd", null, annex, { what: "áp dụng phụ lục " + r["Mã phiếu"], checkDup: true });
    if (!commit(plan, { action: "Nghiệp vụ nhân sự — phụ lục " + r["Mã phiếu"] })) return { ok: false, msg: "Không ghi được phụ lục lương." };
    var pc = REPO.plan("insert", "congtac", null, { "Mã NV": ma, "Từ ngày": tu, "Phòng ban": pb, "Chức vụ": cv, "Loại biến động": isRole ? "Bổ nhiệm" : "Điều chuyển", "Số quyết định": r["Mã phiếu"], "Ghi chú": r["Lý do"] || "" }, { what: "ghi quá trình công tác" });
    if (!commit(pc, { action: "Nghiệp vụ nhân sự — " + loai + " " + ma + " từ " + tu })) return { ok: false, msg: "Không ghi được Quá trình công tác." };
    return { ok: true, msg: "Đã ghi quá trình công tác và phụ lục " + annex["Mã công tác"] + " từ " + fmtDate(tu) + "." };
  }
  function nvnsForm(row, defaults) {
    var isNew = !row, data = Object.assign({ "Mã phiếu": nvnsNextMa(), "Trạng thái": "Nháp", "Người đề nghị": currentUser(), "Ngày đề nghị": HRM.today() }, defaults || {}, row || {});
    var fs = HR.nghiepvu_nhansu.f.filter(function (f) { return ["Trạng thái", "Người đề nghị", "Ngày đề nghị", "Người duyệt", "Ngày duyệt", "Lý do từ chối", "Đã ghi vào hồ sơ"].indexOf(f.k) < 0; });
    fs = [{ k: "Mã NV", t: "ref", ref: "nhanvien", req: 1 }].concat(fs);
    var body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, fs, data);
    modal(isNew ? "Lập đề nghị nghiệp vụ nhân sự" : "Sửa đề nghị " + row["Mã phiếu"], body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu nháp", "pri", function () {
        if (!need("hr.edit", "lập nghiệp vụ nhân sự")) return;
        var d = get(), miss = missingReq(fs, d); if (miss.length) { alert("Cần nhập: " + miss.join(", ")); return; }
        if (d["Đến ngày"] && d["Đến ngày"] < d["Từ ngày"]) { alert("'Đến ngày' phải sau hoặc bằng 'Từ ngày'."); return; }
        var quota = C.leaveReconciliation.checkRequest(db, d);
        if (quota) { alert(quota); return; }
        var vals = isNew ? Object.assign({}, data, d) : d;
        if (!commit(REPO.plan(isNew ? "insert" : "update", "nghiepvu_nhansu", isNew ? null : row, vals, { what: (isNew ? "lập " : "sửa ") + "đề nghị nhân sự", checkDup: true }), { action: isNew ? "Lập đề nghị nhân sự" : "Sửa đề nghị nhân sự" })) return;
        close(); save();
        var Fn = st.nvf; if (Fn && vals["Từ ngày"] && ((Fn.tu && vals["Từ ngày"] < Fn.tu) || (Fn.den && vals["Từ ngày"] > Fn.den))) { Fn.tu = ""; Fn.den = ""; Fn.tuManual = Fn.denManual = true; } // đề nghị mới nằm ngoài khoảng ngày đang lọc → bỏ khoảng ngày để người lập thấy ngay phiếu vừa lưu
        render(); toast("Đã lưu đề nghị " + vals["Mã phiếu"]);
      })];
    }, { drawer: true });
  }
  function nvnsDoiRaw(r, tt, extra) {
    if (tt === "Chờ duyệt") {
      var quota = C.leaveReconciliation.checkRequest(db, r);
      if (quota) { alert(quota); return false; }
    }
    var p = REPO.plan("update", "nghiepvu_nhansu", r, Object.assign({ "Trạng thái": tt }, extra || {}), { what: "đổi trạng thái đề nghị" });
    if (!commit(p, { action: "Nghiệp vụ nhân sự — " + tt + " " + r["Mã phiếu"] })) return false;
    return true;
  }
  /** Đổi trạng thái 1 phiếu và ghi đĩa NGAY (từng bước Nháp→Chờ duyệt→… phải tới main đúng thứ tự, không gộp theo thời gian trễ). */
  function nvnsDoi(r, tt, extra) { return txn(["nghiepvu_nhansu"], function () { return nvnsDoiRaw(r, tt, extra); }); }
  function nvnsDuyet(r) {
    if (!need("hr.approve", "duyệt nghiệp vụ nhân sự")) return;
    if (r["Người đề nghị"] && r["Người đề nghị"] === currentUser() && !can("system.admin")) { alert("Người đề nghị không được tự duyệt phiếu của mình — nhờ người có quyền duyệt khác."); return; }
    var quota = C.leaveReconciliation.checkRequest(db, r);
    if (quota) { alert(quota); return; }
    var updatesAnnex = r["Loại nghiệp vụ"] === "Điều chuyển bộ phận" || r["Loại nghiệp vụ"] === "Đổi chức vụ";
    if (!can("hr.edit")) {
      alert("Phiếu này ghi vào hồ sơ nhân sự. Chuyển cho người có cả quyền duyệt và quyền sửa hồ sơ.");
      return;
    }
    var ccTrung = nvnsCongTrung(r), msg = "Duyệt " + r["Loại nghiệp vụ"] + " cho " + r["Mã NV"] + " — " + nvnsTen(r["Mã NV"]) + "?\nSau khi duyệt hệ thống ghi vào hồ sơ và KHÔNG sửa/xóa phiếu nữa." + (ccTrung ? "\n\n⚠ Có dữ liệu chấm công ở " + ccTrung + " ngày trong khoảng nghỉ. Sau khi duyệt, mở Chấm công → Đối chiếu đơn nghỉ để kiểm tra từng hình thức." : "");
    if (updatesAnnex) {
      var old = HRM.hienHanh(db, r["Mã NV"], r["Từ ngày"]);
      msg += "\n\nHiệu lực: " + fmtDate(r["Từ ngày"]) + " · Kỳ " + String(r["Từ ngày"]).slice(0, 7) +
        "\nPhòng ban: " + (old.pb || "—") + " → " + (r["Phòng ban mới"] || old.pb || "—") +
        "\nChức vụ: " + (old.cv || "—") + " → " + (r["Chức vụ mới"] || old.cv || "—") +
        "\nLý do: " + (r["Lý do"] || "—");
    }
    if (!confirm(msg)) return;
    var msgOk = "";
    var done = txn(["nghiepvu_nhansu", "nhanvien", "hopdong", "nghiphep", "nghiom", "congtac", "chitiethd"], function () {
      var kq = nvnsGhiHoSo(r);
      if (!kq.ok) { alert("Không duyệt được: " + kq.msg); return false; }
      msgOk = kq.msg;
      return nvnsDoiRaw(r, "Đã duyệt", { "Người duyệt": currentUser(), "Ngày duyệt": HRM.today(), "Đã ghi vào hồ sơ": kq.msg });
    });
    if (!done) { render(); return; }
    render(); toast(msgOk);
  }
  function tabNghiepVuNS() {
    var w = h("div"), card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
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

