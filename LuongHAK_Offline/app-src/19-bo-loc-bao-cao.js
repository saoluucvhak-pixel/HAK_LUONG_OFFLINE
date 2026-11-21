  // ---------- Bộ lọc báo cáo dùng chung + xuất PDF (Master V5) ----------
  /** Thanh lọc dùng chung: cùng một st.rf cho Tính lương, Bảng tính lương nội bộ, Excel và PDF. */
  // ---- Bộ lọc dùng chung (V8): chọn NHIỀU giá trị, tìm không dấu, chọn tất cả/bỏ chọn, lưu bộ lọc, đặt lại ----
  var RFCTX_KEY = "", RFCTX_LAST = {};
  function rfContext() {
    var key = st.nam + "-" + st.thang + "|" + (db.chamcong || []).length + "|" + (db.dm_phongban || []).length;
    if (key === RFCTX_KEY) return RFCTX_LAST;
    var kmap = {}; (db.dm_phongban || []).forEach(function (p) { if (p && p["Tên phòng ban"]) kmap[p["Tên phòng ban"]] = p["Tên khối"] || ""; });
    var forms = {}, ky = st.nam + "-" + ("0" + st.thang).slice(-2);
    (db.chamcong || []).forEach(function (r) { if (r && r["Kỳ"] === ky && r["Mã NV"]) { var f = (forms[r["Mã NV"]] = forms[r["Mã NV"]] || []); var c = r["Hình thức công"] || "BT"; if (f.indexOf(c) < 0) f.push(c); } });
    RFCTX_KEY = key; RFCTX_LAST = { khoiOf: function (pb) { return kmap[pb] || ""; }, formsOf: function (ma) { return forms[ma] || []; } };
    return RFCTX_LAST;
  }
  /** st.rf ⇄ trạng thái Smart Filter. Đọc ĐỦ mọi tiêu chí của st.rf (kể cả tiêu chí màn hình này không lọc được) để không có điều kiện ẩn. */
  var RF_LABEL = { khoi: "Khối", phongBan: "Phòng ban", to: "Tổ", maLuong: "Mã lương", httt: "Thanh toán", hinhThucCong: "Hình thức công", maNV: "Nhân viên", tn: "Chỉ người có thu nhập" };
  var RF_SEL = ["khoi", "phongBan", "to", "maLuong", "httt", "hinhThucCong", "maNV"];
  function rfStateGet() {
    var r = RF.normalize(st.rf), s = SFC.empty(); s.q = r.tuKhoa;
    RF_SEL.forEach(function (k) { if (r[k].length) s.sel[k] = r[k].slice(); });
    if (r.chiCoThuNhap) s.flag.tn = true; return s;
  }
  function rfStateSet(s) {
    var o = { tuKhoa: s.q, chiCoThuNhap: !!s.flag.tn }; RF_SEL.forEach(function (k) { o[k] = (s.sel[k] || []).slice(); });
    st.rf = Object.assign({}, RF.normalize(st.rf), o);
  }
  var RFSUM = ["Tổng thu nhập", "Thực lĩnh"];
  /** Thanh lọc dùng chung của Tính lương / Bảng lương / Báo cáo: cùng một st.rf cho màn hình, Excel và PDF. Lọc chỉ chọn dòng — không tính lại lương. */
  function reportFilterBar(allRows, opt) {
    opt = opt || {}; RF.setContext(rfContext());
    var op = RF.options(allRows), fields = [], quick = ["q"], adv = ["q"];
    var add = function (f, isQuick) { fields.push(f); adv.push(f.key); if (isQuick) quick.push(f.key); };
    var list = function (arr) { return function () { return arr; }; };
    if (op.khoi.length) add({ key: "khoi", label: "Khối", type: "multi", options: list(op.khoi) }, true);
    add({ key: "phongBan", label: "Phòng ban", type: "multi", options: list(op.phongBan) }, true);
    if (op.to.length) add({ key: "to", label: "Tổ", type: "multi", options: list(op.to) }, false);
    if (!opt.compact) {
      add({ key: "maLuong", label: "Mã lương", type: "multi", options: list(op.maLuong) }, false); add({ key: "httt", label: "Thanh toán", type: "multi", options: list(op.httt) }, false);
      if (op.hinhThucCong.length) add({ key: "hinhThucCong", label: "Hình thức công", type: "multi", options: list(op.hinhThucCong) }, false);
      add({ key: "tn", label: "Chỉ người có thu nhập", type: "bool" }, false);
    }
    if ((!opt.compact || opt.showEmployees) && op.nhanVien.length <= 3000) {
      add({ key: "maNV", label: "Nhân viên", type: "multi", options: list(op.nhanVien) }, false);
    }
    var cfg = {
      screenId: "rf:" + (opt.screenId || st.tab || ""), attrs: { "data-rf": "1" }, qAttrs: { "data-rf-key": "tuKhoa" }, fields: fields, quickFields: quick, advancedFields: adv, qCommit: true, legacyPresets: true, searchPlaceholder: opt.searchPlaceholder || "🔍 Tìm mã / tên…",
      labelOf: function (k) { return RF_LABEL[k] || k; }, scopeFallback: function () { return "tất cả"; },
      state: { get: rfStateGet, set: rfStateSet },
      dataSource: function () {
        var g = RF.apply(allRows, st.rf), info = { kept: g.kept, total: g.total, unsupported: [], rows: g.rows };
        return info;
      },
      summary: function (info) {
        var rows = info.rows || [], out = [];
        (opt.summaryCols || RFSUM).forEach(function (c) { if (rows.length && rows[0] && rows[0][c] != null && typeof rows[0][c] === "number") out.push({ label: c, value: fmt(rows.reduce(function (a, x) { return a + (+x[c] || 0); }, 0)) }); });
        return out;
      },
      fromLegacy: function (spec) { var r = RF.normalize(spec), s = SFC.empty(); s.q = r.tuKhoa; RF_SEL.forEach(function (k) { if (r[k].length) s.sel[k] = r[k].slice(); }); if (r.chiCoThuNhap) s.flag.tn = true; return s; },
      onApply: function () { render(); }
    };
    var m = sfUi.mount(cfg); m.cfg = cfg; return m.el;
  }
  function pdfMetaDefaults() {
    return {
      congTy: congTy()["Tên công ty"] || "",
      ngayLap: new Date().toLocaleDateString("vi-VN"),
      nguoiLap: (typeof session !== "undefined" && session && session.hoTen) || (typeof currentUser === "function" ? currentUser() : ""),
      donVi: "Đồng (VND)"
    };
  }
  /** Xuất PDF: bản cài (.exe) → file PDF thật trong thư mục xuất; chạy bằng trình duyệt → hộp thoại In (chọn "Lưu thành PDF"). */
  function exportPdf(vm, fileName, opt) {
    if (!need("export", "xuất PDF")) return;
    if (formulaErrorsBlock((fileName || "") + " " + (vm && vm.title || ""), opt && opt.period)) return;
    vm = Object.assign(pdfMetaDefaults(), vm);
    var html = RH.table(vm, opt);
    if (!window.hakReport) { pdfFallbackPrint(html); toast("Bản chạy bằng trình duyệt: chọn “Lưu thành PDF” trong hộp thoại In"); return; }
    toast("Đang tạo PDF…");
    window.hakReport.pdf({ html: html, name: fileName, landscape: true, footer: (vm.congTy ? vm.congTy + " · " : "") + vm.title + " · " + vm.ky }).then(function (r) {
      if (r && r.ok) { audit("Xuất PDF", vm.title + " · " + vm.ky + " · " + r.name); toast("Đã lưu PDF: " + r.name + " (" + r.pages + " trang)"); }
      else alert("Không xuất được PDF: " + (r && r.error || "lỗi không rõ"));
    }, function (e) { alert("Không xuất được PDF: " + (e && e.message || e)); });
  }
  /** PDF cho báo cáo dạng nhiều bảng (mảng đối tượng): dùng chung đường xuất với exportPdf. */
  function exportSheetsPdf(vm, fileName, opt) {
    if (!need("export", "xuất PDF")) return;
    if (formulaErrorsBlock((fileName || "") + " " + (vm && vm.title || ""))) return;
    vm = Object.assign(pdfMetaDefaults(), vm);
    if (!vm.sheets.some(function (x) { return x.rows && x.rows.length; })) { toast("Không có dữ liệu để xuất PDF"); return; }
    var html = RH.sheets(vm, opt || {});
    if (!window.hakReport) { pdfFallbackPrint(html); toast("Bản chạy bằng trình duyệt: chọn “Lưu thành PDF” trong hộp thoại In"); return; }
    toast("Đang tạo PDF…");
    window.hakReport.pdf({ html: html, name: fileName, landscape: true, footer: (vm.congTy ? vm.congTy + " · " : "") + vm.title + " · " + (vm.ky || "") }).then(function (r) {
      if (r && r.ok) { audit("Xuất PDF", vm.title + " · " + (vm.ky || "") + " · " + r.name); toast("Đã lưu PDF: " + r.name + " (" + r.pages + " trang)"); }
      else alert("Không xuất được PDF: " + (r && r.error || "lỗi không rõ"));
    }, function (e) { alert("Không xuất được PDF: " + (e && e.message || e)); });
  }
