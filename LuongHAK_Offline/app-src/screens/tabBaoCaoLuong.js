  function tabBaoCaoLuong() {
    var w = h("div"), bar = h("div", { class: "bar" });
    if (!BCL.some(function (b) { return b[0] === st.bcl; })) st.bcl = "cong";
    BCL.forEach(function (b) { bar.appendChild(btn(b[1], st.bcl === b[0] ? "pri" : "", function () { st.bcl = b[0]; render(); })); });
    [["rp_pb", "Tổng hợp theo phòng ban"], ["rp_soct", "Sổ chứng từ thanh toán"]].forEach(function (link) {
      if (tabAllowed(link[0])) bar.appendChild(btn(link[1] + " ↗", "ghost", function () {
        st.tab = link[0]; saveUi(); render();
      }));
    });
    w.appendChild(bar);
    var card = h("div", { class: "card" }), tools = h("div", { class: "bar" }), sheets = [], title = BCL.filter(function (b) { return b[0] === st.bcl; })[0][1].replace(/^\S+\s/, "");
    card.appendChild(tools);
    var rfHint = h("div", { class: "hint", "data-rf-hint": "1" }), rfSkip = {};
    if (st.bcl !== "sanluong") card.appendChild(reportFilterBar(kqKy(st.nam, st.thang).kq.bangluong));
    card.appendChild(rfHint);
    /** Lọc 1 bảng báo cáo theo bộ lọc dùng chung (chỉ tiêu chí mà bảng có cột); dòng tổng tính lại sau lọc */
    function FX(rows) {
      var g = RF.applyGeneric(rows, st.rf); g.skipped.forEach(function (x) { rfSkip[x] = 1; });
      if (!g.filtered) return rows;
      var lab = g.hadTotal ? String(rows[rows.length - 1][Object.keys(rows[rows.length - 1])[0]]) : "";
      return g.hadTotal && g.rows.length ? addTotal(g.rows, lab) : g.rows;
    }
    var nam = st.nam, thang = st.thang, snapshot = kyChot(kyKey(nam, thang)), info = function (t, cls) { card.appendChild(h("div", { class: cls || "hint", html: t })); };
    if (BCL_NAM[st.bcl]) {
      var ks = chotTrongNam(nam);
      info("Năm <b>" + nam + "</b> (đổi năm ở ô Kỳ lương phía trên). Báo cáo cả năm chỉ cộng các <b>kỳ đã chốt</b>: " + (ks.length ? ks.map(function (k) { return "T" + (+k.ky.slice(5)); }).join(", ") : "chưa có kỳ nào") + ".", ks.length ? "hint" : "warn");
    } else {
      var src = st.bcl === "cong" || st.bcl === "sanluong" ? null : kqKy(nam, thang);
      if (src) info(src.chot ? "🔒 Số liệu kỳ <b>" + thang + "/" + nam + "</b> lấy từ bảng lương <b>đã chốt</b>." : "⚠ Kỳ <b>" + thang + "/" + nam + "</b> <b>chưa chốt</b> — số liệu tính tạm từ dữ liệu hiện tại, có thể thay đổi.", src.chot ? "locked" : "warn");
    }
    var dataSource = st.bcl === "cong" ? inputReportSource("chamcong", kyKey(nam, thang)) : "";
    if (dataSource) info(esc(dataSource));
    if (st.bcl === "cong") { var r2 = FX(bcCong(nam, thang)); if (snapshot && !Array.isArray(snapshot.input?.data?.chamcong)) info("Bản chốt cũ thiếu dữ liệu chấm công.", "warn"); info("Tổng hợp từ bảng chấm công kỳ " + thang + "/" + nam + ". Ngày có nhãn: VD QC×7 = 7 ngày công tác QC."); card.appendChild(simpleTable(r2)); sheets.push({ name: "TongHopCong", rows: r2 }); }
    else if (st.bcl === "sanluong") {
      st.bclLoai = st.bclLoai || "sanluong";
      var ls = h("select"); [["sanluong", "Sản lượng gỗ (tấn)"], ["bandam", "Ban dăm xuất hàng (số xe)"]].forEach(function (o) { ls.appendChild(h("option", { value: o[0], text: o[1] })); });
      ls.value = st.bclLoai; ls.addEventListener("change", function () { st.bclLoai = ls.value; render(); }); tools.appendChild(ls);
      var allocation = reportAllocation(nam, thang, st.bclLoai);
      if (!allocation) {
        info("Bản chốt cũ thiếu chi tiết phân bổ để dựng báo cáo này. Xem dữ liệu đã lưu ở Kỳ lương đã chốt.", "warn");
        w.appendChild(card);
        return w;
      }
      var r3 = bcSanLuong(nam, thang, st.bclLoai, allocation);
      dataSource = allocationReportSource(st.bclLoai, kyKey(nam, thang));
      info(esc(dataSource));
      info("Phân bổ cho biết ai nhận, ai không nhận và phần chưa phân bổ. Tổng phiếu gốc và tổng phân bổ cùng nguồn, không cộng lại.");
      var receiptRows = r3.al.attendanceReview.flatMap(function (receipt, index) {
        return receipt.employees.map(function (e) {
          return { index: index, "Mã NV": e.ma, "Họ và tên": e.hoTen + " " + receipt.phieu,
            "Phòng ban": HRM.refName(snapshot ? (snapshot.input?.danhmuc || {}) : db, "dm_phongban", receipt.maPB) || receipt.maPB };
        });
      });
      tools.appendChild(btn("⬇ Xuất bộ phân bổ toàn kỳ", "", function () { exportPBKL(nam, thang); },
        "Toàn kỳ: sản lượng và Ban dăm xuất hàng, không áp dụng bộ lọc đang xem"));
      info("Excel/PDF đang xem xuất loại đã chọn và giữ bộ lọc của bảng đối chiếu chấm công. Bộ phân bổ toàn kỳ xuất cả sản lượng và Ban dăm xuất hàng.");

      info("Phiếu ghi <b>Mã phòng ban</b> (tổ) → chia đều cho người của tổ đang làm việc ngày cân, trừ người trong <b>NV vắng</b> (như công cụ phân bổ khối lượng). Phiếu ghi <b>Mã NV</b> → giao trực tiếp. Cách bù lương đang chọn ở Tính lương: <b>" + esc(buLabel(snapshot ? snapshot.buTheoNgay : st.bu)) + "</b>.");
      if (r3.warnings.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Cần kiểm tra (" + r3.warnings.length + "):</b><br>" + r3.warnings.map(esc).join("<br>") }));
      card.appendChild(h("div", { class: "fh", text: "Theo phòng ban (tổ)" })); card.appendChild(simpleTable(r3.pb));
      card.appendChild(h("div", { class: "fh", text: "Theo công nhân" })); card.appendChild(simpleTable(r3.nv));
      card.appendChild(h("div", { class: "fh", text: "Đối soát từng phiếu" }));
      var origin = st.bclLoai === "bandam" ? "rp_bd" : "rp_sl", originType = OPS_SCREENS[origin];
      var linkedAudit = tabAllowed(origin) ? r3.audit.map(function (row) {
        if (!row["Phiếu"] || !row["Ngày"]) return row;
        return Object.assign({}, row, { "Phiếu": btn(row["Phiếu"], "ghost", function () {
          st.opsReceipt = { type: originType, number: String(row["Phiếu"]).trim(), date: String(row["Ngày"]).slice(0, 10), ky: kyKey(nam, thang) };
          st.opsKw = ""; st.opsPB = ""; st.tab = origin; saveUi(); render();
        }, "Xem phiếu gốc " + row["Phiếu"]) });
      }) : r3.audit;
      card.appendChild(simpleTable(linkedAudit));
      if (r3.chuaGan.length) { card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + r3.chuaGan.length + " phiếu cân chưa có Mã NV hoặc Mã phòng ban</b> — chưa được tính lương cho ai:" })); card.appendChild(simpleTable(r3.chuaGan)); }
      if (r3.attendanceReview.length) {
        var reviewFilter = reportFilterBar(receiptRows, { compact: true, showEmployees: true, screenId: "phieu-doi-chieu", searchPlaceholder: "Tìm phiếu, mã hoặc tên người cần kiểm tra…" });
        var matchingReceipts = new Set(FX(receiptRows).map(function (row) { return row.index; }));
        var fields = [["receipt", "Số phiếu"], ["plate", "Biển số xe"], ["team", "Mã tổ"], ["date", "Ngày phân bổ"]];
        if (st.bclLoai === "bandam") fields.push(["quantity", "Số lượng xe"]);
        var filters = st.attendanceReceiptFilters || {}, controls = {}, filterBar = h("form", { class: "bar" });
        fields.forEach(function (field) {
          var input = h("input", { class: "i", type: field[0] === "date" ? "date" : field[0] === "quantity" ? "number" : "text",
            "aria-label": field[1], placeholder: field[1], value: filters[field[0]] || "" });
          if (field[0] === "quantity") { input.min = "0"; input.step = "any"; }
          controls[field[0]] = input;
          filterBar.appendChild(h("label", { class: "fld" }, [field[1], input]));
        });
        filterBar.appendChild(h("button", { type: "submit", class: "pri", text: "Lọc phiếu" }));
        filterBar.appendChild(btn("Xóa bộ lọc phiếu", "ghost", function (event) {
          event.preventDefault(); st.attendanceReceiptFilters = {}; render();
        }));
        filterBar.addEventListener("submit", function (event) {
          event.preventDefault();
          st.attendanceReceiptFilters = {};
          fields.forEach(function (field) { st.attendanceReceiptFilters[field[0]] = controls[field[0]].value.trim(); });
          render();
        });
        var original = new Map((r3.al.raw || []).map(function (row) {
          return [[String(row["Phiếu cân"] || "").trim(), VAL.normDate(row["Ngày cân"]), String(row["Mã phòng ban"] || "").trim()].join("|"), row];
        }));
        function contains(value, query) { return !query || String(value || "").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")); }
        var visibleReview = r3.attendanceReview.map(function (row, index) {
          var key = [String(row["Phiếu cân"] || "").trim(), row["Ngày cân"], row["Mã phòng ban"]].join("|");
          var receipt = original.get(key);
          return { index: index, row: Object.assign({ "Biển số xe": receipt ? receipt["Biển số"] || "" : "" }, row) };
        }).filter(function (entry) {
          var row = entry.row;
          return matchingReceipts.has(entry.index) && contains(row["Phiếu cân"], filters.receipt) &&
            contains(row["Biển số xe"], filters.plate) && contains(row["Mã phòng ban"], filters.team) &&
            (!filters.date || filters.date === row["Ngày cân"]) &&
            (st.bclLoai !== "bandam" || !filters.quantity || Number(filters.quantity) === row["KL / số xe"]);
        }).map(function (entry) { return entry.row; });
        card.appendChild(h("div", { class: "fh", text: "Phiếu cần đối chiếu chấm công" }));
        card.appendChild(h("p", { class: "hint", text: "Người có ô chấm công ghi bằng 0 hoặc để trống và chưa có tên hoặc mã trong NV vắng. Kiểm tra chấm công trước khi điều chỉnh." }));
        card.appendChild(filterBar);
        card.appendChild(reviewFilter);
        if (Object.keys(rfSkip).length) card.appendChild(h("div", { class: "hint", text: "Tiêu chí không áp dụng cho bảng này: " + Object.keys(rfSkip).join(", ") }));
        var actionableReview = visibleReview.map(function (row) {
          var entry = r3.al.attendanceReview.find(function (item) {
            return item.phieu === row["Phiếu cân"] && item.ngay === row["Ngày cân"] && item.maPB === row["Mã phòng ban"];
          });
          var actions = [];
          if (tabAllowed(origin)) actions.push(btn("Mở phiếu cân", "ghost", function () {
            st.opsReceipt = { type: originType, number: String(row["Phiếu cân"]).trim(), date: row["Ngày cân"], ky: kyKey(nam, thang) };
            st.opsKw = ""; st.opsPB = ""; st.tab = origin; saveUi(); render();
          }));
          if (!snapshot && entry && tabAllowed("chamcong")) entry.employees.forEach(function (employee) {
            actions.push(btn("Mở công " + employee.ma, "ghost", function () {
              st.rf = RF.normalize({ maNV: [employee.ma] });
              st.attendanceReviewDay = row["Ngày cân"];
              st.tab = "chamcong"; saveUi(); render();
            }));
          });
          return Object.assign({}, row, { "Thao tác": h("div", { class: "bar" }, actions) });
        });
        var reviewTable = visibleReview.length ? simpleTable(actionableReview) : h("div", { class: "empty", text: "Không có phiếu khớp bộ lọc." });
        reviewTable.classList.add("attendance-review-table");
        card.appendChild(reviewTable);
        if (!snapshot && visibleReview.length && can("input.edit")) card.appendChild(btn("Xác nhận có làm", "pri", function () {
          confirmProductionAttendance(visibleReview, r3.al, st.bclLoai);
        }));
        sheets.push({ name: "DoiChieuChamCong", rows: visibleReview });
      }
      var recorded = ((snapshot ? snapshot.input?.data?.productionAttendance : db.productionAttendance) || []).filter(function (row) {
        return row.date.slice(0, 7) === kyKey(nam, thang);
      });
      if (recorded.length) {
        card.appendChild(h("div", { class: "fh", text: "Xác nhận làm ca dài đã lưu" }));
        card.appendChild(simpleTable(recorded.map(function (row) {
          return { "Ngày phân bổ": row.date, "Mã tổ": row.team, "Mã NV": row.employee, "Lý do": row.reason, "Người xác nhận": row.user,
            "Thao tác": !snapshot && can("input.edit") ? btn("Thu hồi", "ghost", function () {
              askText("Thu hồi xác nhận ca dài", row.employee + " · " + row.date + " · " + row.team, { label: "Lý do thu hồi", required: true }, function (reason) {
                if (!txn(["productionAttendance"], function () {
                  db.productionAttendance = db.productionAttendance.filter(function (item) { return C.productionAttendance.key(item) !== C.productionAttendance.key(row); });
                  audit("Thu hồi xác nhận ca dài", row.employee + " · " + row.date + " · " + row.team + " · " + reason);
                })) { alert(lastTxnError); return; }
                render();
              });
            }) : "" };
        })));
      }
      sheets.push({ name: "TheoPhongBan", rows: r3.pb }, { name: "TheoCongNhan", rows: r3.nv }, { name: "DoiSoatPhieu", rows: r3.audit }, { name: "ChuaGanNguoi", rows: r3.chuaGan });
    }
    else if (st.bcl === "hachtoan") {
      var ht = bcHachToan(src.kq, nam, thang);
      info("Lương phải trả: <b>" + fmt(ht.phaiTra) + "</b> · Đã chi theo sổ chứng từ: <b>" + fmt(ht.daChi) + "</b> · Còn phải trả: <b>" + fmt(ht.conLai) + "</b>.");
      if (ht.fallback) info("Bản chốt cũ thiếu danh mục phòng ban. Tài khoản chi phí đang lấy từ danh mục hiện tại.", "warn");
      card.appendChild(simpleTable(addTotal(ht.rows)));
      if (Math.abs(ht.lech) >= 1) info("Chênh lệch giữa số phải trả sau khấu trừ và thực lĩnh = <b>" + fmt(ht.lech) + "</b> — do thực lĩnh được làm tròn đến 1.000đ hoặc thực lĩnh âm được để 0.", "warn");
      sheets.push({ name: "HachToan", rows: ht.rows });
    }
    else if (st.bcl === "baohiem") {
      // α18: chỉ cộng / so sánh bảng BHXH engine đã tính của kỳ (không tính lại) — báo cáo nội bộ, không thay mẫu D02-LT / C12-TS
      var pn = thang === 1 ? nam - 1 : nam, pt = thang === 1 ? 12 : thang - 1, prv = kqKy(pn, pt);
      var th = BHR.tongHop(src.kq), bd = BHR.bienDong(src.kq, prv.kq), pbB = BHR.theoPhongBan(src.kq), ctB = BHR.chiTiet(src.kq); bd = FX(bd); pbB = FX(pbB); ctB = FX(ctB);
      info("Số người đóng BH: <b>" + th.soNguoi + "</b>" + (th.chuaDuNguong ? " · <b>" + th.chuaDuNguong + "</b> người chưa đủ ngưỡng công (vẫn trừ khoản NLĐ đóng; truy thu " + fmt(th.truyThu) + ")" : "") + ". Báo cáo nội bộ để đối chiếu trước khi kê khai / nộp — <b>không thay mẫu chính thức</b> của cơ quan BHXH (D02-LT, C12-TS…).");
      card.appendChild(h("div", { class: "fh", text: "Tổng hợp theo khoản" })); card.appendChild(simpleTable(th.rows));
      if (Math.abs(th.lechNLD) >= 1) info("Chênh lệch làm tròn giữa 'Cộng BH NLĐ đóng' và tổng từng khoản: " + fmt(th.lechNLD) + "đ.", "warn");
      card.appendChild(h("div", { class: "fh", text: "Tăng / giảm / điều chỉnh so với tháng " + pt + "/" + pn + (prv.chot ? " (đã chốt)" : " (chưa chốt — tính tạm)") }));
      card.appendChild(bd.length ? simpleTable(bd) : h("div", { class: "hint", text: "Không có biến động so với kỳ trước." }));
      card.appendChild(h("div", { class: "fh", text: "Theo phòng ban" })); card.appendChild(simpleTable(pbB));
      card.appendChild(h("div", { class: "fh", text: "Chi tiết từng người" })); card.appendChild(simpleTable(ctB));
      sheets.push({ name: "TongHop", rows: th.rows }, { name: "TangGiam", rows: bd }, { name: "TheoPhongBan", rows: pbB }, { name: "ChiTiet", rows: ctB });
    }
    else if (st.bcl === "sosanh") { var ss = bcSoSanh(nam, thang); ss.rows = FX(ss.rows); info("So sánh <b>" + ss.prev + "</b> → <b>" + ss.cur + "</b>, sắp theo mức chênh lớn nhất."); card.appendChild(simpleTable(ss.rows)); sheets.push({ name: "SoSanh", rows: ss.rows }); }
    else if (st.bcl === "thang") { var r7 = bc12Thang(nam); card.appendChild(simpleTable(r7)); sheets.push({ name: "Luong12Thang", rows: r7 }); }
    else if (st.bcl === "nvnam") {
      st.bclF = st.bclF || "Thực lĩnh";
      var fs = h("select"); ["Thực lĩnh", "Tổng thu nhập", "Thuế TNCN", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Tổng công", "Tạm ứng"].forEach(function (f) { fs.appendChild(h("option", { value: f, text: f })); });
      fs.value = st.bclF; fs.addEventListener("change", function () { st.bclF = fs.value; render(); }); tools.appendChild(h("label", { text: "Chỉ tiêu " })); tools.appendChild(fs);
      var r8 = FX(bcNVNam(nam, st.bclF)); card.appendChild(simpleTable(r8)); sheets.push({ name: slug(st.bclF) + "_" + nam, rows: r8 });
    }
    else if (st.bcl === "thuenam") {
      var r9 = FX(bcThueNam(nam));
      info("Số liệu hỗ trợ quyết toán thuế TNCN năm " + nam + " — cộng từ các kỳ đã chốt. Kế toán đối chiếu thêm với tờ khai 05/KK đã nộp.");
      card.appendChild(simpleTable(r9)); sheets.push({ name: "ThueTNCN_" + nam, rows: r9 });
    }
    tools.appendChild(h("span", { class: "sp" }));
    if (st.bcl !== "sanluong" && !RF.isEmpty(st.rf)) rfHint.textContent = "Đang lọc: " + RF.describe(st.rf).join(" · ") + " — áp cho bảng nào có cột tương ứng; Excel và PDF xuất ra theo đúng bộ lọc này." + (Object.keys(rfSkip).length ? " Không áp được (báo cáo này không có cột): " + Object.keys(rfSkip).join(", ") + "." : "");
    tools.appendChild(btn("⬇ Xuất PDF", "", function () {
      exportSheetsPdf({ title: title, ky: BCL_NAM[st.bcl] ? "Năm " + nam : "Kỳ " + thang + "/" + nam, trangThai: dataSource || (src && !BCL_NAM[st.bcl] ? (src.chot ? "Đã chốt" : "Chưa chốt — tính tạm") : ""), loc: st.bcl === "sanluong" ? RF.describe(st.rf).map(function (label) { return "Đối chiếu chấm công: " + label; }) : RF.describe(st.rf), sheets: sheets }, "BaoCao_" + slug(title) + "_" + (BCL_NAM[st.bcl] ? nam : kyKey(nam, thang)) + ".pdf");
    }, "PDF theo đúng bộ lọc đang chọn"));
    tools.appendChild(btn(st.bcl === "sanluong" ? "⬇ Xuất báo cáo đang xem (Excel)" : "⬇ Xuất Excel", "pri", function () {
      if (st.bcl === "baohiem") {
        if (!window.ExcelJS || !window.HAKUi.bhXlsx) { alert("Thiếu thư viện Excel báo cáo bảo hiểm"); return; }
        window.HAKUi.bhXlsx.build(window.ExcelJS, sheets, { congTy: congTy()["Tên công ty"] || "", kyText: "THÁNG " + thang + "/" + nam, trangThai: src.chot ? "Đã chốt" : "Chưa chốt — tính tạm", phamVi: RF.describe(st.rf).join("; ") || "Toàn bộ", ngayLap: new Date().toLocaleDateString("vi-VN"), nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
          download("BaoCao_BaoHiem_" + kyKey(nam, thang) + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
          audit("Xuất Excel bảo hiểm", kyKey(nam, thang));
        }, function (e) { alert("Không xuất được Excel: " + (e.message || e)); });
        return;
      }
      var sh = sheets.filter(function (x) { return x.rows.length; }).map(function (x) { return { name: x.name, cols: Object.keys(x.rows[0]), rows: x.rows }; });
      if (!sh.length) { toast("Không có dữ liệu"); return; }
      if (dataSource) sh.unshift({ name: "NguonDuLieu", cols: ["Nguồn số liệu"], rows: [{ "Nguồn số liệu": dataSource }] });
      saveXlsx("BaoCao_" + slug(title) + "_" + (BCL_NAM[st.bcl] ? nam : kyKey(nam, thang)) + ".xlsx", sh);
    }));
    w.appendChild(card); return w;
  }
