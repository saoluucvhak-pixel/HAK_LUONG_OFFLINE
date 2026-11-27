  // ---------- Màn hình đăng nhập / khởi tạo Admin ----------
  function authCard(title, hint, fields, okText, onOk, extra) {
    var w = h("div", { style: "max-width:440px;margin:40px auto" }), c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: title }));
    if (hint) c.appendChild(h("div", { class: "hint", text: hint }));
    var inputs = {}, msg = h("div", { class: "warn", style: "display:none" });
    fields.forEach(function (f) {
      var inp = h("input", { class: "i", style: "width:100%", type: f.type || "text", autocomplete: f.ac || "off", "data-f": f.k });
      inputs[f.k] = inp;
      c.appendChild(h("div", { class: "fld", style: "margin:8px 0" }, [h("label", { text: f.label }), inp]));
    });
    var busy = false, okBtn = btn(okText, "pri big", function () {
      if (busy) return; var v = {}; Object.keys(inputs).forEach(function (k) { v[k] = inputs[k].value; });
      busy = true; okBtn.disabled = true; msg.style.display = "none";
      Promise.resolve().then(function () { return onOk(v); }).catch(function (e) { msg.textContent = "⚠ " + (e && e.message || e); msg.style.display = ""; })
        .then(function () { busy = false; okBtn.disabled = false; });
    });
    c.appendChild(msg); c.appendChild(h("div", { class: "bar", style: "margin-top:12px" }, [okBtn].concat(extra || [])));
    c.addEventListener("keydown", function (e) { if (e.key === "Enter") okBtn.click(); });
    w.appendChild(c);
    setTimeout(function () { var f0 = c.querySelector("input"); if (f0) f0.focus(); }, 0);
    return w;
  }
  function showRecoveryCode(code, then) {
    var body = h("div");
    body.appendChild(h("div", { class: "warn", html: "Ghi lại <b>mã khôi phục</b> này và cất ở nơi an toàn (két, sổ tay của giám đốc).<br>Khi quên mật khẩu Admin, đây là cách DUY NHẤT để vào lại app. Mã chỉ hiện 1 lần." }));
    body.appendChild(h("div", { style: "font-size:26px;font-weight:700;letter-spacing:2px;text-align:center;margin:16px 0", text: code, "data-recovery": "1" }));
    modal("Mã khôi phục quản trị", body, function (close) { return [btn("Tôi đã ghi lại mã", "pri", function () { close(); (then || render)(); })]; });
  }
  function setRecovery(code) {
    return AUTH.make(code.replace(/-/g, "")).then(function (k) { db.baomat = [{ khoiPhuc: k, taoLuc: new Date().toISOString() }]; });
  }
  /** Hai lựa chọn khi mở app lần đầu: 1) tạo dữ liệu + tài khoản mới (mặc định), 2) khôi phục từ dữ liệu cũ. */
  function setupChooser(active) {
    var pick = function (mode) { return function () { st.setupMode = mode; st.setupRestored = false; render(); }; };
    return h("div", { class: "bar", style: "margin:0 0 12px;gap:8px;flex-wrap:wrap" }, [
      btn("1. Tạo dữ liệu và tài khoản mới", active === "new" ? "pri" : "", pick("new")),
      btn("2. Khôi phục từ dữ liệu cũ", active === "restore" ? "pri" : "", pick("restore"))]);
  }
  function restoreFirstRunScreen() {
    var w = h("div", { style: "max-width:440px;margin:40px auto" }), c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "Thiết lập ban đầu" })); c.appendChild(setupChooser("restore"));
    c.appendChild(h("div", { class: "hint", text: "Chọn file dữ liệu cũ (.json — \"Sao lưu ra file\" hoặc file dữ liệu đã xuất). Khôi phục bình thường, không đối chiếu nhật ký thao tác. Nếu file có tài khoản, đăng nhập bằng tài khoản cũ; nếu file chỉ có bảng dữ liệu, bạn có thể tạo tài khoản hoặc chọn Bỏ qua." }));
    c.appendChild(h("div", { class: "bar", style: "margin-top:12px" }, [btn("⬆ Chọn file dữ liệu cũ…", "pri big", function () {
      var f = h("input", { type: "file", accept: ".json" });
      f.addEventListener("change", function () {
        if (!f.files[0]) return;
        var fr = new FileReader(); fr.onload = function () {
          restoreFromText(fr.result, f.files[0].name, { after: function () { st.setupMode = "new"; st.setupRestored = !(db.nguoidung || []).length; render(); } });
        }; fr.readAsText(f.files[0]);
      });
      f.click();
    })]));
    w.appendChild(c); return w;
  }
  function submitAccess(request) {
    if (dirty && !saveNow()) throw new Error(lastSaveError);
    var result = store.configureAccess(request, baseSig);
    if (!result || !result.ok) throw new Error((result && result.error) || "Không lưu được chế độ đăng nhập");
    if (request.mode === "direct") { window.location.reload(); return; }
    var loaded = store.load();
    if (!loaded || !loaded.ok || !loaded.text) { window.location.reload(); return; }
    db = JSON.parse(loaded.text);
    ensureTables();
    baseSig = String(loaded.baseSig);
    inputReviewsSaved = !!(db._inputReviews && db.schemaVersion >= 5);
    dbRev++; st.kq = null; st.kqStale = true; st.authView = "";
    var owner = C.accessMode.accounts(db)[0];
    session = owner && mainLogin(owner.tenDangNhap, request.password) ? owner : null;
    lastActive = Date.now();
    if (result.recoveryCode) showRecoveryCode(result.recoveryCode);
    else render();
  }
  function accountFields() {
    return [{ k: "u", label: "Tên đăng nhập", ac: "username" }, { k: "n", label: "Họ tên" },
      { k: "p", label: "Mật khẩu (ít nhất 8 ký tự, có chữ và số)", type: "password", ac: "new-password" },
      { k: "p2", label: "Nhập lại mật khẩu", type: "password", ac: "new-password" }];
  }
  function enableAccount(v) {
    return submitAccess({ mode: "account", username: v.u, name: v.n, password: v.p, confirmPassword: v.p2, company: v.cty, companyId: v.ma });
  }
  function desktopSetupScreen() {
    var company = (db.congty || []).length ? [] : [
      { k: "cty", label: "Tên công ty (dùng trên báo cáo)" },
      { k: "ma", label: "Mã công ty (ví dụ HAKQN)" }
    ];
    var skip = btn("Bỏ qua – Một người sử dụng", "", function () {
      try { submitAccess({ mode: "direct" }); } catch (e) { alert(e.message); }
    });
    skip.setAttribute("data-access-skip", "1");
    return authCard("Thiết lập ban đầu", "Chọn Bỏ qua để mở ứng dụng trực tiếp. Để bật đăng nhập, nhập thông tin bên dưới và tạo tài khoản.",
      company.concat(accountFields()), "Tạo tài khoản đăng nhập", enableAccount, [skip]);
  }
  function tabAccessMode() {
    var mode = C.accessMode.mode(db), state = mode === "direct" ? "Một người sử dụng" : mode === "account" ? "Sử dụng tài khoản đăng nhập" : "Đang dùng tài khoản từ bản cũ";
    var panel = h("section", { class: "card", "data-access-mode": mode }, [
      h("h3", { text: "Chế độ đăng nhập" }),
      h("p", { text: state })
    ]);
    if (mode === "account") panel.appendChild(h("p", { text: "Tên đăng nhập: " + session.tenDangNhap }));
    if (mode === "direct" || mode === "legacy") panel.appendChild(btn("Sử dụng tài khoản đăng nhập", "pri", function () {
      panel.replaceChildren(authCard("Tạo tài khoản đăng nhập", "Ứng dụng sẽ yêu cầu tài khoản này khi mở lại.", accountFields(), "Tạo tài khoản", enableAccount,
        [btn("Hủy", "", render)]));
    }));
    if (mode === "account" || mode === "legacy") panel.appendChild(btn("Một người sử dụng", "", function () {
      panel.replaceChildren(authCard("Một người sử dụng", "Xác nhận tài khoản quản trị hiện tại để mở ứng dụng trực tiếp trên máy này.",
        [{ k: "u", label: "Tên đăng nhập", ac: "username" }, { k: "p", label: "Mật khẩu", type: "password", ac: "current-password" }],
        "Xác nhận chuyển chế độ", function (v) { return submitAccess({ mode: "direct", username: v.u, password: v.p }); },
        [btn("Hủy", "", render)]));
    }));
    return panel;
  }
  function setupAdminScreen() {
    if (st.setupMode === "restore") return restoreFirstRunScreen();
    var scr = store && store.configureAccess ? desktopSetupScreen() : setupAdminForm();
    var card = scr.firstChild; card.insertBefore(setupChooser("new"), card.children[1] || null);
    return scr;
  }
  function setupAdminForm() {
    return authCard("Thiết lập ban đầu", st.setupRestored ? "Đã khôi phục dữ liệu cũ. File không có tài khoản nên cần tạo tài khoản Admin — dữ liệu đã khôi phục được giữ nguyên." : "Nhập thông tin công ty và tạo tài khoản Admin đầu tiên. Dữ liệu được tạo mới với danh mục chuẩn — không cần file. Nếu đã có dữ liệu cũ, chọn \"2. Khôi phục từ dữ liệu cũ\" ở trên.",
      [{ k: "cty", label: "Tên công ty (đầy đủ, dùng trên báo cáo)" }, { k: "ma", label: "Mã công ty (viết tắt, ví dụ HAKQN)" },
        { k: "u", label: "Tên đăng nhập Admin" }, { k: "n", label: "Họ tên Admin" }, { k: "p", label: "Mật khẩu (≥ 8 ký tự, có chữ và số)", type: "password", ac: "new-password" }, { k: "p2", label: "Nhập lại mật khẩu", type: "password", ac: "new-password" }],
      "Tạo dữ liệu và tài khoản Admin", function (v) {
        if (!v.cty.trim()) throw new Error("Cần nhập tên công ty");
        if (!/^[A-Za-z0-9_-]{2,20}$/.test(v.ma.trim())) throw new Error("Mã công ty 2–20 ký tự: chữ không dấu, số, _ hoặc -");
        if (!/^[a-z0-9._-]{3,30}$/i.test(v.u.trim())) throw new Error("Tên đăng nhập 3–30 ký tự: chữ không dấu, số, . _ -");
        if (!v.n.trim()) throw new Error("Cần nhập họ tên");
        var bad = PERM.validatePassword(v.p); if (bad) throw new Error(bad);
        if (v.p !== v.p2) throw new Error("Hai lần nhập mật khẩu không khớp");
        if ((db.nguoidung || []).length) throw new Error("Đã có tài khoản — hãy đăng nhập");
        var code = randomCode(), snap = JSON.parse(JSON.stringify(db));
        return AUTH.make(v.p).then(function (k) {
          var u = Object.assign({ id: HRM.uid(), tenDangNhap: v.u.trim(), hoTen: v.n.trim(), vaiTro: "admin", khoa: false, taoLuc: new Date().toISOString() }, k);
          HRM.khoiTaoMoi(db, v.cty, v.ma);
          db.nguoidung.push(u);
          return setRecovery(code).then(function () {
            session = u; audit("Khởi tạo dữ liệu công ty mới", v.cty.trim() + " (" + v.ma.trim() + ")"); audit("Khởi tạo tài khoản Admin", u.tenDangNhap);
            if (!saveNow()) { db.nguoidung = []; db.baomat = []; Object.keys(db).forEach(function (key) { delete db[key]; }); Object.assign(db, snap); session = null; throw new Error("Không lưu được xuống đĩa — chưa tạo dữ liệu"); }
            if (!mainLogin(u.tenDangNhap, v.p)) { session = null; throw new Error("Đã tạo tài khoản nhưng chưa thiết lập được phiên — đăng nhập lại"); }
            showRecoveryCode(code);
          });
        });
      });
  }
  function loginScreen() {
    return authCard("Đăng nhập", congTy()["Tên công ty"] || "", [{ k: "u", label: "Tên đăng nhập", ac: "username" }, { k: "p", label: "Mật khẩu", type: "password", ac: "current-password" }], "Đăng nhập", function (v) {
      var wait = PERM.lockedFor(v.u); if (wait) throw new Error("Sai mật khẩu quá 5 lần — chờ " + Math.ceil(wait / 1000) + " giây");
      var u = C.accessMode.accounts(db).find(function (account) { return account.tenDangNhap.trim().toLowerCase() === v.u.trim().toLowerCase(); });
      return (u ? AUTH.verify(v.p, u) : AUTH.hash(v.p, "00".repeat(16), PERM.ITER).then(function () { return false; })).then(function (ok) {
        if (!ok) { PERM.noteFail(v.u); throw new Error("Sai tên đăng nhập hoặc mật khẩu"); }
        if (u.khoa) throw new Error("Tài khoản đã bị khóa — liên hệ Admin");
        PERM.noteOk(v.u);
        if (!mainLogin(u.tenDangNhap, v.p)) throw new Error("Tiến trình chính không xác nhận được phiên đăng nhập — thử lại");
        session = u; lastActive = Date.now(); u.dangNhapLuc = new Date().toISOString();
        audit("Đăng nhập", u.tenDangNhap); saveNow();
        if (u.phaiDoiMK) { render(); changePassword(true); return; }
        render();
      });
    }, [btn("Quên mật khẩu Admin…", "ghost", function () { st.authView = "recover"; render(); })]);
  }
  function recoverAdminScreen() {
    return authCard("Khôi phục quyền Admin", "Nhập mã khôi phục được cấp khi tạo Admin đầu tiên. App đặt lại mật khẩu cho tài khoản Admin bạn chọn và cấp MÃ KHÔI PHỤC MỚI.",
      [{ k: "c", label: "Mã khôi phục (XXXX-XXXX-XXXX-XXXX)" }, { k: "u", label: "Tên đăng nhập Admin cần đặt lại" }, { k: "p", label: "Mật khẩu mới", type: "password", ac: "new-password" }, { k: "p2", label: "Nhập lại", type: "password", ac: "new-password" }],
      "Đặt lại mật khẩu", function (v) {
        var wait = PERM.lockedFor("#recovery"); if (wait) throw new Error("Nhập sai quá 5 lần — chờ " + Math.ceil(wait / 1000) + " giây");
        var rec = (db.baomat || [])[0], u = PERM.findUser(db, v.u);
        if (!rec || !rec.khoiPhuc) throw new Error("Dữ liệu này không có mã khôi phục");
        var bad = PERM.validatePassword(v.p); if (bad) throw new Error(bad);
        if (v.p !== v.p2) throw new Error("Hai lần nhập mật khẩu không khớp");
        return AUTH.verify(v.c.trim().toUpperCase().replace(/-/g, ""), rec.khoiPhuc).then(function (ok) {
          if (!ok) { PERM.noteFail("#recovery"); throw new Error("Mã khôi phục không đúng"); }
          if (!u || u.vaiTro !== "admin") throw new Error("Không có tài khoản Admin tên này");
          // V10.1: tiến trình chính xác minh lại mã trên dữ liệu đĩa và cấp phiên khôi phục; không có phiên này main từ chối ghi đặt lại Admin
          if (store && store.recover) { var rr = store.recover(v.c, u.tenDangNhap); if (!rr || !rr.ok) throw new Error((rr && rr.error) || "Tiến trình chính từ chối khôi phục"); }
          PERM.noteOk("#recovery");
          var code = randomCode();
          return Promise.all([AUTH.make(v.p), AUTH.make(code.replace(/-/g, ""))]).then(function (keys) {
            if (!txn(["nguoidung", "baomat"], function () {
              Object.assign(u, keys[0], { khoa: false, phaiDoiMK: false, doiMKLuc: new Date().toISOString() });
              db.baomat = [{ khoiPhuc: keys[1], taoLuc: new Date().toISOString() }];
              audit("Khôi phục quyền Admin bằng mã khôi phục", u.tenDangNhap + " — đã cấp mã khôi phục mới");
            })) throw new Error("Chưa khôi phục quyền Admin: " + lastTxnError);
            session = u;
            return Promise.resolve().then(function () {
              st.authView = ""; if (!mainLogin(u.tenDangNhap, v.p)) { session = null; throw new Error("Đã đặt lại mật khẩu nhưng chưa thiết lập được phiên — đăng nhập lại"); }
              showRecoveryCode(code);
            });
          });
        });
      }, [btn("← Quay lại đăng nhập", "ghost", function () { st.authView = ""; render(); })]);
  }
  function changePassword(forced) {
    var body = h("div"), f = {};
    if (forced) body.appendChild(h("div", { class: "warn", text: "Admin yêu cầu bạn đổi mật khẩu trước khi làm việc." }));
    [["o", "Mật khẩu hiện tại"], ["p", "Mật khẩu mới (≥ 8 ký tự, có chữ và số)"], ["p2", "Nhập lại mật khẩu mới"]].forEach(function (x) { f[x[0]] = h("input", { class: "i", type: "password", style: "width:100%" }); body.appendChild(h("div", { class: "fld", style: "margin:8px 0" }, [h("label", { text: x[1] }), f[x[0]]])); });
    modal("Đổi mật khẩu — " + session.tenDangNhap, body, function (close) {
      return [forced ? btn("Đăng xuất", "", function () { if (logout("không đổi mật khẩu bắt buộc")) close(); }) : btn("Hủy", "", close), btn("Đổi mật khẩu", "pri", function () {
        var bad = PERM.validatePassword(f.p.value); if (bad) { alert(bad); return; }
        if (f.p.value !== f.p2.value) { alert("Hai lần nhập không khớp"); return; }
        AUTH.verify(f.o.value, session).then(function (ok) {
          if (!ok) { alert("Mật khẩu hiện tại không đúng"); return; }
          return AUTH.make(f.p.value).then(function (k) { if (!txn(["nguoidung"], function () { Object.assign(session, k, { phaiDoiMK: false, doiMKLuc: new Date().toISOString() }); audit("Đổi mật khẩu", session.tenDangNhap); })) { alert("Chưa đổi mật khẩu: " + lastTxnError); return; } close(); toast("Đã đổi mật khẩu"); render(); });
        });
      })];
    });
  }
  /** v2.1.7: khối "Bản chụp SQLite tìm thấy" ở màn khôi phục: liệt kê bản ở thư mục dữ liệu VÀ thư mục SQLite đã chọn; nguồn không truy cập được nêu rõ đường dẫn + nguyên nhân; kiểm từng bản theo yêu cầu (đắt trên ổ chậm); khôi phục theo id. */
  function snapshotCandidatesPanel() {
    var wrap = h("div", { class: "card", "data-snapshot-candidates": "1", style: "margin-top:10px" });
    function load() {
      wrap.innerHTML = ""; var l = store.restoreCandidates();
      wrap.appendChild(h("div", { class: "fh", text: "Bản chụp SQLite tìm thấy" }));
      if (!l || !l.ok) { wrap.appendChild(h("div", { class: "warn", text: "Không liệt kê được bản chụp: " + ((l && l.error) || "không rõ lý do") })); return; }
      l.sources.forEach(function (src) {
        if (src.reachable) wrap.appendChild(h("div", { class: "hint", text: src.label + ": " + src.count + " bản (" + src.dir + ")" }));
        else wrap.appendChild(h("div", { class: "warn", "data-source-error": src.source, html: "<b>" + esc(src.label) + " không đọc được.</b> " + esc(src.error) + "<br>Cắm lại USB / kiểm tra ổ mạng rồi bấm “Quét lại”. Các bản ở nguồn còn lại vẫn dùng được." }));
      });
      (l.warnings || []).forEach(function (m) { wrap.appendChild(h("div", { class: "warn", text: m })); });
      var bar = h("div", { class: "bar" }); wrap.appendChild(bar);
      bar.appendChild(btn("Quét lại", "ghost", load));
      var info = {};
      bar.appendChild(btn("Tìm bản hợp lệ mới nhất", "", function () {
        var r = store.findBestCandidate(); if (!r || !r.ok) { alert("Không kiểm được: " + ((r && r.error) || "")); return; }
        (r.checked || []).forEach(function (c) { info[c.id] = c.ok ? { ok: true, records: c.records } : { ok: false, error: c.error }; });
        if (r.best) info[r.best.id] = { ok: true, records: r.best.records, best: true };
        paintRows(); alert(r.best ? "Bản hợp lệ mới nhất: " + r.best.name + " (" + (r.best.source === "chosen" ? "thư mục đã chọn" : "thư mục dữ liệu") + ", " + fmtTime(new Date(r.best.mtimeMs).toISOString()) + ", " + r.best.records + " dòng).\nChưa khôi phục gì — bấm “Khôi phục từ bản này” nếu đồng ý." : "Không có bản nào hợp lệ. Xem lý do ở cột Trạng thái.");
      }));
      if (!l.candidates.length) { wrap.appendChild(h("div", { class: "empty", text: "Không thấy bản chụp SQLite nào." })); return; }
      var tb = h("tbody"), t = h("table"), tr = h("tr"); ["Nguồn", "Tên", "Thời điểm", "Dung lượng", "Trạng thái", ""].forEach(function (x) { tr.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [tr])); t.appendChild(tb);
      function check(c) { var r = store.inspectCandidate(c.id); info[c.id] = r && r.ok ? { ok: true, records: r.records } : { ok: false, error: (r && r.error) || "không rõ lý do" }; paintRows(); return info[c.id]; }
      function paintRows() {
        tb.innerHTML = "";
        l.candidates.forEach(function (c) {
          var st = info[c.id], x = h("tr", { "data-candidate": c.id });
          [c.source === "chosen" ? "Thư mục đã chọn" : "Thư mục dữ liệu", c.name === "data-snapshot.sqlite" ? "Bản mới nhất (data-snapshot.sqlite)" : c.name, fmtTime(new Date(c.mtimeMs).toISOString()), Math.round(c.size / 1024) + " KB"].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v })); });
          x.appendChild(h("td", { class: "t", "data-cand-status": st ? (st.ok ? "ok" : "bad") : "unknown", text: !st ? (c.shaConflict ? "chưa kiểm — cùng tên nhưng nội dung KHÁC bản ở nguồn kia" : "chưa kiểm") : st.ok ? "hợp lệ, " + st.records + " dòng" + (st.best ? " (mới nhất hợp lệ)" : "") : "KHÔNG dùng được: " + st.error }));
          var act = h("td", {}); act.appendChild(btn("Kiểm tra", "ghost", function () { check(c); }));
          if (!st || st.ok) act.appendChild(btn("Khôi phục từ bản này", "pri", function () {
            var s0 = info[c.id] || check(c); if (!s0.ok) { alert("Bản này không dùng được: " + s0.error); return; }
            if (!confirm("KHÔI PHỤC từ " + (c.source === "chosen" ? "thư mục SQLite đã chọn" : "thư mục dữ liệu") + ":\n" + c.name + "\nThời điểm: " + fmtTime(new Date(c.mtimeMs).toISOString()) + ", " + s0.records + " dòng.\n\nDữ liệu thay đổi SAU thời điểm này sẽ không có. File hiện tại KHÔNG bị xóa: được cất cạnh với tên 'data.sqlite.truoc-khoi-phuc-…' và 'data.json.truoc-khoi-phuc-…'. Bản nguồn không bị sửa. Tiếp tục?")) return;
            var r = store.restoreCandidate(c.id);
            if (r && r.ok) { alert("Đã khôi phục: " + r.records + " dòng (trước đó: " + (r.before == null ? "không đọc được" : r.before) + "). File cũ được cất: " + (r.kept || []).join(", ")); window.location.reload(); }
            else alert("Không khôi phục được: " + ((r && r.error) || "không rõ lý do"));
          }));
          x.appendChild(act); tb.appendChild(x);
        });
      }
      paintRows(); wrap.appendChild(h("div", { class: "tw" }, [t]));
    }
    load(); return wrap;
  }
  function recoveryScreen() {
    var w = h("div"), c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "⚠ Không mở được file dữ liệu" }));
    c.appendChild(h("div", { class: "warn", html: esc(loadError.error) + "<br>App <b>chưa ghi đè</b> file này. Hãy khôi phục từ một bản sao lưu bên dưới, hoặc từ file sao lưu bạn đã cất (USB/Drive)." }));
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("⬆ Khôi phục từ file…", "pri", function () { var f = h("input", { type: "file", accept: ".json" }); f.addEventListener("change", function () { var fr = new FileReader(); fr.onload = function () { restoreFromText(fr.result, f.files[0].name, { quarantine: true }); }; fr.readAsText(f.files[0]); }); f.click(); }));
    var sn = loadError.snapshot;
    if (sn && sn.exists) {
      c.appendChild(h("div", { class: sn.ok ? "hint" : "warn", "data-snapshot": sn.ok ? "ok" : "bad", text: sn.ok ? "Bản chụp SQLite gần nhất: " + fmtTime(sn.mtime) + ", " + sn.records + " dòng dữ liệu, " + Math.round(sn.size / 1024) + " KB. Đã kiểm hợp lệ." : "Có bản chụp SQLite nhưng KHÔNG dùng được: " + (sn.error || "") }));
      if (sn.ok && store && store.restoreSnapshot) bar.appendChild(btn("⬆ Khôi phục từ bản chụp SQLite", "pri", function () {
        if (!confirm("KHÔI PHỤC từ bản chụp SQLite (" + fmtTime(sn.mtime) + ", " + sn.records + " dòng).\n\nDữ liệu thay đổi SAU thời điểm này sẽ không có trong bản chụp. File dữ liệu hiện tại KHÔNG bị xóa: được cất cạnh với tên có 'truoc-khoi-phuc'. Tiếp tục?")) return;
        var r = store.restoreSnapshot();
        if (r && r.ok) { alert("Đã khôi phục từ bản chụp SQLite: " + r.records + " dòng (trước đó: " + (r.before == null ? "không đọc được" : r.before) + "). File cũ được cất: " + (r.kept || []).join(", ")); window.location.reload(); }
        else alert("Không khôi phục được: " + ((r && r.error) || "không rõ lý do"));
      }));
    }
    if (store && store.restoreCandidates) { var cp0 = snapshotCandidatesPanel(); c.appendChild(cp0); }
    if (store && store.restorePackageSnapshot) bar.appendChild(btn("⬆ Khôi phục từ gói Full Backup (bản chụp SQLite)…", "", function () {
      if (!confirm("Chọn một gói Full Backup (.zip) có bản chụp SQLite (gói tạo từ bản 2.0.38 trở lên).\n\nDữ liệu thay đổi SAU thời điểm tạo gói sẽ không có. File dữ liệu hiện tại KHÔNG bị xóa: được cất cạnh với tên có 'truoc-khoi-phuc'. Tiếp tục?")) return;
      var r = store.restorePackageSnapshot();
      if (r && r.cancelled) return;
      if (r && r.ok) { alert("Đã khôi phục từ gói: " + r.records + " dòng (trước đó: " + (r.before == null ? "không đọc được" : r.before) + "). File cũ được cất: " + (r.kept || []).join(", ")); window.location.reload(); }
      else alert("Không khôi phục được: " + ((r && r.error) || "không rõ lý do"));
    }));
    if (store) bar.appendChild(btn("📂 Mở thư mục dữ liệu", "", function () { store.openFolder(); }));
    bar.appendChild(btn("Bắt đầu với dữ liệu trống", "red", function () {
      if (!confirm("Cất file hỏng sang tên khác (KHÔNG xóa) và bắt đầu với dữ liệu trống?")) return;
      var q = store && store.quarantine && store.quarantine(); db = {}; readOnly = false; loadError = null; ensureTables(); saveNow(); render(); alert("File hỏng đã được giữ lại với tên: " + (q || "(không có)"));
    }));
    c.appendChild(bar);
    var list = (loadError.backups || []).slice(0, 30);
    if (list.length) {
      var t = h("table"), tr = h("tr"); ["Bản sao lưu", "Thời điểm", "Dung lượng", ""].forEach(function (x) { tr.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      list.forEach(function (b) {
        var x = h("tr"); [b.name, fmtTime(b.mtime), Math.round(b.size / 1024) + " KB"].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v })); });
        x.appendChild(h("td", {}, [btn("Khôi phục bản này", "pri", function () { var r = store.readBackup(b.name); if (!r.ok) { alert(r.error); return; } restoreFromText(r.text, b.name, { quarantine: true }); })]));
        tb.appendChild(x);
      });
      t.appendChild(tb); c.appendChild(h("div", { class: "tw" }, [t]));
    } else c.appendChild(h("div", { class: "empty", text: "Không tìm thấy bản sao lưu tự động." }));
    w.appendChild(c); return w;
  }
  function napMau() {
    if (!need("dm.edit", "nạp danh mục")) return;
    var sd = HRM.seedDanhMuc(), done = [], skip = [];
    if (!txn(Object.keys(sd), function () {
      Object.keys(sd).forEach(function (k) { if (!db[k].length) { db[k] = sd[k]; done.push(DM[k].ten); } else skip.push(DM[k].ten); });
      if (done.length) audit("Nạp danh mục chuẩn", done.join(", "));
    })) { alert("Chưa nạp danh mục: " + lastTxnError); return; }
    render();
    alert((done.length ? "Đã nạp: " + done.join(", ") + "\n" : "") + (skip.length ? "Giữ nguyên (đã có dữ liệu): " + skip.join(", ") + "\n" : "") + "\nSố liệu lấy theo danh mục thật của HAK (QL_NHANSU). Kế toán kiểm tra lại đơn giá, tỷ lệ BH, biểu thuế theo quy định hiện hành.");
  }

