  // ---------- Tài liệu đính kèm HĐLĐ (V9.2) ----------
  /** Thêm nhiều file PDF/ảnh vào kho chứng từ gốc rồi ghi liên kết. replaceRow = thay thế một tài liệu (phiên bản mới). */
  function hdldAdd(files, ma, hd, loai, replaceRow, done) {
    var list = Array.prototype.slice.call(files), res = { ok: 0, dup: 0, err: [] }, soHD = hd["Số HĐLĐ"];
    var next = function (i) {
      if (i >= list.length) { done(res); return; }
      var f = list[i], e = HDD.checkFile(f.name, f.size);
      if (e) { res.err.push(e); next(i + 1); return; }
      f.arrayBuffer().then(function (buf) {
        return window.hakDocs.add(new Uint8Array(buf), { name: f.name, docType: "HDLD", company: congTy()["Mã công ty"] || "HAK", dept: "NHANSU", note: "HĐLĐ " + soHD + " · " + ma, user: currentUser() });
      }).then(function (r) {
        if (!r || !r.ok) { res.err.push(f.name + ": " + ((r && r.error) || "lỗi không rõ")); next(i + 1); return; }
        var dupRow = HDD.duplicate(db.hdld_tailieu, ma, soHD, r.sha256);
        if (dupRow) { res.dup++; next(i + 1); return; } // cùng nội dung đã gắn với hợp đồng này
        var rec = HDD.newLink({ maNV: ma, soHD: soHD, doc: { id: r.id, name: f.name, size: r.size, sha256: r.sha256 }, ten: f.name, loai: loai, user: currentUser() });
        try { if (replaceRow) HDD.replace(replaceRow, rec, currentUser()); } catch (ex) { res.err.push(f.name + ": " + ex.message); next(i + 1); return; }
        db.hdld_tailieu.push(rec);
        audit(replaceRow ? "Thay thế tài liệu HĐLĐ" : "Đính kèm tài liệu HĐLĐ", ma + " · " + soHD + " · " + f.name + " · " + r.id + " · SHA-256 " + r.sha256.slice(0, 12) + "…" + (replaceRow ? " · thay " + replaceRow["DocumentID"] : ""));
        res.ok++; next(i + 1);
      }, function (ex) { res.err.push(f.name + ": " + (ex && ex.message || ex)); next(i + 1); });
    };
    next(0);
  }
  /** Xem trước theo yêu cầu (không nạp file khi chỉ hiển thị danh sách). PDF: dựng từng trang bằng pdf.js; ảnh: giải mã trực tiếp. */
  function hdldPreview(row) {
    if (!can("hr.view")) { alert("Bạn không có quyền xem tài liệu nhân sự."); return; }
    var body = h("div"), meta = h("div", { class: "hint", text: "Đang mở " + row["Tên tài liệu"] + "…" }), cv = h("canvas", { style: "max-width:100%;border:1px solid var(--bd,#ccc)" }), nav = h("div", { class: "bar" });
    body.appendChild(meta); body.appendChild(nav); body.appendChild(cv);
    modal("Xem trước — " + row["Tên tài liệu"], body, function (close) { return [btn("Đóng", "pri", close)]; });
    Promise.all([window.hakDocs.read(row["DocumentID"]), window.hakDocs.verify([row["DocumentID"]])]).then(function (rs) {
      var r = rs[0], v = rs[1] && rs[1].items && rs[1].items[0];
      if (!r || !r.ok) { meta.textContent = "⚠ Không mở được: " + ((r && r.error) || "mất file"); return; }
      var bytes = new Uint8Array(r.data), isPdf = /pdf/i.test((r.meta || {}).ext || "") || (bytes[0] === 0x25 && bytes[1] === 0x50);
      meta.textContent = row["Tên file gốc"] + " · " + HDD.sizeText(row["Dung lượng (byte)"]) + " · SHA-256 " + String(row["SHA256"]).slice(0, 16) + "… · toàn vẹn: " + (v ? (v.status === "ok" ? "✓ khớp" : "⚠ " + v.status) : "?");
      if (!isPdf) { window.createImageBitmap(new Blob([bytes])).then(function (bm) { cv.width = bm.width; cv.height = bm.height; cv.getContext("2d").drawImage(bm, 0, 0); }, function () { meta.textContent = "⚠ Không giải mã được ảnh"; }); return; }
      loadScript("vendor/pdfjs/pdf.min.js").then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
        return lib.getDocument({ data: bytes }).promise;
      }).then(function (pdf) {
        var cur = 1, info = h("span", { class: "hint", style: "margin:0" });
        var show = function (n) { cur = n; info.textContent = "Trang " + n + "/" + pdf.numPages; pdf.getPage(n).then(function (pg) { var vp = pg.getViewport({ scale: 1.5 }); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height); return pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; }); };
        nav.appendChild(btn("◀", "", function () { if (cur > 1) show(cur - 1); })); nav.appendChild(info); nav.appendChild(btn("▶", "", function () { if (cur < pdf.numPages) show(cur + 1); }));
        show(1);
      }).catch(function (e) { meta.textContent = "⚠ Không dựng được PDF: " + (e && e.message || e); });
    });
  }
  function hdldHistory(row) {
    var rows = HDD.history(db.hdld_tailieu, row).map(function (r) { return { "Phiên bản": r["Phiên bản"], "Tên file": r["Tên file gốc"], "DocumentID": r["DocumentID"], "SHA-256": String(r["SHA256"]).slice(0, 16) + "…", "Thêm lúc": fmtTime(r["Thêm lúc"]), "Người thêm": r["Người thêm"], "Trạng thái": r["Trạng thái"], "Ghi chú": r["Lý do gỡ"] || (r["Thay thế bởi"] ? "Thay bởi " + r["Thay thế bởi"] : "") }; });
    modal("Lịch sử tài liệu — " + row["Tên tài liệu"], simpleTable(rows), function (close) { return [btn("Đóng", "", close)]; });
  }
  function hdldPanel(ma, hd) {
    var cfg = HR.hdld_tailieu, soHD = hd["Số HĐLĐ"], card = h("div", { class: "card" }), canV = can("hr.view"), canE = can("hr.edit");
    var bar = h("div", { class: "bar" }, [h("h3", { text: cfg.icon + " " + cfg.ten, style: "margin:0" }), h("span", { class: "sp" })]);
    card.appendChild(bar); card.appendChild(h("div", { class: "hint", text: cfg.desc + " Tối đa " + (HDD.MAX_BYTES / 1048576) + " MB/file; hệ thống kiểm tra NỘI DUNG thật của file và từ chối PDF chứa mã chủ động." }));
    if (!window.hakDocs) { card.appendChild(h("div", { class: "warn", text: "Đính kèm tài liệu chỉ có trong bản cài (.exe): file được lưu vào kho chứng từ gốc trên máy." })); return card; }
    if (!canV) { card.appendChild(h("div", { class: "locked", text: "👁 Vai trò của bạn không có quyền xem hồ sơ nhân sự nên không xem được tài liệu đính kèm." })); return card; }
    var loaiSel = h("select", { "aria-label": "Loại tài liệu" }); HDD.LOAI.forEach(function (x) { loaiSel.appendChild(h("option", { value: x, text: x })); });
    var fi = h("input", { type: "file", multiple: "multiple", accept: ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg", style: "display:none" });
    var finish = function (res) {
      if (res.ok) save(); render();
      toast("Đã đính kèm " + res.ok + " tài liệu" + (res.dup ? " · bỏ qua " + res.dup + " file trùng nội dung" : "") + (res.err.length ? " · " + res.err.length + " file lỗi" : ""));
      if (res.err.length) alert("Không đính kèm được:\n• " + res.err.join("\n• "));
    };
    fi.addEventListener("change", function () { if (!fi.files.length) return; if (!need("hr.edit")) return; hdldAdd(fi.files, ma, hd, loaiSel.value, null, finish); fi.value = ""; });
    if (canE) { bar.appendChild(loaiSel); bar.appendChild(btn("＋ Thêm tài liệu (chọn nhiều PDF/ảnh)", "pri", function () { fi.click(); })); bar.appendChild(fi); }
    var verBtn = btn("🛡 Kiểm tra toàn vẹn", "", function () {
      var ids = HDD.active(db.hdld_tailieu, ma, soHD).map(function (r) { return r["DocumentID"]; });
      window.hakDocs.verify(ids).then(function (r) { var bad = ((r && r.items) || []).filter(function (x) { return x.status !== "ok"; }); alert(bad.length ? "⚠ " + bad.length + " tài liệu có vấn đề:\n" + bad.map(function (x) { return "• " + x.name + " — " + x.status; }).join("\n") : "✓ " + ids.length + " tài liệu: file còn đủ, SHA-256 khớp."); });
    });
    bar.appendChild(verBtn);
    var showAll = h("input", { type: "checkbox" }); showAll.checked = !!st.hdldAll; showAll.addEventListener("change", function () { st.hdldAll = showAll.checked; render(); });
    bar.appendChild(h("label", { class: "chip" }, [showAll, document.createTextNode(" Hiện cả bản cũ / đã gỡ")]));
    var rows = HDD.ofContract(db.hdld_tailieu, ma, soHD).filter(function (r) { return st.hdldAll || r["Trạng thái"] === HDD.TT.OK; }).sort(function (a, b) { return String(b["Thêm lúc"]) < String(a["Thêm lúc"]) ? -1 : 1; });
    if (!rows.length) { card.appendChild(h("div", { class: "empty", style: "padding:16px", text: "Chưa có tài liệu đính kèm." })); return card; }
    var t = h("table"), tr = h("tr");
    ["Tên tài liệu", "Loại", "Phiên bản", "Dung lượng", "Thêm lúc", "Người thêm", "Trạng thái", ""].forEach(function (c) { tr.appendChild(h("th", { text: c })); });
    t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    rows.forEach(function (r) {
      var x = h("tr", { class: r["Trạng thái"] === HDD.TT.OK ? "" : "muted" });
      [r["Tên tài liệu"], r["Loại tài liệu"], "v" + (r["Phiên bản"] || 1), HDD.sizeText(r["Dung lượng (byte)"]), fmtTime(r["Thêm lúc"]), r["Người thêm"], r["Trạng thái"]].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v == null ? "" : String(v) })); });
      var a = h("td", { style: "text-align:right;white-space:nowrap" });
      a.appendChild(btn("👁", "ghost", function () { hdldPreview(r); }, "Xem trước (chỉ nạp file khi bấm)"));
      a.appendChild(btn("↗", "ghost", function () { if (can("hr.view")) window.hakDocs.open(r["DocumentID"]); }, "Mở bằng chương trình mặc định"));
      a.appendChild(btn("🕘", "ghost", function () { hdldHistory(r); }, "Lịch sử các phiên bản"));
      if (canE && r["Trạng thái"] === HDD.TT.OK) {
        var rf = h("input", { type: "file", accept: ".pdf,.png,.jpg,.jpeg", style: "display:none" });
        rf.addEventListener("change", function () { if (!rf.files.length || !need("hr.edit")) return; hdldAdd([rf.files[0]], ma, hd, r["Loại tài liệu"], r, function (res) { if (res.ok) save(); render(); toast(res.ok ? "Đã thay thế bằng phiên bản mới" : res.dup ? "File giống hệt tài liệu đang có — không thay" : "Không thay được"); if (res.err.length) alert(res.err.join("\n")); }); });
        a.appendChild(rf);
        a.appendChild(btn("🔁", "ghost", function () { rf.click(); }, "Thay thế bằng file mới (giữ bản cũ trong lịch sử)"));
        a.appendChild(btn("✕", "red ghost", function () {
          if (!need("hr.edit")) return;
          askText("Gỡ liên kết tài liệu", "Tài liệu \"" + r["Tên tài liệu"] + "\" sẽ không còn hiện trong hợp đồng. File gốc VẪN nằm trong kho chứng từ và xem lại được ở Lịch sử.", { label: "Lý do gỡ", required: true, okText: "Gỡ liên kết" }, function (why) {
            try { HDD.unlink(r, currentUser(), why); } catch (ex) { alert(ex.message); return; }
            audit("Gỡ liên kết tài liệu HĐLĐ", ma + " · " + soHD + " · " + r["Tên file gốc"] + " · " + r["DocumentID"] + " — " + why); save(); render();
          });
        }, "Gỡ liên kết (không xóa file)"));
      }
      x.appendChild(a); tb.appendChild(x);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw" }, [t]));
    return card;
  }

  function subTable(key, base, opts) {
    opts = opts || {};
    var cfg = HR[key], rows = (db[key] || []).filter(function (r) { return Object.keys(base).every(function (k) { return r[k] === base[k]; }); });
    var dateF = cfg.cols.filter(function (c) { return /Hiệu lực từ|Ngày vào làm|Từ ngày|^Ngày/.test(c); })[0];
    if (dateF) rows.sort(function (a, b) { return String(a[dateF] || "") < String(b[dateF] || "") ? 1 : -1; });
    var card = h("div", { class: "card" });
    var bar = h("div", { class: "bar" }, [h("h3", { text: cfg.icon + " " + cfg.ten, style: "margin:0" }), h("span", { class: "sp" }), btn("＋ Thêm", "pri", function () { hrForm(key, null, base); })]);
    card.appendChild(bar);
    if (cfg.desc) card.appendChild(h("div", { class: "hint", text: cfg.desc }));
    if (!rows.length) { card.appendChild(h("div", { class: "empty", style: "padding:16px", text: "Chưa có dữ liệu." })); return card; }
    var fmap = {}; cfg.f.forEach(function (f) { fmap[f.k] = f; });
    var t = h("table"), tr = h("tr");
    cfg.cols.forEach(function (c) { tr.appendChild(h("th", { class: fmap[c] && fmap[c].t === "money" ? "r" : "", text: (fmap[c] && fmap[c].label) || c })); });
    tr.appendChild(h("th", { text: "" })); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    rows.forEach(function (r, i) {
      var x = h("tr", { class: "click" + (opts.selected && opts.selected === r ? " sel" : ""), on: { click: function () { if (opts.onPick) opts.onPick(r); else hrForm(key, r, base); } } });
      cfg.cols.forEach(function (c) { var f = fmap[c] || {}; x.appendChild(h("td", { class: f.t === "money" ? "r" : "t", text: HRM.isPayField(key, c) && !canSeePay() ? HRM.PAY_HIDDEN : dispVal(f, r[c]) })); });
      var acts = h("td", { style: "text-align:right;white-space:nowrap" });
      if (opts.onPick) acts.appendChild(btn("✎", "ghost", function (ev) { ev.stopPropagation(); hrForm(key, r, base); }, "Sửa"));
      acts.appendChild(btn("✕", "red ghost", function (ev) {
        ev.stopPropagation();
        if (!need("hr.edit", "xóa hồ sơ nhân sự")) return;
        var pD = REPO.plan("remove", key, r, null, { what: "xóa " + cfg.ten });
        if (!pD.ok) { alert(pD.msg); return; }
        if (!confirm("Xóa dòng này?" + (key === "hopdong" ? "\nToàn bộ phụ lục lương, nghỉ phép… của hợp đồng này cũng bị xóa." : "") + (pD.retro ? "\n\n" + retroText(pD.impact) : ""))) return;
        if (!commit(pD, { action: "Xóa hồ sơ" })) return;
        save(); render();
      }, "Xóa"));
      x.appendChild(acts); tb.appendChild(x);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw", style: "max-height:none" }, [t]));
    return card;
  }

  function nextMaNV() {
    var max = 0, pre = "NV", w = 3;
    db.nhanvien.forEach(function (r) { var m = String(r["Mã NV"] || "").match(/^(\D*)(\d+)$/); if (m && +m[2] >= max) { max = +m[2]; pre = m[1]; w = m[2].length; } });
    return pre + String(max + 1).padStart(w, "0");
  }

  // Thêm nhân viên mới: 1 form gồm thông tin cơ bản + cá nhân + hợp đồng + lương + tài khoản
  function wizardNV() {
    var ma = nextMaNV(), body = h("div");
    var sec = function (title) { body.appendChild(h("div", { class: "fh", text: title })); var g = h("div", { class: "fgrid" }); body.appendChild(g); return g; };
    var pick = function (key, names) { return HR[key].f.filter(function (f) { return names.indexOf(f.k) >= 0; }); };
    var fBase = HR.nhanvien.f.filter(function (f) { return f.k !== "Số CCCD" && f.k !== "Ngày tạo hồ sơ"; });
    // α18: đủ các trường sổ quản lý lao động (NĐ 145/2020 Đ3) ngay khi thêm mới — quốc tịch, dân tộc, số sổ BHXH, trình độ
    var fCN = pick("canhan", ["Số CCCD", "Ngày cấp", "Nơi cấp", "Ngày sinh", "Giới tính", "Quốc tịch", "Dân tộc", "Số điện thoại", "Thường trú", "Địa chỉ hiện tại", "Mã số thuế", "Số sổ BHXH"]);
    var fHV = pick("hocvan", ["Trình độ học vấn", "Chuyên môn", "Bậc trình độ kỹ năng nghề", "Bằng cấp"]);
    var fHD = pick("hopdong", ["Số HĐLĐ", "Hình thức HĐLĐ", "Ngày vào làm", "Ngày hết hạn"]);
    var fCT = HR.chitiethd.f.filter(function (f) { return ["Mã công tác", "Loại phụ lục", "Loại biến động", "Số quyết định", "Hiệu lực từ", "Ghi chú"].indexOf(f.k) < 0; });
    var fTK = pick("thanhtoan", ["Số tài khoản", "Tên ngân hàng", "Chi nhánh"]);
    var gB = fieldInputs(sec("1. Thông tin cơ bản"), fBase, { "Mã NV": ma, "Trạng thái": "Đang làm việc" });
    var gC = fieldInputs(sec("2. Thông tin cá nhân"), fCN, { "Quốc tịch": "Việt Nam" });
    var gV = fieldInputs(sec("2b. Trình độ (sổ quản lý lao động)"), fHV.map(function (f) { return Object.assign({}, f, { req: 0 }); }), {});
    var gH = fieldInputs(sec("3. Hợp đồng lao động"), fHD, { "Số HĐLĐ": ma + "/HĐ01", "Hình thức HĐLĐ": "Thử việc", "Ngày vào làm": HRM.today() });
    var gL = fieldInputs(sec("4. Lương, bảo hiểm, thuế"), fCT, { "HTTT": "Chuyển khoản", "Mã hình thức lương": "LTG", "Mức đóng bảo hiểm": "BH01", "Thuế TNCN": "LT01" });
    var gT = fieldInputs(sec("5. Tài khoản nhận lương (nếu chuyển khoản)"), fTK, {});
    body.appendChild(h("div", { class: "hint", text: "Các mục khác (nhân thân/người phụ thuộc, quá trình công tác, nghỉ phép…) bổ sung sau trong hồ sơ nhân viên. Báo cáo nhân sự → Sổ quản lý lao động cho biết ai còn thiếu thông tin." }));
    modal("Thêm nhân viên mới", body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu nhân viên", "pri", function () {
        if (!need("hr.edit", "thêm nhân viên")) return;
        var b = gB(), c = gC(), hd = gH(), l = gL(), tk = gT(), hv = gV();
        var miss = missingReq(fBase, b).concat(missingReq(fHD, hd), missingReq(fCT, l));
        var inp = { b: b, c: c, hv: hv, hd: hd, l: l, tk: tk, today: HRM.today() }, errs = C.hrCreate.validate(inp, db);
        miss.forEach(function (x) { if (errs.indexOf(x) < 0 && !/ngày không hợp lệ/.test(x)) errs.unshift("Cần nhập: " + x); });
        miss.filter(function (x) { return /ngày không hợp lệ/.test(x); }).forEach(function (x) { if (!errs.some(function (y) { return y.indexOf(x.split(" (")[0]) >= 0; })) errs.push(x); });
        // KHÔNG lưu nửa chừng: có lỗi → giữ nguyên form (dữ liệu đang nhập), báo rõ từng trường, chưa ghi gì
        if (errs.length) { alert("⛔ Chưa lưu nhân viên — sửa " + errs.length + " lỗi sau:\n\n" + errs.slice(0, 12).map(function (x) { return "• " + x; }).join("\n")); return; }
        var m = b["Mã NV"], result = REPO.createEmployee(inp), okNV = result.ok;
        if (!okNV) { alert("⛔ KHÔNG lưu được nhân viên " + m + ".\n\nLý do: " + (lastTxnError || "Nơi lưu dữ liệu chưa xác nhận thành công") + "\n\nDữ liệu chưa được ghi (không có hồ sơ dở dang). Form vẫn giữ nguyên để bạn sửa/thử lại. Giữ form mở và gửi phần Lý do nếu cần hỗ trợ."); return; }
        close(); st.tab = "nv"; st.nv = m; st.nvTab = "canhan"; render(); toast("Đã thêm nhân viên " + b["Họ và tên"]);
      })];
    });
  }

  function editBaseNV(nv) {
    var body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, HR.nhanvien.f, nv);
    liveDiff(body, get, HR.nhanvien.f, Object.assign({}, nv));
    body.appendChild(h("div", { class: "hint", style: "margin-top:10px", html: "Đổi CCCD, địa chỉ… → tab <b>Thông tin cá nhân</b>. Đổi lương, chức vụ, phòng ban → <b>Lập phụ lục lương</b> (lập phụ lục mới)." }));
    modal("Sửa thông tin cơ bản", body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu", "pri", function () {
        if (!need("hr.edit", "sửa thông tin nhân viên")) return;
        var d = get(), miss = missingReq(HR.nhanvien.f, d);
        if (miss.length) { alert("Cần nhập: " + miss.join(", ")); return; }
        // v2.1.4: "Đã nghỉ việc" chỉ đặt qua phiếu Nghỉ việc (ghi Ngày chấm dứt vào hợp đồng + trạng thái cùng lúc) — sửa tay làm bảng lương vẫn tính người đã nghỉ
        if (d["Trạng thái"] === "Đã nghỉ việc" && nv["Trạng thái"] !== "Đã nghỉ việc") { alert("Không đặt tay trạng thái 'Đã nghỉ việc'.\nDùng nút \"Đề nghị nghỉ việc\" (phiếu có ngày nghỉ) — khi duyệt, app ghi Ngày chấm dứt vào hợp đồng và đổi trạng thái cùng lúc, để bảng lương dừng tính đúng tháng."); return; }
        // NV có trong bảng lương đã chốt → hỏi xác nhận hồi tố TRƯỚC khi ghi bất cứ gì (như hrForm / sửa ô / xóa dòng); Hủy = không lưu, không ghi nhật ký
        var aNV = Object.assign({}, nv, d);
        if (GRD.changedFields(nv, aNV).length && !guardChange("nhanvien", nv, aNV, "sửa thông tin cơ bản của " + (nv["Họ và tên"] || nv["Mã NV"]))) return;
        var old = nv["Mã NV"];
        if (d["Mã NV"] !== old) {
          if (db.nhanvien.some(function (r) { return r !== nv && r["Mã NV"] === d["Mã NV"]; })) { alert("Mã NV đã tồn tại"); return; }
          var refs = GRD.references(db, old);
          if (refs.kyluong || refs.kyluong_lichsu) { alert("Không đổi được Mã NV " + old + ": mã này đã có trong bảng lương ĐÃ CHỐT (" + (refs.kyluong || 0) + " kỳ hiện hành, " + (refs.kyluong_lichsu || 0) + " bản lịch sử). Đổi mã sẽ làm dữ liệu kỳ đã chốt không còn khớp với hồ sơ.\nNếu thật sự cần mã mới: tạo nhân viên mới và chấm dứt hồ sơ cũ."); return; }
          var refTxt = Object.keys(refs).map(function (k) { return (ALL[k] ? ALL[k].ten : k) + ": " + refs[k]; }).join(", ");
          if (!confirm("Đổi Mã NV " + old + " → " + d["Mã NV"] + "?\nApp sẽ đổi theo ở: " + (refTxt || "(không có dữ liệu liên quan)"))) return;
        }
        var nvIndex = db.nhanvien.indexOf(nv), bNV = Object.assign({}, nv);
        var touched = Object.keys(db).filter(function (k) { return Array.isArray(db[k]); });
        if (!txn(touched, function () {
          if (d["Mã NV"] !== old) {
            var renamed = RP.renameEmployeeRefs(db, old, d["Mã NV"]);
            var renamedTxt = Object.keys(renamed).map(function (k) { return (ALL[k] ? ALL[k].ten : k) + ": " + renamed[k]; }).join(", ");
            audit("Đổi Mã NV", old + " → " + d["Mã NV"] + " (" + (renamedTxt || "không có dữ liệu liên quan") + ")");
          }
          Object.assign(nv, d); auditChange("Sửa thông tin cơ bản", "nhanvien", bNV, nv, nv["Mã NV"]);
        })) { nv = db.nhanvien[nvIndex]; alert("Chưa lưu hồ sơ: " + lastTxnError + ". Form giữ nguyên để thử lại."); return; }
        st.nv = d["Mã NV"]; close(); render();
      })];
    }, { drawer: true, stable: true });
  }
  /** Tăng lương / điều chuyển / đổi chức vụ / đổi mức đóng BH: lập PHỤ LỤC MỚI (không sửa phụ lục cũ — Q-15), có so sánh trước → sau. */
  function bienDongForm(nv, hd) {
    if (!need("hr.edit", "lập phụ lục biến động")) return;
    var base = { "Mã NV": nv["Mã NV"], "Số HĐLĐ": hd["Số HĐLĐ"] };
    var today = HRM.today();
    var cur = db.chitiethd.filter(function (r) { var effective = VAL.normDate(r["Hiệu lực từ"]); return (!r["Hiệu lực từ"] || (effective && effective <= today)) && r["Mã NV"] === base["Mã NV"] && r["Số HĐLĐ"] === base["Số HĐLĐ"]; }).sort(function (a, b) { return String(a["Hiệu lực từ"]) < String(b["Hiệu lực từ"]) ? 1 : -1; })[0];
    if (!cur) { hrForm("chitiethd", null, base); return; }
    var draft = Object.assign(HR.chitiethd.defaults(base, cur), { "Hiệu lực từ": "", "Số quyết định": "" }), body = h("div"), loai = { v: "" };
    body.appendChild(h("div", { class: "hint", html: "Lập <b>phụ lục mới " + esc(draft["Mã công tác"]) + "</b> từ phụ lục hiện tại <b>" + esc(cur["Mã công tác"] || "") + "</b> (hiệu lực " + esc(dispVal({ t: "date" }, cur["Hiệu lực từ"])) + "). Phụ lục cũ giữ nguyên; bảng lương tự lấy phụ lục mới từ ngày hiệu lực." }));
    var chips = h("div", { class: "chips", role: "radiogroup", "aria-label": "Loại biến động", style: "margin:4px 0 14px" });
    HRM.BIEN_DONG.filter(function (L) { return !/điều chuyển|chức vụ|bổ nhiệm/i.test(L); }).forEach(function (L) { var r = h("input", { type: "radio", name: "bd", value: L }); r.addEventListener("change", function () { loai.v = L; }); chips.appendChild(h("label", { class: "chip" }, [r, " " + L])); });
    body.appendChild(h("div", { class: "fh", text: "Loại biến động" })); body.appendChild(chips);
    var keys = ["Hiệu lực từ", "Số quyết định", "Lương thỏa thuận", "Lương cơ bản", "Mức đóng bảo hiểm", "Vị trí việc làm", "Cách áp dụng trong tháng hiệu lực", "Ghi chú"];
    var fs = keys.map(function (k) { return HR.chitiethd.f.filter(function (f) { return f.k === k; })[0]; }).filter(Boolean).map(function (f) { return f.k === "Ghi chú" ? Object.assign({}, f, { label: "Lý do / ghi chú" }) : f; });
    if (!canSeePay()) fs = fs.filter(function (f) { return !HRM.isPayField("chitiethd", f.k); });
    var g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, fs, draft);
    var pctBox = h("div", { class: "ok", style: "margin:8px 0" });
    var upd = liveDiff(body, get, fs.filter(function (f) { return f.k !== "Hiệu lực từ" && f.k !== "Số quyết định" && f.k !== "Ghi chú"; }), cur);
    var showPct = function () {
      var d = get(), a = E.money(cur["Lương thỏa thuận"]), b = E.money(d["Lương thỏa thuận"]);
      pctBox.style.display = a && b && a !== b && canSeePay() ? "" : "none";
      if (a && b) pctBox.textContent = "Lương thỏa thuận " + (b > a ? "+" : "") + fmt(b - a) + " (" + (b > a ? "+" : "") + String(Math.round((b - a) / a * 1000) / 10).replace(".", ",") + "%)" + (E.money(d["Lương cơ bản"]) !== E.money(cur["Lương cơ bản"]) ? " · lương đóng BH đổi → báo điều chỉnh mức đóng BHXH" : "");
    };
    body.addEventListener("input", showPct); body.addEventListener("change", showPct); body.appendChild(pctBox); showPct();
    modal("Tăng lương / biến động — " + (nv["Họ và tên"] || nv["Mã NV"]), body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lập phụ lục " + draft["Mã công tác"], "pri", function () {
        var d = get(), ch = upd();
        if (!d["Hiệu lực từ"]) { alert("Cần nhập 'Hiệu lực từ'"); return; }
        if (!(String(d["Hiệu lực từ"]) > String(cur["Hiệu lực từ"] || ""))) { alert("Phụ lục mới phải có 'Hiệu lực từ' SAU phụ lục hiện tại (" + dispVal({ t: "date" }, cur["Hiệu lực từ"]) + ")."); return; }
        if (!ch.length) { alert("Chưa thay đổi gì so với phụ lục hiện tại."); return; }
        var L = loai.v || (function () { var a = E.money(cur["Lương thỏa thuận"]), b = E.money(d["Lương thỏa thuận"]); return b > a ? "Tăng lương" : b < a ? "Giảm lương" : d["Phòng ban"] !== cur["Phòng ban"] ? "Điều chuyển phòng ban" : d["Chức vụ"] !== cur["Chức vụ"] ? "Bổ nhiệm / đổi chức vụ" : "Điều chỉnh mức đóng BH"; })();
        var rec = Object.assign({}, draft, d, { "Loại biến động": L, "Loại phụ lục": "Phụ lục sửa đổi" }); delete rec._id;
        var pF = REPO.plan("insert", "chitiethd", null, rec, { what: "lập phụ lục " + L.toLowerCase(), checkDup: true });
        if (!pF.ok) { alert(pF.msg); return; }
        if (pF.retro && !confirm(pF.confirmMsg)) return;
        if (!txn(["chitiethd"], function () { return !!commit(pF, { action: "Biến động: " + L }); })) { alert("Chưa lưu phụ lục: " + lastTxnError + ". Form giữ nguyên để thử lại."); return; }
        close(); st.nvTab = "hopdong"; st.hd = hd["Số HĐLĐ"]; st.hdTab = "chitiethd"; render(); toast("Đã lập phụ lục " + rec["Mã công tác"] + " · " + L + " từ " + dispVal({ t: "date" }, rec["Hiệu lực từ"]));
      })];
    }, { drawer: true, stable: true });
  }
  /** Lịch sử 1 nhân viên: quá trình lương + dòng thời gian thay đổi hồ sơ (từ nhật ký, chỉ đọc). */
  function lichSuNV(nv) {
    var ma = nv["Mã NV"], body = h("div"), pay = canSeePay(), R = HRM.reports(db, { hidePay: !pay });
    var ql = R.quaTrinhLuong(ma);
    if (pay && ql.length) {
      var mx = Math.max.apply(null, ql.map(function (x) { return +x["Lương thỏa thuận"] || 0; })) || 1, bars = h("div", { class: "salbar", "aria-label": "Quá trình lương" });
      ql.forEach(function (x) { var v = +x["Lương thỏa thuận"] || 0; bars.appendChild(h("div", {}, [h("b", { text: (v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr" }), h("i", { style: "height:" + Math.max(8, Math.round(v / mx * 110)) + "px" }), h("span", { text: dispVal({ t: "date" }, x["Hiệu lực từ"]).slice(3) + (x["Thay đổi (%)"] !== "" ? " · " + (x["Thay đổi (%)"] > 0 ? "+" : "") + String(x["Thay đổi (%)"]).replace(".", ",") + "%" : "") })])); });
      body.appendChild(h("div", { class: "fh", text: "Quá trình lương" })); body.appendChild(bars);
    }
    // Nhật ký: dòng có Mã NV này; số tiền lương bị che nếu không có quyền xem lương (Q-24)
    var re = new RegExp("(^|[\\s·/(])" + ma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[\\s·/)])");
    var nameKey = {}; Object.keys(ALL).forEach(function (k) { nameKey[ALL[k].ten] = k; });
    var ev = (db.auditlog || []).filter(function (a) { return re.test(String(a.chiTiet || "")); }).slice(-300).reverse();
    var parts = [["", "Tất cả"], ["luong", "Lương & phụ lục"], ["hd", "Hợp đồng"], ["cn", "Cá nhân"], ["khac", "Khác"]], sel = { v: "" };
    var partOf = function (t) { return t === "chitiethd" ? "luong" : t === "hopdong" ? "hd" : t === "canhan" || t === "nhanvien" || t === "thanhtoan" || t === "nhanthan" ? "cn" : "khac"; };
    var items = ev.map(function (a) {
      var seg = String(a.chiTiet || "").split(" · "), table = nameKey[seg[0]] || "", ch = [];
      seg.forEach(function (s) { if (/→/.test(s)) s.split("; ").forEach(function (c) { var m = /^([^:]+):\s*(.*?)\s*→\s*(.*)$/.exec(c); if (m) ch.push({ f: m[1], a: m[2], b: m[3] }); }); });
      var ff = {}; ((HR[table] || {}).f || []).forEach(function (f) { ff[f.k] = f; });
      ch = ch.filter(function (c) { return ["Mã NV", "Số HĐLĐ"].indexOf(c.f) < 0; });
      ch.forEach(function (c) { var f = ff[c.f]; if (f && (f.t === "money" || f.t === "date")) ["a", "b"].forEach(function (k) { if (c[k] && c[k] !== "∅") c[k] = dispVal(f, c[k]); }); });
      if (!pay) ch.forEach(function (c) { if (table && HRM.isPayField(table, c.f)) { c.a = HRM.PAY_HIDDEN; c.b = HRM.PAY_HIDDEN; } });
      var isAdd = ch.length && ch.every(function (c) { return c.a === "∅"; });
      var retro = /HỒI TỐ/.test(a.chiTiet || "");
      return { a: a, table: table, part: partOf(table), ch: ch, isAdd: isAdd, retro: retro, txt: ch.length ? "" : seg.slice(1).filter(function (s) { return !/→/.test(s); }).join(" · ") };
    });
    var chipBar = h("div", { class: "chips", style: "margin:14px 0 6px" }), list = h("ul", { class: "tl" });
    var draw = function () {
      list.innerHTML = "";
      var xs = items.filter(function (it) { return !sel.v || it.part === sel.v; });
      if (!xs.length) list.appendChild(h("li", { class: "empty", text: "Chưa có thay đổi nào được ghi nhật ký cho nhân viên này." }));
      xs.forEach(function (it) {
        var ul = h("ul", { class: "ch" });
        it.ch.slice(0, 12).forEach(function (c) { ul.appendChild(h("li", {}, it.isAdd ? [h("span", { class: "hint", style: "margin:0", text: c.f + ": " }), h("ins", { text: c.b })] : [h("span", { class: "hint", style: "margin:0", text: c.f + ": " }), h("del", { text: c.a === "∅" ? "(trống)" : c.a }), " → ", h("ins", { text: c.b === "∅" ? "(trống)" : c.b })])); });
        list.appendChild(h("li", {}, [h("span", { class: "ti", text: { luong: "PL", hd: "HĐ", cn: "CN", khac: "•" }[it.part] }), h("div", { class: "tb" }, [
          h("div", {}, [h("b", { text: it.a.thaoTac + (it.table && ALL[it.table] ? " — " + ALL[it.table].ten : "") }), it.retro ? h("span", { class: "tag t-retro", style: "margin-left:8px", text: "HỒI TỐ" }) : null]),
          h("small", { text: (it.a.nguoi || "") + " · " + fmtTime(it.a.luc) + (it.txt ? " · " + it.txt : "") }), it.ch.length ? ul : null])]));
      });
    };
    parts.forEach(function (p) { var r = h("input", { type: "radio", name: "lsp", value: p[0] }); r.checked = !p[0]; r.addEventListener("change", function () { sel.v = p[0]; draw(); }); chipBar.appendChild(h("label", { class: "chip" }, [r, " " + p[1]])); });
    body.appendChild(h("div", { class: "fh", text: "Thay đổi hồ sơ" })); body.appendChild(chipBar); body.appendChild(list); draw();
    body.appendChild(h("div", { class: "hint", style: "margin-top:10px", text: "Nhật ký chỉ thêm, không sửa / xóa được — kể cả Admin." }));
    modal("Lịch sử — " + (nv["Họ và tên"] || ma), body, function (close) {
      return [btn("📋 Bảng toàn bộ hồ sơ theo thời gian", "", function () { close(); st.tab = "baocao"; st.bc = "lichsu"; st.bcNV = ma; render(); }), btn("Đóng", "pri", close)];
    }, { drawer: true });
  }
  /** Master–Detail dạng cửa sổ: HĐLĐ (cha) → lương & phụ lục, quyền lợi, nghỉ phép, tài liệu… (con). */
  function hdChiTietModal(ma, soHD) {
    var cur = db.hopdong.filter(function (r) { return r["Mã NV"] === ma && r["Số HĐLĐ"] === soHD; })[0];
    if (!cur) { st.hdModal = null; return; }
    st.hdModal = { ma: ma, so: soHD };
    var body = h("div", { "data-hd-detail": soHD }), tabs = h("div", { class: "subtabs" }), content = h("div");
    st.hdTab = st.hdTab || "chitiethd";
    var draw = function () {
      tabs.innerHTML = "";
      HRM.HD_TABS.forEach(function (k) {
        var n = (db[k] || []).filter(function (r) { return r["Mã NV"] === ma && r["Số HĐLĐ"] === soHD; }).length;
        tabs.appendChild(h("button", { class: st.hdTab === k ? "on" : "", on: { click: function () { st.hdTab = k; draw(); } } }, [document.createTextNode(HR[k].icon + " " + HR[k].ten), n ? h("span", { class: "n", text: n }) : null]));
      });
      tabs.appendChild(btn("Tiêu chuẩn phúc lợi", st.hdTab === "phucloi" ? "on" : "", function () { st.hdTab = "phucloi"; draw(); }));
      content.innerHTML = "";
      content.appendChild(st.hdTab === "phucloi" ? benefitContractPanel(ma, soHD, draw) : st.hdTab === "hdld_tailieu" ? hdldPanel(ma, cur) : subTable(st.hdTab, { "Mã NV": ma, "Số HĐLĐ": soHD }));
    };
    body.appendChild(h("div", { class: "hint", html: "Cha: hợp đồng <b>" + esc(soHD) + "</b> · " + esc(cur["Hình thức HĐLĐ"] || "") + " · vào làm " + esc(cur["Ngày vào làm"] || "") + ". Các mục con bên dưới tự gắn Mã NV và Số HĐLĐ của hợp đồng này." }));
    body.appendChild(tabs); body.appendChild(content); draw();
    modal("Chi tiết hợp đồng " + soHD + " — " + ma, body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true, stable: true, onClose: function () { st.hdModal = null; render(); } });
  }
  function hdReopen() { if (!st.hdModal) return; if (st.hdModal.npt) nptModal(st.hdModal.ma); else hdChiTietModal(st.hdModal.ma, st.hdModal.so); }
  /** Master–Detail dạng cửa sổ: Nhân viên (cha) → Người phụ thuộc (con). Mã NV tự gán theo nhân viên cha. */
  function nptModal(ma) {
    var nv = db.nhanvien.filter(function (r) { return r["Mã NV"] === ma; })[0];
    if (!nv) { st.hdModal = null; return; }
    st.hdModal = { ma: ma, npt: 1 };
    var body = h("div", { "data-npt-detail": ma });
    body.appendChild(h("div", { class: "hint", html: "Cha: nhân viên <b>" + esc(ma) + "</b> — " + esc(nv["Họ và tên"] || "") + ". Mã NV của người phụ thuộc tự gán theo nhân viên này." }));
    body.appendChild(subTable("nhanthan", { "Mã NV": ma }));
    modal("Người phụ thuộc — " + ma, body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true, onClose: function () { st.hdModal = null; render(); } });
  }

  // @screen tabNhanVien

  // @screen tabNhanSu

