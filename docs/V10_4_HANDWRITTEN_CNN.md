# V10.4 alpha.30 — mô hình chữ số viết tay offline

Nguồn dùng chung: `HAK_OCR_ENGINE`, nhánh `feature/handwritten-digits-cnn`, commit `eb9c42b5a1d7ff5fbbc4219b6f6a141b8a9197de`. Trọng số CNN MNIST có sẵn từ ONNX model zoo được đóng kèm trong app, không tải model hoặc gửi ảnh đi khi chạy.

Đây là mô hình nhận **một chữ số viết tay 0–9**. Chưa hỗ trợ họ tên/ghi chú tiếng Việt, chữ viết liền hoặc chuỗi số dính nét; không suy diễn dấu phẩy hay tự ghép `0,5`. Các ô như vậy tiếp tục dùng OCR và sửa/duyệt thủ công hiện có.

## Sử dụng

1. Mở Đọc ảnh chấm công, đọc ảnh/PDF như cũ.
2. Khi CNN có ứng viên khác kết quả OCR hiện tại, ô có nút `✎ <chữ số>`. Chọn ô để xem ảnh gốc, đối chiếu rồi bấm nút nếu gợi ý đúng.
3. Chọn gợi ý đi qua đúng luồng sửa ô và lưu mẫu chờ xác minh. Không tự ghi vào chấm công; vẫn phải qua kiểm tra và màn xem trước nhập.

Không đổi văn bản hay điểm Tesseract ở dịch vụ OCR. Ô trống không tự thành 0; vùng nhiều ký tự rõ ràng bị giữ lại thay vì ép thành một chữ số. Điểm softmax là điểm mô hình, không phải xác nhận độ chính xác.

## Đo độc lập

- 10.000 ảnh từ test split MNIST, không dùng dữ liệu công ty và không huấn luyện/điều chỉnh ngưỡng trên tập test.
- Đầu vào chuẩn 28×28: 9890/10000 = **98,90%**.
- Qua bước chuẩn hóa ô giấy: 9783/10000 = **97,83%**, tính vùng không hỗ trợ là không đúng.
- Ngưỡng cố định score >= 0,95 và margin >= 0,8: 9587 ứng viên, vẫn có 30 ứng viên sai. Do đó không tự chọn gợi ý.
- JavaScript khớp top-1 ONNX Runtime trên 100 ảnh đối chiếu; sai khác logit tối đa 0,0000114441.

Đây là đo chữ số viết tay công khai, chưa phải nghiệm thu ảnh bảng công thực tế, ảnh điện thoại hay chữ viết tay tiếng Việt.

## Kiểm thử và đóng gói

- Kiểm tra số học CNN, ảnh trắng, nhiều ký tự, vùng lỗi, trọng số hỏng, bảo toàn kết quả OCR gốc và không tự duyệt.
- Bảng công kiểm thử chứa các chữ số MNIST công khai; kiểm tra hiển thị gợi ý, bấm chọn đi qua luồng sửa và không tự ghi chấm công.
- Sau build NSIS, trích mã và trọng số từ app.asar, chạy lại 100 ca đối chiếu trên đúng mô hình nằm trong gói.
- So khớp nguồn chung bằng commit + SHA256 cho rules, classifier, OCR service, pipeline và trọng số. Ngoại lệ trong bộ bảo vệ nguồn chỉ áp dụng các tệp OCR này; không thay công thức lương hoặc chính sách ghi.

Nguồn model/giấy phép: `LuongHAK_Offline/ocr/models/NOTICE.md`. Bộ ảnh đối chiếu: `LuongHAK_Offline/tests/fixtures/handwriting/NOTICE.md` (MNIST, CC BY-SA 3.0). Không có ảnh nhân viên thật, dữ liệu lương, backup hoặc mẫu riêng được commit.
