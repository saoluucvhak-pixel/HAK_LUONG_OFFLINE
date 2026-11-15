  // ---------- V10.1: MẪU BÁO CÁO RIÊNG — nhân sự · sản lượng · bơm dăm · thưởng/trừ · tạm ứng · suất cơm ----------
  var OPS_SCREENS = { rp_ns: "NHAN_SU", rp_sl: "SAN_LUONG", rp_bd: "BOM_DAM", rp_th: "THUONG", rp_tu: "TAM_UNG", rp_com: "SUAT_COM" };
  var OPS_KPI = { SAN_LUONG: ["KL hàng (Tấn)"], BOM_DAM: ["Số xe"], THUONG: ["Thưởng", "Thu nhập khác", "Trừ khác", "Thực nhận"], TAM_UNG: ["Tạm ứng"], SUAT_COM: ["Tổng suất"] };
  function opsVm(type) {
    var opt = { nam: st.nam, thang: st.thang, tenCongTy: congTy()["Tên công ty"] || "", ngay: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "", chot: !!kyChot(kyKey(st.nam, st.thang)),
      hr: HRM, num: E.num, money: E.money, phongBan: st.opsPB || "", tuKhoa: st.opsKw || "", trangThaiNV: st.opsTT || "dang", homNay: HRM.today() };
    if (type === "SAN_LUONG" || type === "BOM_DAM") opt.alloc = pbAlloc(st.nam, st.thang, type === "SAN_LUONG" ? "sanluong" : "bandam");
    if ((type === "THUONG" || type === "TAM_UNG") && can("payroll.view") && db.nhanvien.length) opt.bangluong = kqKy(st.nam, st.thang).kq.bangluong;
    return OPS.build(type, db, opt);
  }
  function opsExportOk(vm) {
    if (!need("export", "xuất báo cáo")) return false;
    if (vm.loi.length) { alert("⛔ Không xuất được — " + vm.loi.length + " lỗi dữ liệu làm báo cáo sai:\n\n" + vm.loi.slice(0, 10).map(function (x) { return "• " + x; }).join("\n") + (vm.loi.length > 10 ? "\n…" : "") + "\n\nSửa dữ liệu nguồn rồi mở lại báo cáo."); return false; }
    if (!vm.rows.length) { toast("Không có dòng nào để xuất"); return false; }
    return true;
  }
  function opsXlsx(vm) {
    if (!opsExportOk(vm)) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
    window.HAKUi.reportXlsx.buildMany(window.ExcelJS, OPS.sheetVms(vm), { nguoiLap: vm.nguoiLap }).xlsx.writeBuffer().then(function (buf) {
      download(vm.file + "_" + vm.kyKey + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      audit("Xuất Excel " + vm.title, (vm.ky || vm.kyText) + " · " + vm.soDong + " dòng · phạm vi: " + vm.phamVi);
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  function opsPdf(vm) {
    if (!opsExportOk(vm)) return;
    exportSheetsPdf({ title: vm.title, ky: vm.kyText, trangThai: vm.trangThai, loc: vm.loc, ghiChu: vm.ghiChu, sheets: OPS.toSheets(vm) }, vm.file + "_" + vm.kyKey + ".pdf", { chuKy: vm.chuKy });
  }
  /** Xuất bảng dạng mảng đối tượng (báo cáo nhân sự có sẵn) theo mẫu chung: tiêu đề công ty / TÊN IN HOA / chữ ký / A4 ngang. */
  function opsRowsVm(title, rows, file) {
    return OPS.fromRows(title, rows, { tenCongTy: congTy()["Tên công ty"] || "", ngay: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "", file: file, kyKey: HRM.today(), kyText: "Tính đến ngày " + new Date().toLocaleDateString("vi-VN") });
  }
  function opsTable(attr, type, cols, groups, rows, tong, tongNhan) {
    var t = h("table", { "data-ops-report": attr }), hr = h("tr");
    cols.forEach(function (c) { hr.appendChild(h("th", { class: c.kind === "text" ? "" : "r", text: c.label })); });
    var head = [];
    if (groups) head.push(h("tr", {}, groups.map(function (g) { return h("th", { colspan: String(g.to - g.from + 1), class: "th-grp", text: g.label }); })));
    head.push(hr); t.appendChild(h("thead", {}, head));
    var tb = h("tbody");
    rows.forEach(function (r) { tb.appendChild(h("tr", {}, cols.map(function (c) { return h("td", { class: c.kind === "text" ? "t" : "r", text: opsFmtCell(c, r[c.key]) }); }))); });
    if (rows.length) tb.appendChild(h("tr", { class: "tr-sum" }, cols.map(function (c, i) { return h("td", { class: i === 0 ? "t" : "r", text: i === 0 ? (tongNhan || "TỔNG CỘNG") : (tong && tong[c.key] != null ? opsFmtCell(c, tong[c.key]) : "") }); })));
    t.appendChild(tb); return t;
  }
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
    (db.dm_phongban || []).forEach(function (p) { if (p && p["Tên phòng ban"]) pbs[p["Tên phòng ban"]] = 1; });
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

  function renderKq(box, card, bar) {
    var rAll = st.kq, rf = RF.apply(rAll.bangluong, st.rf), r = Object.assign({}, rAll, { bangluong: rf.rows }), sum = function (c) { return r.bangluong.reduce(function (a, x) { return a + (+x[c] || 0); }, 0); };
    box.appendChild(h("div", { class: "kpis" }, [
      h("div", { class: "kpi", html: "<small>Số nhân viên</small><b>" + r.bangluong.length + "</b>" }),
      h("div", { class: "kpi", html: "<small>Tổng thu nhập</small><b>" + fmt(sum("Tổng thu nhập")) + "</b>" }),
      h("div", { class: "kpi", html: "<small>Khấu trừ (BH + KPCĐ + thuế)</small><b>" + fmt(sum("BH trừ NLĐ") + sum("KPCĐ trừ NLĐ") + sum("Thuế TNCN") + sum("Truy thu BH")) + "</b>" }),
      h("div", { class: "kpi main", html: "<small>Tổng thực lĩnh</small><b>" + fmt(sum("Thực lĩnh")) + "</b>" })]));
    card.appendChild(reportFilterBar(rAll.bangluong));
    if (!RF.isEmpty(st.rf)) card.appendChild(h("div", { class: "hint", text: "Đang lọc: " + RF.describe(st.rf).join(" · ") + " — " + rf.kept + "/" + rf.total + " dòng (Excel xuất ra cũng theo bộ lọc này)." }));
    if (r.canhbao.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Cần kiểm tra dữ liệu:</b><br>" + r.canhbao.map(esc).join("<br>") }));
    var noC = r.bangluong.filter(function (x) { return !x["Tổng công"]; });
    if (noC.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + noC.length + " nhân viên chưa có công trong kỳ:</b> " + noC.slice(0, 12).map(function (x) { return esc(x["Họ và tên"]); }).join(", ") + (noC.length > 12 ? "…" : "") }));
    var cols = st.compact ? COLS_COMPACT : COLS_FULL;
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn(st.compact ? "Xem đủ cột" : "Xem gọn", "", function () { st.compact = !st.compact; saveUi(); render(); }));
    bar.appendChild(btn("🖨 In phiếu lương", "", function () { st.tab = "slips"; render(); }));
    var mn = h("select", { style: "min-width:150px" }); mn.appendChild(h("option", { text: "⬇ Xuất Excel…" }));
    [["Bảng lương", "bl"], ["BHXH", "bh"], ["Thuế TNCN", "tn"], ["Danh sách chuyển khoản", "ck"]].forEach(function (o) { mn.appendChild(h("option", { value: o[1], text: o[0] })); });
    mn.addEventListener("change", function () {
      var m = excelSheets(r, r.ky || kyStr())[mn.value];
      if (m) saveXlsx(m.name + "_" + (r.ky || kyStr()) + ".xlsx", [m]); mn.selectedIndex = 0;
    });
    bar.appendChild(mn);
    bar.appendChild(btn("⬇ Xuất PDF…", "", function () {
      var pick = excelSheets(r, r.ky || kyStr()), ds = [["Bảng lương", "bl"], ["BHXH", "bh"], ["Thuế TNCN", "tn"], ["Danh sách chuyển khoản", "ck"]];
      var which = st.pdfPick || "bl"; var o = ds.filter(function (x) { return x[1] === which; })[0] || ds[0], m = pick[o[1]];
      exportSheetsPdf({ title: o[0] + " lương", ky: "Kỳ " + (r.ky || kyStr()), trangThai: (kqKy(st.nam, st.thang).chot ? "Đã chốt" : "Chưa chốt — tính tạm"), loc: RF.describe(st.rf), sheets: [{ name: o[0], cols: o[1] === "bl" ? (st.compact ? COLS_COMPACT : COLS_FULL) : m.cols, rows: m ? m.rows : [] }] }, m.name + "_" + (r.ky || kyStr()) + ".pdf");
    }, "PDF của bảng lương đang xem (theo bộ lọc)"));
    var pm = h("select", { "aria-label": "Loại PDF", style: "min-width:140px" });
    [["Bảng lương", "bl"], ["BHXH", "bh"], ["Thuế TNCN", "tn"], ["Danh sách chuyển khoản", "ck"]].forEach(function (o) { pm.appendChild(h("option", { value: o[1], text: o[0] })); });
    pm.value = st.pdfPick || "bl"; pm.addEventListener("change", function () { st.pdfPick = pm.value; }); bar.appendChild(pm);
    card.appendChild(h("div", { class: "hint", text: "Bấm vào một dòng để xem chi tiết cách tính và in phiếu lương của người đó." }));
    var tw = h("div", { class: "tw" }), t = h("table"), tr = h("tr");
    cols.forEach(function (c, i) { tr.appendChild(h("th", { class: (TEXTCOLS[c] ? "" : "r") + (i === 0 ? " stk" : ""), text: c })); });
    t.appendChild(h("thead", {}, [tr])); var tb = h("tbody");
    r.bangluong.forEach(function (row) {
      var x = h("tr", { class: "click", on: { click: function () { slipDialog(row); } } });
      cols.forEach(function (c, i) {
        var v = row[c], cl = (TEXTCOLS[c] ? "t" : "r") + (i === 0 ? " stk" : "");
        if (!TEXTCOLS[c] && !v) { x.appendChild(h("td", { class: cl + " z", text: "–" })); return; }
        x.appendChild(h("td", { class: cl + (c === "Thực lĩnh" ? "" : ""), style: c === "Thực lĩnh" ? "font-weight:700" : "", text: fmt(v) }));
      });
      tb.appendChild(x);
    });
    t.appendChild(tb);
    var tf = h("tr"); cols.forEach(function (c, i) { tf.appendChild(h("td", { text: i === 0 ? "TỔNG" : (TEXTCOLS[c] || c === "Công chuẩn" ? "" : fmt(Math.round(sum(c) * 1000) / 1000)), style: i === 0 ? "text-align:left;left:0" : "" })); });
    t.appendChild(h("tfoot", {}, [tf])); tw.appendChild(t); card.appendChild(tw); box.appendChild(card);
    return box;
  }

  var SLIP_LINES = [["Lương thời gian", "Lương thời gian"], ["Lương phụ", "Lương phụ"], ["Lương sản lượng", "Lương sản lượng"], ["Lương bù SL", "Lương bù sản lượng"], ["Lương bơm dăm", "Lương bơm dăm"], ["Tiền tăng ca", "Tiền tăng ca"], ["Phụ cấp", "Phụ cấp"], ["Phụ cấp công tác", "Phụ cấp công tác"], ["Lương hỗ trợ", "Lương hỗ trợ"], ["Tiền cơm", "Tiền cơm"], ["Thưởng", "Thưởng"], ["Thu nhập khác", "Thu nhập khác"], ["Tổng thu nhập", "TỔNG THU NHẬP", 1], ["BH trừ NLĐ", "− BHXH/BHYT/BHTN"], ["KPCĐ trừ NLĐ", "− KPCĐ"], ["Truy thu BH", "− Truy thu bảo hiểm"], ["Thuế TNCN", "− Thuế TNCN"], ["Trừ khác", "− Trừ khác"], ["Tạm ứng", "− Tạm ứng"], ["Thực lĩnh", "THỰC LĨNH", 1]];
  /** Phiếu lương chia 3 phần: I. THU NHẬP · II. KHẤU TRỪ · III. TẠM ỨNG, rồi dòng THỰC LĨNH. Chỉ đọc số engine đã tính; không tính lại tiền. */
  var SLIP_TN = [["Lương thời gian", "Lương thời gian"], ["Lương phụ", "Lương phụ"], ["Lương sản lượng", "Lương sản lượng"], ["Lương bù SL", "Lương bù sản lượng"], ["Lương bơm dăm", "Lương bơm dăm"], ["Tiền tăng ca", "Tiền tăng ca"], ["Phụ cấp", "Phụ cấp"], ["Phụ cấp công tác", "Phụ cấp công tác"], ["Lương hỗ trợ", "Lương hỗ trợ"], ["Tiền cơm", "Tiền cơm"], ["Thưởng", "Thưởng"], ["Thu nhập khác", "Thu nhập khác"]];
  var SLIP_KT = [["BH trừ NLĐ", "Bảo hiểm (BHXH/BHYT/BHTN) người lao động"], ["KPCĐ trừ NLĐ", "Kinh phí công đoàn (KPCĐ)"], ["Truy thu BH", "Truy thu bảo hiểm"], ["Thuế TNCN", "Thuế thu nhập cá nhân"], ["Trừ khác", "Khấu trừ khác"]];
  function slipLines(b) {
    var out = [], n = function (k) { return +b[k] || 0; }, sum = function (L) { return L.reduce(function (a, l) { return a + n(l[0]); }, 0); };
    out.push({ sec: "I. THU NHẬP" });
    SLIP_TN.forEach(function (l) { if (b[l[0]]) out.push({ label: l[1], value: n(l[0]) }); });
    out.push({ label: "Tổng thu nhập", value: n("Tổng thu nhập"), tot: true });
    out.push({ sec: "II. KHẤU TRỪ" });
    SLIP_KT.forEach(function (l) { if (b[l[0]]) out.push({ label: l[1], value: n(l[0]) }); });
    out.push({ label: "Cộng khấu trừ", value: sum(SLIP_KT), tot: true });
    out.push({ sec: "III. TẠM ỨNG" });
    out.push({ label: "Tạm ứng đã nhận trong kỳ", value: n("Tạm ứng") });
    out.push({ label: "Cộng tạm ứng", value: n("Tạm ứng"), tot: true });
    var thieu = n("Còn thiếu (thực lĩnh âm)");
    if (thieu > 0) out.push({ label: "Còn thiếu — chưa tự chuyển sang kỳ sau", value: thieu });
    var lech = n("Thực lĩnh") - (n("Tổng thu nhập") - sum(SLIP_KT) - n("Tạm ứng")) - thieu;
    if (Math.abs(lech) >= 1) out.push({ label: "Làm tròn", value: lech });
    out.push({ label: "THỰC LĨNH (I − II − III)", value: n("Thực lĩnh"), tot: true, grand: true });
    return out;
  }
  function slipEl(b) {
    var s = h("div", { class: "slip" });
    if (congTy()["Tên công ty"]) s.appendChild(h("div", { text: congTy()["Tên công ty"], style: "font-weight:700;text-transform:uppercase;font-size:13px" }));
    s.appendChild(h("h3", { text: "PHIẾU LƯƠNG THÁNG " + st.thang + "/" + st.nam, style: "text-align:center;margin:4px 0 10px" }));
    s.appendChild(h("div", { class: "head", html: "<b>" + esc(b["Họ và tên"]) + "</b> · Mã NV: " + esc(b["Mã NV"]) + (b["Phòng ban"] ? " · " + esc(b["Phòng ban"]) : "") + "<br><span style='color:#6c7a74'>Tổng công: " + b["Tổng công"] + " / Công chuẩn: " + b["Công chuẩn"] + (b["Sản lượng (tấn)"] ? " · Sản lượng: " + b["Sản lượng (tấn)"] + " tấn" : "") + "</span>" }));
    var t = h("table");
    slipLines(b).forEach(function (l) {
      if (l.sec) t.appendChild(h("tr", { class: "sec" }, [h("td", { colspan: 2, text: l.sec })]));
      else t.appendChild(h("tr", { class: l.grand ? "tot grand" : l.tot ? "tot" : "" }, [h("td", { text: l.label }), h("td", { text: fmt(l.value) })]));
    });
    s.appendChild(t); return s;
  }
  /**
   * Master Prompt V3 mục 16.3 ("Xem chi tiết cách tính"): từng chỉ tiêu hiện công thức + giá trị đã
   * thế vào. Đọc từ b["_ct"] (biến trung gian engine.js đã chụp lại khi tính lương) + các cột tiền đã
   * có sẵn trên b — KHÔNG tính lại, chỉ diễn giải.
   */
  var PP_THUE = { VL: "Khấu trừ vãng lai (10% tổng thu nhập, hoặc mức riêng trong danh mục)", LT: "Lũy tiến theo biểu thuế hiệu lực", MIEN: "Miễn / tạm không trừ thuế" };
  function ctRow(tc, congThuc, giaTri, ketQua, bold) {
    return h("tr", { style: bold ? "font-weight:700" : "" }, [
      h("td", { text: tc }), h("td", { style: "color:#6c7a74;font-size:12px", text: congThuc || "" }),
      h("td", { style: "color:#6c7a74", text: giaTri == null ? "" : String(giaTri) }), h("td", { class: "r", text: ketQua == null ? "" : fmt(ketQua) })
    ]);
  }
  function ctSection(ten) { return h("tr", {}, [h("td", { colspan: 4, text: ten, style: "font-weight:700;padding-top:10px;border-bottom:1px solid #d3dcc7" })]); }
  function cachTinhEl(b) {
    var c = b["_ct"] || {}, box = h("div", { class: "slip" }), t = h("table");
    t.appendChild(h("tr", {}, [h("th", { text: "Chỉ tiêu" }), h("th", { text: "Công thức" }), h("th", { text: "Giá trị đã thế" }), h("th", { class: "r", text: "Kết quả" })]));
    t.appendChild(ctSection("1. Lương thời gian"));
    t.appendChild(ctRow("Mã lương", "", c.maLuong + (c.hinhThucLuong ? " (" + c.hinhThucLuong + ")" : "")));
    t.appendChild(ctRow("Công chuẩn", "theo \"Cách tính\" của mã lương trong danh mục", c.congChuan + " công", c.congChuan));
    t.appendChild(ctRow("Công BT", "tổng công hình thức BT trong chấm công kỳ này", c.congBT + " công", c.congBT));
    var ctTG = c.maLuong === "CĐ" ? "= Lương thỏa thuận (cố định)" : (c.maLuong === "CN1" || c.maLuong === "CN2" || c.maLuong === "SP") ? "Lương thỏa thuận × Công tính TG" : "Đơn giá TG × Công tính TG";
    if (c.maLuong !== "CĐ") t.appendChild(ctRow("Đơn giá TG", "Lương thỏa thuận ÷ Công chuẩn", fmt(b["Lương thỏa thuận"]) + " ÷ " + c.congChuan, c.donGiaTG));
    t.appendChild(ctRow("Công tính TG", c.maLuong === "SP" ? "(xem Danh mục lương, cột \"Loại công thức\" — lễ+phép hoặc lễ+tăng ca)" : "công đi làm trong kỳ, đã trừ phần tính riêng (nếu có)", c.congTinhTG + " công", c.congTinhTG));
    t.appendChild(ctRow("Lương thời gian", ctTG, "", b["Lương thời gian"], true));
    if (c.maTangCa) {
      t.appendChild(ctSection("2. Tăng ca"));
      t.appendChild(ctRow("Mã tăng ca", "", c.maTangCa + (c.loaiCongThucTangCa && c.loaiCongThucTangCa !== c.maTangCa ? " (dùng công thức " + c.loaiCongThucTangCa + ")" : "")));
      t.appendChild(ctRow("Hệ số tăng ca", "theo Danh mục tăng ca", Math.round(c.heSoTangCa * 1000) / 10 + "%"));
      if (c.congChuan2) t.appendChild(ctRow("Công chuẩn 2", "chấm công có nhãn \"DQ\" → dùng thay Công chuẩn khi tính vượt chuẩn", c.congChuan2 + " công", c.congChuan2));
      t.appendChild(ctRow("Công tăng ca (thô)", "tổng công hình thức TC trong chấm công", b["Công tăng ca"] + " công", b["Công tăng ca"]));
      t.appendChild(ctRow("Công tăng ca quy đổi", "đã qua công thức " + (c.loaiCongThucTangCa || c.maTangCa) + " + hệ số " + Math.round(c.heSoTangCa * 1000) / 10 + "%", c.congTangCaQuyDoi + " công", c.congTangCaQuyDoi));
      t.appendChild(ctRow("Tiền tăng ca", "Đơn giá (TG hoặc Lương thỏa thuận) × Công tăng ca quy đổi", "", b["Tiền tăng ca"], true));
    }
    if (c.laSanLuong) {
      t.appendChild(ctSection("3. Sản lượng & bù lương"));
      t.appendChild(ctRow("Sản lượng", "tổng khối lượng đã phân bổ cho người này trong kỳ", b["Sản lượng (tấn)"] + " tấn", b["Sản lượng (tấn)"]));
      t.appendChild(ctRow("Đơn giá khoán", "theo Danh mục lương (\"Số tiền khoán\")", fmt(c.donGiaKhoan) + " đ/tấn", c.donGiaKhoan));
      t.appendChild(ctRow("Lương sản lượng", "Sản lượng × Đơn giá khoán", b["Sản lượng (tấn)"] + " × " + fmt(c.donGiaKhoan), b["Lương sản lượng"], true));
      if (c.phuongPhapBu) {
        var ppbTen = c.phuongPhapBu === "daihiep" ? "theo ngày bậc thang (Đại Hiệp)" : c.phuongPhapBu === "to" ? "bình quân tổ (HAK)" : c.phuongPhapBu === "ngay" ? "theo ngày (liên tục)" : "theo tháng";
        t.appendChild(ctRow("Phương pháp bù", "", ppbTen));
        t.appendChild(ctRow("Mức bù (DM_LUONG)", "\"Đơn giá bù lương\" trong Danh mục lương", fmt(c.mucBuDmLuong) + " đ", c.mucBuDmLuong));
        if (c.binhQuanTo != null) t.appendChild(ctRow("Bình quân tổ", "tổng tiền sản lượng cả tổ ÷ số ngày lịch tháng ÷ số người SP có công BT > 0", fmt(c.binhQuanTo) + " đ/người/ngày", c.binhQuanTo));
        if (c.phuongPhapBu === "daihiep") t.appendChild(ctRow("SL tham chiếu", "theo bậc thang công BT TỪNG NGÀY — xem sheet \"Bu luong theo ngay - DH\" trong file Excel Phân bổ khối lượng để xem chi tiết từng ngày", "", null));
        t.appendChild(ctRow("Tiền bù", "", "", b["Lương bù SL"], true));
      }
    }
    if (c.maPhuCap) {
      t.appendChild(ctSection("4. Phụ cấp"));
      t.appendChild(ctRow("Mã phụ cấp", "theo Danh mục phụ cấp, cột \"Loại công thức\"", c.maPhuCap + " (" + c.loaiCongThucPhuCap + ")"));
      t.appendChild(ctRow("Phụ cấp", "", "", b["Phụ cấp"], true));
    }
    t.appendChild(ctSection("5. Thuế & bảo hiểm"));
    if (c.maThueTNCN) {
      t.appendChild(ctRow("Mã thuế TNCN", "", c.maThueTNCN + " — " + (PP_THUE[c.phuongPhapThue] || c.phuongPhapThue)));
      t.appendChild(ctRow("Thu nhập chịu thuế", "Tổng thu nhập − BH NLĐ − KPCĐ NLĐ − Tiền cơm (vãng lai: = tổng thu nhập)", "", c.thuNhapChiuThue));
      t.appendChild(ctRow("Thu nhập tính thuế", "Thu nhập chịu thuế − giảm trừ bản thân − giảm trừ người phụ thuộc (không âm)", "", c.thuNhapTinhThue));
      t.appendChild(ctRow("Thuế khấu trừ", "áp biểu thuế / tỷ lệ của mã " + c.maThueTNCN, "", b["Thuế TNCN"], true));
    }
    t.appendChild(ctRow("Thuế TNCN", "", "", b["Thuế TNCN"], true));
    t.appendChild(ctRow("BH trừ NLĐ", "theo Danh mục bảo hiểm, tỷ lệ NLĐ đóng", "", b["BH trừ NLĐ"], true));
    t.appendChild(ctSection("6. Thực lĩnh"));
    t.appendChild(ctRow("Tổng thu nhập", "cộng mọi khoản thu nhập (lương TG + tăng ca + SL + bù + phụ cấp + hỗ trợ + cơm + thưởng + khác)", "", b["Tổng thu nhập"]));
    var giamTru = (b["Truy thu BH"] || 0) + (b["BH trừ NLĐ"] || 0) + (b["KPCĐ trừ NLĐ"] || 0) + (b["Thuế TNCN"] || 0) + (b["Trừ khác"] || 0) + (b["Tạm ứng"] || 0);
    t.appendChild(ctRow("Tổng giảm trừ", "BH + KPCĐ + Truy thu BH + Thuế TNCN + Trừ khác + Tạm ứng", "", giamTru));
    t.appendChild(ctRow("Thực lĩnh", "Tổng thu nhập − Tổng giảm trừ, làm tròn 1.000đ", "", b["Thực lĩnh"], true));
    if (b["Còn thiếu (thực lĩnh âm)"] > 0) t.appendChild(ctRow("Còn thiếu", "Khoản trừ vượt thu nhập; ghi nhận để đối chiếu, chưa tự khấu trừ kỳ sau", "", b["Còn thiếu (thực lĩnh âm)"], true));
    box.appendChild(t);
    box.appendChild(h("div", { class: "hint", style: "margin-top:8px", text: "Số liệu lấy đúng từ bảng lương đã tính của kỳ này — không tính lại. Đối chiếu công thức gốc: menu Hướng dẫn & Quy chế lương." }));
    return box;
  }
  /** V9.4 — XEM CHI TIẾT TÍNH THUẾ: luồng Nhân viên → Mã TNCN → biểu thuế → bậc → giảm trừ → thuế (số lấy từ bảng lương đã tính). */
  function taxDetailEl(b, snapshot) {
    var c = b._ct || {}, box = h("div", { "data-tax-detail": "1" }), t = h("table");
    var row = function (k, v, note) { t.appendChild(h("tr", {}, [h("td", { class: "t", text: k }), h("td", { class: "r", text: v }), h("td", { class: "t hint", text: note || "" })])); };
    var sec = function (x) { t.appendChild(h("tr", {}, [h("td", { colspan: 3, text: x, style: "font-weight:700;padding-top:8px;border-bottom:1px solid #d3dcc7" })])); };
    var nv = snapshot ? {} : (db.nhanvien || []).filter(function (n) { return n["Mã NV"] === b["Mã NV"]; })[0] || {};
    sec("1. Hồ sơ & cấu hình");
    row("Nhân viên", b["Mã NV"] + " — " + b["Họ và tên"], "kỳ " + st.thang + "/" + st.nam);
    row("Mã TNCN", c.maThueTNCN || "(chưa có)", c.maThueTNCN ? (PP_THUE[c.phuongPhapThue] || c.phuongPhapThue || "") : "Chưa gán mã thuế — KHÔNG tự chọn mã khác");
    row("Mã giảm trừ bản thân / phụ thuộc", (c.maGTBT || "—") + " / " + (c.maGTPT || "—"), "tra theo hiệu lực trong kỳ");
    row("Số người phụ thuộc (kỳ này)", String(c.soNPT || 0), nv["Người phụ thuộc"] != null ? "hồ sơ ghi " + nv["Người phụ thuộc"] : "");
    sec("2. Ba chỉ tiêu thuế (tách riêng)");
    row("Thu nhập chịu thuế", fmt(c.thuNhapChiuThue) + " đ", "= Tổng thu nhập " + fmt(b["Tổng thu nhập"]) + " − BH NLĐ " + fmt(b["BH trừ NLĐ"]) + " − KPCĐ NLĐ " + fmt(b["KPCĐ trừ NLĐ"]) + (c.phuongPhapThue === "VL" ? " (vãng lai: không trừ)" : " − Tiền cơm " + fmt(b["Tiền cơm"])));
    row("Giảm trừ bản thân", fmt(c.giamTruBanThan) + " đ", "");
    row("Giảm trừ người phụ thuộc", fmt(c.giamTruPhuThuoc) + " đ", c.soNPT + " người");
    row("Thu nhập tính thuế", fmt(c.thuNhapTinhThue) + " đ", "= max(0, chịu thuế − giảm trừ)");
    row("Thuế khấu trừ", fmt(b["Thuế TNCN"]) + " đ", c.phuongPhapThue === "VL" ? "tỷ lệ " + Math.round((c.tyLeVangLai || 0) * 1000) / 10 + "% × tổng thu nhập" : "");
    if (c.phuongPhapThue && c.phuongPhapThue !== "VL" && c.phuongPhapThue !== "MIEN" && c.maThueTNCN) {
      sec("3. Biểu thuế & bậc áp dụng");
      var config = snapshot ? snapshot.input && snapshot.input.danhmuc : db;
      var tt = config ? E.thuThuTNCN(config, c.maThueTNCN, st.nam, st.thang, c.thuNhapTinhThue) : null;
      if (!tt) row("Biểu thuế", "—", "Bản chốt cũ chưa lưu danh mục thuế.");
      else if (!tt.ok) row("TAX_CONFIG_ERROR", "—", tt.loi);
      else {
        row("Phương pháp", tt.phuongPhap, "biểu hiệu lực trong kỳ");
        (tt.bieu || []).forEach(function (bk) {
          var tu = E.money(bk["Thu nhập từ"]), den = E.money(bk["Thu nhập đến"]), tl = E.pct(bk["Tỷ lệ"]);
          var trong = c.thuNhapTinhThue > tu && (!den || c.thuNhapTinhThue <= den);
          row("Bậc " + bk["Bậc"] + (trong ? "  ◄ áp dụng" : ""), Math.round(tl * 1000) / 10 + "%", fmt(tu) + " → " + (den ? fmt(den) : "không giới hạn") + (E.money(bk["Trừ nhanh"]) ? " · trừ nhanh " + fmt(E.money(bk["Trừ nhanh"])) : ""));
        });
        row("Thuế tính lại từ biểu", fmt(tt.thue) + " đ", tt.thue === b["Thuế TNCN"] ? "khớp bảng lương" : "LỆCH bảng lương " + fmt(b["Thuế TNCN"]) + " — biểu đã đổi sau khi tính, cần tính lại");
      }
    }
    (c.loiThueNV || []).forEach(function (m) { row("Lỗi cấu hình", "—", m); });
    box.appendChild(t);
    box.appendChild(h("div", { class: "hint", style: "margin-top:8px", text: "KPCĐ NLĐ được trừ khi xác định thu nhập chịu thuế; KPCĐ công ty đóng không ảnh hưởng thuế NLĐ. Kỳ đã chốt hiển thị số đã chốt, không đổi theo cấu hình hiện hành." }));
    return box;
  }
  function employeePayrollReview(b, ky) {
    var snapshot = kyChot(ky);
    var source = snapshot ? snapshot.input && snapshot.input.data : db;
    var box = h("div", { "data-payroll-source-review": snapshot ? "closed" : "open" });
    box.appendChild(h("p", { class: "hint", text: snapshot ? "Nguồn: Bản chốt v" + (snapshot.version || 1) : "Đối chiếu bảng lương đang xem với chứng từ hiện tại. Nếu đã sửa dữ liệu, hãy tính lương lại." }));
    var totals = ["Tổng công", "Sản lượng (tấn)", "Số xe bơm dăm", "Lương bù SL", "Bù SL kỳ trước", "BH trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Thực lĩnh"];
    box.appendChild(simpleTable(totals.map(function (c) { return { "Chỉ tiêu": c, "Bảng lương": b[c] }; })));
    var parts = ky.split("-").map(Number), reports = snapshot && snapshot.input && snapshot.input.payrollReports;
    var allocated = snapshot ? reports && reports.production : payrollReportDetails(parts[0], parts[1], [b]).production;
    box.appendChild(h("h3", { text: "Nguồn phân bổ sản lượng và bơm dăm" }));
    if (!allocated) box.appendChild(h("p", { class: "hint", text: "Bản chốt này chưa lưu chi tiết phân bổ." }));
    else box.appendChild(simpleTable(allocated.flatMap(function (group) {
      return group.employees.filter(function (r) { return r["Mã NV"] === b["Mã NV"]; }).map(function (r) {
        return { "Nguồn": S[group.type].ten, "Mã phòng ban": r["Mã phòng ban"], "Sản lượng (tấn)": r["Sản lượng (tấn)"], "Số xe": r["Số xe"] };
      });
    })));
    var attendance = source && source.chamcong;
    if (Array.isArray(attendance)) {
      var byKind = new Map();
      var days = DAYS.slice(0, new Date(parts[0], parts[1], 0).getDate());
      attendance.filter(function (r) { return VAL.rowPeriod("chamcong", r) === ky && r["Mã NV"] === b["Mã NV"]; }).forEach(function (r) {
        var kind = String(r["Hình thức công"] || "BT").trim().toUpperCase();
        var total = days.reduce(function (sum, day) { return sum + E.tachCong(r[day]).soCong; }, 0);
        byKind.set(kind, (byKind.get(kind) || 0) + total);
      });
      box.appendChild(h("h3", { text: "Công theo hình thức" }));
      box.appendChild(simpleTable(Array.from(byKind, function (entry) { return { "Hình thức công": entry[0], "Công từ bảng chấm công": entry[1] }; })));
    }
    ["psluong", "ungluong"].forEach(function (key) {
      box.appendChild(h("h3", { text: S[key].ten }));
      if (!source || !Array.isArray(source[key])) {
        box.appendChild(h("p", { class: "hint", text: "Bản chốt này chưa lưu chi tiết chứng từ." }));
        return;
      }
      var rows = source[key].filter(function (r) { return VAL.rowPeriod(key, r) === ky && r["Mã NV"] === b["Mã NV"]; });
      var diffs = INPUT_SUM[key].map(function (c) {
        var sum = rows.reduce(function (total, r) { return total + E.money(r[c]); }, 0);
        var payroll = E.money(b[c]);
        return { "Khoản": c, "Bảng lương": payroll, "Chứng từ": sum, "Chênh lệch (chứng từ − lương)": sum - payroll };
      });
      box.appendChild(simpleTable(diffs));
      box.appendChild(moneySourceTable(key, rows, !snapshot && can("input.edit"), function () {
        render();
        employeePayrollReview(b, ky);
      }));
    });
    modal("Đối soát nguồn — " + b["Họ và tên"] + " — " + kyLabel(ky), box, function (close) {
      return [btn("Về chi tiết lương", "", function () { close(); slipDialog(b); }), btn("Đóng", "", close)];
    }, { wide: true });
  }

  function slipDialog(b) {
    var xemCT = false;
    var render2 = function () {
      return modal((xemCT ? "Chi tiết cách tính — " : "Chi tiết lương — ") + b["Họ và tên"], xemCT ? cachTinhEl(b) : slipEl(b), function (close) {
        return [btn("Đóng", "", close), btn("Đối soát nguồn", "", function () { employeePayrollReview(b, st.kq.ky || kyStr()); }), btn(xemCT ? "🧾 Xem phiếu lương" : "📐 Xem cách tính", "", function () { xemCT = !xemCT; render2(); }),
          btn("XEM CHI TIẾT TÍNH THUẾ", "", function () { modal("CHI TIẾT TÍNH THUẾ TNCN — " + b["Họ và tên"], taxDetailEl(b, kyChot(st.kq.ky || kyStr())), function (cl) { return [btn("Đóng", "", cl)]; }); }),
          btn("🖨 In phiếu này", "pri", function () { var one = st.kq; st.kq = { bangluong: [b], ky: one.ky, bhxh: [], tncn: [], canhbao: [] }; st.tab = "slips"; st.kqFull = one; close(); render(); })];
      });
    };
    render2();
  }
  /**
   * Phiếu lương (α18): màn hình riêng trong menu. Kỳ đã chốt → lấy đúng bảng lương đã chốt; chưa chốt → tính tạm (báo rõ).
   * Lọc phòng ban / tìm người, in (mỗi phiếu 1 trang hoặc in gọn nhiều phiếu / trang), xuất Excel. Mở từ Tính lương (1 phiếu) vẫn như cũ.
   */
  function tabSlips() {
    var w = h("div"), bar = h("div", { class: "bar" });
    var single = !!st.kqFull, fresh = st.kq && st.kq.ky === kyStr() && !st.kqStale && !kyChot(kyStr());
    var src = single ? { kq: st.kq, chot: !!kyChot(kyStr()) } : fresh ? { kq: st.kq, chot: false } : kqKy(st.nam, st.thang); // vừa tính ở Tính lương → dùng đúng kết quả đó
    var all = (src.kq && src.kq.bangluong) || [];
    if (single) bar.appendChild(btn("← Quay lại bảng lương", "", function () { st.kq = st.kqFull; st.kqFull = null; st.tab = "luong"; render(); }));
    var pbs = []; all.forEach(function (b) { if (b["Phòng ban"] && pbs.indexOf(b["Phòng ban"]) < 0) pbs.push(b["Phòng ban"]); });
    var selPB = h("select", { "aria-label": "Phòng ban" }); selPB.appendChild(h("option", { value: "", text: "Tất cả phòng ban" }));
    pbs.sort().forEach(function (p) { selPB.appendChild(h("option", { value: p, text: p })); });
    selPB.value = st.slipPB || ""; selPB.addEventListener("change", function () { st.slipPB = selPB.value; render(); });
    var q = h("input", { class: "i", type: "search", placeholder: "Tìm mã / tên nhân viên…", value: st.slipQ || "", style: "width:220px" });
    q.addEventListener("change", function () { st.slipQ = q.value; render(); });
    var gon = h("input", { type: "checkbox" }); gon.checked = !!st.slipGon; gon.addEventListener("change", function () { st.slipGon = gon.checked; render(); });
    var qq = fold(st.slipQ || "").trim();
    var list = all.filter(function (b) { return (single || !st.slipPB || b["Phòng ban"] === st.slipPB) && (single || !qq || fold(b["Mã NV"] + " " + b["Họ và tên"]).indexOf(qq) >= 0); });
    if (!single) { bar.appendChild(selPB); bar.appendChild(q); }
    bar.appendChild(h("label", { class: "chk", title: "Bỏ ngắt trang sau mỗi phiếu — in nhiều phiếu trên 1 tờ A4 rồi cắt" }, [gon, " In gọn (nhiều phiếu / trang)"]));
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("⬇ Xuất Excel", "", function () {
      if (!list.length) { toast("Không có phiếu nào"); return; }
      var cols = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Công chuẩn"].concat(SLIP_LINES.map(function (l) { return l[0]; }));
      var fileP = "PhieuLuong_" + kyStr() + (st.slipPB && !single ? "_" + slug(st.slipPB) : "") + ".xlsx";
      if (window.ExcelJS && window.HAKUi && window.HAKUi.slipXlsx) {
        if (!need("export", "xuất phiếu lương")) return;
        var vmP = { congTy: congTy()["Tên công ty"] || "", kyText: "tháng " + st.thang + "/" + st.nam, trangThai: src.chot ? "Bảng lương đã chốt" : "Chưa chốt — tính tạm",
          rawCols: cols, rawRows: list, slips: list.map(function (b) { return { maNV: b["Mã NV"], hoTen: b["Họ và tên"], phongBan: b["Phòng ban"], tongCong: b["Tổng công"], congChuan: b["Công chuẩn"], sanLuong: b["Sản lượng (tấn)"],
            lines: slipLines(b) }; }) };
        window.HAKUi.slipXlsx.build(window.ExcelJS, vmP, { perPage: st.slipGon ? 2 : 1, rawName: "PhieuLuong_" + kyStr(), nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
          download(fileP, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
        }, function (e) { alert("Không tạo được file: " + e.message); });
      } else saveXlsx(fileP, [{ name: "PhieuLuong_" + kyStr(), cols: cols, rows: list.map(function (b) { var o = {}; cols.forEach(function (c) { o[c] = b[c] == null ? "" : b[c]; }); return o; }) }]);
      audit("Xuất phiếu lương Excel", kyLabel(kyStr()) + " · " + list.length + " phiếu");
    }));
    bar.appendChild(btn("⬇ PDF", "", function () {
      if (!list.length) { toast("Không có phiếu nào"); return; }
      var colsP = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Công chuẩn"].concat(SLIP_LINES.map(function (l) { return l[0]; }));
      exportSheetsPdf({ title: "Phiếu lương", ky: "Kỳ " + st.thang + "/" + st.nam, trangThai: src.chot ? "Đã chốt" : "Chưa chốt — tính tạm", loc: st.slipPB ? ["Phòng ban: " + st.slipPB] : [], sheets: [{ name: "PhieuLuong", rows: list.map(function (b) { var o = {}; colsP.forEach(function (c) { o[c] = b[c] == null ? "" : b[c]; }); return o; }) }] }, "PhieuLuong_" + kyStr() + (st.slipPB && !single ? "_" + slug(st.slipPB) : "") + ".pdf");
    }, "PDF danh sách phiếu theo đúng bộ lọc đang chọn"));
    bar.appendChild(btn("🖨 In " + list.length + " phiếu", "pri", function () { if (!list.length) { toast("Không có phiếu nào"); return; } audit("In phiếu lương", kyLabel(kyStr()) + " · " + list.length + " phiếu"); window.print(); }));
    w.appendChild(bar);
    if (!single) w.appendChild(h("div", { class: src.chot ? "locked noprint" : "warn noprint", html: src.chot ? "🔒 Phiếu lương <b>tháng " + st.thang + "/" + st.nam + "</b> lấy từ bảng lương <b>đã chốt</b>." : "⚠ Tháng " + st.thang + "/" + st.nam + " <b>chưa chốt</b> — phiếu tính tạm từ dữ liệu hiện tại, có thể thay đổi. Nên chốt kỳ trước khi gửi phiếu cho người lao động." }));
    if (!all.length) { w.appendChild(h("div", { class: "card" }, [h("div", { class: "empty", text: "Chưa có bảng lương tháng " + st.thang + "/" + st.nam + " (chưa có nhân viên / chấm công)." })])); return w; }
    var box = h("div", { class: "slips" + (st.slipGon ? " gon" : ""), "data-slips": String(list.length) });
    if (!list.length) box.appendChild(h("div", { class: "card" }, [h("div", { class: "empty", text: "Không có phiếu nào khớp bộ lọc." })]));
    list.forEach(function (b) { var c = h("div", { class: "card" }); c.appendChild(slipEl(b)); box.appendChild(c); });
    w.appendChild(box);
    return w;
  }

