  // ---------- Cấp phát thống nhất: sữa phúc lợi + bảo hộ lao động ----------
  // Một nơi lập và nhập phiếu (Nghiệp vụ nhân sự → Cấp phát). Số liệu và quy tắc nằm ở C.benefits (dùng chung với tiến trình chính).
  var CP_TYPES = [["all", "Tất cả"], ["milk", "Sữa phúc lợi"], ["ppe", "Bảo hộ lao động"]];
  var CP_STATUS = [{ value: "draft", label: "Nháp" }, { value: "issued", label: "Đã cấp" }, { value: "recalled", label: "Đã thu hồi" }];
  /** Trạng thái giao diện: bộ lọc, trang, màn hình đang mở và nơi quay lại được giữ trong phiên (st.cp, st.pg.capphat). */
  function cpState() { return (st.cp = st.cp || { type: "all", view: "list", returnView: "list", mode: "summary", bySize: false, f: SFC.empty(), draft: null, open: null, back: null }); }
  function cpDeptOf() {
    var ix = HRM.buildIndex(db);
    return function (ma, date) { var hh = HRM.hienHanh(db, ma, date, ix); return hh && hh.pb ? { code: hh.pb, name: hh.tenPB || hh.pb } : null; };
  }
  /** Bộ lọc dùng chung cho danh sách phiếu và báo cáo (HAK Smart Filter). */
  function cpFilters() {
    var s = SFC.normalize(cpState().f);
    return { q: s.q, tu: s.tu, den: s.den, thang: s.one.thang || "", dept: s.sel.pb || [], place: s.sel.dd || [], item: s.sel.mh || [], size: s.sel.co || [], status: s.sel.tt || [] };
  }
  function cpMilkItems() {
    var seen = {}, out = [];
    (db.benefitStandards || []).slice().sort(function (a, b) { return String(a.from).localeCompare(String(b.from)); }).forEach(function (rule) {
      rule.items.forEach(function (item) { seen[item.code] = { value: item.code, label: item.name, unit: item.unit }; });
    });
    Object.keys(seen).sort().forEach(function (k) { out.push(seen[k]); });
    return out;
  }
  function cpPpeItems(onlyActive) { return (db.benefitPpeItems || []).filter(function (item) { return !onlyActive || item.active !== false; }); }
  function cpItemsFor(type, keep) {
    if (type === "ppe") return cpPpeItems(true).concat(cpPpeItems(false).filter(function (item) { return item.active === false && item.code === keep; })).map(function (item) { return { value: item.code, label: item.name + (item.active === false ? " (ngừng sử dụng)" : ""), unit: item.unit, sizes: item.sizes || [] }; });
    return cpMilkItems().map(function (item) { return { value: item.value, label: item.label, unit: item.unit, sizes: [] }; });
  }
  function cpPeriods() {
    var set = {}; set[kyStr()] = 1;
    (db.benefitIssues || []).forEach(function (doc) { if (doc.period) set[doc.period] = 1; });
    return Object.keys(set).sort().reverse().map(function (k) { return { value: k, label: "Tháng " + k.slice(5) + "/" + k.slice(0, 4) }; });
  }
  function cpConfig(onApply, kept) {
    var distinct = function (fn) { return function () { var d = {}; (db.benefitIssues || []).forEach(function (doc) { var v = fn(doc); if (v) d[v] = 1; }); return Object.keys(d).sort(); }; };
    var all = function (x) { return x; };
    return {
      screenId: "capphat", searchPlaceholder: "🔍 Tìm mã phiếu, mã hoặc tên nhân viên (không cần dấu)…",
      fields: [
        { key: "tt", label: "Trạng thái", type: "multi", options: CP_STATUS },
        { key: "thang", label: "Tháng hưởng", type: "enum", options: function () { return cpPeriods().map(function (p) { return { value: p.value, label: p.label }; }); } },
        { key: "pb", label: "Phòng ban / tổ", type: "multi", options: function () { return (db.dm_phongban || []).map(function (r) { return { value: r["Mã phòng ban"], label: r["Tên phòng ban"] || r["Mã phòng ban"] }; }); } },
        { key: "dd", label: "Địa điểm", type: "multi", options: distinct(function (doc) { return doc.place; }) },
        { key: "mh", label: "Mặt hàng", type: "multi", options: function () { return cpMilkItems().map(function (i) { return { value: i.value, label: i.label + " (sữa)" }; }).concat(cpPpeItems(false).map(function (i) { return { value: i.code, label: i.name + " (bảo hộ)" }; })); } },
        { key: "co", label: "Kích cỡ", type: "multi", options: function () { var d = {}; cpPpeItems(false).forEach(function (i) { (i.sizes || []).forEach(function (sz) { d[sz] = 1; }); }); return Object.keys(d).sort().map(all); } }
      ],
      quickFields: ["q", "period", "tt", "pb"], advancedFields: ["q", "period", "thang", "tt", "pb", "dd", "mh", "co"],
      periods: cpPeriods, periodNoneLabel: "Ngày giao: tất cả", scopeFallback: function () { return "tất cả phiếu"; },
      state: { get: function () { return cpState().f; }, set: function (s) { cpState().f = s; } },
      dataSource: function () { return { kept: kept().kept, total: kept().total, unsupported: [] }; },
      onApply: function () { st.pg.capphat = 0; onApply(); }
    };
  }
  /** Mở phiếu gốc bằng cùng màn chi tiết; back = nơi quay lại (hồ sơ nhân viên, báo cáo…). Bộ lọc và trang trước đó được giữ nguyên. */
  function cpOpen(id, back) {
    var s = cpState(), doc = (db.benefitIssues || []).find(function (row) { return row.id === id; });
    if (!doc) { toast("Không tìm thấy phiếu " + id); return; }
    if (s.view !== "detail") s.returnView = s.view;
    s.view = "detail"; s.open = id; s.back = back || null;
    s.draft = doc.status === "draft" && can("hr.edit") && doc.maker === session.tenDangNhap.toLowerCase() ? cpDraftOf(doc) : null;
    st.tab = "capphat"; render();
  }
  function cpClose() {
    var s = cpState(), back = s.back;
    s.view = s.returnView || "list"; s.open = null; s.draft = null; s.back = null;
    if (back && back.tab) st.tab = back.tab;
    render();
  }
  function cpGoto(type) { var s = cpState(); s.type = type || "all"; s.view = "list"; s.open = null; s.draft = null; st.tab = "capphat"; render(); }
  function cpDraftOf(doc) {
    return { isNew: false, type: C.benefits.docType(doc), id: doc.id, date: doc.date, place: doc.place || "", purpose: doc.purpose || "", note: doc.note || "", maker: doc.maker,
      lines: (doc.lines || []).map(function (l) { return { employee: l.employee, item: l.item, size: l.size || "", quantity: l.quantity, note: l.note || "" }; }) };
  }
  function cpSuggestId(type) {
    var prefix = (type === "ppe" ? "BH-" : "SUA-") + HRM.today().replace(/-/g, ""), n = 1, ids = {};
    (db.benefitIssues || []).forEach(function (doc) { ids[doc.id] = 1; });
    while (ids[prefix + "-" + ("0" + n).slice(-2)]) n++;
    return prefix + "-" + ("0" + n).slice(-2);
  }
  function cpNewVoucher(type) {
    var s = cpState();
    if (s.view !== "detail") s.returnView = s.view;
    s.view = "detail"; s.open = "new"; s.back = null;
    s.draft = { isNew: true, type: type, id: cpSuggestId(type), date: HRM.today(), place: "", purpose: "", note: "", maker: session.tenDangNhap.toLowerCase(), lines: [] };
    render();
  }
  function cpStatusText(doc) { return C.benefits.STATUS_LABEL[doc.status] || doc.status; }

  // ---------- Danh sách phiếu ----------
  function cpVoucherList() {
    var s = cpState(), box = h("div"), bar = h("div", { class: "bar" }), tw = h("div", { class: "tw" }), kept = { kept: 0, total: 0 }, sf = null;
    if (can("hr.edit")) {
      CP_TYPES.slice(1).filter(function (t) { return s.type === "all" || s.type === t[0]; }).forEach(function (t) { bar.appendChild(btn("＋ Lập phiếu " + t[1].toLowerCase(), "pri", function () { cpNewVoucher(t[0]); })); });
      bar.appendChild(btn("⬆ Nhập Excel", "", function () { cpImportFlow(s.type === "all" ? "" : s.type); }, "Nhập phiếu từ file Excel mẫu: xem trước theo phiếu rồi lưu nháp"));
    }
    CP_TYPES.slice(1).filter(function (t) { return s.type === "all" || s.type === t[0]; }).forEach(function (t) { bar.appendChild(btn("📄 Tải mẫu " + t[1].toLowerCase(), "", function () { cpDownloadTemplate(t[0]); })); });
    box.appendChild(bar);
    var deptOf = cpDeptOf();
    sf = sfUi.mount(cpConfig(draw, function () { return kept; })); sf.cfg = null;
    box.appendChild(sf.el); box.appendChild(tw);
    function draw() {
      tw.innerHTML = "";
      var rows = C.benefits.listVouchers(db, { type: s.type, filters: cpFilters(), deptOf: deptOf });
      kept.kept = rows.length; kept.total = (db.benefitIssues || []).filter(function (doc) { return s.type === "all" || C.benefits.docType(doc) === s.type; }).length; sf.refresh();
      if (!rows.length) { tw.appendChild(h("div", { class: "empty", html: kept.total ? "Không có phiếu khớp bộ lọc." : "Chưa có phiếu cấp phát nào.<br>Bấm <b>＋ Lập phiếu</b> hoặc <b>⬆ Nhập Excel</b>." })); return; }
      var pg = pager("capphat", rows.length, draw); if (pg.el) tw.appendChild(pg.el);
      var cols = ["Mã phiếu", "Loại", "Ngày cấp", "Địa điểm", "Số người nhận", "Trạng thái", "Người lập", "Người xác nhận"], t = h("table"), tr = h("tr");
      cols.forEach(function (c) { tr.appendChild(h("th", { class: c === "Số người nhận" ? "r" : "", text: c })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      rows.slice(pg.start, pg.end).forEach(function (r) {
        var x = h("tr", { "data-cp-voucher": r.id });
        x.appendChild(h("td", {}, [btn(r.id, "ghost", function () { cpOpen(r.id); }, "Mở chi tiết phiếu")]));
        [C.benefits.LABEL[r.type], fmtDate(r.date), r.place, r.people, C.benefits.STATUS_LABEL[r.status] || r.status, r.maker, r.reviewer].forEach(function (v, i) { x.appendChild(h("td", { class: i === 3 ? "r" : "t", text: v })); });
        tb.appendChild(x);
      });
      t.appendChild(tb); tw.appendChild(h("div", { class: "tw" }, [t]));
    }
    draw();
    return box;
  }

  // ---------- Chi tiết phiếu: thông tin phiếu · người nhận · thao tác ----------
  function cpVoucherDetail() {
    var s = cpState(), doc = (db.benefitIssues || []).find(function (row) { return row.id === s.open; }) || null, d = s.draft, box = h("div", { "data-cp-detail": "1" });
    var type = d ? d.type : (doc ? C.benefits.docType(doc) : "milk"), me = session.tenDangNhap.toLowerCase();
    var back = h("div", { class: "bar" }, [btn("← " + (s.back && s.back.label ? "Quay lại " + s.back.label : "Quay lại danh sách"), "", cpClose)]);
    if (!doc && !d) { box.appendChild(back); box.appendChild(h("div", { class: "empty", text: "Không tìm thấy phiếu." })); return box; }
    box.appendChild(back);
    box.appendChild(h("h3", { text: (doc ? "Phiếu " + doc.id + " — " + cpStatusText(doc) : "Phiếu mới " + (type === "ppe" ? "bảo hộ lao động" : "sữa phúc lợi")) }));
    var editable = !!d;
    // ----- 1. Thông tin phiếu -----
    var info = h("div", { class: "card", "data-cp-zone": "info" }), grid = h("div", { class: "bar" });
    info.appendChild(h("h4", { text: "1. Thông tin phiếu" }));
    var field = function (label, key, kind, value, ro) {
      var input = h("input", { class: "i", type: kind || "text", value: value == null ? "" : value, "aria-label": label });
      if (!editable || ro) { input.setAttribute("readonly", "readonly"); }
      else input.addEventListener("change", function () { d[key] = input.value.trim(); if (key === "date") { redrawLines(); } });
      grid.appendChild(h("label", { class: "fld" }, [label, input])); return input;
    };
    field("Mã phiếu", "id", "text", d ? d.id : doc.id, d && !d.isNew);
    grid.appendChild(h("label", { class: "fld" }, ["Loại cấp phát", h("input", { class: "i", value: C.benefits.LABEL[type], readonly: "readonly", "aria-label": "Loại cấp phát" })]));
    field("Ngày giao", "date", "date", d ? d.date : doc.date);
    field("Địa điểm", "place", "text", d ? d.place : doc.place);
    field("Lý do", "purpose", "text", d ? d.purpose : doc.purpose);
    field("Ghi chú", "note", "text", d ? d.note : doc.note);
    if (doc) { grid.appendChild(h("label", { class: "fld" }, ["Người lập / xác nhận", h("input", { class: "i", value: (doc.maker || "") + (doc.reviewer ? " → " + doc.reviewer : ""), readonly: "readonly", "aria-label": "Người lập và xác nhận" })])); }
    info.appendChild(grid); box.appendChild(info);
    // ----- 2. Người nhận -----
    var recv = h("div", { class: "card", "data-cp-zone": "lines" }); recv.appendChild(h("h4", { text: "2. Danh sách người nhận" }));
    var linesHost = h("div", { class: "tw" });
    var deptOf = cpDeptOf();
    function itemInfo(code) { return cpItemsFor(type, code).filter(function (i) { return i.value === code; })[0] || null; }
    function redrawLines() {
      linesHost.innerHTML = "";
      var lines = d ? d.lines : (doc.lines || []), date = d ? d.date : doc.date, preview = null;
      if (type === "milk" && d && d.id && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
        var tmp = { id: d.id, type: "milk", date: d.date, period: d.date.slice(0, 7), lines: d.lines.filter(function (l) { return l.employee && l.item && l.quantity > 0; }).map(function (l) { return { employee: l.employee, item: l.item, quantity: Number(l.quantity) }; }) };
        try { preview = C.benefits.reviewIssue(Object.assign({}, db, { benefitIssues: (db.benefitIssues || []).filter(function (row) { return row.id !== d.id; }) }), tmp); } catch (e) { preview = null; }
      }
      var cols = ["Mã NV", "Họ và tên", "Tổ/Phòng ban tại ngày giao", "Mặt hàng", "Đơn vị"].concat(type === "ppe" ? ["Kích cỡ"] : [], ["Số lượng"], type === "milk" ? ["Định mức", "Đã cấp trước phiếu", "Còn trước", "Còn sau"] : [], ["Ghi chú"], editable ? [""] : []);
      var t = h("table", { "data-cp-lines": "1" }), tr = h("tr"); cols.forEach(function (c) { tr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      lines.forEach(function (l, idx) {
        var row = h("tr"), emp = (db.nhanvien || []).find(function (r) { return r["Mã NV"] === l.employee; });
        var dept = l.deptName != null ? l.deptName : ((deptOf(l.employee, date) || {}).name || "");
        var item = itemInfo(l.item), td = function (node) { row.appendChild(h("td", {}, [node])); }, text = function (v, cls) { row.appendChild(h("td", { class: cls || "t", text: v == null ? "" : v })); };
        if (editable) {
          var code = h("input", { class: "i", value: l.employee || "", list: "cp-employees", "aria-label": "Mã NV", style: "min-width:90px" });
          code.addEventListener("change", function () { l.employee = code.value.trim(); redrawLines(); }); td(code);
        } else text(l.employee);
        text(l.employeeName != null ? l.employeeName : (emp ? emp["Họ và tên"] : "")); text(dept);
        if (editable) {
          var sel = h("select", { "aria-label": "Mặt hàng" }, [h("option", { value: "", text: "Chọn mặt hàng" })].concat(cpItemsFor(type, l.item).map(function (i) { return h("option", { value: i.value, text: i.label }); })));
          sel.value = l.item || ""; sel.addEventListener("change", function () { l.item = sel.value; l.size = ""; redrawLines(); }); td(sel);
        } else text(l.itemName || (item ? item.label : l.item));
        text(l.unit || (item ? item.unit : ""));
        if (type === "ppe") {
          if (editable && item && item.sizes.length) {
            var sz = h("select", { "aria-label": "Kích cỡ" }, [h("option", { value: "", text: "Chọn cỡ" })].concat(item.sizes.map(function (v) { return h("option", { value: v, text: v }); })));
            sz.value = l.size || ""; sz.addEventListener("change", function () { l.size = sz.value; }); td(sz);
          } else text(l.size || (item && item.sizes.length ? "(cần chọn cỡ)" : ""));
        }
        if (editable) {
          var q = h("input", { class: "i", type: "number", min: "1", step: "1", value: l.quantity == null ? "" : l.quantity, "aria-label": "Số lượng", style: "width:80px" });
          q.addEventListener("change", function () { l.quantity = q.value === "" ? "" : Number(q.value); redrawLines(); }); td(q);
        } else text(l.quantity, "r");
        if (type === "milk") {
          var ent = preview && preview.entries.filter(function (e) { return e.employee === l.employee && e.item === l.item; })[0];
          [ent ? ent.allowance : "", ent ? ent.allowance - ent.before : "", ent ? ent.before : "", ent ? ent.after : ""].forEach(function (v) { text(v, "r"); });
        }
        if (editable) { var note = h("input", { class: "i", value: l.note || "", "aria-label": "Ghi chú" }); note.addEventListener("change", function () { l.note = note.value; }); td(note); td(btn("Xóa", "ghost", function () { d.lines.splice(idx, 1); redrawLines(); })); }
        else text(l.note);
        tb.appendChild(row);
      });
      t.appendChild(tb); linesHost.appendChild(lines.length ? t : h("div", { class: "empty", text: "Chưa có người nhận." }));
      if (preview && preview.issues.length) linesHost.appendChild(h("div", { class: "warn", "data-cp-issues": "1" }, preview.issues.map(function (m) { return h("div", { text: m }); })));
    }
    if (editable) {
      var list = h("datalist", { id: "cp-employees" }); (db.nhanvien || []).forEach(function (r) { list.appendChild(h("option", { value: r["Mã NV"], label: r["Họ và tên"] || "" })); }); recv.appendChild(list);
      var tools = h("div", { class: "bar" });
      tools.appendChild(btn("＋ Thêm dòng", "", function () { d.lines.push({ employee: "", item: "", size: "", quantity: 1, note: "" }); redrawLines(); }));
      var dept = h("select", { "aria-label": "Tổ cấp phát" }, [h("option", { value: "", text: "Chọn tổ / phòng ban" })].concat((db.dm_phongban || []).map(function (r) { return h("option", { value: r["Mã phòng ban"], text: r["Tên phòng ban"] || r["Mã phòng ban"] }); })));
      var item = h("select", { "aria-label": "Mặt hàng cấp theo tổ" }, [h("option", { value: "", text: "Mặt hàng" })].concat(cpItemsFor(type).map(function (i) { return h("option", { value: i.value, text: i.label }); })));
      var size = h("select", { "aria-label": "Kích cỡ cấp theo tổ" }, [h("option", { value: "", text: "Kích cỡ" })]);
      item.addEventListener("change", function () { size.innerHTML = ""; size.appendChild(h("option", { value: "", text: "Kích cỡ" })); var info0 = itemInfo(item.value); (info0 ? info0.sizes : []).forEach(function (v) { size.appendChild(h("option", { value: v, text: v })); }); });
      var qty = h("input", { class: "i", type: "number", min: "1", step: "1", value: "1", "aria-label": "Số lượng mỗi người", style: "width:90px" });
      tools.appendChild(h("span", { class: "hint", style: "margin:0", text: "Chọn nhanh theo tổ:" })); [dept, item].forEach(function (e) { tools.appendChild(e); });
      if (type === "ppe") tools.appendChild(size);
      tools.appendChild(qty);
      tools.appendChild(btn("Điền cho cả tổ", "", function () {
        var info0 = itemInfo(item.value), n = Number(qty.value);
        if (!dept.value || !item.value || !Number.isSafeInteger(n) || n <= 0 || (type === "ppe" && info0 && info0.sizes.length && !size.value)) { alert("Chọn tổ, mặt hàng" + (type === "ppe" ? ", kích cỡ (nếu có)" : "") + " và số lượng nguyên dương."); return; }
        var have = {}; d.lines.forEach(function (l) { have[l.employee + "|" + l.item + "|" + (l.size || "")] = 1; });
        var added = 0;
        (db.nhanvien || []).forEach(function (r) {
          var ma = r["Mã NV"]; if (r["Trạng thái"] && r["Trạng thái"] !== "Đang làm việc") return;
          var hh = HRM.hienHanh(db, ma, d.date); if (hh.pb !== dept.value || have[ma + "|" + item.value + "|" + (type === "ppe" ? size.value : "")]) return;
          if (type === "milk" && !C.benefits.entitlement(db, ma, d.date.slice(0, 7)).some(function (e) { return e.code === item.value && e.allowance > 0; })) return;
          d.lines.push({ employee: ma, item: item.value, size: type === "ppe" ? size.value : "", quantity: n, note: "" }); added++;
        });
        if (!added) alert("Không có thêm người phù hợp trong tổ."); else toast("Đã thêm " + added + " người — sửa từng dòng nếu cần.");
        redrawLines();
      }));
      recv.appendChild(tools);
    }
    recv.appendChild(linesHost); box.appendChild(recv); redrawLines();
    // ----- 3. Thao tác -----
    var act = h("div", { class: "card", "data-cp-zone": "actions" }), bar = h("div", { class: "bar" });
    act.appendChild(h("h4", { text: "3. Thao tác" }));
    var mode = C.workflowApproval.mode(db), canConfirm = doc && (mode === "roles" ? can("hr.approve") && doc.maker !== me : can("system.admin"));
    if (d) {
      bar.appendChild(btn("Lưu nháp", "pri", function () { cpSaveDraft(d); }));
      bar.appendChild(btn("Bỏ thay đổi", "", cpClose));
    }
    if (doc && doc.status === "draft") {
      if (canConfirm) bar.appendChild(btn("Xác nhận cấp phát", "pri", function () { cpTransition(doc, { status: "issued", reviewer: me, confirmedAt: new Date().toISOString() }, "Xác nhận cấp phát"); }));
      else bar.appendChild(h("span", { class: "hint", "data-cp-confirm-hint": "1", style: "margin:0", text: mode === "roles" ? "Cần người có quyền xác nhận khác người lập." : "Cần quyền Quản trị để xác nhận." }));
      if (can("hr.edit") || canConfirm) bar.appendChild(btn("Hủy phiếu nháp", "ghost", function () {
        askText("Hủy phiếu nháp " + doc.id, "Ghi rõ lý do hủy.", { label: "Lý do", required: true }, function (reason) { cpTransition(doc, { status: "recalled", recalledBy: me, reason: reason }, "Hủy phiếu nháp"); });
      }));
    }
    if (doc && doc.status === "issued" && canConfirm) bar.appendChild(btn("Thu hồi / điều chỉnh", "", function () { cpAdjustDialog(doc); }, "Thu hồi một phần hoặc toàn bộ" + (type === "ppe" ? ", đổi cỡ" : "")));
    if (doc && doc.status === "issued" && !canConfirm) bar.appendChild(h("span", { class: "hint", style: "margin:0", text: "Thu hồi / điều chỉnh cần người có quyền xác nhận" + (mode === "roles" ? " khác người lập." : ".") }));
    if (doc && doc.status === "recalled") bar.appendChild(h("span", { class: "hint", style: "margin:0", text: "Phiếu đã thu hồi" + (doc.reason ? ": " + doc.reason : "") + "." }));
    act.appendChild(bar);
    var history = (db.benefitAdjustments || []).filter(function (adj) { return doc && adj.ref === doc.id; });
    if (history.length) {
      act.appendChild(h("h4", { text: "Lịch sử thu hồi / điều chỉnh" }));
      act.appendChild(simpleTable(history.map(function (adj) {
        return { "Thời điểm": String(adj.at || "").replace("T", " ").slice(0, 16), "Người thao tác": adj.by, "Loại": adj.kind === "resize" ? "Đổi cỡ" : "Thu hồi", "Lý do": adj.reason,
          "Chi tiết": adj.lines.map(function (l) { return l.employee + " · " + l.item + (l.size ? " cỡ " + l.size : "") + " × " + l.quantity; }).join("; ") + (adj.to && adj.to.length ? " → " + adj.to.map(function (l) { return "cỡ " + l.size + " × " + l.quantity; }).join("; ") : "") };
      })));
    }
    box.appendChild(act);
    return box;
  }
  function cpTransition(doc, patch, label) {
    benefitSave("benefitIssues", (db.benefitIssues || []).map(function (row) { return row.id === doc.id ? Object.assign({}, row, patch) : row; }), label, doc.id, function () { render(); });
  }
  function cpSaveDraft(d) {
    var id = String(d.id || "").trim();
    if (!id) { alert("Nhập mã phiếu."); return; }
    if (!VAL.normDate(d.date)) { alert("Ngày giao không hợp lệ."); return; }
    var lines = d.lines.filter(function (l) { return l.employee || l.item || l.quantity || l.note; }).map(function (l) { return { employee: l.employee, item: l.item, size: l.size || "", quantity: Number(l.quantity), note: l.note || "" }; });
    if (!lines.length) { alert("Phiếu chưa có người nhận."); return; }
    var others = (db.benefitIssues || []).filter(function (row) { return row.id !== id; });
    if (d.isNew && others.length !== (db.benefitIssues || []).length) { alert("Mã phiếu đã tồn tại."); return; }
    var doc = C.benefits.buildVoucher(db, { type: d.type, id: id, date: d.date, place: d.place, purpose: d.purpose, note: d.note, lines: lines, maker: d.maker }, cpDeptOf());
    if (d.type === "milk") doc.lines.forEach(function (l) { delete l.size; });
    var check = C.benefits.reviewIssue(Object.assign({}, db, { benefitIssues: others }), doc);
    if (check.issues.length) { modal("Phiếu chưa hợp lệ", h("div", {}, check.issues.map(function (m) { return h("p", { class: "warn", text: m }); })), function (close) { return [btn("Đóng", "", close)]; }); return; }
    var rows = d.isNew ? (db.benefitIssues || []).concat(doc) : (db.benefitIssues || []).map(function (row) { return row.id === id ? doc : row; });
    benefitSave("benefitIssues", rows, d.isNew ? "Lập phiếu cấp phát" : "Sửa phiếu nháp cấp phát", id, function () { var s = cpState(); s.open = id; s.draft = null; toast("Đã lưu nháp " + id); cpOpen(id, s.back); });
  }

  // ---------- Thu hồi một phần / đổi cỡ ----------
  function cpAdjustDialog(doc) {
    var type = C.benefits.docType(doc), rows = C.benefits.recallable(db, doc.id).filter(function (r) { return r.remaining > 0; }), me = session.tenDangNhap.toLowerCase();
    if (!rows.length) { alert("Phiếu này đã thu hồi hết."); return; }
    var table = h("table", { "data-cp-adjust": "1" }), tr = h("tr");
    ["Mã NV", "Họ và tên", "Mặt hàng", "Kích cỡ", "Đã cấp", "Đã thu hồi", "Còn lại", "Thu hồi", type === "ppe" ? "Đổi sang cỡ" : ""].filter(Boolean).forEach(function (c) { tr.appendChild(h("th", { text: c })); });
    table.appendChild(h("thead", {}, [tr]));
    var controls = [], tb = h("tbody");
    rows.forEach(function (r) {
      var line = doc.lines.filter(function (l) { return l.employee === r.employee && l.item === r.item && (l.size || "") === r.size; })[0] || {}, row = h("tr");
      var qty = h("input", { class: "i", type: "number", min: "0", max: String(r.remaining), step: "1", value: "0", "aria-label": "Số thu hồi " + r.employee + " " + r.item, style: "width:80px" });
      var newSize = null, catalog = (db.benefitPpeItems || []).filter(function (i) { return i.code === r.item; })[0];
      [r.employee, line.employeeName || tenNV(r.employee), line.itemName || r.item, r.size, r.issued, r.recalled, r.remaining].forEach(function (v, i) { row.appendChild(h("td", { class: i >= 4 ? "r" : "t", text: v })); });
      row.appendChild(h("td", {}, [qty]));
      if (type === "ppe") {
        newSize = h("select", { "aria-label": "Đổi sang cỡ " + r.employee + " " + r.item }, [h("option", { value: "", text: "— không đổi —" })].concat(((catalog && catalog.sizes) || []).filter(function (v) { return v !== r.size; }).map(function (v) { return h("option", { value: v, text: v }); })));
        row.appendChild(h("td", {}, [newSize]));
      }
      controls.push({ r: r, qty: qty, newSize: newSize }); tb.appendChild(row);
    });
    table.appendChild(tb);
    var reason = h("input", { class: "i", "aria-label": "Lý do thu hồi hoặc điều chỉnh", placeholder: "Lý do (bắt buộc)", style: "min-width:320px" });
    modal("Thu hồi / điều chỉnh phiếu " + doc.id, h("div", {}, [h("p", { class: "hint", text: "Nhập số thu hồi cho từng dòng (không vượt số còn lại)." + (type === "ppe" ? " Chọn cỡ mới để ghi hai lượt: thu hồi cỡ cũ và cấp cỡ mới." : "") }), h("div", { class: "tw" }, [table]), h("label", { class: "fld" }, ["Lý do", reason])]), function (close) {
      return [btn("Hủy", "", close), btn("Ghi thu hồi / điều chỉnh", "pri", function () {
        var recall = [], resizeOut = [], resizeIn = [], why = reason.value.trim();
        controls.forEach(function (c) {
          var n = Number(c.qty.value); if (!n) return;
          if (!Number.isSafeInteger(n) || n < 0) { recall.push({ bad: true }); return; }
          var line = { employee: c.r.employee, item: c.r.item, size: c.r.size, quantity: n };
          if (c.newSize && c.newSize.value) { resizeOut.push(line); resizeIn.push({ employee: c.r.employee, item: c.r.item, size: c.newSize.value, quantity: n }); } else recall.push(line);
        });
        if (recall.some(function (l) { return l.bad; })) { alert("Số thu hồi phải là số nguyên dương."); return; }
        if (!why) { alert("Ghi lý do thu hồi hoặc điều chỉnh."); return; }
        if (!recall.length && !resizeOut.length) { alert("Chưa nhập số thu hồi nào."); return; }
        var seq = (db.benefitAdjustments || []).filter(function (a) { return a.ref === doc.id; }).length, at = new Date().toISOString(), made = [];
        var make = function (kind, lines, to) { seq++; var a = { id: "DC-" + doc.id + "-" + ("0" + seq).slice(-2), ref: doc.id, kind: kind, reason: why, by: me, at: at, lines: lines }; if (to) a.to = to; made.push(a); };
        if (recall.length) make("recall", recall);
        if (resizeOut.length) make("resize", resizeOut, resizeIn);
        benefitSave("benefitAdjustments", (db.benefitAdjustments || []).concat(made), "Thu hồi / điều chỉnh phiếu phúc lợi", doc.id + " · " + why, function () { close(); render(); });
      })];
    }, { wide: true });
  }

  // ---------- Danh mục đồ bảo hộ lao động ----------
  function ppeCatalog() {
    var body = h("div", { "data-cp-ppe": "1" }), q = benefitField("Lọc mã, tên hoặc nhóm", "text", st.ppeQuery || "");
    q.input.addEventListener("change", function () { st.ppeQuery = q.input.value; render(); });
    body.appendChild(q.field);
    var items = cpPpeItems(false).filter(function (i) { return !st.ppeQuery || fold([i.code, i.name, i.group].join(" ")).indexOf(fold(st.ppeQuery)) >= 0; });
    var used = {}; (db.benefitIssues || []).forEach(function (doc) { (doc.lines || []).forEach(function (l) { used[l.item] = 1; }); });
    var rows = items.map(function (i) {
      var row = { "Mã vật tư": i.code, "Tên vật tư": i.name, "Nhóm hàng": i.group, "Đơn vị": i.unit, "Quy cách": i.spec || "", "Kích cỡ": (i.sizes || []).join(", "), "Trạng thái": i.active === false ? "Ngừng sử dụng" : "Đang sử dụng", "Đã cấp": used[i.code] ? "Có" : "" };
      if (can("dm.edit")) row["Thao tác"] = btn("Sửa", "ghost", function () { ppeDialog(i); });
      return row;
    });
    if (can("dm.edit")) body.appendChild(btn("＋ Thêm vật tư", "pri", function () { ppeDialog(null); }));
    body.appendChild(h("p", { class: "hint", text: "Vật tư đã cấp chỉ ngừng sử dụng (không xóa) để phiếu cũ vẫn tra cứu được. Đổi tên vật tư không làm đổi báo cáo cũ: phiếu giữ tên tại ngày cấp. Phạm vi đợt này: ghi nhận cấp phát thực tế; tồn kho và chu kỳ thay thế cần quy chế riêng." }));
    body.appendChild(simpleTable(rows));
    return body;
  }
  function ppeDialog(item) {
    var isNew = !item, code = benefitField("Mã vật tư", "text", item ? item.code : ""), name = benefitField("Tên vật tư", "text", item ? item.name : "");
    var group = h("select", { "aria-label": "Nhóm hàng" }, C.benefits.GROUPS.concat(item && C.benefits.GROUPS.indexOf(item.group) < 0 ? [item.group] : []).concat(["Nhóm khác"]).map(function (g) { return h("option", { value: g, text: g }); }));
    group.value = item ? item.group : C.benefits.GROUPS[0];
    var other = benefitField("Tên nhóm bổ sung", "text", ""), unit = benefitField("Đơn vị tính", "text", item ? item.unit : ""), spec = benefitField("Quy cách", "text", item ? item.spec || "" : ""), sizes = benefitField("Kích cỡ hợp lệ (cách nhau dấu phẩy; để trống nếu không có)", "text", item ? (item.sizes || []).join(", ") : "");
    var active = h("input", { type: "checkbox", "aria-label": "Đang sử dụng" }); active.checked = item ? item.active !== false : true;
    if (!isNew) code.input.setAttribute("readonly", "readonly");
    modal(isNew ? "Thêm vật tư bảo hộ" : "Sửa vật tư " + item.code, h("div", {}, [code.field, name.field, h("label", { class: "fld" }, ["Nhóm hàng", group]), other.field, unit.field, spec.field, sizes.field, h("label", { class: "chk" }, [active, " Đang sử dụng"])]), function (close) {
      return [btn("Hủy", "", close), btn("Lưu vật tư", "pri", function () {
        var row = { code: code.input.value.trim(), name: name.input.value.trim(), group: group.value === "Nhóm khác" ? other.input.value.trim() : group.value, unit: unit.input.value.trim(), spec: spec.input.value.trim(),
          active: active.checked, sizes: sizes.input.value.split(",").map(function (v) { return v.trim(); }).filter(Boolean) };
        var rows = (db.benefitPpeItems || []);
        benefitSave("benefitPpeItems", isNew ? rows.concat(row) : rows.map(function (r) { return r.code === item.code ? row : r; }), isNew ? "Thêm vật tư bảo hộ" : "Sửa vật tư bảo hộ", row.code, function () { close(); render(); });
      })];
    }, { wide: true });
  }
  /** Hồ sơ nhân viên: các phiếu đã có của người này, mở đúng phiếu gốc và quay lại hồ sơ. */
  function cpEmployeeVouchers(ma, back) {
    var rows = (db.benefitIssues || []).filter(function (doc) { return (doc.lines || []).some(function (l) { return l.employee === ma; }); }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var box = h("div", { "data-cp-employee": ma }, [h("h4", { text: "Phiếu cấp phát của nhân viên" })]);
    if (!rows.length) { box.appendChild(h("div", { class: "empty", text: "Chưa có phiếu cấp phát." })); return box; }
    box.appendChild(simpleTable(rows.slice(0, 20).map(function (doc) {
      var mine = doc.lines.filter(function (l) { return l.employee === ma; });
      return { "Mã phiếu": btn(doc.id, "ghost", function () { cpOpen(doc.id, back); }), "Loại": C.benefits.LABEL[C.benefits.docType(doc)], "Ngày giao": fmtDate(doc.date), "Mặt hàng": mine.map(function (l) { return (l.itemName || l.item) + (l.size ? " cỡ " + l.size : "") + " × " + l.quantity; }).join("; "), "Trạng thái": cpStatusText(doc) };
    })));
    return box;
  }
