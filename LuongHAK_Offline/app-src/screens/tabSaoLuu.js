  function tabSaoLuu() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "Dữ liệu hiện có & nhập từ Excel" }));
    if (store) {
      var inf = store.info(), sch0 = (store.scheduleGet && store.scheduleGet()) || {}, keepDays = sch0.keepDaily || 60;
      c.appendChild(h("div", { class: "ok", html: "Dữ liệu tự lưu tại: <code>" + esc(inf.dataFile) + "</code><br>Bản sao lưu tự động mỗi ngày (giữ " + keepDays + " ngày theo Lịch ở mục 3): <code>" + esc(inf.backupDir) + "</code>" }));
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
    // 012-A: một màn, 5 khu — mỗi chức năng chỉ xuất hiện MỘT lần: 1 Sao lưu ngay · 2 Khôi phục · 3 Tự sao lưu · 4 Thư mục · 5 Danh sách & kiểm tra; sau đó "Lưu trữ năm" và các mục khác
    var w = h("div"); w.appendChild(cardBackupNow()); w.appendChild(cardRestore()); var fbm = fbMsgBox(); if (fbm) w.appendChild(fbm);
    w.appendChild(cardSchedule()); w.appendChild(cardStorage()); w.appendChild(cardOffsite()); w.appendChild(cardBackups()); w.appendChild(cardYearArchive());
    w.appendChild(c); w.appendChild(cardCongTy()); if (can("system.admin")) w.appendChild(cardUsers()); w.appendChild(cardIntegrity()); w.appendChild(cardAudit());
    return w;
  }
