# Kế hoạch quý tới — Duyệt lương (payroll approval) và Quyết toán thuế năm

Trạng thái: **kế hoạch, chưa làm mã.** Chủ dự án đã duyệt đưa hai việc vào kế hoạch quý tới (24/11/2026); chưa cho phép bắt đầu làm. Mọi mục dưới đây cần chủ trả lời ở phần "Câu hỏi cần chủ quyết" trước khi có PR đầu tiên.

## 0. Hiện trạng đã xác minh trong mã (v2.1.11)
**Duyệt lương — đã có nền, chưa phải quy trình hoàn chỉnh**
- Quyền `payroll.approve` ("Duyệt bảng lương"), `payment.approve` ("Duyệt chứng từ thanh toán lương"); vai trò "Người phê duyệt" (`core/permissions.js`).
- Chế độ `roles` (`core/workflow-approval.js`): người lập và người duyệt phải khác nhau; bản duyệt gắn mã băm (digest) của bảng lương; màn Tính lương có "Xem bảng để duyệt" (`app-src/screens/tabLuong.js`, `17-chot-ky.js`).
- Chứng từ thanh toán có lập → duyệt riêng (`core/payment-ledger.js`).
- **Chưa biết** (cần chủ nói rõ): phần nào của "duyệt lương" bạn muốn mà bản này chưa có.

**Quyết toán thuế năm — đã có báo cáo hỗ trợ, chưa có tờ khai**
- "Thuế TNCN cả năm" (`core/reporting/period-reports.js` `bcThueNam`): cộng các kỳ ĐÃ CHỐT trong năm theo từng người: tổng thu nhập, tiền cơm không chịu thuế, BH và KPCĐ người lao động đóng, thuế đã khấu trừ, người phụ thuộc (tối đa). Ghi chú trên màn: "đối chiếu thêm với tờ khai 05/KK đã nộp".
- **Chưa có:** tính thuế cả năm theo biểu lũy tiến, giảm trừ bản thân + người phụ thuộc theo số tháng, so với thuế đã khấu trừ (nộp thêm / hoàn), xử lý người nghỉ giữa năm / vào giữa năm / có nhiều nơi thu nhập, xuất mẫu 05/QTT-TNCN hoặc bảng kê 05-1/BK-QTT.

## 1. Nguyên tắc (không đổi)
Một PR một việc; test đỏ trước; không nới test; không đổi công thức lương/thuế đang chạy cho đến khi chủ duyệt bằng văn bản; `engine.js`, `hr.js`, `core/importer.js`, `core/integrity.js`, `core/production-alloc.js` là tệp khóa băm — logic mới đặt ở lớp app/`ui/`/`tests/` hoặc tệp `core/` nằm trong danh sách chừa của CI; mốc nghiệm thu bằng dữ liệu giả + đối chiếu một bộ số liệu do kế toán thuế xác nhận; ghi rõ "chưa nghiệm thu Windows thật".

## 2. Hạng mục A — Duyệt lương
**Mục tiêu đề xuất (cần chủ xác nhận):** mỗi kỳ lương trước khi chốt phải có bản duyệt của người có quyền, gắn đúng mã băm của bảng lương, mọi thay đổi sau duyệt làm bản duyệt mất hiệu lực.
| Mốc | Nội dung | Kiểm |
|---|---|---|
| A1 | Chốt phạm vi + sơ đồ trạng thái: Nháp → Đã lập → Đã duyệt → Đã chốt (+ Trả về, Hủy duyệt có lý do) | tài liệu + chủ ký duyệt |
| A2 | Rà soát khoảng trống so với `workflow-approval.js` hiện có (cấp duyệt, tự duyệt, thông báo) | test mô tả hành vi hiện tại |
| A3 | Hoàn thiện theo A1 (khóa sửa sau duyệt, nhật ký, hiển thị người duyệt trên phiếu/báo cáo) | unit + E2E nhiều tài khoản |
| A4 | Nghiệm thu: kịch bản lập–duyệt–chốt–mở chốt trên dữ liệu giả, 3 vai trò | E2E + checklist Windows |
**Rủi ro:** làm khóa quy trình hiện tại của kế toán nếu cấu hình sai (không đủ hai tài khoản) — đã có cảnh báo `readiness`; cần chế độ chuyển tiếp.

## 3. Hạng mục B — Quyết toán thuế năm
| Mốc | Nội dung | Kiểm |
|---|---|---|
| B1 | Chủ + kế toán thuế chốt phạm vi: mẫu cần xuất, ai nộp (đơn vị hay cá nhân tự quyết toán), quy tắc người nghỉ/vào giữa năm | tài liệu + bộ số liệu mẫu có đáp án |
| B2 | Hàm thuần tính quyết toán năm (biểu thuế lũy tiến, giảm trừ theo tháng) đặt ở `ui/` hoặc `core/` ngoài khóa; chỉ ĐỌC các kỳ đã chốt | unit đối chiếu đáp án mẫu (đỏ trước) |
| B3 | Màn "Quyết toán thuế năm": từng người — thuế phải nộp cả năm, đã khấu trừ, chênh lệch (nộp thêm/hoàn), cảnh báo thiếu dữ liệu (thiếu CCCD/MST/phụ thuộc chưa đăng ký) | E2E |
| B4 | Xuất Excel/PDF theo mẫu chủ chọn; chữ ký, ngày lập, nhãn "TẠM TÍNH" nếu năm còn kỳ chưa chốt | parity bảng–Excel–PDF |
| B5 | Nghiệm thu với kế toán thuế trên dữ liệu thật đã ẩn danh | biên bản |
**Rủi ro:** thuế là số liệu pháp lý — sai thì hậu quả cao; vì vậy B2 chỉ nhận khi khớp 100% bộ đáp án do người có chuyên môn thuế xác nhận. Quy định thuế thay đổi theo năm: tham số (biểu thuế, mức giảm trừ) phải cấu hình theo năm, không cứng trong mã.

## 4. Câu hỏi cần chủ quyết (không có đáp án mặc định)
**Duyệt lương**
1. Mấy cấp duyệt (một cấp hay lập → trưởng bộ phận → giám đốc)?
2. Người lập có được tự duyệt khi công ty chỉ có một tài khoản (chế độ chuyển tiếp)? Đề xuất: không; nếu chỉ một tài khoản thì giữ chế độ hiện tại.
3. Sau khi duyệt, sửa dữ liệu đầu vào có làm mất hiệu lực bản duyệt không? Đề xuất: có (digest đổi).
4. Cần in/ghi tên người lập – người duyệt lên phiếu lương và báo cáo không?
**Quyết toán thuế năm**
5. Mẫu nào: 05/QTT-TNCN (đơn vị quyết toán thay) và/hoặc bảng kê 05-1/BK-QTT; hay chỉ bảng đối chiếu nội bộ?
6. Công ty quyết toán thay cho toàn bộ người lao động, hay một số tự quyết toán? (ảnh hưởng ủy quyền)
7. Người nghỉ giữa năm / vào giữa năm / thu nhập nơi khác: quy tắc xử lý?
8. Biểu thuế và mức giảm trừ áp dụng cho năm nào? Ai cung cấp và xác nhận bộ số liệu đáp án (kế toán thuế)?
9. Làm tròn: theo từng người hay theo tổng?

## 5. Mốc thời gian đề xuất (quý tới, nếu chủ duyệt phạm vi)
- Tháng 1: A1, A2, B1 (chốt phạm vi và bộ đáp án — chủ yếu là quyết định, ít mã).
- Tháng 2: A3, B2.
- Tháng 3: A4, B3, B4; B5 và nghiệm thu Windows thật.
Mốc trượt nếu chưa có câu trả lời ở mục 4 hoặc chưa có bộ đáp án thuế.
