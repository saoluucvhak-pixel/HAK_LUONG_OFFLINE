# Checklist nghiệm thu bản cài trên Windows thật (từ v2.1.18)

Mục đích: ghi lại bằng chứng chạy thật cho các việc tôi (Claude) KHÔNG thể kiểm trong môi trường Linux. Mọi bản v2.1.x hiện là "thử nghiệm có kiểm soát" cho tới khi bảng này được điền đủ.

**Người thử:** ____________  **Ngày:** ____________  **Máy:** Windows ____ (bản ___ )  **Bản cài:** `TinhLuongHAK-V10.4-Setup-____.exe`
**Chuẩn bị:** tải bộ cài + `SHA256SUMS.txt` ở Releases; kiểm SHA-256 (PowerShell: `Get-FileHash .\TinhLuongHAK-V10.4-Setup-X.Y.Z.exe`). Dùng **dữ liệu thử** hoặc bản sao dữ liệu, KHÔNG dùng dữ liệu thật đang vận hành.

Ghi **Đạt / Không đạt / Không áp dụng** và ghi chú (chụp màn hình nếu lỗi).

| # | Việc kiểm | Cách làm | Kết quả | Ghi chú |
|---|---|---|---|---|
| 1 | Cài đặt | Chạy bộ cài; SHA-256 khớp `SHA256SUMS.txt`; cài xong mở được app | | |
| 2 | Tạo Admin + đăng nhập | Màn đầu tiên, ghi mã khôi phục | | |
| 3 | Nhập dữ liệu thử | Nhân viên, hợp đồng, chấm công 1 kỳ, 1–2 phiếu cân | | |
| 4 | Nhập sai Mã NV (Thưởng/Tạm ứng/Suất cơm) | Gõ mã sai hoa/thường và mã không tồn tại → phải bị chặn, có thông báo | | |
| 5 | Tính lương + chốt kỳ | Tính lương, mở "Chốt kỳ", xác nhận; kỳ chuyển sang "Đã chốt" | | |
| 6 | Xuất Excel **bằng Microsoft Excel thật** | Mở "Danh sách cần xác nhận chấm công": 14 cột, in xem trước **A4 ngang**, cột ký rộng đủ ký tay, Mã NV giữ số 0 đầu | | |
| 7 | Xuất PDF | Bảng lương, bảng kê chuyển khoản: số tài khoản không bị ngắt dòng; có dòng "Ngày … tháng … năm …" | | |
| 8 | **In ra giấy** | In 1 báo cáo PDF + 1 phiếu lương: chữ đọc được, không bị cắt mép | | |
| 9 | Phiếu lương PDF từng người | "⬇ PDF từng phiếu": mỗi người 1 trang, có khối ký; kỳ chưa chốt có chữ TẠM TÍNH | | |
| 10 | Danh sách chuyển khoản ở Tính lương | Kỳ chưa chốt: sheet `ChuyenKhoan_TAM`; sau khi ghi chi một phần: số tiền = còn lại; cột Kiểm tra | | |
| 11 | Sao lưu SQLite ra USB / ổ khác | Công ty & Sao lưu → chọn thư mục SQLite (USB), bấm Sao lưu; bản xuất hiện ở USB | | |
| 12 | Rút USB rồi sao lưu | Rút USB, bấm Sao lưu: app báo rõ (không treo); cắm lại, sao lưu: bản bị lỡ được chép bù | | |
| 13 | "Thử khôi phục (không ghi gì)" | Nút ở dòng Sao lưu SQLite: báo đạt + số dòng; dữ liệu không đổi | | |
| 14 | **Khôi phục thật từ USB** (trên bản sao) | Làm hỏng `data.sqlite` (hoặc dùng máy thử), mở app: màn khôi phục liệt kê bản ở USB → Kiểm tra → Khôi phục; đăng nhập, dữ liệu khớp | | |
| 15 | Ổ mạng / NAS / Drive đồng bộ (nếu có) | Lặp bước 11–14 với thư mục mạng; ghi nhận có treo > 6 giây không | | |
| 16 | Khôi phục theo kỳ | Gói kỳ làm đổi phụ lục của kỳ đã chốt → phải bị chặn, nêu kỳ + phụ lục | | |
| 17 | Gỡ cài đặt / cài đè bản mới | Cài đè bản mới hơn: dữ liệu còn nguyên | | |

**Kết luận:** ☐ Nghiệm thu  ☐ Chưa nghiệm thu (nêu lý do): ______________________
**Người thử ký:** ____________   **Người duyệt (chủ):** ____________

Lỗi phát hiện: ghi số bước, bản cài, ảnh chụp, rồi gửi cho Claude kèm tệp `log` trong thư mục dữ liệu (nếu có).
