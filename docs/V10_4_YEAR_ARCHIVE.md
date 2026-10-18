# Kho hồ sơ theo năm — V10.4 alpha.33

Vào **Công ty & Sao lưu → Kho hồ sơ theo năm** bằng tài khoản quản trị. Chọn năm cũ, bấm **Kiểm tra trước khi chuyển**, đọc số bản ghi và xác nhận. Chỉ năm trước năm hiện tại, có các kỳ liên quan đã chốt và bản chốt hợp lệ, mới được chuyển. Không tự chuyển hồ sơ thật khi cài nâng cấp.

## Dữ liệu được chuyển

Chấm công, sản lượng, ban đêm, phát sinh lương, ứng lương, tiền cơm, bản chốt kỳ và lịch sử kỳ của năm được chọn ra khỏi dữ liệu đang làm. Nhân viên, danh mục, hợp đồng và các năm chưa chuyển vẫn ở vùng đang làm. Công thức tính lương không thay đổi.

Mỗi năm nằm trong gói riêng bất biến có kiểm tra SHA256. Danh sách năm nhỏ vẫn trong dữ liệu đang làm; gói năm chỉ được đọc khi mở. Chứng từ gốc giữ nguyên trong kho hiện có theo năm/tháng, không bị xóa hay nhân đôi.

## Tra cứu và đưa về

Bấm **Mở hồ sơ năm** để xem từng loại, tháng, mỗi trang 50 dòng. Bảng lương lấy từ kết quả đã chốt, không tính lại. Có thể xuất Excel toàn bộ mục đang chọn hoặc in PDF trang đang xem. Đóng hồ sơ giải phóng bộ nhớ lưu tạm của năm.

**Đưa về vùng đang làm** yêu cầu quyền quản trị, lý do, xác nhận và bản sao lưu kiểm tra thành công. Bản chốt vẫn đóng; muốn sửa phải qua chức năng mở chốt hiện có. Gói năm gốc được giữ lại.

## Sao lưu và chuyển máy

Dùng **Full Backup** để mang đầy đủ dữ liệu, kho hồ sơ năm và chứng từ sang máy khác. Khôi phục kiểm tra đủ gói năm trước khi ghi dữ liệu. Bản sao JSON tự động hằng ngày/theo năm hoặc bản mirror JSON riêng lẻ không mang theo gói năm; xuất JSON đơn lẻ bị chặn khi đã có hồ sơ năm. Nên giữ Full Backup ở nơi khác máy đang dùng.

Sau lần lưu trữ đầu tiên dữ liệu dùng schema 3, cần bản ứng dụng mới; không hạ phiên bản. Không tự xóa các gói hồ sơ năm, kể cả gói không còn tham chiếu sau một lần ghi thất bại. Chức năng xóa toàn bộ dữ liệu bị chặn khi có liên kết hồ sơ năm.

## Kiểm thử

Bộ kiểm thử dùng dữ liệu giả lập, không dùng thông tin nhân viên thật. Kiểm tra chuyển năm, đọc chỉ xem, phân trang, xuất Excel/PDF, chống ghi nhầm năm đã chuyển, khôi phục năm và Full Backup sang thư mục máy khác. Với mẫu 1.000 dòng lịch sử, tệp đang làm giảm từ 290.138 xuống 16.654 byte (khoảng 94%); mức giảm thực tế phụ thuộc hồ sơ. Đây không phải số đo tốc độ trên dữ liệu doanh nghiệp.
