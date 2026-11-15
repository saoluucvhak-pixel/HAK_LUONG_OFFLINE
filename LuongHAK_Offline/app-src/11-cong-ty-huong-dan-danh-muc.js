  // ---------- Hồ sơ công ty ----------
  var CONGTY_F = [{ k: "Tên công ty", req: 1 }, { k: "Địa chỉ" }, { k: "Mã số thuế" }, { k: "Số điện thoại" }, { k: "Người đại diện pháp luật" }];
  function congTy() { return (db.congty && db.congty[0]) || {}; }
  function cardCongTy() {
    var c = h("div", { class: "card" }), g = h("div", { class: "fgrid" });
    c.appendChild(h("h3", { text: "🏢 Hồ sơ công ty" }));
    c.appendChild(h("div", { class: "hint", text: "Tên công ty hiện trên thanh bên trái và trên phiếu lương." }));
    c.appendChild(g);
    var get = fieldInputs(g, CONGTY_F, congTy());
    c.appendChild(h("div", { class: "bar" }, [btn("💾 Lưu hồ sơ công ty", "pri", function () { if (!need("system.admin")) return; db.congty = [Object.assign({}, congTy(), get())]; save(); /* giữ trường ngoài form (VD Quy chế tính lương) */ render(); toast("Đã lưu"); })]));
    return c;
  }

  function cardAudit() {
    var c = h("div", { class: "card" }), list = (db.auditlog || []).slice().reverse();
    c.appendChild(h("h3", { text: "🕘 Nhật ký thao tác" }));
    c.appendChild(h("div", { class: "hint", text: list.length + " thao tác được ghi (chốt / mở chốt, nhập Excel, khôi phục, sửa hồ sơ & danh mục — kèm trước/sau, đánh dấu HỒI TỐ khi chạm kỳ đã chốt)." }));
    if (!list.length) return c;
    var rows = list.map(function (a) { return { "Thời điểm": fmtTime(a.luc), "Người thực hiện": a.nguoi || "(bản cũ — không ghi)", "Thao tác": a.thaoTac, "Chi tiết": a.chiTiet }; });
    c.appendChild(h("div", { class: "bar" }, [btn("⬇ Xuất Excel nhật ký", "", function () { saveXlsx("NhatKyThaoTac.xlsx", [{ name: "NhatKy", cols: Object.keys(rows[0]), rows: rows }]); })]));
    c.appendChild(h("div", { class: "tw", style: "max-height:320px" }, [simpleTable(rows.slice(0, 300))]));
    return c;
  }

  // ---------- Hướng dẫn, quy trình, dự thảo quy chế (ui/guide.js) ----------
  function tabHuongDan() {
    var G = window.HAKGuide, w = h("div"), tabs = h("div", { class: "subtabs noprint" }), key = st.hd2 || "start";
    G.TABS.forEach(function (t) { tabs.appendChild(h("button", { class: key === t[0] ? "on" : "", text: t[1], on: { click: function () { st.hd2 = t[0]; render(); } } })); });
    w.appendChild(tabs);
    var ctx = { db: db, E: E, nam: st.nam, thang: st.thang, congTy: congTy() };
    var bar = h("div", { class: "bar noprint" }, [btn("🖨 In", "", function () { window.print(); })]);
    if (key === "rules") {
      bar.appendChild(btn("⬇ Tải file Word (.doc) để chỉnh sửa", "pri", function () { download("Du_thao_Quy_che_tra_luong_" + kyKey(st.nam, st.thang) + ".doc", "application/msword", G.regulationDoc(ctx)); audit("Tải dự thảo Quy chế trả lương", kyLabel(kyKey(st.nam, st.thang))); }));
      bar.appendChild(h("span", { class: "hint", style: "margin:0", text: "Bảng mức lương, phụ cấp, BH, thuế lấy theo danh mục đang có hiệu lực ở kỳ " + st.thang + "/" + st.nam + " (đổi kỳ ở góc phải trên)." }));
    }
    w.appendChild(bar);
    w.appendChild(h("div", { class: "card guide" + (key === "rules" ? " g-doc" : ""), html: G.section(key, ctx) }));
    return w;
  }

  // ---------- Danh mục ----------
  function tabDanhMuc() {
    var w = h("div"), bar = h("div", { class: "bar" });
    if (DM_CAI_DAT[st.dm]) st.dm = Object.keys(DM).filter(function (k) { return !DM_CAI_DAT[k]; })[0];
    Object.keys(DM).filter(function (k) { return !DM_CAI_DAT[k]; }).forEach(function (k) { bar.appendChild(btn(DM[k].ten + (countOf(k) ? " (" + countOf(k) + ")" : ""), st.dm === k ? "pri" : "", function () { if (st.dm !== k && !leaveOk()) return; st.dm = k; saveUi(); render(); })); });
    var layout = h("div", { class: "hak-catalog-layout" });
    var side = h("aside", { class: "hak-catalog-side", "aria-label": "Chọn danh mục" });
    side.appendChild(h("div", { class: "hak-catalog-side-title", text: "DANH MỤC HỆ THỐNG" }));
    side.appendChild(bar);
    layout.appendChild(side);
    var workspace = h("section", { class: "hak-catalog-main", "aria-label": "Nội dung danh mục" });
    workspace.appendChild(h("div", { class: "hak-catalog-heading" }, [h("small", { text: "QUẢN LÝ DANH MỤC" }), h("h2", { text: DM[st.dm] ? DM[st.dm].ten : "Danh mục" })]));
    workspace.appendChild(st.dm === "dm_tncn" ? thuePanel() : FM_TABLE[st.dm] ? fmUi(FM_TABLE[st.dm]).masterView() : grid(st.dm, DM[st.dm]));
    layout.appendChild(workspace);
    w.appendChild(layout);
    return w;
  }
  /** V10.2/V10.3: Danh mục Tăng ca · Phụ cấp · Hỗ trợ dạng Master–Detail dùng chung (ui/formula-master.js). Phụ thuộc đưa vào qua một đối tượng — module không đụng DOM/db ngoài luồng repository. */
  var FM_TABLE = { dm_tangca: "OVERTIME", dm_phucap: "ALLOWANCE", dm_hotro: "SUPPORT" }, FMUI = {};
  function fmUi(type) {
    return FMUI[type] || (FMUI[type] = window.HAKUI.formulaMaster.create({
      h: h, btn: btn, esc: esc, fmt: fmt, $: $, st: st, db: function () { return db; }, can: can, user: function () { return session ? session.tenDangNhap : currentUser(); },
      REPO: REPO, commit: commit, txn: txn, save: save, render: render, audit: audit, toast: toast, alert: function (m) { alert(m); }, fmtTime: fmtTime,
      dateField: dateField, dateIso: dateIso, kqKy: kqKy, closedPeriods: function () { return db.kyluong.map(function (k) { return k.ky; }); }, pct: E.pct,
      backup: function (tag) { if (store && store.backup) store.backup(tag); }, dirtyBump: function () { dbRev++; st.kqStale = true; }
    }, type));
  }

