  function tabCapPhat() {
    var s = cpState(), w = h("div", { "data-cp-tab": s.view }), card = h("div", { class: "card" });
    if (s.view === "detail") { card.appendChild(cpVoucherDetail()); w.appendChild(card); return w; }
    var types = h("div", { class: "bar", role: "group", "aria-label": "Loại cấp phát" }), views = h("div", { class: "bar", role: "group", "aria-label": "Màn hình cấp phát" });
    CP_TYPES.forEach(function (t) { types.appendChild(btn(t[1], s.type === t[0] ? "pri" : "", function () { s.type = t[0]; st.pg.capphat = 0; render(); }, "Lọc theo loại cấp phát")); });
    [["list", "Phiếu cấp phát"], ["report", "Báo cáo cấp phát"]].forEach(function (v) { views.appendChild(btn(v[1], s.view === v[0] ? "pri" : "", function () { s.view = v[0]; st.pg.capphat = 0; render(); })); });
    card.appendChild(h("div", { class: "hak-catalog-heading" }, [h("small", { text: "NGHIỆP VỤ NHÂN SỰ → CẤP PHÁT" }), h("h2", { text: s.view === "report" ? "Báo cáo cấp phát" : "Phiếu cấp phát" })]));
    card.appendChild(views); card.appendChild(types);
    card.appendChild(s.view === "report" ? cpReportView() : cpVoucherList());
    w.appendChild(card); return w;
  }
