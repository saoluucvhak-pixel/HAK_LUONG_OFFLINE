# V10.1 — Mẫu báo cáo

Mẫu trong `docs/v10_1_samples/` sinh từ **dữ liệu giả lập** (`regressionDataset(24)`, công ty "CÔNG TY MẪU") — không chứa dữ liệu thật. Sinh lại bằng đoạn mã trong lịch sử commit hoặc từ app (kỳ đã chốt).

| Tệp | Nội dung |
| --- | --- |
| `ChiTietThanhToan_MAU.xlsx` | Bảng chi tiết thanh toán tiền lương: 23 NV × 46 cột; nhóm NHÂN VIÊN / CÔNG & SẢN LƯỢNG / THU NHẬP / KHẤU TRỪ / THANH TOÁN (tiêu đề 2 tầng), A3 ngang, ≥2 trang ngang, lặp cột Mã NV–Họ tên, đóng băng đến Họ tên, AutoFilter, dòng tổng, chữ ký, số trang. Có 2 chứng từ mẫu (1 trả đủ, 1 trả một nửa) |
| `SoChungTu_MAU.xlsx` | Sổ chứng từ thanh toán (15 cột): số chứng từ, hình thức, NV, số tiền, trạng thái, người lập/duyệt/ghi nhận, lý do hủy |
| `ThanhToan_MAU.xlsx` | Bảng thanh toán lương (11 cột) — **23 lỗi** vì dữ liệu giả lập chưa khai hình thức/số tài khoản: đây là hành vi đúng (báo cáo chính thức bị chặn khi còn lỗi); mẫu chỉ để xem bố cục |
| `man-hinh-chi-tiet-thanh-toan-1366x768.png`, `…-1920x1080.png` | Màn hình Chi tiết thanh toán (kỳ chưa chốt, dữ liệu mẫu) |

## Tiêu chuẩn đã kiểm bằng test
Tên công ty, tên báo cáo IN HOA, kỳ, phạm vi, đơn vị, ngày lập, nhóm cột, tổng cộng, chữ ký, số trang (`report-xlsx` + `U-V101-XLS-*`); Mã NV/CCCD/MST/STK dạng text; ngày thật `dd/mm/yyyy`; số thập phân 2 chữ số khi cột có phần lẻ; chống công thức; bảng >20 cột không ép 1 trang; PDF bảng >16 cột tách phần cột lặp Mã NV–Họ tên.

## Chưa làm / chưa kiểm
- Mẫu riêng cho báo cáo nhân sự, sản lượng, bơm dăm, thưởng, tạm ứng, suất cơm vẫn dùng bộ xuất chung (`exportSheetsPdf`/`saveXlsx`), chưa có bố cục riêng.
- Chưa mở tệp mẫu bằng Microsoft Excel/in thử trên máy in thật (cần `WINDOWS_UAT`). Kiểm tra mới dừng ở đọc lại bằng ExcelJS.
- PDF chưa chụp mẫu trong tài liệu này; có E2E PDF sẵn từ V9.4.
- Màn hình: cột đầu chưa "dính" khi cuộn ngang 46 cột (Excel có đóng băng).
- Phiếu lương `ui/slip-xlsx.js` (V10): mỗi NV một phiếu A4; kiểm tra phạm vi quyền xem: xem mục giới hạn trong `V10_1_SECURITY_REVIEW.md`.
