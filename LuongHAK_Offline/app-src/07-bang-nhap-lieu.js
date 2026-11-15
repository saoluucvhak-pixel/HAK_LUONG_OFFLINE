  // ---------- Bảng nhập liệu ----------
  function grid(key, def) {
    var wrap = h("div"), card = h("div", { class: "card" }), bar = h("div", { class: "bar" }), body = h("div", { class: "tw" });
    var inputReview = ["chamcong", "sanluong", "bandam"].indexOf(key) >= 0, pumpMode = key === "bandam" ? (st.pumpMode || "team") : "", reviewState = h("div", { class: "hint", "data-input-review": key });
    if (key === "bandam") {
      var tabs = h("div", { class: "bar", "aria-label": "Phân bổ bơm dăm" });
      [["team", "Phân bổ theo tổ"], ["direct", "Phân bổ trực tiếp nhân viên"]].forEach(function (m) { tabs.appendChild(btn(m[1], pumpMode === m[0] ? "pri" : "", function () { st.pumpMode = m[0]; render(); })); }); wrap.appendChild(tabs);
      def = Object.assign({}, def, { cols: def.cols.filter(function (c) { return pumpMode === "direct" ? ["Mã phòng ban", "NV vắng"].indexOf(c) < 0 : c !== "Mã NV"; }) });
    }
    var theoKy = !!(def.kyCol || def.dateCol), cnt = h("span", { class: "hint", style: "margin:0" });
    var editPerm = S[key] ? "input.edit" : "dm.edit", noRight = !can(editPerm), isCat = !S[key];
    var locked = (theoKy && !!kyChot(kyStr())) || noRight || (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0 && (db.sl_chuyenky || []).some(function (r) { return r.source === kyStr(); }));
    var inMode = !!INPUT_FILTER[key], pcMode = key === "sanluong" || key === "bandam", pcTot = h("div", { class: "card", "data-pc-totals": key, style: "margin:6px 0;padding:8px" });
    var shared = key === "chamcong"; // Chấm công dùng bộ lọc chung (phòng ban, từ khóa) như Báo cáo lương
    var deptOf = {};
    if (shared && can("payroll.view")) { try { kqKy(st.nam, st.thang).kq.bangluong.forEach(function (r) { deptOf[r["Mã NV"]] = r["Phòng ban"] || ""; }); } catch (e) { /* không tính được lương kỳ này: bỏ lọc phòng ban */ } }
    if (st.ktReturn && ["chamcong", "sanluong", "bandam"].indexOf(key) >= 0) {
      bar.appendChild(btn("Quay lại kiểm tra kỳ lương", "ghost", function () {
        if (!leaveOk()) return;
        var period = st.ktReturn; st.ktReturn = null;
        st.nam = Number(period.slice(0, 4)); st.thang = Number(period.slice(5, 7));
        st.tab = "ktbl"; saveUi(); render();
      }));
    }
    var q = h("span"); // ô tìm nằm trong HAK Smart Filter (sfm) — cùng một trạng thái st.qs[key]
    var sfm = null, lastScan = null;
    var newRow = function () { var r = Object.assign({}, def.def || {}); if (def.kyCol) r[def.kyCol] = kyStr(); if (def.dateCol) r[def.dateCol] = kyStr() + "-01"; return r; };
    if (!locked && isCat) bar.appendChild(btn("＋ Thêm mới", "pri", function () { if (!need(editPerm)) return; var e0 = cedit(key); if (e0 && e0.dirty && !confirm("Đang có thay đổi chưa lưu — bỏ để thêm mới?")) return; st.cedit = st.cedit || {}; st.cedit[key] = { mode: "new", ri: -1, draft: newRow(), dirty: false, state: "EDITING" }; draw(); }, "Tạo dòng mới ở chế độ nháp — chỉ ghi khi bấm Lưu"));
    else if (!locked) bar.appendChild(btn(key === "bandam" && pumpMode === "direct" ? "Giao trực tiếp cho Mã NV…" : "＋ Thêm dòng", "pri", function () { if (!need(editPerm)) return; if (key === "bandam") { bandamEntryForm(null, draw, pumpMode); return; } if (!commit(REPO.plan("insert", key, null, newRow(), { what: "thêm dòng" }), { audit: theoKy ? false : "retro", action: "Thêm dòng danh mục" })) return; save(); st.qs[key] = ""; q.value = ""; st.pg[key] = 1e9; draw(); var tw = body; tw.scrollTop = tw.scrollHeight; }));
    bar.appendChild(q); bar.appendChild(cnt); bar.appendChild(h("span", { class: "sp" }));
    if (key === "sanluong" || (key === "bandam" && pumpMode === "team")) bar.appendChild(btn(key === "bandam" ? "Mẫu Excel chia tổ" : "📄 Tải file mẫu", "", function () { downloadPBTemplate(key); }, "Mẫu phiếu cân như công cụ phân bổ khối lượng: Mã phòng ban (tổ) + NV vắng"));
    else if (key !== "bandam") bar.appendChild(btn("📄 Tải file mẫu", "", function () { downloadTemplate(key); }, "File Excel mẫu có sẵn tên cột + dòng ví dụ"));
    if (!locked) bar.appendChild(btn("⬆ Nhập Excel", "", function () { importFile(key, draw, pumpMode); }, "Nhập từ file .xlsx / .xls / .csv"));
    if (["chamcong", "sanluong"].indexOf(key) >= 0 && !locked) { bar.appendChild(btn("Thay toàn bộ kỳ từ Excel…", "", function () { inputPeriodBatch(key, true, draw); })); bar.appendChild(btn("Xóa dữ liệu kỳ…", "red ghost", function () { inputPeriodBatch(key, false, draw); })); }
    if (key === "bandam" && pumpMode === "direct") bar.appendChild(btn("Mẫu Excel giao trực tiếp", "", bandamDirectExcelTemplate));
    if (key === "sanluong") { bar.appendChild(btn("Chuyển thành SL kỳ mới…", "", function () { productionReperiodScreen(draw); })); bar.appendChild(btn("Chỉ đổi kỳ chi trả SL…", "", function () { productionCarryScreen(draw); })); }
    if (key === "chamcong") bar.appendChild(btn("Đối chiếu đơn nghỉ", "", function () { leaveReviewModal(locked, draw); }));
    if (inputReview) {
      bar.appendChild(btn("Lưu để tính lương", "pri", function () {
        if (!need("input.edit")) return;
        if (locked) { alert("Kỳ đang khóa — không thay đổi trạng thái lưu."); return; }
        try { C.inputReview.assertValid(db, key, kyStr(), pumpMode); } catch (e) { alert(e.message); return; }
        var errors = INT.check(db).filter(function (x) { return x.level === "Critical" && (x.area === key || x.area === ALL[key].ten); });
        if (errors.length) { alert("Kiểm tra dữ liệu trước khi lưu: " + errors.map(function (x) { return x.msg; }).join("; ")); return; }
        if (!txn(["_inputReviews"], function () { C.inputReview.approve(db, key, kyStr(), pumpMode, currentUser()); audit("Lưu để tính lương", key + " " + kyStr() + " " + pumpMode); })) { alert("Chưa lưu để tính lương: " + lastTxnError); return; }
        draw(); toast("Đã lưu để tính lương kỳ " + kyStr());
      }));
      card.appendChild(reviewState);
    }
    function refreshInputReview() { if (inputReview) { var pending = C.inputReview.changed(db, key, kyStr(), pumpMode); reviewState.textContent = pending ? "● Nháp — thay đổi đã được giữ trên máy, CHƯA dùng tính lương. Kiểm tra rồi bấm Lưu để tính lương (toàn bộ kỳ đang chọn)." : "✓ Đã lưu để tính lương kỳ " + kyStr(); reviewState.className = pending ? "warn" : "hint"; } }
    /** MỘT phép quét duy nhất cho: bảng hiển thị · tổng · Excel · PDF · in (hiển thị = tổng = Excel = PDF = in). */
    function scan() {
      var idx = [], qq = qOf(key), names = {}, LKMAP = key === "chamcong" ? linkMapNow() : {}, total = 0;
      if (inMode) INDEX_PB = INDEX_PB || inputPbMap();
      db.nhanvien.forEach(function (n) { if (!(n["Mã NV"] in names)) names[n["Mã NV"]] = n["Họ và tên"] || ""; }); // tra tên 1 lần / lượt quét
      var nameOf = function (ma) { return Object.prototype.hasOwnProperty.call(names, ma) ? names[ma] : ""; };
      var scoped = pcMode ? plfScoped(key) : inMode ? !!(inputF(key).tu || inputF(key).den) : false, cf = isCat ? catF(key) : null;
      db[key].forEach(function (r, i) {
        if (key === "bandam" && C.inputReview.mode(r) !== pumpMode) return;
        if (def.rowFilter && !def.rowFilter(r)) return;
        if (theoKy && !scoped && !rowInKy(r, def)) return;
        total++; // dòng thuộc phạm vi gốc của màn hình (kỳ đang chọn hoặc khoảng ngày) — mẫu số của "Hiển thị x / y"
        if (inMode && !inputPass(key, r)) return;
        if (pcMode && !LF.phieuCan([r], plfOf(key)).length) return;
        if (shared && !RF.isEmpty(st.rf)) { var nm = nameOf(r["Mã NV"]); if (!RF.applyGeneric([{ "Mã NV": r["Mã NV"], "Họ và tên": nm, "Phòng ban": deptOf[r["Mã NV"]] || "" }], st.rf).rows.length) return; }
        if (key === "chamcong" && st.ccf) {
          if (!LF.inSet(st.ccf.ht, r["Hình thức công"])) return;
          if (st.ccf.warn === "bad" && !DAYS.some(function (d) { return r[d] != null && r[d] !== "" && VAL.dayCell(d, r[d], VAL.normKy(r["Kỳ"])).error; })) return;
          if (st.ccf.src) {
            var rid = attRecordId("chamcong", r), lk = DAYS.map(function (d) { return LKMAP[rid + "|" + d]; }).filter(Boolean);
            if (st.ccf.src === "has" && !lk.length) return; if (st.ccf.src === "none" && lk.length) return;
            if (st.ccf.src === "edited" && !lk.some(function (l) { return String(r[l.day] == null ? "" : r[l.day]).replace(".", ",") !== String(l.value == null ? "" : l.value).replace(".", ","); })) return;
          }
        }
        if (cf && !catPass(def, r, cf)) return;
        if (qq && def.cols.every(function (c) { return fold(r[c]).indexOf(qq) < 0; }) && fold(nameOf(r["Mã NV"])).indexOf(qq) < 0) return;
        idx.push(i);
      });
      lastScan = { idx: idx, nameOf: nameOf, LKMAP: LKMAP, total: total, kept: idx.length };
      return lastScan;
    }
    var scanRows = function () { return scan().idx.map(function (i) { return db[key][i]; }); };
    var inRows = scanRows, pcRows = scanRows;
    if (inMode) {
      var inPdfRows = function () { return inRows().map(function (r) { var o = {}; def.cols.forEach(function (c) { o[c] = r[c] == null ? "" : r[c]; }); o["Họ và tên"] = tenNV(r["Mã NV"]); return o; }); };
      bar.appendChild(btn("⬇ PDF", "", function () { exportSheetsPdf({ title: def.ten.toLocaleUpperCase("vi-VN") + " (đã lọc)", ky: inputScopeText(key), sheets: [{ name: def.ten, rows: inPdfRows() }] }, slug(def.ten) + "_loc.pdf"); }, "Xuất đúng các dòng đang lọc"));
      bar.appendChild(btn("🖨 In", "", function () { if (!need("export", "in")) return; window.print(); }));
    }
    if (pcMode) bar.appendChild(btn("⬇ PDF", "", function () { var rows = pcRows(); exportSheetsPdf({ title: def.ten + " (đã lọc)", ky: pcScopeText(key), sheets: [{ name: def.ten, rows: rows.map(function (r) { var o = {}; def.cols.forEach(function (c) { o[c] = r[c] == null ? "" : r[c]; }); return o; }) }] }, slug(def.ten) + "_loc.pdf"); }, "Xuất đúng các dòng đang lọc"));
    bar.appendChild(btn("⬇ Xuất Excel", "", function () { var rows = scanRows(), loc = sfm && !SFC.isEmpty(sfm.cfg.state.get()); saveXlsx(slug(def.ten) + (inMode ? (inputF(key).tu || inputF(key).den ? "_loc" : "_" + kyStr()) : theoKy && !(pcMode && plfScoped(key)) ? "_" + kyStr() : (pcMode ? "_loc" : "")) + (loc && !pcMode && !inMode ? "_loc" : "") + ".xlsx", [{ name: def.ten, cols: def.cols, rows: rows }], key === "sanluong" || key === "bandam" ? undefined : "pro"); }));
    card.appendChild(bar);
    if (key === "sanluong") (db.sl_chuyenky || []).filter(function (r) { return r.source === kyStr() || r.target === kyStr(); }).forEach(function (r) { card.appendChild(h("div", { class: "warn", text: "Sản lượng phát sinh " + r.source + " → tính vào lương " + r.target + ". Người/công theo kỳ phát sinh; đơn giá/bù theo kỳ chi trả. Không tính hai lần." })); });
    if (inMode) INDEX_PB = null;
    sfm = mountGridSF(); card.appendChild(sfm.el);
    if (pcMode || inMode) card.appendChild(pcTot);
    /** Cấu hình HAK Smart Filter cho lưới nhập liệu / danh mục. Trạng thái nằm ở chính các đối tượng cũ (st.plf / st.inf / st.rf+st.ccf / st.qs / st.catf) — không tạo kho dữ liệu thứ hai. */
    function mountGridSF() {
      var fr = [], kind = pcMode ? "pc" : inMode ? "in" : shared ? "cc" : "cat";
      var deptOpts = function () { var d = {}; db[key].forEach(function (r) { var v = String(r["Mã phòng ban"] || "").trim(); if (v) d[v] = 1; }); return Object.keys(d).sort(); };
      var fields = [], quick = ["q"], adv = ["q"];
      var add = function (f, isQuick) { fields.push(f); adv.push(f.key); if (isQuick) quick.push(f.key); };
      if (pcMode || inMode) { quick.push("period"); adv.push("period"); }
      if (pcMode) add({ key: "pb", label: "Phòng ban", type: "multi", withNone: true, options: deptOpts }, true);
      if (inMode) {
        add({ key: "pb", label: "Phòng ban", type: "multi", withNone: true, options: function () { INDEX_PB = INDEX_PB || inputPbMap(); var d = {}; db.nhanvien.forEach(function (n) { var p = INDEX_PB[n["Mã NV"]]; if (p) d[p] = 1; }); return Object.keys(d).sort(); } }, true);
        add({ key: "nv", label: "Nhân viên", type: "multi", options: function () { return db.nhanvien.map(function (n) { return { value: n["Mã NV"], label: n["Mã NV"] + " — " + (n["Họ và tên"] || "") }; }).sort(function (x, y) { return x.value < y.value ? -1 : 1; }); } }, false);
      }
      if (shared) {
        RF.setContext(rfContext());
        db.chamcong.forEach(function (r) { if (rowInKy(r, def)) fr.push({ "Mã NV": r["Mã NV"], "Họ và tên": "", "Phòng ban": deptOf[r["Mã NV"]] || "" }); });
        var op = RF.options(fr), hts = {}; db.chamcong.forEach(function (r) { if (rowInKy(r, def)) hts[String(r["Hình thức công"] || "").trim().toUpperCase()] = 1; });
        if (op.khoi.length) add({ key: "khoi", label: "Khối", type: "multi", options: function () { return op.khoi; } }, false);
        add({ key: "phongBan", label: "Phòng ban", type: "multi", options: function () { return op.phongBan; } }, true);
        if (op.to.length) add({ key: "to", label: "Tổ", type: "multi", options: function () { return op.to; } }, false);
        add({ key: "ht", label: "Hình thức công", type: "multi", withNone: true, options: function () { return Object.keys(hts).filter(Boolean).sort(); } }, true);
        add({ key: "warn", label: "Cảnh báo", type: "enum", options: [{ value: "bad", label: "Chỉ dòng có ô lỗi / bất thường" }] }, false);
        add({ key: "src", label: "Nguồn OCR", type: "enum", options: [{ value: "has", label: "Có nguồn OCR (chứng từ gốc)" }, { value: "none", label: "Không có nguồn OCR" }, { value: "edited", label: "Đã sửa tay sau khi nhập OCR" }] }, false);
        if (op.nhanVien.length <= 3000) add({ key: "maNV", label: "Nhân viên", type: "multi", options: function () { return op.nhanVien; } }, false);
      }
      if (kind === "cat") {
        var hasTT = def.cols.indexOf("Trạng thái") >= 0, hasHL = def.cols.indexOf("Hiệu lực từ") >= 0 || def.cols.indexOf("Hiệu lực đến") >= 0;
        if (hasTT) add({ key: "tt", label: "Trạng thái", type: "enum", options: function () { var d = {}; db[key].forEach(function (r) { var v = String(r["Trạng thái"] || "").trim(); if (v) d[v] = 1; }); return Object.keys(d).sort(); } }, true);
        if (hasHL) add({ key: "hl", label: "Hiệu lực", type: "enum", options: [{ value: "dang", label: "Đang hiệu lực" }, { value: "chua", label: "Chưa hiệu lực" }, { value: "het", label: "Đã hết hiệu lực" }] }, true);
      }
      var get, set;
      if (kind === "pc" || kind === "in") {
        var f0 = function () { return pcMode ? plfOf(key) : inputF(key); };
        get = function () { var f = f0(), s = SFC.empty(); s = SFC.setDates(s, f.tu, f.den); s.q = st.qs[key] || ""; if ((f.pb || []).length) s.sel.pb = f.pb.slice(); if (inMode && (f.nv || []).length) s.sel.nv = f.nv.slice(); return s; };
        set = function (s) { var f = f0(); f.pb = (s.sel.pb || []).slice(); if (inMode) f.nv = (s.sel.nv || []).slice(); f.tu = s.tu; f.den = s.den; f.thang = ""; f.ky = ""; st.qs[key] = s.q; saveUi(); };
      } else if (kind === "cc") {
        get = function () { var c = st.ccf || {}, s = rfStateGet(); if ((c.ht || []).length) s.sel.ht = c.ht.slice(); if (c.warn) s.one.warn = c.warn; if (c.src) s.one.src = c.src; return s; };
        set = function (s) { rfStateSet(s); st.ccf = { ht: (s.sel.ht || []).slice(), warn: s.one.warn || "", src: s.one.src || "" }; };
      } else {
        get = function () { var c = catF(key), s = SFC.empty(); s.q = st.qs[key] || ""; if (c.tt) s.one.tt = c.tt; if (c.hl) s.one.hl = c.hl; return s; };
        set = function (s) { st.catf = st.catf || {}; st.catf[key] = { tt: s.one.tt || "", hl: s.one.hl || "" }; st.qs[key] = s.q; saveUi(); };
      }
      var cfg = {
        screenId: key, attrs: pcMode ? { "data-pc-filter": key } : inMode ? { "data-in-filter": key } : shared ? { "data-cc-filter": "1", "data-rf": "1" } : { "data-cat-filter": key }, qAttrs: shared ? { "data-rf-key": "tuKhoa" } : {}, qCommit: shared, fields: fields, quickFields: quick, advancedFields: adv, state: { get: get, set: set },
        searchPlaceholder: kind === "cc" ? "🔍 Tìm mã NV / tên…" : "🔍 Tìm trong bảng…", periodNoneLabel: "Kỳ: kỳ đang chọn",
        periods: function () { return sfPeriods(db[key], def.dateCol || ""); }, labelOf: function (k) { return RF_LABEL[k] || k; },
        scopeFallback: function () { return theoKy ? "kỳ " + st.thang + "/" + st.nam : "tất cả"; },
        dataSource: function () { var sc = lastScan || scan(); return { kept: sc.kept, total: sc.total, unsupported: [] }; },
        onApply: function () { st.pg[key] = 0; draw(); }
      };
      var m = sfUi.mount(cfg); m.cfg = cfg; return m;
    }
    if (noRight) card.appendChild(h("div", { class: "locked", html: "👁 Chế độ <b>chỉ xem</b> — vai trò của bạn không có quyền sửa bảng này." }));
    else if (locked) card.appendChild(h("div", { class: "locked", html: "🔒 <b>" + kyLabel(kyStr()) + " đã chốt lương</b> — dữ liệu kỳ này chỉ xem, không sửa được. Muốn sửa: vào <b>Kỳ lương đã chốt</b> → Mở chốt." }));
    card.appendChild(h("div", { class: "hint", text: (def.hint ? def.hint + " " : "") + "Nhập hàng loạt: bấm '📄 Tải file mẫu' → điền Excel → '⬆ Nhập Excel'. Hoặc copy nhiều dòng từ Excel rồi Ctrl+V vào một ô." }));
    if (key === "chamcong") card.appendChild(h("div", { class: "legend", html: "<b>Màu ô:</b> <span><i class='c1'>1</i>đủ công</span><span><i class='cH'>0,5</i>nửa công</span><span><i class='cX'>1QC</i>có nhãn / dòng tăng ca</span><span><i class='cP'>1</i>dòng phép (PN)</span><span><i class='cO'>1</i>dòng lễ (CL)</span><span><i class='cE'>?</i>không đọc được số công</span><span><i class='we'>&nbsp;</i>Chủ nhật</span>" }));
    card.appendChild(body); wrap.appendChild(card);
    var vis = def.cols.filter(function (c) { return (def.hide || []).indexOf(c) < 0; });
    // Tô màu ô chấm công theo số công + loại dòng (Hình thức công) — chỉ hiển thị, không đổi dữ liệu
    var dayCls = function (v, ht) {
      if (v === "" || v == null) return "";
      var t = E.tachCong(v); if (!t.soCong) return "cv cE";
      ht = String(ht || "BT").trim().toUpperCase();
      if (ht === "PN") return "cv cP"; if (ht === "CL") return "cv cO"; if (/^TC/.test(ht) || t.nhan) return "cv cX";
      return t.soCong >= 1 ? "cv c1" : "cv cH";
    };

    var todayIso = function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
    function catSave() {
      var e = cedit(key); if (!e || !need(editPerm)) return;
      e.state = "VALIDATING"; var cleaned = {}, errs = [];
      def.cols.forEach(function (c) { var v = e.draft[c], n = VAL.normCell(c, v == null ? "" : String(v)); if (n.error) errs.push(c + ": " + n.error); else cleaned[c] = n.value; });
      if (errs.length) { e.state = "EDITING"; e.err = errs.join(" · "); draw(); return; }
      e.state = "SAVING";
      var plan = e.mode === "new" ? REPO.plan("insert", key, null, Object.assign({}, e.draft, cleaned), { what: "thêm danh mục" }) : REPO.plan("update", key, db[key][e.ri], cleaned, { what: "sửa danh mục" });
      if (!plan.ok) { e.state = "EDITING"; e.err = plan.msg; draw(); alert(plan.msg); return; }
      if (plan.retro && !can("retro.edit")) { e.state = "EDITING"; alert("⛔ Không thể lưu: dữ liệu có hiệu lực trong kỳ lương đã chốt.\nChỉ Admin được sửa dữ liệu hồi tố (quy tắc Q-14)."); draw(); return; }
      if (plan.retro && !confirm("⚠ " + retroText(plan.impact) + "\n\nTiếp tục lưu?")) { e.state = "EDITING"; draw(); return; }
      if (!commit(plan, { audit: "always", action: e.mode === "new" ? "Thêm danh mục" : "Sửa danh mục" })) { e.state = "EDITING"; e.err = "Không lưu được — dữ liệu nháp được giữ để sửa tiếp"; draw(); return; }
      save(); delete st.cedit[key]; draw(); updateNav(); toast("✓ Đã lưu " + (def.ten || key));
    }
    function catCancel() { var e = cedit(key); if (e && e.dirty && !confirm("Bỏ các thay đổi chưa lưu?")) return; delete st.cedit[key]; draw(); }
    function catRemove(ri, r) {
      if (!need(editPerm)) return;
      var u = catUsage(key, r, def), stopCol = def.cols.indexOf("Trạng thái") >= 0 ? "Trạng thái" : (def.cols.indexOf("Hiệu lực đến") >= 0 ? "Hiệu lực đến" : null);
      if (u.n || u.closed) {
        if (!stopCol) { alert("⛔ Mã này đã được dùng ở: " + u.where.join(", ") + ".\nBảng này không có cột Trạng thái/Hiệu lực đến nên không thể Ngừng hiệu lực, và KHÔNG được xóa để giữ khả năng xem lại kỳ lương cũ."); return; }
        if (!confirm("Mã đã được dùng ở: " + u.where.join(", ") + ".\nKhông xóa — chỉ NGỪNG HIỆU LỰC (vẫn giữ lịch sử). Tiếp tục?")) return;
        var patch = {}; patch[stopCol] = stopCol === "Trạng thái" ? "Ngừng" : todayIso();
        var pS = REPO.plan("update", key, r, patch, { what: "ngừng hiệu lực" }); if (!pS.ok) { alert(pS.msg); return; }
        if (!commit(pS, { audit: "always", action: "Ngừng hiệu lực danh mục" })) return;
        save(); draw(); toast("Đã ngừng hiệu lực"); return;
      }
      var pX = REPO.plan("remove", key, r, null, { what: "xóa danh mục" }); if (!pX.ok) { alert(pX.msg); return; }
      if (!confirm("Mã chưa được dùng ở đâu. Xóa dòng này?" + (pX.retro ? "\n\n" + retroText(pX.impact) : ""))) return;
      if (!commit(pX, { audit: "always", action: "Xóa dòng danh mục" })) return;
      save(); draw(); updateNav();
    }
    function catActions(ri, r, editing) {
      var td = h("td", { class: "catact", style: "white-space:nowrap;text-align:center" }), e = cedit(key);
      if (editing) {
        td.appendChild(btn("Lưu", "pri", catSave, "Kiểm tra hợp lệ rồi ghi")); td.appendChild(btn("Hủy", "ghost", catCancel, "Bỏ thay đổi, giữ dữ liệu gốc"));
        td.appendChild(h("div", { class: "hint", "data-cat-state": e.state, style: "margin:2px 0" , text: e.dirty ? "● Có thay đổi chưa lưu" : "Đang sửa" }));
        if (e.err) td.appendChild(h("div", { class: "warn", style: "margin:2px 0;white-space:normal", text: e.err }));
        return td;
      }
      if (locked) return td;
      var busy = !!cedit(key);
      if (key !== "dm_tncn") td.appendChild(btn("Chi tiết", "ghost", function () {
        var b = h("div", { "data-cat-detail": key }), t = h("table");
        def.cols.filter(function (c) { return (def.hide || []).indexOf(c) < 0; }).forEach(function (c) { t.appendChild(h("tr", {}, [h("th", { text: c, style: "text-align:left;width:38%" }), h("td", { class: "t", text: r[c] == null ? "" : String(r[c]) })])); });
        b.appendChild(h("div", { class: "tw" }, [t]));
        modal("Chi tiết — " + def.ten, b, function (close) { return [btn("Đóng", "pri", close)]; });
      }, "Xem toàn bộ trường của dòng (chỉ xem)"));
      td.appendChild(btn("Sửa", "ghost", function () { if (busy && !confirm("Đang sửa một dòng khác" + (cedit(key).dirty ? " (có thay đổi chưa lưu)" : "") + " — bỏ để sửa dòng này?")) return; if (!need(editPerm)) return; st.cedit = st.cedit || {}; st.cedit[key] = { mode: "edit", ri: ri, draft: Object.assign({}, r), dirty: false, state: "EDITING" }; draw(); }, "Sửa dòng này (chưa ghi cho tới khi bấm Lưu)"));
      td.appendChild(btn("Sao chép", "ghost", function () { if (!need(editPerm)) return; var c2 = Object.assign({}, r); delete c2._id; st.cedit = st.cedit || {}; st.cedit[key] = { mode: "new", ri: -1, draft: c2, dirty: true, state: "EDITING" }; draw(); }, "Tạo dòng mới từ dòng này (nháp)"));
      td.appendChild(btn("Lịch sử", "ghost", function () { catHistory(key, r, def); }));
      td.appendChild(btn("Xóa / Ngừng", "red ghost", function () { catRemove(ri, r); }, "Mã chưa dùng: xóa · đã dùng: ngừng hiệu lực"));
      return td;
    }

    function draw() {
      refreshNVList();
      body.innerHTML = "";
      if (inputReview) {
        var badRows = (db[key] || []).map(function (r, i) { return {r:r,i:i}; }).filter(function (x) { return !VAL.rowPeriod(key,x.r); });
        if (badRows.length) { var badBox = h("div", {class:"warn", "data-invalid-input":key}, [h("b",{text:badRows.length + " dòng lỗi ngày/kỳ — cần sửa trước khi tính lương"})]); badRows.forEach(function (x) { badBox.appendChild(h("div", {}, [h("span",{text:(x.r["Phiếu cân"] || x.r["Mã NV"] || "Dòng " + (x.i+1)) + " · "}), btn("Sửa dòng lỗi", "", function () { if(key === "bandam")bandamEntryForm(x.i,draw);else inputRowEdit(key,ALL[key],x.i,draw); }), btn("Xóa dòng lỗi", "red ghost", function () { if(!need(editPerm)||!confirm("Xóa dòng lỗi này?"))return;if(!txn([key],function(){return !!commit(REPO.plan("remove",key,db[key][x.i],null));})){alert(lastTxnError);return;}draw(); })])); }); body.appendChild(badBox); }
      }
      var sc = scan(), idx = sc.idx.slice(), qq = qOf(key), nameOf = sc.nameOf, LKMAP = sc.LKMAP;
      if (pcMode) {
        var T = LF.tongPhieuCan(idx.map(function (i2) { return db[key][i2]; })), unit = key === "bandam" ? " xe" : " tấn";
        pcTot.innerHTML = "";
        pcTot.appendChild(h("div", { html: "<b>Tổng theo bộ lọc (" + esc(pcScopeText(key)) + "):</b> " + T.soPhieu + " phiếu · <b>" + fmt(T.tongKL) + unit + "</b> · đã phân bổ " + fmt(T.daPhanBo) + " · chờ phân bổ " + fmt(T.choPhanBo) + (T.trung.length ? " · <span style='color:#b00'>⚠ " + T.trung.length + " phiếu trùng khóa (chỉ tính 1 lần): " + esc(T.trung.slice(0, 5).join(", ")) + "</span>" : "") }));
        var fl = function (o) { return Object.keys(o).sort().map(function (k2) { return k2 + ": " + fmt(o[k2]); }).join(" · "); };
        pcTot.appendChild(h("div", { class: "hint", text: "Theo ngày — " + (fl(T.theoNgay) || "—") }));
        pcTot.appendChild(h("div", { class: "hint", text: "Theo phòng ban — " + (fl(T.theoPhongBan) || "—") }));
      }
      if (inMode) {
        pcTot.innerHTML = ""; var sums = INPUT_SUM[key].map(function (c) { var t = 0; idx.forEach(function (i2) { t += E.money(db[key][i2][c]); }); return "<b>" + esc(c) + ":</b> " + fmt(t); });
        pcTot.appendChild(h("div", { "data-in-totals": key, html: "<b>Tổng theo bộ lọc (" + esc(inputScopeText(key)) + "):</b> " + idx.length + " dòng · " + sums.join(" · ") }));
        if (CT_KEY[key] && idx.length) pcTot.appendChild(btn("Đối soát theo nhân viên", "", function () {
          moneyInputReview(key, idx.map(function (i) { return db[key][i]; }), nameOf);
        }));
      }
      if (isCat && cedit(key) && cedit(key).mode === "new") idx.unshift(-1);
      cnt.textContent = idx.length + " dòng" + (theoKy ? " (kỳ " + st.thang + "/" + st.nam + ")" : "") + (qq ? " · đang lọc \"" + st.qs[key] + "\"" : "");
      if (sfm) sfm.refresh(); // chip / số điều kiện / dòng kết quả — không dựng lại ô đang nhập
      refreshInputReview();
      if (!idx.length) { body.appendChild(h("div", { class: "empty", html: qq ? "Không có dòng nào khớp \"" + esc(st.qs[key]) + "\"." : "Chưa có dữ liệu" + (theoKy ? " cho kỳ " + st.thang + "/" + st.nam : "") + ".<br>Bấm <b>＋ Thêm dòng</b> hoặc dán từ Excel." })); return; }
      var pg = pager(key, idx.length, draw);
      if (pg.el) body.appendChild(pg.el);
      var t = h("table"), trh = h("tr");
      trh.appendChild(h("th", { class: "stk", text: "#", style: "width:36px" }));
      if (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0) trh.appendChild(h("th", { text: "Thao tác", style: "position:sticky;left:36px;z-index:4;background:var(--bg,#fff)" }));
      vis.forEach(function (c) {
        var isDay = /^\d\d$/.test(c), cls = isDay ? "day" : (NUMCOLS.test(c) && !DATECOLS.test(c) ? "r" : "");
        if (isDay) { var dt = new Date(st.nam, st.thang - 1, +c); if (dt.getMonth() === st.thang - 1 && dt.getDay() === 0) cls += " we"; }
        if (key === "sanluong" && c === "Ngày cân") trh.appendChild(h("th", { text: "Ngày cân gốc", style: "min-width:110px" }));
        var th = h("th", { class: cls, text: isDay ? String(+c) : key === "bandam" && c === "KL hàng (Tấn)" ? "Số xe" : key === "sanluong" && c === "Ngày cân" ? "Ngày phân bổ" : c });
        if (COLW[c]) th.style.minWidth = COLW[c] + "px"; else if (MONEYCOLS.test(c)) th.style.minWidth = "120px";
        trh.appendChild(th);
        if (c === "Mã NV" && def.showName) trh.appendChild(h("th", { text: "Họ tên", style: "min-width:150px" }));
      });
      if (def.total) trh.appendChild(h("th", { class: "r", text: "Tổng" }));
      if (!inputReview) trh.appendChild(h("th", { text: "" }));
      t.appendChild(h("thead", {}, [trh]));
      var tb = h("tbody");
      idx.slice(pg.start, pg.end).forEach(function (ri, n0) {
        var n = pg.start + n0; // vị trí trong TOÀN BỘ danh sách đã lọc (dán nhiều dòng tiếp sang trang sau đúng thứ tự)
        var ced = isCat ? cedit(key) : null, editing = !!ced && ced.ri === ri, r = ri === -1 ? ced.draft : db[key][ri], tr = h("tr", { class: editing ? "catedit" : "" }), tot = h("td", { class: "r" });
        var rowLocked = locked || (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0 && (db.sl_chuyenky || []).some(function (x) { return x.source === VAL.rowPeriod(key, r); }));
        tr.appendChild(h("td", { class: "t stk", text: n + 1 }));
        if (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0) tr.appendChild(h("td", { style: "position:sticky;left:36px;z-index:1;background:var(--bg,#fff)" }, rowLocked ? [h("span", { text: "Đã khóa" })] : [btn("Sửa", "ghost", function () { if (key === "bandam") bandamEntryForm(ri, draw); else inputRowEdit(key, def, ri, draw); }), btn("Xóa", "red ghost", function () { if (!need(editPerm) || !confirm("Xóa dòng này?")) return; if (!txn([key], function () { return !!commit(REPO.plan("remove", key, db[key][ri], null), { action: "Xóa dòng nhập liệu" }); })) { alert("Chưa xóa: " + lastTxnError); return; } draw(); })]));
        var updTot = function () { var s = 0; DAYS.forEach(function (d) { s += E.tachCong(r[d]).soCong; }); tot.textContent = s ? fmt(Math.round(s * 100) / 100) : ""; };
        vis.forEach(function (c, ci) {
          var isDay = /^\d\d$/.test(c), cls = isDay ? "day" : "";
          if (isDay) { var dt = new Date(st.nam, st.thang - 1, +c); if (dt.getMonth() === st.thang - 1 && dt.getDay() === 0) cls += " we"; }
          var nameTd;
          var inp = makeInput(c, r[c], function (v) {
            if (isCat) { // danh mục: chỉ cập nhật bản nháp, KHÔNG ghi dữ liệu
              if (!editing) { inp.value = r[c] == null ? "" : r[c]; return; }
              var nc = VAL.normCell(c, v); if (nc.error) { toast("⚠ " + c + ": " + nc.error); inp.value = ced.draft[c] == null ? "" : ced.draft[c]; return; }
              ced.draft[c] = nc.value; ced.dirty = true; ced.err = ""; if (inp.value !== nc.value) inp.value = nc.value;
              var st0 = tr.querySelector("[data-cat-state]"); if (st0) { st0.textContent = "● Có thay đổi chưa lưu"; st0.setAttribute("data-cat-state", "EDITING"); }
              return;
            }
            if (!need(editPerm)) { inp.value = r[c] == null ? "" : r[c]; return; }
            var n = VAL.normCell(c, v);
            if (n.error) { toast("⚠ " + c + ": " + n.error); inp.value = r[c] == null ? "" : r[c]; return; }
            var patch = {}; patch[c] = n.value;
            // Kỳ đã chốt, ô ngày sai, quyền, hồi tố (danh mục chồng lên kỳ đã chốt: chỉ Admin, cảnh báo + nhật ký) — repository kiểm tra
            var idE = ID.checkWrite(db, key, r, patch); if (idE) { alert(idE); inp.value = r[c] == null ? "" : r[c]; return; } // 1 người 1 Mã NV (CCCD)
            var pE = REPO.plan("update", key, r, patch, { what: "sửa dòng này", checkDup: CT_KEY[key] });
            if (!pE.ok) { alert(pE.msg); inp.value = r[c] == null ? "" : r[c]; return; }
            var dc = isDay && key === "chamcong" ? VAL.dayCell(c, n.value, r["Kỳ"]) : null;
            if (dc && dc.warn) toast("⚠ " + dc.warn);
            if (pE.retro) toast("⚠ Hồi tố: dòng này có hiệu lực trong kỳ đã chốt " + pE.impact.periods.map(GRD.label).join(", ") + " — bảng lương đã chốt không đổi");
            if (!commit(pE, { audit: theoKy ? false : "retro", action: "Sửa danh mục" })) { inp.value = r[c] == null ? "" : r[c]; return; }
            if (inp.value !== n.value && !isDay) inp.value = n.value;
            save(); refreshInputReview(); if (c === "Mã NV" && nameTd) nameTd.textContent = tenNV(n.value) || (n.value ? "⚠ chưa có trong Nhân sự" : ""); if (isDay) updTot();
          }, null, key);
          if (key === "chamcong" && isDay) { var lkc = LKMAP[attRecordId("chamcong", r) + "|" + c]; if (lkc) { inp.classList.add("has-src"); inp.title = "Nguồn: " + lkc.docId + " trang " + lkc.page + " — chuột phải (hoặc Alt+bấm) để xem ảnh/PDF gốc"; inp.addEventListener("contextmenu", function (ev) { ev.preventDefault(); openCellSource(lkc); }); inp.addEventListener("click", function (ev) { if (ev.altKey) { ev.preventDefault(); openCellSource(lkc); } }); } }
          inp.addEventListener("paste", function (ev) {
            if (isCat) return; // danh mục: dán nhiều dòng không được ghi ngầm; dùng Nhập Excel (có xem trước)
            var txt = (ev.clipboardData || window.clipboardData).getData("text");
            if (txt.indexOf("\t") < 0 && txt.indexOf("\n") < 0) return;
            ev.preventDefault();
            if (!need(editPerm)) return;
            if (!theoKy && GRD.closedPeriods(db).length && !can("retro.edit")) { alert("⛔ Đã có kỳ lương chốt — chỉ Admin được dán hàng loạt vào danh mục (có thể hồi tố)."); return; }
            var lines = txt.replace(/\r/g, "").replace(/\n$/, "").split("\n"), start = def.cols.indexOf(c);
            var bad = 0, skip = 0, retro = 0, retroKy = {};
            lines.forEach(function (ln, li) {
              var tgt = idx[n + li], cand = tgt == null ? newRow() : Object.assign({}, db[key][tgt]);
              ln.split("\t").forEach(function (v, k) { var col = def.cols[start + k]; if (col && col !== def.kyCol) { var nc = VAL.normCell(col, v); if (nc.error || (key === "chamcong" && /^\d\d$/.test(col) && VAL.dayCell(col, nc.value, cand["Kỳ"]).error)) { bad++; return; } cand[col] = nc.value; } });
              var cur0 = tgt == null ? null : db[key][tgt]; if (ID.checkWrite(db, key, cur0, cand)) { skip++; return; } // CCCD đã thuộc người khác: không ghi dòng này
              var pP = tgt == null ? REPO.plan("insert", key, null, cand, { what: "dán dữ liệu", checkDup: CT_KEY[key] }) : REPO.plan("update", key, db[key][tgt], cand, { what: "dán dữ liệu", checkDup: CT_KEY[key] });
              var rP = pP.ok ? REPO.apply(pP, { audit: theoKy ? false : "retro", action: "Dán dữ liệu" }) : pP;
              if (!rP.ok) { skip++; return; }
              // Danh mục chồng lên kỳ đã chốt: repository đã ghi nhật ký [HỒI TỐ] từng dòng — đếm lại để cảnh báo (không chặn)
              if (rP.retro) { retro++; rP.impact.periods.forEach(function (p) { retroKy[p] = 1; }); }
              if (tgt == null) idx.push(db[key].length - 1);
            });
            save(); draw(); toast("Đã dán " + (lines.length - skip) + " dòng" + (skip ? " · bỏ qua " + skip + " dòng (thuộc kỳ đã chốt / không đủ quyền / không hợp lệ)" : "") + (bad ? " · " + bad + " ô sai định dạng / ngày không hợp lệ — KHÔNG dán, kiểm tra lại" : "") +
              (retro ? " · ⚠ " + retro + " dòng hồi tố kỳ đã chốt " + Object.keys(retroKy).sort().map(GRD.label).join(", ") + " — bảng lương đã chốt không đổi" : ""));
          });
          if (isDay && key === "chamcong") {
            var paint = function () { inp.className = dayCls(inp.value, r["Hình thức công"]); };
            paint(); inp.addEventListener("input", paint); inp.addEventListener("change", function () { setTimeout(paint, 0); });
          }
          if (rowLocked || (isCat && !editing)) inp.disabled = true; if (isCat && editing) inp.classList.add("editing");
          // Ngày không có trong tháng (VD 31/09): không cho nhập; nếu dữ liệu cũ có giá trị thì vẫn cho sửa để xóa
          if (isDay && key === "chamcong" && +c > VAL.daysInKy(r["Kỳ"]) && (r[c] === "" || r[c] == null)) { inp.disabled = true; inp.title = "Tháng này không có ngày " + c; cls += " dis"; }
          var td = h("td", { class: cls }, [inp]); if (inp._dl) td.appendChild(inp._dl);
          if (key === "sanluong" && c === "Ngày cân") tr.appendChild(h("td", { class: "dis", text: fmtDate(r["Ngày cân gốc"] || r["Ngày cân"]) }));
          tr.appendChild(td);
          if (c === "Mã NV" && def.showName) { var nm = nameOf(r["Mã NV"]); nameTd = h("td", { class: "dis", text: nm || (r["Mã NV"] ? "⚠ chưa có trong Nhân sự" : "") }); tr.appendChild(nameTd); }
        });
        if (def.total) { updTot(); tr.appendChild(tot); }
        if (isCat) tr.appendChild(catActions(ri, r, editing));
        else if (!inputReview) tr.appendChild(h("td", { style: "text-align:center" }, [rowLocked ? null : btn("✕", "red ghost", function () {
          if (!need(editPerm)) return;
          var pX = REPO.plan("remove", key, db[key][ri], null, { what: "xóa dòng này" });
          if (!pX.ok) { alert(pX.msg); return; }
          if (!confirm("Xóa dòng này?" + (pX.retro ? "\n\n" + retroText(pX.impact) : ""))) return;
          if (!commit(pX, { audit: theoKy ? false : "always", action: "Xóa dòng danh mục" })) return;
          save(); draw(); updateNav();
        }, "Xóa dòng")]));
        tb.appendChild(tr);
      });
      // Bàn phím như Excel: Enter = xuống ô cùng cột dòng dưới, Shift+Enter = lên (ô đang gõ được ghi khi rời ô)
      tb.addEventListener("keydown", function (ev) {
        if (ev.key !== "Enter" || ev.target.tagName !== "INPUT") return;
        var td = ev.target.closest("td"), tr = td && td.parentNode; if (!tr) return;
        var col = Array.prototype.indexOf.call(tr.children, td), nx = ev.shiftKey ? tr.previousElementSibling : tr.nextElementSibling;
        var nxIn = nx && nx.children[col] && nx.children[col].querySelector("input:not([disabled])");
        if (nxIn) { ev.preventDefault(); nxIn.focus(); nxIn.select(); }
      });
      t.appendChild(tb); body.appendChild(t);
      if (pg.el && pg.end - pg.start > 20) body.appendChild(pager(key, idx.length, draw).el);
      updateNav();
    }
    draw();
    return wrap;
  }

