# HAK KPI BRIDGE 2026 — QUY TẮC DUY NHẤT / BẢNG GIẢI QUYẾT MÂU THUẪN
**Trạng thái:** DỰ THẢO THỬ NGHIỆM; không thay đổi lương chính thức hay các kỳ khóa. Dùng đúng mô hình FIXED_INCLUDES_KPI. Không dùng KPI cộng ngoài bảo đảm.

## Quy tắc tính tiền duy nhất
- M = C + V0 + P0 + F0 theo cam kết bằng văn bản và từng CompanyID / EmployeeID / PolicyVersion / thời đoạn hiệu lực. BHXH không phải C.
- P0 = P_nghiepvu + P_FSC; chỉ 3 vai trò KT / XNK / TRAM_CAN có quỹ FSC.
- FSC metric 20% trong danh mục dùng làm chất lượng hồ sơ. Để không tính hai lần tiền, khi dùng công FSC phải tách quỹ FSC khỏi quỹ KPI nghiệp vụ: `P_FSC_pay=MIN(P_FSC_max,D_FSC*DonGiaNgayVND*K_FSC)`, `P_other_pay=(P0-P_FSC_max)*R_KPI*K_KPI_nghiepvu`. Không đồng thời trả tiền theo tỷ trọng FSC trong hệ số KPI tổng và theo ngày.
- K_FSC = MIN(1, (HoSoDat/HoSoThuocTrachNhiem)/MucTieu). Không phát sinh hồ sơ cần duyệt N/A có lý do và phân bổ chỉ tiêu nghiệp vụ.
- G = mức bảo đảm được hưởng theo hợp đồng/quy chế, không biến động vì hệ số KPI/vệ sinh; `TOPUP=MAX(0,G - C_thuc - V_thuc - P_other_pay - P_FSC_pay - F_thuc)`.
- Chưa xác nhận mức công FSC `100/200` là VND hoặc điểm và chưa duyệt quỹ: KHÔNG tạo P_FSC_pay. Quy đổi điểm chỉ cho phân tích; bảng lương chưa được thay đổi.

## Công chuẩn, công FSC, công tăng ca
- `N_lich` là số ngày làm việc bình thường của lịch nhân viên (ví dụ 26 trong tháng 30 ngày), `N_phanbo_TG` là mốc phân bổ lương TG (ví dụ 24), `D` là công thực tế.
- `D_FSC = MIN(MAX(0,D-N_phanbo_TG), MAX(0,N_lich-N_phanbo_TG))`; ví dụ 26 công => 24 TG + 2 FSC; không biến 2 công hợp lệ thành giờ OT.
- Payroll Engine hiện hành có công chuẩn theo DM_LUONG, `Công chuẩn 2`, TC1–TC6; chưa thay engine. Bắt buộc giải xung đột theo từng mã trước khi kích hoạt.
- Bất kỳ ngày/giờ OT chính thức phải có xác nhận OT thực tế và trả ngoài mức bảo đảm đúng pháp luật. Số công phân bổ FSC không thay thế quyền lợi lương ngày làm bình thường.

## Nhiệm vụ vệ sinh/bảo dưỡng và trùng KPI
- CN_VS, TX_VS_XE, CK_VS_TB, CG_BD_VS_XE, TK_VS_KHO: đánh giá A/B/C/D theo ngày/nhiệm vụ thực hiện có minh chứng và cấp duyệt.
- Cấm chấm cùng một thao tác vệ sinh vào cả khoản VS và KPI nghiệp vụ, trừ khi có tiêu chí kết quả nghiệp vụ độc lập, định nghĩa và chứng từ khác nhau.
- Không mặc định giới tính, chức danh, phụ cấp và mức BHXH quyết định quyền hưởng.

## Hệ thống kiểm soát và điều kiện chưa đạt
- Danh mục V2: 26 vai trò, 107 tiêu chí; KT, XNK, TRAM_CAN có 5, còn lại 4.
- N/A: có lý do ngoại lệ + người phê duyệt + quy chế N/A, chia lại trọng số các KPI còn hiệu lực; không ngầm cho 100 hoặc 0. Core kpi-bridge được cập nhật, giao diện phê duyệt N/A chính thức chưa hoàn thiện.
- Cần hồ sơ KPI chi tiết: CompanyID, EmployeeID, Period, RoleID, PolicyVersion, IndicatorID, Numerator/Denominator, SourceDocID, exception, Reviewer, Status, ApprovalAt. Hiện chỉ có màn hình lưu dự thảo và xem chứng từ, chưa tích hợp dữ liệu phiếu cân/MISA/XNK tự động.
- Tính theo CompanyID+PayrollMethod+PolicyVersion và khoảng hiệu lực; riêng công nhật, sản lượng HAK/Đại Hiệp phải giữ công thức hiện hành, không nhân KPI lên khoản theo công/tấn/xe.
- Hệ thống chỉ dùng mô phỏng, toàn bộ `payrollWriteAllowed=false`; sửa engine chính thức cần kiểm thử các trường hợp đổi HĐLĐ giữa tháng, ngưỡng công, TC1–TC6, 0 công, nghỉ phép/nghỉ không lương, kỳ khóa, tỷ lệ BHXH và báo cáo thuế.

## Các hạng mục không thể tự xác quyết
1. U_FSC=100/200 có phải là 100/200 nghìn VND không? chưa rõ => chặn tính VND.
2. Tỷ lệ P_FSC trong quỹ P0 theo từng vai trò chưa được phê duyệt.
3. Mốc 24 công TG trong lịch 26 là phân bổ tiền nội bộ hay một điều khoản thỏa thuận lương theo công? Cần xác nhận không làm thiếu lương thời gian và tránh OT trùng.
4. Ai có thẩm quyền duyệt ngoại lệ N/A, chứng từ CoC, lịch công và thời đoạn hiệu lực của lương?
5. Cần 2–3 kỳ dữ liệu thực tế để đối chiếu engine chính thức; không kích hoạt trả lương từ bản dự thảo.
