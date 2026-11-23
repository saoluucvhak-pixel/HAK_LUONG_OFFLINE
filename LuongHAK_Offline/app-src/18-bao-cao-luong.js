  // ---------- BÁO CÁO LƯƠNG ----------
  // Kết quả lương của 1 kỳ: kỳ đã chốt lấy bản đã lưu, chưa chốt thì tính tạm
  // v2.1.1: nhớ NHIỀU kỳ (trước: chỉ 1 kỳ nên báo cáo 12 tháng / so sánh tính lại engine mỗi lần). Gắn với dbRev + chữ ký kho: dữ liệu đổi là bỏ hết.
  var SC = window.HAKUI && window.HAKUI.snapshotCache;
  var kqCache = SC ? SC.create({ maxEntries: 13, maxWeight: 30000, weigh: function (v) { return (v && v.bangluong ? v.bangluong.length : 0) + 1; } }) : null;
  function storeSig() { try { return store && store.sig ? String(store.sig()) : ""; } catch (e) { return "?" + Date.now(); } } // lỗi đọc chữ ký → không bao giờ trùng → không dùng bản nhớ
  var kqMemo = null;
  function kqKy(nam, thang) {
    var c = kyChot(kyKey(nam, thang));
    if (c) return { kq: c.kq, chot: true };
    if (!db.nhanvien.length) return { kq: { bangluong: [], bhxh: [], tncn: [], canhbao: [] }, chot: false };
    // V9.4: đổi bộ lọc / tab báo cáo KHÔNG tính lại engine — chỉ tính lại khi dữ liệu, quy chế hoặc cách bù đổi
    var mk = [nam, thang, dbRev, st.bu, quyChe()].join("|");
    if (kqCache) return { kq: kqCache.get([nam, thang, st.bu, quyChe()].join("|"), dbRev + "|" + storeSig(), function () { return tinhLuong(nam, thang); }).value, chot: false };
    if (!kqMemo || kqMemo.key !== mk) kqMemo = { key: mk, val: tinhLuong(nam, thang) };
    return { kq: kqMemo.val, chot: false };
  }

  var BCL = [
    ["cong", "🗓 Tổng hợp công"], ["sanluong", "⚖ Phân bổ sản lượng"],
    ["baohiem", "🛡 Báo cáo bảo hiểm"], ["hachtoan", "📒 Bảng hạch toán"], ["sosanh", "↔ So sánh với kỳ trước"],
    ["thang", "📅 Lương 12 tháng"], ["nvnam", "👤 Thu nhập năm theo NV"], ["thuenam", "🧾 Thuế TNCN cả năm"]
  ];
  var BCL_NAM = { thang: 1, nvnam: 1, thuenam: 1 };

  function bcCong(nam, thang) {
    var snapshot = kyChot(kyKey(nam, thang));
    if (!snapshot) return C.periodReports.bcCong(db.chamcong, nam, thang, tenNV);
    var names = new Map(snapshot.kq.bangluong.map(function (r) { return [r["Mã NV"], r["Họ và tên"]]; }));
    return C.periodReports.bcCong(snapshot.input?.data?.chamcong || [], nam, thang, function (ma) { return names.get(ma) || ""; });
  }
  /**
   * (α19) Phân bổ sản lượng / bơm dăm của kỳ — như công cụ "Phân bổ khối lượng tính lương":
   * phiếu ghi Mã phòng ban → chia đều cho tổ (trừ NV vắng); phiếu ghi Mã NV → giao trực tiếp.
   */
  function pbAlloc(nam, thang, loai) {
    var PA = C.palloc, k = HRM.sanLuongKy(db, nam, thang, loai), cache = {};
    var pbOf = function (ma, d) { var key = ma + "\u0001" + d; if (!(key in cache)) { var hh = HRM.hienHanh(db, ma, d); cache[key] = hh.pb || ""; } return cache[key]; };
    var tenPB = function (pb) { return HRM.refName(db, "dm_phongban", pb) || ""; };
    var al = PA.withDirect(k.alloc, k.direct.map(function (r) { return { phieu: r["Phiếu cân"] || "", ngay: String(r["Ngày cân"] || "").slice(0, 10), kl: r["KL hàng (Tấn)"], ma: r["Mã NV"] }; }), pbOf, tenNV, tenPB);
    var sp = staffPay(nam, thang), cnt = {};
    sp.list.forEach(function (x) { if (x["Mã PB"]) cnt[x["Mã PB"]] = (cnt[x["Mã PB"]] || 0) + 1; });
    al.empCount = cnt; al.chuaGan = k.chuaGan; al.raw = (db[loai] || []).filter(function (r) { return VAL.rowPeriod(loai, r) === kyKey(nam, thang); });
    return al;
  }
  function inputReportSource(table, ky, kind) {
    if (kyChot(ky)) return "Đã chốt · dữ liệu lưu khi chốt";
    return C.inputReview.statusLabel(db, table, ky, kind);
  }
  function allocationReportSource(table, ky) {
    var source = inputReportSource(table, ky);
    if (!kyChot(ky) && C.inputReview.changed(db, "chamcong", ky, "")) {
      return "Phiếu: " + source + " | Chấm công dùng để chia: " + inputReportSource("chamcong", ky);
    }
    return source;
  }
  function reportAllocation(nam, thang, loai) {
    var snapshot = kyChot(kyKey(nam, thang));
    if (!snapshot) return pbAlloc(nam, thang, loai);
    return snapshot.input?.payrollReports?.production?.find(function (g) { return g.type === loai; })?.allocation || null;
  }

  /** Danh sách "Phiếu cần đối chiếu chấm công" dạng thẻ: mỗi phiếu một thẻ, mỗi người cần xác nhận một dòng có nút riêng; tích chọn nhiều phiếu → xác nhận một lần. */
  function attendanceReviewPanel(rows, allocation, ctx) {
    var wrap = h("div", { class: "ar-wrap", "data-attendance-review": "1" });
    if (!rows.length) { wrap.appendChild(h("div", { class: "empty", text: "Không có phiếu khớp bộ lọc." })); return wrap; }
    st.arSel = st.arSel || {};
    var canConfirm = !ctx.snapshot && can("input.edit"), items = rows.map(function (row) {
      var entry = allocation.attendanceReview.find(function (it) { return it.phieu === row["Phiếu cân"] && it.ngay === row["Ngày cân"] && it.maPB === row["Mã phòng ban"]; });
      return { row: row, entry: entry, key: [row["Phiếu cân"], row["Ngày cân"], row["Mã phòng ban"]].join("|") };
    });
    var people = items.reduce(function (n, it) { return n + (it.entry ? it.entry.employees.length : 0); }, 0);
    var head = h("div", { class: "ar-head" }), cntSel = h("span", { class: "ar-count" }), btnSel = btn("Xác nhận có làm cho phiếu đã chọn", "pri", function () {
      var chosen = items.filter(function (it) { return st.arSel[it.key]; }).map(function (it) { return it.row; });
      if (chosen.length) confirmProductionAttendance(chosen, allocation, st.bclLoai, { checkAll: true });
    }), allBox = h("input", { type: "checkbox", "aria-label": "Chọn tất cả phiếu đang hiện" });
    function sync() {
      var n = items.filter(function (it) { return st.arSel[it.key]; }).length;
      cntSel.textContent = n ? n + " phiếu đã chọn" : "Chưa chọn phiếu nào"; btnSel.disabled = !n; allBox.checked = n === items.length && n > 0; allBox.indeterminate = n > 0 && n < items.length;
      wrap.querySelectorAll(".ar-card").forEach(function (c) { c.classList.toggle("sel", !!st.arSel[c.getAttribute("data-key")]); });
    }
    head.appendChild(h("div", { class: "ar-chips" }, [h("span", { class: "ar-chip", text: items.length + " phiếu" }), h("span", { class: "ar-chip warn", text: people + " người cần xác nhận chấm công" })]));
    if (canConfirm) {
      allBox.addEventListener("change", function () { items.forEach(function (it) { if (allBox.checked) st.arSel[it.key] = 1; else delete st.arSel[it.key]; }); wrap.querySelectorAll(".ar-card input.ar-pick").forEach(function (b) { b.checked = allBox.checked; }); sync(); });
      head.appendChild(h("div", { class: "ar-bulk" }, [h("label", { class: "ar-all" }, [allBox, " Chọn tất cả phiếu đang hiện"]), cntSel, btnSel]));
    }
    wrap.appendChild(head);
    var list = h("div", { class: "ar-list" });
    items.forEach(function (it) {
      var r = it.row, e = it.entry, cardEl = h("div", { class: "ar-card", "data-key": it.key });
      var top = h("div", { class: "ar-top" });
      if (canConfirm && e) { var pick = h("input", { type: "checkbox", class: "ar-pick", "aria-label": "Chọn phiếu " + r["Phiếu cân"] }); pick.checked = !!st.arSel[it.key]; pick.addEventListener("change", function () { if (pick.checked) st.arSel[it.key] = 1; else delete st.arSel[it.key]; sync(); }); top.appendChild(pick); }
      top.appendChild(h("div", { class: "ar-title", html: "<b>" + esc(r["Phiếu cân"]) + "</b><span>" + esc(fmtDate(r["Ngày cân"])) + " · Tổ " + esc(r["Mã phòng ban"]) + (r["Biển số xe"] ? " · " + esc(r["Biển số xe"]) : "") + " · " + esc(String(r["KL / số xe"])) + (st.bclLoai === "bandam" ? " xe" : " tấn") + "</span>" }));
      top.appendChild(h("span", { class: "sp" }));
      if (tabAllowed(ctx.origin)) top.appendChild(btn("Mở phiếu cân", "ghost", function () {
        st.opsReceipt = { type: ctx.originType, number: String(r["Phiếu cân"]).trim(), date: r["Ngày cân"], ky: kyKey(ctx.nam, ctx.thang) };
        opsFReset(ctx.originType); st.tab = ctx.origin; saveUi(); render();
      }));
      cardEl.appendChild(top);
      var meta = h("div", { class: "ar-meta" });
      [["Được chia (" + (r["App chia (người)"] != null ? r["App chia (người)"] : "") + " người)", r["Người được chia"]], ["Không được chia", r["Người không được chia"]], ["NV vắng trên phiếu", r["NV vắng trên phiếu"]]].forEach(function (m) {
        if (m[1]) meta.appendChild(h("div", { class: "ar-m" }, [h("small", { text: m[0] }), h("span", { text: m[1] })]));
      });
      if (meta.firstChild) cardEl.appendChild(meta);
      var who = h("div", { class: "ar-who" });
      who.appendChild(h("div", { class: "ar-who-h", text: "Cần xác nhận chấm công (ô = 0 hoặc trống, chưa có trong NV vắng)" }));
      (e ? e.employees : []).forEach(function (emp) {
        var line = h("div", { class: "ar-emp" }, [h("div", { class: "ar-name", html: "<b>" + esc(emp.hoTen) + "</b><span>" + esc(emp.ma) + "</span>" }), h("span", { class: "sp" })]);
        if (!ctx.snapshot && tabAllowed("chamcong")) line.appendChild(btn("Mở công", "ghost", function () { st.rf = RF.normalize({ maNV: [emp.ma] }); st.attendanceReviewDay = r["Ngày cân"]; st.tab = "chamcong"; saveUi(); render(); }));
        if (canConfirm) line.appendChild(btn("Xác nhận có làm", "pri", function () { confirmProductionAttendance([r], allocation, st.bclLoai, { only: emp.ma, checkAll: true }); }));
        who.appendChild(line);
      });
      cardEl.appendChild(who); list.appendChild(cardEl);
    });
    wrap.appendChild(list); sync();
    return wrap;
  }
  /** v2.1.6: Excel danh sách PHẲNG người × phiếu cần xác nhận chấm công (rà soát / ký). visibleRows = các dòng đang hiện (null = tất cả, bỏ lọc). */
  function exportAttendanceReview(ctx, visibleRows) {
    if (!need("export", "xuất dữ liệu ra Excel")) return;
    var X = window.HAKUi && window.HAKUi.attendanceReviewExport, R = window.HAKUi && window.HAKUi.reportXlsx;
    if (!window.ExcelJS || !X || !R || !R.buildMany) { alert("Thiếu thư viện Excel báo cáo"); return; }
    var ky = kyKey(ctx.nam, ctx.thang), snap = ctx.snapshot, src = snap ? snap.input : null, dm = snap ? (src && src.danhmuc || {}) : db;
    var keys = visibleRows ? new Set(visibleRows.map(function (row) { return X.reviewKey(row["Phiếu cân"], row["Ngày cân"], row["Mã phòng ban"]); })) : null;
    var plates = {}; (ctx.allocation.raw || []).forEach(function (row) { plates[X.reviewKey(row["Phiếu cân"], VAL.normDate(row["Ngày cân"]), row["Mã phòng ban"])] = row["Biển số"] || ""; });
    var data = X.build({ allocation: ctx.allocation, loai: ctx.loai, ky: ky, visibleKeys: keys, plates: plates,
      confirmed: (snap ? src && src.data && src.data.productionAttendance : db.productionAttendance) || [],
      chamcong: snap ? (src && src.data && Array.isArray(src.data.chamcong) ? src.data.chamcong : null) : db.chamcong,
      deptName: function (ma) { return HRM.refName(dm, "dm_phongban", ma) || ma; } });
    if (!data.detail.length) { toast("Không có người nào cần xác nhận theo phạm vi đã chọn"); return; }
    var draft = !snap, d = new Date(), p2 = function (n) { return ("0" + n).slice(-2); };
    var vms = X.toViewModels(data, { loai: ctx.loai, ky: ky, congTy: congTy()["Tên công ty"] || "", kyText: "Kỳ làm việc: " + p2(ctx.thang) + "/" + ctx.nam,
      phamVi: keys ? (RF.describe(st.rf).concat(["Bộ lọc phiếu đang xem"]).join("; ")) : "Toàn bộ (bỏ lọc)", trangThai: draft ? "Chưa chốt — tính tạm" : "Đã chốt",
      ngayLap: p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear(), nguoiLap: currentUser() });
    R.buildMany(window.ExcelJS, vms, { chuKy: ["Người lập", "Trưởng bộ phận xác nhận", "Chủ sở hữu"], nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
      download(X.filename(ctx.loai, ky, draft), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      audit("Xuất Excel danh sách cần xác nhận chấm công", ky + " · " + data.counts.people + " dòng");
    }, function (e) { alert("Không xuất được Excel: " + (e.message || e)); });
  }
  function confirmProductionAttendance(visible, allocation, selectedTable, opts) {
    opts = opts || {};
    if (!need("input.edit") || kyChot(kyStr())) return;
    var service = C.productionAttendance, period = kyStr(), revision = dbRev, candidates = new Map();
    allocation.attendanceReview.forEach(function (receipt) {
      if (!visible.some(function (row) { return row["Phiếu cân"] === receipt.phieu && row["Ngày cân"] === receipt.ngay && row["Mã phòng ban"] === receipt.maPB; })) return;
      receipt.employees.forEach(function (employee) {
        if (opts.only && employee.ma !== opts.only) return; // xác nhận riêng 1 người (từng dòng)
        var row = { date: receipt.ngay, team: receipt.maPB, employee: employee.ma };
        candidates.set(service.key(row), { row: row, name: employee.hoTen });
      });
    });
    var body = h("div"), list = h("div"), checked = new Map();
    candidates.forEach(function (item, key) {
      var box = h("input", { type: "checkbox" }); if (opts.checkAll) box.checked = true; checked.set(key, box);
      list.appendChild(h("label", { class: "ar-pickrow" }, [box, h("span", { html: "<b>" + esc(item.name) + "</b> · " + esc(item.row.employee) + "<small>Ngày " + esc(item.row.date) + " · Tổ " + esc(item.row.team) + "</small>" })]));
    });
    var reason = h("textarea", { class: "i ar-reason", rows: "3", "aria-label": "Lý do xác nhận", placeholder: "Lý do (bắt buộc), ví dụ: Làm ca dài qua ngày" });
    body.appendChild(h("p", { class: "hint", text: "Xác nhận người dưới đây CÓ đi làm ngày đó dù ô chấm công = 0 hoặc trống, để app chia sản lượng cho họ. Bước sau là xem trước phân bổ, chưa lưu gì." }));
    body.appendChild(list); body.appendChild(h("label", { class: "fld" }, ["Lý do xác nhận", reason]));
    if (!candidates.size) { alert("Không có người nào cần xác nhận ở phiếu đã chọn."); return; }
    modal(opts.only ? "Xác nhận có làm — " + opts.only : "Xác nhận có làm để chia sản lượng (" + candidates.size + " người)", body, function (close) {
      return [btn("Hủy", "", close), btn("Xem trước phân bổ", "pri", function () {
        if (kyStr() !== period || dbRev !== revision || kyChot(period)) { alert("Dữ liệu kỳ đã thay đổi. Mở lại bảng đối chiếu."); return; }
        var rows = Array.from(candidates).filter(function (entry) { return checked.get(entry[0]).checked; }).map(function (entry) {
          return Object.assign({}, entry[1].row, { reason: reason.value.trim(), user: session.tenDangNhap.toLowerCase() });
        });
        if (!rows.length || !reason.value.trim()) { alert("Chọn nhân viên và ghi lý do."); return; }
        var next = Object.assign({}, db, { productionAttendance: (db.productionAttendance || []).concat(rows) });
        var issue = service.checkChanges(db, next, { user: session.tenDangNhap, perms: ["input.edit"] });
        if (issue) { alert(issue); return; }
        var all = ["sanluong", "bandam"], pairs = new Map();
        all.forEach(function (table) {
          pairs.set(table, [HRM.sanLuongKy(db, st.nam, st.thang, table).alloc.audit, HRM.sanLuongKy(next, st.nam, st.thang, table).alloc.audit]);
        });
        var affected = new Map();
        service.affected(db, rows).forEach(function (match) {
          var r = match.receipt, key = JSON.stringify([r.table, r.phieu, r.ngay, r.maPB]);
          if (affected.has(key)) return;
          var matches = function (item) { return item.phieu === r.phieu && item.ngay === r.ngay && item.maPB === r.maPB; };
          var pair = pairs.get(r.table), before = pair[0].find(matches), after = pair[1].find(matches);
          if (!before || !after) return;
          affected.set(key, { "Bảng": ALL[r.table].ten, "Phiếu": r.phieu, "Ngày": r.ngay, "Tổ": r.maPB,
            "Người chia trước": before.names.join(", "), "Người chia sau": after.names.join(", "),
            "Số người trước": before.soNguoi, "Số người sau": after.soNguoi, "Phần mỗi người trước": before.share, "Phần mỗi người sau": after.share });
        });
        close();
        modal("Xem trước tất cả phiếu bị ảnh hưởng — " + ALL[selectedTable].ten, simpleTable(Array.from(affected.values())), function (done) {
          return [btn("Hủy", "", done), btn("Lưu xác nhận", "pri", function () {
            if (kyStr() !== period || dbRev !== revision || kyChot(period)) { alert("Dữ liệu kỳ đã thay đổi. Mở lại bảng đối chiếu."); return; }
            var detail = rows.map(function (row) { return row.employee + " · " + row.date + " · " + row.team; }).join("; ") + " · " + reason.value.trim();
            if (!REPO.saveWorkflowRows("productionAttendance", next.productionAttendance, "Xác nhận có làm để chia sản lượng", detail).ok) { alert(lastTxnError); return; }
            done(); st.arSel = {}; render();
          })];
        }, { wide: true });
      })];
    }, { wide: true });
  }

  function bcSanLuong(nam, thang, loai, allocation) {
    return C.periodReports.bcSanLuong(allocation || reportAllocation(nam, thang, loai), loai);
  }
  /** File Excel "Phân bổ khối lượng tính lương" — bố cục như công cụ (ExcelJS). */
  function exportPBKL(nam, thang) {
    if (!need("export", "xuất dữ liệu ra Excel")) return;
    if (!window.ExcelJS || !window.HAKUi) { alert("Thiếu thư viện Excel (ExcelJS)"); return; }
    var sl = reportAllocation(nam, thang, "sanluong"), bd = reportAllocation(nam, thang, "bandam"), src = kqKy(nam, thang);
    if (!sl || !bd) { alert("Bản chốt cũ thiếu chi tiết phân bổ để xuất bộ toàn kỳ. Xem dữ liệu đã lưu ở Kỳ lương đã chốt."); return; }
    var snapshot = src.chot ? kyChot(kyKey(nam, thang)) : null;
    var saved = (snapshot && snapshot.input) || {};
    var catalog = snapshot ? (saved.danhmuc || {}) : db;
    var hours = snapshot ? ((saved.data || {}).chamcong || []) : db.chamcong;
    var rules = window.HAKUi.pbklRules.resolve(E, catalog, nam, thang, { need: (bd.audit && bd.audit.length) ? ["SP", "BD"] : ["SP"] }); // đơn giá/mức sàn/ngưỡng theo hiệu lực của kỳ (không chọn dòng đầu/cuối)
    var bc = {}; hours.filter(function (r) { return r["Kỳ"] === kyKey(nam, thang) && String(r["Hình thức công"] || "BT").toUpperCase() === "BT"; })
      .forEach(function (r) { for (var d = 1; d <= new Date(nam, thang, 0).getDate(); d++) bc[r["Mã NV"]] = (bc[r["Mã NV"]] || 0) + E.tachCong(r[("0" + d).slice(-2)]).soCong; });
    var rows = src.kq.bangluong.filter(function (b) { return n0(b["Lương sản lượng"]) || n0(b["Lương bơm dăm"]) || n0(b["Lương bù SL"]) || n0(b["Sản lượng (tấn)"]) || n0(b["Số xe bơm dăm"]); })
      .map(function (b) { var pb = b["Mã PB"] || ""; return { maPB: pb, tenPB: b["Phòng ban"] || pb, ma: b["Mã NV"], hoTen: b["Họ và tên"], soCong: b._ct && b._ct.congBT != null ? b._ct.congBT : (bc[b["Mã NV"]] ?? (snapshot && !Array.isArray((saved.data || {}).chamcong) ? null : 0)), tan: n0(b["Sản lượng (tấn)"]), xe: n0(b["Số xe bơm dăm"]), luongSL: n0(b["Lương sản lượng"]), luongBD: n0(b["Lương bơm dăm"]), bu: n0(b["Lương bù SL"]), tong: n0(b["Lương sản lượng"]) + n0(b["Lương bơm dăm"]) + n0(b["Lương bù SL"]) }; });
    var coChe = src.chot ? String(snapshot.buTheoNgay || false) : String(st.bu);
    // Master Prompt V3 mục XVII: chi tiết bù lương Đại Hiệp theo NGÀY bậc thang (chỉ khi đúng cơ chế này)
    var daihiepDetail = null;
    if (!snapshot && coChe === "daihiep") {
      var sp2 = staffPay(nam, thang), slK2 = HRM.sanLuongKy(db, nam, thang, "sanluong");
      var chiTiet = E.chiTietBuNgayDaiHiep(Object.assign({}, db, { nhansu: sp2.list, sanluong: slK2.rows }), nam, thang);
      if (chiTiet.length) daihiepDetail = chiTiet.map(function (x) { return Object.assign({ tenPB: HRM.refName(db, "dm_phongban", x.maPB) || x.maPB }, x); });
    }
    var company = snapshot ? (catalog.congty || [])[0] || {} : congTy();
    var meta = { donVi: company["Tên công ty"] || "", thang: "Tháng " + thang + "/" + nam, nguoiLap: session ? session.hoTen : "" };
    var attendanceReview = [["sanluong", sl, "Sản lượng"], ["bandam", bd, "Ban dăm xuất hàng"]].flatMap(function (item) {
      return bcSanLuong(nam, thang, item[0], item[1]).attendanceReview.map(function (r) {
        return Object.assign({ "Loại": item[2] }, r);
      });
    });
    var wb = window.HAKUi.pbkl.report(window.ExcelJS, { sl: sl, bd: bd, raw: { sl: sl.raw, bd: bd.raw },
      luong: rows.length ? { rows: rows, coChe: coChe, note: (src.chot ? "Số liệu lấy từ bảng lương ĐÃ CHỐT." : "Kỳ CHƯA chốt — số liệu tính tạm.") + " Số công = công BT trong chấm công." } : null,
      daihiepDetail: daihiepDetail, attendanceReview: attendanceReview,
      ctx: { coChe: coChe, chot: src.chot, source: allocationReportSource("sanluong", kyKey(nam, thang)) + " | Ban dăm xuất hàng: " + inputReportSource("bandam", kyKey(nam, thang)), giaKl: rules.giaKl, giaBd: rules.giaBd, mucSan: rules.mucSan, nguong: rules.nguong, rules: rules, soNgay: new Date(nam, thang, 0).getDate() } }, meta);
    wb.xlsx.writeBuffer().then(function (buf) {
      download("Phan_bo_khoi_luong_" + kyKey(nam, thang) + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      audit("Xuất Excel phân bổ khối lượng", kyLabel(kyKey(nam, thang)));
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  /** File mẫu phiếu cân / bơm dăm như công cụ (ExcelJS) */
  function downloadPBTemplate(key) {
    if (!window.ExcelJS || !window.HAKUi) { downloadTemplate(key); return; }
    var wb = window.HAKUi.pbkl.template(window.ExcelJS, key, { donVi: congTy()["Tên công ty"] || "", thang: "Tháng " + st.thang + "/" + st.nam, mau: "01/" + ("0" + st.thang).slice(-2) + "/" + st.nam });
    wb.xlsx.writeBuffer().then(function (buf) { download(key === "bandam" ? "mau_bang_bom_ban_dam.xlsx" : "mau_bang_khoi_luong.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); });
  }
  function bcHachToan(r, nam, thang) { return C.periodReports.bcHachToan(r, nam, thang, kyChot(kyKey(nam, thang)), db.dm_phongban, payLines()); }
  function bcSoSanh(nam, thang) { return C.periodReports.bcSoSanh(nam, thang, kqKy); }
  function chotTrongNam(nam) { return db.kyluong.filter(function (k) { return k.ky.slice(0, 4) === String(nam); }).sort(function (a, b) { return a.ky < b.ky ? -1 : 1; }); }
  function bc12Thang(nam) { return C.periodReports.bc12Thang(nam, kyChot); }
  function bcNVNam(nam, field) { return C.periodReports.bcNVNam(chotTrongNam(nam), field); }
  function bcThueNam(nam) { return C.periodReports.bcThueNam(chotTrongNam(nam)); }

  // @screen tabBaoCaoLuong

  /**
   * Đối chiếu lương Power Query (Master Prompt V3 mục XVII): nhập 1 bảng lương Excel đã xác nhận
   * đúng (công cụ cũ / Power Query) → so với kết quả app, theo TỪNG nhân viên, TỪNG chỉ tiêu — không
   * chỉ so tổng công ty. Chỉ ĐỌC, không sửa/tính lại dữ liệu.
   */
  // @screen tabDoiChieu
  /** Thanh 7 bước Tính lương (V10.1): trạng thái THẬT tính từ dữ liệu (core/payroll-steps.js) — xong / đang ở / bị chặn / chưa tới. */
  var STEP_CACHE = { key: "", v: null };
  /** Trạng thái duyệt bảng lương của kỳ (chỉ chế độ phân quyền): null | "chua_gui" | "cho_duyet" | "het_hieu_luc" | "da_duyet". Cùng phép so mã băm với savePayrollApproval(). */
  function approvalStateIn(ky) {
    if (C.workflowApproval.mode(db) !== "roles") return null;
    var t = C.workflowApproval.ticket(db, ky);
    if (!t) return "chua_gui";
    try {
      if (t.digest !== approvalDigest(ky, st.kq) && t.digest !== approvalDigest(ky, st.kq, true)) return "het_hieu_luc";
    } catch (e) { return "het_hieu_luc"; }
    return t.approver ? "da_duyet" : "cho_duyet";
  }
  function luongStepsIn(chot) {
    var ky = kyStr(), daTinh = !!(st.kq && !st.kqStale && st.kq.ky === ky);
    var key = [ky, dbRev, daTinh ? 1 : 0, chot ? 1 : 0, (db.ttluong || []).length].join("|");
    if (STEP_CACHE.key === key) return STEP_CACHE.v;
    var loiDauVao = 0, loiChan = 0, duyet = null, tt = { soNV: 0, soCT: 0, nguoiDaTraDu: 0 };
    if (!chot) {
      try { loiDauVao = INT.check(db).filter(function (x) { return x.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN)/.test(x.msg); }).length; } catch (e) { loiDauVao = 1; }
      if (daTinh) { try { loiChan = GATE.blockers(st.kq).length; } catch (e) { loiChan = 1; } }
      if (daTinh && !loiChan && !loiDauVao) duyet = approvalStateIn(ky);
    } else {
      var os = PLG.outstanding(chot.kq.bangluong || [], db.ttluong || [], ky);
      tt = { soNV: os.length, soCT: (db.ttluong || []).filter(function (l) { return l["Kỳ"] === ky && l["Trạng thái"] !== PLG.TT.HUY; }).length, nguoiDaTraDu: os.filter(function (o) { return o.thucLinh > 0 ? o.daTra >= o.thucLinh : true; }).length };
    }
    var v = C.payrollSteps.compute({ chot: !!chot, daTinh: daTinh, loiDauVao: loiDauVao, loiChan: loiChan, duyet: duyet, thanhToan: tt });
    STEP_CACHE = { key: key, v: v }; return v;
  }
  function luongSteps(chot) {
    var steps = luongStepsIn(chot), go = [null, "ktbl", null, "ktbl", null, "rp_thanhtoan", "slips"];
    var bar = h("ol", { class: "steps7", "data-steps7": "1", "aria-label": "7 bước tính lương" });
    steps.forEach(function (x, i) {
      var cls = x.trangThai === "xong" ? "done" : x.trangThai === "dang" ? "now" : x.trangThai === "chan" ? "block" : "";
      var li = h("li", { class: cls, "data-step-state": x.trangThai, title: x.ly || "" }, [h("span", { class: "n", text: x.trangThai === "xong" ? "✓" : x.trangThai === "chan" ? "!" : String(i + 1) }), h("span", { text: x.ten })]);
      if (go[i]) { li.classList.add("go"); li.addEventListener("click", function () { if (!leaveOk()) return; st.tab = go[i]; render(); }); }
      bar.appendChild(li);
    });
    return bar;
  }
  // @screen tabLuong
