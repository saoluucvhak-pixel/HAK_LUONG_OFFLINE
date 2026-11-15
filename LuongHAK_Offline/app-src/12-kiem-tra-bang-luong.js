  // ---------- Kiểm tra bảng lương (V10): ERROR / WARNING / INFO, đi tới dữ liệu, kiểm tra lại, xuất Excel ----------
  var KT_GOTO = { 1: ["caidat"], 2: ["dm", "dm_luong"], 3: ["dm", "dm_tangca"], 4: ["nhansu"], 5: ["nhansu"], 6: ["dm", "dm_luong"], 7: ["sanluong"], 8: ["sanluong"], 9: ["sanluong"], 10: ["chamcong"], 15: ["chamcong"], 16: ["dm", "dm_tncn"], 17: ["dm", "dm_baohiem"], 18: ["luong"], 19: ["luong"], 20: ["luong"], 21: ["caidat"], 22: ["dm", "dm_luong"] };
  var KT_SEV = { loi: "ERROR", canhbao: "WARNING", ok: "INFO" };
  function ktChay() {
    var kq = tinhLuong(), slA = pbAlloc(st.nam, st.thang, "sanluong"), bdA = pbAlloc(st.nam, st.thang, "bandam");
    var ck = PCC ? PCC.run({ db: db, kq: kq, slAlloc: slA, bdAlloc: bdA, quyChe: quyChe() }) : { items: [] };
    var out = ck.items.map(function (x) { return { id: "KT-" + ("0" + x.id).slice(-2), muc: KT_SEV[x.trangThai] || "INFO", ten: x.ten, chiTiet: x.chiTiet || [], goto: KT_GOTO[x.id] || null }; });
    INT.check(db).filter(function (i) { return i.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN)/.test(i.msg); }).forEach(function (i, n) { out.push({ id: "DL-" + (n + 1), muc: "ERROR", ten: "Lỗi dữ liệu nghiêm trọng (chặn chốt kỳ)", chiTiet: [i.msg], goto: ["backup"] }); });
    if (kq.canhbao.length) out.push({ id: "CB-01", muc: "WARNING", ten: "Cảnh báo dữ liệu khi tính lương (" + kq.canhbao.length + ")", chiTiet: kq.canhbao.slice(), goto: ["luong"] });
    (kq.inputErrors || []).forEach(function (message, i) {
      var match = /^(chamcong|sanluong|bandam) dòng (\d+):/.exec(message);
      if (match) out.push({ id: "NL-" + (i + 1), muc: "ERROR", ten: "Lỗi dữ liệu đầu vào",
        chiTiet: [message], goto: [match[1], null, Number(match[2]) - 1] });
    });
    var order = { ERROR: 0, WARNING: 1, INFO: 2 };
    out.sort(function (a, b) { return order[a.muc] - order[b.muc]; });
    st.kt = { ky: kyStr(), rev: dbRev, at: new Date().toISOString(), rows: out };
  }
  function ktDi(g) {
    if (!g) return; if (!leaveOk()) return;
    if (g[0] === "dm" && g[1]) st.dm = g[1];
    if (!tabAllowed(g[0])) return;
    var row = Number.isInteger(g[2]) && (db[g[0]] || [])[g[2]];
    if (row) {
      var period = VAL.rowPeriod(g[0], row);
      if (period) { st.nam = Number(period.slice(0, 4)); st.thang = Number(period.slice(5, 7)); }
      if (g[0] === "bandam") st.pumpMode = row["Mã NV"] ? "direct" : "team";
      st.ktReturn = st.kt.ky;
      st.qs[g[0]] = row["Phiếu cân"] || row["Mã NV"] || "";
      st.pg[g[0]] = 1;
    }
    st.tab = g[0]; saveUi(); render();
  }
  function tabKiemTra() {
    var w = h("div"), card = h("div", { class: "card" });
    if (!st.kt || st.kt.ky !== kyStr() || st.kt.rev !== dbRev) ktChay();
    var K = st.kt, cnt = { ERROR: 0, WARNING: 0, INFO: 0 }; K.rows.forEach(function (r) { cnt[r.muc]++; });
    if (!st.ktSev) st.ktSev = "";
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("↻ Kiểm tra lại", "pri", function () { ktChay(); render(); toast("Đã kiểm tra lại kỳ " + st.thang + "/" + st.nam); }));
    [["", "Tất cả"], ["ERROR", "Lỗi (" + cnt.ERROR + ")"], ["WARNING", "Cảnh báo (" + cnt.WARNING + ")"], ["INFO", "Thông tin (" + cnt.INFO + ")"]].forEach(function (x) { bar.appendChild(btn(x[1], st.ktSev === x[0] ? "pri" : "", function () { st.ktSev = x[0]; render(); })); });
    bar.appendChild(btn("⬇ Xuất Excel", "", function () {
      var rows = []; K.rows.forEach(function (r) { (r.chiTiet.length ? r.chiTiet : [""]).forEach(function (d) { rows.push({ "Mã": r.id, "Mức": r.muc, "Nội dung kiểm tra": r.ten, "Chi tiết": d }); }); });
      saveXlsx("KiemTraBangLuong_" + K.ky + ".xlsx", [{ name: "Kiem tra bang luong", cols: ["Mã", "Mức", "Nội dung kiểm tra", "Chi tiết"], rows: rows }]);
    }));
    card.appendChild(bar);
    card.appendChild(h("div", { class: cnt.ERROR ? "warn" : "ok", text: (cnt.ERROR ? "⛔ Còn " + cnt.ERROR + " lỗi — lỗi mức ERROR chặn việc chốt kỳ và xuất báo cáo chính thức. " : "✔ Không có lỗi chặn chốt kỳ. ") + cnt.WARNING + " cảnh báo, " + cnt.INFO + " mục thông tin · Kỳ " + st.thang + "/" + st.nam + " · kiểm tra lúc " + fmtTime(K.at) }));
    var t = h("table", { class: "kt" });
    t.appendChild(h("thead", {}, [h("tr", {}, ["Mã", "Mức", "Nội dung kiểm tra", "Chi tiết", ""].map(function (c) { return h("th", { text: c }); }))]));
    var tb = h("tbody");
    K.rows.filter(function (r) { return !st.ktSev || r.muc === st.ktSev; }).forEach(function (r) {
      var tr = h("tr", { "data-sev": r.muc });
      tr.appendChild(h("td", { text: r.id }));
      tr.appendChild(h("td", { class: "kt-" + r.muc.toLowerCase(), html: "<b>" + (r.muc === "ERROR" ? "⛔ ERROR" : r.muc === "WARNING" ? "⚠ WARNING" : "✓ INFO") + "</b>" }));
      tr.appendChild(h("td", { class: "t", html: "<b>" + esc(r.ten) + "</b>" }));
      tr.appendChild(h("td", { class: "t", html: r.chiTiet.slice(0, 8).map(esc).join("<br>") + (r.chiTiet.length > 8 ? "<br>…(" + (r.chiTiet.length - 8) + " dòng nữa — xem trong file Excel)" : "") }));
      var act = h("td"); if (r.goto && r.muc !== "INFO") act.appendChild(btn("Đi tới dữ liệu", "", function () { ktDi(r.goto); })); tr.appendChild(act);
      tb.appendChild(tr);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw" }, [t]));
    w.appendChild(card); return w;
  }

