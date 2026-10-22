# HAK KPI 2026 — LỊCH CÔNG THEO NHÓM VÀ ĐỐI CHIẾU TĂNG CA (DỰ THẢO)
**Ưu tiên áp dụng thay cho mọi ghi chú cũ "24 công TG + 2 công KPI FSC".**
Chưa đưa trực tiếp vào Payroll Engine; cần HR xác nhận HĐLĐ/lịch làm việc và luật về OT.

| Nhóm | Công chuẩn | Cách tính |
|---|---|---|
| Văn phòng (KT, hành chính, nhân sự, IT, vật tư...) | Theo lịch thực tế | Thứ Hai–Sáu mỗi ngày 1 công, thứ Bảy 0,5 công, Chủ nhật 0 công. Trừ ngày lễ/điều chỉnh hợp lệ theo lịch đã duyệt, không tự coi công làm ngày nghỉ là công bình thường. |
| Trạm cân TRAM_CAN | 26 | Tháng áp dụng theo lịch/phân ca đã được HAK duyệt; chênh so với 26 chỉ là tín hiệu rà soát tăng ca. |
| Xuất nhập khẩu XNK | 22 | Công vượt 22 đưa vào danh sách rà soát OT. |
| Kế toán trưởng KTT | 22 | Công vượt 22 đưa vào danh sách rà soát OT. |
| TGĐ, quản lý GD/QUAN_DOC/QL_XE | 22 | Phạm vi "quản lý" cần chốt RoleID thực tế; chưa mặc định mọi trưởng ca và chức danh quản lý có lịch 22. |
| Các nhóm khác | Theo DM_LUONG/HĐLĐ/ca | Không ép 22/26 khi chưa có quyết định; các công thức CN1/CN2/SP giữ nguyên. |

## Công thức
`CÔNG_CHUẨN = ngày công theo nhóm và lịch có hiệu lực`.
`CÔNG_TRONG_CHUẨN = MIN(CÔNG_THỰC_TẾ, CÔNG_CHUẨN)`.
`CÔNG_VƯỢT_CẦN_RÀ_SOÁT = MAX(0,CÔNG_THỰC_TẾ-CÔNG_CHUẨN)`.
**Không tự biến số công chênh thành giờ tăng ca**, vì còn giờ làm thực tế, loại ngày (thường/nghỉ hằng tuần/lễ), ca đêm và chấm công/duyệt. OT ngày thường, ngày nghỉ hằng tuần và ngày lễ có hệ số tối thiểu theo luật tương ứng; tính giờ nghỉ/ca/đêm riêng và kiểm tra lịch HĐLĐ.

Với nhóm văn phòng nửa thứ Bảy, số công chuẩn một tháng có thể có số lẻ: ví dụ tháng 10/2026 lịch 22 ngày thứ Hai–Sáu, 5 thứ Bảy nửa công => 24,5 công, chưa trừ ngày lễ hay lịch công ty riêng.

## Phân biệt KPI FSC
- Hồ sơ FSC/PEFC = chất lượng chứng từ nhận và truy xuất gỗ keo; tính KPI theo hồ sơ được giao, **không dựa vào công vượt chuẩn**.
- Quỹ FSC đã gồm trong quỹ KPI tháng thuộc thu nhập bảo đảm; số tiền FSC cuối cùng = MIN(quỹ FSC được duyệt, số đơn vị FSC × đơn giá một đơn vị được duyệt × hệ số chất lượng FSC); không tạo thêm thưởng theo phần công vượt.
- Chưa có xác nhận đơn vị 100/200, nguồn hồ sơ, trạng thái phê duyệt: chặn đưa vào lương.

## Ranh giới vận hành
`core/kpi-work-schedule.js`: có công thức theo lịch và mô phỏng OT sau khi đủ chứng từ, trả `payrollWriteAllowed:false`.
`core/kpi-fsc-pefc.js`: chỉ chất lượng, quỹ, đơn vị hồ sơ; không tham chiếu công vượt chuẩn.
`engine.js`: nguyên trạng, sử dụng các quy tắc công chuẩn / TC1–TC6 lịch sử riêng. Trước khi kết nối, đối chiếu công chuẩn 2, mã TC1–TC6, chấm công nửa ngày, làm thêm ngày nghỉ và tránh thanh toán trùng.
