# Câu hỏi nghiệp vụ còn chờ chủ sở hữu / kế toán trả lời

Bảng duy nhất gom hai nguồn: các mục **Q-xx chưa có dấu ✅** trong `docs/BUSINESS_RULES.md` (§2) và bốn điểm lệch với Excel trong `LuongHAK_Offline/docs/V9_PAYROLL_RECONCILIATION.md` (phần E). Cập nhật theo bản 2.0.16 (15/11/2026).

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
