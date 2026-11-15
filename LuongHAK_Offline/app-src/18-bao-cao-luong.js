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
  function tkChiPhi(maPB, tenPB, catalog) {
    var r = catalog.filter(function (x) { return (maPB && x["Mã phòng ban"] === maPB) || (!maPB && tenPB && x["Tên phòng ban"] === tenPB); })[0];
    if (r && r["Tài khoản chi phí"]) return String(r["Tài khoản chi phí"]);
    if (r && /^02|sản xuất/i.test((r["Mã khối"] || "") + " " + (r["Tên khối"] || ""))) return "622";
    return "642";
  }
  var BCL = [
    ["cong", "🗓 Tổng hợp công"], ["sanluong", "⚖ Phân bổ sản lượng"],
    ["baohiem", "🛡 Báo cáo bảo hiểm"], ["hachtoan", "📒 Bảng hạch toán"], ["sosanh", "↔ So sánh với kỳ trước"],
    ["thang", "📅 Lương 12 tháng"], ["nvnam", "👤 Thu nhập năm theo NV"], ["thuenam", "🧾 Thuế TNCN cả năm"]
  ];
  var BCL_NAM = { thang: 1, nvnam: 1, thuenam: 1 };

  function bcCong(nam, thang) {
    var ky = kyKey(nam, thang), m = {};
    db.chamcong.filter(function (r) { return r["Kỳ"] === ky; }).forEach(function (r) {
      var ma = r["Mã NV"]; if (!ma) return;
      var o = m[ma] || (m[ma] = { "Mã NV": ma, "Họ và tên": tenNV(ma), "Công BT": 0, "Phép năm (PN)": 0, "Công lễ (CL)": 0, "Di chuyển/Trung chuyển": 0, "Tổng công tính lương": 0, "Công tăng ca": 0, "Công Chủ nhật": 0, "Ngày cơm (CC)": 0, "Ngày có nhãn": "" });
      var ht = String(r["Hình thức công"] || "BT").trim().toUpperCase(), sum = 0, nh = {};
      for (var d = 1; d <= 31; d++) {
        var t = E.tachCong(r[("0" + d).slice(-2)]); sum += t.soCong; if (t.nhan) nh[t.nhan] = (nh[t.nhan] || 0) + 1;
        if (ht !== "CC" && !/TC/.test(ht) && t.soCong && new Date(nam, thang - 1, d).getDay() === 0 && new Date(nam, thang - 1, d).getMonth() === thang - 1) o["Công Chủ nhật"] += t.soCong;
      }
      if (ht === "CC") o["Ngày cơm (CC)"] += sum;
      else if (/TC/.test(ht)) { o["Công tăng ca"] += sum; o["Tổng công tính lương"] += sum; }
      else {
        o["Tổng công tính lương"] += sum;
        if (ht === "PN") o["Phép năm (PN)"] += sum; else if (ht === "CL") o["Công lễ (CL)"] += sum; else if (ht === "DC" || ht === "TRCH") o["Di chuyển/Trung chuyển"] += sum; else o["Công BT"] += sum;
      }
      var lb = Object.keys(nh).map(function (k) { return k + "×" + nh[k]; }); if (lb.length) o["Ngày có nhãn"] = (o["Ngày có nhãn"] ? o["Ngày có nhãn"] + ", " : "") + lb.join(", ");
    });
    return addTotal(Object.keys(m).sort().map(function (k) { return m[k]; }));
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
  function bcSanLuong(nam, thang, loai, allocation) {
    var al = allocation || pbAlloc(nam, thang, loai), dv = loai === "bandam" ? "Số xe" : "Sản lượng (tấn)", r3_ = function (x) { return Math.round(x * 1000) / 1000; };
    var pb = Object.keys(al.byDept).sort().map(function (d) { var x = al.byDept[d], o = { "Mã phòng ban": d, "Tên phòng ban": x.tenPB, "Số nhân sự": al.empCount[d] || 0 }; o[dv] = r3_(x.total); o["Chưa phân bổ"] = r3_(x.unallocated); return o; });
    var nv = Object.values(al.byEmpDept).sort(function (a, b) { return a.maPB < b.maPB ? -1 : a.maPB > b.maPB ? 1 : b.total - a.total; })
      .map(function (e) { var o = { "Mã phòng ban": e.maPB, "Mã NV": e.ma, "Họ và tên": e.hoTen, "Số ngày có SL": Object.keys(e.byDay).length }; o[dv] = r3_(e.total); return o; });
    var audit = al.audit.map(function (a) { return { "Phiếu": a.phieu, "Ngày": a.ngay, "Mã phòng ban": a.maPB, "KL / số xe": r3_(a.kl), "Số người nhận": a.soNguoi, "Mỗi người": a.share ? r3_(a.share) : "", "Người nhận": a.names.join(", "), "Ghi chú": a.note }; });
    var chuaGan = al.chuaGan.map(function (r) { return { "Phiếu cân": r["Phiếu cân"] || "", "Ngày cân": r["Ngày cân"] || "", "Biển số": r["Biển số"] || "", "KL": E.num(r["KL hàng (Tấn)"]) }; });
    function employeeLabels(people) {
      return people.map(function (e) { return e.ma + " — " + e.hoTen; }).join(", ");
    }
    var attendanceReview = al.attendanceReview.map(function (r) {
      return { "Phiếu cân": r.phieu, "Ngày cân": r.ngay, "Mã phòng ban": r.maPB, "KL / số xe": r.kl,
        "App chia (người)": r.soNguoi, "Người được chia": employeeLabels(r.recipients) || "Không có",
        "Người không được chia": employeeLabels(r.excluded) || "Không có", "NV vắng trên phiếu": r.vang,
        "Người cần kiểm tra công": employeeLabels(r.employees) };
    });
    return { pb: addTotal(pb), nv: addTotal(nv), audit: audit, attendanceReview: attendanceReview, chuaGan: chuaGan, warnings: al.warnings, al: al };
  }
  /** File Excel "Phân bổ khối lượng tính lương" — bố cục như công cụ (ExcelJS). */
  function exportPBKL(nam, thang) {
    if (!need("export", "xuất dữ liệu ra Excel")) return;
    if (!window.ExcelJS || !window.HAKUi) { alert("Thiếu thư viện Excel (ExcelJS)"); return; }
    var sl = pbAlloc(nam, thang, "sanluong"), bd = pbAlloc(nam, thang, "bandam"), src = kqKy(nam, thang), dmL = {};
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
    var meta = { donVi: congTy()["Tên công ty"] || "", thang: "Tháng " + thang + "/" + nam, nguoiLap: session ? session.hoTen : "" };
    var attendanceReview = [["sanluong", sl, "Sản lượng"], ["bandam", bd, "Bơm dăm"]].flatMap(function (item) {
      return bcSanLuong(nam, thang, item[0], item[1]).attendanceReview.map(function (r) {
        return Object.assign({ "Loại": item[2] }, r);
      });
    });
    var wb = window.HAKUi.pbkl.report(window.ExcelJS, { sl: sl, bd: bd, raw: { sl: sl.raw, bd: bd.raw },
      luong: rows.length ? { rows: rows, coChe: coChe, note: (src.chot ? "Số liệu lấy từ bảng lương ĐÃ CHỐT." : "Kỳ CHƯA chốt — số liệu tính tạm.") + " Số công = công BT trong chấm công." } : null,
      daihiepDetail: daihiepDetail, attendanceReview: attendanceReview,
      ctx: { coChe: coChe, chot: src.chot, giaKl: n0(dmL["Số tiền khoán"]), giaBd: n0(((catalog.dm_luong || []).filter(function (r) { return r["Mã lương"] === "BD"; })[0] || {})["Số tiền khoán"]), mucSan: n0(dmL["Đơn giá bù lương"]), nguong: n0(dmL["Ngưỡng công bù theo tổ"]), soNgay: new Date(nam, thang, 0).getDate() } }, meta);
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
  function bcHachToan(r, nam, thang) {
    var ky = thang + "/" + nam, rows = [], cp = {}, cpBH = {}, sum = function (f) { return r.bangluong.reduce(function (a, x) { return a + n0(x[f]); }, 0); };
    // Q-19 (R-53): chi phí người điều chuyển chia theo công ở từng phòng → đúng TK chi phí của từng phòng
    var period = kyKey(nam, thang), snapshot = kyChot(period);
    var catalog = snapshot && snapshot.input && snapshot.input.danhmuc && snapshot.input.danhmuc.dm_phongban;
    var fallback = !!snapshot && !Array.isArray(catalog);
    if (!Array.isArray(catalog)) catalog = db.dm_phongban || [];
    var cost = ALLOC.costByKey(r, function (maPB, tenPB) { return tkChiPhi(maPB, tenPB, catalog); });
    cp = cost.luong; cpBH = cost.bh;
    var add = function (no, co, dg, tien) { if (Math.round(tien)) rows.push({ "Kỳ": ky, "TK Nợ": no, "TK Có": co, "Diễn giải": dg, "Số tiền": Math.round(tien) }); };
    Object.keys(cp).sort().forEach(function (tk) { add(tk, "334", "Tính lương phải trả kỳ " + ky, cp[tk]); });
    Object.keys(cpBH).sort().forEach(function (tk) { add(tk, "338", "Trích BHXH/BHYT/BHTN/KPCĐ (DN đóng) kỳ " + ky, cpBH[tk]); });
    add("334", "338", "Khấu trừ BH vào lương (NLĐ đóng) kỳ " + ky, sum("BH trừ NLĐ"));
    add("334", "3382", "Khấu trừ KPCĐ vào lương (NLĐ đóng) kỳ " + ky, sum("KPCĐ trừ NLĐ"));
    add("334", "338", "Truy thu BH (chưa đủ ngưỡng công) kỳ " + ky, sum("Truy thu BH"));
    add("334", "3335", "Khấu trừ thuế TNCN kỳ " + ky, sum("Thuế TNCN"));
    add("334", "141", "Trừ tạm ứng lương kỳ " + ky, sum("Tạm ứng"));
    add("334", "1388", "Các khoản trừ khác kỳ " + ky, sum("Trừ khác"));
    var phatSinh334 = rows.filter(function (x) { return x["TK Nợ"] === "334"; }).reduce(function (a, x) { return a + x["Số tiền"]; }, 0);
    var paid = payLines().filter(function (line) { return line["Kỳ"] === period && line["Trạng thái"] === PLG.TT.TRA; });
    var byVoucher = new Map(), daChi = 0;
    paid.forEach(function (line) {
      var account = line["Hình thức"] === PLG.HT.CK ? "1121" : "1111";
      var no = line["Số chứng từ"], key = JSON.stringify([no, account]), v = byVoucher.get(key) || { no: no, account: account, amount: 0 };
      v.amount += n0(line["Số tiền"]); daChi += n0(line["Số tiền"]); byVoucher.set(key, v);
    });
    byVoucher.forEach(function (v) { add("334", v.account, "Đã chi theo chứng từ " + v.no, v.amount); });
    return { rows: rows, lech: sum("Tổng thu nhập") - phatSinh334 - sum("Thực lĩnh"),
      phaiTra: sum("Thực lĩnh"), daChi: daChi, conLai: sum("Thực lĩnh") - daChi, fallback: fallback };
  }
  function bcSoSanh(nam, thang) {
    var pn = thang === 1 ? nam - 1 : nam, pt = thang === 1 ? 12 : thang - 1;
    var A = kqKy(pn, pt), B = kqKy(nam, thang), a = {}, b = {}, rows = [];
    A.kq.bangluong.forEach(function (x) { a[x["Mã NV"]] = x; }); B.kq.bangluong.forEach(function (x) { b[x["Mã NV"]] = x; });
    Object.keys(b).concat(Object.keys(a).filter(function (k) { return !b[k]; })).forEach(function (k) {
      var x = a[k], y = b[k], ta = x ? n0(x["Thực lĩnh"]) : 0, tb = y ? n0(y["Thực lĩnh"]) : 0;
      rows.push({ "Mã NV": k, "Họ và tên": (y || x)["Họ và tên"], "Công kỳ trước": x ? n0(x["Tổng công"]) : 0, "Công kỳ này": y ? n0(y["Tổng công"]) : 0,
        "Thực lĩnh kỳ trước": ta, "Thực lĩnh kỳ này": tb, "Chênh lệch": tb - ta, "Tỷ lệ": ta ? Math.round((tb - ta) / ta * 1000) / 10 + "%" : "", "Ghi chú": !x ? "Mới" : (!y ? "Không còn trong kỳ này" : "") });
    });
    rows.sort(function (p, q) { return Math.abs(q["Chênh lệch"]) - Math.abs(p["Chênh lệch"]); });
    return { rows: addTotal(rows), prev: kyLabel(kyKey(pn, pt)) + (A.chot ? " (đã chốt)" : " (tạm tính)"), cur: kyLabel(kyKey(nam, thang)) + (B.chot ? " (đã chốt)" : " (tạm tính)") };
  }
  function chotTrongNam(nam) { return db.kyluong.filter(function (k) { return k.ky.slice(0, 4) === String(nam); }).sort(function (a, b) { return a.ky < b.ky ? -1 : 1; }); }
  function bc12Thang(nam) {
    var rows = [];
    for (var t = 1; t <= 12; t++) {
      var c = kyChot(kyKey(nam, t)), o = { "Tháng": t + "/" + nam, "Trạng thái": c ? "Đã chốt" : "Chưa chốt" };
      var bl = c ? c.kq.bangluong : [], bh = c ? c.kq.bhxh : [], s = function (f) { return bl.reduce(function (a, x) { return a + n0(x[f]); }, 0); };
      o["Số NV"] = bl.length; o["Tổng thu nhập"] = s("Tổng thu nhập"); o["BH NLĐ đóng"] = s("BH trừ NLĐ") + s("Truy thu BH");
      o["KPCĐ NLĐ đóng"] = s("KPCĐ trừ NLĐ");
      o["BH công ty đóng"] = bh.reduce(function (a, x) { return a + n0(x["Cộng BH công ty đóng"]); }, 0); o["Thuế TNCN"] = s("Thuế TNCN");
      o["Tạm ứng"] = s("Tạm ứng"); o["Thực lĩnh"] = s("Thực lĩnh"); o["Tổng chi phí lương (TN + BH công ty)"] = o["Tổng thu nhập"] + o["BH công ty đóng"];
      rows.push(o);
    }
    return addTotal(rows, "CẢ NĂM");
  }
  function bcNVNam(nam, field) {
    var m = {}, ks = chotTrongNam(nam);
    ks.forEach(function (k) {
      var t = +k.ky.slice(5);
      k.kq.bangluong.forEach(function (x) {
        var o = m[x["Mã NV"]] || (m[x["Mã NV"]] = (function () { var r = { "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"] }; for (var i = 1; i <= 12; i++) r["T" + i] = ""; r["Cả năm"] = 0; return r; })());
        o["T" + t] = n0(x[field]); o["Cả năm"] += n0(x[field]);
      });
    });
    return addTotal(Object.keys(m).sort().map(function (k) { return m[k]; }));
  }
  function bcThueNam(nam) {
    var m = {};
    chotTrongNam(nam).forEach(function (k) {
      k.kq.bangluong.forEach(function (x) {
        var o = m[x["Mã NV"]] || (m[x["Mã NV"]] = { "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"], "Số tháng có lương": 0, "Tổng thu nhập": 0, "Tiền cơm (không chịu thuế)": 0, "BH bắt buộc NLĐ đóng": 0, "KPCĐ NLĐ đóng": 0, "Người phụ thuộc (tối đa)": 0, "Thuế TNCN đã khấu trừ": 0 });
        o["Số tháng có lương"]++; o["Tổng thu nhập"] += n0(x["Tổng thu nhập"]); o["Tiền cơm (không chịu thuế)"] += n0(x["Tiền cơm"]);
        o["BH bắt buộc NLĐ đóng"] += n0(x["BH trừ NLĐ"]); o["KPCĐ NLĐ đóng"] += n0(x["KPCĐ trừ NLĐ"]); o["Thuế TNCN đã khấu trừ"] += n0(x["Thuế TNCN"]);
        o["Người phụ thuộc (tối đa)"] = Math.max(o["Người phụ thuộc (tối đa)"], n0(x["Người phụ thuộc"]));
      });
    });
    return addTotal(Object.keys(m).sort().map(function (k) { return m[k]; }));
  }

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
    var nam = st.nam, thang = st.thang, info = function (t, cls) { card.appendChild(h("div", { class: cls || "hint", html: t })); };
    if (BCL_NAM[st.bcl]) {
      var ks = chotTrongNam(nam);
      info("Năm <b>" + nam + "</b> (đổi năm ở ô Kỳ lương phía trên). Báo cáo cả năm chỉ cộng các <b>kỳ đã chốt</b>: " + (ks.length ? ks.map(function (k) { return "T" + (+k.ky.slice(5)); }).join(", ") : "chưa có kỳ nào") + ".", ks.length ? "hint" : "warn");
    } else {
      var src = st.bcl === "cong" || st.bcl === "sanluong" ? null : kqKy(nam, thang);
      if (src) info(src.chot ? "🔒 Số liệu kỳ <b>" + thang + "/" + nam + "</b> lấy từ bảng lương <b>đã chốt</b>." : "⚠ Kỳ <b>" + thang + "/" + nam + "</b> <b>chưa chốt</b> — số liệu tính tạm từ dữ liệu hiện tại, có thể thay đổi.", src.chot ? "locked" : "warn");
    }
    if (st.bcl === "cong") { var r2 = FX(bcCong(nam, thang)); info("Tổng hợp từ bảng chấm công kỳ " + thang + "/" + nam + ". Ngày có nhãn: VD QC×7 = 7 ngày công tác QC."); card.appendChild(simpleTable(r2)); sheets.push({ name: "TongHopCong", rows: r2 }); }
    else if (st.bcl === "sanluong") {
      st.bclLoai = st.bclLoai || "sanluong";
      var ls = h("select"); [["sanluong", "Sản lượng gỗ (tấn)"], ["bandam", "Bơm dăm (số xe)"]].forEach(function (o) { ls.appendChild(h("option", { value: o[0], text: o[1] })); });
      ls.value = st.bclLoai; ls.addEventListener("change", function () { st.bclLoai = ls.value; render(); }); tools.appendChild(ls);
      var r3 = bcSanLuong(nam, thang, st.bclLoai);
      var receiptRows = r3.al.attendanceReview.flatMap(function (receipt, index) {
        return receipt.employees.map(function (e) {
          return { index: index, "Mã NV": e.ma, "Họ và tên": e.hoTen + " " + receipt.phieu,
            "Phòng ban": HRM.refName(db, "dm_phongban", receipt.maPB) || receipt.maPB };
        });
      });
      tools.appendChild(btn("⬇ Xuất bộ phân bổ toàn kỳ", "", function () { exportPBKL(nam, thang); },
        "Toàn kỳ: sản lượng và bơm dăm, không áp dụng bộ lọc đang xem"));
      info("Excel/PDF đang xem xuất loại đã chọn và giữ bộ lọc của bảng đối chiếu chấm công. Bộ phân bổ toàn kỳ xuất cả sản lượng và bơm dăm.");

      info("Phiếu ghi <b>Mã phòng ban</b> (tổ) → chia đều cho người của tổ đang làm việc ngày cân, trừ người trong <b>NV vắng</b> (như công cụ phân bổ khối lượng). Phiếu ghi <b>Mã NV</b> → giao trực tiếp. Cách bù lương đang chọn ở Tính lương: <b>" + esc(buLabel(st.bu)) + "</b>.");
      if (r3.warnings.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Cần kiểm tra (" + r3.warnings.length + "):</b><br>" + r3.warnings.map(esc).join("<br>") }));
      card.appendChild(h("div", { class: "fh", text: "Theo phòng ban (tổ)" })); card.appendChild(simpleTable(r3.pb));
      card.appendChild(h("div", { class: "fh", text: "Theo công nhân" })); card.appendChild(simpleTable(r3.nv));
      card.appendChild(h("div", { class: "fh", text: "Đối soát từng phiếu" })); card.appendChild(simpleTable(r3.audit));
      if (r3.chuaGan.length) { card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + r3.chuaGan.length + " phiếu cân chưa có Mã NV hoặc Mã phòng ban</b> — chưa được tính lương cho ai:" })); card.appendChild(simpleTable(r3.chuaGan)); }
      if (r3.attendanceReview.length) {
        var reviewFilter = reportFilterBar(receiptRows, { compact: true, showEmployees: true, screenId: "phieu-doi-chieu", searchPlaceholder: "Tìm phiếu, mã hoặc tên người cần kiểm tra…" });
        var matchingReceipts = new Set(FX(receiptRows).map(function (row) { return row.index; }));
        var visibleReview = r3.attendanceReview.filter(function (_, index) { return matchingReceipts.has(index); });
        card.appendChild(h("div", { class: "fh", text: "Phiếu cần đối chiếu chấm công" }));
        card.appendChild(h("p", { class: "hint", text: "Người có ô chấm công ghi bằng 0 hoặc để trống và chưa có tên hoặc mã trong NV vắng. Kiểm tra chấm công trước khi điều chỉnh." }));
        card.appendChild(reviewFilter);
        if (Object.keys(rfSkip).length) card.appendChild(h("div", { class: "hint", text: "Tiêu chí không áp dụng cho bảng này: " + Object.keys(rfSkip).join(", ") }));
        var reviewTable = visibleReview.length ? simpleTable(visibleReview) : h("div", { class: "empty", text: "Không có phiếu khớp bộ lọc." });
        reviewTable.classList.add("attendance-review-table");
        card.appendChild(reviewTable);
        sheets.push({ name: "DoiChieuChamCong", rows: visibleReview });
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
      exportSheetsPdf({ title: title, ky: BCL_NAM[st.bcl] ? "Năm " + nam : "Kỳ " + thang + "/" + nam, trangThai: src && !BCL_NAM[st.bcl] ? (src.chot ? "Đã chốt" : "Chưa chốt — tính tạm") : "", loc: st.bcl === "sanluong" ? RF.describe(st.rf).map(function (label) { return "Đối chiếu chấm công: " + label; }) : RF.describe(st.rf), sheets: sheets }, "BaoCao_" + slug(title) + "_" + (BCL_NAM[st.bcl] ? nam : kyKey(nam, thang)) + ".pdf");
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
      saveXlsx("BaoCao_" + slug(title) + "_" + (BCL_NAM[st.bcl] ? nam : kyKey(nam, thang)) + ".xlsx", sh);
    }));
    w.appendChild(card); return w;
  }

  /**
   * Đối chiếu lương Power Query (Master Prompt V3 mục XVII): nhập 1 bảng lương Excel đã xác nhận
   * đúng (công cụ cũ / Power Query) → so với kết quả app, theo TỪNG nhân viên, TỪNG chỉ tiêu — không
   * chỉ so tổng công ty. Chỉ ĐỌC, không sửa/tính lại dữ liệu.
   */
  function tabDoiChieu() {
    var w = h("div"), src = kqKy(st.nam, st.thang);
    var card = h("div", { class: "card" });
    card.appendChild(h("div", { class: "hint", html: "Nhập bảng lương Excel <b>đã xác nhận đúng</b> (vd file công cụ cũ, Power Query) để so với kết quả app — theo từng nhân viên, từng chỉ tiêu, không chỉ so tổng. App tự nhận cột theo tiêu đề (không phân biệt hoa/thường/dấu); cột lạ sẽ báo rõ để biết đã bỏ qua, không âm thầm bỏ sót." }));
    if (!RC) { card.appendChild(h("div", { class: "warn", text: "Thiếu module đối chiếu (core/reconcile.js)." })); w.appendChild(card); return w; }
    if (!src.kq || !src.kq.bangluong.length) { card.appendChild(h("div", { class: "empty", text: "Chưa có bảng lương kỳ " + st.thang + "/" + st.nam + " — vào Tính lương trước." })); w.appendChild(card); return w; }
    card.appendChild(h("div", { class: src.chot ? "locked" : "warn", text: src.chot ? "🔒 Đang đối chiếu với bảng lương ĐÃ CHỐT " + kyLabel(kyKey(st.nam, st.thang)) + "." : "⚠ Kỳ " + st.thang + "/" + st.nam + " chưa chốt — đang đối chiếu với số tính tạm, có thể thay đổi." }));
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("⬆ Chọn file Excel đối chiếu", "pri", function () {
      readWorkbook(function (wb, fileName) {
        st.dcFile = fileName; st.dcWb = wb;
        st.dcSheet = wb.SheetNames.map(function (n) { return { n: n, len: (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }) || []).length }; }).sort(function (a, b) { return b.len - a.len; })[0].n;
        render();
      });
    }));
    if (st.dcWb) {
      if (st.dcWb.SheetNames.length > 1) {
        var selS = h("select");
        st.dcWb.SheetNames.forEach(function (n) { selS.appendChild(h("option", { value: n, text: n })); });
        selS.value = st.dcSheet; selS.addEventListener("change", function () { st.dcSheet = selS.value; render(); });
        bar.appendChild(h("label", { text: "Sheet " })); bar.appendChild(selS);
      }
      bar.appendChild(h("span", { class: "hint", text: st.dcFile }));
    }
    card.appendChild(bar);
    if (st.dcWb) {
      var arr = XLSX.utils.sheet_to_json(st.dcWb.Sheets[st.dcSheet], { header: 1 });
      var parsed = RC.parseSheet(arr);
      if (parsed.headerRow < 0) {
        card.appendChild(h("div", { class: "warn", text: "Không nhận ra dòng tiêu đề (cần có cột 'Mã NV' hoặc 'Họ và tên') trong sheet '" + st.dcSheet + "'. Thử chọn sheet khác." }));
      } else {
        card.appendChild(h("div", { class: "hint", html: "Đã đọc <b>" + parsed.rows.length + "</b> dòng, nhận ra <b>" + parsed.matched.length + "</b> chỉ tiêu: " + esc(parsed.matched.join(", ") || "(không có)") + (parsed.unmatched.length ? ". Cột KHÔNG nhận ra (bỏ qua): " + esc(parsed.unmatched.slice(0, 15).join(", ")) + (parsed.unmatched.length > 15 ? "…" : "") : "") }));
        var cmp = RC.compare(src.kq.bangluong, parsed.rows);
        var lech = cmp.rows.filter(function (r) { return r["Chênh lệch"] !== 0; });
        card.appendChild(h("div", { class: lech.length ? "warn" : "ok", text: lech.length ? lech.length + " dòng chênh lệch, trên " + cmp.rows.length + " dòng đã đối chiếu (" + parsed.rows.length + " người trong file Excel)." : cmp.rows.length ? "Khớp hoàn toàn trên " + cmp.rows.length + " dòng đã đối chiếu." : "Không có chỉ tiêu nào đối chiếu được — kiểm tra lại cột trong file." }));
        if (cmp.khongKhop.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + cmp.khongKhop.length + " người trong file Excel KHÔNG khớp được với app</b> (không có Mã NV khớp, hoặc trùng họ tên nhiều người — không tự đoán):<br>" + cmp.khongKhop.slice(0, 20).map(function (x) { return esc(x.hoTen || x.ma); }).join(", ") + (cmp.khongKhop.length > 20 ? "…" : "") }));
        if (lech.length) {
          var onlyLech = h("input", { type: "checkbox" }); onlyLech.checked = st.dcOnlyLech !== false;
          onlyLech.addEventListener("change", function () { st.dcOnlyLech = onlyLech.checked; render(); });
          card.appendChild(h("label", { class: "chk" }, [onlyLech, " Chỉ hiện dòng lệch"]));
        }
        var showRows = (st.dcOnlyLech !== false) ? lech : cmp.rows;
        card.appendChild(simpleTable(showRows));
        if (cmp.rows.length) card.appendChild(btn("⬇ Xuất Excel đối chiếu", "", function () {
          var sheets = [{ name: "DoiChieu", cols: Object.keys(cmp.rows[0]), rows: cmp.rows }];
          if (cmp.khongKhop.length) sheets.push({ name: "KhongKhopNguoi", cols: ["ma", "hoTen"], rows: cmp.khongKhop });
          saveXlsx("DoiChieu_" + kyKey(st.nam, st.thang) + ".xlsx", sheets);
          audit("Xuất Excel đối chiếu lương", kyLabel(kyKey(st.nam, st.thang)) + " · file nguồn: " + st.dcFile);
        }));
        // Riêng tăng ca: đối chiếu chi tiết hơn nếu file có đủ cột (mục XVII)
        var parsedTC = RC.parseSheet(arr, RC.CHI_TIEU_TANGCA);
        if (parsedTC.matched.length) {
          var cmpTC = RC.compare(src.kq.bangluong, parsedTC.rows, RC.CHI_TIEU_TANGCA);
          var lechTC = cmpTC.rows.filter(function (r) { return r["Chênh lệch"] !== 0; });
          card.appendChild(h("div", { class: "fh", text: "Đối chiếu chi tiết tăng ca" }));
          card.appendChild(h("div", { class: lechTC.length ? "warn" : "ok", text: lechTC.length ? lechTC.length + " dòng chênh lệch tăng ca." : "Khớp hoàn toàn." }));
          card.appendChild(simpleTable(lechTC.length ? lechTC : cmpTC.rows));
        }
      }
    }
    card.appendChild(h("div", { class: "hint", style: "margin-top:10px", text: "Chưa hỗ trợ đối chiếu Đại Hiệp theo từng ngày ở màn hình này — dùng sheet \"Bu luong theo ngay - DH\" trong file Excel Phân bổ khối lượng (Báo cáo lương → Sản lượng) để so sánh thủ công theo ngày." }));
    w.appendChild(card); return w;
  }
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
  function tabLuong() {
    var box = h("div"), chot = kyChot(kyStr());
    var hub = h("div", { class: "card", "data-payroll-hub": "1", "data-payroll-closed": chot ? "1" : "0" });
    hub.appendChild(h("h3", { text: "Kỳ lương " + st.thang + "/" + st.nam }));
    hub.appendChild(h("p", { class: "hint", text: (chot ? "Đã chốt · v" + (chot.version || 1) + " · " + fmtTime(chot.ngayChot) : "Chưa chốt") +
      " · " + buLabel(chot ? chot.buTheoNgay || false : st.bu) }));
    hub.appendChild(luongSteps(chot));
    var links = h("div", { class: "bar" });
    [["chamcong", "Đầu vào chấm công"], ["sanluong", "Đầu vào sản lượng"], ["ktbl", "Kiểm tra"],
      ["rp_tonghop", "Báo cáo lương"], ["rp_thanhtoan", "Thanh toán"], ["rp_soct", "Sổ chứng từ"]].forEach(function (item) {
      if (tabAllowed(item[0])) links.appendChild(btn(item[1], "ghost", function () {
        if (!leaveOk()) return;
        st.tab = item[0]; saveUi(); render();
      }));
    });
    hub.appendChild(links);
    if (!chot) {
      var work = h("div", { class: "bar", "data-period-work": "1" });
      C.inputReview.pending(db, kyStr()).forEach(function (r) {
        if (!tabAllowed(r.table)) return;
        work.appendChild(btn("Nháp: " + ALL[r.table].ten + " · " + kyLabel(r.period), "ghost", function () {
          if (!leaveOk()) return;
          st.tab = r.table; st.nam = +r.period.slice(0, 4); st.thang = +r.period.slice(5, 7);
          if (r.kind) st.pumpMode = r.kind;
          saveUi(); render();
        }));
      });
      if (st.kt && st.kt.ky === kyStr() && st.kt.rev === dbRev) {
        [["ERROR", "lỗi chặn"], ["WARNING", "cảnh báo"]].forEach(function (m) {
          var count = st.kt.rows.filter(function (row) { return row.muc === m[0]; }).length;
          if (count && tabAllowed("ktbl")) work.appendChild(btn(count + " " + m[1], m[0] === "ERROR" ? "red ghost" : "ghost", function () {
            st.ktSev = m[0]; ktDi(["ktbl"]);
          }));
        });
      }
      if (st.kq && st.kqStale) work.appendChild(h("span", { class: "warn", text: "Dữ liệu đã đổi. Tính lương lại trước khi chốt." }));
      if (work.childNodes.length) hub.appendChild(work);
    }
    box.appendChild(hub);
    var card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    if (chot) {
      st.kq = Object.assign({ ky: chot.ky }, chot.kq);
      hub.appendChild(h("p", { class: "hint", text: "Quy chế: " + qcLabel(chot.quyChe || "") + (chot.ghiChu ? " · " + chot.ghiChu : "") }));
      hub.appendChild(h("div", { class: "bar" }, [
        btn("⬇ Xuất trọn bộ Excel", "pri", function () { exportAll(chot.kq, chot.ky); }),
        btn("In trọn bộ PDF kỳ lương", "", function () { exportPayrollBundlePdf(chot.kq, chot.ky); }),
        btn("🔍 Đối chiếu với dữ liệu hiện tại", "", function () { doiChieu(chot); }),
        btn("🔓 Mở chốt để sửa", "red ghost", function () { moChot(chot.ky); })
      ]));
      card.appendChild(bar);
      return renderKq(box, card, bar);
    }
    var sel = h("select", { "aria-label": "Cách bù lương sản lượng" }); BU_OPTS.forEach(function (o) { sel.appendChild(h("option", { value: o[0], text: o[1] })); });
    if (!buMethodOf(st.bu)) sel.appendChild(h("option", { value: String(st.bu), text: buLabel(st.bu) }));
    sel.value = String(st.bu); sel.addEventListener("change", function () { selectTopupMethod(sel.value); });
    bar.appendChild(btn("▶ Tính lương tháng " + st.thang + "/" + st.nam, "pri big", function () {
      if (!need("payroll.calc")) return;
      if (!db.nhanvien.length) { alert("Chưa có nhân viên. Hãy nhập ở mục Nhân sự trước."); return; }
      var invalid = C.inputSafety.problems(db, kyStr()); if (invalid.length) { alert("Chưa tính lương: " + invalid.join("; ")); return; }
      var reviewMessage = C.inputReview.message(db, kyStr()); if (reviewMessage) { alert("Chưa tính lương: " + reviewMessage + " còn Nháp. Mở bảng và bấm Lưu để tính lương."); return; }
      if (st.dangTinh) return; st.dangTinh = true;
      try { st.kq = tinhLuong(); st.kqStale = false; } finally { st.dangTinh = false; }
      render(); toast("Đã tính xong " + st.kq.bangluong.length + " nhân viên");
    }));
    bar.appendChild(sel);
    bar.appendChild(btn("Xem cách bù", "", function () { var m = buMethodOf(st.bu); if (m) xemCachTinhBu(m); else alert(buLabel(st.bu)); }));
    var qs = h("select", { "aria-label": "Quy chế tính lương", title: "Áp dụng cho mọi kỳ chưa chốt của dữ liệu này (kỳ đã chốt giữ nguyên số)" }); QC_OPTS.forEach(function (o) { qs.appendChild(h("option", { value: o[0], text: o[1] })); });
    qs.value = quyChe();
    qs.addEventListener("change", function () {
      if (!need("dm.edit", "đổi quy chế tính lương")) { qs.value = quyChe(); return; }
      var cu = quyChe(); db.congty = [Object.assign({}, congTy(), { "Quy chế tính lương": qs.value })]; save();
      audit("Đổi quy chế tính lương", qcLabel(cu) + " → " + qcLabel(qs.value)); st.kq = null; render(); toast("Đã đổi: " + qcLabel(qs.value) + " — bấm Tính lương lại");
    });
    bar.appendChild(qs); bar.appendChild(btn("Xem quy chế", "", function () { xemQuyChe(qs.value); })); card.appendChild(bar);
    // Mục VIII: lựa chọn "Cách bù lương sản lượng" ở trên chỉ để XEM THỬ/so sánh — khi Chốt kỳ, app
    // kiểm tra phương pháp đã dùng để tính khớp bản "Hiệu lực" trong Cài đặt.
    // Chỉ hiện khi công ty này có dùng lương sản phẩm (mã hình thức lương chứa SP) — không làm phiền
    // công ty không bù sản lượng.
    if (db.dm_luong.some(function (l) { return /SP/.test(l["Mã hình thức lương"] || ""); })) {
      var qcBu = E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang);
      if (qcBu) {
        var dungPP = String(qcBu["Cách bù"]) === String(st.bu);
        card.appendChild(h("div", { class: dungPP ? "hint" : "warn", "data-bu-trial": dungPP ? "0" : "1", text: (dungPP ? "✓ " : "⚠ ") + "Phương pháp bù sản lượng CHÍNH THỨC kỳ " + st.thang + "/" + st.nam + ": " + buLabel(qcBu["Cách bù"]) + (dungPP ? " — đang xem đúng phương pháp này." : " — đang XEM THỬ phương pháp khác (" + buLabel(st.bu) + ") để so sánh; chưa được chốt. Bạn cần chọn phương pháp chính thức, bấm Tính lương và kiểm tra lại trước khi chốt.") }));
      } else card.appendChild(h("div", { class: "warn", text: "⚠ Chưa có Phương pháp bù sản lượng CHÍNH THỨC (Cài đặt → Phương pháp bù sản lượng) cho kỳ " + st.thang + "/" + st.nam + " — lựa chọn ở trên chỉ để xem thử/so sánh. Nếu kỳ này có sản lượng cần bù, sẽ KHÔNG chốt được cho đến khi khai báo quy chế." }));
    }
    if (!st.kq) {
      card.appendChild(h("div", { class: "hint", text: "Kiểm tra dữ liệu kỳ " + st.thang + "/" + st.nam + " rồi bấm nút xanh. Có thể tính lại bất cứ lúc nào." }));
      var cc = db.chamcong.filter(function (r) { return r["Kỳ"] === kyStr(); }).length;
      var sp = HRM.staffForPayroll(db, st.nam, st.thang);
      card.appendChild(h("div", { class: cc ? "ok" : "warn", html: "Chấm công kỳ này: <b>" + cc + "</b> dòng · Nhân viên có hợp đồng hiệu lực trong kỳ: <b>" + sp.list.length + "</b> người" + (cc ? "" : " — <b>chưa có dữ liệu chấm công kỳ này</b>.") }));
      if (sp.warn.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Hồ sơ cần bổ sung:</b><br>" + sp.warn.map(esc).join("<br>") }));
      box.appendChild(card); return box;
    }
    bar.appendChild(btn("🔒 Chốt kỳ lương", "pri", chotKy, "Lưu bảng lương kỳ này để xem lại về sau và khóa dữ liệu kỳ"));
    var qcOf = db.dm_luong.some(function (l) { return /SP/.test(l["Mã hình thức lương"] || ""); }) ? E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang) : null;
    if (qcOf && String(qcOf["Cách bù"]) !== String(st.kq.cheDoBu)) box.appendChild(h("div", { class: "warn", "data-bu-result-trial": "1", html: "<b>⚠ KẾT QUẢ XEM THỬ</b> — bảng dưới tính theo <b>" + esc(buLabel(st.kq.cheDoBu)) + "</b>, KHÔNG phải phương pháp chính thức (<b>" + esc(buLabel(qcOf["Cách bù"])) + "</b>). Không dùng số này để thanh toán; app chặn chốt bảng xem thử. Hãy chọn phương pháp chính thức, bấm Tính lương và kiểm tra lại trước khi chốt." }));
    return renderKq(box, card, bar);
  }
