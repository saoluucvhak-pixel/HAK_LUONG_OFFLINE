  function tabPayReport(type) {
    var w = h("div"), card = h("div", { class: "card" }), src = kqKy(st.nam, st.thang);
    var vm = payVm(type, src), ky = vm.kyKey;
    if (type === "SO_CHUNG_TU") {
      w.appendChild(payLedgerPanel(type, ky));
      card.classList.add("pay-ledger-export");
    }
    card.appendChild(h("h3", { "data-report-title": type, text: type === "SO_CHUNG_TU" ? "Chi tiết theo nhân viên · Xuất báo cáo" : vm.title + (type === "CHUYEN_KHOAN" || type === "TIEN_MAT" ? " · Đề nghị chi" : "") }));
    card.appendChild(h("div", { class: "hint", html: (src.chot ? "🔒 Kỳ <b>đã chốt</b> — lấy đúng bảng lương đã chốt." : "⚠ Kỳ <b>chưa chốt</b> — số liệu tính tạm" + (PRP.KHONG_CAN_CHOT[type] ? "." : ", <b>không xuất / không lập chứng từ</b> cho tới khi chốt.")) + (["THANH_TOAN", "CHI_TIET_TT", "CHUYEN_KHOAN", "TIEN_MAT"].indexOf(type) >= 0 ? " Số tiền đề nghị chi = thực lĩnh − đã chi − đang chờ chi." : "") }));
    card.appendChild(reportFilterBar(src.kq.bangluong));
    var tools = h("div", { class: "bar" });
    tools.appendChild(btn("⬇ Xuất Excel", "pri", function () { payXlsx(vm, type); }));
    tools.appendChild(btn("⬇ Xuất PDF", "", function () { payPdf(vm, type); }));
    if (type === "CHUYEN_KHOAN" || type === "TIEN_MAT") tools.appendChild(btn("Mở Bảng thanh toán lương để lập chứng từ", "ghost", function () {
      st.tab = "rp_thanhtoan"; saveUi(); render();
    }));
    if (type === "TONG_HOP_NV") { var cb = h("input", { type: "checkbox", "data-th-nhom": "1" }); cb.checked = !!st.thNhom; cb.addEventListener("change", function () { st.thNhom = cb.checked; render(); }); tools.appendChild(h("label", { class: "chip", title: "Mỗi phòng ban một nhóm, có dòng cộng từng phòng; in và Excel theo đúng dạng nhóm" }, [cb, document.createTextNode(" Nhóm theo phòng ban")])); }
    if (type === "THANH_TOAN") { tools.appendChild(btn("Lập chứng từ chuyển khoản", "", function () { payLap(PLG.HT.CK, src); })); tools.appendChild(btn("Lập phiếu chi tiền mặt", "", function () { payLap(PLG.HT.TM, src); })); }
    // v2.1.22 (A6-14 / Q10 phần 3/3): in PHIẾU CHI tiền mặt (PDF) từ sổ chứng từ — mỗi chứng từ tiền mặt 1 trang A4, có BẰNG CHỮ và khối ký (ui/payment-voucher.js)
    if (type === "SO_CHUNG_TU") tools.appendChild(btn("⬇ In phiếu chi tiền mặt (PDF)", "", function () {
      if (!need("export", "in phiếu chi")) return;
      var PV = window.HAKUI && window.HAKUI.paymentVoucher; if (!PV) { alert("Thiếu mô-đun phiếu chi"); return; }
      var ky = kyKey(st.nam, st.thang), vs = PV.pick(payLines().filter(function (l) { return l["Kỳ"] === ky; }));
      if (!vs.length) { toast("Kỳ " + ky + " chưa có chứng từ tiền mặt nào để in"); return; }
      var html = PV.html({ congTy: congTy()["Tên công ty"] || "", diaChi: congTy()["Địa chỉ"] || "", vouchers: vs });
      if (!window.hakReport) { pdfFallbackPrint(html); toast("Bản chạy bằng trình duyệt: chọn “Lưu thành PDF” trong hộp thoại In"); return; }
      toast("Đang tạo PDF " + vs.length + " phiếu chi…");
      window.hakReport.pdf({ html: html, name: PV.filename(ky, vs.length, vs.length === 1 ? vs[0].so : ""), landscape: false, footer: (congTy()["Tên công ty"] ? congTy()["Tên công ty"] + " · " : "") + "Phiếu chi " + ky }).then(function (r) {
        if (r && r.ok) { audit("In phiếu chi tiền mặt", ky + " · " + vs.length + " phiếu · " + r.name); toast("Đã lưu PDF: " + r.name + " (" + r.pages + " trang)"); } else alert("Không xuất được PDF: " + (r && r.error || "lỗi không rõ"));
      }, function (e) { alert("Không xuất được PDF: " + (e && e.message || e)); });
    }, "Mỗi chứng từ chi TIỀN MẶT (không tính đã hủy) một trang A4: số tiền bằng chữ và chỗ ký. Chỉ in, không lập hay sửa chứng từ."));
    card.appendChild(tools);
    var kp = [h("div", { class: "kpi", html: "<small>Số dòng" + (vm.loc.length ? " (đang lọc)" : "") + "</small><b>" + vm.soDong + (vm.loc.length ? "/" + vm.soDongGoc : "") + "</b>" })];
    Object.keys(vm.tong).filter(function (k) { return k !== "Số người"; }).slice(-2).forEach(function (k) { kp.push(h("div", { class: "kpi", html: "<small>" + esc(k) + "</small><b>" + fmt(vm.tong[k]) + "</b>" })); });
    card.appendChild(h("div", { class: "kpis" }, kp));
    if (vm.loi.length) card.appendChild(h("div", { class: "warn", "data-pay-errors": String(vm.loi.length), html: "<b>⛔ " + vm.loi.length + " lỗi nghiêm trọng — chặn xuất chính thức:</b><br>" + vm.loi.slice(0, 8).map(esc).join("<br>") + (vm.loi.length > 8 ? "<br>…" : "") }));
    if (vm.canhbao.length) card.appendChild(h("div", { class: "hint", html: "⚠ " + vm.canhbao.slice(0, 5).map(esc).join(" · ") }));
    var t = h("table", { "data-pay-report": type }), hr = h("tr");
    vm.cols.forEach(function (c) { hr.appendChild(h("th", { class: c.kind === "text" ? "" : "r", text: c.label })); });
    var head = [];
    if (vm.groups) head.push(h("tr", {}, vm.groups.map(function (g) { return h("th", { colspan: String(g.to - g.from + 1), class: "th-grp", text: g.label }); })));
    head.push(hr); t.appendChild(h("thead", {}, head)); var tb = h("tbody");
    var drawRow = function (r) { var trw = h("tr", type === "CHI_TIET_TT" ? { "data-ma": r["Mã NV"], style: "cursor:pointer", title: "Bấm để xem chi tiết thanh toán" } : {}, vm.cols.map(function (c) { var v = r[c.key]; return h("td", { class: c.kind === "text" ? "t" : "r", text: c.kind === "money" ? fmt(v) : c.kind === "qty" ? qtyText(v) : (v == null ? "" : String(v)) }); }));
      if (type === "CHI_TIET_TT") trw.addEventListener("click", function () { payDetailModal(r, src); });
      return trw; };
    // v2.1.1: dòng (nhóm / dòng / cộng nhóm) đi qua bảng ảo hóa — bảng nhiều dòng chỉ dựng phần đang nhìn thấy; ≤ 150 dòng và khi In vẫn đủ như cũ
    var items = [];
    if (vm.nhom) vm.nhom.forEach(function (g) { items.push({ gh: g }); g.rows.forEach(function (r) { items.push({ r: r }); }); items.push({ gs: g }); }); else vm.rows.forEach(function (r) { items.push({ r: r }); });
    var iN = Math.max(0, vm.cols.map(function (c) { return c.key; }).indexOf("Họ và tên"));
    var mkItem = function (it) {
      if (it.gh) return h("tr", {}, [h("td", { class: "td-grp", colspan: vm.cols.length, text: it.gh.ten + " (" + it.gh.rows.length + " người)" })]);
      if (it.gs) { var g = it.gs; return h("tr", { class: "tr-sum" }, vm.cols.map(function (c, i) { return h("td", { class: c.kind === "text" || c.kind === "qty" ? "t" : "r", text: i === iN ? "Cộng " + g.ten : (g.tong[c.key] != null ? fmt(g.tong[c.key]) : "") }); })); }
      return drawRow(it.r);
    };
    var totalTr = vm.rows.length ? h("tr", { class: "tr-sum" }, vm.cols.map(function (c, i) { return h("td", { class: i === 0 ? "t" : "r", text: i === 0 ? "TỔNG CỘNG" : (vm.tong[c.key] != null ? fmt(vm.tong[c.key]) : "") }); })) : null;
    t.appendChild(tb);
    if (!vm.rows.length) card.appendChild(h("div", { class: "empty", text: "Không có dòng nào cần thanh toán theo bộ lọc hiện tại." }));
    var twr = h("div", { class: "tw" }, [t]), VTb = window.HAKUI && window.HAKUI.virtualTable;
    if (VTb) VTb.attach({ scroller: twr, tbody: tb, rows: items, renderRow: mkItem, cols: vm.cols.length, tail: totalTr ? [totalTr] : [] });
    else { items.forEach(function (it) { tb.appendChild(mkItem(it)); }); if (totalTr) tb.appendChild(totalTr); }
    card.appendChild(twr); w.appendChild(card);
    if (["CHUYEN_KHOAN", "TIEN_MAT", "THANH_TOAN", "CHI_TIET_TT"].indexOf(type) >= 0) {
      tools.appendChild(btn("Mở sổ chứng từ", "ghost", function () { st.tab = "rp_soct"; saveUi(); render(); }));
    }
    return w;
  }
