  // ---------- BÁO CÁO LƯƠNG ----------
  // Kết quả lương của 1 kỳ: kỳ đã chốt lấy bản đã lưu, chưa chốt thì tính tạm
  var kqMemo = null;
  function kqKy(nam, thang) {
    var c = kyChot(kyKey(nam, thang));
    if (c) return { kq: c.kq, chot: true };
    if (!db.nhanvien.length) return { kq: { bangluong: [], bhxh: [], tncn: [], canhbao: [] }, chot: false };
    // V9.4: đổi bộ lọc / tab báo cáo KHÔNG tính lại engine — chỉ tính lại khi dữ liệu, quy chế hoặc cách bù đổi
    var mk = [nam, thang, dbRev, st.bu, quyChe()].join("|");
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
    var sp = HRM.staffForPayroll(db, nam, thang), cnt = {};
    sp.list.forEach(function (x) { if (x["Mã PB"]) cnt[x["Mã PB"]] = (cnt[x["Mã PB"]] || 0) + 1; });
    al.empCount = cnt; al.chuaGan = k.chuaGan; al.raw = (db[loai] || []).filter(function (r) { return VAL.rowPeriod(loai, r) === kyKey(nam, thang); });
    return al;
  }
  function inputReportSource(table, ky, kind) {
    if (kyChot(ky)) return "Đã chốt · dữ liệu lưu khi chốt";
    var counts = C.inputReview.summary(db, table, ky).filter(function (item) { return !kind || item.kind === kind; });
    if (!counts.some(function (item) { return item.current || item.previousOnly; })) return "Chưa có dữ liệu trong kỳ";
    if (!counts.some(function (item) { return item.draft || item.previousOnly; })) return "Đã lưu để tính lương · kỳ chưa chốt";
    return "Nháp · dữ liệu hiện hành · " + counts.map(function (item) {
      var kind = item.kind === "team" ? "Theo tổ: " : item.kind === "direct" ? "Trực tiếp: " : "";
      return kind + item.approved + " dòng đã lưu giữ nguyên, " + item.draft + " dòng nháp" + (item.previousOnly ? ", " + item.previousOnly + " dòng bản lưu cũ đã sửa/xóa" : "");
    }).join(" · ");
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
  function confirmProductionAttendance(visible, allocation, selectedTable) {
    if (!need("input.edit") || kyChot(kyStr())) return;
    var service = C.productionAttendance, period = kyStr(), revision = dbRev, candidates = new Map();
    allocation.attendanceReview.forEach(function (receipt) {
      if (!visible.some(function (row) { return row["Phiếu cân"] === receipt.phieu && row["Ngày cân"] === receipt.ngay && row["Mã phòng ban"] === receipt.maPB; })) return;
      receipt.employees.forEach(function (employee) {
        var row = { date: receipt.ngay, team: receipt.maPB, employee: employee.ma };
        candidates.set(service.key(row), { row: row, name: employee.hoTen });
      });
    });
    var body = h("div"), list = h("div"), checked = new Map();
    candidates.forEach(function (item, key) {
      var box = h("input", { type: "checkbox" }); checked.set(key, box);
      list.appendChild(h("label", { class: "fld" }, [box, item.row.date + " · " + item.row.team + " · " + item.row.employee + " — " + item.name]));
    });
    var reason = h("textarea", { class: "i", "aria-label": "Lý do xác nhận", placeholder: "Lý do, ví dụ Làm ca dài qua ngày" });
    body.appendChild(list); body.appendChild(reason);
    modal("Xác nhận có làm để chia sản lượng", body, function (close) {
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
            done(); render();
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
    var sl = reportAllocation(nam, thang, "sanluong"), bd = reportAllocation(nam, thang, "bandam"), src = kqKy(nam, thang), dmL = {};
    if (!sl || !bd) { alert("Bản chốt cũ thiếu chi tiết phân bổ để xuất bộ toàn kỳ. Xem dữ liệu đã lưu ở Kỳ lương đã chốt."); return; }
    var snapshot = src.chot ? kyChot(kyKey(nam, thang)) : null;
    var saved = (snapshot && snapshot.input) || {};
    var catalog = snapshot ? (saved.danhmuc || {}) : db;
    var hours = snapshot ? ((saved.data || {}).chamcong || []) : db.chamcong;
    (catalog.dm_luong || []).forEach(function (r) { if (r["Mã lương"] === "SP") dmL = r; });
    var bc = {}; hours.filter(function (r) { return r["Kỳ"] === kyKey(nam, thang) && String(r["Hình thức công"] || "BT").toUpperCase() === "BT"; })
      .forEach(function (r) { for (var d = 1; d <= new Date(nam, thang, 0).getDate(); d++) bc[r["Mã NV"]] = (bc[r["Mã NV"]] || 0) + E.tachCong(r[("0" + d).slice(-2)]).soCong; });
    var rows = src.kq.bangluong.filter(function (b) { return n0(b["Lương sản lượng"]) || n0(b["Lương bơm dăm"]) || n0(b["Lương bù SL"]) || n0(b["Sản lượng (tấn)"]) || n0(b["Số xe bơm dăm"]); })
      .map(function (b) { var pb = b["Mã PB"] || ""; return { maPB: pb, tenPB: b["Phòng ban"] || pb, ma: b["Mã NV"], hoTen: b["Họ và tên"], soCong: b._ct && b._ct.congBT != null ? b._ct.congBT : (bc[b["Mã NV"]] ?? (snapshot && !Array.isArray((saved.data || {}).chamcong) ? null : 0)), tan: n0(b["Sản lượng (tấn)"]), xe: n0(b["Số xe bơm dăm"]), luongSL: n0(b["Lương sản lượng"]), luongBD: n0(b["Lương bơm dăm"]), bu: n0(b["Lương bù SL"]), tong: n0(b["Lương sản lượng"]) + n0(b["Lương bơm dăm"]) + n0(b["Lương bù SL"]) }; });
    var coChe = src.chot ? String(snapshot.buTheoNgay || false) : String(st.bu);
    // Master Prompt V3 mục XVII: chi tiết bù lương Đại Hiệp theo NGÀY bậc thang (chỉ khi đúng cơ chế này)
    var daihiepDetail = null;
    if (!snapshot && coChe === "daihiep") {
      var sp2 = HRM.staffForPayroll(db, nam, thang), slK2 = HRM.sanLuongKy(db, nam, thang, "sanluong");
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
      ctx: { coChe: coChe, chot: src.chot, source: allocationReportSource("sanluong", kyKey(nam, thang)) + " | Ban dăm xuất hàng: " + inputReportSource("bandam", kyKey(nam, thang)), giaKl: n0(dmL["Số tiền khoán"]), giaBd: n0(((catalog.dm_luong || []).filter(function (r) { return r["Mã lương"] === "BD"; })[0] || {})["Số tiền khoán"]), mucSan: n0(dmL["Đơn giá bù lương"]), nguong: n0(dmL["Ngưỡng công bù theo tổ"]), soNgay: new Date(nam, thang, 0).getDate() } }, meta);
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
  function luongStepsIn(chot) {
    var ky = kyStr(), daTinh = !!(st.kq && !st.kqStale && st.kq.ky === ky);
    var key = [ky, dbRev, daTinh ? 1 : 0, chot ? 1 : 0, (db.ttluong || []).length].join("|");
    if (STEP_CACHE.key === key) return STEP_CACHE.v;
    var loiDauVao = 0, loiChan = 0, tt = { soNV: 0, soCT: 0, nguoiDaTraDu: 0 };
    if (!chot) {
      try { loiDauVao = INT.check(db).filter(function (x) { return x.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN)/.test(x.msg); }).length; } catch (e) { loiDauVao = 1; }
      if (daTinh) { try { loiChan = GATE.blockers(st.kq).length; } catch (e) { loiChan = 1; } }
    } else {
      var os = PLG.outstanding(chot.kq.bangluong || [], db.ttluong || [], ky);
      tt = { soNV: os.length, soCT: (db.ttluong || []).filter(function (l) { return l["Kỳ"] === ky && l["Trạng thái"] !== PLG.TT.HUY; }).length, nguoiDaTraDu: os.filter(function (o) { return o.thucLinh > 0 ? o.daTra >= o.thucLinh : true; }).length };
    }
    var v = C.payrollSteps.compute({ chot: !!chot, daTinh: daTinh, loiDauVao: loiDauVao, loiChan: loiChan, thanhToan: tt });
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
