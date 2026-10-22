# Hợp nhất main — 22/10/2026

Theo xác nhận của chủ repo: HAK_LUONG_OFFLINE/main quản lý V10.4 là app chính; giữ dev cũ và KPI chưa duyệt riêng, không tự đưa vào công thức lương. Không hợp nhất repo LUONG_HAK cũ hoặc HAK_OCR_ENGINE sang repo này.

## Nguồn được giữ

- V10.4 alpha.35 f93ffc4 làm nền; design, shared OCR, CNN và kho năm đã nằm trong lịch sử này.
- feature/ocr-page-rectify c7c64e8 được merge nội dung bình thường: thêm bước nắn trang và test ảnh giả lập, không thay engine lương.
- fix/payroll-hardening f5beea4 (bao gồm dev và fix-1-4) giữ toàn bộ snapshot tại legacy/dev-reference. Bản tham chiếu sửa đọc tiền 20.800.000, hiệu lực nhân sự, ngày vào làm, ngày ngoài tháng và cột số thiếu; vẫn còn giới hạn bảo mật nên không phát hành.
- feature/hak-kpi-bridge-governance-tracking ae72280: giữ mô-đun/UI/test/dự thảo tại experimental/kpi; không nạp vào app lương.
- Lịch sử của dev/fix/KPI được nối bằng merge giữ cây V10.4 (ours). Đây là bảo toàn lịch sử và snapshot riêng, không phải tuyên bố đã ghép toàn bộ logic nghiệp vụ vào app chính.

Danh sách 11 đầu nhánh gốc và SHA nằm trong CONSOLIDATED_BRANCHES.json; script check-consolidation kiểm tra mọi SHA đều là tổ tiên của HEAD. Không xóa nhánh cũ.

## Xử lý rủi ro đã phát hiện

Main chỉ phát hành Electron từ LuongHAK_Offline; không đưa HAKDocs.exe hoặc bộ cài NSIS dev v0.1.0 vào gói này. CI dev chỉ được giữ như tệp tham chiếu trong legacy, không nằm tại thư mục workflow hoạt động ở gốc. main dùng phiên bản app alpha.36 và tên artifact theo số run, không ghi đè release v0.1.0.

Không chuyển source dev cũ vào engine chính. App V10.4 đã có khóa kỳ, lịch sử mở chốt, chuẩn hóa tiền và cơ chế lưu riêng. Không tự chia lương CĐ giữa tháng hoặc tự trả tiền KPI. Danh mục mẫu thuế có bản hiệu lực 2026; danh mục thực tế vẫn cần đối chiếu khi sử dụng.

Không di chuyển dữ liệu người dùng, ảnh hồ sơ hay backup thật. Tệp OCR rectify là ảnh giả lập có NOTICE. Gói cài chỉ gồm các đường dẫn được khai báo trong LuongHAK_Offline/package.json, loại trừ legacy và experimental.

## Kiểm tra

Bộ lương chính: 709 kiểm thử cục bộ đạt; legacy: 17; KPI: 37; kiểm tra tổ tiên, phạm vi đóng gói và engine/hr không thay đổi đạt. CI Windows, Electron, ảnh giao diện và bản cài phải đạt trên commit tích hợp trước khi main được cập nhật. Kết quả CI cuối và link Setup được báo riêng sau khi hoàn tất.

## Bổ sung theo yêu cầu về khoản trừ vượt thu nhập

Engine giữ nguyên toàn bộ phép tính thu nhập/thuế/khấu trừ/thực lĩnh, chỉ thêm một dòng ghi nhận giá trị âm trước khi đưa thực lĩnh về 0: Còn thiếu (thực lĩnh âm). Guard so sánh toàn bộ engine với mốc f93ffc4 sau khi bỏ đúng dòng bổ sung này; mọi thay đổi công thức khác đều bị chặn. Cột được hiển thị và xuất cùng bảng lương, nằm trong bản chốt mới; không sửa bản chốt cũ, không tự thu hoặc trừ sang tháng sau. Phiếu lương không coi khoản thiếu này là tiền làm tròn.
