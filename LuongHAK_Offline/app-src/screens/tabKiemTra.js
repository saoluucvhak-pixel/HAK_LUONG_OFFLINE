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
      tr.appendChild(h("td", { class: "t", html: "<div class=\"kt-detail\">" + r.chiTiet.slice(0, 200).map(esc).join("<br>") + (r.chiTiet.length > 200 ? "<br>…(" + (r.chiTiet.length - 200) + " dòng nữa — xem trong file Excel)" : "") + "</div>" }));
      var act = h("td"); if (r.goto && r.muc !== "INFO") act.appendChild(btn("Đi tới dữ liệu", "", function () { ktDi(r.goto); })); tr.appendChild(act);
      tb.appendChild(tr);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw" }, [t]));
    w.appendChild(card); return w;
  }
