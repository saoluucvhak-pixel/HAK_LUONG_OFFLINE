# Kho hồ sơ theo năm — V10.4 alpha.34

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


## Tối ưu alpha.34

Kiểm tra trước chuyển, chuyển kho, đưa về và đọc trang hồ sơ chạy trong worker riêng. Trong thời gian này ứng dụng báo đang xử lý, chặn ghi dữ liệu và không cho đóng cửa sổ giữa thao tác; không có hủy giữa bước ghi. Worker kết thúc sẽ giải phóng dữ liệu. Rời màn hình Công ty & Sao lưu cũng giải phóng bộ nhớ kho năm còn giữ bởi thao tác xuất.

Danh mục Tăng ca, Phụ cấp, Hỗ trợ hiển thị tối đa 50 mã/trang; tìm kiếm vẫn áp dụng toàn danh sách. Khung chi tiết có nhãn chỉ xem. Kết quả Full Backup hiển thị số gói hồ sơ năm.

Nghiệm thu ảnh thật chạy cục bộ: 12 ảnh gồm 10 tài liệu khác nhau và 2 ảnh trùng, không phát sinh lỗi JavaScript, không tự nhập chấm công. Chỉ 3/10 tài liệu dựng được dòng bảng. Mẫu số 04 khớp 66/66 ô với bảng chuẩn đã đối chiếu; các mẫu khác chưa có bộ chuẩn từng ô trong đợt này. Nhiều biểu mẫu chữ tay chưa dựng được bảng, không coi OCR chữ tay đã nghiệm thu. Tệp thật và bằng chứng có tên nhân viên giữ ngoài repo công khai.
