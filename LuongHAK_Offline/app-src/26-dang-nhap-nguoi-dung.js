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
    c.appendChild(h("div", { class: "hint", text: "Chọn file dữ liệu cũ (.json — \"Sao lưu ra file\" hoặc file dữ liệu đã xuất). Khôi phục bình thường, không đối chiếu nhật ký thao tác. Nếu file có tài khoản, đăng nhập bằng tài khoản cũ; nếu file chỉ có bảng dữ liệu, bước sau sẽ yêu cầu tạo tài khoản Admin." }));
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
  function setupAdminScreen() {
    if (st.setupMode === "restore") return restoreFirstRunScreen();
    var scr = setupAdminForm();
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
      var u = PERM.findUser(db, v.u);
      return (u ? AUTH.verify(v.p, u) : AUTH.hash(v.p, "00".repeat(16), PERM.ITER).then(function () { return false; })).then(function (ok) {
        if (!ok) { PERM.noteFail(v.u); throw new Error("Sai tên đăng nhập hoặc mật khẩu"); }
        if (u.khoa) throw new Error("Tài khoản đã bị khóa — liên hệ Admin");
        PERM.noteOk(v.u); session = u; lastActive = Date.now(); u.dangNhapLuc = new Date().toISOString();
        audit("Đăng nhập", u.tenDangNhap); saveNow();
        if (!mainLogin(u.tenDangNhap, v.p)) { session = null; throw new Error("Tiến trình chính không xác nhận được phiên đăng nhập — thử lại"); }
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
  // ---------- Quản trị người dùng (Admin) ----------
  function userForm(u) {
    var isNew = !u, body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var f = { u: h("input", { class: "i", style: "width:100%", value: u ? u.tenDangNhap : "" }), n: h("input", { class: "i", style: "width:100%", value: u ? u.hoTen : "" }),
      r: h("select", { style: "width:100%" }, Object.keys(PERM.ROLES).map(function (k) { return h("option", { value: k, text: PERM.ROLES[k].ten }); })),
      k: h("select", { style: "width:100%" }, [h("option", { value: "", text: "Đang hoạt động" }), h("option", { value: "1", text: "Khóa tài khoản" })]),
      p: h("input", { class: "i", type: "password", style: "width:100%", placeholder: isNew ? "" : "Để trống = giữ mật khẩu" }) };
    f.r.value = u ? u.vaiTro : "ketoanluong"; f.k.value = u && u.khoa ? "1" : ""; if (u) f.u.disabled = true;
    [["Tên đăng nhập", f.u], ["Họ tên", f.n], ["Vai trò", f.r], ["Trạng thái", f.k], [isNew ? "Mật khẩu tạm (người dùng phải đổi khi đăng nhập)" : "Đặt lại mật khẩu tạm", f.p]].forEach(function (x) { g.appendChild(h("div", { class: "fld" }, [h("label", { text: x[0] }), x[1]])); });
    var perm = h("div", { class: "hint" }), showPerm = function () { perm.textContent = "Quyền: " + PERM.ROLES[f.r.value].perms.map(function (p) { return PERM.PERMS[p]; }).join(" · "); };
    f.r.addEventListener("change", showPerm); showPerm(); body.appendChild(perm);
    modal(isNew ? "Thêm người dùng" : "Sửa người dùng — " + u.tenDangNhap, body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu", "pri", function () {
        if (!need("system.admin")) return;
        var name = f.u.value.trim(), next = { vaiTro: f.r.value, khoa: f.k.value === "1" };
        if (isNew && !/^[a-z0-9._-]{3,30}$/i.test(name)) { alert("Tên đăng nhập 3–30 ký tự: chữ không dấu, số, . _ -"); return; }
        if (isNew && PERM.findUser(db, name)) { alert("Tên đăng nhập đã tồn tại"); return; }
        if (!f.n.value.trim()) { alert("Cần nhập họ tên"); return; }
        if ((isNew || f.p.value) && PERM.validatePassword(f.p.value)) { alert(PERM.validatePassword(f.p.value)); return; }
        if (u && PERM.wouldRemoveLastAdmin(db, u, next)) { alert("Không thể: đây là Admin đang hoạt động cuối cùng."); return; }
        var done = function (k) {
          var savedId = u && u.id;
          var saved = txn(["nguoidung"], function () {
          var before = u ? { "Vai trò": u.vaiTro, "Khóa": u.khoa ? "Có" : "Không", "Họ tên": u.hoTen } : null;
          if (isNew) { u = Object.assign({ id: HRM.uid(), tenDangNhap: name, taoLuc: new Date().toISOString(), phaiDoiMK: true }, k); db.nguoidung.push(u); }
          else if (k) Object.assign(u, k, { phaiDoiMK: true });
          Object.assign(u, { hoTen: f.n.value.trim() }, next);
          audit(isNew ? "Thêm người dùng" : "Sửa người dùng", u.tenDangNhap + " · " + GRD.changedFields(before, { "Vai trò": u.vaiTro, "Khóa": u.khoa ? "Có" : "Không", "Họ tên": u.hoTen }).join("; ") + (k ? " · đặt mật khẩu tạm" : ""));
          });
          if (!saved) { u = isNew ? null : (db.nguoidung || []).find(function (x) { return x.id === savedId; }); alert("Chưa lưu người dùng: " + lastTxnError); return; }
          close(); render(); toast("Đã lưu người dùng");
        };
        if (isNew || f.p.value) AUTH.make(f.p.value).then(done); else done(null);
      })];
    });
  }
  function cardUsers() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "👥 Người dùng & phân quyền" }));
    c.appendChild(h("div", { class: "hint", text: "Chỉ Admin quản lý. Quyền được kiểm tra ở mọi thao tác ghi/xuất dữ liệu. Chỉ Admin được sửa dữ liệu hồi tố vào kỳ đã chốt, khôi phục dữ liệu, quản trị hệ thống." }));
    c.appendChild(h("div", { class: "bar" }, [btn("＋ Thêm người dùng", "pri", function () { userForm(null); })]));
    var rows = (db.nguoidung || []).map(function (u) { return { u: u, o: { "Tên đăng nhập": u.tenDangNhap, "Họ tên": u.hoTen, "Vai trò": (PERM.ROLES[u.vaiTro] || {}).ten || u.vaiTro, "Trạng thái": u.khoa ? "Khóa" : "Hoạt động", "Đăng nhập gần nhất": fmtTime(u.dangNhapLuc) } }; });
    var t = h("table"), tr = h("tr"); Object.keys(rows[0].o).concat([""]).forEach(function (x) { tr.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody"); rows.forEach(function (x) { var r = h("tr", { class: "click", on: { click: function () { userForm(x.u); } } }); Object.keys(x.o).forEach(function (k) { r.appendChild(h("td", { class: "t", text: x.o[k] })); }); r.appendChild(h("td", { class: "t", text: "Sửa ›" })); tb.appendChild(r); });
    t.appendChild(tb); c.appendChild(h("div", { class: "tw", style: "max-height:300px" }, [t]));
    c.appendChild(h("div", { class: "bar", style: "margin-top:10px" }, [btn("🔑 Cấp lại mã khôi phục Admin", "", function () {
      if (!need("system.admin")) return;
      if (!confirm("Cấp mã khôi phục MỚI? Mã cũ sẽ hết hiệu lực.")) return;
      var code = randomCode(); AUTH.make(code.replace(/-/g, "")).then(function (k) { if (!txn(["baomat"], function () { db.baomat = [{ khoiPhuc: k, taoLuc: new Date().toISOString() }]; audit("Cấp lại mã khôi phục Admin", ""); })) { alert("Chưa cấp mã khôi phục mới: " + lastTxnError); return; } showRecoveryCode(code); });
    })]));
    return c;
  }
  function recoveryScreen() {
    var w = h("div"), c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "⚠ Không mở được file dữ liệu" }));
    c.appendChild(h("div", { class: "warn", html: esc(loadError.error) + "<br>App <b>chưa ghi đè</b> file này. Hãy khôi phục từ một bản sao lưu bên dưới, hoặc từ file sao lưu bạn đã cất (USB/Drive)." }));
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("⬆ Khôi phục từ file…", "pri", function () { var f = h("input", { type: "file", accept: ".json" }); f.addEventListener("change", function () { var fr = new FileReader(); fr.onload = function () { restoreFromText(fr.result, f.files[0].name, { quarantine: true }); }; fr.readAsText(f.files[0]); }); f.click(); }));
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

