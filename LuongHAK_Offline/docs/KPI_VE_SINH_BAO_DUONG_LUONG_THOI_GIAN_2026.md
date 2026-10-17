# PHỤ LỤC DỰ THẢO — CƠ CẤU LƯƠNG THỜI GIAN, VỆ SINH / BẢO DƯỠNG

**Áp dụng:** mô phỏng/đối chiếu KPI Bridge HAK, không thay đổi kết quả kỳ đã chốt, không tự phê duyệt quyền hưởng, không tự loại khoản nào khỏi BHXH.

## Đối tượng và mã khoản
- `CN_VS`: công nhân nữ / công nhân được giao công việc vệ sinh, chuyên cần (quyền hưởng theo nhiệm vụ, không mặc định theo giới tính).
- `TX_VS_XE`: tài xế — vệ sinh/kiểm tra xe được giao.
- `CK_VS_TB`: cơ khí — vệ sinh, bảo dưỡng thiết bị.
- `CG_BD_VS_XE`: cơ giới — bảo dưỡng và vệ sinh xe, máy.
Mỗi mã phải có CompanyID, EmployeeID, công việc, mức duyệt, kỳ hiệu lực, bằng chứng hoàn thành, người phê duyệt. Tách tiền KPI khỏi khoản nhiệm vụ có thật; không gọi một phần lương cố định bằng tên vệ sinh chỉ để thay đổi nghĩa vụ BHXH.

## Biến và hàm mô phỏng
- B = lương làm căn cứ BHXH tham chiếu, **không mặc nhiên là lương chức danh**.
- M = thu nhập tháng mục tiêu đã được xác nhận theo hồ sơ, phải làm rõ bao gồm/không bao gồm OT và phụ cấp nào.
- D = ngày công hợp lệ, N = công chuẩn theo lịch (24 chỉ là mốc đề xuất, không cứng trong engine).
- K = hệ số vệ sinh/bảo dưỡng được xác minh, Ke = hệ số công vượt chuẩn **dành riêng cho so sánh**.
- V = mức vệ sinh/bảo dưỡng tháng có thẩm quyền phê duyệt, F = các khoản cố định khác có chứng từ.
- C = MIN(D,N), E = MAX(0,D-N).
- L_B = ROUND(B*C/N).
- L_V = ROUND(V*MIN(công đủ điều kiện vệ sinh,N)/N*K).
- L_F = ROUND(F*C/N).
- L_E = ROUND(E*M/N*Ke) **chỉ là giá trị tham khảo** trước khi phân loại công vượt, không tự cộng vào OT/payroll thực.
- L_preview = L_B+L_V+L_F+L_E.
- Gap = M-B, Unallocated = M-B-V-F. Nếu âm: BLOCK, nếu dương: cần xác định khoản chênh chưa phân loại; **không biến phần dư thành KPI/vệ sinh**.
- Độ nhạy theo hệ số: dL/dK = V*MIN(D_eligible,N)/N. Công trong chuẩn: (B+F+V*K)/N. Công vượt: M*Ke/N (chỉ báo kiểm tra). Hệ số suy ngược để đối chiếu: (M-L_B-L_F-L_E)/(V*D_eligible/N), **không phải hệ số phê duyệt**.
Khi N=24,D=24,K=1 và B+V+F=M: L_preview=M. Khi D>24 cần tách công ngày thường, ngày nghỉ tuần, ngày lễ, ca đêm và các khoản đã thanh toán riêng.

## Cách xác minh trước khi áp dụng
1. Dữ liệu thu nhập tháng M và B phải có hợp đồng/phụ lục hiệu lực, so sánh tiền theo cùng phạm vi, không lẫn BHXH NLĐ đóng, OT hoặc thưởng.
2. Danh mục công việc vệ sinh/xe/thiết bị quy định tiêu chí thực tế, lịch kiểm tra, biên bản, quyền hưởng. Phụ cấp chuyên cần không đồng nghĩa tiền vệ sinh.
3. Đơn vị duyệt công chuẩn thực tế và phân loại ngày công >24. Tiền làm thêm bắt buộc tính từ giờ và loại ngày theo quy định, độc lập chỉ báo L_E.
4. BHXH: nhận diện khoản thường xuyên ổn định và bản chất tiền lương theo pháp luật, không tự chuyển phần chênh sang tiền vệ sinh để loại đóng.
5. Phê duyệt KPI chỉ áp dụng cho phần thực sự biến đổi theo kết quả; không giảm các quyền lợi được bảo đảm.
6. Không cộng thêm L_preview vào lương đang tính; đây là phép **phân rã một tổng thu nhập**. Chỉ khi có quyết định hiệu lực và điều chỉnh động cơ cấu mới chuyển tiền từng khoản, đối chiếu không tính trùng.

## Ví dụ không gắn với lao động cụ thể
B=6.000.000, M=8.000.000, V=1.500.000, F=500.000, N=24, D=24, K=1 => mô phỏng 6.000.000 + 1.500.000 + 500.000 = 8.000.000.
K=0,8 => vệ sinh còn 1.200.000, lệch mục tiêu -300.000 (không được tự động giảm lương nếu khoản cố định được bảo đảm).
D=26, Ke=1 => L_E tham khảo 666.667, cần xác minh loại ngày và đối chiếu với tiền OT đã có.

**Tính năng app:** menu KPI Bridge có mô phỏng nhập B,M,D,K,V,F,N,Ke. Hàm nằm trong `core/kpi-time-structure.js`, độc lập `engine.js`, không chuyển kết quả sang kỳ lương. Chỉ sử dụng cho kiểm thử và tìm biến liên kết. 
