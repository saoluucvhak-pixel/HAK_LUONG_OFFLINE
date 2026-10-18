# V10.4 alpha.32 — phân biệt bảng ngày và biểu mẫu STT

- Bảng có cột ngày in rõ nhưng không liên tiếp được đọc theo nhãn thực tế, không lấp ngày bị bỏ qua. Chỉ dùng đường này khi có tiêu đề họ tên gần hàng ngày và ít nhất năm nhãn ngày tăng dần, không trùng.
- Cột có tiêu đề STT/TT/Số thứ tự không được dùng làm cột ngày của bảng dọc. Trước đây, dãy số thứ tự của giấy xác nhận hoặc danh sách tổng giờ có thể bị coi nhầm thành ngày 1–N.
- Không bổ sung khả năng đọc tên hoặc nội dung viết tay. Biểu mẫu chưa hỗ trợ tiếp tục yêu cầu nhập/đối chiếu thủ công.
- Không sửa công thức tính lương, chính sách nhập hoặc main. Bộ kiểm thử công khai chỉ dùng lưới và tên tổng hợp; ảnh và nhãn thực tế được giữ riêng tại máy.
- Parser dùng chung được khóa theo commit/SHA256 từ HAK_OCR_ENGINE. Phần ngoại lệ bảo vệ nguồn chỉ mở thêm đúng `core/timesheet-parse.js` cho thay đổi bố cục này.

Kiểm thử hồi quy xác nhận STT không tạo bảng công giả, nhãn ngày không liên tiếp được giữ nguyên và không tạo thêm ngày thiếu. Các kết quả thử trên ảnh thực là khảo sát ban đầu, chưa đủ mẫu hoặc đáp án độc lập để nghiệm thu toàn bộ OCR.
