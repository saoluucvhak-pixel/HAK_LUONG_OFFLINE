/**
 * schema.js — HAK.Schema: định nghĩa các bảng dữ liệu (giữ nguyên tên bảng + tên cột của hệ thống Google Sheet LUONG_HAK
 * để nhập Excel cũ và đối chiếu số liệu dễ dàng). Ngày lưu dạng "YYYY-MM-DD".
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const days = () => { const a = []; for (let i = 1; i <= 31; i++) a.push(('0' + i).slice(-2)); return a; };
  const HL = ['Hiệu lực từ', 'Hiệu lực đến'];
  const KY = 'Kỳ tính lương';
  const SANLUONG = ['Phiếu cân', 'Ngày cân', 'Giờ cân', 'Biển số', 'Cân lần 1', 'Cân lần 2', 'KL hàng (Tấn)', 'Mã phòng ban', 'Mã NV'];
  /** group: nhóm hiển thị; monthCol: cột ngày để lọc theo tháng; dates/nums: kiểu cột; note: gợi ý ngắn */
  const TABLES = [
    { id: 'NL_NHANSU', group: 'Nhân sự', title: 'Nhân sự (hợp đồng, mã lương)', key: 'Mã nhân viên', header: ['Ngày cập nhật', 'Mã nhân viên', 'Họ và tên', 'Mã PB', 'Mã CV', 'Ngày vào làm', 'Ngày hết hạn HĐ', 'Ngày nghỉ/thay đổi', 'Lương cơ bản', 'Lương thỏa thuận', 'Hình thức hợp đồng', 'Mã tiền lương 1', 'Mã tiền lương 2', 'Mã tăng ca', 'Mã phụ cấp', 'Mã hỗ trợ', 'Mã hỗ trợ 2', 'Mã BHXH', 'Mã TNCN', 'Hiệu lực từ', 'Hiệu lực đến', KY],
      dates: ['Ngày cập nhật', 'Ngày vào làm', 'Ngày hết hạn HĐ', 'Ngày nghỉ/thay đổi'].concat(HL), nums: ['Lương cơ bản', 'Lương thỏa thuận'] },
    { id: 'NL_CHITIET_NS', group: 'Nhân sự', title: 'Chi tiết nhân sự (CCCD, người phụ thuộc, ngân hàng)', key: 'Mã nhân viên', header: ['Ngày cập nhật', 'Mã nhân viên', 'Họ và tên', 'Số CCCD', 'Ngày sinh', 'Thường trú', 'Ngày cấp CCCD', 'Nơi cấp', 'Mã BHXH', 'Số điện thoại', 'Số HĐLĐ', 'Mã GT_TNCN_BT', 'Mã GT_TNCN_PT', 'Người phụ thuộc', 'Số tài khoản', 'Tên Ngân hàng', KY],
      dates: ['Ngày cập nhật', 'Ngày sinh', 'Ngày cấp CCCD'], nums: ['Người phụ thuộc'] },
    { id: 'NL_CHAMCONG', group: 'Chấm công & sản lượng', title: 'Chấm công (mỗi dòng = 1 nhân viên × 1 hình thức công × 1 tháng)', monthCol: 'Ngày tính công', header: ['TT', 'Ngày tính công', 'Mã PB', 'Mã CV', 'Mã NV', 'Họ và tên', 'Hình thức công'].concat(days()),
      dates: ['Ngày tính công'], nums: [], day: days(), note: 'Hình thức công: BT (bình thường), CL (lễ), PN (phép năm), CC (cơm), TC… (tăng ca). Ô ngày có thể ghi "1QC" = 1 công + nhãn công tác QC.' },
    { id: 'DL_SANLUONG', group: 'Chấm công & sản lượng', title: 'Sản lượng (phiếu cân gán người)', monthCol: 'Ngày cân', header: SANLUONG, dates: ['Ngày cân'], nums: ['Cân lần 1', 'Cân lần 2', 'KL hàng (Tấn)'] },
    { id: 'DL_BANDAM', group: 'Chấm công & sản lượng', title: 'Bơm dăm (số xe)', monthCol: 'Ngày cân', header: SANLUONG, dates: ['Ngày cân'], nums: ['Cân lần 1', 'Cân lần 2', 'KL hàng (Tấn)'] },
    { id: 'DL_TIENCOM', group: 'Chấm công & sản lượng', title: 'Tiền cơm (số suất cơm nhập tay)', monthCol: 'Ngày', header: ['Ngày', 'Mã NV', 'Số suất cơm', 'Ghi chú'], dates: ['Ngày'], nums: ['Số suất cơm'] },
    { id: 'NL_PSLUONG', group: 'Phát sinh lương', title: 'Thưởng / thu nhập khác / trừ khác', monthCol: 'Ngày hạch toán', header: ['Ngày hạch toán', 'Mã NV', 'Người nhận', 'Diễn giải', 'Tài khoản', 'TK đối ứng', 'Thưởng', 'Thu nhập khác', 'Trừ khác'], dates: ['Ngày hạch toán'], nums: ['Thưởng', 'Thu nhập khác', 'Trừ khác'] },
    { id: 'NL_UNGLUONG', group: 'Phát sinh lương', title: 'Tạm ứng lương', monthCol: 'Ngày hạch toán', header: ['Ngày hạch toán', 'Số phiếu chi', 'Mã NV', 'Người nhận', 'Diễn giải', 'Tài khoản', 'TK đối ứng', 'Tạm ứng', 'Thanh toán TM'], dates: ['Ngày hạch toán'], nums: ['Tạm ứng', 'Thanh toán TM'] },
    { id: 'DM_LUONG', group: 'Danh mục', title: 'Danh mục mã lương', key: 'Mã lương', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Mã lương', 'Mã hình thức lương', 'Hình thức lương', 'Số tiền khoán', 'Lương phụ', 'Ngưỡng truy thu BH (công)', 'ĐK_Bù lương (công tối thiểu)', 'Đơn giá bù lương', 'Đơn giá bơm dăm', 'Cách tính', KY],
      dates: ['Ngày cập nhật'].concat(HL), nums: ['Số tiền khoán', 'Lương phụ', 'Ngưỡng truy thu BH (công)', 'ĐK_Bù lương (công tối thiểu)', 'Đơn giá bù lương', 'Đơn giá bơm dăm'], note: 'Có hiệu lực theo ngày: đổi mức lương = thêm dòng mới, dòng cũ đặt "Hiệu lực đến".' },
    { id: 'DM_PHUCAP', group: 'Danh mục', title: 'Danh mục phụ cấp', key: 'Mã phụ cấp', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Mã phụ cấp', 'Tên phụ cấp', 'Số tiền', 'Tỷ lệ', 'Tham chiếu', 'Cách tính', KY], dates: ['Ngày cập nhật'].concat(HL), nums: ['Số tiền', 'Tham chiếu'] },
    { id: 'DM_TANGCA', group: 'Danh mục', title: 'Danh mục tăng ca', key: 'Mã tăng ca', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Mã tăng ca', 'Nội dung tăng ca', 'Hệ số tăng ca', 'Tiền tăng ca (nếu tính cố định)', 'Cách tính', KY], dates: ['Ngày cập nhật'].concat(HL), nums: ['Tiền tăng ca (nếu tính cố định)'] },
    { id: 'DM_HOTRO', group: 'Danh mục', title: 'Danh mục hỗ trợ (cơm, hỗ trợ lương)', key: 'Mã hỗ trợ', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Mã hỗ trợ', 'Tên hỗ trợ', 'Số tiền', 'Cách tính', KY], dates: ['Ngày cập nhật'].concat(HL), nums: ['Số tiền'] },
    { id: 'DM_BAOHIEM', group: 'Danh mục', title: 'Danh mục bảo hiểm (tỷ lệ BHXH/BHYT/BHTN/KPCĐ)', key: 'Mã bảo hiểm', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Mã bảo hiểm', 'Nội dung', 'DN.BHXH', 'DN.BHYT', 'DN.BHTN', 'DN.KPCD', 'NLD.BHXH', 'NLD.BHYT', 'NLD.BHTN', 'NLD.KPCD', KY],
      dates: ['Ngày cập nhật'].concat(HL), nums: ['DN.BHXH', 'DN.BHYT', 'DN.BHTN', 'DN.KPCD', 'NLD.BHXH', 'NLD.BHYT', 'NLD.BHTN', 'NLD.KPCD'], note: 'Tỷ lệ ghi dạng thập phân (0,08 = 8%).' },
    { id: 'DM_TNCN', group: 'Danh mục', title: 'Biểu thuế TNCN luỹ tiến', key: 'Bậc', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Bậc', 'Nội dung khấu trừ', 'Tỷ lệ đóng thuế', 'Thu nhập tháng (Min)', 'Thu nhập tháng (Max)', KY], dates: ['Ngày cập nhật'].concat(HL), nums: ['Bậc', 'Tỷ lệ đóng thuế', 'Thu nhập tháng (Min)', 'Thu nhập tháng (Max)'] },
    { id: 'DM_GT_TNCN', group: 'Danh mục', title: 'Mức giảm trừ gia cảnh TNCN', key: 'Mã giảm trừ', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Mã giảm trừ', 'Số người', 'Số tiền', KY], dates: ['Ngày cập nhật'].concat(HL), nums: ['Số người', 'Số tiền'] },
    { id: 'DM_PHONGBAN', group: 'Danh mục', title: 'Phòng ban', key: 'Mã phòng ban', header: ['Ngày cập nhật', 'Mã phòng ban', 'Tên phòng ban', KY], dates: ['Ngày cập nhật'], nums: [] },
    { id: 'DM_CHUCVU', group: 'Danh mục', title: 'Chức vụ', key: 'Mã chức vụ', header: ['Ngày cập nhật', 'Mã chức vụ', 'Tên chức vụ', KY], dates: ['Ngày cập nhật'], nums: [] },
    { id: 'DM_CHIPHI', group: 'Danh mục', title: 'Tài khoản chi phí theo phòng ban (hạch toán)', key: 'Mã phòng ban', header: ['Ngày cập nhật', 'Hiệu lực từ', 'Hiệu lực đến', 'Mã phòng ban', 'Tài khoản chi phí', 'Ghi chú'], dates: ['Ngày cập nhật'].concat(HL), nums: [] }
  ];
  const byId = {}; TABLES.forEach((t) => { byId[t.id] = t; t.dates = t.dates || []; t.nums = t.nums || []; });

  /** Tiêu đề các bảng KẾT QUẢ (cho Excel). */
  const OUT = {
    BANGLUONG: ['Mã NV', 'Họ và tên', 'Phòng ban', 'Chức vụ', 'Lương thỏa thuận', 'Công chuẩn', 'Đơn giá lương TG', 'Công tính LTG', 'Lương thời gian', 'Lương phụ', 'Sản lượng (tấn)', 'Đơn giá SL', 'Lương sản lượng', 'Lương bù SL (nếu dưới ngưỡng)', 'Phương pháp bù SL', 'Số xe bơm dăm', 'Lương bơm dăm', 'Tổng công', 'Công Chủ nhật', 'Công tăng ca', 'Tiền tăng ca', 'Phụ cấp', 'Phụ cấp công tác', 'Lương hỗ trợ', 'Ngày cơm', 'Tiền cơm', 'Thưởng', 'Thu nhập khác', 'Tổng thu nhập (trước trừ)', 'BHXH/BHYT/BHTN trừ NLĐ', 'KPCĐ trừ NLĐ', 'Truy thu bảo hiểm', 'Thuế TNCN', 'Trừ khác', 'Tạm ứng', 'Thực lĩnh', 'Còn thiếu (thực lĩnh âm)'],
    BHXH: ['Mã NV', 'Họ và tên', 'Phòng ban', 'Lương đóng BHXH', 'CTY.BHXH', 'CTY.BHYT', 'CTY.BHTN', 'CTY.KPCĐ', 'Cộng BH công ty đóng', 'NLĐ.BHXH', 'NLĐ.BHYT', 'NLĐ.BHTN', 'NLĐ.KPCĐ', 'Cộng BH NLĐ đóng', 'Truy thu bảo hiểm', 'Ghi chú ngưỡng công'],
    TNCN: ['Mã NV', 'Họ và tên', 'Thu nhập chịu thuế', 'Giảm trừ bản thân', 'Số người phụ thuộc', 'Giảm trừ người phụ thuộc', 'Thu nhập tính thuế', 'Thuế TNCN phải nộp']
  };
  const TEXT_OUT = ['Mã NV', 'Họ và tên', 'Phòng ban', 'Chức vụ', 'Phương pháp bù SL', 'Ghi chú ngưỡng công'];
  HAK.Schema = { TABLES, byId, OUT, TEXT_OUT, groups: Array.from(new Set(TABLES.map((t) => t.group))) };
  if (typeof module === 'object' && module.exports) module.exports = HAK.Schema;
})(typeof window !== 'undefined' ? window : globalThis);
