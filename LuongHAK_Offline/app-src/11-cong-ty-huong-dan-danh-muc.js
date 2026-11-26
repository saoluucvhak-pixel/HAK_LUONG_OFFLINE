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
  // @screen tabHuongDan

  // ---------- Danh mục ----------
  // @screen tabDanhMuc
  /** V10.2/V10.3: Danh mục Tăng ca · Phụ cấp · Hỗ trợ dạng Master–Detail dùng chung (ui/formula-master.js). Phụ thuộc đưa vào qua một đối tượng — module không đụng DOM/db ngoài luồng repository. */
  var FM_TABLE = { dm_tangca: "OVERTIME", dm_phucap: "ALLOWANCE", dm_hotro: "SUPPORT" }, FMUI = {};
  function fmUi(type) {
    return FMUI[type] || (FMUI[type] = window.HAKUI.formulaMaster.create({
      h: h, btn: btn, esc: esc, fmt: fmt, $: $, st: st, db: function () { return db; }, can: can, user: function () { return session ? session.tenDangNhap : currentUser(); },
      REPO: REPO, commit: commit, txn: txn, save: save, render: render, audit: audit, toast: toast, alert: function (m) { alert(m); }, fmtTime: fmtTime,
      dateField: dateField, dateIso: dateIso, sfUi: sfUi, saveXlsx: saveXlsx, kqKy: kqKy, closedPeriods: function () { return db.kyluong.map(function (k) { return k.ky; }); }, pct: E.pct,
      backup: function (tag) { if (store && store.backup) store.backup(tag); }, dirtyBump: function () { dbRev++; st.kqStale = true; }
    }, type));
  }

