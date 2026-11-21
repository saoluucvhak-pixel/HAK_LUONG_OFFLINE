  // ---------- Chốt kỳ lương ----------
  function kyChot(ky) { return db.kyluong.filter(function (k) { return k.ky === ky; })[0] || null; }
  function excelSheets(r, ky) {
    var mm = String(ky).split("-");
    var ck = r.bangluong.filter(function (x) { return x["HTTT"] === "Chuyển khoản" && x["Thực lĩnh"] > 0; }).map(function (x, i) { return { "STT": i + 1, "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"], "Số tài khoản": x["Số tài khoản"], "Ngân hàng": x["Ngân hàng"], "Số tiền": x["Thực lĩnh"], "Nội dung": "Luong T" + (+mm[1]) + "/" + mm[0] + " " + x["Mã NV"] }; });
    return {
      bl: { name: "BangLuong", cols: COLS_FULL.concat(["HTTT", "Số tài khoản", "Ngân hàng"]), rows: r.bangluong },
      bh: { name: "BHXH", cols: r.bhxh[0] ? Object.keys(r.bhxh[0]) : ["Mã NV"], rows: r.bhxh },
      tn: { name: "ThueTNCN", cols: r.tncn[0] ? Object.keys(r.tncn[0]) : ["Mã NV"], rows: r.tncn },
      ck: { name: "ChuyenKhoan", cols: ["STT", "Mã NV", "Họ và tên", "Số tài khoản", "Ngân hàng", "Số tiền", "Nội dung"], rows: ck }
    };
  }
  function payrollReportDetails(nam, thang, payroll) {
    var end = kyKey(nam, thang) + "-" + new Date(nam, thang, 0).getDate();
    var ix = HRM.buildIndex(db), taxIds = Object.create(null);
    payroll.forEach(function (r) {
      var ma = r["Mã NV"], personal = HRM.hienHanh(db, ma, end, ix).cn;
      if (personal && (!personal["Hiệu lực từ"] || personal["Hiệu lực từ"] <= end)) taxIds[ma] = personal["Mã số thuế"] || "";
    });
    var production = ["sanluong", "bandam"].map(function (type) {
      var allocation = pbAlloc(nam, thang, type), report = bcSanLuong(nam, thang, type, allocation);
      return { type: type, allocation: allocation, employees: report.nv.filter(function (r) { return !C.totalRow.is(r); }), audit: report.audit };
    });
    var ky = kyKey(nam, thang), codes = new Set();
    Object.values(OPS.closedTables).forEach(function (table) {
      (db[table] || []).forEach(function (row) { if (row["Mã NV"] && VAL.rowPeriod(table, row) === ky) codes.add(String(row["Mã NV"])); });
    });
    var people = db.nhanvien.filter(function (row) { return codes.has(String(row["Mã NV"])); }).map(function (row) {
      var ma = row["Mã NV"], job = HRM.hienHanh(db, ma, end, ix);
      return { "Mã NV": ma, "Họ và tên": row["Họ và tên"], "Mã PB": job.pb, "Phòng ban": job.tenPB };
    });
    return { taxIds: taxIds, production: production, people: people };
  }

  function payrollDetailSheets(result, ky, snapshot) {
    var parts = ky.split("-").map(Number), nam = parts[0], thang = parts[1];
    var saved = snapshot && snapshot.input;
    var details = snapshot ? saved && saved.payrollReports : payrollReportDetails(nam, thang, result.bangluong);
    var attendance = snapshot ? saved && saved.data && saved.data.chamcong : db.chamcong;
    var people = new Map(result.bangluong.map(function (r) { return [r["Mã NV"], r]; }));
    var days = DAYS.slice(0, new Date(nam, thang, 0).getDate());
    var workRows = (attendance || []).filter(function (r) { return VAL.rowPeriod("chamcong", r) === ky; }).map(function (r) {
      var employee = people.get(r["Mã NV"]) || {};
      var out = { "Mã NV": r["Mã NV"], "Họ và tên": employee["Họ và tên"] || "", "Hình thức công": String(r["Hình thức công"] || "BT").trim().toUpperCase() };
      out["Tổng công"] = days.reduce(function (sum, day) {
        out[day] = r[day] == null ? "" : r[day];
        return sum + E.tachCong(out[day]).soCong;
      }, 0);
      return out;
    }).sort(function (a, b) { return a["Hình thức công"].localeCompare(b["Hình thức công"]) || String(a["Mã NV"]).localeCompare(String(b["Mã NV"])); });
    var production = details && details.production;
    var employeeRows = production ? production.flatMap(function (g) {
      return g.employees.map(function (e) { return { "Loại": g.type === "bandam" ? "Ban dăm xuất hàng" : "Sản lượng",
        "Mã phòng ban": e["Mã phòng ban"], "Mã NV": e["Mã NV"], "Họ và tên": e["Họ và tên"],
        "Số ngày có SL": e["Số ngày có SL"], "Sản lượng (tấn)": e["Sản lượng (tấn)"], "Số xe": e["Số xe"] }; });
    }) : result.bangluong.filter(function (r) { return n0(r["Sản lượng (tấn)"]) || n0(r["Số xe bơm dăm"]); }).map(function (r) {
      return { "Loại": "Tổng theo bảng lương", "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"],
        "Sản lượng (tấn)": r["Sản lượng (tấn)"], "Số xe": r["Số xe bơm dăm"] };
    });
    var audit = (production || []).flatMap(function (g) {
      return g.audit.map(function (r) { return Object.assign({ "Loại": g.type === "bandam" ? "Ban dăm xuất hàng" : "Sản lượng" }, r); });
    });
    var topup = result.bangluong.filter(function (r) { return (r._ct && r._ct.laSanLuong) || n0(r["Lương bù SL"]) || n0(r["Bù SL kỳ trước"]); }).map(function (r) {
      var c = r._ct || {};
      return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Phòng ban": r["Phòng ban"], "Phương pháp bù": c.phuongPhapBu ? buLabel(c.phuongPhapBu) : "",
        "Công BT": c.congBT, "Sản lượng (tấn)": r["Sản lượng (tấn)"], "Đơn giá khoán": c.donGiaKhoan, "Mức sàn bù": c.mucBuDmLuong,
        "Đơn giá bình quân tổ": c.binhQuanTo, "Lương sản lượng": r["Lương sản lượng"], "Lương bù SL": r["Lương bù SL"], "Bù SL kỳ trước": r["Bù SL kỳ trước"] };
    });
    var oldTax = new Map((result.tncn || []).map(function (r) { return [r["Mã NV"], r]; }));
    var taxRows = result.bangluong.map(function (r) {
      var c = r._ct || {}, old = oldTax.get(r["Mã NV"]) || {};
      return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Phòng ban": r["Phòng ban"],
        "Mã số thuế": details && details.taxIds && details.taxIds[r["Mã NV"]] || "", "Mã TNCN": c.maThueTNCN,
        "Phương pháp thuế": c.phuongPhapThue, "Tổng thu nhập": r["Tổng thu nhập"], "Tiền cơm": r["Tiền cơm"],
        "BH trừ NLĐ": r["BH trừ NLĐ"], "KPCĐ trừ NLĐ": r["KPCĐ trừ NLĐ"], "Thu nhập chịu thuế": c.thuNhapChiuThue ?? old["Thu nhập chịu thuế"],
        "Giảm trừ bản thân": c.giamTruBanThan ?? old["Giảm trừ bản thân"], "Số người phụ thuộc": c.soNPT ?? old["Số người phụ thuộc"],
        "Giảm trừ người phụ thuộc": c.giamTruPhuThuoc ?? old["Giảm trừ người phụ thuộc"],
        "Thu nhập tính thuế": c.thuNhapTinhThue ?? old["Thu nhập tính thuế"], "Thuế TNCN khấu trừ": r["Thuế TNCN"] ?? old["Thuế TNCN phải nộp"] };
    });
    function sheet(name, title, cols, rows, source, groupBy) {
      return { name: name, title: title, cols: cols.split("|"), rows: rows, source: source, groupBy: groupBy };
    }
    return [
      sheet("ChamCongTheoHinhThuc", "Chấm công theo từng hình thức công", "Mã NV|Họ và tên|Hình thức công|Tổng công|" + days.join("|"), workRows,
        !attendance ? "Bản chốt cũ chưa lưu bảng chấm công" : snapshot ? "Chấm công lưu trong bản chốt" : "Chấm công hiện tại", "Hình thức công"),
      sheet("PhanBoSanLuong", "Phân bổ sản lượng và bơm dăm theo nhân viên", "Loại|Mã phòng ban|Mã NV|Họ và tên|Số ngày có SL|Sản lượng (tấn)|Số xe", employeeRows,
        production ? (snapshot ? "Chi tiết phân bổ theo ngày cân lưu lúc chốt" : "Phân bổ từ dữ liệu hiện tại") : "Bản chốt cũ chỉ có tổng theo nhân viên từ bảng lương"),
      sheet("DoiSoatPhieuCan", "Đối soát chi tiết phiếu cân", "Loại|Phiếu|Ngày|Mã phòng ban|KL / số xe|Số người nhận|Mỗi người|Người nhận|Ghi chú", audit,
        production ? (snapshot ? "Chi tiết phiếu lưu lúc chốt" : "Chi tiết phiếu hiện tại") : "Bản chốt cũ chưa lưu chi tiết theo phiếu"),
      sheet("BuSanLuong", "Bù sản lượng theo nhân viên", "Mã NV|Họ và tên|Phòng ban|Phương pháp bù|Công BT|Sản lượng (tấn)|Đơn giá khoán|Mức sàn bù|Đơn giá bình quân tổ|Lương sản lượng|Lương bù SL|Bù SL kỳ trước", topup, "Kết quả bù trong bảng lương của kỳ"),
      sheet("ThueTNCN", "Chi tiết khấu trừ thuế thu nhập cá nhân", "Mã NV|Họ và tên|Phòng ban|Mã số thuế|Mã TNCN|Phương pháp thuế|Tổng thu nhập|Tiền cơm|BH trừ NLĐ|KPCĐ trừ NLĐ|Thu nhập chịu thuế|Giảm trừ bản thân|Số người phụ thuộc|Giảm trừ người phụ thuộc|Thu nhập tính thuế|Thuế TNCN khấu trừ", taxRows,
        snapshot && !details ? "Bảng lương đã chốt. Mã số thuế trống nếu bản chốt cũ chưa lưu." : "Kết quả thuế và mã số thuế của kỳ")
    ];
  }

  function payrollBundle(r, ky) {
    var x = excelSheets(r, ky), parts = ky.split("-"), snapshot = kyChot(ky);
    var accounting = bcHachToan(r, Number(parts[0]), Number(parts[1]));
    var balance = PLG.outstanding(r.bangluong, payLines(), ky).map(function (o) {
      return { "Mã NV": o.maNV, "Họ và tên": o.hoTen, "Phải trả": o.thucLinh, "Đã chi": o.daTra,
        "Đang chờ chi": o.dangCho, "Còn phải trả": o.conPhaiTraRaw };
    });
    var departments = ALLOC.byDepartment(r).rows;
    var meta = { "Kỳ": ky, "Phiên bản": snapshot ? snapshot.version || 1 : "", "Nguồn bảng lương": snapshot ? "Bản đã chốt" : "Dữ liệu tính tạm",
      "Nguồn chi lương": "Sổ chứng từ tại thời điểm xuất", "Ngày xuất": HRM.today(), "Chênh lệch TK 334": accounting.lech, "Nguồn tài khoản chi phí": accounting.fallback || !snapshot ? "Danh mục hiện tại" : "Danh mục bản chốt" };
    var supplemental = payrollDetailSheets(r, ky, snapshot);
    var folder = [
      { name: "ThongTinKy", title: "Thông tin kỳ và nguồn số liệu", cols: ["Nội dung", "Giá trị"], rows: Object.keys(meta).map(function (key) { return { "Nội dung": key, "Giá trị": meta[key] }; }) },
      Object.assign({ title: "Bảng lương" }, x.bl),
      Object.assign({ title: "Bảo hiểm" }, x.bh),
      supplemental.pop(),
      { name: "PhanBoPhongBan", title: "Phân bổ lương theo phòng ban", cols: departments[0] ? Object.keys(departments[0]) : ["Phòng ban"], rows: departments },
      { name: "HachToan", title: "Bảng hạch toán lương", cols: ["Kỳ", "TK Nợ", "TK Có", "Diễn giải", "Số tiền"], rows: accounting.rows },
      { name: "DoiChieuChiLuong", title: "Đối chiếu chi lương", cols: ["Mã NV", "Họ và tên", "Phải trả", "Đã chi", "Đang chờ chi", "Còn phải trả"], rows: balance }
    ];
    folder = folder.concat(supplemental);
    var company = snapshot && snapshot.input && snapshot.input.danhmuc && (snapshot.input.danhmuc.congty || [])[0];
    var info = {
      congTy: (company || congTy())["Tên công ty"] || "", kyText: kyLabel(ky),
      trangThai: snapshot ? "Đã chốt · v" + (snapshot.version || 1) : "Dữ liệu tính tạm", ngayLap: fmtDate(HRM.today()),
      nguoiLap: currentUser()
    };
    return { sheets: folder, info: info };
  }

  function exportPayrollBundlePdf(r, ky) {
    if (!need("export", "in bộ báo cáo kỳ")) return;
    var bundle = payrollBundle(r, ky);
    var signRoles = ["Người lập biểu", "Kế toán trưởng", "Giám đốc"];
    exportSheetsPdf({
      title: "Bộ báo cáo kỳ lương", ky: bundle.info.kyText, congTy: bundle.info.congTy,
      trangThai: bundle.info.trangThai, sheets: bundle.sheets.map(function (sheet) {
        var ids = ["STT", "Mã NV", "Họ và tên"].filter(function (key) { return sheet.cols.indexOf(key) >= 0; });
        var cols = ids.concat(sheet.cols.filter(function (key) { return ids.indexOf(key) < 0; }));
        var isInfo = sheet.name === "ThongTinKy";
        return Object.assign({}, sheet, { name: sheet.title || sheet.name, cols: cols, repeatColumns: ids.length, chuKy: isInfo ? [] : signRoles });
      })
    }, "KyLuong_" + ky + ".pdf", { sectionPages: true, period: ky, chuKy: signRoles });
  }

  function exportAll(r, ky) {
    if (!need("export", "xuất bộ báo cáo kỳ")) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện định dạng Excel."); return; }
    var bundle = payrollBundle(r, ky);
    window.HAKUi.reportXlsx.buildPayrollBundle(window.ExcelJS, bundle.sheets, bundle.info).xlsx.writeBuffer().then(function (buf) {
      download("KyLuong_" + ky + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
    }, function (e) { alert("Không tạo được bộ báo cáo kỳ: " + e.message); });
  }
  /**
   * Checklist trước khi chốt kỳ (Master Prompt mục XIV/XVIII). Chỉ hiện khi có điểm cần xem (lỗi
   * hoặc cảnh báo) — dữ liệu sạch thì bỏ qua thẳng, không thêm bước cho trường hợp bình thường.
   * "loi" (⛔) = BLOCKER mục XIV — không có nút vượt qua, phải sửa dữ liệu rồi tính lại.
   * "canhbao" (⚠) = WARNING — được chốt nếu đã kiểm tra là đúng. onContinue() chỉ được gọi khi
   * người dùng chủ động xác nhận tiếp tục (hoặc không có gì phải xem).
   */
  function preChotChecklist(fresh, onContinue) {
    if (!PCC) { onContinue(); return; }
    var slA = pbAlloc(st.nam, st.thang, "sanluong"), bdA = pbAlloc(st.nam, st.thang, "bandam");
    var ck = PCC.run({ db: db, kq: fresh, slAlloc: slA, bdAlloc: bdA, quyChe: quyChe() });
    if (!ck.loiCount && !ck.canhbaoCount) { onContinue(); return; }
    var ICON = { ok: "✔", canhbao: "⚠", loi: "⛔" };
    var body = h("div");
    body.appendChild(h("div", { class: ck.loiCount ? "warn" : "hint", html: "Checklist trước khi chốt kỳ — <b>" + ck.loiCount + " lỗi</b>, <b>" + ck.canhbaoCount + "</b> cảnh báo trên " + ck.items.length + " điểm." +
      (ck.loiCount ? " ⛔ Lỗi là BLOCKER (mục XIV) — phải sửa dữ liệu rồi tính lại, KHÔNG thể vượt qua." : " Cảnh báo có thể chốt nếu đã kiểm tra là đúng.") }));
    var t = h("table");
    ck.items.forEach(function (x) {
      var tr = h("tr");
      tr.appendChild(h("td", { text: ICON[x.trangThai] + " " + x.id }));
      tr.appendChild(h("td", { class: "t", html: "<b>" + esc(x.ten) + "</b>" + (x.chiTiet.length ? "<br><span style='color:#6c7a74;font-size:12px'>" + x.chiTiet.slice(0, 5).map(esc).join("<br>") + (x.chiTiet.length > 5 ? "<br>…(" + (x.chiTiet.length - 5) + " dòng nữa)" : "") + "</span>" : "") }));
      t.appendChild(tr);
    });
    body.appendChild(h("div", { class: "tw" }, [t]));
    modal("Checklist trước khi chốt kỳ lương", body, function (close) {
      // BLOCKER (còn "loi"): chỉ có nút đóng để quay lại sửa — không có đường nào bấm qua được (mục XIV).
      return ck.loiCount ? [btn("Đóng — sửa dữ liệu rồi tính lại", "pri", close)]
        : [btn("Hủy, để tôi kiểm tra lại", "", close), btn("Đã kiểm tra, tiếp tục chốt", "pri", function () { close(); onContinue(); })];
    });
  }
  function selectTopupMethod(value) {
    st.bu = value === "true" ? true : value === "false" ? false : value;
    st.kqStale = true;
    saveUi();
    render();
  }

  function checkCloseTopup(result, ky) {
    var parts = ky.split("-").map(Number);
    var policy = E.quyCheBuChinhThuc(db.dm_quychebu, parts[0], parts[1]);
    var official = policy && String(policy["Cách bù"] || "").trim();
    var used = result.cheDoBu;
    var production = result.bangluong.some(function (row) { return row._ct && row._ct.laSanLuong; });
    if (official !== "daihiep" && official !== "to") {
      if (production) {
        alert("⛔ KHÔNG THỂ CHỐT — kỳ " + kyLabel(ky) + " có sản lượng cần bù nhưng chưa có Phương pháp bù sản lượng chính thức hợp lệ. Vào Cài đặt → Phương pháp bù sản lượng, áp dụng phương pháp cho kỳ rồi bấm Tính lương lại.");
        return false;
      }
    } else if (used !== official) {
      var body = h("div", { class: "warn" }, [
        h("p", { text: "Đã tính bảng lương theo: " + buLabel(used) }),
        h("p", { text: "Cài đặt kỳ " + kyLabel(ky) + ": " + buLabel(official) }),
        h("p", { text: "Bấm Tính lương lại sau khi chọn đúng phương pháp, rồi kiểm tra bảng trước khi chốt." })
      ]);
      modal("Phương pháp bù chưa khớp", body, function (close) {
        var actions = [btn("Đóng", "", close)];
        if (String(st.bu) !== official) actions.push(btn("Dùng phương pháp trong Cài đặt", "pri", function () {
          close();
          if (kyStr() !== ky || kyChot(ky)) return;
          selectTopupMethod(official);
          toast("Đã chọn phương pháp trong Cài đặt. Bấm Tính lương lại.");
        }));
        return actions;
      });
      return false;
    }
    if (used !== String(st.bu)) {
      alert("⛔ KHÔNG THỂ CHỐT — phương pháp bù vừa chọn khác phương pháp đã dùng để tính bảng lương. Bấm Tính lương lại rồi chốt.");
      return false;
    }
    return true;
  }
  function payrollApprovalInfo(snap) {
    var a = snap.input && snap.input.approval;
    return a ? "Người lập: " + a.preparer + " · Người duyệt: " + a.approver + " · Duyệt lúc: " + fmtTime(a.approvedAt) + " · Phiên bản duyệt: v" + a.version : "";
  }
  function approvalDigest(ky, result, legacy) {
    var snapshot = CLS.buildSnapshot(db, ky, result, result._staff, { buTheoNgay: st.bu, quyChe: result.quyChe, engineVersion: E.ENGINE_VERSION });
    return C.workflowApproval.fingerprint(db, snapshot, legacy);
  }

  function savePayrollApproval(approve) {
    if (!need(approve ? "payroll.approve" : "payroll.calc") || C.workflowApproval.mode(db) !== "roles") return;
    var ky = kyStr(), prior = C.workflowApproval.ticket(db, ky), user = C.workflowApproval.account(session.tenDangNhap);
    if (!st.kq || st.kq.ky !== ky || kyChot(ky) || !checkCloseTopup(st.kq, ky)) return;
    var fresh = tinhLuong(st.nam, st.thang, undefined, st.bu);
    if (GATE.blockers(fresh).length || !fresh.bangluong.length) { alert("Cần xử lý lỗi đầu vào và có bảng lương trước khi gửi hoặc duyệt."); return; }
    var digest = approvalDigest(ky, fresh);
    if (digest !== approvalDigest(ky, st.kq)) { st.kq = fresh; render(); alert("Bảng lương đã thay đổi. Kiểm tra bảng mới rồi thao tác lại."); return; }
    if (approve && (!prior || prior.approver || prior.preparer === user || (prior.digest !== digest && prior.digest !== approvalDigest(ky, fresh, true)))) {
      alert("Cần yêu cầu còn hiệu lực từ người lập khác. Kiểm tra phương pháp bù, quy chế và dữ liệu của kỳ."); return;
    }
    var row = approve ? Object.assign({}, prior, { approver: user, approvedAt: new Date().toISOString() }) : { ky: ky, digest: digest, preparer: user, approver: "" };
    if (!txn(["payrollApprovals"], function () {
      db.payrollApprovals = (db.payrollApprovals || []).filter(function (item) { return item.ky !== ky; }).concat(row);
      audit(approve ? "Duyệt bảng lương" : "Gửi duyệt bảng lương", ky);
    })) { alert(lastTxnError); return; }
    st.kqStale = false;
    render();
  }

  function chotKy() {
    if (!st.kq || !need("payroll.close")) return;
    var ky = kyStr();
    if (kyChot(ky)) { alert(kyLabel(ky) + " đã chốt."); return; }
    if (st.kq.ky !== ky || !checkCloseTopup(st.kq, ky)) return;
    var method = st.bu;
    // P0 (BLOCKER — mục IV.2): lỗi dữ liệu NGHIÊM TRỌNG phải CHẶN CỨNG, không cho chốt bằng 1 hộp
    // thoại xác nhận như cảnh báo thường — gồm mức "Critical" (Mã NV trùng) VÀ các dòng "High" mà
    // core/integrity.js đã tự xác định là tiền bị CỘNG TRÙNG (phiếu cân / số chứng từ trùng khóa
    // → sản lượng, thưởng, tạm ứng bị tính 2 lần) — khớp đúng BLOCKER "sản lượng/chấm công bị cộng
    // trùng" của mục IV.2, dù mức integrity.js gán là High (ảnh hưởng tiền trực tiếp như Critical).
    var critIssues = INT.check(db).filter(function (i) { return i.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN|DỒN)/.test(i.msg); });
    // 1 người 2 Mã NV (CCCD trùng giữa các nhân viên CÓ TRONG BẢNG LƯƠNG kỳ này) = trả lương 2 lần → chặn cứng như Mã NV trùng (core/identity.js)
    ID.payrollDuplicates(db, HRM.staffForPayroll(db, st.nam, st.thang).list.map(function (x) { return x["Mã nhân viên"]; })).forEach(function (d) { critIssues.push({ level: "Critical", msg: d.msg }); });
    if (critIssues.length) {
      alert("⛔ KHÔNG THỂ CHỐT — có " + critIssues.length + " lỗi dữ liệu NGHIÊM TRỌNG cần sửa trước:\n" +
        critIssues.slice(0, 10).map(function (i) { return "• " + i.msg; }).join("\n") + (critIssues.length > 10 ? "\n…" : "") +
        "\n\nVào Công ty & Sao lưu → Kiểm tra dữ liệu để xem đầy đủ và sửa, rồi tính lại.");
      return;
    }
    // Luôn tính lại từ dữ liệu mới nhất: tránh chốt nhầm bảng lương cũ đang hiển thị.
    // P0: so sánh TỪNG chỉ tiêu của TỪNG nhân viên (CLS.diffDetailed), không chỉ tổng thực lĩnh/số NV —
    // 2 người đổi lương ngược dấu nhau (A +1tr, B -1tr) làm tổng & số NV y nguyên nhưng bảng lương đã khác.
    var fresh = tinhLuong(st.nam, st.thang, undefined, method), now2 = CLS.totals(fresh), diffRows = CLS.diffDetailed(st.kq, fresh);
    if (diffRows.length) {
      st.kq = fresh; render();
      var dBody = h("div");
      dBody.appendChild(h("div", { class: "warn", text: "Dữ liệu đã thay đổi sau lần tính trước — " + diffRows.length + " chênh lệch theo từng nhân viên/chỉ tiêu (không chỉ tổng). App đã TÍNH LẠI: " + now2.soNV + " NV, tổng thực lĩnh " + fmt(now2.thucLinh) + ".\nHãy xem kỹ bảng dưới rồi bấm Chốt lần nữa." }));
      dBody.appendChild(simpleTable(diffRows));
      modal("⚠ Dữ liệu đã đổi trước khi chốt " + kyLabel(ky), dBody, function (close) { return [btn("Đóng", "", close)]; });
      return;
    }
    // P0 (BLOCKER — mục IV.2): ô chấm công không hợp lệ trong kỳ đang chốt phải chặn cứng, không chỉ cảnh báo.
    // Chạy TRƯỚC checklist mềm (preChotChecklist) để không hiện "tiếp tục được" rồi mới chặn cứng ngay sau.
    var badDay = 0;
    db.chamcong.forEach(function (r) { if (VAL.normKy(r["Kỳ"]) === ky) DAYS.forEach(function (d) { if (VAL.dayCell(d, r[d], ky).error) badDay++; }); });
    if (badDay) { alert("⛔ KHÔNG THỂ CHỐT — có " + badDay + " ô chấm công không hợp lệ (số âm, chữ lạ, ngày không có trong tháng) trong kỳ " + kyLabel(ky) + ".\nSửa ở Chấm công (hoặc xem Công ty & Sao lưu → Kiểm tra dữ liệu) rồi tính lại."); return; }
    // P0 (BLOCKER — mục IV.2 "thiếu mã lương/tham số thiết yếu"): mã BHXH không có trong Danh mục
    // bảo hiểm → cả khối BH (NLĐ + công ty) bị BỎ QUA HOÀN TOÀN cho người đó (engine.js), không chỉ
    // tính sai — công ty có thể thiếu nghĩa vụ đóng BHXH thật. Chặn cứng, không cho bấm qua.
    var gateBl = GATE.blockers(fresh);
    if (gateBl.length) {
      alert("⛔ KHÔNG THỂ CHỐT " + kyLabel(ky) + " — có lỗi chặn:\n" + gateBl.map(function (b) { return "• " + b.code + " — " + b.ten + " (" + b.count + "): " + b.items.slice(0, 2).join(" | "); }).join("\n") + "\n\nSửa cấu hình/dữ liệu rồi tính lại. Không có cách bỏ qua.");
      return;
    }
    var missingBH = fresh.canhbao.filter(function (w2) { return /chưa có trong Danh mục bảo hiểm/.test(w2); });
    if (missingBH.length) {
      alert("⛔ KHÔNG THỂ CHỐT — " + missingBH.length + " người có mã BHXH không có trong Danh mục bảo hiểm (toàn bộ BHXH/BHYT/BHTN của người đó đang bị BỎ QUA, không chỉ tính sai):\n" +
        missingBH.slice(0, 10).map(function (m) { return "• " + m; }).join("\n") + (missingBH.length > 10 ? "\n…" : "") +
        "\n\nSửa Mã BHXH hoặc bổ sung mã vào Danh mục bảo hiểm rồi tính lại.");
      return;
    }
    var leaveReview = C.leaveReconciliation.reconcile(db, ky);
    if (leaveReview.quotaBlockers.length) {
      alert("Không thể chốt: " + leaveReview.quotaBlockers.map(function (x) {
        return x.ma + (x.contract ? " · HĐ " + x.contract : "") + " vượt " + fmt(x.excess) + " ngày phép";
      }).join("; ") + ". Vào Chấm công → Đối chiếu đơn nghỉ và xử lý phần vượt theo loại nghỉ phù hợp.");
      return;
    }
    if (leaveReview.blockers.length) {
      alert("Không thể chốt: " + leaveReview.blockers.length + " ngày nghỉ có chênh lệch ảnh hưởng công tính lương. Vào Chấm công → Đối chiếu đơn nghỉ, sửa rồi tính lại.");
      return;
    }
    var revision = dbRev;
    var previous = CLS.history(db, ky).slice().sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0];
    var rows = PLG.reconciliation(previous?.kq?.bangluong, fresh.bangluong, payLines(), ky);
    var proceed = function () { preChotChecklist(fresh, function () { chotKyTiep(ky, fresh, now2, method, revision, leaveReview); }); };
    if (!rows.length) { proceed(); return; }
    var conflicting = rows.some(function (row) { return row["Chờ chi cần điều chỉnh"] > 0; });
    var body = h("div", {}, [
      h("p", { class: conflicting ? "warn" : "hint", text: conflicting ?
        "Chứng từ đang chờ chi vượt số còn phải trả. Hủy chứng từ chờ chi bị dư trong Sổ chứng từ trước khi chốt." :
        "Đối chiếu thực lĩnh với chứng từ đã chi. Khi lập chứng từ, chỉ lập phần cần chi thêm; khoản đã trả thừa cần xử lý riêng." }),
      simpleTable(rows)
    ]);
    modal("Đối chiếu tiền đã chi trước khi chốt lại", body, function (close) {
      return [btn("Đóng", "", close), conflicting ? null : btn("Tiếp tục kiểm tra chốt", "pri", function () { close(); proceed(); })];
    }, { wide: true });
  }
  function chotKyTiep(ky, fresh, now2, method, revision, leaveReview) {
    var w = fresh.canhbao.length;
    askText("Chốt " + kyLabel(ky), now2.soNV + " nhân viên · Tổng thực lĩnh " + fmt(now2.thucLinh) + " đ" +
      (w ? "\n⚠ Còn " + w + " cảnh báo dữ liệu chưa xử lý (xem trên màn hình Tính lương)." : "") +
      "\nSau khi chốt: lưu bảng lương + dữ liệu đầu vào của kỳ, khóa chấm công/sản lượng/thưởng/tạm ứng của kỳ.", { label: "Ghi chú (không bắt buộc)", okText: "🔒 Chốt kỳ lương" }, function (note) {
    if (w && !confirm("Xác nhận CHỐT dù còn " + w + " cảnh báo?")) return;
    if (kyChot(ky)) { alert(kyLabel(ky) + " đã được chốt (có thể do bấm 2 lần) — không chốt lại."); return; } // V9: chống chốt 2 lần
    if (kyStr() !== ky || !checkCloseTopup(fresh, ky)) return;
    if (revision !== dbRev) { alert("Dữ liệu đã thay đổi. Bấm Tính lương lại trước khi chốt."); return; }
    var snap = CLS.buildSnapshot(db, ky, fresh, fresh._staff, { note: note, leaveReview: leaveReview, payrollReports: payrollReportDetails(st.nam, st.thang, fresh.bangluong), buTheoNgay: method, quyChe: fresh.quyChe || quyChe(), engineVersion: E.ENGINE_VERSION, user: currentUser() });
    if (C.workflowApproval.mode(db) === "roles") {
      var approved = C.workflowApproval.ticket(db, ky);
      var approval = C.workflowApproval.approvalRecord(approved, snap.version);
      if (!approval || !C.workflowApproval.matchesFingerprint(db, snap, approval.digest)) {
        alert("Kỳ lương cần được người khác duyệt trên đúng dữ liệu hiện tại trước khi chốt."); return;
      }
      snap.input.approval = approval;
      snap.inputChecksum = CLS.checksum(snap.input);
    }
    CLS.close(db, snap); audit("Chốt kỳ lương", ky + " v" + snap.version + " — " + now2.soNV + " NV, thực lĩnh " + now2.thucLinh);
    if (!saveNow()) { CLS.rollbackClose(db, snap); db.auditlog.pop(); alert("CHỐT KHÔNG THÀNH CÔNG: chưa lưu được dữ liệu xuống đĩa. Kỳ lương vẫn ở trạng thái chưa chốt."); render(); return; }
    // Bản sao lưu SAU CHỐT KỲ: giữ vĩnh viễn, tự chép sang thư mục sao lưu thứ hai nếu đã chọn (main/storage.js)
    var bkChot = null; try { bkChot = store && store.backup ? store.backup("sau-chot-" + ky) : null; } catch (e) { bkChot = null; }
    var bs = bkChot && store.backupStatus ? store.backupStatus() : null;
    st.kq = null; render(); toast("Đã chốt và lưu " + kyLabel(ky) + " (phiên bản " + snap.version + ")" + (bkChot ? " · đã tạo bản sao lưu sau chốt" + (bs && bs.mirrorDir && !bs.lastMirrorError ? " và chép sang thư mục thứ hai" : "") : ""));
    if (bs && bs.mirrorDir && bs.lastMirrorError) alert("⚠ Đã chốt và sao lưu trên máy, nhưng KHÔNG chép được sang thư mục sao lưu thứ hai:\n" + bs.lastMirrorError + "\n\nCắm USB / kết nối ổ mạng rồi vào Công ty & Sao lưu → 'Chép sang thư mục thứ hai ngay'.");
    });
  }
  function viewPaidReconciliation(snap) {
    var previous = CLS.history(db, snap.ky).slice().sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0];
    var rows = PLG.reconciliation(previous ? previous.kq.bangluong : snap.kq.bangluong, snap.kq.bangluong, payLines(), snap.ky);
    var cols = rows[0] ? Object.keys(rows[0]) : [];
    if (cols.length) cols[cols.indexOf("Thực lĩnh tính lại")] = "Thực lĩnh đã chốt";
    rows = rows.map(function (row) {
      return Object.assign({}, row, { "Thực lĩnh đã chốt": row["Thực lĩnh tính lại"] });
    });
    modal("Đối chiếu tiền đã chi — " + kyLabel(snap.ky), simpleTable(rows, null, cols), function (close) {
      return [rows.length && can("export") ? btn("Xuất Excel", "", function () {
        saveXlsx("DoiChieuDaChi_" + snap.ky + ".xlsx", [{ name: "DoiChieu", rows: rows, cols: cols }]);
      }) : null, btn("Đóng", "", close)];
    }, { wide: true });
  }
  function showDeficitRegister() {
    var reg = PLG.deficitRegister(db), target = kyStr();
    var rows = reg.rows.map(function (r) {
      var remaining = Math.max(0, r.amount - r.recovered - r.pending);
      var actions = remaining > 0 && target > r.ky && !kyChot(target) && can("input.edit") ?
        btn("Lập khoản trừ nháp", "ghost", function () { prepareDeficit(r, target, remaining); }) : "";
      return { "Kỳ phát sinh": r.ky, "Mã NV": r.ma, "Họ và tên": r.name, "Còn thiếu lúc chốt": r.amount,
        "Đã trừ qua kỳ chốt": r.recovered, "Đang chờ chốt": r.pending, "Còn có thể xử lý": remaining, "Thao tác": actions };
    });
    var body = h("div", {}, [h("p", { class: "hint", text: "Chọn kỳ xử lý trên thanh Kỳ lương (" + target +
      "). Khoản thiếu chỉ được trừ khi có chứng từ Thưởng / Trừ do người dùng lập và kỳ xử lý được chốt." }), simpleTable(rows)]);
    if ((db._yearArchives || []).some(function (ref) { return ref.active && !Array.isArray(ref.deficits); })) body.appendChild(h("p", { class: "warn", text: "Có hồ sơ năm được lưu bằng bản cũ chưa có số dư theo dõi. Nếu cần đối chiếu khoản thiếu của năm đó, đưa hồ sơ về vùng đang làm rồi lưu trữ lại." }));
    if (reg.errors.length) body.appendChild(h("div", { class: "warn", text: reg.errors.join(" | ") }));
    modal("Theo dõi khoản khấu trừ còn thiếu", body, function (close) { return [btn("Đóng", "", close)]; }, { wide: true });
  }
  function prepareDeficit(debt, target, maximum) {
    var no = PLG.deficitVoucher(debt.ky, target);
    askText("Lập khoản trừ nháp", "Kỳ xử lý " + target + " · giới hạn " + fmt(maximum) + " đ.\nKiểm tra tại Thưởng / Trừ rồi tính lại.", { label: "Số tiền (đồng)", required: true }, function (value) {
      var amount = VAL.parseMoney(value), latest = PLG.deficitRegister(db).rows.find(function (r) { return r.ky === debt.ky && r.ma === debt.ma; });
      if (!latest || kyStr() !== target || kyChot(target) || !Number.isInteger(amount) || amount <= 0 || amount > latest.amount - latest.recovered - latest.pending) {
        alert("Số tiền hoặc kỳ xử lý không còn hợp lệ."); return;
      }
      var row = { "Ngày hạch toán": target + "-01", "Mã NV": debt.ma, "Số chứng từ": no,
        "Diễn giải": "Xử lý khoản khấu trừ còn thiếu kỳ " + debt.ky, "Trừ khác": amount };
      var plan = REPO.plan("insert", "psluong", null, row);
      if (!plan.ok) { alert(plan.msg); return; }
      if (!txn(["psluong"], function () { return !!commit(plan); })) { alert(lastTxnError); return; }
      st.tab = "psluong"; saveUi(); render();
      toast("Đã lập khoản trừ. Kiểm tra chứng từ rồi tính lại kỳ " + target + ".");
    });
  }

  function moChot(ky) {
    var c = kyChot(ky); if (!c || !need("payroll.reopen")) return;
    askText("Mở chốt " + kyLabel(ky) + " (phiên bản " + (c.version || 1) + ")", "Bản chốt hiện tại KHÔNG bị xóa — được chuyển vào lịch sử chốt kỳ.\nDữ liệu kỳ được mở khóa để sửa, tính lại và chốt thành phiên bản mới.", { label: "Lý do mở chốt", required: true, multiline: true, okText: "🔓 Mở chốt" }, function (reason) {
    // P1: reopen() có rollbackReopen() riêng khi saveNow() thất bại — chỉ cảnh báo, không chặn, nếu
    // không tạo được bản sao lưu phòng hộ thêm này.
    var bkOk = !!backupNow("truoc-mo-chot");
    var hrec = CLS.reopen(db, ky, reason, { user: currentUser() }); audit("Mở chốt kỳ lương", ky + " v" + hrec.version + " — " + reason);
    if (!saveNow()) { CLS.rollbackReopen(db, hrec); db.auditlog.pop(); alert("Không mở chốt được vì chưa lưu được dữ liệu xuống đĩa."); render(); return; }
    st.kq = null; render(); toast("Đã mở chốt " + kyLabel(ky) + " — bản cũ lưu trong lịch sử" + (bkOk ? "" : " · ⚠ KHÔNG tạo được bản sao lưu phòng hộ trước khi mở chốt — kiểm tra dung lượng đĩa"));
    });
  }
  function doiChieu(chot) {
    var ky = chot.ky.split("-");
    var hienTai = tinhLuong(Number(ky[0]), Number(ky[1]), chot.quyChe || "1.7", chot.buTheoNgay || false);
    var blockers = (hienTai.inputErrors || []).concat(hienTai.nhapLieuChuaLuu || []);
    if (blockers.length) {
      alert("Chưa thể đối chiếu kỳ " + kyLabel(chot.ky) + ":\n" + blockers.join("\n"));
      return;
    }
    var rows = CLS.diffDetailed(chot.kq, hienTai).map(function (r) {
      return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Chỉ tiêu": r["Chỉ tiêu"],
        "Đã chốt": r["Giá trị đang xem"], "Tính lại hôm nay": r["Giá trị tính lại"], "Chênh lệch": r["Chênh lệch"] };
    });
    var body = h("div");
    body.appendChild(h("div", { class: rows.length ? "warn" : "ok", text: rows.length ? rows.length + " chỉ tiêu thay đổi so với bảng lương đã chốt." : "Các chỉ tiêu đối chiếu khớp với bảng lương đã chốt." }));
    if (rows.length) body.appendChild(simpleTable(rows));
    modal("Đối chiếu " + kyLabel(chot.ky) + " với dữ liệu hiện tại", body, function (close) { return [btn("Đóng", "", close)]; });
  }
  // @screen tabKyLuong
