  // ---------- Cài đặt (V10): công thức lương + phương pháp bù sản lượng — KHÔNG nằm trong Danh mục ----------
  var DM_CAI_DAT = { dm_congthuc: 1, dm_quychebu: 1, dm_congthuc_kiemthu: 1 };
  /** Mô tả 2 phương pháp bù sản lượng chính thức (V10). Mã lưu giữ nguyên "to" / "daihiep" để không đổi engine. */
  var BU_METHODS = [
    { ma: "to", ten: "BÙ THEO ĐƠN GIÁ BÌNH QUÂN TỔ CỐ ĐỊNH NGÀY CÔNG THÁNG",
      nguon: ["Đơn giá khoán (đ/tấn): Danh mục → Mã lương, cột “Số tiền khoán” của mã lương gán cho từng nhân viên.", "Mức sàn: Danh mục → Mã lương, cột “Đơn giá bù lương” — MỖI MÃ LƯƠNG MỘT MỨC, lấy theo mã lương của nhân viên (đồng/công BT). Để trống hoặc 0 thì không bù.", "Ngưỡng công: Danh mục → Mã lương, cột “Ngưỡng công bù theo tổ”.", "Công BT: màn hình Chấm công. Tấn: màn hình Sản lượng. Tổ: phòng ban/tổ của nhân viên."],
      mota: "Tính bình quân tiền sản lượng của cả tổ mỗi người mỗi ngày; nếu thấp hơn mức sàn thì người đủ ngưỡng công được bù phần chênh × công BT.",
      buoc: ["Tiền sản lượng cả tổ = Σ(tấn × đơn giá khoán) của người hưởng lương sản phẩm trong tổ.", "Bình quân tổ = Tiền sản lượng cả tổ ÷ số ngày của tháng ÷ số người hưởng lương SP của tổ có công BT trong tháng > 0.", "Điều kiện bù: công BT của người ≥ 'Ngưỡng công bù theo tổ' và Bình quân tổ < 'Đơn giá bù lương' (mức sàn, lấy ở Danh mục → Mã lương — xem mục “Số liệu lấy từ đâu”).", "Tiền bù = (Mức sàn − Bình quân tổ) × công BT của người."],
      vd: function () { var tien = 31000000, ngay = 31, nguoi = 10, bq = tien / ngay / nguoi, san = 150000, cong = 26; return { dong: ["Tiền sản lượng cả tổ: " + fmt(tien) + " đ · tháng " + ngay + " ngày · tổ " + nguoi + " người", "Bình quân tổ = " + fmt(tien) + " ÷ " + ngay + " ÷ " + nguoi + " = " + fmt(Math.round(bq)) + " đ/người/ngày", "Mức sàn " + fmt(san) + " đ > bình quân → được bù", "Tiền bù = (" + fmt(san) + " − " + fmt(Math.round(bq)) + ") × " + cong + " công = " + fmt(Math.round((san - bq) * cong)) + " đ"] }; } },
    { ma: "daihiep", ten: "BÙ SẢN LƯỢNG THEO NGÀY",
      nguon: ["Đơn giá khoán (đ/tấn): Danh mục → Mã lương, cột “Số tiền khoán” của mã lương gán cho từng nhân viên.", "Mức sàn: Danh mục → Mã lương, cột “Đơn giá bù lương” — MỖI MÃ LƯƠNG MỘT MỨC, lấy theo mã lương của nhân viên (đồng/công BT). Để trống hoặc 0 thì không bù.", "Bậc thang theo công BT từng ngày: cố định trong hệ thống (không cấu hình ở đây). Công BT và sản lượng theo ngày: màn hình Chấm công và Sản lượng."],
      mota: "Mỗi ngày có sản lượng: tiền ngày = lớn hơn giữa (tấn ngày × đơn giá) và (bậc thang công BT ngày × mức sàn); bù = tổng phần chênh các ngày.",
      buoc: ["Với từng ngày có sản lượng: Tiền sản lượng ngày = tấn ngày × đơn giá khoán.", "Tiền sàn ngày = bậc thang(công BT ngày, chủ nhật?) × Đơn giá bù lương.", "Nếu Tiền sàn ngày > Tiền sản lượng ngày thì ngày đó được bù phần chênh.", "Tiền bù = Σ phần chênh các ngày. Không xét ngưỡng công. Ngày có sản lượng mà chưa chấm công BT → cảnh báo, tính bù 0."],
      vd: function () { var tan = 1.2, dg = 90000, bt = 1, san = 150000; return { dong: ["Ngày 05: " + tan + " tấn × " + fmt(dg) + " đ = " + fmt(Math.round(tan * dg)) + " đ · công BT ngày = " + bt, "Tiền sàn ngày = bậc thang(" + bt + ") × " + fmt(san) + " = " + fmt(san) + " đ", "Bù ngày 05 = " + fmt(san) + " − " + fmt(Math.round(tan * dg)) + " = " + fmt(san - Math.round(tan * dg)) + " đ", "Cộng dồn các ngày khác trong tháng → Tiền bù cả tháng."] }; } }
  ];
  function buMethodOf(ma) { return BU_METHODS.filter(function (m) { return m.ma === String(ma); })[0] || null; }
  function xemCachTinhBu(m) {
    var body = h("div", { class: "bu-explain" });
    body.appendChild(h("p", { text: m.mota }));
    var ol = h("ol"); m.buoc.forEach(function (x) { ol.appendChild(h("li", { text: x })); }); body.appendChild(ol);
    body.appendChild(h("div", { class: "hint", text: "Số liệu lấy từ đâu:" }));
    var ul0 = h("ul"); (m.nguon || []).forEach(function (x) { ul0.appendChild(h("li", { text: x })); }); body.appendChild(ul0);
    body.appendChild(h("div", { class: "hint", text: "Ví dụ bằng số:" }));
    var ul = h("ul"); m.vd().dong.forEach(function (x) { ul.appendChild(h("li", { text: x })); }); body.appendChild(ul);
    body.appendChild(h("div", { class: "hint", text: "Số liệu trong ví dụ chỉ minh hoạ. Số thật lấy từ Chấm công, Sản lượng và Danh mục hình thức lương của từng nhân viên." }));
    modal("Xem cách tính — " + m.ten, body, function (close) { return [btn("Đóng", "", close)]; });
  }
  /** Bản đang HIỆU LỰC của kỳ đang chọn (lưu nội bộ trong dm_quychebu — không còn là danh mục để người dùng sửa tay). */
  function buChinhThucPanel() {
    var w = h("div", { class: "card" }), cur = E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang);
    w.appendChild(h("h3", { text: "Phương pháp bù sản lượng" }));
    w.appendChild(h("div", { class: "hint", text: "Chỉ có 2 phương pháp. Phương pháp chính thức được áp dụng khi chốt kỳ; bảng lương đã chốt giữ nguyên số liệu của kỳ đó." }));
    var curMa = cur ? String(cur["Cách bù"]) : "";
    if (cur && !buMethodOf(curMa)) w.appendChild(h("div", { class: "warn", text: "⚠ Cấu hình cũ '" + curMa + "' không còn thuộc 2 phương pháp chuẩn. Hãy chọn lại một trong hai phương pháp bên dưới (kỳ đã chốt không bị ảnh hưởng)." }));
    else if (!cur) w.appendChild(h("div", { class: "warn", text: "⚠ Kỳ " + st.thang + "/" + st.nam + " chưa có phương pháp bù chính thức. Kỳ có sản lượng cần bù sẽ không chốt được cho đến khi chọn." }));
    BU_METHODS.forEach(function (m) {
      var on = curMa === m.ma;
      var row = h("div", { class: "bu-method" + (on ? " on" : ""), style: "border:1px solid var(--line,#ccc);border-radius:8px;padding:10px;margin:8px 0" }, [
        h("div", { html: "<b>" + esc(m.ten) + "</b>" + (on ? " — <span class=\"ok\">đang áp dụng chính thức</span>" : "") }),
        h("div", { class: "hint", text: m.mota })
      ]);
      var bar = h("div", { class: "bar", style: "margin:6px 0 0" });
      bar.appendChild(btn("Xem cách tính", "", function () { xemCachTinhBu(m); }));
      if (!on) bar.appendChild(btn("Áp dụng từ kỳ " + st.thang + "/" + st.nam, "pri", function () { datBuChinhThuc(m); }));
      row.appendChild(bar); w.appendChild(row);
    });
    return w;
  }
  function datBuChinhThuc(m) {
    if (!need("dm.edit", "đổi phương pháp bù sản lượng")) return;
    if (kyChot(kyStr())) { alert("Kỳ " + kyLabel(kyStr()) + " đã chốt — không đổi phương pháp. Mở chốt nếu cần tính lại."); return; }
    askText("Áp dụng " + m.ten, "Từ kỳ " + st.thang + "/" + st.nam + " trở đi. Các kỳ đã chốt trước đó giữ nguyên.", { label: "Lý do / người duyệt", required: true, multiline: true, okText: "Áp dụng" }, function (reason) {
      var tu = st.nam + "-" + ("0" + st.thang).slice(-2) + "-01", truoc = new Date(st.nam, st.thang - 1, 0), den = truoc.getFullYear() + "-" + ("0" + (truoc.getMonth() + 1)).slice(-2) + "-" + ("0" + truoc.getDate()).slice(-2);
      var vals = { "Hiệu lực từ": tu, "Hiệu lực đến": "", "Cách bù": m.ma, "Trạng thái": "Hiệu lực", "Người phê duyệt": currentUser(), "Mô tả": reason };
      var cungKy = db.dm_quychebu.filter(function (r) { return r["Trạng thái"] === "Hiệu lực" && String(r["Hiệu lực từ"] || "") === tu; })[0];
      var ok = true;
      db.dm_quychebu.forEach(function (r) { if (ok && r["Trạng thái"] === "Hiệu lực" && String(r["Hiệu lực từ"] || "") < tu && !r["Hiệu lực đến"]) ok = !!commit(REPO.plan("update", "dm_quychebu", r, { "Hiệu lực đến": den }, { what: "kết thúc phương pháp bù cũ" }), { action: "Cài đặt — kết thúc phương pháp bù cũ" }); });
      if (ok) ok = !!(cungKy ? commit(REPO.plan("update", "dm_quychebu", cungKy, vals, { what: "phương pháp bù sản lượng" }), { action: "Cài đặt — đổi phương pháp bù sản lượng" }) : commit(REPO.plan("insert", "dm_quychebu", null, vals, { what: "phương pháp bù sản lượng" }), { action: "Cài đặt — phương pháp bù sản lượng" }));
      if (!ok) return;
      st.bu = m.ma; saveUi(); audit("Đổi phương pháp bù sản lượng", m.ten + " từ " + tu + " — " + reason); st.kq = null; render(); toast("Đã áp dụng: " + m.ten);
    });
  }
  // @screen tabCaiDat

  // ---------- Thuế TNCN cha–con (V9.2): DM_TNCN → DM_TNCN_BIEUTHUE ----------
  function thueBo(ma, tu) { return db.dm_bacthue.filter(function (r) { return r["Mã thuế TNCN"] === ma && String(r["Hiệu lực từ"] || "") === String(tu || ""); }); }
  /** Master–Detail dạng cửa sổ: DM_TNCN (cha) → DM_TNCN_BIEUTHUE (con). Mã thuế & hiệu lực tự gán theo bảng cha. */
  function thueChiTietModal(cha) {
    var ma = cha["Mã thuế TNCN"], tu = cha["Hiệu lực từ"] || "";
    var childDef = Object.assign({}, DM.dm_bacthue, { ten: "Biểu thuế mã " + ma + " · hiệu lực từ " + (tu || "—"), def: { "Mã thuế TNCN": ma, "Hiệu lực từ": tu, "Trạng thái": cha["Trạng thái"] || "Hiệu lực" },
      rowFilter: function (r) { return r["Mã thuế TNCN"] === ma && String(r["Hiệu lực từ"] || "") === tu; } });
    var body = h("div", { "data-tax-child": ma });
    body.appendChild(h("div", { class: "hint", text: "Cha: mã " + ma + " · " + (cha["Nội dung"] || "") + " · hiệu lực từ " + (tu || "—") + " · " + (cha["Trạng thái"] || "Hiệu lực") + ". Các bậc bên dưới tự gắn mã thuế và ngày hiệu lực của bảng cha, không cần nhập lại." }));
    body.appendChild(grid("dm_bacthue", childDef));
    modal("Biểu thuế TNCN — mã " + ma, body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true, onClose: function () { render(); } });
  }
  function thuePanel() {
    var w = h("div"), codes = [];
    db.dm_tncn.filter(thueIsCha).forEach(function (r) { if (codes.indexOf(r["Mã thuế TNCN"]) < 0) codes.push(r["Mã thuế TNCN"]); });
    if (!st.thueMa || codes.indexOf(st.thueMa) < 0) st.thueMa = codes[0] || "";
    var note = h("div", { class: "hint", text: "Cấu trúc cha–con: chọn mã thuế ở bảng cha, biểu thuế (các bậc) của mã đó hiện ở bảng con bên dưới. HĐLĐ/phụ lục tham chiếu Mã thuế TNCN; bảng lương tự lấy biểu thuế hiệu lực đúng kỳ và khấu trừ vào thực lĩnh theo kết quả công thức. Thiếu mã/biểu thuế → TAX_CONFIG_ERROR, chặn chốt và xuất bảng lương." });
    w.appendChild(note);
    w.appendChild(grid("dm_tncn", DM.dm_tncn));
    var card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    var sel = h("select", { "aria-label": "Mã thuế TNCN" });
    codes.forEach(function (c) { sel.appendChild(h("option", { value: c, text: c })); }); sel.value = st.thueMa;
    sel.addEventListener("change", function () { st.thueMa = sel.value; render(); });
    bar.appendChild(h("b", { text: "Biểu thuế của mã: " })); bar.appendChild(sel); bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("✔ Kiểm tra cấu hình thuế", "", function () {
      var rs = TCFG.check(db), body = h("div");
      body.appendChild(h("div", { class: rs.length ? "warn" : "ok", text: rs.length ? rs.length + " vấn đề trong cấu hình thuế TNCN (cha–con)." : "Cấu hình thuế hợp lệ: không chồng/hở bậc, mã cha–con khớp nhau." }));
      if (rs.length) body.appendChild(simpleTable(rs.map(function (x) { return { "Mức": x.level, "Nội dung": x.msg }; })));
      modal("Kiểm tra cấu hình thuế TNCN", body, function (close) { return [btn("Đóng", "", close)]; });
    }));
    bar.appendChild(btn("📐 Thử tính thuế", "", function () {
      var inp = h("input", { class: "i", value: "20000000", style: "width:200px" }), out = h("div", { style: "margin-top:10px" });
      var body = h("div", {}, [h("div", { class: "hint", text: "Nhập thu nhập TÍNH THUẾ (sau các khoản giảm trừ) để xem thuế theo mã " + st.thueMa + " ở kỳ " + st.thang + "/" + st.nam + ". Chỉ tính thử — không ghi dữ liệu." }),
        h("div", { class: "fld" }, [h("label", { text: "Thu nhập tính thuế (đ)" }), inp]), out]);
      var calc = function () {
        out.innerHTML = ""; var tn = VAL.parseMoney(inp.value);
        if (isNaN(tn) || tn < 0) { out.appendChild(h("div", { class: "warn", text: "Số tiền không hợp lệ" })); return; }
        var t = E.thuThuTNCN(db, st.thueMa, st.nam, st.thang, tn);
        if (!t.ok) { out.appendChild(h("div", { class: "warn", text: "TAX_CONFIG_ERROR — " + t.loi })); return; }
        out.appendChild(h("div", { class: "ok", text: "Thuế TNCN = " + fmt(t.thue) + " đ · Phương pháp " + t.phuongPhap }));
        if (t.bieu) out.appendChild(simpleTable(t.bieu.map(function (b) { return { "Bậc": b["Bậc"], "Từ": E.money(b["Thu nhập từ"]), "Đến": E.money(b["Thu nhập đến"]) || "không giới hạn", "Thuế suất": E.pct(b["Tỷ lệ"]) * 100 + "%", "Trừ nhanh": E.money(b["Trừ nhanh"]) }; })));
      };
      inp.addEventListener("input", calc); calc();
      modal("Thử tính thuế TNCN", body, function (close) { return [btn("Đóng", "", close)]; });
    }));
    card.appendChild(bar);
    // Danh sách phiên bản của mã đang chọn + thao tác
    var vers = db.dm_tncn.filter(function (r) { return thueIsCha(r) && r["Mã thuế TNCN"] === st.thueMa; })
      .sort(function (a, b) { return String(a["Hiệu lực từ"] || "") < String(b["Hiệu lực từ"] || "") ? 1 : -1; });
    var can2 = can("dm.edit");
    var vt = h("table"), vh = h("tr");
    ["Hiệu lực từ", "Hiệu lực đến", "Phương pháp", "Trạng thái", "Số bậc", ""].forEach(function (x) { vh.appendChild(h("th", { text: x })); });
    vt.appendChild(h("thead", {}, [vh]));
    var vb = h("tbody");
    var setTT = function (r, tt) {
      if (!need("dm.edit")) return;
      if (tt === "Hiệu lực") {
        var pbl = TCFG.check(db).filter(function (x) { return x.level === "High" && x.msg.indexOf(st.thueMa) >= 0; });
        if (pbl.length) { alert("Không duyệt được — cấu hình mã " + st.thueMa + " còn lỗi:\n" + pbl.slice(0, 6).map(function (x) { return "• " + x.msg; }).join("\n")); return; }
      }
      var rows = [r].concat(thueBo(r["Mã thuế TNCN"], r["Hiệu lực từ"]));
      for (var i = 0; i < rows.length; i++) {
        var tbl = i === 0 ? "dm_tncn" : "dm_bacthue", pl = REPO.plan("update", tbl, rows[i], { "Trạng thái": tt }, { what: "đổi trạng thái biểu thuế" });
        if (!commit(pl, { confirm: true, action: "Thuế TNCN — " + tt + " " + r["Mã thuế TNCN"] + " từ " + (r["Hiệu lực từ"] || "") })) return;
      }
      save(); render(); toast("Đã chuyển mã " + r["Mã thuế TNCN"] + " (từ " + (r["Hiệu lực từ"] || "") + ") sang '" + tt + "'");
    };
    var copyVer = function (r) {
      if (!need("dm.edit")) return;
      askText("Sao chép phiên bản biểu thuế", "Tạo bản NHÁP của mã " + r["Mã thuế TNCN"] + " (kèm toàn bộ bậc) với ngày hiệu lực mới. Bản nháp chưa được dùng để tính lương cho đến khi duyệt.", { label: "Hiệu lực từ (YYYY-MM-DD)", required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, patternMsg: "Nhập ngày dạng 2027-01-01", okText: "Sao chép" }, function (d) {
        var cha = Object.assign({}, r, { "Hiệu lực từ": d, "Hiệu lực đến": "", "Trạng thái": "Nháp" }); delete cha._id;
        if (!commit(REPO.plan("insert", "dm_tncn", null, cha, { what: "sao chép phiên bản thuế" }), { action: "Thuế TNCN — sao chép phiên bản " + r["Mã thuế TNCN"] + " → " + d })) return;
        thueBo(r["Mã thuế TNCN"], r["Hiệu lực từ"]).forEach(function (b) { var c = Object.assign({}, b, { "Hiệu lực từ": d, "Hiệu lực đến": "", "Trạng thái": "Nháp" }); delete c._id; commit(REPO.plan("insert", "dm_bacthue", null, c, { what: "sao chép bậc thuế" }), { audit: false }); });
        save(); render(); toast("Đã tạo bản nháp từ " + d);
      });
    };
    vers.forEach(function (r) {
      var tr = h("tr"); tr.appendChild(h("td", { class: "t", text: r["Hiệu lực từ"] || "" })); tr.appendChild(h("td", { class: "t", text: r["Hiệu lực đến"] || "" }));
      tr.appendChild(h("td", { class: "t", text: r["Phương pháp"] || "(theo Nội dung: " + (r["Nội dung"] || "") + ")" })); tr.appendChild(h("td", { class: "t", text: r["Trạng thái"] || "Hiệu lực" }));
      tr.appendChild(h("td", { class: "r", text: String(thueBo(r["Mã thuế TNCN"], r["Hiệu lực từ"]).length) }));
      var act = h("td", { class: "t" });
      if (can2) {
        if (/^nh[áa]p/i.test(r["Trạng thái"] || "")) act.appendChild(btn("Duyệt", "pri", function () { setTT(r, "Hiệu lực"); }));
        else if (!/^ng[ừu]ng/i.test(r["Trạng thái"] || "")) act.appendChild(btn("Ngừng", "", function () { setTT(r, "Ngừng"); }));
        act.appendChild(btn("Sao chép", "", function () { copyVer(r); }));
      }
      act.appendChild(btn("Chi tiết", "", function () { if (!leaveOk()) return; thueChiTietModal(r); }, "Mở biểu thuế (các bậc) của đúng phiên bản này trong cửa sổ cha–con"));
      tr.appendChild(act); vb.appendChild(tr);
    });
    vt.appendChild(vb);
    if (vers.length) card.appendChild(h("div", { class: "tw" }, [vt])); else card.appendChild(h("div", { class: "empty", text: "Chưa có mã thuế nào ở bảng cha. Thêm dòng ở bảng trên." }));
    w.appendChild(card);
    if (st.thueMa) w.appendChild(h("div", { class: "hint", text: "Bấm 'Chi tiết' ở một phiên bản phía trên để xem và sửa các bậc thuế của đúng phiên bản đó (cửa sổ cha–con)." }));
    // Lịch sử thay đổi (nhật ký) liên quan mã đang chọn
    var hist = (db.auditlog || []).filter(function (a) { return /Thuế TNCN|biểu thuế|dm_tncn|dm_bacthue/i.test((a.thaoTac || "") + " " + (a.chiTiet || "")) && ((a.chiTiet || "") + (a.thaoTac || "")).indexOf(st.thueMa) >= 0; }).slice(-15).reverse();
    if (hist.length) { var hc = h("div", { class: "card" }); hc.appendChild(h("h3", { text: "Lịch sử thay đổi mã " + st.thueMa })); hc.appendChild(simpleTable(hist.map(function (a) { return { "Thời điểm": fmtTime(a.luc || ""), "Người": a.nguoi || "", "Thao tác": a.thaoTac || "", "Chi tiết": a.chiTiet || "" }; }))); w.appendChild(hc); }
    return w;
  }

