  function tabOcrLib() {
    var w = h("div");
    if (!window.hakOcrLib) { w.appendChild(h("div", { class: "card" }, [h("div", { class: "warn", text: "Thư viện mẫu OCR chỉ có trong bản cài (.exe) — dữ liệu lưu offline trên máy." })])); return w; }
    olLoad();
    var tabs = h("div", { class: "subtabs" });
    OL_TABS.forEach(function (t) { tabs.appendChild(h("button", { class: OLS.tab === t[0] ? "on" : "", "data-oltab": t[0], on: { click: function () { OLS.tab = t[0]; OLS.page = 0; render(); } } }, [document.createTextNode(t[1])])); });
    w.appendChild(tabs);
    var c = h("div", { class: "card" }); w.appendChild(c);
    if (OLS.err) c.appendChild(h("div", { class: "warn", text: "⚠ " + OLS.err }));
    if (!OLS.loaded) { c.appendChild(h("div", { class: "hint", text: "Đang đọc thư viện mẫu…" })); return w; }
    var S0 = OLS.stats || { total: 0, byStatus: {} };
    if (OLS.tab === "thongke") {
      var by = S0.byStatus || {}, rows = [["Tổng số mẫu", S0.total], ["Chờ xác nhận", by.PENDING_APPROVAL || 0], ["Đã xác nhận (dùng để nhận dạng)", by.VERIFIED || 0], ["Bị thay thế (lịch sử)", by.SUPERSEDED || 0], ["Bị từ chối", by.REJECTED || 0], ["Xung đột cần xử lý", by.CONFLICT || 0], ["Số nhãn khác nhau", S0.labels || 0], ["Lần sửa đã ghi", S0.edits || 0], ["Lần mẫu được dùng để nhận dạng", S0.refs || 0], ["Cặp dễ nhầm", S0.confusions || 0], ["Bố cục đã lưu", (OLS.layouts || []).length]];
      var t = h("table", { class: "t" }); rows.forEach(function (r) { t.appendChild(h("tr", {}, [h("td", { text: r[0] }), h("td", { class: "r", text: String(r[1]) })])); });
      c.appendChild(h("h3", { text: "Hiệu quả OCR & Thư viện mẫu" })); c.appendChild(t);
      c.appendChild(h("div", { class: "hint", text: "Độ chính xác thực tế chỉ đo được khi có chứng từ viết tay thật đã xác nhận; số liệu này là số lượng mẫu, không phải tỷ lệ đúng." }));
      var cb = h("input", { type: "checkbox", "aria-label": "Lưu cả ô OCR đọc đúng đã xem" }); cb.checked = !!congTy()["OCR lưu mẫu xác nhận"];
      cb.addEventListener("change", function () { if (!need("ocr.library", "đổi cấu hình thư viện mẫu OCR")) { cb.checked = !cb.checked; return; } db.congty = [Object.assign({}, congTy(), { "OCR lưu mẫu xác nhận": cb.checked })]; audit("Cấu hình thư viện mẫu OCR", "lưu mẫu xác nhận = " + cb.checked); save(); toast(cb.checked ? "Bật: ô OCR đọc đúng mà bạn đã xem sẽ được lưu thành mẫu 'Đã xác nhận đúng'" : "Tắt: chỉ lưu mẫu từ ô bạn sửa"); });
      c.appendChild(h("label", { class: "hint", style: "display:block;margin:8px 0" }, [cb, document.createTextNode(" Lưu cả ô OCR đọc ĐÚNG mà người dùng đã mở xem (mẫu \"đã xác nhận đúng\"). Mặc định tắt — chỉ ô bạn sửa mới thành mẫu.")]));
      c.appendChild(btn("Kiểm tra toàn vẹn thư viện", "ghost", function () { window.hakOcrLib.verify().then(function (r) { var rp = r && r.report; toast(rp ? (rp.ok ? "✓ Thư viện toàn vẹn: " + rp.samples + " mẫu" : "⚠ Lỗi: " + rp.bad.length + " ảnh, " + rp.corruptLines + " dòng nhật ký") : "Không kiểm tra được"); }); }));
      return w;
    }
    if (OLS.tab === "nham") {
      c.appendChild(h("h3", { text: "Cặp dễ nhầm (OCR đọc A, người dùng sửa thành B)" }));
      if (!OLS.confusions.length) c.appendChild(h("div", { class: "hint", text: "Chưa có cặp nhầm lẫn nào." }));
      else { var tc = h("table", { class: "t" }); tc.appendChild(h("tr", {}, ["OCR đọc", "Sửa thành", "Số lần"].map(function (x) { return h("th", { text: x }); }))); OLS.confusions.forEach(function (x) { tc.appendChild(h("tr", {}, [h("td", { text: x.ocr || "(trống)" }), h("td", { text: x.corrected }), h("td", { class: "r", text: String(x.count) })])); }); c.appendChild(tc); }
      return w;
    }
    if (OLS.tab === "xuly") {
      var miss = OLS.edits.filter(function (e) { return e.flags && e.flags.indexOf("MISSING_SOURCE_IMAGE") >= 0; }).reverse();
      c.appendChild(h("h3", { text: "Ô đã sửa nhưng KHÔNG có ảnh nguồn (" + miss.length + ")" }));
      c.appendChild(h("div", { class: "hint", text: "Các lần sửa này đã được ghi vào lịch sử nhưng không tạo mẫu học (không có ảnh ô thật). Không nằm trong tập mẫu chính thức. Mở lại chứng từ gốc để kiểm tra nếu cần." }));
      var tx = h("table", { class: "t" });
      tx.appendChild(h("tr", {}, ["Lúc", "Người sửa", "Chứng từ / trang", "Mã NV", "Từ", "Thành", "Ghi chú"].map(function (x) { return h("th", { text: x }); })));
      miss.slice(OLS.page * 50, OLS.page * 50 + 50).forEach(function (e) { tx.appendChild(h("tr", {}, [fmtTime(e.at), e.by, (e.docId || "-") + " / " + (e.page || ""), e.employeeId, e.from, e.to, e.note].map(function (x) { return h("td", { text: String(x == null ? "" : x) }); }))); });
      c.appendChild(tx); olPager(c, miss.length); return w;
    }
    if (OLS.tab === "lichsu") {
      c.appendChild(h("h3", { text: "Lịch sử sửa ô (mới nhất trước)" }));
      var ed = OLS.edits.slice().reverse().slice(OLS.page * 50, OLS.page * 50 + 50), te = h("table", { class: "t" });
      te.appendChild(h("tr", {}, ["Lúc", "Người sửa", "Chứng từ / trang", "Mã NV", "OCR đọc", "Từ", "Thành", "Ghi chú"].map(function (x) { return h("th", { text: x }); })));
      ed.forEach(function (e) { te.appendChild(h("tr", {}, [fmtTime(e.at), e.by, (e.docId || "-") + " / " + (e.page || ""), e.employeeId, e.ocr, e.from, e.to, e.note].map(function (x) { return h("td", { text: String(x == null ? "" : x) }); }))); });
      c.appendChild(te); olPager(c, OLS.edits.length); return w;
    }
    if (OLS.tab === "bocuc") {
      c.appendChild(h("h3", { text: "Bố cục đã lưu (khung bảng, số cột/dòng, vị trí ô)" }));
      var ls = OLS.layouts || [];
      if (!ls.length) c.appendChild(h("div", { class: "hint", text: "Chưa có bố cục. Bố cục được lưu khi bảng OCR được duyệt; trang có bố cục lệch sẽ không được dùng để học mẫu." }));
      else { var tl = h("table", { class: "t" }); tl.appendChild(h("tr", {}, ["Tên", "Cột", "Dòng", "Số lần dùng", "Lần cuối"].map(function (x) { return h("th", { text: x }); }))); ls.forEach(function (l) { tl.appendChild(h("tr", {}, [l.name, l.cols, l.rows, l.uses, fmtTime(l.lastUsed)].map(function (x) { return h("td", { text: String(x == null ? "" : x) }); }))); }); c.appendChild(tl); }
      return w;
    }
    var f = OLS.samples.filter(function (x) {
      if (OLS.tab === "so") return x.cellType === "digit" && x.status !== "PENDING_APPROVAL" && x.status !== "CONFLICT";
      if (OLS.tab === "kyhieu") return x.cellType === "mark" || x.labelKind === "SYMBOL" && x.cellType !== "digit";
      if (OLS.tab === "chu") return x.cellType === "text";
      if (OLS.tab === "cho") return x.status === "PENDING_APPROVAL" || x.status === "CONFLICT";
      return true;
    });
    if (OLS.q) f = f.filter(function (x) { return String(x.label).indexOf(OLS.q) >= 0 || String(x.employeeId).toLowerCase().indexOf(OLS.q.toLowerCase()) >= 0; });
    var qi = h("input", { class: "i", placeholder: "Lọc theo nhãn / mã NV", value: OLS.q, "aria-label": "Lọc mẫu" }); qi.addEventListener("change", function () { OLS.q = qi.value.trim(); OLS.page = 0; render(); });
    c.appendChild(h("div", { class: "bar" }, [qi, h("span", { class: "hint", text: f.length + " mẫu" })]));
    if (!f.length) { c.appendChild(h("div", { class: "hint", text: OLS.tab === "cho" ? "Không có mẫu nào chờ xác nhận." : "Chưa có mẫu trong mục này. Mẫu tự được ghi khi bạn sửa một ô trong màn hình Đọc ảnh chấm công." })); return w; }
    var tb = h("table", { class: "t", "data-olsamples": "1" }); tb.appendChild(h("tr", {}, ["Ảnh ô", "Nhãn", "Loại nhãn", "Trạng thái", "Nguồn", "OCR đọc", "Chứng từ / trang", "Mã NV", "Kỳ", "Dùng", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    f.slice().reverse().slice(OLS.page * 50, OLS.page * 50 + 50).forEach(function (x) {
      var lab = h("input", { class: "i", value: x.label, style: "width:56px", "aria-label": "Nhãn mẫu" }), ops = h("td", {});
      var user = function () { return session ? session.tenDangNhap : ""; };
      if (x.status === "PENDING_APPROVAL" || x.status === "CONFLICT") ops.appendChild(btn("Duyệt", "pri", olAct(function () { return window.hakOcrLib.setStatus(x.id, "VERIFIED", user(), "duyệt thủ công"); }, "duyệt mẫu " + x.id)));
      if (x.status !== "REJECTED") ops.appendChild(btn("Từ chối", "ghost", olAct(function () { return window.hakOcrLib.setStatus(x.id, "REJECTED", user(), "từ chối thủ công"); }, "từ chối mẫu " + x.id)));
      if (x.status === "REJECTED" || x.status === "SUPERSEDED") ops.appendChild(btn("Khôi phục", "ghost", olAct(function () { return window.hakOcrLib.setStatus(x.id, "PENDING_APPROVAL", user(), "khôi phục"); }, "khôi phục mẫu " + x.id)));
      ops.appendChild(btn("Lưu nhãn", "ghost", olAct(function () { return window.hakOcrLib.relabel(x.id, lab.value, x.labelKind === "UNKNOWN" ? "SYMBOL" : x.labelKind, user(), "đổi nhãn thủ công"); }, "đổi nhãn mẫu " + x.id)));
      tb.appendChild(h("tr", { "data-olid": x.id }, [h("td", {}, [olThumb(x.pngSha)]), h("td", {}, [lab]), h("td", { text: x.labelKind === "UNKNOWN" ? "chưa rõ (ký hiệu hay giá trị công)" : "ký hiệu / số" }), h("td", { text: OL_ST[x.status] || x.status }), h("td", { text: x.source === "CONFIRMED" ? "Đã xác nhận đúng" : "Do sửa tay" }), h("td", { text: x.ocrValue || "" }), h("td", { text: (x.docId || "-") + " / " + (x.page || "") }), h("td", { text: x.employeeId || "" }), h("td", { text: x.ky || "" }), h("td", { class: "r", text: String(x.uses || 0) }), ops]));
    });
    c.appendChild(h("div", { class: "tw" }, [tb])); olPager(c, f.length);
    return w;
  }
