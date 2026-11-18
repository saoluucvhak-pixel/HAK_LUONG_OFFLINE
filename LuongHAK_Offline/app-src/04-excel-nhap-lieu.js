  // ---------- Excel thật (.xlsx) ----------
  var SAMPLES = {
    nhanvien: [{ "Mã NV": "NV001", "Họ và tên": "Nguyễn Văn An", "Số CCCD": "049090001234", "Ngày tạo hồ sơ": "2024-03-01", "Trạng thái": "Đang làm việc" }],
    canhan: [{ "Mã NV": "NV001", "Số CCCD": "049090001234", "Ngày cấp": "2021-05-10", "Nơi cấp": "Cục CS QLHC về TTXH", "Ngày sinh": "1990-06-15", "Giới tính": "Nam", "Quốc tịch": "Việt Nam", "Dân tộc": "Kinh", "Thường trú": "Quế Sơn, Quảng Nam", "Địa chỉ hiện tại": "Liên Chiểu, Đà Nẵng", "Số điện thoại": "0905123456", "Hiệu lực từ": "2024-03-01" }],
    nhanthan: [{ "Mã NV": "NV001", "Họ tên nhân thân": "Nguyễn Thị Bình", "Quan hệ": "Con", "Ngày sinh": "2018-02-01", "Đăng ký phụ thuộc": "Có", "Hiệu lực từ": "2024-03-01" }],
    thanhtoan: [{ "Mã NV": "NV001", "Số tài khoản": "0123456789", "Tên ngân hàng": "Vietcombank", "Chi nhánh": "Đà Nẵng", "Hiệu lực từ": "2024-03-01" }],
    hopdong: [{ "Mã NV": "NV001", "Số HĐLĐ": "NV001/HĐ01", "Hình thức HĐLĐ": "Xác định thời hạn", "Ngày vào làm": "2024-03-01", "Ngày hết hạn": "2027-02-28" }],
    chitiethd: [{ "Mã NV": "NV001", "Số HĐLĐ": "NV001/HĐ01", "Mã công tác": "NV001/HĐ01-PL01", "Loại phụ lục": "Hợp đồng gốc", "Hiệu lực từ": "2024-03-01", "Phòng ban": "02.01", "Chức vụ": "8", "Mã hình thức lương": "LTG", "Mã lương": "TG1", "Lương cơ bản": 5000000, "Lương thỏa thuận": 9000000, "HTTT": "Chuyển khoản", "Mức đóng bảo hiểm": "BH01", "Thuế TNCN": "LT01", "Phụ cấp": "TN.02", "Hỗ trợ": "HT.01", "Tăng ca": "TC4" }],
    chamcong: [{ "Kỳ": "2026-09", "Mã NV": "NV001", "Hình thức công": "BT", "01": 1, "02": 1, "03": 1, "04": 1, "05": 1, "06": "", "07": 1, "08": 1, "09": "1QC" }, { "Kỳ": "2026-09", "Mã NV": "NV001", "Hình thức công": "TC", "01": 2, "02": 2 }],
    sanluong: [{ "Phiếu cân": 4979, "Ngày cân": "2026-09-01", "Biển số": "43A-97033", "KL hàng (Tấn)": 3.13, "Mã NV": "", "Mã phòng ban": "02.02", "NV vắng": "Kiểu, Long, Lynh, Định", "Cân lần 1": 7540, "Cân lần 2": 4410 },
      { "Phiếu cân": 4980, "Ngày cân": "2026-09-01", "Biển số": "92K-9181", "KL hàng (Tấn)": 9.11, "Mã NV": "", "Mã phòng ban": "02.02", "NV vắng": "", "Cân lần 1": 13770, "Cân lần 2": 4660 },
      { "Phiếu cân": "PC0001", "Ngày cân": "2026-09-15", "Biển số": "43C-12345", "KL hàng (Tấn)": 28.5, "Mã NV": "NV001", "Mã phòng ban": "", "NV vắng": "" }],
    bandam: [{ "Phiếu cân": 201, "Ngày cân": "2026-09-01", "Biển số": "43A-97033", "KL hàng (Tấn)": 1, "Mã NV": "", "Mã phòng ban": "02.02", "NV vắng": "Kiểu, Long, Lynh, Định" },
      { "Phiếu cân": 202, "Ngày cân": "2026-09-01", "Biển số": "92K-9181", "KL hàng (Tấn)": 1, "Mã NV": "", "Mã phòng ban": "02.01", "NV vắng": "" }],
    psluong: [{ "Ngày hạch toán": "2026-09-30", "Số chứng từ": "QĐ-KT/09-01", "Mã NV": "NV001", "Diễn giải": "Thưởng chuyên cần", "Thưởng": 500000, "Thu nhập khác": 0, "Trừ khác": 0 }],
    ungluong: [{ "Ngày hạch toán": "2026-09-15", "Số chứng từ": "PC-0915-01", "Mã NV": "NV001", "Diễn giải": "Tạm ứng kỳ 1", "Tạm ứng": 2000000 }],
    tiencom: [{ "Ngày": "2026-09-15", "Mã NV": "NV001", "Số suất cơm": 1, "Ghi chú": "" }],
    dm_luong: null, dm_phucap: null, dm_tangca: null, dm_hotro: null, dm_baohiem: null, dm_tncn: null, dm_bacthue: null, dm_giamtru: null, dm_phongban: null, dm_chucvu: null, dm_cc: null
  };
  (function () { var sd = HRM.seedDanhMuc(); Object.keys(sd).forEach(function (k) { if (SAMPLES[k] === null) SAMPLES[k] = sd[k]; }); })();
  function excelCell(col, v) { // số thì lưu số, còn lại lưu chữ
    if (v === "" || v == null) return "";
    if (typeof v === "number") return v;
    if (NUMCOLS.test(col) && !DATECOLS.test(col) && /^[\d.,%\s-]+$/.test(String(v)) && String(v).indexOf("%") < 0) return MONEYCOLS.test(col) ? E.money(v) : E.num(v);
    if (/^\d\d$/.test(col) && /^\d+([.,]\d+)?$/.test(String(v))) return E.num(v);
    return v;
  }
  /** V9: bảng lương CÓ FORMULA_ERROR (kỳ chưa chốt) không được xuất như bản chính thức — chặn xuất, yêu cầu sửa công thức trước. */
  function formulaErrorsBlock(what, reportKy) {
    try {
      if (!GATE.requiresPayrollExportCheck(what)) return false;
      if (!db.nhanvien || !db.nhanvien.length) return false;
      var parts = reportKy ? reportKy.split("-").map(Number) : [st.nam, st.thang];
      var src = kqKy(parts[0], parts[1]); if (src.chot) return false;
      var bl = GATE.blockers(src.kq); if (!bl.length) return false;
      alert("⛔ Không xuất được: bảng lương kỳ " + st.thang + "/" + st.nam + " đang có lỗi chặn nên số liệu CHƯA đáng tin cậy:\n\n" +
        bl.map(function (b) { return "• " + b.code + " — " + b.ten + " (" + b.count + "): " + b.items.slice(0, 2).join(" | "); }).join("\n") + "\n\nSửa cấu hình/dữ liệu rồi tính lại. Kỳ đã chốt xuất theo bản chốt.");
      return true;
    } catch (e) { return false; }
  }
  function saveXlsx(filename, sheets, kind) { // sheets: [{name, cols, rows}] · kind "template" = file mẫu trống (không chứa dữ liệu)
    if (kind !== "template" && !need("export", "xuất dữ liệu ra Excel")) return;
    if (kind !== "template" && formulaErrorsBlock(filename)) return;
    if (kind === "pro" && sheets.length === 1 && proXlsx(filename, sheets[0])) return;
    if (kind === "template" && styledTemplate(filename, sheets)) return;
    if (!window.XLSX) { alert("Thiếu thư viện Excel"); return; }
    var wb = XLSX.utils.book_new();
    sheets.forEach(function (sh) {
      var aoa = [sh.cols].concat(sh.rows.map(function (r) { return sh.cols.map(function (c) { return excelCell(c, r[c]); }); }));
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = sh.cols.map(function (c) { return { wch: Math.max(/^\d\d$/.test(c) ? 4 : 10, Math.min(30, c.length + 3)) }; });
      XLSX.utils.book_append_sheet(wb, ws, sheetName(sh.name));
    });
    XLSX.writeFile(wb, filename);
  }
  /** File mẫu nhập liệu có định dạng (tiêu đề tô màu, cố định dòng đầu, dòng ví dụ nền vàng). Cùng tên sheet/cột/giá trị như bản thô. Trả true nếu đã xử lý. */
  function styledTemplate(filename, sheets) {
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.templateXlsx) return false;
    var prepared = sheets.map(function (sh) { return { name: sheetName(sh.name), cols: sh.cols, sampleMark: true, rows: sh.rows.map(function (r) { var o = {}; sh.cols.forEach(function (c) { o[c] = excelCell(c, r[c]); }); return o; }) }; });
    window.HAKUi.templateXlsx.build(window.ExcelJS, prepared, { creator: currentUser() }).xlsx.writeBuffer().then(function (buf) {
      download(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
    }, function (e) { alert("Không tạo được file mẫu: " + e.message); });
    return true;
  }
  /** V10: xuất 1 bảng bằng mẫu Excel chuyên nghiệp (tiêu đề công ty, tên báo cáo, ngày lập, dòng tổng, chữ ký, A4, lặp tiêu đề). Trả true nếu đã xử lý. */
  function proXlsx(filename, sh) {
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx || !sh.rows || !sh.rows.length) return false;
    var isoVn = function (v) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(String(v == null ? "" : v)); return m ? m[3] + "/" + m[2] + "/" + m[1] : v; };
    var cols = sh.cols.map(function (c, i) {
      var vals = sh.rows.map(function (r) { return r[c]; }).filter(function (v) { return v !== "" && v != null; });
      var allNum = vals.length > 0 && vals.every(function (v) { return typeof v === "number" || (/^-?\d+(\.\d+)?$/.test(String(v)) && String(v).replace(/^-/, "").charAt(0) !== "0") || String(v) === "0"; });
      var kind = MONEYCOLS.test(c) && allNum ? "money" : allNum && !/^(Mã|Số|CCCD|STK|MST)/.test(c) ? "num" : "text";
      return { key: "c" + i, label: c, kind: kind };
    });
    var rows = sh.rows.map(function (r) { var o = {}; sh.cols.forEach(function (c, i) { o["c" + i] = cols[i].kind === "text" ? isoVn(r[c]) : (r[c] === "" || r[c] == null ? "" : +r[c]); }); return o; });
    var tong = {}; cols.forEach(function (c) { if (c.kind === "money") tong[c.key] = rows.reduce(function (a, r) { return a + (+r[c.key] || 0); }, 0); });
    var d = new Date(), pad = function (n) { return ("0" + n).slice(-2); };
    var vm = { title: String(sh.name || filename).toLocaleUpperCase("vi-VN"), congTy: congTy()["Tên công ty"] || "", kyText: "Kỳ làm việc: " + kyLabel(kyStr()), phamVi: "Theo bộ lọc đang chọn", ngayLap: pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(), cols: cols, rows: rows, tong: tong, nguoiLap: currentUser() };
    window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"], nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
      download(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
    }, function (e) { alert("Không tạo được file: " + e.message); });
    return true;
  }
  function templateSheet(key) { var d = ALL[key]; return { name: d.ten, cols: d.cols, rows: SAMPLES[key] || [] }; }
  function downloadTemplate(key) {
    var d = ALL[key];
    var guide = [{ "Cột": "Cách dùng", "Giải thích": "Nhập dữ liệu thật ở dòng mới bên dưới. KHÔNG đổi tên cột (dòng 1). Có thể bỏ bớt cột không dùng. Dòng nền vàng là ví dụ (cột 'Dòng ví dụ' ghi VÍ DỤ): app tự bỏ qua khi nhập." },
      { "Cột": "Số 0 đầu", "Giải thích": "Các cột Mã (Mã NV, Mã phòng ban…), Số tài khoản, Số CCCD, Số HĐLĐ đã định dạng Text: nhập 0005 hay 00123 sẽ giữ nguyên số 0 đầu. Đừng đổi định dạng các cột này sang Number." }];
    if (d.hint) guide.push({ "Cột": "Lưu ý", "Giải thích": d.hint });
    guide.push({ "Cột": "Ngày tháng", "Giải thích": "Nhập kiểu ngày Excel bình thường hoặc 2026-09-15." });
    guide.push({ "Cột": "Nhập vào app", "Giải thích": "Mở app → mục \"" + d.ten + "\" → nút ⬆ Nhập Excel → chọn file này." });
    saveXlsx("Mau_" + slug(d.ten) + ".xlsx", [templateSheet(key), { name: "Hướng dẫn", cols: ["Cột", "Giải thích"], rows: guide }], "template");
  }
  function downloadAllTemplates() { saveXlsx("Mau_TatCa_LuongHAK.xlsx", Object.keys(ALL).map(templateSheet), "template"); toast("Đã tải file mẫu — mỗi bảng là 1 sheet"); }

  // ---------- Trung tâm nhập Excel: đọc → chuẩn hóa → kiểm tra → xem trước → xác nhận → ghi ----------
  function lockedMap() { var m = {}; db.kyluong.forEach(function (k) { m[k.ky] = true; }); return m; }
  function readWorkbook(cb) {
    var f = h("input", { type: "file", accept: ".xlsx,.xls,.csv,.txt" });
    f.addEventListener("change", function () {
      var file = f.files[0]; if (!file) return;
      // Giảm rủi ro thư viện đọc Excel (SheetJS 0.20.3; vẫn giới hạn dung lượng để tránh hết bộ nhớ)
      if (file.size > 20 * 1024 * 1024) { alert("File quá lớn (" + Math.round(file.size / 1048576) + " MB). Giới hạn 20 MB — hãy tách file."); return; }
      var fr = new FileReader();
      fr.onload = function () { try { cb(XLSX.read(fr.result, { type: "array", cellDates: true }), file.name); } catch (e) { alert("Không đọc được file: " + e.message); } };
      fr.readAsArrayBuffer(file);
    });
    f.click();
  }
  /** Dòng ví dụ của file mẫu mới có cột "Dòng ví dụ" = "VÍ DỤ": bỏ qua khi nhập để không ghi nhầm dữ liệu mẫu. */
  var SAMPLE_COL = "Dòng ví dụ";
  function isSampleMarked(row) { return fold(row[SAMPLE_COL]) === "vi du"; }
  function stripSampleAoa(aoa) {
    var hi = -1, ci = -1;
    for (var i = 0; i < Math.min(aoa.length, 30) && ci < 0; i++) { var at = (aoa[i] || []).indexOf(SAMPLE_COL); if (at >= 0) { hi = i; ci = at; } }
    if (ci < 0) return { aoa: aoa, skipped: 0 };
    var out = aoa.filter(function (r, i) { return i <= hi || fold((r || [])[ci]) !== "vi du"; });
    return { aoa: out, skipped: aoa.length - out.length };
  }
  /** File mẫu CŨ (không có cột đánh dấu): dòng trùng hệt dòng ví dụ của app vẫn được giữ (có thể là dữ liệu thật) nhưng được báo để người dùng xem lại. */
  function sampleLookalikes(key, rows) {
    var samples = SAMPLES[key] || []; if (!samples.length) return [];
    var cols = ALL[key].cols, same = function (a, b) { return cols.every(function (c) { return String(a[c] == null ? "" : a[c]).trim() === String(b[c] == null ? "" : b[c]).trim(); }); };
    return rows.filter(function (r) { return !isSampleMarked(r) && samples.some(function (sm) { return same(r, sm); }); });
  }
  // Thứ tự nhập: danh mục → nhân viên → hồ sơ con → dữ liệu phát sinh (để kiểm tra tham chiếu Mã NV đúng)
  function importOrder(keys) { var rank = function (k) { return /^dm_/.test(k) ? 0 : k === "nhanvien" ? 1 : HRT[k] ? 2 : 3; }; return keys.slice().sort(function (a, b) { return rank(a) - rank(b); }); }
  function planWorkbook(wb, onlyKey, mode, pumpMode) {
    var plans = [], extraEmp = {};
    var keys = onlyKey ? [onlyKey] : importOrder(Object.keys(ALL));
    keys.forEach(function (k) {
      var alt = { sanluong: ["Khoi luong", "Khối lượng"], bandam: ["Bom ban dam", "Bơm dăm", "Ban dăm xuất hàng"] }[k] || []; // tên sheet trong mẫu công cụ phân bổ
      var name = wb.SheetNames.filter(function (x) { return x === sheetName(ALL[k].ten); })[0] || wb.SheetNames.filter(function (x) { return alt.indexOf(x) >= 0; })[0];
      if (!name && onlyKey) name = wb.SheetNames[0];
      if (!name) return;
      // α19: Sản lượng / Bơm dăm đọc được cả file theo mẫu công cụ phân bổ (dòng tiêu đề phía trên, tên cột khác: "Ngày cân 1", "Số xe", "Mã phòng ban"…)
      var skipped = 0, aoa = null;
      if (k === "sanluong" || k === "bandam") { var st0 = stripSampleAoa(XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: "" })); aoa = st0.aoa; skipped = st0.skipped; }
      var raw = aoa ? IMP.rowsFromAoa(aoa, k, ALL[k].cols).rows : XLSX.utils.sheet_to_json(wb.Sheets[name], { raw: true, defval: "" });
      if (!aoa) { var kept = raw.filter(function (r) { return !isSampleMarked(r); }); skipped = raw.length - kept.length; raw = kept; }
      if (k === "bandam" && pumpMode && raw.some(function (r) { return C.inputReview.mode(r) !== pumpMode; })) throw Error("File không đúng cách phân bổ đang mở. Theo tổ cần Mã phòng ban, để trống Mã NV; Trực tiếp cần Mã NV.");
      var p = IMP.plan(db, k, ALL[k].cols, C.inputBatch.blankRows(raw), { lockedPeriods: lockedMap(), defaultKy: kyStr(), extraEmployees: extraEmp, mode: mode });
      if (k === "bandam" && pumpMode && p.items.some(function (it) { return it.target && C.inputReview.mode(it.target) !== pumpMode; })) throw Error("File cập nhật khác cách phân bổ. Mở đúng tab để sửa phiếu.");
      p.sheet = name; p.sampleSkipped = skipped; p.sampleLike = sampleLookalikes(k, raw);
      if (k === "nhanvien") p.items.forEach(function (it) { if (it.action === "add" || it.action === "update") extraEmp[it.row["Mã NV"]] = 1; });
      plans.push(p);
    });
    return plans;
  }
  // replan(mode) → danh sách kế hoạch theo chế độ cập nhật ("merge" | "replace")
  var impBusy = false;
  function importPreview(replan, fileName, done, mode) {
    impBusy = false;
    mode = mode || "merge";
    var plans; try { plans = replan(mode); } catch (e) { alert(e.message); return; }
    // 1 người 1 Mã NV: dòng gán CCCD của người khác (đã có, hoặc dòng khác trong file) → Xung đột (không ghi) — core/identity.js
    plans.forEach(function (p) { ID.blockImportItems(db, p.table, p.items); });
    // Quyền theo từng bảng + chỉ Admin được ghi dữ liệu hồi tố (Q-14): dòng không đủ quyền → không ghi
    plans.forEach(function (p) {
      var perm = /^dm_/.test(p.table) ? "dm.edit" : (S[p.table] ? "input.edit" : "hr.edit"), okT = can(perm);
      p.items.forEach(function (it) {
        if (it.action !== "add" && it.action !== "update") return;
        if (!okT) { it.action = "locked"; it.reason = "Vai trò của bạn không có quyền ghi bảng này (" + PERM.PERMS[perm] + ")"; return; }
        if (p.table === "chamcong") {
          var leaveError = C.leaveReconciliation.attendanceMutation(db, it.target || null, Object.assign({}, it.target || {}, it.row));
          if (leaveError) { it.action = "locked"; it.reason = leaveError; return; }
        }
        if (it.action === "update" && p.table === "chitiethd" && GRD.frozenAppendix(db, it.target).length) { it.action = "locked"; it.reason = "Phụ lục đã dùng tính lương kỳ đã chốt " + GRD.frozenAppendix(db, it.target).map(GRD.label).join(", ") + " — không sửa được, hãy thêm phụ lục mới (Q-15)"; return; }
        if (!can("retro.edit")) {
          var imp0 = GRD.impactChange(db, p.table, it.target || null, Object.assign({}, it.target || {}, it.row));
          if (imp0.kind === "retro") { it.action = "locked"; it.reason = "HỒI TỐ kỳ đã chốt " + imp0.periods.map(GRD.label).join(", ") + " — chỉ Admin được ghi"; }
        }
      });
      Object.keys(p.summary).forEach(function (k) { p.summary[k] = 0; }); p.items.forEach(function (it) { p.summary[it.action] = (p.summary[it.action] || 0) + 1; });
    });
    if (!plans.length) { alert("Không thấy sheet nào đúng tên (Nhân viên, Chấm công, Mã lương...). Hãy dùng file mẫu của app."); return; }
    var body = h("div"), tot = {};
    Object.keys(IMP.LABEL).forEach(function (k) { tot[k] = 0; });
    plans.forEach(function (p) { Object.keys(tot).forEach(function (k) { tot[k] += p.summary[k] || 0; }); });
    body.appendChild(h("div", { class: "hint", html: "File <b>" + esc(fileName) + "</b> — kiểm tra trước khi ghi. Chỉ dòng <b>Thêm mới</b> và <b>Cập nhật</b> được ghi; dòng <b>Gộp</b> đã được cộng vào dòng cùng khóa; các dòng lỗi/trùng/xung đột/kỳ đã chốt bị bỏ qua." }));
    // Q-13 (chủ sở hữu xác nhận): khi file có dòng TRÙNG với dữ liệu đã có → người dùng chọn Bổ sung hay Ghi đè
    var nSame = 0; plans.forEach(function (p) { p.items.forEach(function (it) { if (it.target) nSame++; }); });
    var choice = h("div", { class: nSame ? "warn" : "hint", style: "margin:8px 0 12px" });
    choice.appendChild(h("div", { html: nSame ? "<b>File có " + nSame + " dòng trùng với dữ liệu đã có.</b> Chọn cách xử lý:" : "Cách xử lý nếu có dòng trùng với dữ liệu đã có:" }));
    [["merge", "Bổ sung", "chỉ thêm/sửa ô có dữ liệu trong file — ô để trống GIỮ NGUYÊN số đang có (mặc định, an toàn)"],
      ["replace", "Ghi đè", "thay cả dòng theo file — ô để trống trong file sẽ XÓA số đang có"]].forEach(function (o) {
      var r0 = h("input", { type: "radio", name: "impmode", value: o[0], "data-mode": o[0] }); r0.checked = mode === o[0];
      r0.addEventListener("change", function () { if (r0.checked) importPreview(replan, fileName, done, o[0]); });
      choice.appendChild(h("label", { style: "display:flex;gap:8px;align-items:flex-start;margin:6px 0;cursor:pointer" }, [r0, h("span", { html: "<b>" + o[1] + "</b> — " + o[2] })]));
    });
    body.appendChild(choice);
    var sumRows = plans.map(function (p) { var o = { "Bảng": ALL[p.table].ten, "Sheet": p.sheet }; Object.keys(IMP.LABEL).forEach(function (k) { o[IMP.LABEL[k]] = p.summary[k] || 0; }); return o; });
    body.appendChild(simpleTable(sumRows));
    var recon = importTotals(plans, E.num), reconRows = [];
    recon.forEach(function (t) {
      var money = (IMPORT_SUM_COLS[t.table] || []).map(function (c) { return c + ": file " + fmt(t.file.sums[c]) + " = ghi " + fmt(t.ghi.sums[c]) + " + không ghi " + fmt(t.khong.sums[c]); }).join(" · ");
      reconRows.push({ "Bảng": ALL[t.table].ten, "Dòng trong file": t.file.rows, "Sẽ ghi": t.ghi.rows, "Gộp vào dòng khác": t.gop.rows, "Không ghi": t.khong.rows, "Tổng (file = ghi + không ghi)": money || "—" });
    });
    body.appendChild(h("div", { class: "fh", text: "Đối chiếu với file nguồn" })); body.appendChild(h("div", { "data-imp-recon": "1" }, [simpleTable(reconRows)]));
    var skipTotal = 0, lookTotal = 0; plans.forEach(function (p) { skipTotal += p.sampleSkipped || 0; lookTotal += (p.sampleLike || []).length; });
    if (skipTotal) body.appendChild(h("div", { class: "hint", "data-imp-sample": "skipped", text: "Đã bỏ qua " + skipTotal + " dòng ví dụ của file mẫu (cột 'Dòng ví dụ' ghi VÍ DỤ) — không ghi vào dữ liệu." }));
    if (lookTotal) body.appendChild(h("div", { class: "warn", "data-imp-sample": "lookalike", text: "⚠ " + lookTotal + " dòng trùng hệt dòng ví dụ của file mẫu (" + plans.filter(function (p) { return (p.sampleLike || []).length; }).map(function (p) { return ALL[p.table].ten + ": " + p.sampleLike.slice(0, 3).map(function (r) { return r["Mã NV"] || r[ALL[p.table].cols[0]] || "?"; }).join(", "); }).join(" · ") + "). Vẫn được ghi nếu là dữ liệu thật — kiểm tra lại trước khi bấm Ghi, và xóa dòng ví dụ khỏi file." }));
    var clears = 0, retro = {};
    plans.forEach(function (p) { p.items.forEach(function (it) {
      if (it.action === "update" && it.diff) clears += it.diff.clear.length;
      if (it.action !== "add" && it.action !== "update") return;
      var imp = GRD.impactChange(db, p.table, it.target || null, Object.assign({}, it.target || {}, it.row));
      if (imp.kind === "retro") { it.reason = (it.reason ? it.reason + " · " : "") + "HỒI TỐ kỳ đã chốt " + imp.periods.map(GRD.label).join(", "); imp.periods.forEach(function (x) { retro[x] = 1; }); }
    }); });
    if (Object.keys(retro).length) body.appendChild(h("div", { class: "warn", text: "⚠ Có dòng có hiệu lực hồi tố trong kỳ đã chốt " + Object.keys(retro).sort().map(GRD.label).join(", ") + ". Bảng lương đã chốt KHÔNG thay đổi — muốn áp dụng phải mở chốt và chốt lại." }));
    if (clears) body.appendChild(h("div", { class: "warn", text: "⚠ Chế độ ghi đè sẽ XÓA " + clears + " ô đang có dữ liệu (ô trống trong file). Kiểm tra cột 'Lý do' bên dưới." }));
    var rows = [];
    var nWarn = 0;
    plans.forEach(function (p) { p.items.forEach(function (it) { if (it.warn && (it.action === "add" || it.action === "update")) nWarn++; if (it.action !== "add" || /HỒI TỐ/.test(it.reason) || it.warn) rows.push({ "Bảng": ALL[p.table].ten, "Dòng Excel": it.line, "Phân loại": IMP.LABEL[it.action], "Lý do": it.reason, "Cách sửa": importFixHint(it.action, it.reason), "Cảnh báo": it.warn || "", "Mã NV": it.row["Mã NV"] || "" }); }); });
    if (nWarn) body.appendChild(h("div", { class: "warn", text: "⚠ " + nWarn + " dòng sẽ ghi nhưng có ô bất thường (VD quá " + VAL.MAX_CONG_NGAY + " công/ngày, nhãn chưa có mã phụ cấp) — xem cột 'Cảnh báo'." }));
    var order = { conflict: 0, invalid: 1, refError: 2, locked: 3, update: 4, add: 4, merged: 5, duplicate: 6 }, byLabel = {};
    Object.keys(IMP.LABEL).forEach(function (k) { byLabel[IMP.LABEL[k]] = k; });
    rows.sort(function (a, b) { return order[byLabel[a["Phân loại"]]] - order[byLabel[b["Phân loại"]]]; });
    if (rows.length) { body.appendChild(h("div", { class: "fh", text: "Chi tiết các dòng cập nhật / không ghi (" + rows.length + ")" })); body.appendChild(simpleTable(rows.slice(0, 200))); if (rows.length > 200) body.appendChild(h("div", { class: "hint", text: "… và " + (rows.length - 200) + " dòng nữa — bấm 'Tải chi tiết' để xem đủ." })); }
    var nWrite = tot.add + tot.update, previewRev = dbRev;
    modal("Xem trước nhập Excel", body, function (close) {
      return [
        importErrorSheets(plans, function (t) { return ALL[t].cols; }, function (t) { return sheetName(ALL[t].ten); }).length ? btn("⬇ Tải file lỗi để sửa & nhập lại", "", function () { saveXlsx("LoiNhapExcel_CanSua.xlsx", importErrorSheets(plans, function (t) { return ALL[t].cols; }, function (t) { return sheetName(ALL[t].ten); })); }) : null,
        rows.length ? btn("⬇ Tải chi tiết", "", function () { saveXlsx("KiemTraNhapExcel.xlsx", [{ name: "ChiTiet", cols: Object.keys(rows[0]), rows: rows }]); }) : null,
        btn("Hủy", "", close),
        btn(nWrite ? "✔ Ghi " + nWrite + " dòng" : "Không có dòng nào để ghi", "pri", function () {
          if (!nWrite) { close(); return; }
          if (impBusy) return;
          if (previewRev !== dbRev) { alert("Dữ liệu đã đổi. Kiểm tra lại bản xem trước trước khi ghi."); importPreview(replan, fileName, done, mode); return; }
          impBusy = true; // V9: chống bấm 2 lần → không nhân đôi dòng
          // P1: thao tác này đã có "before" + hoàn tác riêng khi saveNow() thất bại (an toàn dù sao lưu
          // dưới đây có thất bại hay không) — nên chỉ CẢNH BÁO, không chặn, nếu không tạo được bản sao lưu.
          var bkOk = !!backupNow("truoc-nhap-excel");
          var result;
          try { result = REPO.importWorkbook(plans, fileName, mode, function (table) { return !!(ALL[table] && ALL[table].hr); }); }
          finally { impBusy = false; }
          if (!result.ok) {
            close(); (done || render)();
            alert("⚠ Chưa nhập Excel. Dữ liệu trước khi nhập vẫn được giữ: " + (result.msg || lastTxnError));
            return;
          }
          var n = result.value;
          close(); if (done) done(true, plans); else render();
          toast("Đã ghi " + n + " dòng" + (plans.some(function (p) { return ["chamcong", "sanluong", "bandam"].indexOf(p.table) >= 0; }) ? " Nháp — cần Lưu để tính lương" : "") + " (" + tot.add + " mới, " + tot.update + " cập nhật" + (tot.merged ? ", gộp " + tot.merged : "") + ")" + " · Đối chiếu: file " + recon.reduce(function (n, t) { return n + t.file.rows; }, 0) + " dòng = ghi " + recon.reduce(function (n, t) { return n + t.ghi.rows; }, 0) + " + gộp " + recon.reduce(function (n, t) { return n + t.gop.rows; }, 0) + " + không ghi " + recon.reduce(function (n, t) { return n + t.khong.rows; }, 0) + (bkOk ? "" : " · ⚠ KHÔNG tạo được bản sao lưu trước khi nhập — kiểm tra dung lượng đĩa"));
        })];
    });
  }
  // IMPORT-REPORT-BEGIN (009-B, issue #98): "sửa thế nào", file lỗi để sửa-rồi-nhập-lại, đối chiếu tổng với file nguồn. Hàm thuần (không phụ thuộc biến ngoài) — test lấy nguyên văn từ app.js.
  var IMPORT_SUM_COLS = { sanluong: ["KL hàng (Tấn)"], bandam: ["KL hàng (Tấn)"], psluong: ["Thưởng", "Thu nhập khác", "Trừ khác"], ungluong: ["Tạm ứng"], tiencom: ["Số suất cơm"] };
  var IMPORT_BAD = { invalid: 1, refError: 1, conflict: 1, locked: 1 };
  function importFixHint(action, reason) {
    var r = String(reason || ""), m;
    if (action === "invalid") {
      if ((m = r.match(/Thiếu ([^;]+)/))) return "Điền giá trị cho cột " + m[1].trim() + " rồi nhập lại file này";
      if (/phải là số/.test(r)) return "Nhập số (ví dụ 2 hoặc 1,5), không nhập chữ";
      if (/Số tiền không đọc được/.test(r)) return "Nhập số tiền như 500000 hoặc 500.000 (không chữ, không ký hiệu lạ)";
      if (/Ngày không hợp lệ/.test(r)) return "Nhập ngày dạng 15/09/2026 hoặc 2026-09-15 (ngày phải có thật trong tháng)";
      if (/Kỳ không hợp lệ/.test(r)) return "Nhập kỳ dạng 2026-09";
      if (/Ngày \d\d/.test(r)) return "Ô ngày chấm công: nhập số công như 1, 0.5, 1,5 hoặc 1QC (không số âm/chữ lạ)";
      return "Sửa ô nêu ở cột Lý do rồi nhập lại file này";
    }
    if (action === "refError") return "Thêm nhân viên này ở màn Nhân sự trước, hoặc sửa Mã NV cho đúng (giữ số 0 đầu, đúng chữ hoa/thường)";
    if (action === "conflict") return "Giữ một dòng; xóa hoặc sửa dòng còn lại để khác khóa (hoặc cho cùng số liệu)";
    if (action === "locked") return "Kỳ đã chốt lương: nếu cần sửa thì mở chốt (ghi lý do) trước, không thì bỏ dòng này";
    if (action === "duplicate") return "Không cần làm gì (dòng đã có)";
    return "";
  }
  /** Đối chiếu theo bảng: số dòng + tổng các cột số của FILE NGUỒN = ghi + không ghi (+ gộp). num: hàm đọc số (engine.num). */
  function importTotals(plans, num) {
    return plans.map(function (p) {
      var cols = IMPORT_SUM_COLS[p.table] || [], z = function () { var o = { rows: 0, sums: {} }; cols.forEach(function (c) { o.sums[c] = 0; }); return o; };
      var t = { table: p.table, file: z(), ghi: z(), khong: z(), gop: z() };
      (p.items || []).forEach(function (it) {
        var g = it.action === "add" || it.action === "update" ? t.ghi : it.action === "merged" ? t.gop : t.khong;
        [t.file, g].forEach(function (b) { b.rows++; cols.forEach(function (c) { b.sums[c] += num(it.row && it.row[c]); }); });
      });
      return t;
    });
  }
  /** Các sheet "lỗi để sửa": đúng cột của bảng (đọc lại được bằng chính chức năng Nhập Excel) + Dòng Excel / Lỗi / Cách sửa ở cuối (cột lạ bị bỏ qua khi nhập lại). */
  function importErrorSheets(plans, colsOf, nameOf) {
    var sheets = [];
    plans.forEach(function (p) {
      var bad = (p.items || []).filter(function (it) { return IMPORT_BAD[it.action]; });
      if (!bad.length) return;
      var cols = colsOf(p.table);
      sheets.push({ name: nameOf(p.table), cols: cols.concat(["Dòng Excel", "Lỗi", "Cách sửa"]), rows: bad.map(function (it) {
        var o = {}; cols.forEach(function (c) { o[c] = it.row && it.row[c] != null ? it.row[c] : ""; });
        o["Dòng Excel"] = it.line; o["Lỗi"] = it.reason || ""; o["Cách sửa"] = importFixHint(it.action, it.reason); return o;
      }) });
    });
    return sheets;
  }
  // IMPORT-REPORT-END
  function importFile(key, done, pumpMode) { if (!need("import", "nhập Excel")) return; readWorkbook(function (wb, name) { importPreview(function (m) { return planWorkbook(wb, key, m, pumpMode); }, name, done); }); }
  function importAllFile() { if (!need("import", "nhập Excel")) return; readWorkbook(function (wb, name) { importPreview(function (m) { return planWorkbook(wb, null, m); }, name, render); }); }

  function modal(title, body, footer, opts) {
    if (opts && opts.drawer && st.hdModal && !opts.onClose) opts = Object.assign({}, opts, { onClose: function () { hdReopen(); } });
    var m = $("#modal"); m.innerHTML = ""; m.className = (opts && opts.drawer ? "drawer" : "") + (opts && opts.stable ? " stable-modal" : "");
    var close = function () { m.className = "hide"; m.innerHTML = ""; if (opts && opts.onClose) opts.onClose(); };
    var d = h("div", { class: "dlg" + (opts && opts.wide ? " wide" : "") + (opts && opts.stable ? " stable-edit" : ""), role: "dialog", "aria-modal": "true", "aria-label": title }, [h("header", {}, [h("h3", { text: title }), btn("✕", "ghost", close)]), h("div", { class: "bd" }, [body]), footer ? h("footer", {}, footer(close)) : null]);
    // Form nhập liệu chỉ đóng bằng nút rõ ràng. Kéo chọn chữ rồi thả ngoài dlg
    // có thể tạo click với target là nền modal và làm mất toàn bộ bản nháp.
    m.appendChild(d); m.onclick = null;
    return close;
  }
  // Hộp nhập chữ của app (Electron KHÔNG hỗ trợ window.prompt — trả về null nên các nút dùng prompt sẽ không chạy)
  function askText(title, message, opts, cb) {
    opts = opts || {};
    var body = h("div"), inp = h(opts.multiline ? "textarea" : "input", { class: "i", style: "width:100%", placeholder: opts.placeholder || "" });
    if (opts.type) inp.type = opts.type;
    inp.value = opts.value || "";
    String(message || "").split("\n").forEach(function (ln) { body.appendChild(h("div", { class: ln.trim() ? "" : "hint", text: ln || " ", style: "margin:2px 0" })); });
    body.appendChild(h("div", { class: "fld", style: "margin-top:10px" }, [h("label", { text: (opts.label || "Nội dung") + (opts.required ? " *" : "") }), inp]));
    var closeFn = modal(title, body, function (close) {
      return [btn("Hủy", "", close), btn(opts.okText || "Đồng ý", "pri", function () {
        var v = inp.value.trim();
        if (opts.required && !v) { inp.focus(); toast("Vui lòng nhập " + (opts.label || "nội dung")); return; }
        if (opts.pattern && v && !opts.pattern.test(v)) { inp.focus(); toast(opts.patternMsg || "Giá trị không hợp lệ"); return; }
        close(); cb(v);
      })];
    });
    setTimeout(function () { inp.focus(); }, 30);
    return closeFn;
  }
  // Hộp nhập MẬT KHẨU (che ký tự, KHÔNG cắt khoảng trắng, không ghi vào dữ liệu/nhật ký). opts: confirm (nhập 2 lần), optional (cho phép bỏ trống), okText
  function askPassword(title, message, opts, cb) {
    opts = opts || {};
    var body = h("div"), p1 = h("input", { class: "i", type: "password", style: "width:100%", autocomplete: "off", "data-pw": "1" }), p2 = opts.confirm ? h("input", { class: "i", type: "password", style: "width:100%", autocomplete: "off", "data-pw2": "1" }) : null;
    String(message || "").split("\n").forEach(function (ln) { body.appendChild(h("div", { class: ln.trim() ? "" : "hint", text: ln || " ", style: "margin:2px 0" })); });
    body.appendChild(h("div", { class: "fld", style: "margin-top:10px" }, [h("label", { text: "Mật khẩu" + (opts.optional ? " (bỏ trống = không mã hóa)" : "") }), p1]));
    if (p2) body.appendChild(h("div", { class: "fld" }, [h("label", { text: "Nhập lại mật khẩu" }), p2]));
    var closeFn = modal(title, body, function (close) {
      return [btn("Hủy", "", close), btn(opts.okText || "Đồng ý", "pri", function () {
        var v = p1.value;
        if (!v && opts.optional) { close(); cb(""); return; }
        if (!v) { p1.focus(); toast("Vui lòng nhập mật khẩu"); return; }
        if (p2 && p2.value !== v) { p2.focus(); toast("Hai lần nhập mật khẩu không giống nhau"); return; }
        if (opts.check) { var bad = opts.check(v); if (bad) { p1.focus(); toast(bad); return; } }
        close(); cb(v);
      })];
    });
    setTimeout(function () { p1.focus(); }, 30);
    return closeFn;
  }
  function countOf(k) { return db[k] ? db[k].length : 0; }

