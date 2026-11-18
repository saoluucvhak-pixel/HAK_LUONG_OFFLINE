# Câu hỏi còn chờ chủ sở hữu / kế toán trả lời

Bảng duy nhất gom hai nguồn: các mục **Q-xx chưa có dấu ✅** trong `docs/BUSINESS_RULES.md` (§2) và bốn điểm lệch với Excel trong `LuongHAK_Offline/docs/V9_PAYROLL_RECONCILIATION.md` (phần E). Cập nhật 18/11/2026 (bản 2.0.33): mục A và B đã đóng; mục D là quyết định kỹ thuật mới. Bản trước: 2.0.16 (15/11/2026).

**Nguyên tắc:** trong lúc chờ, app **giữ nguyên** hành vi ở cột "Hiện tại". Không đổi công thức lương, thuế, bảo hiểm trước khi có xác nhận bằng văn bản. Khi một mục được trả lời, ghi kết quả vào `BUSINESS_RULES.md` (thêm quy tắc R-xx, đánh dấu ✅ cho mục Q-xx) rồi xóa dòng ở đây.

## A. Câu hỏi Q-xx đang mở

Không còn. Ngày 17/11/2026 chủ sở hữu trả lời **"giữ nguyên theo app"** cho Q-02, Q-03, Q-05, Q-08, Q-09, Q-10, Q-11, Q-17: giữ hành vi hiện tại, không đổi công thức (đã đánh dấu ✅ trong `BUSINESS_RULES.md` §2).

## B. Bốn điểm lệch giữa app và Excel gốc

Đã đóng ngày 17/11/2026: chủ sở hữu chọn **giữ nguyên theo app** cho E1 (thuế TNCN trong "Thu nhập còn lại"), E2 (KPCĐ khi tính thu nhập chịu thuế), E3 (truy thu BH theo R-57/R-60) và E4 (công chuẩn mã CĐ). Chi tiết gốc xem `LuongHAK_Offline/docs/V9_PAYROLL_RECONCILIATION.md` phần E.

## C. Việc dữ liệu (không phải câu hỏi quy tắc) cần bên vận hành xử lý

Các việc này nảy sinh khi kiểm tra dữ liệu thật; chi tiết nhân viên cụ thể không ghi trong repo.
- Nhân viên chọn thanh toán "Chuyển khoản" nhưng thiếu số tài khoản hoặc ngân hàng (chặn xuất bảng kê chuyển khoản chính thức).
- Mã bảo hiểm `BH_KPCD` còn thiếu trong danh mục; cột thuế TNCN đang toàn 0.
- Có phiếu cân chưa gán người nhận; một số nhân viên có công/ngày vượt mức (3 công/ngày) hoặc công tháng vượt xa công chuẩn cần xác nhận.
- Chưa có dòng nào trong "Quyền lợi phép": từ v2.0.11, mọi đơn phép năm bị chặn cho đến khi nhập hạn mức phép năm theo từng hợp đồng.

## D. Quyết định kỹ thuật đang chờ chủ sở hữu (18/11/2026)

Không phải câu hỏi quy tắc lương. Mỗi mục có tài liệu và số đo kèm theo; không mục nào đổi công thức hay kỳ đã chốt.

| # | Quyết định | Khuyến nghị | Tài liệu |
|---|---|---|---|
| D1 ✅ (v2.0.35) | Thêm kiểm tra bản nền (`baseSig`) cho lưu dữ liệu: ghi dựa trên bản cũ bị từ chối và giao diện nạp lại bản mới, thay vì ghi đè âm thầm. Đã tái hiện: ghi ngoài giao diện bị giao diện ghi đè khi đóng/tải lại | Làm trước, độc lập với D2 (chặn đúng lớp rủi ro này, chi phí nhỏ hơn D2) | `WRITE_PATH_DELTA_DESIGN.md` §7, `docs/v2.0.34/` |
| D2 | Duyệt thiết kế delta giai đoạn 2 (giao diện chỉ gửi bảng đổi; main làm việc theo phần đổi) | Duyệt sau D1; cần thử trên Electron/Windows thật; mục tiêu < 150 ms ở 5.000 NV (hiện ≈272/378 ms p50/p95 ở main) | `WRITE_PATH_DELTA_DESIGN.md` §5, `PERFORMANCE_REPORT.md` |
| D3 | Gộp PR bằng chứng nghiệm thu (#77: test đối chiếu báo cáo, CI kiểm bộ cài thật, đo quy mô) khi CI xanh | Gộp khi CI xanh đúng commit | PR #77 |
| D4 | Bật lại mã hóa dữ liệu trên đĩa và ký số bộ cài | Tạm dừng theo yêu cầu 15/11/2026; khi bật lại phải trình bày thiết kế trước (dữ liệu nay nằm trong SQLite) | `TODO_ROADMAP.md` |
| D5 | Thử bộ cài trên máy Windows thật (cài mới, nâng cấp từ JSON/SQLite cũ, gỡ rồi cài lại giữ dữ liệu, in thử) | Cần chủ sở hữu; danh mục kiểm thủ công ở `SCREEN_ACCEPTANCE_MATRIX.md` | `ACCEPTANCE_SQLITE_RELEASE.md` §7 |
