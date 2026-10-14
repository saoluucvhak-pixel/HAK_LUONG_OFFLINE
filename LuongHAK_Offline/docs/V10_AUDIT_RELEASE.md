# V10 — Tái thiết kế giao diện nghiệp vụ: bảng nghiệm thu

Nhánh: `feature/luong-hak-v10-business-ux-redesign` (từ V9.4). Không đụng `main`. PR ở trạng thái DRAFT, không tự merge.
Kiểm thử: unit 532/532, ESLint sạch, E2E giao diện thật 209/209, kiểm tra 87 màn hình × 3 độ phân giải (1366×768, 1600×900, 1920×1080): 0 tràn trang, 0 lỗi JS (`docs/V10_SCREEN_CHECK.json`).

| Hạng mục V10 | Trạng thái | Ghi chú |
|---|---|---|
| Menu nhóm nghiệp vụ mới | DONE | E2E + screen check |
| Công thức chuyển sang Cài đặt | DONE | Giữ Formula Engine/AST, duyệt, phiên bản |
| Trình thiết lập công thức (4 bước, giải thích bằng số) | DONE | Lưu Nháp qua REPO; E2E |
| Chỉ 2 phương pháp bù sản lượng + "Xem cách tính", bỏ dm_quychebu khỏi Danh mục | DONE | Mã cũ bị gắn cờ, chặn chốt kỳ đến khi chọn phương pháp mới |
| Master–Detail modal: DM_TNCN→biểu thuế, HĐLĐ→tài liệu | DONE | |
| Master–Detail modal: NV→người phụ thuộc | DONE | E2E |
| Master–Detail modal: hình thức lương, chứng từ thanh toán→dòng | NOT_APPLICABLE | Dữ liệu hiện phẳng (dm_luong, sổ thanh toán ttluong không có bảng cha–con); cần thiết kế lại mô hình dữ liệu trước |
| Danh mục CRUD mặc định chỉ xem, nút Thêm/Sửa/Lưu/Hủy/Ngừng/Lịch sử thống nhất | PARTIAL | Đã áp dụng ở các bảng đã làm; chưa rà toàn bộ danh mục |
| Màn hình Kiểm tra bảng lương (ERROR/WARNING/INFO) | DONE | |
| Luồng Tính lương 7 bước | DONE | Thanh 7 bước trên màn Tính lương (bước xong/đang ở, bấm sang màn tương ứng); chưa có bước Duyệt riêng |
| Kỳ lương điều khiển từ ngày–đến ngày, bộ lọc thống nhất các màn nhập liệu | DONE | Tổng cộng + xem/Excel/PDF/in |
| Nghiệp vụ nhân sự độc lập (gửi/duyệt/từ chối/lịch sử) + báo cáo | DONE | Quyền mới `hr.approve` |
| Báo cáo lương: chi tiết NV, chi tiết thanh toán | DONE | Có lọc, Excel/PDF/in, tổng đối soát |
| Mẫu Excel/PDF chuyên nghiệp cho mọi báo cáo và phiếu lương | PARTIAL | Làm cho 2 báo cáo mới; các báo cáo cũ giữ mẫu V9.4 |
| Icon SVG thống nhất | DONE | Test U-UI-03 |
| Ngày dd/MM/yyyy, nhập tay ổn định; số 15.000.000, căn phải | DONE | |
| Bản dựng Windows (NSIS) | WINDOWS_UAT_PENDING | Chỉ build được qua GitHub Actions; chưa chạy thử trên Windows thật |
| Đối chiếu workbook Excel | BLOCKED_SOURCE_DATA | Chưa có dữ liệu nguồn |

Còn tồn từ trước: mã hóa đĩa, giao diện tiến trình/hủy backup–migration.
