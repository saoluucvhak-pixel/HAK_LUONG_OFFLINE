# HAK KPI Bridge — Tiêu chí hồ sơ nhập gỗ keo FSC/PEFC (DỰ THẢO)

## Phạm vi
Thêm tiêu chí hồ sơ nhập gỗ keo cho 3 vai trò `KT`, `XNK`, `TRAM_CAN`. Mỗi vai trò tăng từ 4 lên 5 chỉ tiêu nhưng tổng trọng số vẫn 100%: [30,25,15,10,20]. Bộ 26 vai trò nâng tổng 104 lên 107 chỉ tiêu. Không thay đổi Payroll Engine và kỳ lương đã chốt.

## Trách nhiệm và mẫu số
- Trạm cân: phiếu cân, biển số, số chứng từ, nguồn gốc, mã lô, dấu vết thay đổi; chỉ các lô thực nhận thuộc ca được giao.
- Kế toán: hồ sơ NCC, hợp đồng, chứng từ giao dịch, khối lượng, phiếu nhập kho và đối chiếu với phiếu cân; chỉ chứng từ đúng phạm vi kế toán.
- XNK: thông tin khai báo FSC/PEFC theo chứng từ và loại claim được phép, chứng chỉ/hạn hiệu lực và liên kết lô hàng đến bộ hồ sơ xuất; chỉ lô được giao XNK kiểm soát.
- Không tự xác nhận hàng hóa là FSC/PEFC-certified chỉ vì có ghi nhận nguồn gốc hoặc ký hiệu. Chuẩn FSC/PEFC/CoC cụ thể cần kiểm tra theo chính sách khách hàng, phạm vi chứng chỉ và tài liệu có hiệu lực.
- KPI_doc = hồ sơ đạt các bước xác minh thuộc trách nhiệm / hồ sơ phải kiểm. Tạm đề xuất target >= 98%, có chứng từ và trạng thái duyệt, nhân sự được quyền khiếu nại. Không phát sinh hồ sơ: N/A cần duyệt, không mặc định 100%.

## Phân bổ theo lịch 30 ngày, 26 công, trong đó 24 công lương + 2 công KPI FSC
Mục đích là phân loại ngày công nội bộ, **không thay thế quyền lợi lương bình thường hoặc tự sinh tăng ca**.
- N_lich = số ngày theo lịch làm việc (ví dụ 26); N_luong = công phân bổ vào lương thời gian (ví dụ 24); D = số công thực tế hợp lệ.
- Công lương = MIN(D, N_luong).
- Công KPI FSC = MIN(MAX(0,D-N_luong), MAX(0,N_lich-N_luong)).
- Công ngoài lịch = MAX(0,D-N_lich); đối chiếu ca/ngày nghỉ và OT thực tế riêng.
- Giá trị quy đổi FSC = Công KPI FSC × mức mỗi công có đơn vị và phê duyệt. Mức 100 hoặc 200 chưa được xác nhận là điểm hay nghìn đồng; không tự chuyển thành tiền lương.
- Ví dụ tháng 30 ngày, lịch 26 công, thực làm 26: 24 công lương, 2 công FSC. Làm 25: 24 + 1; làm 24: 24 + 0.
- HAK đã xác định thu nhập tháng **bảo đảm bao gồm KPI**: nếu quy đổi FSC thành tiền đã nằm trong quỹ KPI thì chỉ phân bổ lại cấu phần; không cộng trùng vào tổng thu nhập cam kết.
- Việc phân bổ 2 công FSC không được làm mất lương bắt buộc của ngày làm việc bình thường theo HĐLĐ/pháp luật.

## Quy trình
(1) đối chiếu lô hàng và số phiếu; (2) kiểm tra chứng chỉ và claim theo từng hệ thống FSC/PEFC; (3) xác nhận chất lượng chứng từ; (4) chấm KPI 5 chỉ tiêu; (5) thẩm định số ngày công chênh; (6) duyệt KPI và đối chiếu mức lương bảo đảm. Hệ số KPI từ hồ sơ FSC/PEFC không thay mức lương đóng BHXH; không tự làm giảm cam kết G.

## Triển khai
Module thử nghiệm `core/kpi-fsc-pefc.js`; danh mục được bổ sung tại `core/kpi-catalog.js`. Chưa tự động đồng bộ hồ sơ từ `PhieuCan` / MISA / XNK, chưa ghi vào bảng lương. Chỉ đưa vào vận hành sau khi có dữ liệu và mẫu kiểm chứng, kiểm thử E2E và phê duyệt quy chế.
