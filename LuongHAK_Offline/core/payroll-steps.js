// ===== CORE / PAYROLL-STEPS (V10.1) — trạng thái THẬT của 7 bước tính lương, tính từ dữ liệu (không đoán theo màn hình đang mở) =====
// Mỗi bước: { ten, trangThai: "xong"|"dang"|"chan"|"chua", ly }. Hàm thuần — dùng chung renderer và test.
(function (root) {
  "use strict";
  var TEN = ["Chọn kỳ & cách tính", "Kiểm tra dữ liệu đầu vào", "Tính lương", "Kiểm tra bảng lương", "Chốt kỳ", "Thanh toán lương", "Báo cáo & phiếu lương"];
  /**
   * in: { chot:bool, daTinh:bool (đã tính và không cũ), loiDauVao:number (Critical/cộng trùng), loiChan:number (blockers của bảng lương),
   *       duyet: null | "chua_gui" | "cho_duyet" | "het_hieu_luc" | "da_duyet" (chỉ khi bật chế độ phân quyền; null = không yêu cầu duyệt),
   *       thanhToan:{ soNV, soCT, nguoiDaTraDu } }
   */
  // Chế độ phân quyền ("roles"): tiến trình chính chỉ cho chốt khi người khác đã duyệt đúng dữ liệu hiện tại (main/write-policy.js).
  // Thanh bước phải nói điều đó, không chỉ "có thể chốt". Chỉ đổi lời giải thích (ly), không đổi trạng thái từng bước.
  var DUYET = {
    chua_gui: "Cần gửi duyệt; người khác duyệt đúng dữ liệu hiện tại rồi mới chốt được",
    cho_duyet: "Đang chờ người khác duyệt bảng lương",
    het_hieu_luc: "Dữ liệu đã đổi sau khi gửi duyệt — cần gửi duyệt lại",
    da_duyet: "Đã duyệt — có thể chốt"
  };
  function compute(i) {
    i = i || {};
    var tt = i.thanhToan || { soNV: 0, soCT: 0, nguoiDaTraDu: 0 }, out = [];
    function add(k, st, ly) { out.push({ ten: TEN[k], trangThai: st, ly: ly || "" }); }
    add(0, "xong");
    if (i.chot) add(1, "xong", "Đã chốt kỳ"); else if (i.loiDauVao > 0) add(1, "chan", i.loiDauVao + " lỗi dữ liệu nghiêm trọng"); else add(1, i.daTinh ? "xong" : "dang");
    if (i.chot || i.daTinh) add(2, "xong"); else add(2, i.loiDauVao > 0 ? "chua" : "dang");
    if (i.chot) add(3, "xong"); else if (!i.daTinh) add(3, "chua"); else if (i.loiChan > 0) add(3, "chan", i.loiChan + " lỗi chặn chốt"); else add(3, "dang", i.duyet && DUYET[i.duyet] ? "Không còn lỗi chặn. " + DUYET[i.duyet] : "Không còn lỗi chặn — có thể chốt");
    if (i.chot) add(4, "xong"); else if (i.daTinh && i.loiChan === 0 && !(i.loiDauVao > 0)) add(4, "dang", i.duyet && DUYET[i.duyet] || ""); else add(4, "chua");
    if (!i.chot) add(5, "chua", "Chỉ thanh toán sau khi chốt kỳ");
    else if (tt.soNV > 0 && tt.nguoiDaTraDu >= tt.soNV) add(5, "xong", "Đã thanh toán đủ " + tt.soNV + " người");
    else add(5, "dang", tt.soCT ? tt.nguoiDaTraDu + "/" + tt.soNV + " người đã trả đủ" : "Chưa lập chứng từ");
    if (!i.chot) add(6, "chua", "Phiếu lương/báo cáo chính thức sau khi chốt kỳ"); else add(6, "dang", "Có thể xuất báo cáo & phiếu lương");
    return out;
  }
  var api = { TEN: TEN, DUYET: DUYET, compute: compute };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else { root.HAKCore = root.HAKCore || {}; root.HAKCore.payrollSteps = api; }
})(typeof window !== "undefined" ? window : this);
