# Rà soát tổng thể — 24/11/2026 (bản v2.1.26)

Thực hiện theo quy trình 5 pha của `HAK_AI_AGENT_CONTROL_CENTER` (`AGENTS.md`, `SKILL.md`): kiểm repo/PR/CI/nền test → đối chiếu tiêu chuẩn → rà việc dở → đề xuất xử lý. Không đổi mã sản phẩm trong bản rà soát này.

## 1. Kiểm nền (đã chạy, đạt)
| Hạng mục | Kết quả |
|---|---|
| Unit/Integration/Regression (`npm test`) | 1653 đạt, 0 lỗi, 0 bỏ qua (3 "todo" có chủ đích) |
| Lint (`eslint --max-warnings 0`) | đạt |
| `verify-shared-modules` / `check-consolidation` | đạt (8/8 module dùng chung khớp khóa; công thức lương không đổi) |
| `npm audit --omit=dev` | 0 lỗ hổng |
| E2E bố cục 117 (màn × cỡ) | 12 kiểm cứng đạt; còn ghi nhận mềm: 34 màn ở 1024×768 thanh trên 2 hàng (trong giới hạn), 18 (màn × cỡ) ít dòng ở 1024×768 |
| CI trên `main` | xanh; phát hành v2.1.20–v2.1.26 có SHA-256 khớp `SHA256SUMS.txt` |
| PR mở | 0 |

## 2. Việc dở / chưa làm — và đề xuất
| # | Việc | Tình trạng | Ai | Đề xuất xử lý |
|---|---|---|---|---|
| 1 | Nghiệm thu Windows thật (cài, Excel, máy in, SmartScreen) | chưa; chủ nhận làm | Chủ | Theo `NGHIEM_THU_WINDOWS_CHECKLIST.md`; báo lỗi kèm ảnh để sửa; đến lúc đó giữ nhãn "chưa nghiệm thu" |
| 2 | Hai nhánh thừa `feature/v11-ci-snapshot-e2e` (5 trước/21 sau), `ci/artifact-retention` (1/328) | chưa xóa — proxy phiên cấm xóa nhánh | Chủ | Xóa tay trên GitHub (Settings → Branches hoặc nút Delete) |
| 3 | 13 issue handoff còn mở (#86, #88, #91, #92, #97, #98, #99, #101, #112, #113, #114, #115, #116) | phần lớn đã làm xong trong mã (CHANGELOG ghi `handoff 004/005/009/010/012/013`, #91 có `CRASH_DURABILITY_MATRIX.md`, #116 đã có `scripts/merge-gate.cjs` + `post-merge-check.cjs`) | CEO/Chủ | Đóng #92 #97 #98 #99 #113 #114 #116 kèm liên kết CHANGELOG; #86/#88/#91/#112 cần đối chiếu từng mục rồi đóng; #115 (danh mục kiểm tay Windows) giữ mở đến khi nghiệm thu; #101 (phân công) cập nhật rồi giữ |
| 4 | Đường ghi giai đoạn 2 (delta): giao diện vẫn gửi cả tài liệu mỗi lần lưu; mục tiêu < 150 ms chưa đạt | thiết kế có (`WRITE_PATH_DELTA_DESIGN.md`), chưa làm; lần thử trước từng gây một lỗi hồi quy | Kỹ thuật + Chủ duyệt | Chỉ làm sau khi nghiệm thu Windows cho biết có chậm thật với dữ liệu thật; làm theo từng bước nhỏ, E2E trước |
| 5 | Duyệt lương + quyết toán thuế năm | kế hoạch quý tới, chưa làm mã; chờ chủ trả lời mục 4 của `KE_HOACH_QUY_TOI.md` | Chủ | Trả lời 9 câu hỏi để vào tháng 1 |
| 6 | Phương án đo C cho `U-DUR-06c` | đã đo (Linux), chủ chọn giữ A | — | Đo lại trên Windows nếu nghiệm thu thấy chậm |
| 7 | Q2: Ngày chấm dứt kỳ 10/2026 | chủ/kế toán tự điền | Chủ | Điền trước khi chốt kỳ 10 |
| 8 | Phụ lục đổi giữa tháng | chủ chọn giữ tùy chọn "Từ ngày hiệu lực"; đã thêm dòng nhắc (v2.1.24) | Kế toán | Nhớ chọn khi lập phụ lục giữa tháng |
| 9 | Mã hóa file dữ liệu / ký số bộ cài (RISK-07) | chủ quyết định "không" | — | Ghi nhận rủi ro tồn: SmartScreen cảnh báo khi cài |
| 10 | Sao lưu giữ nhiều thế hệ (GFS) | chủ quyết định "không" | — | Ghi nhận |
| 11 | Đọc số thành chữ trên phiếu chi | chưa kế toán duyệt | Kế toán | Duyệt mẫu in thử |
| 12 | Ngày sinh trong BH chi tiết của kỳ đã chốt lấy từ hồ sơ hiện tại | giới hạn đã biết | — | Ghi chú trên báo cáo nếu kế toán cần |

## 3. Mã dở dang trong repo
Không có PR mở, không có nhánh làm dở có mã chưa gộp (2 nhánh ở mục 2 chỉ là nhánh cũ). `TODO_ROADMAP.md` phần đầu đã lỗi thời (ghi v2.0.33) — đã cập nhật cùng bản này.

## 4. Giới hạn của lần rà này
Chưa chạy trên Windows/Excel/máy in thật; không chạy tác nhân AI thật của Control Center (chỉ dùng quy trình 5 pha); không đóng issue hay xóa nhánh (cần quyền chủ).
