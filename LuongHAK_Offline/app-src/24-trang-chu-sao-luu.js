  // ---------- Trang chủ ----------
  function tabHome() {
    var w = h("div", { class: "hak-dashboard" }), go = function (tab, extra) { return function () { st.tab = tab; if (extra) extra(); saveUi(); render(); }; };
    var chot = kyChot(kyStr()), ky = "tháng " + st.thang + "/" + st.nam;
    var sp = tabAllowed("luong") ? HRM.staffForPayroll(db, st.nam, st.thang) : null;
    var iss = INT.check(db).filter(function (i) { return i.level === "Critical" || i.level === "High"; });
    var het = tabAllowed("baocao") || can("hr.view") ? HRM.reports(db).hethan(30) : [];
    // Banner
    var kqNow = chot ? null : (st.kq && st.kq.ky === kyStr() && !st.kqStale ? st.kq : null);
    var tl = chot ? chot.totals && chot.totals.thucLinh : kqNow ? kqNow.bangluong.reduce(function (t, x) { return t + (+x["Thực lĩnh"] || 0); }, 0) : null;
    var hb = [];
    if (tabAllowed("luong")) hb.push(btn(chot ? "🔒 Xem bảng lương đã chốt" : "▶ Tính lương " + ky, "", go("luong")));
    else if (tabAllowed("nhansu")) hb.push(btn("👥 Mở Nhân sự", "", go("nhansu")));
    if (tabAllowed("chamcong")) hb.push(btn("🗓 Mở chấm công", "ghost", go("chamcong")));
    var dl = h("dl", {}, [
      h("div", {}, [h("dt", { text: "Người tính lương" }), h("dd", { text: sp ? String(sp.list.length) : "—" })]),
      h("div", {}, [h("dt", { text: "Cần xử lý" }), h("dd", { text: String(iss.length + het.length + (sp ? sp.warn.length : 0)) })]),
      h("div", { class: "w" }, [h("dt", { text: chot ? "Tổng thực lĩnh (đã chốt)" : "Tổng thực lĩnh (lần tính gần nhất)" }), h("dd", { text: !canSeePay() ? HRM.PAY_HIDDEN : tl == null ? "Chưa tính" : fmt(tl) })])
    ]);
    w.appendChild(h("section", { class: "hero" }, [
      h("div", { class: "htxt" }, [h("div", { class: "ey", text: "Kỳ lương " + ky + " · " + (chot ? "Đã chốt" : "Chưa chốt") }),
        h("h1", { text: "Tính lương từ hồ sơ & chấm công" }),
        h("p", { text: "Nhập chấm công, sản lượng, thưởng / trừ, tạm ứng của tháng rồi bấm Tính lương. Lương, BHXH, thuế TNCN và thực lĩnh được tính tự động theo hồ sơ và danh mục — chạy hoàn toàn offline trên máy này." }),
        h("div", { class: "hbtns" }, hb)]),
      dl]));
    // Workspace overview: display only values already calculated by the current engine.
    var metrics = h("section", { class: "hak-dashboard-metrics", "aria-label": "Tổng quan kỳ lương" });
    [["Nhân sự", String((db.nhanvien || []).filter(function (x) { return x["Trạng thái"] !== "Đã nghỉ việc"; }).length), "Nhân viên đang làm việc"], ["Đầu vào còn nháp", String(C.inputReview.pending(db, kyStr()).length), "Bảng hoặc chế độ phân bổ cần lưu"], ["Cần xử lý", String(iss.length + het.length + (sp ? sp.warn.length : 0)), "Cảnh báo dữ liệu và hồ sơ"], ["Thực lĩnh", !canSeePay() ? HRM.PAY_HIDDEN : tl == null ? "Chưa tính" : fmt(tl), chot ? "Bảng lương đã chốt" : "Lần tính gần nhất"]].forEach(function (v) {
      metrics.appendChild(h("div", { class: "hak-dashboard-metric" }, [h("small", { text: v[0] }), h("strong", { text: v[1] }), h("span", { text: v[2] })]));
    });
    w.appendChild(metrics);
    // Các bước
    var steps = [
      ["backup", "Nạp danh mục chuẩn HAK", "Phòng ban, chức vụ, mã lương, phụ cấp, BH, thuế", countOf("dm_baohiem") > 0],
      ["dm", "Kiểm tra Danh mục", "Đơn giá, phụ cấp, ngưỡng BH theo đơn vị", countOf("dm_luong") > 0],
      ["nhansu", "Hồ sơ & hợp đồng", countOf("nhanvien") + " nhân viên — lương lấy từ phụ lục đang hiệu lực", countOf("nhanvien") > 0 && countOf("chitiethd") > 0],
      ["chamcong", "Chấm công tháng " + st.thang, "Dán từ Excel hoặc nhập tay", db.chamcong.some(function (r) { return r["Kỳ"] === kyStr(); })],
      ["sanluong", "Sản lượng · Thưởng · Tạm ứng", "Nếu có phát sinh trong tháng", db.sanluong.length + db.bandam.length + db.psluong.length + db.ungluong.length > 0],
      ["luong", "Tính → kiểm tra → Chốt kỳ", "Chốt để lưu bảng lương, xem lại về sau", !!chot]
    ].filter(function (s) { return tabAllowed(s[0]); });
    var ol = h("ol", { class: "flow", "aria-label": "Các bước kỳ lương" });
    steps.forEach(function (s, i) { ol.appendChild(h("li", { class: s[3] ? "done" : "", tabindex: "0", role: "button", on: { click: go(s[0]), keydown: function (e) { if (e.key === "Enter") go(s[0])(); } } }, [h("span", { class: "n", text: s[3] ? "✓" : String(i + 1) }), h("div", {}, [h("b", { text: s[1] }), h("small", { text: s[2] })])])); });
    w.appendChild(ol);
    // Mở nhanh
    var Q = [["chamcong", "g1", "🗓", "Chấm công", "Bảng công theo ngày, dán từ Excel."], ["luong", "g2", "📄", "Bảng lương", "Tính, kiểm tra cảnh báo, xuất Excel, chốt kỳ."],
      ["kyluong", "g4", "🔒", "Kỳ lương đã chốt", "Xem lại, so sánh phiên bản, xuất Excel."], ["baocaoluong", "g6", "📈", "Báo cáo lương", "Theo phòng ban, BHXH, thuế, hạch toán."],
      ["nhansu", "g5", "👥", "Hồ sơ nhân sự", "Hợp đồng, phụ lục lương, nhân thân, nghỉ phép."], ["baocao", "g7", "📋", "Báo cáo nhân sự", "Biến động, sổ quản lý lao động, hết hạn HĐ."],
      ["dm", "g8", "📚", "Danh mục", "Mã lương, phụ cấp, BH, thuế, phòng ban."], ["backup", "g3", "🛡", "Sao lưu & hệ thống", "Sao lưu, khôi phục, người dùng, kiểm tra dữ liệu."]]
      .filter(function (q) { return tabAllowed(q[0]); });
    if (Q.length) {
      w.appendChild(h("div", { class: "sec-title", text: "Mở nhanh" }));
      var qg = h("div", { class: "qcards" });
      Q.forEach(function (q) { qg.appendChild(h("button", { type: "button", class: "qcard", on: { click: go(q[0]) } }, [h("span", { class: "qi " + q[1], text: q[2] }), h("b", { text: q[3] }), h("small", { text: q[4] })])); });
      w.appendChild(qg);
    }
    // Cần xử lý + An toàn dữ liệu
    var todo = h("ul", { class: "todo" }), nTodo = 0;
    var addTodo = function (hi, title, sub, label, fn) { nTodo++; todo.appendChild(h("li", {}, [h("span", { class: "dot" + (hi ? " hi" : "") }), h("div", { class: "tx" }, [h("b", { text: title }), h("small", { text: sub })]), btn(label, "ghost", fn)])); };
    if (iss.length) addTodo(true, iss.length + " vấn đề dữ liệu mức Critical / High", iss.slice(0, 2).map(function (i) { return i.msg; }).join(" · "), "Kiểm tra dữ liệu", go("backup"));
    if (het.length) addTodo(true, het.length + " hợp đồng sắp hết hạn / đã quá hạn trong 30 ngày", het.slice(0, 3).map(function (r) { return r["Mã NV"]; }).join(", "), "Xem báo cáo", go("baocao", function () { st.bc = "hethan"; }));
    if (sp && sp.warn.length) addTodo(false, sp.warn.length + " cảnh báo hồ sơ khi tính lương " + ky, sp.warn[0], "Mở Tính lương", go("luong"));
    var left = h("section", { class: "card" }, [h("h3", {}, ["Cần xử lý trước khi chốt", nTodo ? h("span", { class: "cnt", text: String(nTodo) }) : null])]);
    left.appendChild(nTodo ? todo : h("div", { class: "hint", text: "Không có việc nào đang chờ — dữ liệu kỳ này sẵn sàng." }));
    var safe = h("section", { class: "card" }, [h("h3", { text: "An toàn dữ liệu" })]);
    safe.appendChild(h("div", { class: "hint", text: store ? "App tự lưu và tự giữ bản sao lưu mỗi ngày trên máy này (có file kiểm tra SHA-256)." : "Dữ liệu nằm trong trình duyệt của máy này — hãy sao lưu ra file cuối mỗi kỳ." }));
    var bst = store && store.backupStatus && (can("backup.restore") || can("system.admin")) ? store.backupStatus() : null;
    if (bst && (bst.daysSinceExternal == null || bst.daysSinceExternal > 7 || bst.lastMirrorError)) safe.appendChild(h("div", { class: "locked", html: "⚠ <b>" +
      (bst.lastMirrorError ? "Không chép được sang thư mục sao lưu thứ hai" : bst.daysSinceExternal == null ? "Chưa có bản sao lưu nào ra ngoài máy" : "Đã " + bst.daysSinceExternal + " ngày chưa sao lưu ra ngoài máy") +
      "</b> — hỏng ổ cứng / mất máy / mã độc sẽ mất cả dữ liệu lẫn bản sao lưu trên máy. Vào <b>Sao lưu &amp; hệ thống</b>: chọn <b>thư mục sao lưu thứ hai</b> (USB, ổ mạng, Google Drive) hoặc bấm <b>Sao lưu ra file</b>." +
      (bst.lastMirrorError ? "<br><span>" + esc(bst.lastMirrorError) + "</span>" : "") }));
    else if (bst) safe.appendChild(h("div", { class: "ok", text: "✓ Đã sao lưu ra ngoài máy " + bst.daysSinceExternal + " ngày trước" + (bst.mirrorDir ? " · thư mục thứ hai: " + bst.mirrorDir : "") }));
    if (tabAllowed("backup")) safe.appendChild(h("div", { class: "bar", style: "margin:10px 0 0" }, [btn("🛡 Mở Sao lưu", "", go("backup"))]));
    if (can("import")) safe.appendChild(h("div", { class: "bar", style: "margin:8px 0 0" }, [btn("📄 Tải file mẫu Excel", "", downloadAllTemplates), btn("⬆ Nhập từ file Excel tổng", "", importAllFile)]));
    w.appendChild(h("div", { class: "cols2" }, [left, safe]));
    return w;
  }

  // ---------- Sao lưu ----------
  function tabSaoLuu() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "Sao lưu & khôi phục" }));
    if (store) {
      var inf = store.info();
      c.appendChild(h("div", { class: "ok", html: "Dữ liệu tự lưu tại: <code>" + esc(inf.dataFile) + "</code><br>Bản sao lưu tự động mỗi ngày (giữ 60 ngày): <code>" + esc(inf.backupDir) + "</code>" }));
      c.appendChild(h("div", { class: "bar", style: "margin-top:8px" }, [btn("📂 Mở thư mục dữ liệu", "", function () { store.openFolder(); })]));
    }
    c.appendChild(h("div", { class: "warn", text: "Trước khi cài lại Windows / đổi máy: bấm 'Sao lưu ra file' và cất file sang USB/Drive. Sang máy mới cài app rồi 'Khôi phục từ file'." }));
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("⬇ Sao lưu ra file", "pri", function () { if (!need("backup.restore", "sao lưu toàn bộ dữ liệu ra file")) return; download("LuongHAK_backup_" + HRM.today() + ".json", "application/json", JSON.stringify(db)); audit("Sao lưu ra file", ""); if (store && store.noteExternal) store.noteExternal(); }));
    bar.appendChild(btn("⬆ Khôi phục từ file", "", function () {
      if (!need("backup.restore")) return;
      var f = h("input", { type: "file", accept: ".json" });
      f.addEventListener("change", function () { var fr = new FileReader(); fr.onload = function () { restoreFromText(fr.result, f.files[0].name); }; fr.readAsText(f.files[0]); });
      f.click();
    }));
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
    var w = h("div"); w.appendChild(cardCongTy()); if (can("system.admin")) w.appendChild(cardUsers()); w.appendChild(c); w.appendChild(cardYearArchive()); w.appendChild(cardSchedule()); w.appendChild(cardStorage()); w.appendChild(cardFull()); w.appendChild(cardOffsite()); w.appendChild(cardBackups()); w.appendChild(cardIntegrity()); w.appendChild(cardAudit());
    return w;
  }
  function cardYearArchive(){
    var card=h("section",{class:"card","data-year-archive":"1"},[h("h3",{text:"Kho hồ sơ theo năm"}),h("div",{class:"hint",text:"Chuyển năm cũ đã chốt ra khỏi dữ liệu đang làm để giảm dung lượng phải tải. Hồ sơ chỉ mở khi chọn năm, ở chế độ chỉ xem. Chứng từ gốc giữ nguyên trong kho; dùng Full Backup khi đổi máy."})]);
    if(!window.hakYears||!can("backup.restore"))return card;
    var body=h("div");card.appendChild(body);
    function clean(){if(dirty){saveNow();if(dirty){alert("Chưa lưu được dữ liệu đang làm; hãy xử lý lỗi lưu trước.");return false;}}return true;}
    function waiting(text){body.setAttribute("aria-busy","true");toast(text);}
    function show(result){body.removeAttribute("aria-busy");if(!result||!result.ok){alert(result&&result.error||"Không đọc được kho năm");return false;}return true;}
    window.hakYears.list().then(function(info){
      if(!show(info))return;
      body.appendChild(h("div",{class:"hint",text:"Dữ liệu đang làm: "+Math.round(info.activeBytes/1024)+" KB · "+info.years.length+" năm trong kho"}));
      var year=h("select",{"aria-label":"Năm cần lưu trữ"});info.candidates.forEach(function(y){year.appendChild(h("option",{value:String(y),text:String(y)}));});
      var controls=h("div",{class:"bar"},[year]);
      if(can("system.admin"))controls.appendChild(btn("Kiểm tra trước khi chuyển","",function(){
        if(!clean())return;
        waiting("Đang kiểm tra hồ sơ năm ở nền…");
        window.hakYears.preview(Number(year.value)).then(function(p){if(!show(p))return;
          var details=Object.keys(p.counts).map(function(t){return t+": "+p.counts[t];}).join("\n");
          if(!confirm("Chuyển hồ sơ năm "+p.year+" vào kho chỉ xem?\nKỳ: "+p.periods.join(", ")+"\n"+details+"\nDữ liệu đang làm dự kiến: "+Math.round(p.beforeBytes/1024)+" → "+Math.round(p.afterBytes/1024)+" KB.\nApp sẽ sao lưu và kiểm tra hồ sơ trước khi chuyển. Tiếp tục?"))return;
          waiting("Đang sao lưu, kiểm tra và chuyển hồ sơ năm… Vui lòng giữ ứng dụng mở.");
          window.hakYears.archive(p.year,p.token).then(function(r){if(show(r)){alert("Đã lưu trữ năm "+p.year+". Dữ liệu đang làm còn "+Math.round(r.afterBytes/1024)+" KB. App sẽ tải lại.");window.location.reload();}});
        });
      }));
      if(info.candidates.length)body.appendChild(controls);
      info.years.forEach(function(ref){
        var row=h("div",{class:"bar"},[h("b",{text:"Hồ sơ "+ref.year})]);
        row.appendChild(btn("Mở hồ sơ năm","",function(){openYear(ref.year);}));
        if(can("system.admin"))row.appendChild(btn("Đưa về vùng đang làm","ghost",function(){
          if(!clean())return;
          askText("Đưa hồ sơ về vùng đang làm","Lý do đưa hồ sơ năm "+ref.year+" về vùng đang làm? Các kỳ vẫn giữ trạng thái đã chốt.",{required:true},function(reason){
            if(!reason||!reason.trim())return;
            window.hakYears.list().then(function(fresh){if(!show(fresh))return;if(!confirm("Đưa toàn bộ hồ sơ năm "+ref.year+" về dữ liệu đang làm? Hệ thống sẽ sao lưu trước và không ghi đè khi có dữ liệu trùng."))return;window.hakYears.restore(ref.year,reason,fresh.token).then(function(r){if(show(r))window.location.reload();});});
          });
        }));body.appendChild(row);
      });
    }).catch(function(e){body.appendChild(h("div",{class:"warn",text:e.message}));});
    function openYear(y){
      var panel=h("div",{"data-year-view":"1"}),title=h("h4",{text:"Hồ sơ "+y+" · Chỉ xem"});panel.appendChild(title);
      var kind=h("select",{"aria-label":"Loại hồ sơ năm"}),period=h("select",{"aria-label":"Kỳ hồ sơ năm"}),page=0,rowsBox=h("div"),status=h("span",{class:"hint"});
      [["kyluong","Kỳ lương đã chốt"],["bangluong","Bảng lương đã chốt"],["chamcong","Chấm công"],["sanluong","Sản lượng"],["bandam","Bàn dầm"],["psluong","Phát sinh lương"],["ungluong","Tạm ứng"],["tiencom","Suất cơm"],["kyluong_lichsu","Lịch sử chốt"]].forEach(function(x){kind.appendChild(h("option",{value:x[0],text:x[1]}));});
      function fill(r){rowsBox.replaceChildren();var cols=[];r.rows.forEach(function(row){Object.keys(row).forEach(function(k){if(k!=="_id"&&typeof row[k]!=="object"&&cols.indexOf(k)<0)cols.push(k);});});var t=h("table"),head=h("tr");cols.forEach(function(k){head.appendChild(h("th",{text:k}));});t.appendChild(h("thead",{},[head]));var tb=h("tbody");r.rows.forEach(function(row){var tr=h("tr");cols.forEach(function(k){tr.appendChild(h("td",{text:row[k]==null?"":String(row[k])}));});tb.appendChild(tr);});t.appendChild(tb);rowsBox.appendChild(h("div",{class:"tw"},[t]));status.textContent="Trang "+(page+1)+" · "+r.total+" dòng · 50 dòng/trang";}
      function load(){waiting("Đang mở trang hồ sơ năm…");if(kind.value==="bangluong"&&!period.value&&period.options.length>1)period.selectedIndex=1;window.hakYears.table(y,kind.value,period.value,page).then(function(r){if(show(r))fill(r);});}
      kind.addEventListener("change",function(){page=0;load();});period.addEventListener("change",function(){page=0;load();});
      var tools=h("div",{class:"bar"},[kind,period,btn("Trước","ghost",function(){if(page){page--;load();}}),btn("Sau","ghost",function(){page++;load();}),status]);
      if(can("export"))tools.appendChild(btn("Xuất Excel hồ sơ","",function(){window.hakYears.export(y,kind.value,period.value,"xlsx",page).then(function(r){if(show(r))toast("Đã lưu Excel hồ sơ: "+r.name);});}));
      if(can("export"))tools.appendChild(btn("In trang đang xem","ghost",function(){window.hakYears.export(y,kind.value,period.value,"pdf",page).then(function(r){if(show(r))toast("Đã lưu bản in: "+r.name);});}));
      tools.appendChild(btn("Đóng hồ sơ năm","ghost",function(){panel.remove();window.hakYears.release();}));
      panel.appendChild(tools);panel.appendChild(rowsBox);body.appendChild(panel);
      window.hakYears.table(y,"kyluong","",0).then(function(r){if(!show(r))return;period.appendChild(h("option",{value:"",text:"Cả năm"}));r.periods.forEach(function(ky){period.appendChild(h("option",{value:ky,text:ky}));});fill(r);});
    }
    return card;
  }
