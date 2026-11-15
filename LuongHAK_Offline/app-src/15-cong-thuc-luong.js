  // ---------- Công thức tiền lương — Formula management UI (Master Prompt mục VII) ----------
  var CT_LOAI = [["OVERTIME", "Tăng ca"], ["ALLOWANCE", "Phụ cấp"], ["SUPPORT", "Hỗ trợ"]];
  function ctLoaiTen(v) { var o = CT_LOAI.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : (v || ""); }
  var CT_SUBTABS = [["wz", "Trình thiết lập công thức"], ["tangca", "Tăng ca"], ["phucap", "Phụ cấp"], ["hotro", "Hỗ trợ"], ["vars", "Thư viện biến"], ["mau", "Mẫu công thức"], ["test", "Kiểm tra công thức"], ["lichsu", "Lịch sử phiên bản"]];
  var CT_SUBTAB_LOAI = { tangca: "OVERTIME", phucap: "ALLOWANCE", hotro: "SUPPORT" };
  function congThucPanel() {
    var w = h("div"), bar2 = h("div", { class: "bar sub" });
    st.ct = st.ct || "wz";
    CT_SUBTABS.forEach(function (t) { bar2.appendChild(btn(t[1], st.ct === t[0] ? "pri" : "", function () { st.ct = t[0]; render(); })); });
    w.appendChild(bar2);
    var loai = CT_SUBTAB_LOAI[st.ct];
    if (loai) w.appendChild(ctLibraryPanel(loai));
 else if (st.ct === "wz") w.appendChild(ctWizardPanel());
    else if (st.ct === "vars") w.appendChild(ctVarsPanel());
    else if (st.ct === "mau") w.appendChild(ctTemplatesPanel());
    else if (st.ct === "test") w.appendChild(ctTestPanel());
    else if (st.ct === "lichsu") w.appendChild(ctHistoryPanel());
    return w;
  }
  /** Trình thiết lập công thức (V10): chọn loại → chọn mẫu → nhập số mẫu để xem giải thích bằng số thật → lưu Nháp (qua REPO, vẫn phải duyệt/kích hoạt). */
  var WZ_SAMPLE = { CONG_CHUAN: 26, CONG_TINH_LUONG: 28, CONG_TC: 2, CONG_LE: 0, CONG_PHEP: 0, CONG_TRUNG_CHUYEN: 0, CONG_DI_CHUYEN: 0, CONG_CHU_NHAT: 1, CONG_CHUAN_2: 0, HE_SO_TC: 1.5, MUC_PHU_CAP: 500000, NGUONG_PHU_CAP: 2, CONG_HUONG_PHU_CAP: 24, SO_NGAY_DUOC_HUONG: 10, MUC_HO_TRO: 50000, CONG_THUC_TE: 24, SO_XE_HOP_LE: 8, DON_GIA_HO_TRO: 20000 };
  function ctWizardPanel() {
    var Wz = st.ctWz = st.ctWz || { loai: "OVERTIME", mau: -1, vars: {}, ma: "", ten: "", tu: "" };
    var box = h("div", { class: "card", "data-ct-wizard": "1" });
    box.appendChild(h("div", { class: "hint", text: "Tạo công thức mới: (1) chọn loại, (2) viết biểu thức — muốn có sẵn khung thì chọn “Điền sẵn từ mẫu”, KHÔNG bắt buộc, (3) nhập số ví dụ để thử, (4) đặt mã/tên và lưu Nháp. Công thức lưu ở trạng thái Nháp, vẫn phải Gửi duyệt → Duyệt → Kích hoạt; kỳ lương đã chốt không bị đổi. Sau đó ở Danh mục (Tăng ca / Phụ cấp / Hỗ trợ) chỉ cần chọn mã công thức này." }));
    var step = function (n, t) { box.appendChild(h("div", { class: "fh", text: "Bước " + n + " — " + t })); };
    step(1, "Loại công thức");
    var bar = h("div", { class: "bar" });
    CT_LOAI.forEach(function (lo) { bar.appendChild(btn(ctLoaiTen(lo[0]), Wz.loai === lo[0] ? "pri" : "", function () { Wz.loai = lo[0]; Wz.mau = -1; Wz.vars = {}; Wz.expr = null; render(); })); });
    box.appendChild(bar);
    var mau = CT_TEMPLATES.filter(function (x) { return x.loai === Wz.loai && !x.chuaKetNoi; });
    step(2, "Biểu thức công thức");
    var sel = h("select", { "aria-label": "Điền sẵn từ mẫu", style: "max-width:100%" });
    sel.appendChild(h("option", { value: "-1", text: "— Không dùng mẫu: tự viết biểu thức —" }));
    mau.forEach(function (x, i) { sel.appendChild(h("option", { value: i, text: "Điền sẵn từ mẫu: " + x.ten })); }); sel.value = String(Wz.mau);
    sel.addEventListener("change", function () { Wz.mau = +sel.value; Wz.vars = {}; Wz.expr = null; render(); });
    box.appendChild(h("div", { class: "fld" }, [h("label", { text: "Mẫu có sẵn (không bắt buộc)" }), sel]));
    var T = Wz.mau >= 0 && mau[Wz.mau] ? mau[Wz.mau] : { custom: true, ten: "", moTa: "", bieuThuc: "" };
    if (T.moTa) box.appendChild(h("div", { class: "hint", text: T.moTa }));
    var biThuc = Wz.expr != null ? Wz.expr : T.bieuThuc;
    var taE = h("textarea", { rows: 2, "aria-label": "Biểu thức", style: "width:100%;font-family:monospace", "data-ct-wizard-expr": "1" }); taE.value = biThuc;
    taE.addEventListener("change", function () { Wz.expr = taE.value; Wz.vars = {}; render(); });
    box.appendChild(h("div", { class: "fld" }, [h("label", { text: "Biểu thức" }), taE]));
    if (Wz.expr != null && Wz.expr !== T.bieuThuc && T.bieuThuc) box.appendChild(btn("↺ Khôi phục biểu thức của mẫu", "", function () { Wz.expr = null; Wz.vars = {}; render(); }));
    var vrW = FML.validate(biThuc || "");
    if (!biThuc.trim()) { box.appendChild(h("div", { class: "hint", text: "Nhập biểu thức ở ô trên để thử và lưu (VD: ROUND(MUC_PHU_CAP * CONG_HUONG_PHU_CAP / CONG_CHUAN))." })); return box; }
    if (!vrW.ok) { box.appendChild(h("div", { class: "warn", text: "⚠ Biểu thức không hợp lệ: " + vrW.errors.map(function (e) { return e.message; }).join("; ") })); return box; }
    step(3, "Thử bằng số ví dụ");
    var names = ctRefVars(biThuc), ctx = {}, vt = h("table");
    vt.appendChild(h("tr", {}, [h("th", { text: "Biến" }), h("th", { text: "Ý nghĩa" }), h("th", { text: "Số ví dụ" })]));
    names.forEach(function (n) {
      if (Wz.vars[n] === undefined) Wz.vars[n] = WZ_SAMPLE[n] != null ? WZ_SAMPLE[n] : 0;
      ctx[n] = +Wz.vars[n] || 0;
      var inp = h("input", { class: "num", value: Wz.vars[n] });
      inp.addEventListener("change", function () { Wz.vars[n] = E.num(inp.value); render(); });
      vt.appendChild(h("tr", {}, [h("td", { class: "t", html: "<code>" + esc(n) + "</code>" }), h("td", { class: "t", text: (FML.variables.get(n) || {}).label || "" }), h("td", {}, [inp])]));
    });
    box.appendChild(h("div", { class: "tw" }, [vt]));
    var kq = null, loi = null;
    try { kq = Math.round(FML.evaluate(biThuc, ctx)); } catch (e) { loi = e.message; }
    var cuThe = biThuc; names.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (n) { cuThe = cuThe.split(n).join(String(ctx[n])); });
    var ex = h("div", { class: "slip", "data-ct-wizard-explain": "1" });
    ex.appendChild(h("div", { html: "<b>Giải thích bằng số:</b> thay số ví dụ vào công thức:" }));
    ex.appendChild(h("div", { style: "font-family:monospace;word-break:break-all;margin:4px 0", text: cuThe }));
    ex.appendChild(h("div", { html: loi ? "⚠ Lỗi: " + esc(loi) : "<b>Kết quả: " + esc(fmt(kq)) + "</b> (đơn vị: " + (Wz.loai === "OVERTIME" ? "công/tiền tăng ca theo mẫu" : "VND") + ")" }));
    box.appendChild(ex);
    step(4, "Đặt tên và lưu Nháp");
    var f = h("div", { class: "fgrid", style: "align-items:end" });
    var fld = function (lab, ctl, wide) { return h("div", { class: "fld" + (wide ? " wide" : "") }, [h("label", { text: lab }), ctl]); };
    var iMa = h("input", { placeholder: "VD: TC7", value: Wz.ma, "aria-label": "Mã công thức", autocomplete: "off" });
    var iTen = h("input", { placeholder: "Tên công thức", value: Wz.ten || (T.custom ? "" : T.ten), "aria-label": "Tên công thức", autocomplete: "off" });
    var iTu = dateField(Wz.tu, { "aria-label": "Hiệu lực từ", title: "Hiệu lực từ" });
    iMa.addEventListener("change", function () { Wz.ma = iMa.value.trim(); }); iTen.addEventListener("change", function () { Wz.ten = iTen.value; }); iTu.addEventListener("change", function () { Wz.tu = iTu.value; });
    f.appendChild(fld("Mã công thức *", iMa)); f.appendChild(fld("Tên công thức", iTen)); f.appendChild(fld("Hiệu lực từ", iTu));
    f.appendChild(btn("Lưu thành Nháp", "pri", function () {
      Wz.ma = iMa.value.trim(); Wz.ten = iTen.value; Wz.tu = iTu.value;
      if (!Wz.ma) { alert("Nhập Mã công thức."); return; }
      if (loi) { alert("Công thức đang lỗi, chưa lưu được."); return; }
      var tuIso = Wz.tu ? VAL.normDate(Wz.tu) : ""; if (Wz.tu && !tuIso) { alert("Hiệu lực từ không đúng dạng dd/MM/yyyy."); return; }
      var fenv = { can: can, user: session ? session.tenDangNhap : "", db: db };
      var vals = { "Mã công thức": Wz.ma, "Tên công thức": Wz.ten || (T.custom ? Wz.ma : T.ten), "Loại": Wz.loai, "Biểu thức": biThuc, "Hiệu lực từ": tuIso, "Trạng thái": "Nháp", "Phiên bản": FAP.nextVersion(db, Wz.ma, Wz.loai), "Người lập": fenv.user, "Mô tả": T.moTa };
      if (!commit(REPO.plan("insert", "dm_congthuc", null, vals, { what: "tạo công thức từ trình thiết lập" }), { action: "Công thức tiền lương — Tạo Nháp " + Wz.ma })) return;
      save(); toast("Đã lưu công thức " + Wz.ma + " ở trạng thái Nháp. Bước tiếp: Gửi duyệt → Duyệt → Kích hoạt (tab " + ctLoaiTen(Wz.loai) + "), rồi chọn mã công thức này ở Danh mục → cột “Mã công thức”."); st.ctWz = null; render();
    }));
    box.appendChild(f);
    return box;
  }
  /** Tab "Thư viện biến" (mục VII, tab 4) — danh sách biến được khai báo, chỉ xem. */
  function ctVarsPanel() {
    var box = h("div", { class: "card" });
    box.appendChild(h("div", { class: "hint", text: "Tên biến dùng trong ô 'Biểu thức' ở các tab Tăng ca / Phụ cấp / Hỗ trợ. Biến không có trong danh sách này sẽ báo lỗi khi lưu công thức (không âm thầm coi là 0)." }));
    var t = h("table");
    t.appendChild(h("tr", {}, [h("th", { text: "Biến" }), h("th", { text: "Tên" }), h("th", { text: "Đơn vị" }), h("th", { text: "Nguồn" }), h("th", { text: "Diễn giải" })]));
    FML.variables.VARS.forEach(function (v) {
      t.appendChild(h("tr", {}, [h("td", { class: "t", html: "<code>" + esc(v.name) + "</code>" }), h("td", { class: "t", text: v.label }), h("td", { class: "t", text: v.unit }), h("td", { class: "t", style: "color:#6c7a74", text: v.source }), h("td", { class: "t", text: v.desc })]));
    });
    box.appendChild(h("div", { class: "tw" }, [t])); return box;
  }
  /** Tab "Mẫu công thức" (mục VII, tab 5) — công thức có sẵn để copy, transcribe đúng từ switch/case gốc. */
  var CT_TEMPLATES = window.HAKCore.formulaTemplates.TEMPLATES; // V10.2: dữ liệu mẫu ở core/payroll/formula-templates.js

  function ctTemplatesPanel() {
    var box = h("div", { class: "card" });
    box.appendChild(h("div", { class: "hint", text: "Công thức có sẵn để tham khảo / copy vào ô 'Biểu thức' ở tab tương ứng (Tăng ca / Phụ cấp / Hỗ trợ), hoặc dùng ngay ở tab 'Kiểm tra công thức' để chạy thử." }));
    CT_LOAI.forEach(function (lo) {
      box.appendChild(h("div", { class: "fh", text: ctLoaiTen(lo[0]) }));
      CT_TEMPLATES.filter(function (x) { return x.loai === lo[0]; }).forEach(function (x) {
        var card = h("div", { class: "slip", style: "margin-bottom:8px" });
        card.appendChild(h("div", { html: "<b>" + esc(x.ten) + "</b>" }));
        card.appendChild(h("div", { style: "font-family:monospace;background:var(--brandSoft, #eef3e8);padding:6px;border-radius:6px;margin:4px 0;word-break:break-all", text: x.bieuThuc }));
        card.appendChild(h("div", { class: "hint", style: "margin:0", text: x.moTa }));
        box.appendChild(card);
      });
    });
    return box;
  }
  /** Giá trị mặc định của 1 biến, lấy từ danh mục (mã tăng ca/phụ cấp/hỗ trợ cùng mã công thức) nếu có,
   * không thì lấy từ dữ liệu đã tính của 1 nhân viên/kỳ cụ thể (_ct — không tính lại), còn lại = nhập tay. */
  function ctVarFromCode(name, loai, ma, nam, thang) {
    if (!ma) return null;
    if (loai === "OVERTIME") {
      var rTC = E.hieuLuc(db.dm_tangca, "Mã tăng ca", nam, thang)[ma];
      if (rTC) { if (name === "HE_SO_TC") return E.pct(rTC["Hệ số tăng ca"]); if (name === "TIEN_TC_CO_DINH") return E.money(rTC["Tiền tăng ca (nếu tính cố định)"]); }
    } else if (loai === "ALLOWANCE") {
      var rPC = E.hieuLuc(db.dm_phucap, "Mã phụ cấp", nam, thang)[ma];
      if (rPC) { if (name === "MUC_PHU_CAP") return E.money(rPC["Số tiền"]); if (name === "NGUONG_PHU_CAP") return E.num(rPC["Tham chiếu"]); }
    } else if (loai === "SUPPORT") {
      var rHT = E.hieuLuc(db.dm_hotro, "Mã hỗ trợ", nam, thang)[ma];
      if (rHT) { if (name === "MUC_HO_TRO" || name === "DON_GIA_HO_TRO") return E.money(rHT["Số tiền"]); }
    }
    return null;
  }
  function ctDefaultVar(name, b, loai, ma, nam, thang) {
    var vc = ctVarFromCode(name, loai, ma, nam, thang);
    if (vc != null) return { value: Math.round(vc * 1000) / 1000, source: "Danh mục " + ctLoaiTen(loai) + " (mã " + ma + ")" };
    var vr = ctVarFromRow(name, b, nam, thang);
    if (vr != null) return { value: Math.round(vr * 1000) / 1000, source: b ? ("Nhân viên " + b["Mã NV"] + " · kỳ " + thang + "/" + nam) : "" };
    return { value: 0, source: "chưa có nguồn tự động — nhập tay" };
  }
  /** Tên biến có trong formula-variables.js xuất hiện trong 1 biểu thức (để biết cần hỏi giá trị biến nào). */
  /** Tab "Kiểm tra công thức" (mục VII, tab 6 / mục VII.2-3) — chạy thử KHÔNG ghi vào bảng lương thật. */
  function ctTestPanel() {
    st.ctTest = st.ctTest || { nam: st.nam, thang: st.thang, loai: "OVERTIME", ma: "", maNV: "", maCT: "", expr: "", vars: {} };
    var T = st.ctTest, box = h("div", { class: "card" });
    box.appendChild(h("div", { class: "hint", text: "Thử công thức với dữ liệu của 1 nhân viên đã tính (hoặc giả lập, nếu không chọn nhân viên) — KHÔNG ghi/đổi bảng lương thật. Chọn 'Mã công thức' có sẵn để nạp biểu thức, hoặc tự sửa trực tiếp." }));
    refreshNVList();
    var fg = h("div", { class: "fgrid", style: "grid-template-columns:repeat(auto-fit,minmax(220px,1fr))" });
    var fld = function (label, ctl, cls) { return h("div", { class: "fld" + (cls ? " " + cls : "") }, [h("label", { text: label }), ctl]); };
    var selLoai = h("select"); CT_LOAI.forEach(function (x) { selLoai.appendChild(h("option", { value: x[0], text: x[1] })); }); selLoai.value = T.loai;
    selLoai.addEventListener("change", function () { T.loai = selLoai.value; T.maCT = ""; T.vars = {}; render(); });
    var rows = db.dm_congthuc.filter(function (r) { return (r["Loại"] || "") === T.loai; });
    var selMa = h("select"); selMa.appendChild(h("option", { value: "", text: "— Tự nhập biểu thức —" }));
    rows.forEach(function (r) { selMa.appendChild(h("option", { value: r._id, text: (r["Mã công thức"] || "") + " — " + (r["Tên công thức"] || "") + " (" + (r["Trạng thái"] || "") + ")" })); });
    selMa.value = T.maCT;
    selMa.addEventListener("change", function () {
      T.maCT = selMa.value; var r = rows.filter(function (x) { return x._id === T.maCT; })[0];
      if (r) { T.ma = r["Mã công thức"] || ""; T.expr = r["Biểu thức"] || ""; T.vars = {}; }
      render();
    });
    // Nhân viên: danh sách chọn "Mã — Họ tên" (không phải gõ tay mã), để trống = chạy giả lập
    var inNV = h("select", { "aria-label": "Nhân viên" }); inNV.appendChild(h("option", { value: "", text: "— Giả lập —" }));
    var coNV = false; db.nhanvien.forEach(function (r) { var ma = r["Mã NV"]; if (!ma) return; if (ma === T.maNV) coNV = true; inNV.appendChild(h("option", { value: ma, text: ma + " — " + (r["Họ và tên"] || "") })); });
    if (T.maNV && !coNV) inNV.appendChild(h("option", { value: T.maNV, text: T.maNV + " (không có trong Nhân sự)" }));
    inNV.value = T.maNV || "";
    inNV.addEventListener("change", function () { T.maNV = inNV.value; render(); });
    var inKy = kyPicker(T.nam + "-" + ("0" + T.thang).slice(-2), { "aria-label": "Kỳ" });
    inKy.addEventListener("change", function () { if (inKy.value) { var m = inKy.value.split("-"); T.nam = +m[0]; T.thang = +m[1]; render(); } });
    [fld("Loại công thức", selLoai), fld("Mã công thức", selMa), fld("Nhân viên (bỏ trống = giả lập)", inNV), fld("Kỳ lương", inKy)].forEach(function (x) { fg.appendChild(x); });
    box.appendChild(fg);
    box.appendChild(h("div", { class: "bar", style: "margin-top:0" }, [btn("↺ Lấy lại giá trị theo nhân viên/kỳ", "", function () { T.vars = {}; render(); })]));
    box.appendChild(h("div", { class: "fld" }, [h("label", { text: "Biểu thức (sửa trực tiếp để thử, không ảnh hưởng danh mục)" })]));
    var ta = h("textarea", { rows: 2, style: "width:100%;font-family:monospace" }); ta.value = T.expr;
    ta.addEventListener("change", function () { T.expr = ta.value; render(); });
    box.appendChild(ta);
    var vr = FML.validate(T.expr || "");
    if (!T.expr) { box.appendChild(h("div", { class: "hint", text: "Nhập hoặc chọn một công thức để thử." })); return box; }
    if (!vr.ok) { box.appendChild(h("div", { class: "warn", text: "⚠ Công thức không hợp lệ: " + vr.errors.map(function (e) { return e.message; }).join("; ") })); return box; }
    var b = null, kqB = null;
    if (T.maNV) { kqB = kqKy(T.nam, T.thang); b = (kqB.kq.bangluong || []).filter(function (x) { return x["Mã NV"] === T.maNV; })[0] || null; if (!b) box.appendChild(h("div", { class: "warn", text: "⚠ Không thấy " + T.maNV + " trong bảng lương kỳ " + T.thang + "/" + T.nam + " — dùng giá trị giả lập (0), có thể tự sửa." })); }
    var names = ctRefVars(T.expr);
    if (!names.length) box.appendChild(h("div", { class: "warn", text: "Công thức không dùng biến nào trong Thư viện biến — kết quả sẽ là hằng số." }));
    var ctx = {}, vt = h("table");
    vt.appendChild(h("tr", {}, [h("th", { text: "Biến" }), h("th", { text: "Giá trị" }), h("th", { text: "Nguồn" })]));
    names.forEach(function (name) {
      var cur = T.vars[name];
      if (cur === undefined) { var d = ctDefaultVar(name, b, T.loai, T.ma, T.nam, T.thang); cur = d.value; T.vars[name] = cur; T.vars["_src_" + name] = d.source; }
      ctx[name] = +cur || 0;
      var inp = h("input", { class: "num", value: cur });
      inp.addEventListener("change", function () { T.vars[name] = E.num(inp.value); T.vars["_src_" + name] = "nhập tay"; render(); });
      vt.appendChild(h("tr", {}, [h("td", { class: "t", html: "<code>" + esc(name) + "</code> — " + esc((FML.variables.get(name) || {}).label || "") }), h("td", {}, [inp]), h("td", { class: "t", style: "color:#6c7a74", text: T.vars["_src_" + name] || "" })]));
    });
    box.appendChild(h("div", { class: "tw" }, [vt]));
    var ketQuaMoi = null, loi = null;
    try { ketQuaMoi = Math.round(FML.evaluate(T.expr, ctx)); } catch (e) { loi = e.message; }
    var fieldCu = T.loai === "OVERTIME" ? "Tiền tăng ca" : T.loai === "ALLOWANCE" ? "Phụ cấp" : "Lương hỗ trợ";
    var ketQuaCu = b ? b[fieldCu] : null;
    var kq = h("div", { class: "kpis" });
    kq.appendChild(h("div", { class: "kpi" }, [h("small", { text: "Kết quả công thức này" }), h("b", { text: loi ? "⚠ lỗi" : fmt(ketQuaMoi) })]));
    if (b) kq.appendChild(h("div", { class: "kpi" }, [h("small", { text: "Đang áp dụng cho " + T.maNV + " (" + fieldCu + ")" }), h("b", { text: fmt(ketQuaCu) })]));
    if (b && !loi) kq.appendChild(h("div", { class: "kpi" }, [h("small", { text: "Chênh lệch" }), h("b", { style: ketQuaMoi - ketQuaCu ? "color:#c0362c" : "", text: (ketQuaMoi - ketQuaCu > 0 ? "+" : "") + fmt(ketQuaMoi - ketQuaCu) })]));
    box.appendChild(kq);
    if (loi) box.appendChild(h("div", { class: "warn", text: "⚠ Lỗi khi tính: " + loi }));
    box.appendChild(h("div", { class: "hint", style: "margin-top:8px", text: "Chỉ chạy thử trong màn hình này — chưa lưu, chưa đổi bảng lương/kỳ đã chốt. Muốn áp dụng thật: lưu biểu thức này vào tab " + ctLoaiTen(T.loai) + " (Trạng thái = Hiệu lực)." }));
    return box;
  }
  /** Tab "Lịch sử phiên bản" (mục VII, tab 7 / mục VII.4) — mọi dòng cùng Mã công thức (mọi Trạng thái) +
   * nhật ký chỉnh sửa liên quan (ai, khi nào, nội dung trước/sau — lấy từ nhật ký chung của app). */
  var CT_LBL = { "Chờ duyệt": "Gửi duyệt", "Nháp": "Trả về nháp", "Đã duyệt": "Duyệt", "Hiệu lực": "Kích hoạt", "Ngừng": "Ngừng" };
  function ctFenv() { return { can: can, user: session ? session.tenDangNhap : "", db: db }; }
  function ctChuyen(r, to) {
    var reason = String(st.ctReason || "").trim(); // Electron không hỗ trợ prompt() → lý do nhập ở ô phía trên bảng
    if ((to === "Hiệu lực" || to === "Ngừng") && !reason) { alert("Nhập 'Lý do thay đổi' vào ô phía trên bảng trước khi " + CT_LBL[to].toLowerCase() + " công thức."); return; }
    var vals = { "Trạng thái": to }; if (reason) vals["Lý do thay đổi"] = reason;
    // V10.2: lưu NGAY từng bước chuyển trạng thái (txn) — tiến trình chính kiểm từng bước một, không gộp nhiều bước vào một lần lưu trễ
    if (!txn(["dm_congthuc"], function () { return !!commit(REPO.plan("update", "dm_congthuc", r, vals, { what: CT_LBL[to].toLowerCase() + " công thức" }), { confirm: true, action: "Công thức tiền lương — " + CT_LBL[to] + " " + (r["Mã công thức"] || "") }); })) return;
    st.ctReason = ""; toast(CT_LBL[to] + " công thức " + (r["Mã công thức"] || "") + ": xong."); render();
  }
  function ctSaoChep(r) {
    if (!txn(["dm_congthuc"], function () { return !!commit(REPO.plan("insert", "dm_congthuc", null, FAP.copyAsDraft(r, ctFenv()), { what: "sao chép công thức" }), { action: "Công thức tiền lương — Sao chép thành phiên bản mới " + (r["Mã công thức"] || "") }); })) return;
    toast("Đã tạo phiên bản mới (Nháp) — bấm 'Sửa nháp' để chỉnh biểu thức rồi 'Gửi duyệt'."); render();
  }
  /** Sửa bản NHÁP (tên, biểu thức, hiệu lực). Bản đã gửi duyệt trở đi không sửa — dùng "Sao chép bản mới". */
  function ctSuaNhap(r) {
    var body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var fld = function (lab, ctl, cls) { return h("div", { class: "fld" + (cls ? " " + cls : "") }, [h("label", { text: lab }), ctl]); };
    var iTen = h("input", { value: r["Tên công thức"] || "", "aria-label": "Tên công thức", autocomplete: "off" });
    var iTu = dateField(r["Hiệu lực từ"] || "", { "aria-label": "Hiệu lực từ" }), iDen = dateField(r["Hiệu lực đến"] || "", { "aria-label": "Hiệu lực đến" });
    var ta = h("textarea", { rows: 3, "aria-label": "Biểu thức", style: "width:100%;font-family:monospace", "data-ct-edit-expr": "1" }); ta.value = r["Biểu thức"] || "";
    var msg = h("div", { class: "hint" });
    var chk = function () { var v = FML.validate(ta.value || ""); msg.className = v.ok ? "hint" : "warn"; msg.textContent = v.ok ? "✓ Biểu thức hợp lệ" : "⚠ " + v.errors.map(function (e) { return e.message; }).join("; "); return v.ok; };
    ta.addEventListener("input", chk); chk();
    g.appendChild(fld("Mã công thức", h("input", { value: r["Mã công thức"] || "", disabled: "disabled" })));
    g.appendChild(fld("Tên công thức", iTen)); g.appendChild(fld("Hiệu lực từ", iTu)); g.appendChild(fld("Hiệu lực đến", iDen));
    body.appendChild(fld("Biểu thức", ta)); body.appendChild(msg);
    modal("Sửa bản nháp — " + (r["Mã công thức"] || "") + " v" + (r["Phiên bản"] || 1), body, function (close) {
      return [btn("Hủy", "", close), btn("Lưu nháp", "pri", function () {
        if (!chk()) { alert("Biểu thức chưa hợp lệ."); return; }
        var tu = iTu.value.trim() ? VAL.normDate(iTu.value) : "", den = iDen.value.trim() ? VAL.normDate(iDen.value) : "";
        if ((iTu.value.trim() && !tu) || (iDen.value.trim() && !den)) { alert("Ngày không đúng dạng dd/MM/yyyy."); return; }
        var vals = { "Tên công thức": iTen.value, "Biểu thức": ta.value.trim(), "Hiệu lực từ": tu || "", "Hiệu lực đến": den || "" };
        if (!txn(["dm_congthuc"], function () { return !!commit(REPO.plan("update", "dm_congthuc", r, vals, { what: "sửa công thức nháp" }), { action: "Công thức tiền lương — Sửa nháp " + (r["Mã công thức"] || "") }); })) return;
        close(); toast("Đã lưu bản nháp " + (r["Mã công thức"] || "")); render();
      })];
    });
  }
  /** Thư viện công thức theo loại (Cài đặt): nơi DUY NHẤT tạo / sửa nháp / sao chép / gửi duyệt / duyệt / kích hoạt / ngừng. Danh mục chỉ chọn mã công thức. */
  function ctLibraryPanel(loai) {
    var box = h("div", { class: "card", "data-ct-library": loai });
    var noun = loai === "OVERTIME" ? "tăng ca" : loai === "ALLOWANCE" ? "phụ cấp" : "hỗ trợ";
    box.appendChild(h("div", { class: "hint", text: "Thư viện công thức " + noun + ": tạo mới, sửa nháp, duyệt và kích hoạt ở đây. Ở Danh mục, mỗi mã " + noun + " chỉ cần chọn Mã công thức. Chỉ bản “Hiệu lực” được dùng để tính lương." }));
    var inReason = h("input", { class: "i reason-in", value: st.ctReason || "", placeholder: "Lý do thay đổi (bắt buộc khi Kích hoạt / Ngừng)", "data-ct-reason": "1", "aria-label": "Lý do thay đổi" });
    inReason.addEventListener("input", function () { st.ctReason = inReason.value; });
    var bar = h("div", { class: "bar" });
    if (can("dm.edit")) bar.appendChild(btn("＋ Tạo công thức " + noun + " mới", "pri", function () { st.ctWz = { loai: loai, mau: -1, vars: {}, ma: "", ten: "", tu: "" }; st.ct = "wz"; render(); })).setAttribute("data-ct-lib-new", "1");
    bar.appendChild(h("label", { class: "reason-lbl", text: "Lý do thay đổi" })); bar.appendChild(inReason); box.appendChild(bar);
    var rows = db.dm_congthuc.filter(function (r) { return (r["Loại"] || "") === loai; }).slice().sort(function (a, b) { var ca = String(a["Mã công thức"] || ""), cb = String(b["Mã công thức"] || ""); return ca < cb ? -1 : ca > cb ? 1 : (+b["Phiên bản"] || 1) - (+a["Phiên bản"] || 1); });
    if (!rows.length) { box.appendChild(h("div", { class: "empty", text: "Chưa có công thức " + noun + " nào do bạn tạo. Công thức có sẵn của hệ thống vẫn dùng được khi chọn ở Danh mục." })); return box; }
    var t = h("table", { "data-ct-lib-table": loai });
    t.appendChild(h("tr", {}, ["Mã công thức", "Phiên bản", "Tên công thức", "Biểu thức", "Trạng thái", "Hiệu lực từ", "Hiệu lực đến", "Người lập", "Người duyệt", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    rows.forEach(function (r) {
      var acts = h("td", { class: "t", style: "white-space:normal;min-width:260px" }), tt = r["Trạng thái"] || "Nháp";
      if (tt === "Nháp" && can("dm.edit")) acts.appendChild(btn("Sửa nháp", "", function () { ctSuaNhap(r); }));
      FAP.actionsFor(r, ctFenv()).forEach(function (to) { acts.appendChild(btn(CT_LBL[to], to === "Hiệu lực" ? "pri" : "", function () { ctChuyen(r, to); })); });
      if (can("dm.edit")) acts.appendChild(btn("⎘ Sao chép bản mới", "", function () { ctSaoChep(r); }));
      if (can("dm.edit") && tt !== "Hiệu lực" && tt !== "Ngừng") acts.appendChild(btn("Xóa", "red ghost", function () { ctXoa(r); }, "Chỉ xóa được bản chưa áp dụng (Nháp / Chờ duyệt / Đã duyệt)")).setAttribute("data-ct-del", "1");
      t.appendChild(h("tr", { "data-ct-ver": (r["Mã công thức"] || "") + "#" + (r["Phiên bản"] || 1) }, [
        h("td", { class: "t", html: "<b>" + esc(r["Mã công thức"] || "") + "</b>" }), h("td", { class: "t", text: "v" + (r["Phiên bản"] || 1) }), h("td", { class: "t", text: r["Tên công thức"] || "" }),
        h("td", { class: "t", style: "font-family:monospace;max-width:340px;word-break:break-all", text: r["Biểu thức"] || "" }),
        h("td", { class: "t", html: "<span class='tag " + (tt === "Hiệu lực" ? "on" : "off") + "'>" + esc(tt) + "</span>" }),
        h("td", { class: "t", text: r["Hiệu lực từ"] || "" }), h("td", { class: "t", text: r["Hiệu lực đến"] || "" }), h("td", { class: "t", text: r["Người lập"] || "" }), h("td", { class: "t", text: r["Người duyệt"] || "" }), acts]));
    });
    box.appendChild(h("div", { class: "tw" }, [t]));
    box.appendChild(h("div", { class: "hint", text: "Quy trình: Nháp → Gửi duyệt → Duyệt (người khác người lập) → Kích hoạt. Bản đã gửi duyệt trở đi không sửa nội dung — dùng “Sao chép bản mới”. Nhật ký chi tiết ở tab “Lịch sử phiên bản”." }));
    return box;
  }
  /** Xóa 1 phiên bản công thức CHƯA áp dụng (Nháp / Chờ duyệt / Đã duyệt). Hiệu lực / Ngừng → dùng "Ngừng" để giữ lịch sử. */
  function ctXoa(r) {
    var ma = r["Mã công thức"] || "", loai = r["Loại"] || "", ref = [];
    var P = FAP.PARENT[loai]; if (P) (db[P.table] || []).forEach(function (x) { if (String(x["Loại công thức"] || "").trim() === ma) ref.push(String(x[P.code] || "")); });
    var p = REPO.plan("remove", "dm_congthuc", r, null, { what: "xóa công thức chưa áp dụng" });
    if (!p.ok) { alert("⛔ Không xóa được: " + p.msg); return; }
    if (!confirm("Xóa công thức " + ma + " v" + (r["Phiên bản"] || 1) + " (" + (r["Trạng thái"] || "Nháp") + ")?\n\nBản này chưa áp dụng vào lương nên không ảnh hưởng số liệu." + (ref.length ? "\n\nLưu ý: mã " + ref.join(", ") + " đang chọn mã công thức này; sau khi xóa mã đó sẽ không còn công thức này để tra (dùng cách tính có sẵn của hệ thống)." : "") + "\nThao tác được ghi vào nhật ký.")) return;
    if (!txn(["dm_congthuc"], function () { return !!commit(p, { action: "Công thức tiền lương — xóa bản chưa áp dụng " + ma + " v" + (r["Phiên bản"] || 1) }); })) return;
    save(); toast("Đã xóa công thức " + ma); render();
  }
  function ctHistoryPanel() {
    var box = h("div", { class: "card" });
    var codes = []; db.dm_congthuc.forEach(function (r) { var c = r["Mã công thức"]; if (c && codes.indexOf(c) < 0) codes.push(c); });
    if (!codes.length) { box.appendChild(h("div", { class: "empty", text: "Chưa có công thức nào trong danh mục." })); return box; }
    st.ctHist = st.ctHist && codes.indexOf(st.ctHist) >= 0 ? st.ctHist : codes[0];
    var sel = h("select"); codes.forEach(function (c) { sel.appendChild(h("option", { value: c, text: c })); }); sel.value = st.ctHist;
    sel.addEventListener("change", function () { st.ctHist = sel.value; render(); });
    box.appendChild(h("label", { text: "Mã công thức " })); box.appendChild(sel);
    var vers = FML.versionsOf(db.dm_congthuc, st.ctHist);
    box.appendChild(h("div", { class: "fh", text: "Các phiên bản (mới nhất trước)" }));
    var inReason = h("input", { class: "i reason-in", value: st.ctReason || "", placeholder: "Lý do thay đổi (bắt buộc khi Kích hoạt / Ngừng)", "data-ct-reason": "1", "aria-label": "Lý do thay đổi" });
    inReason.addEventListener("input", function () { st.ctReason = inReason.value; });
    box.appendChild(h("div", { class: "bar" }, [h("label", { class: "reason-lbl", text: "Lý do thay đổi" }), inReason]));
    var t = h("table");
    t.appendChild(h("tr", {}, ["Phiên bản", "Hiệu lực từ", "Hiệu lực đến", "Trạng thái", "Công ty", "Biểu thức", "Người lập", "Người duyệt", "Kích hoạt", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    vers.forEach(function (r) {
      var acts = h("td", { class: "t" });
      FAP.actionsFor(r, ctFenv()).forEach(function (to) { acts.appendChild(btn(CT_LBL[to], to === "Hiệu lực" ? "pri" : "", function () { ctChuyen(r, to); })); });
      if (can("dm.edit")) acts.appendChild(btn("⎘ Sao chép bản mới", "", function () { ctSaoChep(r); }));
      t.appendChild(h("tr", { "data-ct-ver": (r["Mã công thức"] || "") + "#" + (r["Phiên bản"] || 1) }, [h("td", { class: "t", text: "v" + (r["Phiên bản"] || 1) }), h("td", { class: "t", text: r["Hiệu lực từ"] || "" }), h("td", { class: "t", text: r["Hiệu lực đến"] || "" }),
        h("td", { class: "t", html: "<span class='tag " + (r["Trạng thái"] === "Hiệu lực" ? "on" : "off") + "'>" + esc(r["Trạng thái"] || "Nháp") + "</span>" }),
        h("td", { class: "t", text: r["Công ty"] || "(mọi công ty)" }), h("td", { class: "t", style: "font-family:monospace", text: r["Biểu thức"] || "" }),
        h("td", { class: "t", text: (r["Người lập"] || "") + (r["Ngày lập"] ? " · " + fmtTime(r["Ngày lập"]) : "") }),
        h("td", { class: "t", text: (r["Người duyệt"] || "") + (r["Thời điểm duyệt"] ? " · " + fmtTime(r["Thời điểm duyệt"]) : "") }),
        h("td", { class: "t", text: (r["Người kích hoạt"] || "") + (r["Thời điểm kích hoạt"] ? " · " + fmtTime(r["Thời điểm kích hoạt"]) : "") + (r["Lý do thay đổi"] ? " — " + r["Lý do thay đổi"] : "") }), acts]));
    });
    box.appendChild(h("div", { class: "tw" }, [t]));
    box.appendChild(h("div", { class: "hint", text: "Quy trình: Nháp → Gửi duyệt → Duyệt (người khác người lập) → Kích hoạt. Chỉ bản 'Hiệu lực' được dùng để tính lương. Bản đã gửi duyệt trở đi không sửa nội dung — dùng 'Sao chép bản mới'. Kích hoạt bản có ngày hiệu lực trong kỳ đã chốt là hồi tố (chỉ Admin) và không làm đổi bảng lương đã chốt." }));
    var logs = (db.auditlog || []).filter(function (a) { return a.chiTiet && a.chiTiet.indexOf("Công thức tiền lương") >= 0 && a.chiTiet.indexOf(st.ctHist) >= 0; }).slice(-30).reverse();
    box.appendChild(h("div", { class: "fh", text: "Nhật ký chỉnh sửa (ai, khi nào, nội dung trước/sau)" }));
    if (!logs.length) box.appendChild(h("div", { class: "hint", text: "Chưa có nhật ký khớp mã này (nhật ký chỉ ghi được khi thao tác đổi/trống trường 'Mã công thức' trong dòng sửa)." }));
    else {
      var t2 = h("table"); t2.appendChild(h("tr", {}, [h("th", { text: "Lúc" }), h("th", { text: "Người" }), h("th", { text: "Thao tác" }), h("th", { text: "Nội dung" })]));
      logs.forEach(function (a) { t2.appendChild(h("tr", {}, [h("td", { class: "t", text: fmtTime(a.luc) }), h("td", { class: "t", text: a.nguoi || "" }), h("td", { class: "t", text: a.thaoTac || "" }), h("td", { class: "t", text: a.chiTiet || "" })])); });
      box.appendChild(h("div", { class: "tw" }, [t2]));
    }
    return box;
  }

