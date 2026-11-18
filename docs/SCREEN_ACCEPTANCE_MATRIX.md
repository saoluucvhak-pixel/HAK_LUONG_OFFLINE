# Ma trận nghiệm thu màn hình (V10.4 / v2.0.31)

Nguyên tắc: một ô chỉ ghi **ĐÃ KIỂM** khi có test tự động chạy thật trên commit này (unit hoặc E2E Playwright trong CI). Mọi thứ khác ghi **CHƯA KIỂM**. Không có kiểm tay trên Windows thật, không có thử in thật — ghi rõ ở cột cuối.

Mức kiểm: **U** = unit test lõi; **E** = E2E Playwright (Windows CI); **CHƯA KIỂM** = chưa có bằng chứng.

| Màn hình (module `app-src/screens/`) | Chức năng chính | Tự động | Bố cục 1366×768 / 1920×1080 | In / PDF thật | Ghi chú |
|---|---|---|---|---|---|
| tabHome | Trang chủ, nhắc việc | E (đăng nhập, mở app) | CHƯA KIỂM | — | |
| tabNhanVien / tabNhanSu / tabNghiepVuNS | Hồ sơ, danh sách, nghiệp vụ nhân sự | E (`hr-editor-stability`, `hr-save-close`, `contract-*`) + U | CHƯA KIỂM | CHƯA KIỂM | Báo cáo nhân sự: U |
| tabDanhMuc | Danh mục | E (`catalog-filter-stability`) | CHƯA KIỂM | — | |
| Bảng nhập liệu (app-src/07, 04) | Nhập tay / Excel, chống trùng, lọc phòng ban | E (`input-review`, `input-safety`, `input-filter-dept`, `bandam-direct`) | CHƯA KIỂM | — | Chuẩn hóa Smart Filter toàn bộ màn: CHƯA LÀM |
| tabLuong / tabKyLuong | Tính lương, chốt kỳ, kỳ đã chốt | E + U (`payroll-close`, `v94-payroll-reports`) | CHƯA KIỂM | CHƯA KIỂM | Công thức không đổi |
| tabBaoCaoLuong / tabPayReport | Báo cáo lương, thanh toán | U + E (`v103-reports-check`) | CHƯA KIỂM | CHƯA KIỂM | Bộ lọc không còn loại dòng thật tên "TỔNG…" (C01) |
| tabOpsReport / tabBaoCao | Báo cáo vận hành (sản lượng, bốc dăm, thưởng, tạm ứng, suất cơm, nhân sự) | U (`v101-ops-reports`) + E (Excel/PDF suất cơm, tạm ứng, sản lượng) | CHƯA KIỂM | CHƯA KIỂM | |
| tabSlips | Phiếu lương | E một phần | CHƯA KIỂM | CHƯA KIỂM | |
| tabBangTinhNoiBo | Bảng tính nội bộ | U (`internal-payroll`) | CHƯA KIỂM | CHƯA KIỂM | |
| tabCapPhat + 28/29 | Cấp phát, báo cáo cấp phát | E (`capphat.cjs`, 42 kiểm) + U | CHƯA KIỂM | CHƯA KIỂM | |
| Phúc lợi (app-src/30) | Chuẩn, gán, điều chỉnh | U (`benefit-*`) | CHƯA KIỂM | — | |
| tabDoiChieu / tabKiemTra | Đối chiếu, kiểm tra bảng lương | U | CHƯA KIỂM | — | |
| tabOCR / tabOcrLib | OCR chấm công, thư viện | E (đường nhập/duyệt), `ocr-eval` | CHƯA KIỂM | — | Độ chính xác OCR phụ thuộc ảnh thật: CHƯA KIỂM |
| tabSaoLuu + kho năm | Sao lưu, khôi phục, kho năm | E (`year-archive`, `restore-first-run`, `sqlite-default`) + U | CHƯA KIỂM | — | |
| tabCaiDat | Cài đặt, thuế, công thức | E một phần | CHƯA KIỂM | — | |
| tabHuongDan | Hướng dẫn | — | CHƯA KIỂM | — | |
| Đăng nhập / phân quyền (02, 26) | Hai chế độ sử dụng | E | CHƯA KIỂM | — | |

## Việc chưa làm (không được coi là đã đạt)
- Cài mới và nâng cấp bằng Setup trên Windows thật: **CHƯA KIỂM** (chỉ CI).
- Thử in máy in thật: **CHƯA KIỂM**.
- Kiểm bố cục hai độ phân giải cho từng màn: **CHƯA KIỂM**.
- Chuẩn hóa Smart Filter cho mọi màn nhập: **CHƯA LÀM**.
