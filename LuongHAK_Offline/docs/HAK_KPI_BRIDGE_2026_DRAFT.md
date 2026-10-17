# HAK KPI BRIDGE 2026 — QUY CHẾ & KẾ HOẠCH TÍCH HỢP (DỰ THẢO KIỂM THỬ)

**Trạng thái: DỰ THẢO — CHƯA BAN HÀNH, KHÔNG DÙNG TRẢ LƯƠNG CHÍNH THỨC.**
**Nguồn:** `02_Quy_Che_Luong_KPI_Bridge_HAK_2026_SanKy.docx`, `03_Phu_Luc_104_KPI_26_Chuc_Danh_HAK_2026_SanKy.docx`, `05_Bieu_Mau_Excel_KPI_Bridge_HAK_2026.xlsx`. Người có thẩm quyền phải rà soát lại toàn bộ căn cứ pháp luật, HĐLĐ, lương chức danh, BHXH, lịch công và OT.

## 1. Phạm vi
Áp dụng thí điểm đối chiếu cho 55 người HAK Đà Nẵng kỳ 09/2026. Danh mục mẫu có 26 vai trò và 104 chỉ tiêu (mỗi vai trò 4 tiêu chí, tổng trọng số 100%). Các công ty khác phải có quy chế, lịch và danh mục hiệu lực riêng theo CompanyID. Hai nhân viên chưa xác định được vai trò; hai người chưa đủ đối chiếu mức BHXH tham chiếu. Chưa có chấm duyệt KPI đủ điều kiện phát sinh chi trả.

## 2. Các thành phần thu nhập, không tính trùng
Thu nhập mục tiêu theo quy chế gồm: lương chức danh thực hưởng + phụ cấp trách nhiệm được hưởng + KPI đã được duyệt + làm thêm giờ hợp lệ + khoản riêng + thưởng hợp lệ. Tất cả khoản đã trả theo công, tấn, chuyến hoặc suất KHÔNG nhân thêm hệ số KPI nếu chưa có cơ sở khoản thưởng độc lập.

- **KPI_TIME**: chỉ khi có mục tiêu, dữ liệu, bằng chứng, duyệt, hiệu lực và quyền hưởng hợp lệ. `KPI_pay=KPI_target × MIN(1, PaidKPIDays/StandardDays) × ApprovedWorkCoefficient`. Số công và KPI_target phải theo HĐLĐ/quy chế, không tự lấy mức BHXH.
- **THEO_DOI**: nhóm công nhật, sản lượng HAK/Đại Hiệp, bơm/ban dăm... chỉ đánh giá, không tự tác động số tiền đã trả.
- **QUY/NAM**: đánh giá/chi trả theo quyết định riêng, không tự tính vào lương tháng.

## 3. Chấm điểm
Mỗi chỉ tiêu: hướng đo, tử số, mẫu số, đơn vị, mục tiêu, trọng số, kỳ đo, nguồn chứng từ, ngoại lệ N/A đã duyệt. Với KPI thuận chiều có mục tiêu hợp lệ: `Score_i = clamp(100 × Actual_i/Target_i, 0, 120)` (chỉ khi cùng đơn vị và mẫu số có ý nghĩa). Chỉ tiêu nghịch chiều dùng hàm riêng đã phê duyệt, tuyệt đối không áp tỷ lệ thuận.
Tổng điểm `sum(Score_i × Weight_i/100)` nếu và chỉ nếu toàn bộ 4 chỉ tiêu đã được duyệt, đủ chứng từ hoặc N/A được quyết định hợp lệ với cách phân bổ trọng số được phê duyệt.
Thang đề xuất: <70=0.70; [70,85)=0.85; [85,95)=0.95; [95,105)=1.00; [105,115)=1.05; >=115=1.10. Chỉ áp dụng vào phần KPI biến động có thỏa thuận, không giảm các khoản tiền lương tối thiểu bắt buộc.

## 4. Phép đối chiếu Bridge — KHÔNG phải công thức tạo KPI
Chạy song song A=Payroll Engine gốc và B=KPI Engine mô phỏng, rồi tính `Delta=B-A`; KHÔNG lấy `K=A-F-R-X-O` làm khoản trả lương KPI tự động. Mọi Delta phải giải thích theo công, lịch nghỉ, sản lượng, mức lương HĐLĐ, OT, khoản phụ cấp, khấu trừ, thuế, BHXH và làm tròn. Kỳ đã chốt chỉ đọc.

## 5. Phân bổ sản lượng bảo toàn
HAK: bù theo bình quân tổ có ngưỡng BT tháng của DM_LUONG. Đại Hiệp: bù theo ngày và các bậc BT riêng. Không dùng KPI để nhân lần nữa tiền theo tấn, xe hoặc công đã tính.

## 6. Dữ liệu phải xây trong HAK_LUONG_OFFLINE
- `kpi_roles` (RoleID, CompanyID, Name, Mode, EffectiveFrom/To, Status)
- `kpi_indicators` (IndicatorID, RoleID, Version, Weight, Direction, Target, Unit, Numerator, Denominator, EvidencePolicy, Status, EffectiveFrom/To)
- `kpi_assignments` (EmployeeID, CompanyID, Period, RoleID, TargetVersion, AcceptedAt, Status)
- `kpi_evidence` (EvidenceID, EmployeeID, Period, IndicatorID, SourceDocID, Numerator, Denominator, Actual, Reviewer, Status, CheckedAt)
- `kpi_approvals` (EmployeeID, Period, PolicySnapshotID, IndicatorResults, FinalScore, WorkCoefficient, ApprovedBy, ApprovedAt, Status)
- `kpi_bridge_results` (CompanyID, EmployeeID, Period, LegacySnapshot, Simulation, Delta, Reasons, Readonly)
- `kpi_audit` (append-only events)

KPI danh mục dùng modal cha–con và Smart Filter hiện có. Chỉ cho phép ghi qua repository và kiểm quyền tại Electron Main; không dùng cột ẩn ở renderer để đảm bảo bảo mật.

## 7. Quy trình
Giao KPI trước kỳ → nhân viên xác nhận → nộp chứng từ → quản lý duyệt từng chỉ tiêu → Nhân sự đối chiếu công, mục tiêu → Kế toán đối chiếu tiền và BHXH/thuế → phê duyệt → snapshot → chuyển payroll nếu đủ điều kiện ban hành. Không mặc định điểm 100 hay hệ số 1 với hồ sơ chờ duyệt.

## 8. Điều kiện nghiệm thu & đặc biệt lưu ý
- Số liệu Excel tháng 09/2026 chỉ là mô phỏng. Excel mẫu đang lấy mức BHXH tham chiếu vào công thức, phải sửa trước khi xác nhận tiền KPI.
- Không tạo KPI âm; không biến chênh lệch thành KPI; không đóng kỳ khi thiếu số liệu/hồ sơ.
- Nhánh này hiện là **giai đoạn quy chế/đặc tả**, chưa có tính năng KPI tương tác được tích hợp vào Electron. Bản Setup xây từ nhánh này **không được quảng cáo là đã có giao diện KPI** trước khi có chứng cứ E2E.

## 9. Kế hoạch phát triển
1. Sửa dữ liệu/công thức KPI workbook (BHXH tham chiếu ≠ lương chức danh); kiểm tra các trạng thái duyệt và N/A.
2. Tạo module KPI thuần số liệu và test 4/4, trọng số, hiệu lực, CompanyID, âm, chênh lệch.
3. Tạo UI cha–con, giao KPI, chứng từ, phê duyệt, Bridge diff trên Electron.
4. Chạy E2E, hồi quy lương bằng 0, bảo mật, build Windows; chỉ khi đó phát hành Setup để UAT KPI.
