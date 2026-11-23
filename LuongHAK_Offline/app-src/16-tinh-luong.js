  // ---------- Tính lương ----------
  var COLS_FULL = ["Kỳ sản lượng chuyển", "SL kỳ trước (tấn)", "Lương SL kỳ trước", "Bù SL kỳ trước", "Mã NV", "Họ và tên", "Phòng ban", "Công chuẩn", "Tổng công", "Lương thời gian", "Lương phụ", "Sản lượng (tấn)", "Lương sản lượng", "Lương bù SL", "Lương bơm dăm", "Tiền tăng ca", "Phụ cấp", "Phụ cấp công tác", "Lương hỗ trợ", "Tiền cơm", "Thưởng", "Thu nhập khác", "Tổng thu nhập", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Trừ khác", "Tạm ứng", "Thực lĩnh", "Còn thiếu (thực lĩnh âm)"];
  var COLS_COMPACT = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Tổng thu nhập", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Tạm ứng", "Trừ khác", "Thực lĩnh", "Còn thiếu (thực lĩnh âm)"];
  var TEXTCOLS = { "Mã NV": 1, "Họ và tên": 1, "Phòng ban": 1 };

  // Cách bù lương sản lượng (α19 thêm 2 cách của công cụ phân bổ khối lượng; 2 cách cũ giữ nguyên)
  var BU_OPTS = [["to", "BÙ THEO ĐƠN GIÁ BÌNH QUÂN TỔ CỐ ĐỊNH NGÀY CÔNG THÁNG"], ["daihiep", "BÙ SẢN LƯỢNG THEO NGÀY"]];
  var BU_LEGACY = { "false": "Cách bù cũ theo THÁNG (không còn hỗ trợ — cần rà soát)", "true": "Cách bù cũ theo NGÀY liên tục (không còn hỗ trợ — cần rà soát)" };
  // Quy chế tính lương (R-68): "2026" = quy chế HAK Group (HAK, CNHAK, HAKQN — chủ sở hữu duyệt 11/10/2026) · "1.7" = cách tính trước đó (đối chiếu)
  var QC_OPTS = [["2026", "Quy chế lương HAK Group 2026"], ["1.7", "Cách tính cũ (engine 1.7 — để đối chiếu)"]];
  function quyChe() { var v = congTy()["Quy chế tính lương"]; return v === "1.7" ? "1.7" : "2026"; }
  /** Chi tiết 2 quy chế tính lương (đúng như engine.js — các mục C1…C10). */
  var QC_RULES = [
    ["Công chuẩn", "Số ngày của tháng − “Số ngày giảm trừ” khai ở Danh mục → Mã lương (VD TG3: 30 − 4 = 26). Mã “tất cả ngày CN” = số ngày − số Chủ nhật.", "Trừ Chủ nhật rồi trừ tiếp số sau dấu “-” trong cột Cách tính (VD tháng 30 ngày: 30 − 4 CN − 4 = 22).", "C2"],
    ["Lương thời gian", "Trả đủ số công đi làm, KHÔNG cắt ở công chuẩn: đơn giá ngày × công thực tế.", "Công tính lương = nhỏ hơn giữa công thực tế và công chuẩn (cắt ở công chuẩn).", "C1"],
    ["Công nhân sản phẩm (SP)", "Lương thời gian chỉ tính cho công lễ + công phép. Mã lương chọn “Loại công thức” = TG_LE_TANGCA thì tính lễ + tăng ca.", "Tính theo công thời gian thông thường.", "C3"],
    ["Bù theo đơn giá bình quân tổ", "Tiền của tổ chỉ gồm sản lượng (tấn × đơn giá khoán), không cộng tiền bơm dăm.", "Tiền của tổ gồm cả sản lượng và bơm dăm.", "C4"],
    ["Công nhật (CN1, CN2)", "Tăng ca tính theo công thức của mã tăng ca (nhân hệ số); công chuẩn = số ngày − Số ngày giảm trừ (CN2: 30 − 4 = 26) cho tăng ca, phụ cấp, hỗ trợ. Lương vẫn = đơn giá × công.", "Công chuẩn = công thực tế.", "C5, C9"],
    ["Phụ cấp để trống “Cách tính”", "Chia theo công chuẩn (không tính phép, tăng ca): đủ công thì đủ tiền.", "Hiểu là phụ cấp cố định.", "C6"],
    ["Bảo hiểm — lương đóng", "Chỉ lấy “Lương cơ bản” khai ở phụ lục hợp đồng. Có mã BHXH mà chưa khai Lương cơ bản thì KHÔNG tính BH / truy thu và có cảnh báo.", "Không có Lương cơ bản thì lấy lương thỏa thuận làm lương đóng BH.", "C8"],
    ["Mã tăng ca TC5", "Công TC5 (ca vị trí khác) đã trả riêng nên KHÔNG cộng vào công tính lương thời gian.", "Cộng vào tổng công.", "C10"],
    ["KPCĐ người lao động đóng", "Trừ riêng, không gộp vào “BH NLĐ đóng” — áp dụng cho CẢ HAI quy chế.", "Như bên cạnh.", "—"]
  ];
  function xemQuyChe(cur) {
    var body = h("div", { class: "bu-explain" });
    body.appendChild(h("p", { text: "Quy chế được chọn áp dụng cho mọi kỳ CHƯA chốt của dữ liệu này; kỳ đã chốt giữ nguyên số đã lưu. Đang chọn: " + qcLabel(cur) + ". Dùng “Cách tính cũ” chỉ để đối chiếu số với bản trước." }));
    var t = h("table", { class: "tbl" }), hd = h("tr");
    ["Nội dung", "Quy chế lương HAK Group 2026", "Cách tính cũ (engine 1.7)", "Mã"].forEach(function (c) { hd.appendChild(h("th", { text: c })); });
    t.appendChild(h("thead", {}, [hd]));
    var tb = h("tbody"); QC_RULES.forEach(function (r) { var tr = h("tr"); r.forEach(function (c, i) { tr.appendChild(h("td", { text: c, style: i === 0 ? "font-weight:600" : "" })); }); tb.appendChild(tr); });
    t.appendChild(tb); body.appendChild(h("div", { class: "tw" }, [t]));
    body.appendChild(h("div", { class: "hint", text: "Số tiền / tỷ lệ / ngưỡng cụ thể của từng nhân viên nằm ở Danh mục (Mã lương, Phụ cấp, Tăng ca, Bảo hiểm…) và Cài đặt → Công thức lương. Muốn xem số tính ra của từng người: bấm vào tên trong bảng lương → “📐 Xem cách tính”." }));
    modal("Quy chế tính lương", body, function (close) { return [btn("Đóng", "", close)]; });
  }
  function qcLabel(v) { var o = QC_OPTS.filter(function (x) { return x[0] === String(v); })[0]; return o ? o[1] : "Cách tính cũ (trước quy chế 2026)"; }
  function buLabel(v) { var o = BU_OPTS.filter(function (x) { return x[0] === String(v); })[0]; return o ? o[1] : (BU_LEGACY[String(v)] || String(v)); }
  /** Nhân sự tính lương của kỳ = HRM.staffForPayroll + quy tắc "hợp đồng đã hết hạn từ trước kỳ thì không tính bảo hiểm" (ui/leave-audit.js, v2.1.4). Mọi nơi trong app dùng hàm này. */
  function staffPay(nam, thang) {
    var sp = HRM.staffForPayroll(db, nam, thang), LA = window.HAKUI && window.HAKUI.leaveAudit;
    if (LA) LA.applyExpiredNoBH(db, nam, thang, sp);
    return sp;
  }
  function tinhLuong(nam, thang, qcDung, phuongPhapBu) {
    if (phuongPhapBu === undefined) phuongPhapBu = st.bu;
    nam = nam || st.nam; thang = thang || st.thang;
    var invalid = C.inputSafety.problems(db, kyKey(nam, thang));
    if (invalid.length) return { ky: kyKey(nam, thang), bangluong: [], bhxh: [], tncn: [], canhbao: invalid, inputErrors: invalid };
    var reviewMessage = C.inputReview.message(db, kyKey(nam, thang));
    if (reviewMessage) return { ky: kyKey(nam, thang), bangluong: [], bhxh: [], tncn: [], canhbao: ["Còn dữ liệu Nháp: " + reviewMessage + ". Bấm Lưu để tính lương tại bảng nhập liệu."], nhapLieuChuaLuu: [reviewMessage] };
    var sp = staffPay(nam, thang);
    // α19: phiếu cân ghi Mã phòng ban → chia đều cho tổ (như công cụ phân bổ khối lượng) trước khi tính
    var slK = HRM.sanLuongKy(db, nam, thang, "sanluong"), bdK = HRM.sanLuongKy(db, nam, thang, "bandam");
    var qc = qcDung || quyChe(), carry;
    try { carry = C.productionCarry.prepare(db, kyKey(nam, thang), sp.list, slK.rows, phuongPhapBu, { quyChe: qc }); }
    catch (e) { return { ky: kyKey(nam, thang), bangluong: [], bhxh: [], tncn: [], canhbao: [e.message], inputErrors: [e.message] }; }
    sp.list = carry.staff;
    var kq = E.tinhBangLuong(Object.assign({}, carry.data, { bandam: bdK.rows }), nam, thang, phuongPhapBu, { quyChe: qc, suppressProduction: carry.suppress });
    C.productionCarry.annotate(kq, carry.pay);
    slK.alloc.warnings.forEach(function (w) { kq.canhbao.push("Sản lượng — " + w); });
    // α22: người có đơn nghỉ đã duyệt (mọi loại) tự không nhận phiếu ngày nghỉ — ghi rõ để kế toán thấy
    var dmN = function (x) { return x.slice(8, 10) + "/" + x.slice(5, 7); };
    [["Sản lượng", slK], ["Ban dăm xuất hàng", bdK]].forEach(function (p) { (p[1].alloc.nghi || []).forEach(function (x) {
      if (x.khongCong) kq.canhbao.push(p[0] + " — " + x.hoTen + " (" + x.ma + "): công = 0 / trống " + x.ngay.length + " ngày có phiếu của tổ (" + x.ngay.slice(0, 8).map(dmN).join(", ") + (x.ngay.length > 8 ? "…" : "") + ") — coi như nghỉ nguyên ngày, KHÔNG chia sản lượng các ngày này; kiểm tra lại chấm công");
      else kq.canhbao.push(p[0] + " — " + x.hoTen + " (" + x.ma + "): " + x.loai + " (đơn đã duyệt) — không chia " + x.ngay.length + " ngày cân " + dmN(x.ngay[0]) + (x.ngay.length > 1 ? " → " + dmN(x.ngay[x.ngay.length - 1]) : ""));
    }); });
    bdK.alloc.warnings.forEach(function (w) { kq.canhbao.push("Ban dăm xuất hàng — " + w); });
    kq.cheDoBu = String(phuongPhapBu); kq.quyChe = qc;
    var by = {}; sp.list.forEach(function (x) { by[x["Mã nhân viên"]] = x; });
    kq.bangluong.forEach(function (r) { var x = by[r["Mã NV"]] || {}; r["HTTT"] = x["HTTT"] || ""; r["Số tài khoản"] = x["Số tài khoản"] || ""; r["Ngân hàng"] = x["Tên Ngân hàng"] || ""; r["Người phụ thuộc"] = x["Người phụ thuộc"] || 0; r["Số HĐLĐ"] = x["Số HĐLĐ"] || ""; r["Mã PB"] = x["Mã PB"] || ""; });
    // V9.2: truy ngược người phụ thuộc được giảm trừ trong kỳ (chỉ tên — không đưa CCCD/MST vào bản chốt)
    var ixNPT = HRM.buildIndex ? HRM.buildIndex(db) : null, bDau = nam + "-" + ("0" + thang).slice(-2) + "-01", bCuoi = nam + "-" + ("0" + thang).slice(-2) + "-31";
    kq.bangluong.forEach(function (r) { if (r._ct) r._ct.nguoiPhuThuoc = HRM.dsNguoiPhuThuoc(db, r["Mã NV"], bDau, bCuoi, ixNPT).map(function (x) { return x["Họ tên nhân thân"] || ""; }).join("; "); });
    kq.loiTyLeBH = GATE.insuranceRateIssues({ kq: kq, staff: sp.list, catalog: E.hieuLuc(db.dm_baohiem, "Mã bảo hiểm", nam, thang) }); // tỷ lệ BH NLĐ để trống ở mã đang dùng → chặn chốt (BH_TY_LE_THIEU)
    var productionIssues = HRM.productionPayrollIssues(slK, bdK, kq.bangluong);
    if (productionIssues.length) kq.inputErrors = (kq.inputErrors || []).concat(productionIssues);
    kq.canhbao = sp.warn.concat(kq.canhbao, productionIssues); kq.ky = nam + "-" + ("0" + thang).slice(-2);
    var leave = C.leaveReconciliation.reconcile(db, kq.ky);
    kq.canhbao = kq.canhbao.filter(function (message) { return message.indexOf(HRM.LEAVE_TAG) < 0; });
    leave.entries.filter(function (entry) { return entry.status !== "Khớp"; }).forEach(function (entry) {
      kq.canhbao.push(entry.ma + " · " + fmtDate(entry.date) + ": " + entry.status);
    });
    leave.warnings.forEach(function (item) {
      kq.canhbao.push(item.ma + (item.contract ? " · HĐ " + item.contract : "") + ": phép vượt " + fmt(item.excess) + " ngày theo Quyền lợi phép (" + fmt(item.used) + "/" + fmt(item.limit) + ").");
    });
    Object.defineProperty(kq, "_staff", { value: sp.list, enumerable: false });
    return kq;
  }
