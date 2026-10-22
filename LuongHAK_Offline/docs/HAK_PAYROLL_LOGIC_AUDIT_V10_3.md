# Kiểm toán logic tính lương V10.3 — rà soát mã nguồn

Phạm vi: `LuongHAK_Offline/engine.js`, `core/payroll/formula-defaults.js`, `core/payroll/formula-evaluator.js` trên nhánh ứng dụng V10.3. Đây là phát hiện qua đọc mã nguồn; chưa có xác nhận với quy chế lương thực tế.

## P1 — Chênh lệch khấu trừ không được chuyển kỳ

`engine.js`: `cl = tongTN - bhNLD - kpcdNLD - truyThu - thue - truKhac - tamUng`; khi `cl < 0`, `thucLinh = 0` và chỉ ghi cảnh báo rằng phần thiếu chưa được chuyển kỳ. Cần sổ theo dõi khoản còn phải thu, nguồn gốc, đối chiếu tạm ứng và cơ chế xử lý kỳ sau có phê duyệt, không tự động khấu trừ vượt quy định.

## P1 — Làm tròn thực lĩnh theo 1.000 VND

`engine.js`: `Math.round(cl / 1000) * 1000`. Ví dụ `cl = 1.234.499` → 1.234.000; `cl = 1.234.500` → 1.235.000. Khoản chênh lệch do làm tròn cần được lưu và đối chiếu, không để mất dấu. Xác nhận quy chế lương trước khi thay đổi.

## P1 — Lấy cấu hình hiệu lực theo giao thoa tháng

`hieuLuc()` và `quyCheBuChinhThuc()` dùng điều kiện giao thoa với tháng và chọn bản ghi có ngày bắt đầu lớn nhất. Nếu chính sách đổi giữa tháng, cách chọn một cấu hình cho cả tháng có thể áp dụng hồi tố cho các ngày trước ngày hiệu lực. Cần quy định rõ cấu hình theo ngày, theo kỳ hay tách thời đoạn, và bổ sung test đổi cấu hình giữa tháng.

## P2 — Diễn giải số tiền và tỷ lệ đầu vào

`num()` có thể hiểu chuỗi `1.500` thành 1.5 (vì một dấu chấm được coi là dấu thập phân), trong khi `money()` hiểu 1.500 là 1500. Đây là hai hàm chủ ý khác nhau; cần kiểm soát kiểu dữ liệu và chuẩn nhập từng trường, tránh dùng nhầm. `pct()` hiểu `10%` thành 0.1 nhưng `10` thành 10; phải định nghĩa và validate biểu diễn tỷ lệ ở danh mục.

## P2 — Mã tăng ca không biết vẫn có fallback

`core/payroll/formula-defaults.js` định nghĩa `OVERTIME_FALLBACK = CONG_TC * HE_SO_TC` cho mã chưa có công thức. Đề xuất chặn chốt hoặc yêu cầu xác nhận khi mã tăng ca không được cấu hình, thay vì tự động tính theo mặc định.

## Cần đối chiếu bổ sung

- Các khoản cấu thành thu nhập chịu thuế, miễn thuế, giảm trừ và mức hiệu lực theo thời điểm.
- Mức đóng BH, căn cứ đóng, trần đóng, truy thu và xử lý nhân viên vào/ra giữa tháng.
- Công chuẩn, ngày lễ, chủ nhật, phép, công tác, tăng ca và sản lượng.
- Bảng tính chi tiết của từng nhân viên, so sánh với bảng lương đã được phê duyệt.
- Công thức trong registry theo CompanyID và hiệu lực, xử lý lỗi/biến thiếu.

## Trạng thái kiểm thử

GitHub Actions run 38902975214: 656/656 test passed. Điều này chứng minh các test hiện có đạt, **không chứng minh những tình huống nghiệp vụ nêu trên đã được kiểm thử hoặc đã phù hợp quy chế**. Chưa thay đổi logic tính lương.
