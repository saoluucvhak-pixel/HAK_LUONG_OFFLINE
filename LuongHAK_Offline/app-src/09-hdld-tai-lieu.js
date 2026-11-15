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
        var m = b["Mã NV"], rows = C.hrCreate.build(inp, HRM.uid);
        // một giao dịch duy nhất: ghi đủ 6 bảng cùng lúc; main từ chối/lỗi ghi → hoàn tác TẤT CẢ, không để hồ sơ dở dang
        var okNV = txn(["nhanvien", "canhan", "hopdong", "chitiethd", "thanhtoan", "hocvan"], function () {
          Object.keys(rows).forEach(function (k) { rows[k].forEach(function (r) { db[k].push(r); }); });
          audit("Thêm nhân viên", m + " — " + b["Họ và tên"] + " (" + Object.keys(rows).filter(function (k) { return rows[k].length; }).join(", ") + ")"); return true;
        });
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
            Object.keys(db).forEach(function (k) { if (Array.isArray(db[k]) && k !== "auditlog" && k !== "kyluong" && k !== "kyluong_lichsu") db[k].forEach(function (r) { if (r && r !== nv && r["Mã NV"] === old) r["Mã NV"] = d["Mã NV"]; }); });
            audit("Đổi Mã NV", old + " → " + d["Mã NV"] + " (" + (refTxt || "không có dữ liệu liên quan") + ")");
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
      content.innerHTML = "";
      content.appendChild(st.hdTab === "hdld_tailieu" ? hdldPanel(ma, cur) : subTable(st.hdTab, { "Mã NV": ma, "Số HĐLĐ": soHD }));
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

  function tabNhanVien() {
    var nv = db.nhanvien.filter(function (r) { return r["Mã NV"] === st.nv; })[0];
    if (!nv) { st.tab = "nhansu"; return tabNhanSu(); }
    var ma = nv["Mã NV"], today = HRM.today(), hh = HRM.hienHanh(db, ma, today), w = h("div");
    var active = HRM.activeHD(db, ma, today, today);
    var effective = hh.ct && (!hh.ct["Hiệu lực từ"] || VAL.normDate(hh.ct["Hiệu lực từ"]) <= today) ? hh.ct : null;
    var endDate = hh.hd && VAL.normDate(hh.hd["Ngày chấm dứt"]);
    var expiry = active && VAL.normDate(active["Ngày hết hạn"]);
    var head = h("div", { class: "card nvhead" });
    head.appendChild(h("div", { class: "bar", style: "margin:0" }, [
      btn("← Danh sách", "", function () { st.tab = "nhansu"; render(); }),
      h("div", { class: "avatar", text: String(nv["Họ và tên"] || "?").trim().split(/\s+/).pop().charAt(0).toUpperCase() }),
      h("div", { html: "<b style='font-size:18px'>" + esc(nv["Họ và tên"]) + "</b> <span class='tag " + (nv["Trạng thái"] === "Đã nghỉ việc" ? "off" : "on") + "'>" + esc(nv["Trạng thái"] || "") + "</span><br><span class='hint' style='margin:0'>" +
        esc(ma) + (hh.tenPB ? " · " + esc(hh.tenPB) : "") + (hh.tenCV ? " · " + esc(hh.tenCV) : "") + (hh.hd ? " · HĐ " + esc(hh.hd["Số HĐLĐ"]) + " (" + esc(hh.hd["Hình thức HĐLĐ"] || "") + ")" : " · chưa có hợp đồng") +
        (active && effective && canSeePay() ? " · Lương " + fmt(E.money(effective["Lương thỏa thuận"])) : "") + "</span>" }),
      h("span", { class: "sp" }),
      active && can("hr.edit") ? btn("Lập phụ lục lương", "pri", function () { bienDongForm(nv, active); }) : null,
      active && can("hr.edit") ? btn("Đề nghị điều chuyển", "", function () { nvnsForm(null, { "Mã NV": ma, "Loại nghiệp vụ": "Điều chuyển bộ phận" }); }) : null,
      btn("✎ Sửa cơ bản", "", function () { editBaseNV(nv); }),
      btn("🕘 Lịch sử", "", function () { lichSuNV(nv); }),
      nv["Trạng thái"] !== "Đã nghỉ việc" && can("hr.edit") ? btn("Đề nghị nghỉ việc", "", function () { nvnsForm(null, { "Mã NV": ma, "Loại nghiệp vụ": "Nghỉ việc" }); }) : null,
      btn("🗑", "red", function () {
        if (!need("hr.edit", "xóa nhân viên")) return;
        var refs = GRD.references(db, ma), inClosed = refs.kyluong || refs.kyluong_lichsu;
        if (inClosed && !can("retro.edit")) { alert("⛔ Nhân viên " + ma + " đã có trong bảng lương ĐÃ CHỐT. Chỉ Admin được xóa hồ sơ này (bảng lương đã chốt vẫn giữ nguyên)."); return; }
        if (!confirm("XÓA hẳn nhân viên " + nv["Họ và tên"] + " và toàn bộ hồ sơ (không xóa chấm công/sản lượng)?" + (inClosed ? "\n\n⚠ Nhân viên này có trong " + inClosed + " bảng lương đã chốt — số đã chốt KHÔNG đổi, nhưng hồ sơ gốc sẽ không còn để đối chiếu." : ""))) return;
        if (!backupOrBlock("truoc-xoa-nhan-vien", "xóa nhân viên")) return;
        Object.keys(HR).forEach(function (k) { db[k] = (db[k] || []).filter(function (r) { return r["Mã NV"] !== ma; }); });
        audit("Xóa nhân viên", ma + " — " + nv["Họ và tên"] + (inClosed ? " [có trong bảng lương đã chốt]" : ""));
        save(); st.tab = "nhansu"; render();
      }, "Xóa nhân viên")]));
    w.appendChild(head);
    var horizon = new Date(today + "T00:00:00Z");
    horizon.setUTCDate(horizon.getUTCDate() + 30);
    var notice = !hh.hd ? "Chưa có hợp đồng lao động."
      : !active ? "Hồ sơ đang hiển thị hợp đồng gần nhất. Hôm nay không có hợp đồng hiệu lực."
      : !effective ? "Hợp đồng chưa có phụ lục lương hiệu lực hôm nay."
      : endDate && endDate >= today ? "Ngày chấm dứt hợp đồng: " + endDate + "."
      : expiry && expiry < today ? "Hợp đồng đã quá hạn: " + expiry + "."
      : expiry && expiry <= horizon.toISOString().slice(0, 10) ? "Hợp đồng sắp hết hạn: " + expiry + "."
      : "";
    if (notice) w.appendChild(h("div", { class: "warn" }, [
      h("span", { text: notice + " " }),
      btn("Mở hợp đồng", "ghost", function () { st.nvTab = "hopdong"; st.hd = hh.hd ? hh.hd["Số HĐLĐ"] : null; render(); })
    ]));
    if (active && effective) head.appendChild(h("p", { class: "hint", text: "Phụ lục hiện hành" +
      (effective["Mã công tác"] ? " " + effective["Mã công tác"] : "") +
      (effective["Hiệu lực từ"] ? " · Hiệu lực từ " + effective["Hiệu lực từ"] : "") }));
    var tabs = h("div", { class: "subtabs" });
    st.nvTab = st.nvTab || "canhan";
    HRM.NV_TABS.forEach(function (k) {
      var n = (db[k] || []).filter(function (r) { return r["Mã NV"] === ma; }).length;
      tabs.appendChild(h("button", { class: st.nvTab === k ? "on" : "", on: { click: function () { st.nvTab = k; render(); } } }, [document.createTextNode(HR[k].icon + " " + HR[k].ten), n ? h("span", { class: "n", text: n }) : null]));
    });
    var upcoming = db.chitiethd.filter(function (row) {
      return row["Mã NV"] === ma && VAL.normDate(row["Hiệu lực từ"]) > today;
    }).sort(function (a, b) { return String(a["Hiệu lực từ"]).localeCompare(String(b["Hiệu lực từ"])); });
    if (upcoming.length) {
      var next = upcoming[0];
      w.appendChild(h("div", { class: "hint", "data-hr-upcoming": "1" }, [
        h("span", { text: "Sắp hiệu lực: " + fmtDate(next["Hiệu lực từ"]) + " · " + (next["Loại biến động"] || "Phụ lục") +
          " · " + (HRM.refName(db, "dm_phongban", next["Phòng ban"]) || next["Phòng ban"] || "") + " " }),
        btn("Xem phụ lục", "ghost", function () { st.nvTab = "hopdong"; st.hd = next["Số HĐLĐ"]; st.hdTab = "chitiethd"; render(); })
      ]));
    }
    w.appendChild(tabs);
    if (st.nvTab === "nhanthan") {
      var nptRows = db.nhanthan.filter(function (r) { return r["Mã NV"] === ma; });
      var nc = h("div", { class: "card", "data-npt-master": ma });
      nc.appendChild(h("div", { class: "bar", style: "margin:0" }, [
        h("div", { html: "Nhân viên <b>" + esc(ma) + "</b> có <b>" + nptRows.length + "</b> người thân / người phụ thuộc đã khai." }),
        h("span", { class: "sp" }),
        btn("Chi tiết người phụ thuộc", "pri", function () { if (!leaveOk()) return; nptModal(ma); }, "Mở cửa sổ cha–con để xem, thêm, sửa người phụ thuộc của nhân viên này")]));
      if (nptRows.length) {
        var nt = h("table"); nt.appendChild(h("tr", {}, [h("th", { text: "Họ tên" }), h("th", { text: "Quan hệ" })]));
        nptRows.forEach(function (r) { nt.appendChild(h("tr", {}, [h("td", { class: "t", text: r["Họ tên nhân thân"] || "" }), h("td", { class: "t", text: r["Quan hệ"] || "" })])); });
        nc.appendChild(h("div", { class: "tw" }, [nt]));
      }
      w.appendChild(nc); return w;
    }
    if (st.nvTab !== "hopdong") { w.appendChild(subTable(st.nvTab, { "Mã NV": ma })); return w; }
    // Tab hợp đồng: danh sách HĐ + mục con của HĐ đang chọn
    var hds = db.hopdong.filter(function (r) { return r["Mã NV"] === ma; });
    var cur = hds.filter(function (r) { return r["Số HĐLĐ"] === st.hd; })[0] || hh.hd || hds[0];
    w.appendChild(subTable("hopdong", { "Mã NV": ma }, { selected: cur, onPick: function (r) { st.hd = r["Số HĐLĐ"]; render(); } }));
    if (!cur) return w;
    st.hd = cur["Số HĐLĐ"];
    var nPL = db.chitiethd.filter(function (r) { return r["Mã NV"] === ma && r["Số HĐLĐ"] === cur["Số HĐLĐ"]; }).length;
    var mc = h("div", { class: "card", "data-hd-master": cur["Số HĐLĐ"] });
    mc.appendChild(h("div", { class: "bar", style: "margin:0" }, [
      h("div", { html: "Hợp đồng đang chọn: <b>" + esc(cur["Số HĐLĐ"]) + "</b> (" + esc(cur["Hình thức HĐLĐ"] || "") + ") · " + nPL + " dòng lương & phụ lục. Bấm vào hợp đồng khác ở bảng trên để chuyển." }),
      h("span", { class: "sp" }),
      btn("📂 Chi tiết hợp đồng", "pri", function () { if (!leaveOk()) return; hdChiTietModal(ma, cur["Số HĐLĐ"]); }, "Mở cửa sổ cha–con: lương & phụ lục, nghỉ phép, tài liệu… của đúng hợp đồng này")]));
    w.appendChild(mc);
    return w;
  }

  function tabNhanSu() {
    var wrap = h("div"), card = h("div", { class: "card" }), bar = h("div", { class: "bar" }), sf = null, lastN = { kept: 0, total: 0 };
    bar.appendChild(btn("＋ Thêm nhân viên", "pri", wizardNV)); bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("📄 Tải file mẫu", "", function () { saveXlsx("Mau_HoSoNhanSu.xlsx", Object.keys(HR).map(templateSheet), "template"); toast("File mẫu có 1 sheet cho mỗi loại hồ sơ"); }, "Mỗi loại hồ sơ là 1 sheet"));
    bar.appendChild(btn("⬆ Nhập Excel", "", importAllFile, "Nhập file Excel nhiều sheet (Nhân viên, Thông tin cá nhân, Hợp đồng…)"));
    bar.appendChild(btn("⬇ Sổ lao động", "", function () { var rows = HRM.reports(db, { hidePay: !canSeePay() }).soLaoDong(st.nam); saveXlsx("SoQuanLyLaoDong.xlsx", [{ name: "Sổ quản lý lao động", cols: rows[0] ? Object.keys(rows[0]) : [], rows: rows }]); }));
    bar.appendChild(btn("⬇ Excel danh sách đang lọc", "", function () { var rows = nsRows().map(nsExportRow); saveXlsx("DanhSachNhanSu_loc.xlsx", [{ name: "Nhân sự", cols: rows[0] ? Object.keys(rows[0]) : [], rows: rows }]); }, "Xuất đúng các dòng đang hiển thị"));
    bar.appendChild(btn("⬇ PDF", "", function () { exportSheetsPdf({ title: "DANH SÁCH NHÂN SỰ (đã lọc)", ky: SFC.scopeText(sf.cfg, sf.cfg.state.get(), "tất cả"), sheets: [{ name: "Nhân sự", rows: nsRows().map(nsExportRow) }] }, "DanhSachNhanSu_loc.pdf"); }, "Xuất đúng các dòng đang hiển thị"));
    bar.appendChild(btn("🖨 In", "", function () { if (!need("export", "in")) return; window.print(); }));
    card.appendChild(bar);
    var nsf = function () { return (st.nsf = st.nsf || { pb: [], cv: [], hd: [], hh: "" }); };
    var today = function () { return HRM.today(); };
    var isoLocal = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }; // ngày theo giờ máy (không dùng UTC)
    var rowsAll = function () { var ix = HRM.buildIndex(db); return db.nhanvien.map(function (r) { return { r: r, hh: HRM.hienHanh(db, r["Mã NV"], null, ix) }; }); };
    /** MỘT hàm chọn dòng cho bảng, Excel, PDF và in. */
    function nsRows() {
      var qq = qOf("nhansu"), f = nsf(), t0 = today(), in30 = function (n) { return isoLocal(new Date(Date.now() + n * 864e5)); };
      var all = rowsAll(); lastN = { total: all.length, kept: 0 };
      var out = all.filter(function (x) {
        if (st.ft && x.r["Trạng thái"] !== st.ft) return false;
        if (f.pb.length && !SFC.inSet(f.pb, x.hh.tenPB)) return false;
        if (f.cv.length && !SFC.inSet(f.cv, x.hh.tenCV)) return false;
        var hd = x.hh.hd || {}, het = SFC.isoDay(hd["Ngày hết hạn"]), ct = !!hd["Ngày chấm dứt"];
        if (f.hd.length && !SFC.inSet(f.hd, hd["Hình thức HĐLĐ"])) return false;
        if (f.hh === "quahan" && !(het && !ct && het < t0)) return false;
        if (/^(30|60|90)$/.test(f.hh) && !(het && !ct && het >= t0 && het <= in30(+f.hh))) return false;
        if (f.hh === "khong" && het) return false;
        return !qq || SFC.hay([x.r["Mã NV"], x.r["Họ và tên"], x.hh.tenPB, x.hh.tenCV]).indexOf(qq) >= 0;
      });
      lastN.kept = out.length; return out;
    }
    function nsExportRow(x) { var hd = x.hh.hd || {}, o = { "Mã NV": x.r["Mã NV"], "Họ và tên": x.r["Họ và tên"], "Phòng ban": x.hh.tenPB || "", "Chức vụ": x.hh.tenCV || "", "Loại HĐ": hd["Hình thức HĐLĐ"] || "", "Hết hạn HĐ": hd["Ngày hết hạn"] || "" }; if (canSeePay()) o["Lương thỏa thuận"] = x.hh.ct ? E.money(x.hh.ct["Lương thỏa thuận"]) : ""; o["Trạng thái"] = x.r["Trạng thái"] || ""; return o; }
    var distinct = function (fn) { return function () { var d = {}; rowsAll().forEach(function (x) { var v = String(fn(x) || "").trim(); if (v) d[v] = 1; }); return Object.keys(d).sort(); }; };
    var cfg = {
      screenId: "nhansu", searchPlaceholder: "🔍 Tìm mã, tên, phòng ban…",
      fields: [
        { key: "tt", label: "Trạng thái", type: "enum", options: ["Đang làm việc", "Tạm hoãn HĐLĐ", "Đã nghỉ việc"] },
        { key: "pb", label: "Phòng ban", type: "multi", withNone: true, options: distinct(function (x) { return x.hh.tenPB; }) },
        { key: "cv", label: "Chức vụ", type: "multi", withNone: true, options: distinct(function (x) { return x.hh.tenCV; }) },
        { key: "hd", label: "Loại hợp đồng", type: "multi", withNone: true, options: distinct(function (x) { return (x.hh.hd || {})["Hình thức HĐLĐ"]; }) },
        { key: "hh", label: "Hạn hợp đồng", type: "enum", options: [{ value: "quahan", label: "Đã quá hạn (chưa chấm dứt)" }, { value: "30", label: "Hết hạn trong 30 ngày" }, { value: "60", label: "Hết hạn trong 60 ngày" }, { value: "90", label: "Hết hạn trong 90 ngày" }, { value: "khong", label: "Không có ngày hết hạn" }] }
      ],
      quickFields: ["q", "tt", "pb"], advancedFields: ["q", "tt", "pb", "cv", "hd", "hh"], scopeFallback: function () { return "tất cả nhân viên"; },
      state: {
        get: function () { var f = nsf(), s = SFC.empty(); s.q = st.qs.nhansu || ""; if (st.ft) s.one.tt = st.ft; if (f.pb.length) s.sel.pb = f.pb.slice(); if (f.cv.length) s.sel.cv = f.cv.slice(); if (f.hd.length) s.sel.hd = f.hd.slice(); if (f.hh) s.one.hh = f.hh; return s; },
        set: function (s) { st.ft = s.one.tt || ""; st.nsf = { pb: (s.sel.pb || []).slice(), cv: (s.sel.cv || []).slice(), hd: (s.sel.hd || []).slice(), hh: s.one.hh || "" }; st.qs.nhansu = s.q; saveUi(); }
      },
      dataSource: function () { return { kept: lastN.kept, total: lastN.total, unsupported: [] }; },
      onApply: function () { st.pg.nhansu = 0; draw(); }
    };
    sf = sfUi.mount(cfg); sf.cfg = cfg; card.appendChild(sf.el);
    card.appendChild(h("div", { class: "hint", text: "Bấm vào một nhân viên để mở hồ sơ đầy đủ (cá nhân, hợp đồng, phụ lục lương, người phụ thuộc, nghỉ phép…). Lương được tính theo phụ lục hợp đồng đang hiệu lực." }));
    var tw = h("div", { class: "tw" }); card.appendChild(tw); wrap.appendChild(card);
    function draw() {
      tw.innerHTML = "";
      var rows = nsRows(); sf.refresh();
      if (!rows.length) { tw.appendChild(h("div", { class: "empty", html: db.nhanvien.length ? "Không tìm thấy." : "Chưa có nhân viên nào.<br>Bấm <b>＋ Thêm nhân viên</b> hoặc nhập từ file Excel." })); return; }
      var pgN = pager("nhansu", rows.length, draw); if (pgN.el) tw.appendChild(pgN.el);
      var seePay = canSeePay(), cols = ["Mã NV", "Họ và tên", "Phòng ban", "Chức vụ", "Loại HĐ", "Hết hạn HĐ"].concat(seePay ? ["Lương thỏa thuận"] : [], ["Trạng thái"]);
      var t = h("table"), tr = h("tr"); cols.forEach(function (c) { tr.appendChild(h("th", { class: c === "Lương thỏa thuận" ? "r" : "", text: c })); });
      t.appendChild(h("thead", {}, [tr])); var tb = h("tbody");
      rows.slice(pgN.start, pgN.end).forEach(function (x) {
        var r = x.r, hd = x.hh.hd || {}, het = hd["Ngày hết hạn"] || "", soon = het && !hd["Ngày chấm dứt"] && het <= isoLocal(new Date(Date.now() + 30 * 864e5));
        var e = h("tr", { class: "click", on: { click: function () { st.tab = "nv"; st.nv = r["Mã NV"]; st.nvTab = "canhan"; st.hd = null; render(); } } });
        [r["Mã NV"], r["Họ và tên"], x.hh.tenPB, x.hh.tenCV, hd["Hình thức HĐLĐ"] || "", het].forEach(function (v, i) { e.appendChild(h("td", { class: "t", text: v || "", style: i === 5 && soon ? "color:#c0362c;font-weight:600" : "" })); });
        if (seePay) e.appendChild(h("td", { class: "r", text: x.hh.ct ? fmt(E.money(x.hh.ct["Lương thỏa thuận"])) : "" }));
        e.appendChild(h("td", { class: "t" }, [h("span", { class: "tag " + (r["Trạng thái"] === "Đã nghỉ việc" ? "off" : "on"), text: r["Trạng thái"] || "" })]));
        tb.appendChild(e);
      });
      t.appendChild(tb); tw.appendChild(t);
    }
    draw(); return wrap;
  }

