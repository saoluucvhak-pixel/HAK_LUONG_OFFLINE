# Câu hỏi nghiệp vụ còn chờ chủ sở hữu / kế toán trả lời

Bảng duy nhất gom hai nguồn: các mục **Q-xx chưa có dấu ✅** trong `docs/BUSINESS_RULES.md` (§2) và bốn điểm lệch với Excel trong `LuongHAK_Offline/docs/V9_PAYROLL_RECONCILIATION.md` (phần E). Cập nhật theo bản 2.0.16 (15/11/2026).

**Nguyên tắc:** trong lúc chờ, app **giữ nguyên** hành vi ở cột "Hiện tại". Không đổi công thức lương, thuế, bảo hiểm trước khi có xác nhận bằng văn bản. Khi một mục được trả lời, ghi kết quả vào `BUSINESS_RULES.md` (thêm quy tắc R-xx, đánh dấu ✅ cho mục Q-xx) rồi xóa dòng ở đây.

## A. Câu hỏi Q-xx đang mở

| ID | Chủ đề | Câu hỏi | Hiện tại (app đang làm) | Ai trả lời |
|---|---|---|---|---|
| Q-02 | Tổng công | "Tổng công" có **gồm công tăng ca** không? Ảnh hưởng ngưỡng BH, phụ cấp theo công, hỗ trợ cơ giới. | Có (giữ như bản Google gốc). | Kế toán tiền lương |
| Q-03 | Thuế | Tiền cơm: loại trừ **toàn bộ** khỏi thu nhập chịu thuế hay chỉ đến mức quy định? | Loại trừ toàn bộ. | Kế toán / thuế |
| Q-05 | Lương âm | Khoản trừ vượt thu nhập (thực lĩnh âm): chuyển sang kỳ sau, thu hồi tiền mặt hay xóa? | Để thực lĩnh 0 và cảnh báo; ghi cột "Còn thiếu (thực lĩnh âm)". | Kế toán tiền lương |
| Q-08 | Sản lượng | Một phiếu cân nhiều người: chia theo tỷ lệ, khối lượng, số công, hệ số hay tổ? | Đã chạy theo R-66/R-73 (chia theo tổ và công BT). Mục này cần đóng lại nếu chủ sở hữu xác nhận R-66/R-73 thay thế hoàn toàn. | Chủ sở hữu |
| Q-09 | Phụ cấp | Ngày công tác có nhãn (QC…) trên dòng CL/PN có được phụ cấp công tác không? | Có (mọi dòng có nhãn). | Kế toán tiền lương |
| Q-10 | Thuế | Khấu trừ vãng lai 10%: áp dụng mọi khoản hay chỉ khi mỗi lần chi đạt ngưỡng theo quy định hiện hành? | Áp dụng mọi khoản. | Kế toán / thuế |
| Q-11 | Bảo mật | Bản Google Apps Script (GAS-01): đổi quyền truy cập web app sang chỉ người trong tổ chức hoặc danh sách email? | Đang mở cho mọi người có link. | Chủ sở hữu |
| Q-17 | Pháp lý | Tiền làm thêm giờ: hệ số tăng ca đang khai báo (ví dụ 0,5) và việc công tăng ca nằm trong *Tổng công* có bảo đảm mức tối thiểu của Bộ luật Lao động không? | Giữ nguyên công thức bảng lương gốc. | Kế toán / pháp chế |

## B. Bốn điểm lệch giữa app và Excel gốc (đối chiếu T9/2025 và T11/2025)

Nguồn: `LuongHAK_Offline/docs/V9_PAYROLL_RECONCILIATION.md`, nhóm **E — cần quyết định của quản lý**. Đây là các điểm app và Excel tính **khác nhau**; cần chọn cách nào là đúng.

| # | Điểm lệch | Excel gốc làm | App đang làm | Ảnh hưởng | Ai quyết |
|---|---|---|---|---|---|
| E1 | Thuế TNCN trong "Thu nhập còn lại" | **Không** khấu trừ thuế TNCN (ví dụ nhân viên lương 30 triệu). | Có khấu trừ. | Tiền thực lĩnh của người có thuế. | Quản lý / kế toán |
| E2 | KPCĐ khi tính thu nhập chịu thuế | Không đồng nhất: T9 không trừ, T11 có trừ. | Có trừ (`engine.js`: chịu thuế = tổng thu nhập − BH NLĐ − KPCĐ NLĐ − tiền cơm). | Số thuế TNCN. | Kế toán / thuế |
| E3 | Truy thu BH khi chưa đủ công | Vừa trừ phần người lao động, vừa truy thu phần doanh nghiệp. | Theo R-57 / R-60 (chủ sở hữu đã chọn phương án A). Cần xác nhận lại có trùng cách Excel không. | Số BH trừ và truy thu. | Kế toán tiền lương |
| E4 | Công chuẩn của mã CĐ | Hai bên dùng hai giá trị khác nhau: 25 và 30 ngày (báo cáo đối chiếu không ghi rõ bên nào dùng giá trị nào — cần kiểm tra Danh mục Mã lương và file Excel). | Xem cột bên trái. | Báo cáo đối chiếu ghi không ảnh hưởng tiền. | Kế toán tiền lương |

Các nhóm khác trong cùng báo cáo đối chiếu **không** cần câu trả lời mới: B (khác biệt quy chế đã duyệt, R-73), C (1 nhân viên lệch thuế ~3,2 nghìn đồng do hồ sơ người phụ thuộc, là việc sửa dữ liệu), D (quy định pháp lý theo kỳ, cần người có thẩm quyền xác nhận khi cần).

## C. Việc dữ liệu (không phải câu hỏi quy tắc) cần bên vận hành xử lý

Các việc này nảy sinh khi kiểm tra dữ liệu thật; chi tiết nhân viên cụ thể không ghi trong repo.
- Nhân viên chọn thanh toán "Chuyển khoản" nhưng thiếu số tài khoản hoặc ngân hàng (chặn xuất bảng kê chuyển khoản chính thức).
- Mã bảo hiểm `BH_KPCD` còn thiếu trong danh mục; cột thuế TNCN đang toàn 0.
- Có phiếu cân chưa gán người nhận; một số nhân viên có công/ngày vượt mức (3 công/ngày) hoặc công tháng vượt xa công chuẩn cần xác nhận.
- Chưa có dòng nào trong "Quyền lợi phép": từ v2.0.11, mọi đơn phép năm bị chặn cho đến khi nhập hạn mức phép năm theo từng hợp đồng.
