# HAK KPI Bridge — Tiêu chí hồ sơ nhập gỗ keo FSC/PEFC (DỰ THẢO)

> **QUY TẮC MỚI ƯU TIÊN (17/10/2026):** Công vượt công chuẩn riêng của bộ phận là dữ liệu cần đối chiếu **tăng ca thực tế**, không bao giờ tự được phân bổ thành công KPI FSC. Trạm cân 26 công; XNK/KTT/TGĐ/quản lý 22 công; văn phòng nghỉ Chủ nhật và thứ Bảy nửa ngày (công chuẩn theo lịch). FSC chỉ chấm chất lượng hồ sơ và quỹ nội bộ đã bảo đảm. Xem `KPI_ROLE_SCHEDULE_AND_OVERTIME_2026.md`. Nội dung cũ trái nguyên tắc này đã hết giá trị.


## Phạm vi
Thêm tiêu chí hồ sơ nhập gỗ keo cho 3 vai trò `KT`, `XNK`, `TRAM_CAN`. Mỗi vai trò tăng từ 4 lên 5 chỉ tiêu nhưng tổng trọng số vẫn 100%: [30,25,15,10,20]. Bộ 26 vai trò nâng tổng 104 lên 107 chỉ tiêu. Không thay đổi Payroll Engine và kỳ lương đã chốt.

## Trách nhiệm và mẫu số
- Trạm cân: phiếu cân, biển số, số chứng từ, nguồn gốc, mã lô, dấu vết thay đổi; chỉ các lô thực nhận thuộc ca được giao.
- Kế toán: hồ sơ NCC, hợp đồng, chứng từ giao dịch, khối lượng, phiếu nhập kho và đối chiếu với phiếu cân; chỉ chứng từ đúng phạm vi kế toán.
- XNK: thông tin khai báo FSC/PEFC theo chứng từ và loại claim được phép, chứng chỉ/hạn hiệu lực và liên kết lô hàng đến bộ hồ sơ xuất; chỉ lô được giao XNK kiểm soát.
- Không tự xác nhận hàng hóa là FSC/PEFC-certified chỉ vì có ghi nhận nguồn gốc hoặc ký hiệu. Chuẩn FSC/PEFC/CoC cụ thể cần kiểm tra theo chính sách khách hàng, phạm vi chứng chỉ và tài liệu có hiệu lực.
- KPI_doc = hồ sơ đạt các bước xác minh thuộc trách nhiệm / hồ sơ phải kiểm. Tạm đề xuất target >= 98%, có chứng từ và trạng thái duyệt, nhân sự được quyền khiếu nại. Không phát sinh hồ sơ: N/A cần duyệt, không mặc định 100%.

## KPI FSC và công tăng ca được tính độc lập
Tiêu chí FSC chỉ dùng số bộ hồ sơ được giao và tỷ lệ hồ sơ được xác minh đạt mục tiêu.
`K_FSC = MIN(1, (Hồ sơ đạt / Hồ sơ kiểm) / tỷ lệ mục tiêu)`.
`FSC_PAY = MIN(Quỹ FSC đã duyệt, số đơn vị hồ sơ FSC đã duyệt × mức VND/đơn vị × K_FSC)`.
FSC_PAY đã nằm trong quỹ KPI tháng và chỉ được phân bổ 1 lần. Không dùng công thứ 25–26 để sinh FSC_PAY.
Công tăng ca phải căn cứ giờ/ca thực tế và loại ngày; công vượt chuẩn chỉ là chỉ báo cần kiểm tra.

## Quy trình
(1) đối chiếu lô hàng và số phiếu; (2) kiểm tra chứng chỉ và claim theo từng hệ thống FSC/PEFC; (3) xác nhận chất lượng chứng từ; (4) chấm KPI 5 chỉ tiêu; (5) thẩm định số ngày công chênh; (6) duyệt KPI và đối chiếu mức lương bảo đảm. Hệ số KPI từ hồ sơ FSC/PEFC không thay mức lương đóng BHXH; không tự làm giảm cam kết G.

## Triển khai
Module thử nghiệm `core/kpi-fsc-pefc.js`; danh mục được bổ sung tại `core/kpi-catalog.js`. Chưa tự động đồng bộ hồ sơ từ `PhieuCan` / MISA / XNK, chưa ghi vào bảng lương. Chỉ đưa vào vận hành sau khi có dữ liệu và mẫu kiểm chứng, kiểm thử E2E và phê duyệt quy chế.
