// ===== DYNAMIC PAYROLL FORMULA ENGINE — thư viện biến công thức (Master Prompt mục III.4) =====
// Danh sách biến người dùng được dùng trong công thức: tên hiển thị tiếng Việt + mã kỹ thuật (dùng
// trong công thức) + đơn vị + nguồn dữ liệu + quy tắc khi không có dữ liệu + diễn giải nghiệp vụ.
// Dùng bởi: formula-validator.js (chặn biến chưa khai báo ở đây), UI chọn biến (Formula Builder).
// Biến chưa tồn tại trong danh sách này PHẢI báo lỗi cấu hình khi lưu công thức — không được âm thầm
// coi là 0 (mục III.4: "Biến chưa tồn tại phải phát sinh lỗi cấu hình").
(function (root) {
  "use strict";

  // missing: quy tắc khi NGUỒN không có dữ liệu cho biến này ở 1 nhân viên/kỳ cụ thể (không phải
  // "biến không tồn tại" — đó là lỗi cấu hình khác, xem trên). "zero" = engine đã coi là 0 từ trước
  // (giữ đúng hành vi cũ, có cảnh báo riêng ở engine.js khi liên quan danh mục thiếu).
  var VARS = [
    { name: "CONG_CHUAN", label: "Công chuẩn", unit: "công", source: "congChuan() theo Mã lương + quy chế hiệu lực", missing: "zero", desc: "Số công chuẩn của mã lương trong kỳ (đã trừ Chủ nhật / số ngày giảm trừ theo 'Cách tính')." },
    { name: "CONG_CHUAN_2", label: "Công chuẩn 2", unit: "công", source: "Chấm công có nhãn \"DQ\" → cố định 40, ngược lại = 0", missing: "zero", desc: "Mốc chuẩn riêng cho TC2 khi chấm công có nhãn DQ (đối chiếu M thật HAK_DN); = 0 nghĩa là dùng CONG_CHUAN thường." },
    { name: "CONG_TINH_LUONG", label: "Công tính lương", unit: "công", source: "Tổng công hợp lệ trong kỳ (chấm công)", missing: "zero", desc: "Tổng công dùng làm căn cứ tính lương thời gian/tăng ca (≈ Tổng công, trừ TC5 không cộng lại — xem C10)." },
    { name: "CONG_BT", label: "Công BT", unit: "công", source: "Chấm công, Hình thức công = BT", missing: "zero", desc: "Tổng công bình thường (không gồm tăng ca/lễ/phép/Chủ nhật/di chuyển/trung chuyển)." },
    { name: "CONG_TC", label: "Công tăng ca", unit: "công", source: "Chấm công, Hình thức công có TC", missing: "zero", desc: "Số công tăng ca đã chấm (chưa nhân Hệ số tăng ca)." },
    { name: "CONG_CHU_NHAT", label: "Công Chủ nhật", unit: "công", source: "Chấm công rơi vào Chủ nhật", missing: "zero", desc: "Số công làm việc vào ngày Chủ nhật trong kỳ." },
    { name: "CONG_LE", label: "Công lễ", unit: "công", source: "Chấm công, Hình thức công = CL (lễ)", missing: "zero", desc: "Số công nghỉ lễ/Tết có lương trong kỳ." },
    { name: "CONG_PHEP", label: "Công phép", unit: "công", source: "Chấm công, Hình thức công = PN (phép)", missing: "zero", desc: "Số công nghỉ phép có lương (đơn phép đã duyệt) trong kỳ." },
    { name: "CONG_DI_CHUYEN", label: "Công di chuyển", unit: "công", source: "Chấm công, Hình thức công = DC", missing: "zero", desc: "Số công di chuyển (giữa công trình/công tác) trong kỳ." },
    { name: "CONG_TRUNG_CHUYEN", label: "Công trung chuyển", unit: "công", source: "Chấm công, Hình thức công = TRCH", missing: "zero", desc: "Số công trung chuyển trong kỳ (trừ khi tính công quy đổi tăng ca TC1/TC2)." },
    { name: "LUONG_THOA_THUAN", label: "Lương thỏa thuận", unit: "đ", source: "Phụ lục HĐ hiệu lực trong kỳ", missing: "zero", desc: "Mức lương thỏa thuận theo phụ lục hợp đồng lao động đang áp dụng." },
    { name: "DON_GIA_CONG", label: "Đơn giá công", unit: "đ/công", source: "Lương thỏa thuận ÷ Công chuẩn (LTG) hoặc Đơn giá khoán (SP)", missing: "zero", desc: "Đơn giá 1 công, dùng làm căn cứ tính lương thời gian và tiền tăng ca (trừ mã có Tiền tăng ca cố định)." },
    { name: "LUONG_GIO_OT", label: "Lương giờ hợp lệ", unit: "đ/giờ", source: "Đơn giá công ÷ 8 giờ (căn cứ kiểm tra nghĩa vụ làm thêm theo luật — mục IV.3 Tầng B)", missing: "zero", desc: "Tiền lương giờ thực tế, dùng để so với mức trả làm thêm tối thiểu theo pháp luật (150%/200%/300%)." },
    { name: "HE_SO_TC", label: "Hệ số tăng ca", unit: "lần", source: "DM_TANGCA.\"Hệ số tăng ca\" hiệu lực trong kỳ", missing: "zero", desc: "Hệ số nhân thêm của mã tăng ca đang gán cho nhân viên." },
    { name: "TIEN_TC_CO_DINH", label: "Tiền tăng ca cố định", unit: "đ", source: "DM_TANGCA.\"Tiền tăng ca (nếu tính cố định)\"", missing: "zero", desc: "Mức tiền cố định cho 1 công tăng ca quy đổi, dùng cho mã tăng ca kiểu TC5 (không theo Đơn giá công thường)." },
    { name: "MUC_PHU_CAP", label: "Mức phụ cấp", unit: "đ", source: "DM_PHUCAP.\"Số tiền\" hiệu lực trong kỳ", missing: "zero", desc: "Mức tiền phụ cấp đầy đủ (100%) theo mã phụ cấp." },
    { name: "MUC_HO_TRO", label: "Mức hỗ trợ", unit: "đ", source: "DM_HOTRO.\"Số tiền\" hiệu lực trong kỳ", missing: "zero", desc: "Mức tiền hỗ trợ theo mã hỗ trợ (áp dụng theo ngày/lượt/xe tùy công thức)." },
    { name: "SO_NGAY_COM", label: "Số ngày cơm", unit: "ngày", source: "Chấm công (cột Cơm) + bảng Tiền cơm bổ sung", missing: "zero", desc: "Số ngày được tính tiền cơm trong kỳ." },
    { name: "SO_NGAY_CONG_TAC", label: "Số ngày công tác", unit: "ngày", source: "Đơn/nhãn công tác đã duyệt trong kỳ", missing: "zero", desc: "Số ngày công tác được ghi nhận trong kỳ." },
    { name: "SO_LUOT_CONG_TAC", label: "Số lượt công tác", unit: "lượt", source: "Đơn/nhãn công tác đã duyệt trong kỳ", missing: "zero", desc: "Số lượt công tác (1 lượt có thể gồm nhiều ngày) được ghi nhận trong kỳ." },
    { name: "SL_TAN", label: "Sản lượng tấn", unit: "tấn", source: "core/production-alloc.js — sản lượng đã phân bổ cho nhân viên trong kỳ", missing: "zero", desc: "Khối lượng sản lượng (tấn) đã được phân bổ hợp lệ cho nhân viên." },
    { name: "SO_XE", label: "Số xe", unit: "xe", source: "Bơm dăm đã phân bổ cho nhân viên trong kỳ", missing: "zero", desc: "Số xe bơm dăm đã được phân bổ hợp lệ cho nhân viên." },
    { name: "LUONG_SAN_LUONG", label: "Tiền sản lượng", unit: "đ", source: "SL_TAN × Đơn giá khoán (DM_LUONG mã SP)", missing: "zero", desc: "Tiền lương sản lượng đã tính (trước khi cộng tiền bù)." },
    { name: "LUONG_BU", label: "Lương bù", unit: "đ", source: "core/production-engine (bù bình quân tổ HAK / bậc thang theo ngày Đại Hiệp)", missing: "zero", desc: "Tiền bù lương sản lượng theo phương pháp của công ty (xem mục VIII/X)." },
    { name: "SO_NGAY_THANG", label: "Ngày trong tháng", unit: "ngày", source: "new Date(nam, thang, 0).getDate()", missing: "error", desc: "Tổng số ngày của tháng đang tính lương (28–31)." }
  ];

  var BY_NAME = {};
  VARS.forEach(function (v) { BY_NAME[v.name] = v; });

  function isKnown(name) { return Object.prototype.hasOwnProperty.call(BY_NAME, name); }
  function get(name) { return BY_NAME[name] || null; }

  var api = { VARS: VARS, NAMES: VARS.map(function (v) { return v.name; }), isKnown: isKnown, get: get };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.formulaVariables = api; }
})(typeof window !== "undefined" ? window : this);
