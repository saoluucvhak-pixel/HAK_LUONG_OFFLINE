# OCR biểu mẫu — alpha.35

Nguồn dùng chung: HAK_OCR_ENGINE, nhánh feature/handwritten-digits-cnn. Nâng cấp lần này thêm phân loại và quy trình đối chiếu biểu mẫu, không thay trọng số mô hình chữ tay, không thay công thức lương.

Khi không dựng được bảng công, ứng dụng đọc chữ cả trang để phân biệt giấy xác nhận vân tay, phiếu tăng ca, danh sách tổng giờ tăng ca hoặc chưa xác định. Những trang có bảng công hợp lệ tiếp tục đi theo luồng cũ, không chạy thêm OCR biểu mẫu.

## Cách dùng

Vào Nhập liệu hàng tháng → Đọc ảnh chấm công → Chọn ảnh / PDF. Với biểu mẫu được nhận diện, xem khung Chờ đối chiếu và chữ OCR gốc. Sửa gợi ý hoặc thêm họ tên/ngày/giờ còn thiếu từ ảnh gốc; đánh dấu từng trường sau khi đối chiếu. Sửa giá trị hoặc đọc lại trang sẽ bỏ xác nhận cũ. Có thể xuất phiếu đối chiếu JSON; đây chỉ là bản nháp, không phải lệnh nhập công.

Không suy luận năm thiếu, giờ qua đêm, tổng giờ được trả lương hay tính hợp lệ của chữ ký. Không tự khớp nhân viên, không tự nhập công, không dùng biểu mẫu này để tự học thư viện ô công. Ảnh mờ, thiếu hoặc sai trường vẫn cần người phụ trách đối chiếu.

## Nghiệm thu

Bộ 12 ảnh thật gồm 10 tài liệu khác nhau, 2 ảnh trùng. Chạy riêng tư, không nhập công, không đưa tệp hoặc nội dung cá nhân lên repo công khai. Cả 5 biểu mẫu mục tiêu nhận đúng loại: 2 giấy vân tay, 1 danh sách tổng giờ, 2 phiếu tăng ca. Trong đó 4 biểu mẫu chưa trích được trường gợi ý, phiếu còn lại chỉ có 1 gợi ý. Vì vậy chưa đạt nghiệm thu đọc chữ tay theo trường. Không dùng tỷ lệ phân loại để báo độ chính xác chữ tay.

Mẫu bảng công số 04 giữ kết quả 66/66 ô khớp với đáp án đã đối chiếu. Kiểm thử UI dùng ảnh giả lập và mô phỏng kết quả nhận dạng để xác nhận hành vi duyệt/sửa/xuất, không đại diện độ chính xác OCR ảnh thật.
