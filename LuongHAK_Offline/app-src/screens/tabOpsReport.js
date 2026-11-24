  function tabOpsReport(type) {
    var w = h("div"), card = h("div", { class: "card" }), T = OPS.TYPES[type], vm = opsVm(type);
    card.appendChild(h("h3", { "data-report-title": type, text: vm.title }));
    if (type === "SAN_LUONG" || type === "BOM_DAM") {
      card.appendChild(h("p", { class: "hint", text: "Phiếu gốc để kiểm kê. Kết quả phân bổ là chi tiết chia của cùng các phiếu này." }));
      var inputTable = OPS.closedTables[type];
      if (!kyChot(kyStr()) && tabAllowed(inputTable)) card.appendChild(btn("Mở bảng nhập phiếu", "ghost", function () {
        st.opsReceipt = null; st.tab = inputTable; saveUi(); render();
      }));
      if (st.opsReceipt?.type === type && st.opsReceipt.ky === kyStr()) {
        card.appendChild(btn("Bỏ lọc phiếu " + st.opsReceipt.number, "ghost", function () { st.opsReceipt = null; render(); }));
      }
    }
    if ((type === "SAN_LUONG" || type === "BOM_DAM") && tabAllowed("baocaoluong")) {
      card.appendChild(btn("Xem kết quả phân bổ", "ghost", function () {
        st.tab = "baocaoluong"; st.bcl = "sanluong"; st.bclLoai = type === "BOM_DAM" ? "bandam" : "sanluong";
        saveUi(); render();
      }));
    }
    card.appendChild(h("div", { class: "hint", text: (T.theoKy ? "Kỳ " + vm.ky + " (đổi ở ô Kỳ lương phía trên) · " + vm.trangThai + ". " : "") + (vm.ghiChu || []).join(" ") + " Excel và PDF xuất đúng theo bộ lọc đang chọn." }));
    var bar = h("div", { class: "bar" }), pbs = {};
    var snapshot = OPS.closedTables[type] && kyChot(kyKey(st.nam, st.thang));
    var departments = snapshot ? snapshot.input?.danhmuc?.dm_phongban : db.dm_phongban;
    (departments || []).forEach(function (p) { if (p && p["Tên phòng ban"]) pbs[p["Tên phòng ban"]] = 1; });
    // 010 (issue #99): Bộ lọc thông minh dùng chung (như báo cáo lương / màn nhập liệu): ô tìm, Phòng ban chọn nhiều, Trạng thái NV; giữ riêng từng báo cáo
    var of = opsF(type), fields = [{ key: "pb", label: "Phòng ban", type: "multi", options: function () { return Object.keys(pbs).sort(); } }];
    if (type === "NHAN_SU") fields.push({ key: "tt", label: "Trạng thái", type: "enum", options: [{ value: "dang", label: "Đang làm việc" }, { value: "nghi", label: "Đã nghỉ việc" }] });
    var keys = fields.map(function (f) { return f.key; });
    var sfCfg = {
      screenId: "ops:" + type, searchPlaceholder: "🔍 Tìm mã / tên / số chứng từ…", qAttrs: { "data-ops-key": "tuKhoa" }, qCommit: true,
      fields: fields, quickFields: ["q"].concat(keys), advancedFields: ["q"].concat(keys),
      scopeFallback: function () { return "tất cả"; },
      state: {
        get: function () { var s = SFC.empty(); s.q = of.q || ""; if (of.pb.length) s.sel.pb = of.pb.slice(); if (type === "NHAN_SU" && of.tt !== "tatca") s.one.tt = of.tt || "dang"; return s; },
        set: function (s) { of.q = s.q || ""; of.pb = (s.sel.pb || []).slice(); if (type === "NHAN_SU") of.tt = s.one.tt || "tatca"; }
      },
      dataSource: function () { return { kept: vm.soDong, total: vm.soDongGoc, unsupported: [] }; },
      onApply: function () { render(); }
    };
    var sfm = sfUi.mount(sfCfg); sfm.cfg = sfCfg; card.appendChild(sfm.el);
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("⬇ Xuất Excel", "pri", function () { opsXlsx(vm); }));
    bar.appendChild(btn("⬇ Xuất PDF", "", function () { opsPdf(vm); }));
    card.appendChild(bar);
    var kp = [h("div", { class: "kpi", html: "<small>Số dòng" + (vm.loc.length ? " (đang lọc)" : "") + "</small><b>" + vm.soDong + (vm.loc.length ? "/" + vm.soDongGoc : "") + "</b>" })];
    if (type === "NHAN_SU" && vm.thongKe) { kp.push(h("div", { class: "kpi", html: "<small>Đang làm việc (toàn công ty)</small><b>" + vm.thongKe.dang + "</b>" })); kp.push(h("div", { class: "kpi", html: "<small>Đã nghỉ việc</small><b>" + vm.thongKe.nghi + "</b>" })); }
    (OPS_KPI[type] || []).forEach(function (k) { if (vm.tong[k] != null) kp.push(h("div", { class: "kpi" + (k === "Thực nhận" ? " main" : ""), html: "<small>" + esc(k) + "</small><b>" + opsFmtCell({ kind: type === "THUONG" || type === "TAM_UNG" ? "money" : "qty3", label: k }, vm.tong[k]) + "</b>" })); });
    card.appendChild(h("div", { class: "kpis" }, kp));
    if (vm.loi.length) card.appendChild(h("div", { class: "warn", "data-ops-errors": String(vm.loi.length), html: "<b>⛔ " + vm.loi.length + " lỗi dữ liệu — chặn xuất file:</b><br>" + vm.loi.slice(0, 8).map(esc).join("<br>") + (vm.loi.length > 8 ? "<br>…" : "") }));
    if (vm.canhbao.length) card.appendChild(h("div", { class: "hint ops-warns", "data-ops-warns": String(vm.canhbao.length), html: "⚠ " + vm.canhbao.slice(0, 200).map(esc).join(" · ") + (vm.canhbao.length > 200 ? " · … (" + vm.canhbao.length + " cảnh báo)" : "") }));
    if (!vm.rows.length) card.appendChild(h("div", { class: "empty", text: "Không có dòng nào" + (T.theoKy ? " trong kỳ " + vm.ky : "") + (vm.loc.length ? " theo bộ lọc hiện tại." : ".") }));
    var twMain = h("div", { class: "tw" }); twMain.appendChild(opsTable(type, type, vm.cols, vm.groups, vm.rows, vm.tong, vm.tongNhan, twMain)); card.appendChild(twMain);
    (vm.extras || []).forEach(function (e) { card.appendChild(h("div", { class: "fh", text: e.title })); var twX = h("div", { class: "tw" }); twX.appendChild(opsTable(type + "_" + e.name, type, e.cols, null, e.rows, e.tong, null, twX)); card.appendChild(twX); });
    w.appendChild(card); return w;
  }
