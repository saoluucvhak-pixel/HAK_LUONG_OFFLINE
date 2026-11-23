  function tabHome() {
    var w = h("div", { class: "hak-dashboard" }), go = function (tab, extra) { return function () { st.tab = tab; if (extra) extra(); saveUi(); render(); }; };
    var chot = kyChot(kyStr()), ky = "tháng " + st.thang + "/" + st.nam;
    var sp = tabAllowed("luong") ? staffPay(st.nam, st.thang) : null;
    var iss = INT.check(db).filter(function (i) { return i.level === "Critical" || i.level === "High"; });
    var het = tabAllowed("baocao") || can("hr.view") ? HRM.reports(db).hethan(30) : [];
    // Banner
    var kqNow = chot ? null : (st.kq && st.kq.ky === kyStr() && !st.kqStale ? st.kq : null);
    var tl = chot ? chot.totals && chot.totals.thucLinh : kqNow ? kqNow.bangluong.reduce(function (t, x) { return t + (+x["Thực lĩnh"] || 0); }, 0) : null;
    var hb = [];
    if (tabAllowed("luong")) hb.push(btn(chot ? "🔒 Xem bảng lương đã chốt" : "▶ Tính lương " + ky, "", go("luong")));
    else if (tabAllowed("nhansu")) hb.push(btn("👥 Mở Nhân sự", "", go("nhansu")));
    if (tabAllowed("chamcong")) hb.push(btn("🗓 Mở chấm công", "ghost", go("chamcong")));
    var dl = h("dl", {}, [
      h("div", {}, [h("dt", { text: "Người tính lương" }), h("dd", { text: sp ? String(sp.list.length) : "—" })]),
      h("div", {}, [h("dt", { text: "Cần xử lý" }), h("dd", { text: String(iss.length + het.length + (sp ? sp.warn.length : 0)) })]),
      h("div", { class: "w" }, [h("dt", { text: chot ? "Tổng thực lĩnh (đã chốt)" : "Tổng thực lĩnh (lần tính gần nhất)" }), h("dd", { text: !canSeePay() ? HRM.PAY_HIDDEN : tl == null ? "Chưa tính" : fmt(tl) })])
    ]);
    w.appendChild(h("section", { class: "hero" }, [
      h("div", { class: "htxt" }, [h("div", { class: "ey", text: "Kỳ lương " + ky + " · " + (chot ? "Đã chốt" : "Chưa chốt") }),
        h("h1", { text: "Tính lương từ hồ sơ & chấm công" }),
        h("p", { text: "Nhập chấm công, sản lượng, thưởng / trừ, tạm ứng của tháng rồi bấm Tính lương. Lương, BHXH, thuế TNCN và thực lĩnh được tính tự động theo hồ sơ và danh mục — chạy hoàn toàn offline trên máy này." }),
        h("div", { class: "hbtns" }, hb)]),
      dl]));
    // Workspace overview: display only values already calculated by the current engine.
    var metrics = h("section", { class: "hak-dashboard-metrics", "aria-label": "Tổng quan kỳ lương" });
    [["Nhân sự", String((db.nhanvien || []).filter(function (x) { return x["Trạng thái"] !== "Đã nghỉ việc"; }).length), "Nhân viên đang làm việc"], ["Đầu vào còn nháp", String(C.inputReview.pending(db, kyStr()).length), "Bảng hoặc chế độ phân bổ cần lưu"], ["Cần xử lý", String(iss.length + het.length + (sp ? sp.warn.length : 0)), "Cảnh báo dữ liệu và hồ sơ"], ["Thực lĩnh", !canSeePay() ? HRM.PAY_HIDDEN : tl == null ? "Chưa tính" : fmt(tl), chot ? "Bảng lương đã chốt" : "Lần tính gần nhất"]].forEach(function (v) {
      metrics.appendChild(h("div", { class: "hak-dashboard-metric" }, [h("small", { text: v[0] }), h("strong", { text: v[1] }), h("span", { text: v[2] })]));
    });
    w.appendChild(metrics);
    // Các bước
    var steps = [
      ["backup", "Nạp danh mục chuẩn HAK", "Phòng ban, chức vụ, mã lương, phụ cấp, BH, thuế", countOf("dm_baohiem") > 0],
      ["dm", "Kiểm tra Danh mục", "Đơn giá, phụ cấp, ngưỡng BH theo đơn vị", countOf("dm_luong") > 0],
      ["nhansu", "Hồ sơ & hợp đồng", countOf("nhanvien") + " nhân viên — lương lấy từ phụ lục đang hiệu lực", countOf("nhanvien") > 0 && countOf("chitiethd") > 0],
      ["chamcong", "Chấm công tháng " + st.thang, "Dán từ Excel hoặc nhập tay", db.chamcong.some(function (r) { return r["Kỳ"] === kyStr(); })],
      ["sanluong", "Sản lượng · Thưởng · Tạm ứng", "Nếu có phát sinh trong tháng", db.sanluong.length + db.bandam.length + db.psluong.length + db.ungluong.length > 0],
      ["luong", "Tính → kiểm tra → Chốt kỳ", "Chốt để lưu bảng lương, xem lại về sau", !!chot]
    ].filter(function (s) { return tabAllowed(s[0]); });
    var ol = h("ol", { class: "flow", "aria-label": "Các bước kỳ lương" });
    steps.forEach(function (s, i) { ol.appendChild(h("li", { class: s[3] ? "done" : "", tabindex: "0", role: "button", on: { click: go(s[0]), keydown: function (e) { if (e.key === "Enter") go(s[0])(); } } }, [h("span", { class: "n", text: s[3] ? "✓" : String(i + 1) }), h("div", {}, [h("b", { text: s[1] }), h("small", { text: s[2] })])])); });
    w.appendChild(ol);
    // Mở nhanh
    var Q = [["chamcong", "g1", "🗓", "Chấm công", "Bảng công theo ngày, dán từ Excel."], ["luong", "g2", "📄", "Bảng lương", "Tính, kiểm tra cảnh báo, xuất Excel, chốt kỳ."],
      ["kyluong", "g4", "🔒", "Kỳ lương đã chốt", "Xem lại, so sánh phiên bản, xuất Excel."], ["baocaoluong", "g6", "📈", "Báo cáo lương", "Theo phòng ban, BHXH, thuế, hạch toán."],
      ["nhansu", "g5", "👥", "Hồ sơ nhân sự", "Hợp đồng, phụ lục lương, nhân thân, nghỉ phép."], ["baocao", "g7", "📋", "Báo cáo nhân sự", "Biến động, sổ quản lý lao động, hết hạn HĐ."],
      ["dm", "g8", "📚", "Danh mục", "Mã lương, phụ cấp, BH, thuế, phòng ban."], ["backup", "g3", "🛡", "Sao lưu & hệ thống", "Sao lưu, khôi phục, người dùng, kiểm tra dữ liệu."]]
      .filter(function (q) { return tabAllowed(q[0]); });
    if (Q.length) {
      w.appendChild(h("div", { class: "sec-title", text: "Mở nhanh" }));
      var qg = h("div", { class: "qcards" });
      Q.forEach(function (q) { qg.appendChild(h("button", { type: "button", class: "qcard", on: { click: go(q[0]) } }, [h("span", { class: "qi " + q[1], text: q[2] }), h("b", { text: q[3] }), h("small", { text: q[4] })])); });
      w.appendChild(qg);
    }
    // Cần xử lý + An toàn dữ liệu
    var todo = h("ul", { class: "todo" }), nTodo = 0;
    var addTodo = function (hi, title, sub, label, fn) { nTodo++; todo.appendChild(h("li", {}, [h("span", { class: "dot" + (hi ? " hi" : "") }), h("div", { class: "tx" }, [h("b", { text: title }), h("small", { text: sub })]), btn(label, "ghost", fn)])); };
    if (iss.length) addTodo(true, iss.length + " vấn đề dữ liệu mức Critical / High", iss.slice(0, 2).map(function (i) { return i.msg; }).join(" · "), "Kiểm tra dữ liệu", go("backup"));
    if (het.length) addTodo(true, het.length + " hợp đồng sắp hết hạn / đã quá hạn trong 30 ngày", het.slice(0, 3).map(function (r) { return r["Mã NV"]; }).join(", "), "Xem báo cáo", go("baocao", function () { st.bc = "hethan"; }));
    if (sp && sp.warn.length) addTodo(false, sp.warn.length + " cảnh báo hồ sơ khi tính lương " + ky, sp.warn[0], "Mở Tính lương", go("luong"));
    var left = h("section", { class: "card" }, [h("h3", {}, ["Cần xử lý trước khi chốt", nTodo ? h("span", { class: "cnt", text: String(nTodo) }) : null])]);
    left.appendChild(nTodo ? todo : h("div", { class: "hint", text: "Không có việc nào đang chờ — dữ liệu kỳ này sẵn sàng." }));
    var safe = h("section", { class: "card" }, [h("h3", { text: "An toàn dữ liệu" })]);
    safe.appendChild(h("div", { class: "hint", text: store ? "App tự lưu và tự giữ bản sao lưu mỗi ngày trên máy này (có file kiểm tra SHA-256)." : "Dữ liệu nằm trong trình duyệt của máy này — hãy sao lưu ra file cuối mỗi kỳ." }));
    var bst = store && store.backupStatus && (can("backup.restore") || can("system.admin")) ? store.backupStatus() : null;
    if (bst && (bst.daysSinceExternal == null || bst.daysSinceExternal > 7 || bst.lastMirrorError)) safe.appendChild(h("div", { class: "locked", html: "⚠ <b>" +
      (bst.lastMirrorError ? "Không chép được sang thư mục sao lưu thứ hai" : bst.daysSinceExternal == null ? "Chưa có bản sao lưu nào ra ngoài máy" : "Đã " + bst.daysSinceExternal + " ngày chưa sao lưu ra ngoài máy") +
      "</b> — hỏng ổ cứng / mất máy / mã độc sẽ mất cả dữ liệu lẫn bản sao lưu trên máy. Vào <b>Sao lưu &amp; hệ thống</b>: chọn <b>thư mục sao lưu thứ hai</b> (USB, ổ mạng, Google Drive) hoặc bấm <b>Sao lưu ra file</b>." +
      (bst.lastMirrorError ? "<br><span>" + esc(bst.lastMirrorError) + "</span>" : "") }));
    else if (bst) safe.appendChild(h("div", { class: "ok", text: "✓ Đã sao lưu ra ngoài máy " + bst.daysSinceExternal + " ngày trước" + (bst.mirrorDir ? " · thư mục thứ hai: " + bst.mirrorDir : "") }));
    if (tabAllowed("backup")) safe.appendChild(h("div", { class: "bar", style: "margin:10px 0 0" }, [btn("🛡 Mở Sao lưu", "", go("backup"))]));
    if (can("import")) safe.appendChild(h("div", { class: "bar", style: "margin:8px 0 0" }, [btn("📄 Tải file mẫu Excel", "", downloadAllTemplates), btn("⬆ Nhập từ file Excel tổng", "", importAllFile)]));
    w.appendChild(h("div", { class: "cols2" }, [left, safe]));
    return w;
  }
