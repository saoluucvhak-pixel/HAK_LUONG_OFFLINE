  // ---------- Ô nhập dùng chung ----------
  function datalistFor(col, tableKey) {
    var src = { "Mã PB": ["dm_phongban", "Mã phòng ban"], "Mã CV": ["dm_chucvu", "Mã chức vụ"], "Mã tiền lương 1": ["dm_luong", "Mã lương"], "Mã tiền lương 2": ["dm_luong", "Mã lương"], "Mã tăng ca": ["dm_tangca", "Mã tăng ca"], "Mã phụ cấp": ["dm_phucap", "Mã phụ cấp"], "Mã hỗ trợ": ["dm_hotro", "Mã hỗ trợ"], "Mã hỗ trợ 2": ["dm_hotro", "Mã hỗ trợ"], "Mã BHXH": ["dm_baohiem", "Mã bảo hiểm"], "Mã GT_TNCN_BT": ["dm_giamtru", "Mã giảm trừ"], "Mã GT_TNCN_PT": ["dm_giamtru", "Mã giảm trừ"], "Mã thuế TNCN": ["dm_tncn", "Mã thuế TNCN"], "Mã TNCN": null };
    if (col === "Mã TNCN") return ["TNCN0", "TNCN1", "TNCN2"];
    if (col === "Hình thức công") { var hs = db.dm_cc.map(function (r) { return r["Hình thức công"]; }).filter(Boolean); return hs.length ? hs.filter(function (v, i) { return hs.indexOf(v) === i; }) : ["BT", "CL", "PN", "CC", "TC", "DC", "TRCH"]; }
    if (col === "Mã hình thức lương") return ["LTG", "LSP"];
    if (tableKey === "dm_congthuc" && col === "Loại") return ["OVERTIME", "ALLOWANCE", "SUPPORT"];
    if ((tableKey === "dm_congthuc" || tableKey === "dm_quychebu") && col === "Trạng thái") return ["Nháp", "Đã duyệt", "Hiệu lực", "Ngừng"];
    if (tableKey === "dm_quychebu" && col === "Cách bù") return BU_OPTS.map(function (o) { return o[0]; });
    var s = src[col]; if (!s) return null;
    var seen = {}, out = []; db[s[0]].forEach(function (r) { var v = r[s[1]]; if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }
  // ---------- Ô nhập ngày dd/MM/yyyy (V10): gõ tay được (01/02/2026, 1-2-2026, 01022026), kiểm tra ngày thật (năm nhuận), không lệch múi giờ ----------
  /** Dựng ô nhập ngày: hiển thị dd/MM/yyyy; ngày sai → viền đỏ + gợi ý, KHÔNG tự đổi thành ngày khác. */
  function dateField(iso, attrs) {
    var i = h("input", Object.assign({ type: "text", inputmode: "numeric", placeholder: "dd/MM/yyyy", maxlength: "10", autocomplete: "off", class: "dateinp" }, attrs || {}));
    var n0 = VAL.normDate(iso); i.value = n0 ? n0.slice(8, 10) + "/" + n0.slice(5, 7) + "/" + n0.slice(0, 4) : (iso || "");
    i.addEventListener("blur", function () { dateFix(i); });
    i.addEventListener("change", function () { dateFix(i); });
    return i;
  }
  /** "" nếu trống · "YYYY-MM-DD" nếu đúng · null nếu SAI (ngày không tồn tại). */
  // Cột tiền: hiển thị 15.000.000 / 1.250,5 (dấu chấm phân nghìn, phẩy thập phân), canh phải; lưu số thuần
  var MONEYCOLS = /^(Thưởng|Thu nhập (khác|từ|đến)|Trừ khác|Tạm ứng|Số tiền.*|Đơn giá.*|Lương (phụ|thỏa thuận)|Trừ nhanh|Tiền tăng ca.*|Mức tiền)$/;
  /** Gõ tới đâu chèn dấu chấm phân nghìn tới đó (giữ vị trí con trỏ). Chỉ đụng chuỗi chỉ gồm chữ số, hoặc đã nhóm 3 chữ số vừa gõ thêm 1 chữ số; "1.5" (thập phân) giữ nguyên. */
  var dlId = 0;
  function makeInput(col, value, onchange, opts, tableKey) {
    var isDate = DATECOLS.test(col), inp = isDate ? dateField(value == null ? "" : value) : h("input", { value: value == null ? "" : value });
    if (NUMCOLS.test(col) && !isDate) inp.className = "num";
    var isMoney = (MONEYCOLS.test(col) || VAL.isMoneyCol(col)) && !isDate;
    if (isMoney) { inp.className = "num money"; inp.value = moneyText(inp.value); inp.addEventListener("input", function () { moneyLive(inp); }); inp.addEventListener("blur", function () { inp.value = moneyText(inp.value); }); }
    var list = col === "Mã NV" ? "dsnv" : null, opts2 = list ? null : datalistFor(col, tableKey);
    if (list) inp.setAttribute("list", "dsnv");
    else if (opts2 && opts2.length) { var id = "dl" + (++dlId), dl = h("datalist", { id: id }); opts2.forEach(function (o) { dl.appendChild(h("option", { value: o })); }); inp.setAttribute("list", id); inp._dl = dl; }
    if (col === "KL hàng (Tấn)") inp.addEventListener("change", function () {
      var t = inp.value.trim(), bad = t !== "" && !/^\d+([.,]\d+)?$/.test(t) && !/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t);
      inp.classList.toggle("invalid", bad); if (bad) inp.title = "Khối lượng phải là số (ví dụ 12,5)"; else inp.title = "";
      if (/^\d{1,3}[.,]\d{3}$/.test(t)) toast("Ô tấn \"" + t + "\" được hiểu là " + t.replace(",", ".") + " tấn (dấu , hoặc . là dấu thập phân). Nếu ý bạn là hàng nghìn thì nhập " + t.replace(/[.,]/, "") + ".");
    });
    inp.addEventListener("change", function () { var iv = isDate ? dateIso(inp) : null, raw = inp.value.trim(); if (isMoney && raw && !isNaN(VAL.parseMoney(raw))) raw = String(VAL.parseMoney(raw)); onchange(isDate && iv ? iv : raw); });
    return inp;
  }
  function refreshNVList() {
    var dl = $("#dsnv"); if (!dl) { dl = h("datalist", { id: "dsnv" }); document.body.appendChild(dl); }
    dl.innerHTML = ""; db.nhanvien.forEach(function (r) { dl.appendChild(h("option", { value: r["Mã NV"], label: r["Họ và tên"] || "" })); });
  }

  // ---------- HAK Smart Filter (V10.3): lõi HAKCore.sf + giao diện HAKUI.smartFilter; cấu hình từng màn hình đặt cạnh màn hình đó ----------
  var SFC = window.HAKCore.sf;
  var sfUi = window.HAKUI.smartFilter.create({ h: h, btn: btn, toast: toast, askText: askText, dateField: dateField, dateIso: dateIso });
  /** Danh sách kỳ cho ô "Kỳ lương": các kỳ đã có trong kỳ lương, trong dữ liệu của bảng và kỳ đang chọn (mới → cũ). */
  function sfPeriods(rows, dateCol) {
    var ids = {}; (db.kyluong || []).forEach(function (k) { if (k.ky) ids[k.ky] = 1; });
    if (dateCol) (rows || []).forEach(function (r) { var d = LF.isoDay(r[dateCol]); if (d) ids[d.slice(0, 7)] = 1; }); ids[kyStr()] = 1;
    return Object.keys(ids).sort().reverse().map(function (k) { return { value: k, label: "Kỳ " + k.slice(5) + "/" + k.slice(0, 4) + (kyChot(k) ? " 🔒" : "") }; });
  }
  /** Ô chọn kỳ dạng "Kỳ MM/YYYY" (cùng kiểu bộ lọc Smart Filter) — dùng thay ô tháng gốc của trình duyệt (hiện tiếng Anh, không đồng bộ giao diện). */
  function kyPicker(value, attrs) {
    var ids = {}, sel = h("select", Object.assign({ "aria-label": "Kỳ lương" }, attrs || {}));
    (db.kyluong || []).forEach(function (k) { if (k.ky) ids[k.ky] = 1; });
    for (var d = -36; d <= 6; d++) { var dt = new Date(st.nam, st.thang - 1 + d, 1); ids[dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2)] = 1; }
    if (value) ids[value] = 1;
    Object.keys(ids).sort().reverse().forEach(function (k) { var o = h("option", { value: k, text: "Kỳ " + k.slice(5) + "/" + k.slice(0, 4) + (kyChot(k) ? " 🔒" : "") }); if (k === value) o.selected = true; sel.appendChild(o); });
    return sel;
  }
  function plfOf(key) { st.plf = st.plf || {}; return st.plf[key] = st.plf[key] || { pb: [], tu: "", den: "", thang: "", ky: "" }; }
  function catF(key) { st.catf = st.catf || {}; return st.catf[key] = st.catf[key] || { tt: "", hl: "" }; }
  /** Danh mục: lọc theo Trạng thái và Hiệu lực (đang / chưa / đã hết) tại ngày hôm nay — chỉ chọn dòng hiển thị. */
  var INPUT_FILTER = { psluong: "Ngày hạch toán", ungluong: "Ngày hạch toán", tiencom: "Ngày" };
  var INPUT_SUM = { psluong: ["Thưởng", "Thu nhập khác", "Trừ khác"], ungluong: ["Tạm ứng"], tiencom: ["Số suất cơm"] };
  function moneySourceTable(key, rows, editable, after) {
    return simpleTable(rows.map(function (r) {
      var line = {};
      S[key].cols.forEach(function (c) {
        line[c] = c === "Ngày hạch toán" ? fmtDate(r[c]) : INPUT_SUM[key].indexOf(c) >= 0 ? fmt(E.money(r[c])) : r[c];
      });
      if (editable && !kyChot(VAL.rowPeriod(key, r))) line["Thao tác"] = btn("Sửa dòng", "", function () {
        var index = db[key].indexOf(r);
        if (index < 0) { alert("Dòng đã thay đổi. Hãy mở lại đối soát."); return; }
        inputRowEdit(key, S[key], index, after);
      });
      return line;
    }), null, editable ? S[key].cols.concat("Thao tác") : S[key].cols);
  }

  function moneyInputReview(key, rows, nameOf) {
    var scope = inputScopeText(key);
    var groups = new Map(), table = h("table");
    var cols = ["Mã NV", "Họ và tên", "Số dòng"].concat(INPUT_SUM[key], ["Chi tiết"]);
    table.appendChild(h("thead", {}, [h("tr", {}, cols.map(function (c) { return h("th", { text: c }); }))]));
    var body = h("tbody");
    rows.forEach(function (r) {
      var code = String(r["Mã NV"] || "").trim();
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code).push(r);
    });
    Array.from(groups.keys()).sort().forEach(function (code) {
      var source = groups.get(code), name = nameOf(code);
      var cells = [code || "Thiếu mã NV", name, source.length].concat(INPUT_SUM[key].map(function (c) {
        return fmt(source.reduce(function (total, r) { return total + E.money(r[c]); }, 0));
      }));
      var tr = h("tr", {}, cells.map(function (v) { return h("td", { text: v }); }));
      tr.appendChild(h("td", {}, [btn("Xem dòng gốc", "", function () {
        modal(S[key].ten + " — " + (code || "Thiếu mã NV"), moneySourceTable(key, source, can("input.edit"), render), function (close) {
          return [btn("Về tổng hợp", "", function () { close(); moneyInputReview(key, rows, nameOf); }), btn("Đóng", "", close)];
        }, { wide: true });
      })]));
      body.appendChild(tr);
    });
    table.appendChild(body);
    var dataset = {}; dataset[key] = rows;
    var warnings = INT.check(dataset).filter(function (item) { return item.area === key && item.level === "Medium"; });
    var content = h("div", { "data-money-input-review": key }, [h("p", { class: "hint", text: "Theo bộ lọc: " + scope + " · " + rows.length + " dòng" })]);
    warnings.forEach(function (item) { content.appendChild(h("p", { class: "warn", text: item.msg })); });
    content.appendChild(h("div", { class: "tw" }, [table]));
    modal("Đối soát " + S[key].ten + " theo nhân viên", content, function (close) { return [btn("Đóng", "", close)]; }, { wide: true });
  }

  function inputF(key) { var m = (st.inf = st.inf || {}); return m[key] = m[key] || { pb: [], nv: [], tu: "", den: "" }; }
  var INDEX_PB = null;
  function inputPass(key, r) {
    var f = inputF(key), col = INPUT_FILTER[key], d = String(r[col] || "").slice(0, 10);
    if (f.tu || f.den) { if (!d || (f.tu && d < f.tu) || (f.den && d > f.den)) return false; }
    else if (!rowInKy(r, S[key])) return false;
    if (f.nv.length && f.nv.indexOf(r["Mã NV"]) < 0) return false;
    if (f.pb.length) { var pb = (INDEX_PB && INDEX_PB[r["Mã NV"]]); if (pb === undefined) pb = ""; if (!LF.inSet(f.pb, pb)) return false; }
    return true;
  }
  function inputPbMap() { var ix = HRM.buildIndex(db), m = {}; db.nhanvien.forEach(function (n) { m[n["Mã NV"]] = HRM.hienHanh(db, n["Mã NV"], null, ix).pb || ""; }); return m; }
  function inputScopeText(key) { var f = inputF(key), p = [(f.tu || f.den) ? (f.tu ? fmtDate(f.tu) : "…") + " → " + (f.den ? fmtDate(f.den) : "…") : "kỳ " + st.thang + "/" + st.nam]; if (f.pb.length) p.push("PB: " + f.pb.length + " mục"); if (f.nv.length) p.push("NV: " + f.nv.length + " người"); return p.join(" · "); }

  /** Có điều kiện ngày/tháng/kỳ riêng thì KHÔNG bó theo kỳ đang chọn trên thanh trên cùng. */
  function pcScopeText(key) {
    var f = (st.plf && st.plf[key]) || {}, p = [];
    if (f.tu || f.den) p.push((f.tu || "…") + " → " + (f.den || "…")); if (f.thang) p.push("tháng " + f.thang); if (f.ky) p.push("kỳ " + f.ky);
    if (f.pb && f.pb.length) p.push("PB: " + f.pb.map(function (x) { return x === LF.NONE ? "(không)" : x; }).join(", "));
    if (!p.length) p.push("kỳ " + st.thang + "/" + st.nam);
    return p.join(" · ");
  }
  function plfScoped(key) { var f = st.plf && st.plf[key]; return !!(f && (f.tu || f.den || f.thang || f.ky)); }

