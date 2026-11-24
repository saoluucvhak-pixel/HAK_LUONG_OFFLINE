// ===== UI / SCREEN-HINTS — dòng chú thích "bước nào của quy trình lương" trên đầu màn (v2.1.23, Q11) =====
// Hàm THUẦN: chỉ trả chữ. Không đổi tên menu, không đổi số liệu. Thứ tự quy trình theo chủ:
// nhập liệu → tính lương (chỉ lương và phụ cấp) → tổng hợp lương (có khoản thu khác) → thanh toán lương (có khấu trừ) → báo cáo lương.
(function (root) {
  "use strict";
  var NHAP = "Bước 1/5 · Nhập liệu: nhập dữ liệu gốc của kỳ (công, sản lượng, thưởng/trừ, tạm ứng, suất cơm) — chưa phải số lương.";
  var TINH = "Bước 2/5 · Tính lương: chỉ gồm lương và phụ cấp; chưa có khoản thu khác và chưa trừ khấu trừ.";
  var TONGHOP = "Bước 3/5 · Tổng hợp lương: đã cộng các khoản thu khác; chưa trừ khấu trừ.";
  var THANHTOAN = "Bước 4/5 · Thanh toán lương: đã trừ các khoản khấu trừ — ra số thực lĩnh và số còn phải chi.";
  var BAOCAO = "Bước 5/5 · Báo cáo lương: xem và xuất báo cáo từ kỳ đã tính; không sửa số liệu ở đây.";
  var MAP = {
    chamcong: NHAP, sanluong: NHAP, bandam: NHAP, psluong: NHAP, ungluong: NHAP, tiencom: NHAP,
    luong: TINH, bangtinh: TINH, rp_tonghop: TONGHOP,
    rp_thanhtoan: THANHTOAN, rp_cttt: THANHTOAN, rp_soct: THANHTOAN, rp_ck: THANHTOAN, rp_tm: THANHTOAN,
    rp_ctnv: BAOCAO, slips: BAOCAO, rp_tncn: BAOCAO, rp_pb: BAOCAO, baocaoluong: BAOCAO
  };
  // Q8 (chủ chọn: giữ tùy chọn như hiện nay, chỉ nhắc): phụ lục hiệu lực GIỮA tháng.
  var PHU_LUC_GIUA_THANG = "Nhắc: phụ lục có hiệu lực GIỮA tháng thì nhớ chọn ô \"Cách áp dụng trong tháng hiệu lực\" — \"Từ ngày hiệu lực\" (công trước ngày đó tính theo mức cũ, từ ngày đó theo mức mới; chỉ chia được khi cùng mã lương) hoặc \"Cả tháng\" (cả tháng theo mức mới). Để trống = \"Cả tháng\".";
  function phuLucGiuaThang() { return PHU_LUC_GIUA_THANG; }
  function text(tab) { return Object.prototype.hasOwnProperty.call(MAP, tab) ? MAP[tab] : ""; }
  var api = { text: text, MAP: MAP, phuLucGiuaThang: phuLucGiuaThang };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else { root.HAKUi = root.HAKUi || {}; root.HAKUi.screenHints = api; }
})(typeof window !== "undefined" ? window : this);
