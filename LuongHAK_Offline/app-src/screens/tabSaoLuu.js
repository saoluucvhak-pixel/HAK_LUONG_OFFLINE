  function tabSaoLuu() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "Dữ liệu hiện có & nhập từ Excel" }));
    if (store) {
      var inf = store.info(), sch0 = (store.scheduleGet && store.scheduleGet()) || {}, keepDaily = sch0.keepDaily || 60;
      var saveDesc = inf.dbFile
        ? "Nơi lưu chính (<code>data.sqlite</code>): <code>" + esc(inf.dbFile) + "</code><br>Bản xuất JSON (<code>data.json</code> chỉ là bản xuất): <code>" + esc(inf.dataFile) + "</code>"
        : "Nơi lưu chính là <code>data.sqlite</code>; bản xuất JSON (<code>data.json</code> chỉ là bản xuất): <code>" + esc(inf.dataFile) + "</code>";
      c.appendChild(h("div", { class: "ok", html: saveDesc + "<br>Bản sao lưu tự động đầu ngày (giữ " + keepDaily + " bản đầu ngày theo Lịch ở tab “Lịch & thư mục sao lưu”): <code>" + esc(inf.backupDir) + "</code>" }));
      c.appendChild(h("div", { class: "bar", style: "margin-top:8px" }, [btn("📂 Mở thư mục dữ liệu", "", function () { store.openFolder(); })]));
    }
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("📋 Nạp danh mục chuẩn HAK", "", napMau));
    c.appendChild(bar);
    c.appendChild(h("h3", { text: "Nhập dữ liệu từ Excel", style: "margin-top:18px" }));
    c.appendChild(h("div", { class: "hint", text: "Cách nhanh nhất: tải 1 file mẫu có đủ các sheet (Nhân sự, Chấm công, Mã lương...), điền dữ liệu rồi nhập lại 1 lần. Hoặc vào từng mục và dùng nút 'Tải file mẫu' riêng." }));
    bar = h("div", { class: "bar" });
    bar.appendChild(btn("📄 Tải toàn bộ file mẫu", "pri", downloadAllTemplates));
    bar.appendChild(btn("⬆ Nhập từ file Excel tổng", "", importAllFile));
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("🏢 Gán Mã công ty cho dữ liệu cũ", "", function () {
      if (!need("system.admin")) return;
      var p = CMP.plan(db);
      if (p.status !== "READY") { alert((p.status === "BLOCKED" ? "⛔ Chưa thể gán: " : "") + p.reason + (p.foreign.length ? "\n\nDòng mang mã lạ: " + p.foreign.slice(0, 5).map(function (x) { return x.bang + "#" + (x.index + 1) + "=" + x.giaTri; }).join(", ") : "")); return; }
      var ds = Object.keys(p.counts).map(function (k) { return k + ": " + p.counts[k]; }).join("\n");
      if (!confirm("Gán Mã công ty \"" + p.companyId + "\" cho " + p.total + " dòng chưa có mã:\n" + ds + "\n\nChỉ điền ô còn trống, không ghi đè. Bảng lương đã chốt không đổi. Hệ thống sẽ sao lưu trước. Tiếp tục?")) return;
      if (!backupOrBlock("truoc-gan-ma-cong-ty", "gán Mã công ty")) return;
      var r = CMP.apply(db); audit("Gán Mã công ty", p.companyId + " · " + JSON.stringify(r.changed)); save(); render(); toast("Đã gán Mã công ty cho " + p.total + " dòng");
    }, "Migration có kiểm tra: chỉ chạy khi xác định được duy nhất một công ty"));
    bar.appendChild(btn("🗑 Xóa toàn bộ dữ liệu", "red", function () { if (!need("system.admin")) return; if ((db._yearArchives || []).length) { alert("Đang có kho hồ sơ năm. Không thể xóa toàn bộ dữ liệu vì sẽ mất liên kết hồ sơ. Hãy tạo Full Backup để lưu đầy đủ trước khi chuyển máy."); return; } if (confirm("XÓA TOÀN BỘ dữ liệu? Không thể hoàn tác!\n(Tài khoản người dùng được giữ lại.)") && confirm("Chắc chắn chứ?")) { if (!backupOrBlock("truoc-xoa-toan-bo", "xóa toàn bộ dữ liệu")) return; var beforeDelete = db, wasDirty = dirty; db = { nguoidung: db.nguoidung, baomat: db.baomat, auditlog: JSON.parse(JSON.stringify(db.auditlog || [])) }; ensureTables(); audit("Xóa toàn bộ dữ liệu", "đã sao lưu trước khi xóa"); if (!saveNow()) { db = beforeDelete; dirty = wasDirty; alert("Chưa xóa dữ liệu: " + lastSaveError); return; } st.kq = null; render(); } }));
    c.appendChild(bar);
    c.appendChild(h("div", { class: "hint", text: "Hiện có — " + Object.keys(ALL).map(function (k) { return ALL[k].ten + ": " + countOf(k); }).join(" · ") }));
    // Màn chia tab cho dễ xem (v2.1.3): mỗi nhóm việc một tab; chỉ dựng nội dung tab đang mở. Chức năng và thẻ giữ nguyên, chỉ đổi cách sắp xếp.
    var fbm = fbMsgBox();
    var TABS = [
      ["sl", "Sao lưu & khôi phục", function (p) { p.appendChild(cardBackupNow()); p.appendChild(cardRestore()); p.appendChild(cardBackups()); }],
      ["tm", "Lịch & thư mục sao lưu", function (p) { p.appendChild(cardSchedule()); p.appendChild(cardStorage()); p.appendChild(cardOffsite()); }],
      ["dl", "Dữ liệu & Excel", function (p) { p.appendChild(c); p.appendChild(cardYearArchive()); }],
      ["ct", "Hồ sơ công ty", function (p) { p.appendChild(cardCongTy()); }]
    ];
    if (can("system.admin")) TABS.push(["nd", "Người dùng & phân quyền", function (p) { p.appendChild(cardUsers()); }]);
    TABS.push(["kt", "Kiểm tra & nhật ký", function (p) { p.appendChild(cardRaSoatNghi()); p.appendChild(cardIntegrity()); p.appendChild(cardAudit()); }]);
    var cur = TABS.filter(function (t) { return t[0] === st.slTab; })[0] || TABS[0];
    var w = h("div"), tabs = h("div", { class: "subtabs noprint", role: "tablist" }), panel = h("div", { "data-sl-panel": cur[0] });
    TABS.forEach(function (t) {
      tabs.appendChild(h("button", { class: t[0] === cur[0] ? "on" : "", role: "tab", "aria-selected": t[0] === cur[0] ? "true" : "false", "data-sl-tab": t[0], text: t[1], on: { click: function () { st.slTab = t[0]; render(); } } }));
    });
    w.appendChild(tabs); if (fbm) w.appendChild(fbm); cur[2](panel); w.appendChild(panel);
    return w;
  }
