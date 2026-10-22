# HAK V10.4 — Luxury V10.3 design baseline

## Quyết định thiết kế
- Giao diện mặc định: `luxe` từ V10.3, **không thay bảng màu bằng mẫu vàng mới**.
- Hỗ trợ `data-theme="light"` và `data-theme="dark"`; người dùng đổi và lưu tùy chọn hiện có.
- Giữ lựa chọn `classic` để tương thích dữ liệu và thói quen sử dụng.
- Navy cho menu, vàng champagne làm điểm nhấn tiết chế, nền ngà/xám ấm, trạng thái nghiệp vụ dùng màu có ngữ nghĩa.
- Dùng các biến CSS sẵn có trong `style.css`; không hardcode màu trong thành phần cha–con.
- Bảng tăng ca: cha là mã tăng ca, con là điều kiện theo địa điểm và phiên bản công thức.
- Bảng lương: cha là nhân viên/kỳ, con là DQ/QC/từng địa điểm; tính riêng rồi cộng, không lấy Công chuẩn 2 lớn nhất cho toàn bộ nhân viên sau khi có thiết kế nghiệp vụ được duyệt.

## Phạm vi triển khai
1. Chuẩn hóa thanh menu, tiêu đề, bộ lọc, bảng, trạng thái, modal và lịch sử.
2. Bảo toàn cách chuyển giao diện sáng/tối và luxe/classic; không tự ý ghi đè lựa chọn người dùng cũ.
3. Kiểm thử tương phản, độ rộng bảng, cuộn, keyboard focus, kích thước 1366×768 và 1920×1080.
4. Không sửa kết quả tính lương TC1–TC6 hoặc các kỳ đã chốt chỉ vì thay đổi giao diện.

## Trạng thái
Đây là đặc tả giao diện được chốt, không phải xác nhận tất cả màn hình đã được triển khai. Build Windows cần kiểm thử và xác nhận workflow thành công trước khi phát hành.
