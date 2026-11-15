  // ---------- NHÂN SỰ (mô hình QL_NHANSU) ----------
  var HR = HRM.HR;
  function refOptions(ref) {
    var c = HRM.REFS[ref], seen = {}, out = [];
    (db[ref] || []).forEach(function (r) { var v = r[c[0]]; if (v && !seen[v]) { seen[v] = 1; out.push([v, r[c[1]] || ""]); } });
    return out;
  }
  function dispVal(f, v) {
    if (v === "" || v == null) return "";
    if (f.t === "ref") return v + (HRM.refName(db, f.ref, v) !== v ? " — " + HRM.refName(db, f.ref, v) : "");
    if (f.t === "multi") return HRM.split(v).join(", ");
    if (f.t === "money") return fmt(E.money(v));
    if (f.t === "date") { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v)); if (m) return m[3] + "/" + m[2] + "/" + m[1]; }
    return String(v);
  }
  // Tạo các ô nhập cho danh sách field; trả về hàm lấy dữ liệu
  function fieldInputs(container, fields, data) {
    var getters = {};
    fields.forEach(function (f) {
      var v = data[f.k] == null ? "" : String(data[f.k]), el, wrap = h("div", { class: "fld" + (f.t === "area" || f.t === "multi" ? " wide" : ""), "data-k": f.k });
      wrap.appendChild(h("label", { text: (f.label || f.k) + (f.req ? " *" : "") + (f.hint ? " — " + f.hint : "") }));
      if (f.t === "sel" || f.t === "yesno" || f.t === "ref") {
        el = h("select");
        el.appendChild(h("option", { value: "", text: "— chọn —" }));
        var opts = f.t === "ref" ? refOptions(f.ref) : (f.t === "yesno" ? [["Có", ""], ["Không", ""]] : f.o.map(function (o) { return [o, ""]; }));
        if (v && !opts.some(function (o) { return o[0] === v; })) opts.push([v, "(không có trong danh mục)"]);
        opts.forEach(function (o) { el.appendChild(h("option", { value: o[0], text: o[1] ? o[0] + " — " + o[1] : o[0] })); });
        el.value = v;
        getters[f.k] = function () { return el.value; };
      } else if (f.t === "multi") {
        el = h("div", { class: "chips" });
        var cur = HRM.split(v), opts2 = refOptions(f.ref);
        cur.forEach(function (c) { if (!opts2.some(function (o) { return o[0] === c; })) opts2.push([c, "(không có trong danh mục)"]); });
        var boxes = opts2.map(function (o) {
          var cb = h("input", { type: "checkbox", value: o[0] }); cb.checked = cur.indexOf(o[0]) >= 0;
          el.appendChild(h("label", { class: "chip" }, [cb, document.createTextNode(" " + o[0] + (o[1] ? " — " + o[1] : ""))]));
          return cb;
        });
        if (!opts2.length) el.appendChild(h("span", { class: "hint", text: "Danh mục trống — vào Danh mục để thêm" }));
        getters[f.k] = function () { return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }).join(", "); };
      } else if (f.t === "area") {
        el = h("textarea", { rows: 2 }); el.value = v; getters[f.k] = function () { return el.value.trim(); };
      } else {
        el = f.t === "date" ? dateField(v) : h("input", { value: v });
        if (f.t === "month") el.type = "month";
        if (f.t === "num" || f.t === "money" || f.t === "pct") el.className = "num";
        if (f.t === "money") { el.addEventListener("blur", function () { var n = VAL.parseMoney(el.value); if (el.value && !isNaN(n)) el.value = fmt(n); }); if (v) { var n0v = VAL.parseMoney(v); el.value = isNaN(n0v) ? v : fmt(n0v); } }
        getters[f.k] = function () { var x = el.value.trim(); if (f.t === "date" && x) { var di = VAL.normDate(x); return di === null ? x : di; } return f.t === "money" && x ? VAL.normMoney(x) : x; };
      }
      wrap.appendChild(el); container.appendChild(wrap);
    });
    return function () { var o = {}; Object.keys(getters).forEach(function (k) { o[k] = getters[k](); }); return o; };
  }

  // ---------- Kiểm soát thay đổi ảnh hưởng kỳ lương đã chốt (core/period-guard.js) ----------
  /** Hỏi trước khi ghi 1 thay đổi. Trả true nếu được phép ghi. */
  function guardChange(table, before, after, what) {
    var imp = GRD.impactChange(db, table, before, after);
    if (imp.kind === "locked") { alert("Không thể " + what + ": dữ liệu thuộc kỳ " + imp.periods.map(GRD.label).join(", ") + " đã chốt lương. Hãy mở chốt trước."); return false; }
    if (imp.kind === "retro" && !can("retro.edit")) { alert("⛔ Không thể " + what + ": dữ liệu có hiệu lực trong kỳ lương đã chốt " + imp.periods.map(GRD.label).join(", ") + ".\nChỉ Admin được sửa dữ liệu hồi tố (quy tắc Q-14)."); return false; }
    if (imp.kind === "retro") return confirm(what.charAt(0).toUpperCase() + what.slice(1) + "?\n\n" + retroText(imp) + "\n\nVẫn lưu thay đổi?");
    return true;
  }
  /** Ghi nhật ký thay đổi có trước/sau; đánh dấu HỒI TỐ nếu chạm kỳ đã chốt. */
  function auditChange(action, table, before, after, ident) {
    var imp = GRD.impactChange(db, table, before, after), ch = GRD.changedFields(before, after);
    audit(action, (ALL[table] ? ALL[table].ten : table) + (ident ? " · " + ident : "") + (ch.length ? " · " + ch.slice(0, 12).join("; ") : "") +
      (imp.kind === "retro" ? " · [HỒI TỐ kỳ đã chốt " + imp.periods.map(GRD.label).join(", ") + "]" : ""));
  }

  /** Khung "Sẽ lưu N thay đổi": so giá trị đang nhập với bản cũ, tô viền ô đã đổi. Trả hàm cập nhật. */
  function liveDiff(body, get, fields, orig) {
    var box = h("section", { class: "diff none", "aria-live": "polite" }), heading = h("div"), list = h("dl"), entries = {}, signature = null;
    box.appendChild(heading); box.appendChild(list);
    var show = function (f, v) { var s = dispVal(f, v); return s === "" ? "(trống)" : s; };
    var upd = function () {
      var d = get(), ch = fields.filter(function (f) { return String(orig[f.k] == null ? "" : orig[f.k]) !== String(d[f.k] == null ? "" : d[f.k]); });
      body.querySelectorAll(".fld[data-k]").forEach(function (w) { w.classList.toggle("chg", ch.some(function (f) { return f.k === w.getAttribute("data-k"); })); });
      var next = JSON.stringify(ch.map(function (f) { return [f.k, d[f.k]]; }));
      if (signature === next) return ch;
      signature = next;
      var scroller = body.closest(".bd"), scrollTop = scroller ? scroller.scrollTop : 0;
      box.className = "diff" + (ch.length ? "" : " none");
      var label = ch.length ? "Sẽ lưu " + ch.length + " thay đổi" : "Chưa có thay đổi nào";
      if (heading.textContent !== label) heading.textContent = label;
      Object.keys(entries).forEach(function (key) { if (!ch.some(function (f) { return f.k === key; })) { entries[key].row.remove(); delete entries[key]; } });
      ch.forEach(function (f) {
        var entry = entries[f.k];
        if (!entry) {
          var value = h("ins", { text: show(f, d[f.k]) });
          var row = h("div", {}, [h("dt", { text: f.label || f.k }), h("dd", {}, [h("del", { text: show(f, orig[f.k]) }), " → ", value])]);
          entry = entries[f.k] = { row: row, value: value }; list.appendChild(row);
        }
        var text = show(f, d[f.k]); if (entry.value.textContent !== text) entry.value.textContent = text;
      });
      if (scroller) scroller.scrollTop = scrollTop;
      return ch;
    };
    body.addEventListener("input", upd); body.addEventListener("change", upd);
    body.appendChild(box); upd();
    return upd;
  }
  // Bảng hồ sơ lưu theo "Hiệu lực từ" (giữ lịch sử): khi sửa được chọn "Thông tin mới" (thêm bản mới) hay "Sửa lỗi nhập sai" (ghi đè)
  var VERSIONED = { canhan: 1, thanhtoan: 1 };
  function hrForm(key, row, base, onDone) {
    var rowIndex = row ? db[key].indexOf(row) : -1;
    var cfg = HR[key], isNew = !row, data = Object.assign({}, base || {}, row || {});
    if (isNew && cfg.defaults) Object.assign(data, cfg.defaults(base));
    var body = h("div");
    if (cfg.desc) body.appendChild(h("div", { class: "hint", text: cfg.desc }));
    var ver = !isNew && VERSIONED[key], mode = { v: ver ? "new" : "fix" };
    if (ver) {
      var mk = function (val, title, sub) {
        var r = h("input", { type: "radio", name: "hrmode", value: val }); r.checked = mode.v === val;
        r.addEventListener("change", function () { mode.v = val; var hl = body.querySelector('.fld[data-k="Hiệu lực từ"] input'); if (hl && val === "new" && hl.value === (row["Hiệu lực từ"] || "")) hl.value = HRM.today(); if (hl && val === "fix") hl.value = row["Hiệu lực từ"] || ""; if (upd) upd(); });
        return h("label", {}, [r, h("span", {}, [h("b", { text: title }), h("small", { text: sub })])]);
      };
      body.appendChild(h("div", { class: "mode", role: "radiogroup", "aria-label": "Loại thay đổi" }, [
        mk("new", "Thông tin mới", "Đổi CCCD, địa chỉ, tài khoản… — thêm bản mới từ ngày 'Hiệu lực từ', bản cũ giữ làm lịch sử"),
        mk("fix", "Sửa lỗi nhập sai", "Ghi đè bản này; nhật ký vẫn lưu giá trị cũ")]));
      data["Hiệu lực từ"] = HRM.today();
    }
    // Q-24: không có quyền xem lương → không hiện ô lương (người này cũng không có quyền lưu hồ sơ)
    var fs = canSeePay() ? cfg.f : cfg.f.filter(function (f) { return !HRM.isPayField(key, f.k); });
    if (fs.length < cfg.f.length) body.appendChild(h("div", { class: "hint", text: "🔒 Các ô lương được ẩn vì vai trò của bạn không có quyền xem lương." }));
    var g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, fs, data), upd = null;
    if (!isNew) upd = liveDiff(body, get, fs, Object.assign({}, row));
    // Bản ghi bị khóa (Q-15 phụ lục đã dùng cho kỳ chốt / kỳ đã chốt): báo ngay khi mở, không đợi bấm Lưu
    var p0 = isNew ? null : REPO.plan("update", key, row, {}, { what: "sửa " + cfg.ten });
    if (p0 && !p0.ok && (p0.code === "frozen" || p0.code === "locked")) body.insertBefore(h("div", { class: "locked", text: p0.msg }), body.firstChild);
    modal((isNew ? "Thêm: " : "Sửa: ") + cfg.ten, body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu", "pri", function () {
        var d = get(), miss = missingReq(fs, d);
        if (miss.length) { alert("Cần nhập: " + miss.join(", ")); return; }
        var bad = fs.filter(function (f) { return f.t === "money" && d[f.k] && isNaN(VAL.parseMoney(d[f.k])); }).map(function (f) { return f.label || f.k; });
        if (bad.length) { alert("Số tiền không hợp lệ: " + bad.join(", ")); return; }
        if (!need("hr.edit", "sửa hồ sơ nhân sự")) return;
        var asNew = ver && mode.v === "new";
        if (asNew && !(String(d["Hiệu lực từ"] || "") > String(row["Hiệu lực từ"] || ""))) { alert("Thông tin mới phải có 'Hiệu lực từ' SAU bản đang có (" + dispVal({ t: "date" }, row["Hiệu lực từ"]) + ").\nNếu chỉ sửa lỗi nhập sai của bản này, chọn 'Sửa lỗi nhập sai'."); return; }
        if (!isNew && !asNew && upd && !upd().length) { if (p0 && !p0.ok && (p0.code === "frozen" || p0.code === "locked")) { alert(p0.msg); return; } close(); return; }
        // Trùng khóa, Q-15, kỳ chốt / hồi tố, đổi Số HĐLĐ kéo theo phụ lục: repository kiểm tra HẾT rồi mới ghi (A3-01)
        var vals = isNew ? Object.assign({}, base || {}, d) : asNew ? Object.assign({}, row, d) : d;
        if (asNew) delete vals._id;
        if (key === "nghiphep") {
          var quota = C.leaveReconciliation.checkRequest(db, Object.assign({}, row || {}, vals), isNew ? null : row);
          if (quota) { alert(quota); return; }
        }
        var idF = ID.checkWrite(db, key, isNew || asNew ? null : row, vals); if (idF) { alert(idF); return; } // 1 người 1 Mã NV (CCCD)
        var pF = REPO.plan(isNew || asNew ? "insert" : "update", key, isNew || asNew ? null : row, vals, { what: (isNew ? "thêm " : asNew ? "cập nhật thông tin mới — " : "sửa ") + cfg.ten, checkDup: true });
        if (!pF.ok) { alert(pF.msg); return; }
        if (pF.retro && !confirm(pF.confirmMsg)) return;
        var tables = Object.keys(HRT).concat([key]).filter(function (t,i,a) { return a.indexOf(t) === i; });
        if (!txn(tables, function () { return !!commit(pF, { action: isNew ? "Thêm hồ sơ" : asNew ? "Cập nhật hồ sơ (bản mới)" : "Sửa hồ sơ" }); })) {
          if (rowIndex >= 0) row = db[key][rowIndex];
          alert("Chưa lưu hồ sơ: " + lastTxnError + ". Form giữ nguyên để bạn sửa hoặc thử lại."); return;
        }
        close(); toast(asNew ? "Đã thêm thông tin mới từ " + dispVal({ t: "date" }, d["Hiệu lực từ"]) + " — bản cũ giữ làm lịch sử" : "Đã lưu"); (onDone || render)();
      })];
    }, { drawer: true, stable: true });
  }
  // Mặc định khi thêm mới phụ lục: chép từ phụ lục gần nhất
  HR.chitiethd.defaults = function (base, effective) {
    var prev = (db.chitiethd || []).filter(function (r) { return r["Mã NV"] === base["Mã NV"] && r["Số HĐLĐ"] === base["Số HĐLĐ"]; })
      .sort(function (a, b) { return String(a["Hiệu lực từ"]) < String(b["Hiệu lực từ"]) ? -1 : 1; });
    var last = effective || prev[prev.length - 1], o = last ? Object.assign({}, last) : {};
    delete o._id; delete o["Ghi chú"];
    o["Loại phụ lục"] = last ? "Phụ lục sửa đổi" : "Hợp đồng gốc";
    o["Mã công tác"] = base["Số HĐLĐ"] + "-PL" + ("0" + (prev.length + 1)).slice(-2);
    o["Hiệu lực từ"] = last ? HRM.today() : ((db.hopdong.filter(function (r) { return r["Mã NV"] === base["Mã NV"] && r["Số HĐLĐ"] === base["Số HĐLĐ"]; })[0] || {})["Ngày vào làm"] || HRM.today());
    if (!last) { o["HTTT"] = "Chuyển khoản"; o["Mã hình thức lương"] = "LTG"; }
    return o;
  };
  HR.hopdong.defaults = function (base) {
    var n = db.hopdong.filter(function (r) { return r["Mã NV"] === base["Mã NV"]; }).length + 1;
    return { "Số HĐLĐ": base["Mã NV"] + "/HĐ" + ("0" + n).slice(-2), "Ngày vào làm": HRM.today(), "Hình thức HĐLĐ": n === 1 ? "Thử việc" : "Xác định thời hạn" };
  };

