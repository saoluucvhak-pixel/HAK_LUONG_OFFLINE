  // ---------- Cấp phát: mẫu Excel, nhập Excel theo phiếu, báo cáo tổng hợp / chi tiết ----------
  var CP_SAMPLES = {
    milk: [{ "Mã phiếu": "SUA-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho nhân sự", "Mã NV": "0005", "Mã mặt hàng": "MILK", "Số lượng": 2, "Ghi chú": "" },
      { "Mã phiếu": "SUA-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho nhân sự", "Mã NV": "00123", "Mã mặt hàng": "MILK", "Số lượng": 2, "Ghi chú": "" }],
    ppe: [{ "Mã phiếu": "BH-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho vật tư", "Mã NV": "0005", "Mã vật tư": "GIAY", "Kích cỡ": "40", "Số lượng": 1, "Lý do": "Cấp đợt 11", "Ghi chú": "" },
      { "Mã phiếu": "BH-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho vật tư", "Mã NV": "00123", "Mã vật tư": "MUBH", "Kích cỡ": "", "Số lượng": 1, "Lý do": "Cấp đợt 11", "Ghi chú": "" }]
  };
  var CP_SHEET = { milk: "Cấp phát sữa", ppe: "Cấp phát bảo hộ" };
  function cpDownloadTemplate(type) {
    var cols = C.benefits.TEMPLATE_COLUMNS[type], guide = [
      { "Cột": "Cách dùng", "Giải thích": "Mỗi dòng là MỘT người nhận MỘT " + (type === "ppe" ? "vật tư (và một cỡ)" : "mặt hàng") + ". Các dòng cùng Mã phiếu được gom vào một phiếu nháp. Dòng nền vàng là ví dụ (cột 'Dòng ví dụ' ghi VÍ DỤ): app tự bỏ qua khi nhập." },
      { "Cột": "Đầu phiếu", "Giải thích": "Ngày cấp, địa điểm" + (type === "ppe" ? ", lý do" : "") + " phải giống nhau ở mọi dòng của cùng một Mã phiếu." },
      { "Cột": "Mã (số 0 đầu)", "Giải thích": "Mã phiếu, Mã NV, " + (type === "ppe" ? "Mã vật tư, Kích cỡ" : "Mã mặt hàng") + " đã định dạng Text: nhập 0005 hay 00123 sẽ giữ nguyên." },
      { "Cột": "Nhập vào app", "Giải thích": "Nghiệp vụ nhân sự → Cấp phát → Phiếu cấp phát → ⬆ Nhập Excel → xem trước theo phiếu → sửa lỗi theo số dòng Excel → Lưu nháp. Nhập lại cùng file không cộng số lượng lần hai." }];
    if (type === "ppe") guide.push({ "Cột": "Kích cỡ", "Giải thích": "Chỉ ghi khi vật tư có danh sách kích cỡ trong Danh mục → Cấp phát → Đồ bảo hộ lao động; sai cỡ sẽ báo đúng số dòng." });
    saveXlsx("Mau_CapPhat_" + (type === "ppe" ? "BaoHo" : "Sua") + ".xlsx", [{ name: CP_SHEET[type], cols: cols, rows: CP_SAMPLES[type] }, { name: "Hướng dẫn", cols: ["Cột", "Giải thích"], rows: guide }], "template");
  }

  // ---------- Nhập Excel: Chọn file → Xem trước theo phiếu → Xử lý lỗi → Lưu nháp ----------
  function cpImportFlow(type) {
    if (!type) {
      modal("Nhập Excel cấp phát", h("p", { text: "Chọn loại phiếu trong file Excel:" }), function (close) {
        return [btn("Hủy", "", close), btn("Sữa phúc lợi", "pri", function () { close(); cpImportFlow("milk"); }), btn("Bảo hộ lao động", "pri", function () { close(); cpImportFlow("ppe"); })];
      }); return;
    }
    readWorkbook(function (wb, fileName) {
      var cols = C.benefits.TEMPLATE_COLUMNS[type], optional = { "Ghi chú": 1, "Lý do": 1, "Kích cỡ": 1 };
      var name = wb.SheetNames.filter(function (n) { return n === CP_SHEET[type]; })[0] || wb.SheetNames.filter(function (n) { return n !== "Hướng dẫn"; })[0];
      if (!name) { alert("File không có sheet dữ liệu."); return; }
      var ws = wb.Sheets[name], aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }), first = XLSX.utils.decode_range(ws["!ref"] || "A1").s.r, hi = -1;
      for (var i = 0; i < Math.min(aoa.length, 30) && hi < 0; i++) if ((aoa[i] || []).indexOf("Mã phiếu") >= 0) hi = i;
      if (hi < 0) { alert("Không thấy dòng tiêu đề có cột 'Mã phiếu' trong sheet '" + name + "'. Hãy dùng file mẫu của app."); return; }
      var head = aoa[hi].map(function (c) { return String(c == null ? "" : c).trim(); }), missing = cols.filter(function (c) { return !optional[c] && head.indexOf(c) < 0; });
      if (missing.length) { alert("File thiếu cột bắt buộc: " + missing.join(", ") + ". Hãy dùng đúng mẫu " + (type === "ppe" ? "bảo hộ lao động" : "sữa phúc lợi") + "."); return; }
      var skipped = 0, rows = [], markAt = head.indexOf("Dòng ví dụ");
      aoa.slice(hi + 1).forEach(function (cells, k) {
        if (!(cells || []).some(function (c) { return String(c == null ? "" : c).trim() !== ""; })) return;
        if (markAt >= 0 && fold(cells[markAt]) === "vi du") { skipped++; return; }
        var values = {}; head.forEach(function (c, ci) { if (c) values[c] = cells[ci]; });
        rows.push({ row: first + hi + k + 2, values: values });
      });
      if (!rows.length) { alert(skipped ? "File chỉ có " + skipped + " dòng ví dụ. Nhập dữ liệu thật ở dòng mới bên dưới." : "File chưa có dòng cấp phát."); return; }
      cpImportPreview(type, rows, fileName, skipped);
    });
  }
  function cpImportPreview(type, rows, fileName, skipped) {
    var me = session.tenDangNhap.toLowerCase(), plan = C.benefits.planImport(db, type, rows, me, cpDeptOf());
    var ACTION = { new: "Phiếu nháp mới", same: "Đã có, không đổi", replace: "Cập nhật phiếu nháp", error: "Có lỗi" };
    var counts = { new: 0, same: 0, replace: 0, error: 0 }; plan.vouchers.forEach(function (v) { counts[v.action]++; });
    var errors = plan.errors.slice(); plan.vouchers.forEach(function (v) { v.issues.forEach(function (m) { errors.push(m); }); });
    var body = h("div", { "data-cp-import": "1" });
    body.appendChild(h("div", { class: errors.length ? "warn" : "hint", text: "File " + fileName + " — " + rows.length + " dòng dữ liệu, " + plan.vouchers.length + " phiếu: " + counts.new + " mới, " + counts.replace + " cập nhật nháp, " + counts.same + " đã có (không đổi), " + counts.error + " lỗi." + (skipped ? " Đã bỏ qua " + skipped + " dòng ví dụ của file mẫu." : "") }));
    body.appendChild(simpleTable(plan.vouchers.map(function (v) {
      return { "Mã phiếu": v.id, "Xử lý": ACTION[v.action], "Số dòng": v.rows.length, "Dòng Excel": v.rows.length > 6 ? v.rows[0] + "–" + v.rows[v.rows.length - 1] : v.rows.join(", "), "Ngày cấp": v.doc ? fmtDate(v.doc.date) : "", "Số người nhận": v.doc ? new Set(v.doc.lines.map(function (l) { return l.employee; })).size : "" };
    })));
    if (errors.length) { body.appendChild(h("div", { class: "fh", text: "Lỗi cần sửa trong file (" + errors.length + ")" })); body.appendChild(h("ul", { "data-cp-errors": "1" }, errors.slice(0, 80).map(function (m) { return h("li", { text: m }); }))); if (errors.length > 80) body.appendChild(h("div", { class: "hint", text: "… và " + (errors.length - 80) + " lỗi nữa (tải chi tiết lỗi)." })); }
    var writable = plan.vouchers.filter(function (v) { return v.action === "new" || v.action === "replace"; });
    modal("Xem trước nhập Excel cấp phát", body, function (close) {
      return [
        errors.length ? btn("⬇ Tải chi tiết lỗi", "", function () { saveXlsx("LoiNhapCapPhat.xlsx", [{ name: "Loi", cols: ["Lỗi"], rows: errors.map(function (m) { return { "Lỗi": m }; }) }]); }) : null,
        btn("Đóng", "", close),
        btn(errors.length ? "Sửa lỗi trong file rồi chọn lại" : writable.length ? "✔ Lưu nháp " + writable.length + " phiếu" : "Không có phiếu nào để lưu", "pri", function () {
          if (errors.length) { close(); return; }
          if (!writable.length) { close(); return; }
          var byId = {}; writable.forEach(function (v) { byId[v.id] = v.doc; });
          var out = (db.benefitIssues || []).map(function (row) { return byId[row.id] || row; }).concat(writable.filter(function (v) { return v.action === "new"; }).map(function (v) { return v.doc; }));
          benefitSave("benefitIssues", out, "Nhập Excel cấp phát (nháp)", writable.map(function (v) { return v.id; }).join(", "), function () { close(); toast("Đã lưu nháp " + writable.length + " phiếu"); render(); });
        })];
    }, { wide: true });
  }

  // ---------- Báo cáo cấp phát: Tổng hợp / Chi tiết, dùng chung bộ lọc với danh sách phiếu ----------
  function cpReport() {
    var s = cpState();
    return C.benefits.report(db, { type: s.type, mode: s.mode, bySize: s.bySize, filters: cpFilters(), deptOf: cpDeptOf() });
  }
  function cpReportCtx(rep) {
    var s = cpState(), cfg = cpConfig(function () {}, function () { return { kept: 0, total: 0 }; });
    return { filters: cpFilters(), type: s.type, bySize: s.bySize, labels: C.benefits.LABEL, fmtDate: fmtDate, scopeText: SFC.scopeText(cfg, SFC.normalize(s.f, cfg), "tất cả phiếu"), rep: rep };
  }
  function cpExportXlsx(rep) {
    if (!need("export", "xuất dữ liệu ra Excel")) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx || !window.HAKUi.dispenseReport) { alert("Thiếu thư viện định dạng Excel."); return; }
    var DR = window.HAKUi.dispenseReport, meta = DR.meta(rep, cpReportCtx(rep)), vm = DR.excelVm(rep, meta, { congTy: congTy()["Tên công ty"] || "", user: currentUser() });
    window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: DR.SIGN, nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
      download(meta.file + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); audit("Xuất Excel báo cáo cấp phát", meta.title + " · " + meta.scope);
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  function cpExportPdf(rep) {
    var DR = window.HAKUi.dispenseReport, meta = DR.meta(rep, cpReportCtx(rep));
    exportSheetsPdf(DR.pdfVm(rep, meta, { congTy: congTy()["Tên công ty"] || "" }), meta.file + ".pdf", { chuKy: DR.SIGN });
  }
  function cpReportView() {
    var s = cpState(), box = h("div", { "data-cp-report": s.mode }), bar = h("div", { class: "bar" }), tw = h("div", { class: "tw" }), kept = { kept: 0, total: 0 }, rep = null;
    [["summary", "Tổng hợp"], ["detail", "Chi tiết"]].forEach(function (m) { bar.appendChild(btn(m[1], s.mode === m[0] ? "pri" : "", function () { s.mode = m[0]; st.pg.capphat = 0; render(); })); });
    if (s.mode === "summary" && s.type !== "milk") {
      var cb = h("input", { type: "checkbox", "aria-label": "Tách theo kích cỡ", "data-cp-bysize": "1" }); cb.checked = !!s.bySize;
      cb.addEventListener("change", function () { s.bySize = cb.checked; st.pg.capphat = 0; draw(); });
      bar.appendChild(h("label", { class: "chk" }, [cb, " Tách theo kích cỡ (bảo hộ)"]));
    }
    bar.appendChild(h("span", { class: "sp" }));
    if (can("export")) { bar.appendChild(btn("⬇ Excel", "", function () { cpExportXlsx(cpReport()); })); bar.appendChild(btn("⬇ PDF", "", function () { cpExportPdf(cpReport()); })); }
    box.appendChild(bar);
    var sf = sfUi.mount(cpConfig(draw, function () { return kept; })); box.appendChild(sf.el); box.appendChild(tw);
    function draw() {
      tw.innerHTML = ""; rep = cpReport(); sf.refresh();
      var body = rep.rows.filter(function (r) { return !r._total; }), totals = rep.rows.filter(function (r) { return r._total; });
      kept.kept = body.length; kept.total = body.length; sf.refresh();
      if (!rep.rows.length) { tw.appendChild(h("div", { class: "empty", text: "Không có dữ liệu cấp phát khớp bộ lọc." })); return; }
      var pg = pager("capphat", body.length, draw); if (pg.el) tw.appendChild(pg.el);
      var t = h("table", { "data-cp-table": rep.mode }), tr = h("tr"); rep.columns.forEach(function (c) { tr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      body.slice(pg.start, pg.end).forEach(function (r) {
        var x = h("tr");
        rep.columns.forEach(function (c) {
          var v = r[c];
          if (c === "Mã phiếu" && r._voucher) x.appendChild(h("td", {}, [btn(v, "ghost", function () { cpOpen(r._voucher, { tab: "capphat", label: "báo cáo" }); }, "Mở phiếu gốc")]));
          else x.appendChild(h("td", { class: typeof v === "number" ? "r" : "t", text: v == null ? "" : v }));
        });
        tb.appendChild(x);
      });
      totals.forEach(function (r) { var x = h("tr", { class: "tot" }); rep.columns.forEach(function (c) { x.appendChild(h("td", { class: typeof r[c] === "number" ? "r" : "t", text: r[c] == null ? "" : r[c] })); }); tb.appendChild(x); });
      t.appendChild(tb); tw.appendChild(h("div", { class: "tw" }, [t]));
      tw.appendChild(h("div", { class: "hint", text: "Phiếu nháp không tính vào thực cấp. Thực cấp = đã cấp − thu hồi. Tổ/phòng ban và tên mặt hàng lấy theo thông tin đã lưu tại ngày cấp." }));
    }
    draw();
    return box;
  }
  // @screen tabCapPhat
