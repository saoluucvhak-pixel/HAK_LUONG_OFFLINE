  function tabNhanSu() {
    var wrap = h("div"), card = h("div", { class: "card" }), bar = h("div", { class: "bar" }), sf = null, lastN = { kept: 0, total: 0 };
    bar.appendChild(btn("＋ Thêm nhân viên", "pri", wizardNV)); bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("📄 Tải file mẫu", "", function () { saveXlsx("Mau_HoSoNhanSu.xlsx", Object.keys(HR).map(templateSheet), "template"); toast("File mẫu có 1 sheet cho mỗi loại hồ sơ"); }, "Mỗi loại hồ sơ là 1 sheet"));
    bar.appendChild(btn("⬆ Nhập Excel", "", importAllFile, "Nhập file Excel nhiều sheet (Nhân viên, Thông tin cá nhân, Hợp đồng…)"));
    bar.appendChild(btn("⬇ Sổ lao động", "", function () { var rows = HRM.reports(db, { hidePay: !canSeePay() }).soLaoDong(st.nam); saveXlsx("SoQuanLyLaoDong.xlsx", [{ name: "Sổ quản lý lao động", cols: rows[0] ? Object.keys(rows[0]) : [], rows: rows }], "pro"); }));
    bar.appendChild(btn("⬇ Excel danh sách đang lọc", "", function () { var rows = nsRows().map(nsExportRow); saveXlsx("DanhSachNhanSu_loc.xlsx", [{ name: "Nhân sự", cols: rows[0] ? Object.keys(rows[0]) : [], rows: rows }], "pro"); }, "Xuất đúng các dòng đang hiển thị"));
    bar.appendChild(btn("⬇ PDF", "", function () { exportSheetsPdf({ title: "DANH SÁCH NHÂN SỰ (đã lọc)", ky: SFC.scopeText(sf.cfg, sf.cfg.state.get(), "tất cả"), sheets: [{ name: "Nhân sự", rows: nsRows().map(nsExportRow) }] }, "DanhSachNhanSu_loc.pdf"); }, "Xuất đúng các dòng đang hiển thị"));
    bar.appendChild(btn("🖨 In", "", function () { if (!need("export", "in")) return; window.print(); }));
    card.appendChild(bar);
    var nsf = function () { return (st.nsf = st.nsf || { pb: [], cv: [], hd: [], hh: "" }); };
    var today = function () { return HRM.today(); };
    var isoLocal = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }; // ngày theo giờ máy (không dùng UTC)
    var rowsAll = function () { var ix = HRM.buildIndex(db); return db.nhanvien.map(function (r) { return { r: r, hh: HRM.hienHanh(db, r["Mã NV"], null, ix) }; }); };
    /** MỘT hàm chọn dòng cho bảng, Excel, PDF và in. */
    function nsRows() {
      var qq = qOf("nhansu"), f = nsf(), t0 = today(), in30 = function (n) { return isoLocal(new Date(Date.now() + n * 864e5)); };
      var all = rowsAll(); lastN = { total: all.length, kept: 0 };
      var out = all.filter(function (x) {
        if (st.ft && x.r["Trạng thái"] !== st.ft) return false;
        if (f.pb.length && !SFC.inSet(f.pb, x.hh.tenPB)) return false;
        if (f.cv.length && !SFC.inSet(f.cv, x.hh.tenCV)) return false;
        var hd = x.hh.hd || {}, het = SFC.isoDay(hd["Ngày hết hạn"]), ct = !!hd["Ngày chấm dứt"];
        if (f.hd.length && !SFC.inSet(f.hd, hd["Hình thức HĐLĐ"])) return false;
        if (f.hh === "quahan" && !(het && !ct && het < t0)) return false;
        if (/^(30|60|90)$/.test(f.hh) && !(het && !ct && het >= t0 && het <= in30(+f.hh))) return false;
        if (f.hh === "khong" && het) return false;
        return !qq || SFC.hay([x.r["Mã NV"], x.r["Họ và tên"], x.hh.tenPB, x.hh.tenCV]).indexOf(qq) >= 0;
      });
      lastN.kept = out.length; return out;
    }
    function nsExportRow(x) { var hd = x.hh.hd || {}, o = { "Mã NV": x.r["Mã NV"], "Họ và tên": x.r["Họ và tên"], "Phòng ban": x.hh.tenPB || "", "Chức vụ": x.hh.tenCV || "", "Loại HĐ": hd["Hình thức HĐLĐ"] || "", "Hết hạn HĐ": hd["Ngày hết hạn"] || "" }; if (canSeePay()) o["Lương thỏa thuận"] = x.hh.ct ? E.money(x.hh.ct["Lương thỏa thuận"]) : ""; o["Trạng thái"] = x.r["Trạng thái"] || ""; return o; }
    var distinct = function (fn) { return function () { var d = {}; rowsAll().forEach(function (x) { var v = String(fn(x) || "").trim(); if (v) d[v] = 1; }); return Object.keys(d).sort(); }; };
    var cfg = {
      screenId: "nhansu", searchPlaceholder: "🔍 Tìm mã, tên, phòng ban…",
      fields: [
        { key: "tt", label: "Trạng thái", type: "enum", options: ["Đang làm việc", "Tạm hoãn HĐLĐ", "Đã nghỉ việc"] },
        { key: "pb", label: "Phòng ban", type: "multi", withNone: true, options: distinct(function (x) { return x.hh.tenPB; }) },
        { key: "cv", label: "Chức vụ", type: "multi", withNone: true, options: distinct(function (x) { return x.hh.tenCV; }) },
        { key: "hd", label: "Loại hợp đồng", type: "multi", withNone: true, options: distinct(function (x) { return (x.hh.hd || {})["Hình thức HĐLĐ"]; }) },
        { key: "hh", label: "Hạn hợp đồng", type: "enum", options: [{ value: "quahan", label: "Đã quá hạn (chưa chấm dứt)" }, { value: "30", label: "Hết hạn trong 30 ngày" }, { value: "60", label: "Hết hạn trong 60 ngày" }, { value: "90", label: "Hết hạn trong 90 ngày" }, { value: "khong", label: "Không có ngày hết hạn" }] }
      ],
      quickFields: ["q", "tt", "pb"], advancedFields: ["q", "tt", "pb", "cv", "hd", "hh"], scopeFallback: function () { return "tất cả nhân viên"; },
      state: {
        get: function () { var f = nsf(), s = SFC.empty(); s.q = st.qs.nhansu || ""; if (st.ft) s.one.tt = st.ft; if (f.pb.length) s.sel.pb = f.pb.slice(); if (f.cv.length) s.sel.cv = f.cv.slice(); if (f.hd.length) s.sel.hd = f.hd.slice(); if (f.hh) s.one.hh = f.hh; return s; },
        set: function (s) { st.ft = s.one.tt || ""; st.nsf = { pb: (s.sel.pb || []).slice(), cv: (s.sel.cv || []).slice(), hd: (s.sel.hd || []).slice(), hh: s.one.hh || "" }; st.qs.nhansu = s.q; saveUi(); }
      },
      dataSource: function () { return { kept: lastN.kept, total: lastN.total, unsupported: [] }; },
      onApply: function () { st.pg.nhansu = 0; draw(); }
    };
    sf = sfUi.mount(cfg); sf.cfg = cfg; card.appendChild(sf.el);
    card.appendChild(h("div", { class: "hint", text: "Bấm vào một nhân viên để mở hồ sơ đầy đủ (cá nhân, hợp đồng, phụ lục lương, người phụ thuộc, nghỉ phép…). Lương được tính theo phụ lục hợp đồng đang hiệu lực." }));
    var tw = h("div", { class: "tw" }); card.appendChild(tw); wrap.appendChild(card);
    function draw() {
      tw.innerHTML = "";
      var rows = nsRows(); sf.refresh();
      if (!rows.length) { tw.appendChild(h("div", { class: "empty", html: db.nhanvien.length ? "Không tìm thấy." : "Chưa có nhân viên nào.<br>Bấm <b>＋ Thêm nhân viên</b> hoặc nhập từ file Excel." })); return; }
      var pgN = pager("nhansu", rows.length, draw); if (pgN.el) tw.appendChild(pgN.el);
      var seePay = canSeePay(), cols = ["Mã NV", "Họ và tên", "Phòng ban", "Chức vụ", "Loại HĐ", "Hết hạn HĐ"].concat(seePay ? ["Lương thỏa thuận"] : [], ["Trạng thái"]);
      var t = h("table"), tr = h("tr"); cols.forEach(function (c) { tr.appendChild(h("th", { class: c === "Lương thỏa thuận" ? "r" : "", text: c })); });
      t.appendChild(h("thead", {}, [tr])); var tb = h("tbody");
      rows.slice(pgN.start, pgN.end).forEach(function (x) {
        var r = x.r, hd = x.hh.hd || {}, het = hd["Ngày hết hạn"] || "", soon = het && !hd["Ngày chấm dứt"] && het <= isoLocal(new Date(Date.now() + 30 * 864e5));
        var e = h("tr", { class: "click", on: { click: function () { st.tab = "nv"; st.nv = r["Mã NV"]; st.nvTab = "canhan"; st.hd = null; render(); } } });
        [r["Mã NV"], r["Họ và tên"], x.hh.tenPB, x.hh.tenCV, hd["Hình thức HĐLĐ"] || "", het].forEach(function (v, i) { e.appendChild(h("td", { class: "t", text: v || "", style: i === 5 && soon ? "color:#c0362c;font-weight:600" : "" })); });
        if (seePay) e.appendChild(h("td", { class: "r", text: x.hh.ct ? fmt(E.money(x.hh.ct["Lương thỏa thuận"])) : "" }));
        e.appendChild(h("td", { class: "t" }, [h("span", { class: "tag " + (r["Trạng thái"] === "Đã nghỉ việc" ? "off" : "on"), text: r["Trạng thái"] || "" })]));
        tb.appendChild(e);
      });
      t.appendChild(tb); tw.appendChild(t);
    }
    draw(); return wrap;
  }
