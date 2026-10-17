# HAK KPI Bridge — Tiêu chí hồ sơ nhập gỗ keo FSC/PEFC (DỰ THẢO)

## Phạm vi
Thêm tiêu chí hồ sơ nhập gỗ keo cho 3 vai trò `KT`, `XNK`, `TRAM_CAN`. Mỗi vai trò tăng từ 4 lên 5 chỉ tiêu nhưng tổng trọng số vẫn 100%: [30,25,15,10,20]. Bộ 26 vai trò nâng tổng 104 lên 107 chỉ tiêu. Không thay đổi Payroll Engine và kỳ lương đã chốt.

## Trách nhiệm và mẫu số
- Trạm cân: phiếu cân, biển số, số chứng từ, nguồn gốc, mã lô, dấu vết thay đổi; chỉ các lô thực nhận thuộc ca được giao.
- Kế toán: hồ sơ NCC, hợp đồng, chứng từ giao dịch, khối lượng, phiếu nhập kho và đối chiếu với phiếu cân; chỉ chứng từ đúng phạm vi kế toán.
- XNK: thông tin khai báo FSC/PEFC theo chứng từ và loại claim được phép, chứng chỉ/hạn hiệu lực và liên kết lô hàng đến bộ hồ sơ xuất; chỉ lô được giao XNK kiểm soát.
- Không tự xác nhận hàng hóa là FSC/PEFC-certified chỉ vì có ghi nhận nguồn gốc hoặc ký hiệu. Chuẩn FSC/PEFC/CoC cụ thể cần kiểm tra theo chính sách khách hàng, phạm vi chứng chỉ và tài liệu có hiệu lực.
- KPI_doc = hồ sơ đạt các bước xác minh thuộc trách nhiệm / hồ sơ phải kiểm. Tạm đề xuất target >= 98%, có chứng từ và trạng thái duyệt, nhân sự được quyền khiếu nại. Không phát sinh hồ sơ: N/A cần duyệt, không mặc định 100%.

## Ngày công chênh và hệ số 1×100, 1×200...
Người dùng nêu `1×100, 1×200` nhưng chưa xác nhận đơn vị (đồng/nghìn đồng/điểm) và ý nghĩa 1 (ngày công hay giờ công). Vì vậy tính **chỉ báo giả lập có đơn vị tường minh**:
`GIÁ_TRỊ_TƯƠNG_ĐƯƠNG = NGÀY_CÔNG_CHÊNH × MỨC_TRÊN_1_NGÀY`.
Ví dụ 1 ngày × 100 đơn vị = 100 đơn vị; 2 ngày × 200 đơn vị = 400 đơn vị.
Đây KHÔNG tự trở thành tiền tăng ca, không tạo ra giờ tăng ca không có chứng cứ; chưa tự cộng ngoài lương tháng đã bảo đảm bao gồm KPI. Ngày công chênh chỉ được xác định từ bảng công và lịch công được phê duyệt (khi vượt chuẩn phải đối chiếu thực tế ngoài giờ/ca/ngày nghỉ).

## Quy trình
(1) đối chiếu lô hàng và số phiếu; (2) kiểm tra chứng chỉ và claim theo từng hệ thống FSC/PEFC; (3) xác nhận chất lượng chứng từ; (4) chấm KPI 5 chỉ tiêu; (5) thẩm định số ngày công chênh; (6) duyệt KPI và đối chiếu mức lương bảo đảm. Hệ số KPI từ hồ sơ FSC/PEFC không thay mức lương đóng BHXH; không tự làm giảm cam kết G.

## Triển khai
Module thử nghiệm `core/kpi-fsc-pefc.js`; danh mục được bổ sung tại `core/kpi-catalog.js`. Chưa tự động đồng bộ hồ sơ từ `PhieuCan` / MISA / XNK, chưa ghi vào bảng lương. Chỉ đưa vào vận hành sau khi có dữ liệu và mẫu kiểm chứng, kiểm thử E2E và phê duyệt quy chế.
