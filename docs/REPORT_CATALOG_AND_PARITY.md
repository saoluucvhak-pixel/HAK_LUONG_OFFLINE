# Danh mục báo cáo và đối chiếu bảng / Excel / PDF (v2.0.31)

Nguồn: `core/reporting/*`, `core/bh-report.js`. Dòng tổng được đánh dấu bằng thuộc tính không liệt kê `_tong` (`core/reporting/total-row.js`), **không** đoán theo chữ "TỔNG" — dòng dữ liệu thật như "TỔNG-02" được giữ nguyên.

| Nhóm | Loại báo cáo | Module | Test | Bảng↔Excel↔PDF |
|---|---|---|---|---|
| Lương | TONG_HOP_NV, THUE_TNCN, TONG_HOP, THANH_TOAN, CHI_TIET_NV, CHI_TIET_TT, SO_CHUNG_TU, CHUYEN_KHOAN, TIEN_MAT, KHONG_CAN_CHOT | payroll-reports | `v94-payroll-reports`, `report-filter-*` | Excel: U; PDF: CHƯA KIỂM từng loại |
| Lương nội bộ | Bảng tính nội bộ | internal-payroll | U | CHƯA KIỂM |
| Kỳ | Công, chi phí, sản lượng, bốc dăm | period-reports | `v103-reports` | CHƯA KIỂM |
| Vận hành | NHAN_SU, BOM_DAM, SAN_LUONG, THUONG, TAM_UNG, SUAT_COM (+ bản kỳ đã chốt) | ops-reports | `v101-ops-reports`, `report-parity-ops` (13 ca: có/không lọc; từng dòng, từng cột tiền, tổng = cộng dòng, Excel, HTML), E2E Excel/PDF suất cơm, tạm ứng, sản lượng | Bảng↔Excel↔HTML: ĐÃ KIỂM từng dòng/cột. PDF thật: ĐÃ KIỂM cho suất cơm; còn lại CHƯA KIỂM |
| Bảo hiểm | Chi tiết, theo phòng ban, tổng hợp theo khoản, biến động | bh-report | `bh-report`, `bh-xlsx`, `report-parity-bh` (4 ca: tổng hợp = theo phòng ban = chi tiết, Excel vòng ghi/đọc, giữ mã số 0 đầu và dòng 'TỔNG-03') | Excel: ĐÃ KIỂM; PDF: CHƯA KIỂM |
| Cấp phát | Báo cáo cấp phát theo tháng/chi tiết | dispense-report | `dispense-report`, `benefit-monthly-report`, `report-parity-dispense` (3 ca: tổng hợp = chi tiết từng mặt hàng/cỡ, thực cấp = đã cấp − thu hồi, tổng theo đơn vị tính, Excel), E2E `capphat` | Excel: ĐÃ KIỂM; PDF: CHƯA KIỂM |
| Bộ lọc | Lọc chung (`applyGeneric`) | report-filter | `report-filter-total-rows` (U-C01-01..06) | Số dòng và tổng sau lọc: đã kiểm ở mức dữ liệu; so sánh với Excel/PDF sau lọc: CHƯA KIỂM |

## Ghi chú trung thực
- "Parity" bảng–Excel–PDF sau khi lọc chưa có test tự động riêng cho từng báo cáo; chỉ các báo cáo ghi "ĐÃ KIỂM" ở trên.
- Kỳ đã chốt xuất không in đơn giá (test `payroll-close`), giữ nguyên.
- Hiện không có test đối chiếu nội dung PDF với bảng cho mọi báo cáo.
