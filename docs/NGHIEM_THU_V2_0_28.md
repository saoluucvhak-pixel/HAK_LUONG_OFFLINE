# Nghiệm thu kỹ thuật v2.0.28

## Phạm vi
Sửa ngày nghiệp vụ thu hồi/đổi cỡ; kiểm thử dữ liệu nhiều kỳ, đối chiếu báo cáo và các bảo vệ kỳ lương đã chốt. Giữ nguyên phân quyền một người/phân quyền và quy chế tính lương. Toàn bộ dữ liệu thử là giả.

## Kết quả đã chạy tại máy phát triển
| Kiểm tra | Kết quả |
|---|---|
| Lint | Đạt, không cảnh báo |
| Unit/integration/regression chạy tuần tự | 1025/1025 đạt, không bỏ qua |
| Electron Cấp phát từ mã nguồn | 42/42 đạt |
| App Windows đóng gói (win-unpacked), Cấp phát | 42/42 đạt |
| Ghép app.js từ 31 phần nguồn | Khớp |
| Kiểm tra consolidation và công thức được bảo vệ | Đạt |

Bài đo hiệu năng 5.000 nhân viên từng không đạt khi chạy đồng thời cùng OCR trên máy này; chạy lại độc lập và toàn bộ suite tuần tự đạt, giữ nguyên ngưỡng kiểm tra. Một kiểm thử cũ kỳ vọng giờ UTC đã được sửa thành giờ Việt Nam cùng hành vi được sửa.

## Ca nghiệp vụ đã xác minh
- Thu hồi cũ lúc 18:00 UTC ngày 31/10 được báo cáo ngày 01/11 giờ Việt Nam; qua năm mới tương tự.
- Người dùng chọn ngày nghiệp vụ khác ngày thao tác: lưu, đóng/mở lại và khôi phục giữ ngày đã chọn.
- Chặn ngày rỗng, ngày không tồn tại và ngày trước ngày cấp gốc.
- Thu hồi/đổi cỡ giữ ngày cấp, tháng hưởng, tổ và tên vật tư của dòng cấp gốc; không sửa phiếu đã xác nhận.
- Phiếu nháp không cộng vào thực cấp; số tổng hợp và chi tiết, Excel, PDF lấy cùng kết quả báo cáo.
- Nhân viên chuyển tổ: số đã cấp và thu hồi theo từng tổ đã lưu. Định mức sữa không bị cộng lặp khi chuyển tổ.
- Kỳ lương đã chốt: sửa đầu vào không đổi bản chốt; nhập vào kỳ chốt bị chặn. Đổi phương pháp bù sau tính thì từ chối chốt; lỗi lưu chốt phải hoàn tác.
- Khôi phục gói sao lưu sang hồ sơ riêng giữ phiếu, danh mục và lịch sử điều chỉnh; báo cáo trùng trước sao lưu.

## Chưa đủ căn cứ xác nhận
- Cài mới và nâng cấp v2.0.26 bằng trình NSIS Setup trên tài khoản Windows riêng: chưa thực hiện. Không cài thử đè vào tài khoản đang dùng thật.
- Máy hiện tại dựng được app Windows đóng gói, nhưng bước nén NSIS bị Access denied ở công cụ phụ trợ. Bộ Setup cần lấy từ CI Windows của đúng commit.
- Chưa thử in trên máy in thật. PDF đã kiểm tra dữ liệu/định dạng và tạo tệp qua Electron.

## Bàn giao
Hướng dẫn: `docs/CAP_PHAT.md`. Phiên bản hiển thị và package/lock: 2.0.28. CI, commit, bộ cài và SHA-256 phải ghi theo kết quả thực tế; không coi bản nghiệm thu này là chứng nhận đã thử cài Setup.
