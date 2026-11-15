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
  // @screen tabBaoCao

