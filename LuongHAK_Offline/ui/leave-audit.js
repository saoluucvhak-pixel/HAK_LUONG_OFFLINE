// ===== UI / HAK LEAVE AUDIT (v2.1.4) — rà soát nghỉ việc / hết hạn hợp đồng + quy tắc "hợp đồng hết hạn thì không trừ bảo hiểm" =====
// Không sửa engine.js / hr.js (khóa băm): mọi thứ làm ở lớp app, trên kết quả HRM.staffForPayroll.
//  1) applyExpiredNoBH(db, nam, thang, sp): người có hợp đồng ĐÃ HẾT HẠN từ trước kỳ (Ngày hết hạn < ngày đầu kỳ) → bỏ mã BHXH ở dòng nhân sự của kỳ
//     (engine không tính bảo hiểm / truy thu cho người không có mã BHXH). Tiền lương theo công vẫn tính như cũ. Chỉ thêm cảnh báo.
//  2) audit(db, nam, thang, deps): các dòng cần xử lý trước khi chốt kỳ.
//       THIEU_NGAY_CHAM_DUT  (chặn chốt): trạng thái "Đã nghỉ việc" nhưng hợp đồng đang hiệu lực trong kỳ chưa có Ngày chấm dứt
//       KHONG_CONG_CON_LUONG (chặn chốt): đã nghỉ việc hoặc hợp đồng hết hạn trước kỳ, KHÔNG có công nào trong kỳ mà vẫn nằm trong bảng lương
//       HET_HAN_CO_CONG      (cảnh báo): hợp đồng hết hạn trước kỳ nhưng vẫn có công → không trừ BH; cần gia hạn / ký phụ lục hoặc chấm dứt
// Không phụ thuộc gì khác; có thể nạp bằng <script> hoặc require() (để test).
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.leaveAudit = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function d10(v) { return v ? String(v).slice(0, 10) : ""; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function kyDau(nam, thang) { return nam + "-" + pad(thang) + "-01"; }
  function kyCuoi(nam, thang) { return nam + "-" + pad(thang) + "-" + pad(new Date(nam, thang, 0).getDate()); }
  function dmy(s) { s = d10(s); return s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : ""; }
  function hdOf(db, item) {
    var so = item["Số HĐLĐ"], ma = item["Mã nhân viên"], found = null;
    (db.hopdong || []).forEach(function (h) { if (h["Mã NV"] === ma && h["Số HĐLĐ"] === so) found = h; });
    return found;
  }

  /** Hợp đồng hết hạn từ trước kỳ? (Ngày hết hạn có giá trị và < ngày đầu kỳ) */
  function hetHanTruocKy(hd, nam, thang) { var hh = hd && d10(hd["Ngày hết hạn"]); return !!(hh && hh < kyDau(nam, thang)); }

  /** Bỏ mã BHXH của người có hợp đồng đã hết hạn trước kỳ. Sửa trực tiếp sp.list / sp.warn; trả số người bị áp dụng. */
  function applyExpiredNoBH(db, nam, thang, sp) {
    var n = 0; if (!sp || !sp.list) return 0;
    sp.list.forEach(function (it) {
      if (!it["Mã BHXH"]) return;
      var hd = hdOf(db, it); if (!hetHanTruocKy(hd, nam, thang)) return;
      it["Mã BHXH"] = ""; n++;
      (sp.warn = sp.warn || []).push(it["Mã nhân viên"] + " (" + (it["Họ và tên"] || "") + "): hợp đồng " + hd["Số HĐLĐ"] + " đã hết hạn " + dmy(hd["Ngày hết hạn"]) + " — KHÔNG tính bảo hiểm kỳ này (nếu còn làm việc: ký phụ lục / gia hạn hợp đồng; nếu đã nghỉ: điền Ngày chấm dứt)");
    });
    return n;
  }

  /** Số công trong kỳ của 1 người (cộng các ô ngày 01..31 của dòng chấm công kỳ đó). deps.soCong(v) → số công của 1 ô ("1QC" → 1). */
  function congTrongKy(db, ma, nam, thang, soCong) {
    var ky = nam + "-" + pad(thang), tong = 0;
    (db.chamcong || []).forEach(function (r) {
      if (r["Mã NV"] !== ma || String(r["Kỳ"] || "").slice(0, 7) !== ky) return;
      for (var d = 1; d <= 31; d++) { var v = r[pad(d)]; if (v !== "" && v != null) tong += soCong(v) || 0; }
    });
    return tong;
  }

  /** deps: { activeHD(db, ma, dau, cuoi), soCong(v) }. Trả [{ ma, ten, loai, block, msg, goiY, ngayGoiY }] */
  function audit(db, nam, thang, deps) {
    var dau = kyDau(nam, thang), cuoi = kyCuoi(nam, thang), out = [];
    (db.nhanvien || []).forEach(function (nv) {
      var ma = nv["Mã NV"]; if (!ma) return;
      var hd = deps.activeHD(db, ma, dau, cuoi); if (!hd) return; // không có hợp đồng hiệu lực trong kỳ → không vào bảng lương
      var nghi = nv["Trạng thái"] === "Đã nghỉ việc", hetHan = hetHanTruocKy(hd, nam, thang), cd = d10(hd["Ngày chấm dứt"]);
      var ten = nv["Họ và tên"] || "", cong = congTrongKy(db, ma, nam, thang, deps.soCong), hh = d10(hd["Ngày hết hạn"]);
      var base = { ma: ma, ten: ten, soHD: hd["Số HĐLĐ"], ngayHetHan: hh, ngayGoiY: hh || "" };
      if (nghi && !cd) out.push(Object.assign({ loai: "THIEU_NGAY_CHAM_DUT", block: true,
        msg: "Trạng thái 'Đã nghỉ việc' nhưng hợp đồng " + hd["Số HĐLĐ"] + " chưa có Ngày chấm dứt — vẫn đang được đưa vào bảng lương" + (hh ? " (hợp đồng hết hạn " + dmy(hh) + ")" : ""),
        goiY: "Lập phiếu nghỉ việc (ghi Ngày chấm dứt + trạng thái)" }, base));
      if (hetHan && !nghi && cong <= 0 && !cd) out.push(Object.assign({ loai: "KHONG_CONG_CON_LUONG", block: true,
        msg: "Không có công nào trong kỳ " + pad(thang) + "/" + nam + " nhưng vẫn nằm trong bảng lương (hợp đồng hết hạn " + dmy(hh) + ", chưa có Ngày chấm dứt)",
        goiY: "Điền Ngày chấm dứt cho hợp đồng nếu đã nghỉ; nếu còn làm việc thì nhập chấm công / gia hạn hợp đồng" }, base));
      if (hetHan && !nghi && cong > 0) out.push(Object.assign({ loai: "HET_HAN_CO_CONG", block: false,
        msg: "Hợp đồng " + hd["Số HĐLĐ"] + " đã hết hạn " + dmy(hh) + " nhưng vẫn có " + cong + " công trong kỳ — không trừ bảo hiểm",
        goiY: "Ký phụ lục / gia hạn hợp đồng, hoặc chấm dứt hợp đồng" }, base));
    });
    return out;
  }

  return { audit: audit, applyExpiredNoBH: applyExpiredNoBH, hetHanTruocKy: hetHanTruocKy, congTrongKy: congTrongKy, kyDau: kyDau, kyCuoi: kyCuoi, dmy: dmy };
});
