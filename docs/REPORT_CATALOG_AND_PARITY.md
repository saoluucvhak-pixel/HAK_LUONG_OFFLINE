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
- **Nội dung PDF** (từ 004 mục 2): xuất PDF thật qua `hakReport.pdf` rồi trích văn bản và đối chiếu từng dòng với dữ liệu báo cáo cho 36 báo cáo/sheet của vận hành, bảo hiểm, cấp phát và bảng lương nội bộ — xem `docs/PDF_CONTENT_MATRIX.md`. Chưa phủ: các báo cáo lương nhiều bảng (`payroll-reports`), kỳ đã chốt, bộ báo cáo kỳ lương, PDF màn hình nhập liệu, kho năm, OCR; chưa kiểm bố cục bằng mắt.

## Quy tắc định dạng & hiển thị bổ sung (Đợt 4 — A6)
- **Ngày tháng & nhãn kỳ:** ngày hiển thị thống nhất `dd/mm/yyyy`; nhãn kỳ đệm số 0 (`09/2026`, `Tháng 09/2026`).
- **Nhãn BẢN NHÁP & hậu tố `_TAM`:** khi `trangThai` khớp `/chưa chốt|tính tạm/i`, PDF in khung đỏ `.warn` `"BẢN NHÁP — TÍNH TẠM, kỳ chưa chốt; không dùng để ký/chi tiền"`, Excel tô chữ/nền đỏ cảnh báo ở dòng phạm vi/trạng thái, và tên file xuất PDF/Excel gắn hậu tố `_TAM`.
- **Phân trang & lặp cột bảng rộng (`repeatColumns`, `nowrap`):** PDF bảng rộng (> 16 cột) tách phần và lặp cột nhận diện (`repeatColumns`), giữ `nowrap` cho cột số/mã ngắn và `wrapText` cho cột tên/nội dung dài (`Họ và tên`, `Nội dung`).
- **Excel chuyên nghiệp (`saveXlsx(..., "pro")` & bố cục in):** `saveXlsx(..., "pro")` hỗ trợ nhiều sheet qua `reportXlsx.buildMany` (fallback SheetJS thô nếu thiếu thư viện); giữ nguyên tên và thứ tự cột chứng từ chuyển khoản; `bh-xlsx` căn giữa `STT`, cột tiền rộng ~15, bỏ `height = 32` cứng, `fitToWidth = 2` + lặp `A:C` cho bảng rộng; `report-xlsx` thu gọn banner 4 hàng (`ySplit = 5`) và giữ khổ A3 khi > 14 cột (B-15); `pbkl-xlsx` đặt `paperSize: 9` (A4) và `printTitlesRow`.
- **Bảng tính nội bộ, Thuế TNCN & Phiếu lương in gọn:** `IPAY.toXlsxVm` truyền `nhom` để Excel giữ nhóm phòng ban; `THUE_TNCN` thêm cột `"Mã NV"` (không thêm CCCD theo B-12) và truyền cảnh báo thiếu MST khi in; `@media print` cho `.slips.gon .slip` thu gọn cỡ chữ/padding/margin để xếp vừa >= 2 phiếu/trang A4 (`break-inside: avoid`, không thêm khối ký theo B-13).

## Giới hạn / chưa kiểm trên môi trường thật
- Chưa mở kiểm tra trực quan file `.xlsx` trên Microsoft Excel (Windows) thật (kiểm tra tự động qua đọc/ghi vòng lặp `ExcelJS`).
- Chưa in thử trực tiếp trên máy in A4 vật lý (đặc biệt: ngắt trang bảng rộng, `repeatColumns`, `printTitlesRow`, chế độ In gọn `>= 2` phiếu/trang A4).
- Chưa chạy kiểm tra trực quan PDF trên máy Windows ngoài CI.
