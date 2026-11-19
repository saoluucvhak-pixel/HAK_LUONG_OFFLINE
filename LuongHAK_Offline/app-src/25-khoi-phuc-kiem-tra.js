  // ---------- Khôi phục / sao lưu / kiểm tra dữ liệu ----------
  // opts.quarantine: cất file dữ liệu hỏng hiện tại (chỉ làm SAU khi người dùng đã xác nhận khôi phục)
  function restoreFromText(text, label, opts) {
    opts = opts || {};
    if (session && !need("backup.restore")) return opts.onCancel && opts.onCancel(); // màn hình khôi phục khi file hỏng: chưa đăng nhập được (xem RISK-05)
    var o;
    try { o = JSON.parse(text); } catch (e) { alert("File không phải dữ liệu hợp lệ (JSON lỗi)."); return opts.onCancel && opts.onCancel(); }
    if (!o || typeof o !== "object" || Array.isArray(o)) { alert("File không đúng cấu trúc dữ liệu của app."); return opts.onCancel && opts.onCancel(); }
    var known = Object.keys(ALL).concat(["kyluong", "nhansu", "congty"]).filter(function (k) { return Array.isArray(o[k]); });
    if (!known.length) { alert("File không chứa bảng dữ liệu nào của app — không khôi phục."); return opts.onCancel && opts.onCancel(); }
    var rep = SCH.validate(o, { tables: Object.keys(ALL), hrTables: Object.keys(HRT) });
    if (rep.fatal.length) { alert("KHÔNG khôi phục được — cấu trúc file không an toàn:\n- " + rep.fatal.join("\n- ")); return opts.onCancel && opts.onCancel(); }
    // So sánh các kỳ lương đã chốt: khôi phục bản cũ có thể làm MẤT bản chốt mới hơn
    var cur = loadError ? {} : chotSummary(db), nxt = chotSummary(o), diff = [];
    Object.keys(cur).forEach(function (k) { if (!nxt[k]) diff.push("MẤT bản chốt " + kyLabel(k) + " (" + cur[k] + ")"); else if (nxt[k] !== cur[k]) diff.push(kyLabel(k) + ": " + cur[k] + " → " + nxt[k]); });
    Object.keys(nxt).forEach(function (k) { if (!cur[k]) diff.push("Thêm bản chốt " + kyLabel(k) + " (" + nxt[k] + ")"); });
    if (!confirm("KHÔI PHỤC từ " + label + "\n\nFile này: " + summarize(o) + "\nHiện tại: " + (loadError ? "(không đọc được)" : summarize(db)) +
      (diff.length ? "\n\n⚠ KỲ LƯƠNG ĐÃ CHỐT thay đổi:\n- " + diff.join("\n- ") : "\n\nKỳ lương đã chốt: không thay đổi.") +
      (rep.errors.length ? "\n\n⚠ File có " + rep.errors.length + " vấn đề dữ liệu (xem Kiểm tra dữ liệu sau khi khôi phục)." : "") +
      "\n\nToàn bộ dữ liệu hiện tại sẽ được THAY THẾ. App sẽ tự sao lưu dữ liệu hiện tại trước khi khôi phục. Tiếp tục?")) return opts.onCancel && opts.onCancel();
    // P1: hộp thoại trên hứa "App sẽ tự sao lưu dữ liệu hiện tại trước khi khôi phục" — khác với nhập
    // Excel/mở chốt/gộp chấm công (có "before" + hoàn tác riêng), một khi đã ghi đè `db` và saveNow()
    // thành công thì KHÔNG còn đường nào lấy lại dữ liệu hiện tại ngoài chính bản sao lưu này — nên
    // CHẶN CỨNG nếu không tạo được, đúng với lời hứa đã đưa ra.
    if (opts.quarantine && store && store.quarantine) store.quarantine();
    else if (!readOnly && !backupOrBlock("truoc-khoi-phuc", "khôi phục dữ liệu")) return opts.onCancel && opts.onCancel();
    var apply = function () {
      var prev = db, prevRO = readOnly, prevErr = loadError, prevSession = session, prevDirty = dirty;
      var revert = function (why, writeBack) {
        db = prev; readOnly = prevRO; loadError = prevErr; session = prevSession;
        try { ensureTables(); } catch (e0) { /* giữ nguyên */ }
        st.kq = null; st.kqStale = true; dirty = prevDirty;
        if (writeBack && !saveNow()) why += "\nKhông ghi lại được dữ liệu trước khôi phục: " + lastSaveError;
        render();
        if (opts.onFail) opts.onFail(why); else alert(why);
      };
      // File chỉ có bảng dữ liệu (xuất/nhập bảng, không phải Full Backup) thì không có tài khoản/công ty/nhật ký.
      // Chỉ lấy phần của máy khi FILE KHÔNG CÓ (file bản sao lưu đầy đủ thì dùng nguyên tài khoản/nhật ký trong file — cài lại Windows không mất).
      if (prev && !prevErr) ["nguoidung", "baomat", "congty", "auditlog", "kyluong", "kyluong_lichsu", "ttluong"].forEach(function (k) { if (o[k] === undefined && prev[k] !== undefined) o[k] = JSON.parse(JSON.stringify(prev[k])); });
      try { db = o; var mm = HRM.migrate(db).concat(INT.normalizeDataset(db).messages, cleanImportedData(db)); readOnly = false; loadError = null; ensureTables(); }
      catch (e) { db = prev; readOnly = prevRO; loadError = prevErr; render(); if (opts.onFail) opts.onFail("Không nạp được dữ liệu: " + e.message); else alert("Không khôi phục được: " + e.message); return; }
      // Tài khoản lấy theo dữ liệu vừa khôi phục: người đang đăng nhập phải có trong đó, nếu không phải đăng nhập lại
      var me = session && PERM.findUser(db, session.tenDangNhap);
      session = me && !me.khoa ? me : null;
      audit("Khôi phục dữ liệu", label + (diff.length ? " — kỳ chốt thay đổi: " + diff.join("; ") : ""));
      if (!saveNow()) {
        revert("KHÔI PHỤC KHÔNG THÀNH CÔNG — chưa xác nhận ghi được xuống đĩa. Đã trả lại dữ liệu trước khôi phục trên giao diện.\n\nLý do: " + (lastSaveError || "Nơi lưu không xác nhận thành công"), false);
        return;
      }
      var fin = function () { st.kq = null; st.tab = "home"; render(); toast("Đã khôi phục từ " + label); if (mm.length) alert(mm.join("\n")); if (opts.after) opts.after(); };
      if (opts.verify) opts.verify().then(function (r) { if (r && r.ok) fin(); else revert((r && r.msg) || "Kiểm tra sau khôi phục không đạt", true); }, function (e) { revert(String(e && e.message || e), true); });
      else fin();
    };
    if (opts.prepare) opts.prepare().then(function (r) { if (r && r.ok) apply(); else if (opts.onFail) opts.onFail((r && r.msg) || "Không chuẩn bị được"); }, function (e) { if (opts.onFail) opts.onFail(String(e && e.message || e)); });
    else apply();
  }
  /** Lịch sao lưu tự động (α17) — cấu hình theo máy; chỉ Admin đổi được */
  function cardSchedule() {
    var c = h("div", { class: "card", "data-schedule": "1" });
    c.appendChild(h("h3", { text: "3 · 🕘 Tự sao lưu (SQLite) — Lịch sao lưu tự động" }));
    if (!store || !store.scheduleGet) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe). Bản chạy trình duyệt: dùng Sao lưu toàn bộ → JSON ở mục 1." })); return c; }
    var sc = store.scheduleGet() || {}, admin = can("system.admin");
    c.appendChild(h("div", { class: "hint", text: "Luôn có: sao lưu mỗi lần mở app, đầu mỗi ngày, trước thao tác lớn, sau chốt kỳ. Thêm dưới đây (chỉ khi dữ liệu ĐÃ THAY ĐỔI so với bản sao lưu gần nhất, không tạo bản trùng). App chạy offline nên chỉ sao lưu được khi app đang mở. Có thư mục thứ hai thì bản mới cũng tự chép sang." }));
    var set = function (o, msg) { var r = store.scheduleSet(o); if (r && r.ok) { audit("Đổi lịch sao lưu", msg); toast("Đã lưu lịch sao lưu: " + msg); } else alert("⚠ " + ((r && r.error) || "Không lưu được")); render(); };
    var sel = function (vals, cur, lab, on) { var s0 = h("select", { class: "i" }); vals.forEach(function (v) { var o = h("option", { value: String(v), text: lab(v) }); if (v === cur) o.selected = true; s0.appendChild(o); }); s0.disabled = !admin; s0.addEventListener("change", function () { on(+s0.value); }); return s0; };
    var hLab = function (v) { return v ? "Mỗi " + v + " giờ" : "Tắt"; }, dLab = function (v) { return v + " ngày"; };
    var every = sel([0, 1, 2, 4, 8], sc.everyHours, hLab, function (v) { set({ everyHours: v }, "định kỳ " + hLab(v).toLowerCase()); });
    var keep = sel([30, 60, 90, 180, 365], sc.keepDaily, dLab, function (v) { set({ keepDaily: v }, "giữ bản đầu ngày " + dLab(v)); });
    var cb = h("input", { type: "checkbox" }); cb.checked = !!sc.onClose; cb.disabled = !admin;
    cb.addEventListener("change", function () { set({ onClose: cb.checked }, cb.checked ? "sao lưu khi đóng app" : "không sao lưu khi đóng app"); });
    var g = h("div", { class: "schedg" }, [
      h("div", { class: "fld" }, [h("label", { text: "Sao lưu định kỳ khi app đang mở" }), every]),
      h("div", { class: "fld" }, [h("label", { text: "Giữ bản sao lưu đầu ngày" }), keep]),
      h("div", { class: "fld" }, [h("label", { text: "Khi đóng app" }), h("label", { class: "schk" }, [cb, h("span", { text: "Sao lưu khi đóng app" })])])]);
    c.appendChild(g);
    c.appendChild(h("div", { class: "hint", text: "Lần kiểm tra định kỳ gần nhất: " + (sc.lastAuto ? fmtTime(sc.lastAuto) : "chưa có") + " · Bản định kỳ giữ 48 bản, bản khi đóng app giữ 10 bản gần nhất." + (admin ? "" : " Chỉ Admin đổi được lịch.") }));
    return c;
  }
  function cardOffsite() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "🛡 Sao lưu ra ngoài máy — trạng thái chép (thư mục chọn ở mục 4)" }));
    if (!store || !store.backupStatus) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe). Bản chạy trình duyệt: dùng Sao lưu toàn bộ → JSON ở mục 1." })); return c; }
    var bs = store.backupStatus() || {};
    c.appendChild(h("div", { class: "hint", text: "Chọn 1 thư mục KHÁC ổ đĩa của máy này: USB, ổ cứng ngoài, ổ mạng (NAS) hoặc thư mục Google Drive đã đồng bộ. Mỗi bản sao lưu (đầu ngày, trước thao tác lớn, sau chốt kỳ…) sẽ tự chép sang thư mục con 'TinhLuongHAK-SaoLuu' và được kiểm tra SHA-256. Bản sau chốt kỳ được giữ vĩnh viễn." }));
    var rows = [
      ["Thư mục thứ hai", bs.mirrorDir || "— chưa chọn —"],
      ["Lần chép tốt gần nhất", bs.lastMirrorOk ? fmtTime(bs.lastMirrorOk) : "—"],
      ["Lần sao lưu ra ngoài gần nhất", bs.lastExternal ? fmtTime(bs.lastExternal) + (bs.daysSinceExternal != null ? " (" + bs.daysSinceExternal + " ngày trước)" : "") : "chưa có"],
      ["Bản sao lưu sau chốt kỳ (giữ vĩnh viễn)", String(bs.permanent || 0)]];
    var t = h("table"), tb = h("tbody"); rows.forEach(function (r) { tb.appendChild(h("tr", {}, [h("td", { class: "t", text: r[0] }), h("td", { class: "t", text: r[1] })])); }); t.appendChild(tb); c.appendChild(t);
    if (bs.lastMirrorError) c.appendChild(h("div", { class: "warn", text: "⚠ Lần chép gần nhất bị lỗi: " + bs.lastMirrorError }));
    var bar = h("div", { class: "bar" });
    if (bs.mirrorDir && can("backup.restore")) bar.appendChild(btn("⇪ Chép sang thư mục thứ hai ngay", "", function () {
      var r = store.mirrorSync(); if (r && r.ok) toast("Đã chép " + (r.copied || 0) + " bản sao lưu"); else alert("⚠ " + ((r && r.error) || "Không chép được")); render();
    }));
    c.appendChild(bar);
    return c;
  }
  /** Full Backup (GĐ5): 1 gói ZIP gồm dữ liệu + chứng từ gốc + manifest SHA-256. Khôi phục qua bước kiểm tra, chứng từ chỉ thêm không ghi đè. */
  var STG = { data: null, busy: false, msg: null };
  /** Cài đặt "Lưu trữ & Sao lưu": 4 thư mục. Đổi = chép + kiểm SHA-256 rồi mới chuyển; không xóa dữ liệu cũ. */
  function cardStorage() {
    var c = h("div", { class: "card", "data-card": "storage" });
    c.appendChild(h("h3", { text: "4 · 🗂 Thư mục sao lưu & lưu trữ (một bảng duy nhất)" }));
    if (!window.hakPaths) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe)." })); return c; }
    if (!STG.data) { window.hakPaths.get().then(function (r) { if (r && r.ok) { STG.data = r; if (st.tab === "backup") render(); } }); c.appendChild(h("div", { class: "hint", text: "Đang đọc cấu hình…" })); return c; }
    c.appendChild(h("div", { class: "hint", text: "Bấm \"Đổi…\" để chọn thư mục mới. App chép toàn bộ dữ liệu sang thư mục mới, kiểm tra SHA-256 từng file, chỉ khi đạt mới chuyển; dữ liệu cũ KHÔNG bị xóa. Chỉ Admin / người có quyền khôi phục thao tác được." }));
    if (!STG.json && window.hakJson) { window.hakJson.get().then(function (r) { if (r && r.ok) { STG.json = r; if (st.tab === "backup") render(); } }); }
    if (!STG.info) { window.hakPaths.info().then(function (r) { if (r && r.ok) { STG.info = r.info; STG.exportDir = r.exportDir; if (st.tab === "backup") render(); } }); }
    var fmtB = function (n) { return n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.ceil(n / 1024) + " KB"; };
    var t = h("table", { class: "t" });
    t.appendChild(h("tr", {}, ["Thư mục", "Đường dẫn hiện tại", "Dung lượng", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    var KS = [["sqlite", "Sao lưu SQLite (các bản tự động + bấm Sao lưu)"], ["json", "Sao lưu JSON"], ["backup", "Full Backup (có chứng từ, OCR)"], ["mirror", "Dự phòng ngoài máy (USB / NAS / Drive)"], ["docs", "Chứng từ gốc"], ["ocrLib", "Thư viện mẫu OCR"], ["export", "Thư mục xuất file"]];
    KS.forEach(function (kk) {
      var k = kk[0], movable = k !== "export" && k !== "sqlite", inf = STG.info && STG.info[k];
      var verify = STG.ver && STG.ver[k];
      var acts = h("td", {}, [h("div", { style: "display:flex;flex-wrap:wrap;gap:4px" }, [
        movable ? btn("Chọn / Chuyển…", "ghost", function () {
          if (!need("backup.restore", "đổi thư mục lưu trữ") || STG.busy) return;
          window.hakPaths.pick(k).then(function (p) {
            if (!p || !p.ok) return;
            if (!confirm("Chuyển \"" + kk[1] + "\" sang:\n" + p.dir + "\n\nDữ liệu sẽ được CHÉP và kiểm tra SHA-256, kho mới được mở thử trước khi đổi cấu hình; dữ liệu cũ vẫn giữ nguyên. Tiếp tục?")) return;
            STG.busy = true; toast("Đang chép và kiểm tra dữ liệu…");
            (k === "json" ? window.hakJson.setDir(p.dir) : window.hakPaths.move(k, p.dir)).then(function (r) {
              if (k === "mirror" && r && r.ok && store && store.mirrorSync) { var ms = store.mirrorSync(); if (ms && ms.ok) r.note = (r.note || "") + " Đã chép " + (ms.copied || 0) + " bản sao lưu sang thư mục dự phòng."; }
              STG.busy = false; STG.data = null; STG.info = null; STG.ver = null; STG.json = null;
              STG.msg = r && r.ok ? { bad: false, text: "✓ Đã chuyển " + r.files + " file sang " + r.to + " (đã kiểm SHA-256). " + r.note } : { bad: true, text: "⚠ " + ((r && r.error) || "không chuyển được") + " — giữ nguyên thư mục cũ" };
              audit("Đổi thư mục lưu trữ", k + " → " + p.dir + " · " + (r && r.ok ? "đạt" : "không đạt")); render();
            });
          });
        }, "Chọn thư mục mới và chuyển dữ liệu sang (chép + kiểm SHA-256, không xóa dữ liệu cũ)") : null,
        k === "mirror" && STG.data.paths.mirror && can("system.admin") ? btn("Bỏ thư mục dự phòng", "ghost", function () { if (!confirm("Bỏ thư mục sao lưu dự phòng? (Các bản đã chép ở đó vẫn giữ nguyên)")) return; store.mirrorClear(); audit("Bỏ thư mục sao lưu dự phòng", STG.data.paths.mirror); STG.data = null; STG.info = null; render(); }, "Ngừng chép sang thư mục dự phòng") : null,
        btn("Mở", "ghost", function () { window.hakPaths.open(k).then(function (r) { if (!r || !r.ok) toast("⚠ " + ((r && r.error) || "không mở được")); }); }, "Mở thư mục trong Windows Explorer"),
        btn("Kiểm tra", "ghost", function () {
          STG.ver = STG.ver || {}; STG.ver[k] = { text: "Đang kiểm tra…" }; render();
          window.hakPaths.verify(k).then(function (r) { STG.ver[k] = r && r.ok ? { good: r.good, text: r.text } : { good: false, text: (r && r.error) || "lỗi" }; render(); });
        }, "Kiểm tra toàn vẹn (chỉ đọc, không sửa gì)"),
        btn("↻ Dung lượng", "ghost", function () { STG.info = null; render(); })])]);
      t.appendChild(h("tr", { "data-stg": k }, [h("td", { text: kk[1] }), h("td", { text: (k === "mirror" ? (STG.data.paths.mirror || "(chưa chọn)") : k === "export" ? STG.exportDir || "(thư mục xuất file mặc định)" : k === "sqlite" ? ((store && store.info && store.info().backupDir) || "…") : k === "json" ? (STG.json ? STG.json.dir : "…") : STG.data.paths[k]), style: "word-break:break-all" }),
        h("td", { text: inf ? (inf.exists ? inf.files + " file · " + fmtB(inf.bytes) + (inf.free != null ? " · trống " + fmtB(inf.free) : "") : "chưa tạo") : "…" }),
        acts]));
      if (k === "sqlite") t.appendChild(h("tr", {}, [h("td"), h("td", { colspan: 3, class: "hint", "data-stg-note": "sqlite", text: "Cố định trong thư mục dữ liệu; muốn có bản ở nơi khác hãy đặt Thư mục dự phòng" })])); // CEO chọn (a) ở #113: thư mục SQLite chỉ xem/mở/kiểm
      if (verify) t.appendChild(h("tr", {}, [h("td"), h("td", { colspan: 3, class: verify.good === false ? "warn" : "ok", "data-stg-verify": k, text: (verify.good === false ? "✕ " : verify.good ? "✓ " : "") + verify.text })]));
    });
    c.appendChild(h("div", { style: "overflow-x:auto;max-width:100%" }, [t])); // cửa sổ hẹp: bảng cuộn ngang, không tràn khỏi khung
    if (STG.msg) c.appendChild(h("div", { class: STG.msg.bad ? "warn" : "ok", "data-stg-msg": "1", text: STG.msg.text }));
    return c;
  }
  /** Tạo Full Backup (gói .zip: dữ liệu + chứng từ gốc + thư viện OCR + manifest SHA-256). Gọi từ khu 1 "Sao lưu ngay". */
  function fullCreate() {
        if (!need("backup.restore", "tạo Full Backup")) return;
        if (st.fbBusy) { toast("Đang tạo Full Backup — chờ xong hoặc bấm Hủy"); return; } // V9: chống chạy 2 lần
        if (!saveNow()) { alert("Chưa lưu được dữ liệu hiện tại xuống đĩa — không tạo Full Backup."); return; }
        askPassword("Bảo vệ gói sao lưu bằng mật khẩu", "Nhập mật khẩu để MÃ HÓA gói Full Backup (AES-256), hoặc bỏ trống để tạo gói không mã hóa.\nAPP KHÔNG LƯU mật khẩu — mất mật khẩu thì không mở lại được gói. Hãy ghi mật khẩu ở nơi an toàn, tách khỏi gói.", { optional: true, confirm: true, check: function (v) { return pwWeak(v); }, okText: "Tạo Full Backup" }, function (pw) {
        st.fbBusy = true; st.fbMsg = { text: "Đang đóng gói…" }; render();
        var offProg = window.hakFull.onProgress ? window.hakFull.onProgress(function (m) { var tx = "Đang đóng gói… " + ((m && m.text) || m || ""); st.fbMsg = { text: tx }; var el = document.querySelector("[data-fb-msg]"); if (el) el.textContent = tx; }) : null;
        window.hakFull.create({ user: currentUser(), password: pw }).then(function (r) {
          if (r && r.status === "FAILED" && r.missing && r.missing.length) {
            // thiếu/hỏng thành phần: KHÔNG tạo Full Backup; chỉ tạo gói PARTIAL khi người dùng xác nhận rõ ràng
            var list = r.missing.slice(0, 15).map(function (x) { return "• " + x.kind + " " + x.id + (x.name ? " (" + x.name + ")" : "") + " — " + x.problem; }).join("\n");
            if (confirm("KHÔNG thể tạo Full Backup đầy đủ — thiếu/hỏng " + r.missing.length + " thành phần:\n" + list + (r.missing.length > 15 ? "\n…" : "") + "\n\nBạn có thể tạo gói SAO LƯU MỘT PHẦN (PARTIAL): chỉ gồm phần còn nguyên vẹn, KHÔNG tính là Full Backup, không thay được bản sao lưu đầy đủ.\n\nTạo gói một phần?")) {
              return window.hakFull.create({ user: currentUser(), allowPartial: true, password: pw });
            }
          }
          return r;
        }).then(function (r) {
          if (!r || (!r.ok && r.status !== "PARTIAL")) { st.fbMsg = { bad: true, text: "⚠ " + (r && r.status === "CANCELLED" ? "Đã hủy sao lưu." : "KHÔNG tạo được Full Backup: " + ((r && r.error) || "lỗi không rõ")) }; }
          else if (r.status === "PARTIAL") { audit("Tạo gói sao lưu MỘT PHẦN", r.name + " · thiếu " + r.missing.length + " thành phần"); save(); st.fbMsg = { bad: true, text: "⚠ Đã tạo gói MỘT PHẦN " + r.name + " — KHÔNG phải Full Backup. Thiếu: " + r.missing.map(function (x) { return x.kind + " " + x.id; }).join(", ") }; }
          else { audit("Tạo Full Backup", r.name + " · " + r.docs + " chứng từ · SHA-256 " + r.sha256.slice(0, 12) + "…"); save(); st.fbMsg = { text: "✓ Full Backup ĐẦY ĐỦ " + (r.encrypted ? "🔒 (ĐÃ MÃ HÓA) " : "") + r.name + " (" + Math.round(r.size / 1024) + " KB, " + r.docs + " chứng từ, " + (r.ocrSamples || 0) + " mẫu OCR, " + (r.yearArchives || 0) + " gói hồ sơ năm) trong thư mục xuất file" + (r.mirrored ? " và chép sang " + r.mirrored : "") + (r.warnings.length ? " — ⚠ " + r.warnings.join("; ") : "") + ". SHA-256: " + r.sha256 }; }
          render();
        }, function (e) { st.fbMsg = { bad: true, text: "⚠ " + e.message }; render(); }).then(function () { st.fbBusy = false; if (offProg) offProg(); render(); });
        });
  }
  /** Khôi phục từ gói Full Backup (.zip / .hakenc): kiểm tra → xác nhận → ghi. Gọi từ khu 2 "Khôi phục". */
  function fullRestore() {
        if (!need("backup.restore")) return;
        var fail = function (msg) { st.fbMsg = { bad: true, text: msg }; render(); alert(msg); };
        var run = function (acceptPartial, pw, retry) {
          window.hakFull.stage({ acceptPartial: !!acceptPartial, password: pw }).then(function (r) {
            if (r && r.cancelled) return;
            if (r && (r.needPassword || r.wrongPassword)) { // gói mã hóa (.hakenc): hỏi mật khẩu; sai thì hỏi lại, không ghi gì
              askPassword("Gói sao lưu được mã hóa", (r.wrongPassword ? "⚠ Sai mật khẩu hoặc gói đã bị sửa. Nhập lại.\n" : "") + "Nhập mật khẩu đã dùng khi tạo gói. Gói được giải mã vào thư mục tạm, kiểm tra xong sẽ xóa bản giải mã.", { okText: "Mở gói" }, function (p) { run(acceptPartial, p); });
              return;
            }
            if (r && r.needsPartialAck) {
              if (confirm("Gói này là SAO LƯU MỘT PHẦN (không phải Full Backup). Thiếu:\n" + (r.missing || []).map(function (x) { return "• " + x.kind + " " + x.id + " — " + x.problem; }).join("\n") + "\n\nVẫn tiếp tục khôi phục phần có trong gói?")) run(true);
              return;
            }
            if (!r || !r.ok) { st.fbMsg = { bad: true, text: "⚠ Gói KHÔNG đạt kiểm tra (" + ((r && r.phase) || "") + ") — chưa ghi gì: " + ((r && (r.error || (r.problems || []).join("; "))) || "lỗi không rõ") }; render(); return; }
            var cnt = { new: 0, same: 0, conflict: 0 }; (r.docs || []).forEach(function (d) { cnt[d.state] = (cnt[d.state] || 0) + 1; });
            var info = "Gói " + r.label + " — tạo " + fmtTime(r.manifest.createdAt) + (r.manifest.createdBy ? " bởi " + r.manifest.createdBy : "") + (r.partial ? " · ⚠ GÓI MỘT PHẦN" : "") + ".\n" +
              r.phases.map(function (p) { return "✓ " + p.name + ": " + p.detail; }).join("\n") +
              "\nChứng từ: " + cnt.new + " mới sẽ được thêm, " + cnt.same + " đã có sẵn, " + cnt.conflict + " trùng mã nhưng khác nội dung (giữ bản đang có, không ghi đè)." + (r.warnings && r.warnings.length ? "\n⚠ " + r.warnings.join("\n⚠ ") : "");
            if (!confirm(info + "\n\nGói đã được giải nén & kiểm tra ở thư mục tạm, CHƯA ghi gì vào dữ liệu đang chạy. Tiếp tục sang bước ghi?")) { window.hakFull.discard(r.rid); return; }
            restoreFromText(r.text, "Full Backup " + r.label, {
              strict: true,
              // COMMIT tài sản (chứng từ + thư viện OCR, có nhật ký hoàn tác) chạy SAU xác nhận & sao lưu "trước khôi phục" và TRƯỚC khi thay dữ liệu lương
              prepare: function () {
                return window.hakFull.commit(r.rid).then(function (c) { if (c && c.ok) r._commit = c; return c && c.ok ? { ok: true } : { ok: false, msg: "Không ghi được chứng từ/thư viện OCR: " + ((c && c.error) || "lỗi không rõ") }; });
              },
              verify: function () { // POSTCHECK sau khi dữ liệu lương đã ghi xuống đĩa
                return window.hakFull.postcheck(r.rid).then(function (p) { return p && p.ok ? { ok: true } : { ok: false, msg: "Kiểm tra sau khôi phục KHÔNG đạt: " + ((p && p.checks) || []).filter(function (k) { return !k.ok; }).map(function (k) { return k.name + " (" + k.detail + ")"; }).join("; ") }; });
              },
              onCancel: function () { window.hakFull.discard(r.rid); },
              onFail: function (why) { window.hakFull.rollback(r.rid).then(function () { fail("⚠ Khôi phục KHÔNG hoàn tất — đã hoàn tác, dữ liệu như trước khi khôi phục. Lý do: " + why); }); },
              after: function () {
                window.hakFull.finish(r.rid).then(function () {
                  var d = (r._commit || {}).docs || { added: 0, same: 0, conflict: [] }, o2 = (r._commit || {}).ocr;
                  st.fbMsg = { bad: (d.conflict || []).length > 0, text: "✓ Khôi phục xong. Chứng từ: thêm " + d.added + ", đã có " + d.same + ((d.conflict || []).length ? ", TRÙNG MÃ KHÁC NỘI DUNG (giữ bản cũ): " + d.conflict.join(", ") : "") + (o2 ? ". Thư viện mẫu OCR: thêm " + o2.addedSamples + " mẫu, " + o2.addedEdits + " lần sửa" : "") + (r.partial ? ". ⚠ Đây là gói MỘT PHẦN." : "") + ". Đã kiểm tra mở lại nhân viên, bảng chấm công, kỳ lương, chứng từ, mẫu OCR." };
                  audit("Khôi phục Full Backup", st.fbMsg.text); save(); render(); if (st.fbMsg.bad) alert(st.fbMsg.text); else toast(st.fbMsg.text);
                });
              }
            });
          });
        };
        run(false);
  }
  /** Sao lưu JSON: ghi vào THƯ MỤC JSON đã đặt (tên có ngày giờ); bản chạy trình duyệt (không có app) mới dùng hộp thoại tải về. */
  function jsonBackup(viaDownload) {
    if (!need("backup.restore", "sao lưu toàn bộ dữ liệu ra file")) return;
    if (viaDownload || !window.hakJson) { download("LuongHAK_backup_" + HRM.today() + ".json", "application/json", JSON.stringify(db)); audit("Sao lưu ra file", viaDownload ? "lưu vào chỗ khác" : ""); if (store && store.noteExternal) store.noteExternal(); return; }
    if (!saveNow()) { alert("Chưa lưu được dữ liệu hiện tại xuống đĩa — không sao lưu JSON."); return; }
    window.hakJson.backup().then(function (r) {
      if (r && r.ok) { audit("Sao lưu JSON", r.name); st.fbMsg = { text: "✓ Đã ghi " + r.name + " (" + Math.round(r.size / 1024) + " KB) vào " + r.dir + " · SHA-256 " + r.sha256.slice(0, 12) + "… — chỉ có DỮ LIỆU, không có chứng từ gốc và thư viện mẫu OCR (muốn đủ: chọn Full Backup)." }; }
      else st.fbMsg = { bad: true, text: "⚠ KHÔNG ghi được file JSON: " + ((r && r.error) || "lỗi không rõ") };
      render();
    });
  }
  /** Khôi phục từ file JSON (hộp thoại chọn file) — kiểm tra + xác nhận nằm trong restoreFromText. */
  function jsonRestore() {
    if (!need("backup.restore")) return;
    var f = h("input", { type: "file", accept: ".json" });
    f.addEventListener("change", function () { var fr = new FileReader(); fr.onload = function () { restoreFromText(fr.result, f.files[0].name); }; fr.readAsText(f.files[0]); });
    f.click();
  }
  // ===== 012-B2 (issue #113): SAO LƯU / KHÔI PHỤC THEO KỲ LƯƠNG — giao diện trên lõi HAKCore.repo.period (012-B1) =====
  function periodBackup() {
    if (!need("backup.restore", "sao lưu kỳ lương")) return;
    if (!window.hakPeriod) { alert("Sao lưu kỳ lương chỉ có trong bản cài (.exe)."); return; }
    var ky = kyStr();
    var go = function (pw) {
      if (dirty && !saveNow()) { alert("⚠ Chưa lưu được dữ liệu đang sửa — chưa tạo gói kỳ " + ky + "."); return; }
      window.hakPeriod.create({ ky: ky, user: session ? session.tenDangNhap : "", password: pw || "" }).then(function (r) {
        if (r && r.ok) { audit("Sao lưu kỳ lương", ky + " → " + r.name + (r.encrypted ? " (có mật khẩu)" : "")); save(); st.fbMsg = { text: "✓ Đã tạo gói kỳ " + ky + ": " + r.name + " (" + Math.max(1, Math.round((r.size || 0) / 1024)) + " KB) trong thư mục Full Backup ở mục 4." }; }
        else st.fbMsg = { bad: true, text: "⚠ Không tạo được gói kỳ " + ky + ": " + ((r && r.error) || "không rõ lý do") };
        render();
      }, function (e) { st.fbMsg = { bad: true, text: "⚠ Không tạo được gói kỳ: " + String(e && e.message || e) }; render(); });
    };
    if (st.kyPw) askText("Mật khẩu cho gói kỳ " + ky, "Mất mật khẩu = không mở được gói (không có cửa hậu). Tối thiểu 10 ký tự, kết hợp ít nhất 2 loại: chữ thường, chữ hoa, số, ký tự đặc biệt.", { type: "password", required: true, label: "Mật khẩu" }, go);
    else go("");
  }
  function periodRestore(name, pw) {
    if (!need("backup.restore")) return;
    if (!window.hakPeriod) { alert("Khôi phục kỳ lương chỉ có trong bản cài (.exe)."); return; }
    window.hakPeriod.inspect(name || "", pw || "").then(function (r) {
      if (!r || r.cancelled) return;
      if (r.needPassword || r.wrongPassword) return askText("Gói kỳ có mật khẩu", r.wrongPassword ? "Mật khẩu chưa đúng. Nhập lại:" : "Gói được mã hóa. Nhập mật khẩu đã đặt khi sao lưu:", { type: "password", required: true, label: "Mật khẩu" }, function (p) { periodRestore(":last", p); });
      if (!r.ok) { alert("⛔ Không dùng được gói kỳ: " + (r.error || "không rõ lý do") + "\n\nDữ liệu hiện tại KHÔNG bị thay đổi."); return; }
      periodPreview(r, { allowDelete: false, confirmReclose: false, ackGlobal: false });
    }, function (e) { alert("⛔ Không đọc được gói kỳ: " + String(e && e.message || e)); });
  }
  /** Màn xem trước: mọi thay đổi cũ → mới, ô "cho phép xóa" TẮT sẵn, hàng bị chặn xóa (đỏ), cảnh báo chốt lại kỳ và ảnh hưởng kỳ khác — mỗi cảnh báo có ô xác nhận riêng. */
  function periodPreview(r, opt) {
    var P = window.HAKCore.repo.period, ky = r.manifest && r.manifest.ky, plan = P.plan(db, r.payload, ky, { allowDelete: opt.allowDelete });
    var body = h("div", { "data-ky-preview": "1" }), redraw = function () { periodPreview(r, opt); };
    body.appendChild(h("div", { class: "hint", text: "Gói: " + (r.label || "") + " · kỳ " + ky + " · tạo lúc " + ((r.manifest && r.manifest.tao) || "?") + " · bản app " + ((r.manifest && r.manifest.phienBanApp) || "?") + (r.encrypted ? " · có mật khẩu" : "") }));
    if (!plan.ok) {
      body.appendChild(h("div", { class: "warn", "data-ky-blocked": "1", text: "⛔ " + (plan.blocked || plan.errors.join(" ")) }));
      modal("Khôi phục kỳ " + ky + " — không thực hiện được", body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true });
      return;
    }
    var rows = Object.keys(plan.period).map(function (t) { var x = plan.period[t]; return { "Bảng (phát sinh của kỳ)": (ALL[t] && ALL[t].ten) || t, "Ở máy (sẽ thay)": x.before, "Trong gói": x.after }; });
    body.appendChild(h("div", { class: "fh", text: "1. Dữ liệu phát sinh của kỳ " + ky + " — thay toàn bộ; các kỳ khác KHÔNG đổi" }));
    body.appendChild(rows.length ? simpleTable(rows) : h("div", { class: "hint", text: "Gói và máy đều không có dữ liệu phát sinh của kỳ này." }));
    var chg = [];
    Object.keys(plan.global).forEach(function (t) {
      var g = plan.global[t], ten = (HRT && HRT[t] && HRT[t].ten) || (ALL[t] && ALL[t].ten) || t;
      g.add.forEach(function (x) { chg.push({ "Bảng": ten, "Thay đổi": "Thêm", "Dòng": canonShort(x), "Cũ → mới": "" }); });
      g.change.forEach(function (c) { chg.push({ "Bảng": ten, "Thay đổi": "Sửa", "Dòng": String(c.key), "Cũ → mới": c.fields.map(function (f) { return f + ": " + shortV(c.before[f]) + " → " + shortV(c.after[f]); }).join("; ") }); });
    });
    body.appendChild(h("div", { class: "fh", text: "2. Nhân sự, danh mục, công thức — GHI ĐÈ theo gói: thêm " + plan.counts.add + ", sửa " + plan.counts.change }));
    body.appendChild(chg.length ? h("div", { "data-ky-changes": String(chg.length) }, [simpleTable(chg.slice(0, 200))]) : h("div", { class: "hint", text: "Không có thay đổi." }));
    if (chg.length > 200) body.appendChild(h("div", { class: "hint", text: "… còn " + (chg.length - 200) + " thay đổi nữa." }));
    var nDel = plan.deletes.rows.length + plan.deletes.blocked.length;
    if (nDel) {
      body.appendChild(h("div", { class: "fh", text: "3. Có ở máy nhưng KHÔNG có trong gói: " + nDel + " hàng" }));
      var cbD = h("input", { type: "checkbox", "data-ky-allow-delete": "1" }); cbD.checked = !!opt.allowDelete; cbD.addEventListener("change", function () { opt.allowDelete = cbD.checked; redraw(); });
      body.appendChild(h("label", { class: "schk" }, [cbD, h("span", { text: "Cho phép XÓA " + plan.deletes.rows.length + " hàng không còn được dùng (mặc định: giữ lại)" })]));
      if (plan.deletes.blocked.length) body.appendChild(h("div", { class: "warn", "data-ky-del-blocked": String(plan.deletes.blocked.length), text: "Không bao giờ xóa (đang được dùng): " + plan.deletes.blocked.slice(0, 20).map(function (b) { return ((HRT && HRT[b.table] && HRT[b.table].ten) || b.table) + " " + canonShort(b.row) + " — " + b.reason; }).join(" · ") + (plan.deletes.blocked.length > 20 ? " …" : "") }));
    }
    if (plan.slOther.length) body.appendChild(h("div", { class: "hint", "data-ky-sl-other": String(plan.slOther.length), text: "Chuyển sản lượng TỪ kỳ " + ky + " sang kỳ khác (giữ nguyên ở máy): " + plan.slOther.map(function (s) { return s.id + " (" + s.status + ") — " + s.note; }).join(" · ") }));
    var cbR = null, cbG = null, needG = plan.counts.add + plan.counts.change + (opt.allowDelete ? plan.deletes.rows.length : 0) > 0;
    if (plan.reclose) { cbR = h("input", { type: "checkbox", "data-ky-confirm-reclose": "1" }); cbR.checked = !!opt.confirmReclose; cbR.addEventListener("change", function () { opt.confirmReclose = cbR.checked; }); body.appendChild(h("div", { class: "warn", "data-ky-reclose": "1" }, [h("div", { text: "⚠ Gói chứa BẢN CHỐT của kỳ " + ky + " (lúc sao lưu kỳ đã chốt). Ở máy kỳ đang MỞ." }), h("label", { class: "schk" }, [cbR, h("span", { text: "CHỐT LẠI kỳ bằng số liệu trong gói (bỏ trống = chỉ khôi phục dữ liệu, kỳ vẫn mở)" })])])); }
    if (needG) { cbG = h("input", { type: "checkbox", "data-ky-ack-global": "1" }); cbG.checked = !!opt.ackGlobal; cbG.addEventListener("change", function () { opt.ackGlobal = cbG.checked; }); body.appendChild(h("div", { class: "warn", "data-ky-warn-global": "1" }, [h("div", { text: "⚠ Nhân sự, danh mục, công thức được ghi đè theo gói" + (plan.otherOpenPeriods.length ? ": sẽ ảnh hưởng cả các kỳ khác CHƯA chốt (" + plan.otherOpenPeriods.join(", ") + ")" : "") + ". Kỳ đã chốt không đổi." }), h("label", { class: "schk" }, [cbG, h("span", { text: "Tôi đã xem các thay đổi ở mục 2" + (opt.allowDelete ? "–3" : "") + " và đồng ý ghi đè" })])])); }
    body.appendChild(h("div", { class: "hint", text: "Trước khi ghi, app tự SAO LƯU TOÀN BỘ dữ liệu hiện tại; nếu không sao lưu được thì dừng, không ghi gì." }));
    modal("Xem trước khôi phục kỳ " + ky, body, function (close) {
      var goBtn = btn("📥 Khôi phục kỳ " + ky, "pri", function () {
        if (cbG && !cbG.checked) { toast("Hãy tích ô xác nhận ghi đè nhân sự / danh mục / công thức"); return; }
        if (!backupOrBlock("truoc-khoi-phuc-ky", "khôi phục kỳ " + ky)) return;
        var fresh = P.plan(db, r.payload, ky, { allowDelete: opt.allowDelete }), res = null;
        var tables = P.PERIOD_TABLES.concat(Object.keys(fresh.global || {}));
        var ok = txn(tables, function () { res = P.apply(db, fresh, r.payload, { confirmReclose: !!(cbR && cbR.checked) }); if (!res.ok) throw new Error(res.error); audit("Khôi phục kỳ lương", res.audit + " · từ " + (r.label || "gói")); });
        close();
        if (ok) { st.fbMsg = { text: "✓ " + res.audit + ". Đã sao lưu toàn bộ trước khi khôi phục." }; toast("Đã khôi phục kỳ " + ky); }
        else st.fbMsg = { bad: true, text: "⛔ KHÔNG khôi phục được kỳ " + ky + ": " + (lastTxnError || "không rõ lý do") + ". Dữ liệu đã trả về như trước." };
        render();
      }, "Sao lưu toàn bộ rồi ghi theo gói");
      goBtn.setAttribute("data-ky-apply", "1");
      return [btn("Hủy", "", close), goBtn];
    }, { wide: true });
  }
  function canonShort(r) { var keys = Object.keys(r || {}).slice(0, 3); return keys.map(function (k) { return shortV(r[k]); }).join(" / "); }
  function shortV(v) { var s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return s.length > 40 ? s.slice(0, 39) + "…" : s; }
  var BK_HINT = {
    sqlite: "Bản chụp SQLite đã kiểm (nhanh nhất, khôi phục nguyên trạng) ghi vào thư mục sao lưu SQLite ở mục 4. Chỉ có DỮ LIỆU LƯƠNG; chứng từ gốc và thư viện OCR nằm trong Full Backup.",
    full: "Một file .zip gồm TOÀN BỘ dữ liệu + chứng từ gốc + thư viện mẫu OCR + bảng kê SHA-256, có thể mã hóa (.hakenc). Dùng khi đổi máy / cài lại Windows. Gói được kiểm tra lại ngay sau khi tạo.",
    json: "File .json chỉ có DỮ LIỆU (nhân sự, hợp đồng, danh mục, công thức, cài đặt, người dùng, nhật ký) — KHÔNG có chứng từ gốc và thư viện OCR. Ghi vào thư mục sao lưu JSON ở mục 4."
  };
  /** Khu 1 — SAO LƯU NGAY (012-A): một nút, chọn loại. Phạm vi "Toàn bộ" = mọi bảng. */
  function cardBackupNow() {
    var c = h("div", { class: "card", "data-zone": "now", "data-fullbackup": "1" });
    c.appendChild(h("h3", { text: "1 · 💾 Sao lưu ngay — toàn bộ dữ liệu" }));
    var kinds = [];
    if (store && store.listBackups) kinds.push(["sqlite", "SQLite (bản chụp đã kiểm) — mặc định"]);
    if (window.hakFull) kinds.push(["full", "Full Backup .zip (có chứng từ gốc + thư viện OCR)"]);
    kinds.push(["json", "JSON (chỉ dữ liệu)"]);
    var cur = kinds.some(function (k) { return k[0] === st.bkKind; }) ? st.bkKind : kinds[0][0];
    var sel = h("select", { class: "i", "data-backup-kind": "1", "aria-label": "Loại sao lưu" }); kinds.forEach(function (k) { var o = h("option", { value: k[0], text: k[1] }); if (k[0] === cur) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", function () { st.bkKind = sel.value; render(); });
    var go = btn("💾 Sao lưu toàn bộ", "pri", function () {
      if (sel.value === "full") return fullCreate();
      if (sel.value === "json") return jsonBackup(false);
      if (!need("backup.restore", "tạo bản sao lưu")) return;
      var n = backupNow("thu-cong");
      // P1: backupNow() trả null cho cả "chưa có file dữ liệu" và "ghi thất bại" — phân biệt rõ bằng store.hasDataFile()
      toast(n ? "Đã tạo " + n : ((store && store.hasDataFile && store.hasDataFile()) ? "⚠ KHÔNG tạo được bản sao lưu — kiểm tra dung lượng đĩa / quyền ghi" : "Chưa có dữ liệu để sao lưu"));
      render();
    }, "Sao lưu theo loại đã chọn, ghi vào thư mục ở mục 4");
    go.setAttribute("data-backup-now", "1");
    var bar = h("div", { class: "bar" }, [sel, go]);
    if (st.fbBusy) bar.appendChild(btn("✕ Hủy sao lưu", "", function () { window.hakFull.cancel().then(function (r) { toast(r && r.ok ? "Đang hủy…" : (r && r.error) || "Không hủy được"); }); }, "Dừng đóng gói; file tạm được xóa, dữ liệu không đổi"));
    if (cur === "json" && window.hakJson) bar.appendChild(btn("Lưu vào chỗ khác…", "ghost", function () { jsonBackup(true); }, "Mở hộp thoại tải về thay vì ghi vào thư mục JSON"));
    c.appendChild(bar);
    c.appendChild(h("div", { class: "hint", text: BK_HINT[cur] }));
    if (window.hakPeriod) { // 012-B2: sao lưu THEO KỲ — phát sinh của kỳ đang chọn + toàn bộ nhân sự / danh mục / công thức
      var cbP = h("input", { type: "checkbox", "data-ky-pw": "1" }); cbP.checked = !!st.kyPw; cbP.addEventListener("change", function () { st.kyPw = cbP.checked; });
      var kb = btn("🗓 Sao lưu kỳ " + kyStr(), "", periodBackup, "Gói .zip gồm dữ liệu phát sinh của kỳ đang chọn + toàn bộ nhân sự, danh mục, công thức"); kb.setAttribute("data-ky-backup", "1");
      c.appendChild(h("div", { class: "bar" }, [kb, h("label", { class: "schk" }, [cbP, h("span", { text: "Đặt mật khẩu (.hakenc)" })])]));
      c.appendChild(h("div", { class: "hint", text: "Gói kỳ (.zip): chấm công, sản lượng, bán dăm, phát sinh, tạm ứng, tiền cơm, kết quả và bản chốt của kỳ + TOÀN BỘ nhân sự, danh mục, công thức lúc sao lưu. Đổi kỳ ở thanh trên." }));
    }
    c.appendChild(h("div", { class: "hint", text: "Trước khi cài lại Windows / đổi máy: sao lưu rồi cất file sang USB/Drive (thư mục dự phòng ở mục 4 tự chép giúp). Sang máy mới: cài app rồi Khôi phục ở mục 2. Sao lưu theo KỲ LƯƠNG: chưa có (làm ở bước 012-B)." }));
    return c;
  }
  /** Khu 2 — KHÔI PHỤC (012-A): một nút, chọn loại. Luôn có bước kiểm tra + xác nhận, tự sao lưu bản hiện tại trước khi ghi. */
  function cardRestore() {
    var c = h("div", { class: "card", "data-zone": "restore" });
    c.appendChild(h("h3", { text: "2 · 📥 Khôi phục toàn bộ" }));
    var kinds = []; if (window.hakFull) kinds.push(["full", "Gói Full Backup (.zip / .hakenc)"]); kinds.push(["json", "File JSON (.json)"]);
    var cur = kinds.some(function (k) { return k[0] === st.rsKind; }) ? st.rsKind : kinds[0][0];
    var sel = h("select", { class: "i", "data-restore-kind": "1", "aria-label": "Loại file khôi phục" }); kinds.forEach(function (k) { var o = h("option", { value: k[0], text: k[1] }); if (k[0] === cur) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", function () { st.rsKind = sel.value; });
    var go = btn("📥 Khôi phục toàn bộ…", "", function () { return sel.value === "full" ? fullRestore() : jsonRestore(); }, "Chọn file → kiểm tra toàn vẹn → xác nhận → ghi (tự sao lưu bản hiện tại trước)");
    go.setAttribute("data-restore-now", "1");
    c.appendChild(h("div", { class: "bar" }, [sel, go]));
    if (window.hakPeriod) { var kr = btn("🗓 Khôi phục kỳ lương…", "", function () { periodRestore("", ""); }, "Chọn gói kỳ (.zip / .hakenc) → kiểm tra → xem trước từng thay đổi → xác nhận"); kr.setAttribute("data-ky-restore", "1"); c.appendChild(h("div", { class: "bar" }, [kr])); }
    c.appendChild(h("div", { class: "hint", text: "Muốn khôi phục từ một bản SQLite hoặc JSON đã có trên máy: bấm \"Khôi phục\" ở dòng đó trong danh sách (mục 5). Luôn có bước kiểm tra và xác nhận; app sao lưu bản hiện tại trước khi ghi. Khôi phục theo KỲ LƯƠNG: chưa có (012-B)." }));
    return c;
  }
  /** Một chỗ duy nhất hiện kết quả sao lưu/khôi phục (Full Backup, JSON). */
  function fbMsgBox() { return st.fbMsg ? h("div", { class: st.fbMsg.bad ? "warn" : "ok", "data-fb-msg": "1", text: st.fbMsg.text }) : null; }
  function cardBackups() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "5 · 🗂 Danh sách bản sao lưu trên máy & kiểm tra" }));
    if (!store || !store.listBackups) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe). Bản chạy trình duyệt: dùng Sao lưu toàn bộ → JSON ở mục 1." })); return c; }
    c.appendChild(h("div", { class: "hint", text: "daily = đầu mỗi ngày (giữ theo Lịch sao lưu) · startup = mỗi lần mở app (giữ 10) · dinh-ky = định kỳ (giữ 48) · khi-dong = khi đóng app (giữ 10) · nam-YYYY = bản theo năm (giữ vĩnh viễn) · truoc-… = tự sao lưu trước thao tác lớn (nhập Excel, mở chốt, khôi phục, xóa) · sau-chot-… = ngay sau khi chốt kỳ (giữ VĨNH VIỄN)." }));
    var STATUS = { ok: "✓ Nguyên vẹn (SHA-256)", unverified: "Bản cũ — chưa có mã kiểm tra", mismatch: "✕ HỎNG / bị sửa", invalid: "✕ Không đọc được" };
    c.appendChild(h("div", { class: "bar" }, [
      store.verifyBackups ? btn("🩺 Kiểm tra tất cả bản sao lưu", "", function () { st.bkVerify = true; render(); }) : null]));
    // Sao lưu THEO NĂM: bản "nam-<năm>" giữ vĩnh viễn (tự tạo ở lần lưu đầu tiên của mỗi năm; tạo tay cho năm đang chọn)
    var all = (st.bkVerify && store.verifyBackups ? store.verifyBackups() : store.listBackups()), nowY = new Date().getFullYear();
    var years = []; all.forEach(function (b) { if (b.year && years.indexOf(b.year) < 0) years.push(b.year); }); if (years.indexOf(String(nowY)) < 0) years.push(String(nowY)); years.sort().reverse();
    var ySel = h("select", {}, years.map(function (y) { return h("option", { value: y, text: "Năm " + y }); })); ySel.value = st.bkYear || String(nowY);
    ySel.addEventListener("change", function () { st.bkYear = ySel.value; render(); });
    c.appendChild(h("div", { class: "bar" }, [ySel, btn("📅 Sao lưu năm " + ySel.value + " (giữ vĩnh viễn)", "", function () {
      if (!need("backup.restore", "tạo bản sao lưu theo năm")) return;
      var n = backupNow("nam-" + ySel.value);
      toast(n ? "Đã tạo " + n : "⚠ KHÔNG tạo được bản sao lưu theo năm — kiểm tra dung lượng đĩa / quyền ghi"); render();
    }), btn("Xem tất cả năm", "", function () { st.bkYear = ""; render(); })]));
    var list = (st.bkYear ? all.filter(function (b) { return b.year === st.bkYear; }) : all).slice(0, 40);
    if (st.bkVerify) { var nb = list.filter(function (b) { return b.status === "mismatch" || b.status === "invalid"; }).length; c.appendChild(h("div", { class: nb ? "warn" : "ok", text: nb ? "⚠ " + nb + " bản sao lưu bị hỏng — không dùng để khôi phục." : "Đã kiểm tra " + list.length + " bản sao lưu gần nhất: đọc được, đủ điều kiện khôi phục." })); }
    if (!list.length) { c.appendChild(h("div", { class: "empty", text: "Chưa có bản sao lưu." })); return c; }
    var t = h("table"), tr = h("tr"); ["Tên file", "Loại", "Thời điểm", "Dung lượng", "Tình trạng", ""].forEach(function (x) { tr.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    list.forEach(function (b) {
      var x = h("tr");
      [b.name, b.tag, fmtTime(b.created || b.mtime), Math.round(b.size / 1024) + " KB", b.status ? STATUS[b.status] || b.status : "—"].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v })); });
      x.appendChild(h("td", { style: "text-align:right" }, [btn("Khôi phục", "", function () { if (!need("backup.restore")) return; var r = store.readBackup(b.name); if (!r.ok) { alert(r.error); return; } restoreFromText(r.text, b.name); })]));
      tb.appendChild(x);
    });
    t.appendChild(tb); c.appendChild(h("div", { class: "tw", style: "max-height:320px" }, [t]));
    return c;
  }
  function cardIntegrity() {
    var c = h("div", { class: "card" }), issues = INT.check(db);
    var sch = SCH.validate(db, { tables: Object.keys(ALL), hrTables: Object.keys(HRT) });
    sch.errors.forEach(function (e) { issues.push({ level: "High", area: (ALL[e.table] ? ALL[e.table].ten : e.table) + " (cấu trúc)", msg: e.msg }); });
    sch.info.forEach(function (m) { issues.push({ level: "Low", area: "Cấu trúc", msg: m }); });
    VAL.nearDuplicateGroups(db).forEach(function (g) { issues.push({ level: "High", area: (ALL[g.table] ? ALL[g.table].ten : g.table), msg: "NGHI TRÙNG (013-B): " + g.rows + " dòng có khóa giống nhau nhưng viết khác (" + g.keys.slice(0, 4).join(" ≈ ") + (g.keys.length > 4 ? " …" : "") + ") — kiểm tra rồi sửa/gộp theo quy trình có sẵn; app KHÔNG tự gộp." }); });
    var ord = { Critical: 0, High: 1, Medium: 2, Low: 3 }; issues.sort(function (a, b) { return ord[a.level] - ord[b.level]; });
    c.appendChild(h("h3", { text: "🩺 Kiểm tra dữ liệu" }));
    c.appendChild(h("div", { class: "hint", text: "Kiểm tra cấu trúc (phiên bản, bảng, kiểu ngày/tiền/kỳ, Mã NV, quan hệ hợp đồng–phụ lục, toàn vẹn kỳ đã chốt) và nghiệp vụ (trùng mã, trùng chấm công, lương nghi lỗi…). App KHÔNG tự xóa dữ liệu lỗi — bạn tự sửa theo danh sách." }));
    var dupCC = issues.some(function (i) { return i.area === "chamcong" && /nên gộp|Gộp dòng chấm công trùng/.test(i.msg); });
    if (dupCC) c.appendChild(h("div", { class: "bar" }, [btn("🔀 Gộp dòng chấm công trùng (không trùng ngày)", "pri", function () {
      if (!need("input.edit")) return;
      if (!confirm("Gộp các dòng chấm công cùng Kỳ + Mã NV + Hình thức công thành 1 dòng?\n• Ngày nhập trùng (cùng số công) → tính 1 lần (hiện đang bị cộng 2 lần).\n• Cùng ngày nhưng KHÁC số công, hoặc thuộc kỳ đã chốt → giữ nguyên để bạn tự xử lý.\nApp sao lưu trước khi gộp.")) return;
      // P1: có "before" + hoàn tác riêng khi saveNow() thất bại — chỉ cảnh báo, không chặn.
      var bkOk = !!backupNow("truoc-gop-cham-cong");
      var merged = REPO.mergeAttendance();
      if (!merged.ok) { alert("Không lưu được — đã hủy thao tác gộp."); render(); return; }
      var r = merged.value;
      render(); alert("Đã gộp " + r.groups + " nhóm (bỏ " + r.removed + " dòng thừa" + (r.dupDays ? "; " + r.dupDays + " ngày nhập trùng nay tính 1 lần" : "") + ")." + (r.skipped.length ? "\nGiữ nguyên " + r.skipped.length + " nhóm: " + r.skipped.slice(0, 8).map(function (x) { return x.key.replace(/\|/g, " ") + " — " + x.reason; }).join("; ") : "") + (bkOk ? "" : "\n⚠ KHÔNG tạo được bản sao lưu trước khi gộp — kiểm tra dung lượng đĩa"));
    })]));
    if (!issues.length) { c.appendChild(h("div", { class: "ok", text: "Không phát hiện vấn đề về cấu trúc và toàn vẹn dữ liệu." })); return c; }
    c.appendChild(h("div", { class: "hint", text: issues.length + " vấn đề cần xem xét. Critical/High có thể làm sai tiền lương." }));
    c.appendChild(simpleTable(issues.map(function (i) { return { "Mức độ": i.level, "Khu vực": i.area, "Nội dung": i.msg }; })));
    return c;
  }
