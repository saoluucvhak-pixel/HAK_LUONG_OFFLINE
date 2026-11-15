  function tabBangTinhNoiBo() {
    var w = h("div"), card = h("div", { class: "card" }), src = kqKy(st.nam, st.thang);
    card.appendChild(h("div", { class: "hint", html: (src.chot ? "🔒 Kỳ <b>đã chốt</b>" : "⚠ Kỳ <b>chưa chốt</b> — tính tạm") + " · Chỉ các khoản <b>tính ra thu nhập</b> (không BH, thuế, tạm ứng, thực lĩnh). Cùng một bộ lọc với Tính lương, Excel và PDF." }));
    card.appendChild(reportFilterBar(src.kq.bangluong, { summaryCols: ["Tổng thu nhập"] }));
    var vm = IPAY.build(src.kq, { nam: st.nam, thang: st.thang, filter: st.rf, tenCongTy: congTy()["Tên công ty"] || "", chot: src.chot, cheDoBu: src.kq.cheDoBu });
    var tools = h("div", { class: "bar" });
    tools.appendChild(btn("⬇ Xuất PDF", "pri", function () { exportPdf(vm, "BangTinhLuong_" + kyStr() + ".pdf", { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"] }); }));
    tools.appendChild(btn("⬇ Xuất Excel", "", function () {
      if (!need("export", "xuất dữ liệu ra Excel") || formulaErrorsBlock("BangTinhLuong")) return;
      if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
      window.HAKUi.reportXlsx.build(window.ExcelJS, IPAY.toXlsxVm(vm, { ngayLap: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "" }), { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"] }).xlsx.writeBuffer().then(function (buf) {
        download("BangTinhLuong_" + kyStr() + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); audit("Xuất Excel BẢNG TÍNH LƯƠNG", kyStr() + " · " + vm.soDong + " dòng");
      }, function (e) { alert("Không tạo được file: " + e.message); });
    }));
    card.appendChild(tools);
    if (vm.kiemTra.lech.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + vm.kiemTra.lech.length + " dòng có tổng các khoản ≠ Tổng thu nhập engine:</b> " + vm.kiemTra.lech.slice(0, 8).map(function (x) { return esc(x.maNV); }).join(", ") }));
    card.appendChild(h("div", { class: "kpis" }, [h("div", { class: "kpi", html: "<small>Số người" + (vm.loc.length ? " (đang lọc)" : "") + "</small><b>" + vm.soDong + (vm.loc.length ? "/" + vm.soDongGoc : "") + "</b>" }), h("div", { class: "kpi main", html: "<small>Tổng thu nhập</small><b>" + fmt(vm.tong["Tổng thu nhập"] || 0) + "</b>" })]));
    var t = h("table", { "data-bangtinh": "1" }), hr = h("tr");
    vm.cols.forEach(function (c, i) { hr.appendChild(h("th", { class: (c.kind === "text" ? "" : "r") + (i === 0 ? " stk" : ""), text: c.label })); });
    t.appendChild(h("thead", {}, [hr])); var tb = h("tbody");
    vm.groups.forEach(function (g) {
      tb.appendChild(h("tr", {}, [h("td", { class: "td-grp", colspan: vm.cols.length, text: g.ten + " (" + g.rows.length + " người)" })]));
      g.rows.forEach(function (r) { tb.appendChild(h("tr", {}, vm.cols.map(function (c, i) { var v = r[c.key]; return h("td", { class: (c.kind === "text" ? "t" : "r") + (i === 0 ? " stk" : ""), style: c.strong ? "font-weight:700" : "", text: c.kind === "text" ? (v == null ? "" : v) : (!v ? "–" : fmt(v)) }); }))); });
      tb.appendChild(h("tr", { class: "tr-sum" }, vm.cols.map(function (c, i) { return h("td", { class: i < 3 ? "t" : "r", text: i === 1 ? "Cộng " + g.ten : (g.tong[c.key] != null ? fmt(g.tong[c.key]) : "") }); })));
    });
    t.appendChild(tb);
    t.appendChild(h("tfoot", {}, [h("tr", {}, vm.cols.map(function (c, i) { return h("td", { class: i < 3 ? "t" : "r", text: i === 0 ? "TỔNG" : (vm.tong[c.key] != null ? fmt(vm.tong[c.key]) : "") }); }))]));
    if (!vm.soDong) card.appendChild(h("div", { class: "empty", text: "Không có dòng nào khớp bộ lọc." }));
    card.appendChild(h("div", { class: "tw" }, [t])); w.appendChild(card); return w;
  }
