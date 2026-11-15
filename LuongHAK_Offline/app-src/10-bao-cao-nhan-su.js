  // ---------- Báo cáo nhân sự ----------
  var BC = [["biendong", "📶 Biến động nhân sự"], ["hethan", "⏰ HĐLĐ sắp hết hạn"], ["tinhhinh", "👥 Tình hình nhân sự"], ["nghi", "🌴 Nghỉ phép / ốm"], ["vipham", "⚠️ Vi phạm chưa xử lý"], ["sinhnhat", "🎂 Sinh nhật trong tháng"], ["solaodong", "📋 Sổ quản lý lao động"], ["lichsu", "🕘 Lịch sử nhân sự"]];
  function simpleTable(rows, moneyCols, columns) {
    if (!rows.length) return h("div", { class: "empty", text: "Không có dữ liệu." });
    var cols = columns || Object.keys(rows[0]), t = h("table"), tr = h("tr");
    cols.forEach(function (c) { tr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    rows.forEach(function (r) { var x = h("tr"); cols.forEach(function (c) { var v = r[c]; var cell = h("td", { class: typeof v === "number" ? "r" : "t", text: v instanceof HTMLElement ? "" : (typeof v === "number" ? qtyText(v) : (v == null ? "" : v)), style: v === "ĐÃ QUÁ HẠN" ? "color:#c0362c;font-weight:700" : "" }); if (v instanceof HTMLElement) cell.appendChild(v); x.appendChild(cell); }); tb.appendChild(x); });
    t.appendChild(tb); return h("div", { class: "tw" }, [t]);
  }
  /** Sổ lao động (α18): ai còn thiếu thông tin bắt buộc + nút mở đúng tab hồ sơ để bổ sung */
  var TAB_TEN = { canhan: "Thông tin cá nhân", hocvan: "Trình độ học vấn", hopdong: "Hợp đồng lao động", chitiethd: "Lương & phụ lục HĐ" };
  function goHoSo(ma, tab) {
    st.tab = "nv"; st.nv = ma;
    if (tab === "chitiethd" || tab === "hopdong") { var hh = HRM.hienHanh(db, ma); st.nvTab = "hopdong"; st.hd = hh.hd ? hh.hd["Số HĐLĐ"] : null; st.hdTab = tab === "chitiethd" ? "chitiethd" : st.hdTab; }
    else st.nvTab = tab;
    saveUi(); render();
  }
  function soLaoDongThieuCard(list) {
    var box = h("div", { "data-sld-thieu": String(list.length) });
    if (!list.length) { box.appendChild(h("div", { class: "ok", text: "✓ Mọi nhân viên đã đủ thông tin bắt buộc của sổ quản lý lao động." })); return box; }
    var show = !!st.sldThieu;
    box.appendChild(h("div", { class: "warn" }, [h("b", { text: "⚠ " + list.length + " người còn thiếu thông tin sổ lao động" }), document.createTextNode(" — bấm tên mục để mở đúng tab hồ sơ và bổ sung (hoặc dùng file mẫu Excel của Nhân sự). "), btn(show ? "Thu gọn" : "Xem danh sách", "ghost", function () { st.sldThieu = !show; render(); })]));
    if (!show) return box;
    var t = h("table", { class: "sld-thieu" }), tb = h("tbody");
    t.appendChild(h("thead", {}, [h("tr", {}, [h("th", { text: "Mã NV" }), h("th", { text: "Họ và tên" }), h("th", { text: "Còn thiếu (bấm để bổ sung)" })])]));
    list.forEach(function (x) {
      var by = {}; x.thieu.forEach(function (m) { (by[m.tab] = by[m.tab] || []).push(m.field); });
      var cell = h("td", { class: "t" });
      Object.keys(by).forEach(function (tab) { cell.appendChild(btn(TAB_TEN[tab] + ": " + by[tab].join(", "), "chipbtn", function () { goHoSo(x["Mã NV"], tab); }, "Mở hồ sơ " + x["Họ và tên"] + " → " + TAB_TEN[tab])); });
      tb.appendChild(h("tr", {}, [h("td", { class: "t", text: x["Mã NV"] }), h("td", { class: "t", text: x["Họ và tên"] }), cell]));
    });
    t.appendChild(tb); box.appendChild(h("div", { class: "tw", style: "max-height:360px" }, [t]));
    return box;
  }
  function tabBaoCao() {
    var w = h("div"), bar = h("div", { class: "bar" }), R = HRM.reports(db, { hidePay: !canSeePay() });
    st.bc = st.bc || "hethan";
    BC.forEach(function (b) { bar.appendChild(btn(b[1], st.bc === b[0] ? "pri" : "", function () { st.bc = b[0]; render(); })); });
    w.appendChild(bar);
    var card = h("div", { class: "card" }), tools = h("div", { class: "bar" }), rows = [], title = BC.filter(function (b) { return b[0] === st.bc; })[0][1].replace(/^\S+\s/, "");
    card.appendChild(tools);
    if (st.bc === "biendong") {
      var mk = function (v, set) { var i = kyPicker(v); i.addEventListener("change", function () { if (i.value) { set(i.value); render(); } }); return i; };
      var den0 = st.bdDen || kyStr(), tu0 = st.bdTu || (function () { var d = new Date(+den0.slice(0, 4), +den0.slice(5, 7) - 3, 1); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); })();
      tools.appendChild(h("label", { text: "Từ " })); tools.appendChild(mk(tu0, function (v) { st.bdTu = v; }));
      tools.appendChild(h("label", { text: "đến " })); tools.appendChild(mk(den0, function (v) { st.bdDen = v; }));
      var all = R.biendong(tu0 < den0 ? tu0 : den0, tu0 < den0 ? den0 : tu0), loai = st.bdLoai || "";
      var tiles = h("div", { class: "kpis", role: "group", "aria-label": "Lọc theo loại biến động" });
      [""].concat(["Tăng mới", "Nghỉ việc"], HRM.BIEN_DONG.filter(function (x) { return x !== "Khác"; })).forEach(function (L) {
        var n = all.filter(function (r) { return !L || r["Loại biến động"] === L; }).length;
        if (L && !n) return;
        tiles.appendChild(h("button", { type: "button", class: "kpi qcard", "aria-pressed": loai === L ? "true" : "false", style: loai === L ? "border-color:var(--brand);background:var(--brandSoft)" : "", on: { click: function () { st.bdLoai = L; render(); } } }, [h("small", { text: L || "Tất cả" }), h("b", { text: String(n) })]));
      });
      card.appendChild(tiles);
      rows = all.filter(function (r) { return !loai || r["Loại biến động"] === loai; });
      card.appendChild(h("div", { class: "hint", text: "Tự nhận biết từ hợp đồng (vào làm / chấm dứt) và từ mỗi phụ lục so với phụ lục liền trước — dữ liệu cũ không phải nhập lại. Dùng để theo dõi tăng / giảm lao động, tăng lương, báo tăng / giảm mức đóng BHXH hằng tháng." }));
      card.appendChild(simpleTable(rows));
    } else if (st.bc === "hethan") {
      var nd = h("select"); [15, 30, 60, 90].forEach(function (n) { nd.appendChild(h("option", { value: n, text: "Trong " + n + " ngày tới" })); });
      nd.value = st.bcDays || 30; nd.addEventListener("change", function () { st.bcDays = +nd.value; render(); });
      tools.appendChild(nd); rows = R.hethan(+(st.bcDays || 30));
      card.appendChild(h("div", { class: "hint", text: "Gồm cả hợp đồng đã quá hạn mà chưa ký tiếp/chưa chấm dứt. Lấy theo 'Ngày hết hạn' của hợp đồng đang hiệu lực." }));
      card.appendChild(simpleTable(rows));
    } else if (st.bc === "tinhhinh") {
      var th = R.tinhhinh(), g = h("div", { class: "kpis" });
      [["Theo trạng thái", th.trangthai], ["Theo phòng ban (đang làm)", th.phongban], ["Theo giới tính (đang làm)", th.gioitinh], ["Theo loại HĐ (đang làm)", th.loaihd]].forEach(function (p) {
        var c = h("div", { class: "kpi" }); c.appendChild(h("small", { text: p[0] }));
        p[1].forEach(function (x) { c.appendChild(h("div", { class: "kv", html: "<span>" + esc(x["Nhóm"]) + "</span><b>" + x["Số người"] + "</b>" })); });
        g.appendChild(c);
        rows = rows.concat(p[1].map(function (x) { return { "Tiêu chí": p[0], "Nhóm": x["Nhóm"], "Số người": x["Số người"] }; }));
      });
      card.appendChild(g);
    } else if (st.bc === "nghi") {
      var yy = h("input", { class: "i", type: "number", value: st.nam, style: "width:90px" }); yy.addEventListener("change", function () { st.nam = +yy.value; render(); });
      tools.appendChild(h("label", { text: "Năm " })); tools.appendChild(yy);
      rows = R.nghi(st.nam);
      card.appendChild(h("div", { class: "hint", text: "Chỉ đếm các lần nghỉ 'Đã duyệt'. Phép được cấp = Số ngày được cấp + cộng dồn năm trước (mục Quyền lợi phép của hợp đồng)." }));
      card.appendChild(simpleTable(rows));
    } else if (st.bc === "vipham") { rows = R.vipham(); card.appendChild(simpleTable(rows)); }
    else if (st.bc === "sinhnhat") { rows = R.sinhnhat(st.thang); card.appendChild(h("div", { class: "hint", text: "Theo kỳ lương đang chọn: tháng " + st.thang })); card.appendChild(simpleTable(rows)); }
    else if (st.bc === "solaodong") {
      rows = R.soLaoDong(st.nam);
      card.appendChild(soLaoDongThieuCard(R.soLaoDongThieu()));
      card.appendChild(h("div", { class: "hint", text: "Nội dung theo khoản 2 Điều 3 Nghị định 145/2020/NĐ-CP (lập sổ trong 30 ngày kể từ ngày bắt đầu hoạt động; cập nhật từ ngày người lao động bắt đầu làm việc; xuất trình khi cơ quan có thẩm quyền yêu cầu). Các cột nghỉ / làm thêm / đào tạo / kỷ luật / tai nạn lấy theo năm " + st.nam + " (năm của kỳ đang chọn). Bấm 'Xuất Excel' để in / lưu sổ." }));
      card.appendChild(simpleTable(rows));
    }
    else if (st.bc === "lichsu") {
      var sel = h("select"); sel.appendChild(h("option", { value: "", text: "— chọn nhân viên —" }));
      db.nhanvien.forEach(function (n) { sel.appendChild(h("option", { value: n["Mã NV"], text: n["Mã NV"] + " — " + n["Họ và tên"] })); });
      sel.value = st.bcNV || ""; sel.addEventListener("change", function () { st.bcNV = sel.value; render(); });
      tools.appendChild(sel);
      rows = st.bcNV ? R.lichsu(st.bcNV) : [];
      card.appendChild(st.bcNV ? simpleTable(rows) : h("div", { class: "empty", text: "Chọn nhân viên để xem toàn bộ lịch sử hồ sơ." }));
    }
    tools.appendChild(h("span", { class: "sp" }));
    tools.appendChild(btn("⬇ Xuất Excel", "", function () {
      if (!rows.length) { toast("Không có dữ liệu"); return; }
      if (!need("export", "xuất dữ liệu ra Excel")) return;
      if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
      var vm = opsRowsVm(title, rows, "BaoCaoNhanSu_" + slug(title));
      window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: vm.chuKy }).xlsx.writeBuffer().then(function (buf) {
        download(vm.file + "_" + vm.kyKey + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); audit("Xuất Excel " + vm.title, vm.soDong + " dòng");
      }, function (e) { alert("Không tạo được file: " + e.message); });
    }));
    tools.appendChild(btn("⬇ Xuất PDF", "", function () {
      if (!rows.length) { toast("Không có dữ liệu"); return; }
      var vm = opsRowsVm(title, rows, "BaoCaoNhanSu_" + slug(title));
      exportSheetsPdf({ title: vm.title, ky: vm.kyText, loc: [], sheets: OPS.toSheets(vm) }, vm.file + "_" + vm.kyKey + ".pdf", { chuKy: vm.chuKy });
    }));
    tools.appendChild(h("span", { class: "hint", style: "margin:0", text: rows.length + " dòng" }));
    w.appendChild(card); return w;
  }

