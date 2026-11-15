  function tabOpsReport(type) {
    var w = h("div"), card = h("div", { class: "card" }), T = OPS.TYPES[type], vm = opsVm(type);
    card.appendChild(h("h3", { "data-report-title": type, text: vm.title }));
    if ((type === "SAN_LUONG" || type === "BOM_DAM") && tabAllowed("baocaoluong")) {
      card.appendChild(btn("Xem kết quả phân bổ", "ghost", function () {
        st.tab = "baocaoluong"; st.bcl = "sanluong"; st.bclLoai = type === "BOM_DAM" ? "bandam" : "sanluong";
        saveUi(); render();
      }));
    }
    card.appendChild(h("div", { class: "hint", text: (T.theoKy ? "Kỳ " + vm.ky + " (đổi ở ô Kỳ lương phía trên) · " + vm.trangThai + ". " : "") + (vm.ghiChu || []).join(" ") + " Excel và PDF xuất đúng theo bộ lọc đang chọn." }));
    var bar = h("div", { class: "bar" }), pbs = {};
    var snapshot = (type === "SAN_LUONG" || type === "BOM_DAM") && kyChot(kyKey(st.nam, st.thang));
    var departments = snapshot ? snapshot.input?.danhmuc?.dm_phongban : db.dm_phongban;
    (departments || []).forEach(function (p) { if (p && p["Tên phòng ban"]) pbs[p["Tên phòng ban"]] = 1; });
    var pbSel = h("select", { "aria-label": "Phòng ban", "data-ops-key": "phongBan" }); pbSel.appendChild(h("option", { value: "", text: "— Tất cả phòng ban —" }));
    Object.keys(pbs).sort().forEach(function (n) { pbSel.appendChild(h("option", { value: n, text: n })); });
    pbSel.value = st.opsPB || ""; pbSel.addEventListener("change", function () { st.opsPB = pbSel.value; render(); }); bar.appendChild(pbSel);
    if (type === "NHAN_SU") {
      var ttSel = h("select", { "aria-label": "Trạng thái", "data-ops-key": "trangThaiNV" });
      [["dang", "Đang làm việc"], ["nghi", "Đã nghỉ việc"], ["tatca", "Tất cả"]].forEach(function (o) { ttSel.appendChild(h("option", { value: o[0], text: o[1] })); });
      ttSel.value = st.opsTT || "dang"; ttSel.addEventListener("change", function () { st.opsTT = ttSel.value; render(); }); bar.appendChild(ttSel);
    }
    var q = h("input", { class: "i", placeholder: "Tìm mã / tên / số chứng từ…", value: st.opsKw || "", "data-ops-key": "tuKhoa" });
    q.addEventListener("change", function () { st.opsKw = q.value; render(); }); bar.appendChild(q);
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("⬇ Xuất Excel", "pri", function () { opsXlsx(vm); }));
    bar.appendChild(btn("⬇ Xuất PDF", "", function () { opsPdf(vm); }));
    card.appendChild(bar);
    var kp = [h("div", { class: "kpi", html: "<small>Số dòng" + (vm.loc.length ? " (đang lọc)" : "") + "</small><b>" + vm.soDong + (vm.loc.length ? "/" + vm.soDongGoc : "") + "</b>" })];
    if (type === "NHAN_SU" && vm.thongKe) { kp.push(h("div", { class: "kpi", html: "<small>Đang làm việc (toàn công ty)</small><b>" + vm.thongKe.dang + "</b>" })); kp.push(h("div", { class: "kpi", html: "<small>Đã nghỉ việc</small><b>" + vm.thongKe.nghi + "</b>" })); }
    (OPS_KPI[type] || []).forEach(function (k) { if (vm.tong[k] != null) kp.push(h("div", { class: "kpi" + (k === "Thực nhận" ? " main" : ""), html: "<small>" + esc(k) + "</small><b>" + opsFmtCell({ kind: type === "THUONG" || type === "TAM_UNG" ? "money" : "qty3", label: k }, vm.tong[k]) + "</b>" })); });
    card.appendChild(h("div", { class: "kpis" }, kp));
    if (vm.loi.length) card.appendChild(h("div", { class: "warn", "data-ops-errors": String(vm.loi.length), html: "<b>⛔ " + vm.loi.length + " lỗi dữ liệu — chặn xuất file:</b><br>" + vm.loi.slice(0, 8).map(esc).join("<br>") + (vm.loi.length > 8 ? "<br>…" : "") }));
    if (vm.canhbao.length) card.appendChild(h("div", { class: "hint", "data-ops-warns": String(vm.canhbao.length), html: "⚠ " + vm.canhbao.slice(0, 6).map(esc).join(" · ") + (vm.canhbao.length > 6 ? " · … (" + vm.canhbao.length + " cảnh báo)" : "") }));
    if (!vm.rows.length) card.appendChild(h("div", { class: "empty", text: "Không có dòng nào" + (T.theoKy ? " trong kỳ " + vm.ky : "") + (vm.loc.length ? " theo bộ lọc hiện tại." : ".") }));
    card.appendChild(h("div", { class: "tw" }, [opsTable(type, type, vm.cols, vm.groups, vm.rows, vm.tong, vm.tongNhan)]));
    (vm.extras || []).forEach(function (e) { card.appendChild(h("div", { class: "fh", text: e.title })); card.appendChild(h("div", { class: "tw" }, [opsTable(type + "_" + e.name, type, e.cols, null, e.rows, e.tong, null)])); });
    w.appendChild(card); return w;
  }
