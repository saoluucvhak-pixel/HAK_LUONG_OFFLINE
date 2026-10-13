# AUDIT V5 — LUONG_HAK Offline (cơ sở: `ee528a1`, nhánh `feature/luong-hak-offline-completion-v5`)

Bảng này được lập từ việc **đọc mã nguồn và chạy test thật** ở HEAD `ee528a1` (13/10/2026), không phải từ ghi nhớ.
Cột "Trạng thái" được cập nhật theo từng commit; chỉ ghi "Xong" khi có test chạy PASS.

## Hiện trạng kiểm thử tại cơ sở `ee528a1`

| Bộ test | Kết quả | Ghi chú |
| --- | --- | --- |
| `npm test` (unit + integration + regression) | 314/314 PASS (sau GĐ3: 361/361) | cần `npm ci` trước (6 test OCR cần `tesseract.js`) |
| `npm run test:e2e` (Electron + Playwright + xvfb, **Linux**) | 121/121 PASS | Không thay thế kiểm thử trên Windows |
| `tests/perf/bench.js` | chạy được | chỉ đo tính lương/đọc ghi, chưa có benchmark công thức, OCR, báo cáo |
| ESLint | chưa chạy | chưa cài trong môi trường kiểm thử |

## Bảng audit

| ID | Chức năng | File liên quan | Đã có | Lỗi/thiếu (đã xác minh trên code) | Ưu tiên | Phương án sửa | Test | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0-01 | Công thức hiệu lực lỗi | `engine.js` (heSoTangCa, phụ cấp, `hoTro`) | Parser/Evaluator/Registry/UI công thức | Cả 3 khoản (tăng ca, phụ cấp, hỗ trợ) bắt lỗi rồi **tính tiếp theo công thức mặc định**; biểu thức rỗng cũng im lặng dùng mặc định; evaluator đổi NaN/Infinity thành 0 | P0 | `FORMULA_ERROR` → khoản = 0đ, ghi `kq.loiCongThuc`, checklist điểm 21 = BLOCKER; evaluator ném `BAD_VALUE`/`NON_FINITE` | `tests/unit/formula-error-block.test.js` (16) | **Xong** (c4a3530) |
| P0-02 | Ngữ cảnh công ty cho công thức | `engine.js`, `core/payroll/formula-registry.js` | Cột "Công ty" trong `dm_congthuc` | `fmlCtx` **không có `companyId`**; phụ cấp/hỗ trợ không truyền công ty; registry có đường `pool = cand` dùng nhầm công thức của công ty khác | P0 | Mô hình 1 công ty/1 file: danh tính = `db.congty` (Mã/Tên công ty), so khớp không phân biệt hoa/thường; `resolveEx` → OK/NONE/OTHER_COMPANY/CONFLICT | cùng file test (4 test công ty/xung đột) | **Xong** (c4a3530) |
| P0-05 | Phân bổ sản lượng: NV vắng trùng tên | `core/production-alloc.js` | Chia đều; `PENDING_ATTENDANCE` khi cả tổ chưa có BT | Trùng tên cuối → **tự loại tất cả người trùng** | P0 | Ưu tiên Mã NV; trùng tên → `PENDING_IDENTITY`: giữ nguyên phiếu, liệt kê ứng viên, yêu cầu ghi Mã NV; bảo toàn khối lượng | `tests/unit/production-alloc.test.js` (U-PA-02/02b/02c/09) | **Xong** |
| P0-03 | Kho chứng từ gốc | `app.js` (OCR), `main/` | OCR ảnh/PDF bằng Tesseract | **Không có kho chứng từ**: không lưu bản gốc, không DocumentID, không SHA-256 của chứng từ, không liên kết trang/ô với dòng chấm công | P0 | Module `main/documents` + metadata + đường dẫn tương đối | — | Chưa làm |
| P0-04 | Full Backup chứa chứng từ | `main/storage.js` | Backup **JSON** + `.sha256`, thư mục sao lưu thứ hai | Không có gói Full Backup (không ZIP/manifest), chưa có chứng từ để sao lưu, chưa có Restore Wizard | P0 | Gói ZIP + manifest + SHA-256 + staging restore | — | Chưa làm (phụ thuộc P0-03) |
| P1-01 | PDF Reporting Engine | `main/pdf.js`, `core/reporting/report-html.js`, `main.js` (IPC `report-pdf`), `preload.js` | `printToPDF` của Electron | HTML dựng từ view-model (escape, CSP, không script), cửa sổ ẩn khóa mạng/script/điều hướng; lưu vào thư mục xuất không ghi đè; chạy bằng trình duyệt → hộp thoại In | P1 | — | `report-filter.test.js` (HTML), e2e: file `%PDF-` ≥1 trang | **Xong** cho Bảng tính nội bộ; các báo cáo khác chưa nối |
| P1-02 | Bộ lọc báo cáo dùng chung | `core/reporting/report-filter.js`, `app.js` (`reportFilterBar`) | `ReportFilterEngine`: phòng ban, mã lương, HTTT, từ khóa không dấu, chỉ có thu nhập, khoảng thực lĩnh | Một `st.rf` dùng cho Tính lương, Bảng tính nội bộ, Excel, PDF | P1 | — | `report-filter.test.js` (7), e2e | **Xong** cho Tính lương + Bảng tính nội bộ; chưa nối Báo cáo lương/Chấm công/Thanh toán |
| P1-03 | Bảng tính lương nội bộ | `core/reporting/internal-payroll.js`, `app.js` (`tabBangTinhNoiBo`) | Menu Kỳ lương → Bảng tính lương nội bộ | Chỉ khoản thu nhập, nhóm theo phòng ban + tổng, kiểm tra tổng thành phần = Tổng thu nhập engine, Excel + PDF | P1 | — | `report-filter.test.js`, e2e | **Xong** |
| P1-04 | OCR PDF nhiều trang | `app.js:2224` | OCR PDF | `Math.min(pdf.numPages, 30)` — **âm thầm bỏ trang sau 30** | P1 | Xử lý theo lô, hoặc báo rõ và cho tiếp tục | — | Chưa làm |
| P1-05 | Tầng B kiểm tra tiền làm thêm theo luật | `core/payroll/formula-variables.js` (chỉ có biến `LUONG_GIO_OT`) | Công thức tăng ca nội bộ | Không có `legal-overtime-check` / bảng mức tối thiểu theo hiệu lực | P1 | Module riêng + bảng cấu hình có hiệu lực (cần xác minh luật hiện hành tại kỳ) | — | Chưa làm |
| P2-01 | Tăng ca mã ngoài TC1–TC6 không có cấu hình | `engine.js` `heSoTangCa` | `switch` lịch sử | Mã lạ không có công thức → rơi `default: CONG_TC × HE_SO_TC` im lặng (giữ nguyên để tương thích; **chưa** coi là lỗi) | P2 | Cần quyết định nghiệp vụ trước khi chặn | — | Mở — cần chủ sở hữu quyết định |
| P2-03 | Duyệt & phiên bản công thức | `core/payroll/formula-approval.js`, `core/repository.js`, `core/permissions.js`, `app.js` (tab Lịch sử phiên bản) | Cột Trạng thái tự do | Ai có quyền sửa danh mục đều tự đặt 'Hiệu lực', sửa biểu thức đang hiệu lực, không có người duyệt/phiên bản | P1 | Máy trạng thái Nháp→Chờ duyệt→Đã duyệt→Hiệu lực→Ngừng, kiểm tra ở tầng ghi; quyền `formula.approve`; người duyệt ≠ người lập (Admin miễn); khóa nội dung; sao chép thành phiên bản mới; kỳ đã chốt: chỉ Admin kích hoạt hồi tố | `tests/unit/formula-approval.test.js` (7), e2e 128/128 | **Xong** |
| P2-02 | `switch/case` TC1/TC2/TC3/TC6 | `engine.js`, `core/payroll/formula-defaults.js` | Công thức mặc định dạng dữ liệu | Đã chuyển TC1–TC6 sang `formula-defaults.js`, xóa `switch`; mã chưa khai báo vẫn rơi `CONG_TC × HE_SO_TC` (P2-01) | P2 | — | `formula-defaults-equivalence.test.js` (3000 bộ ngẫu nhiên/mã, bằng từng bit), `formula-gate.test.js` (TC7/PC99/HT99, đổi giữa kỳ, kỳ đã chốt) | **Xong** |

## Giới hạn kiểm chứng (cần ghi rõ)

- **Chưa có dữ liệu thật** (Power Query 9/2026, 55 NV) trong môi trường kiểm thử → chưa thể đối chiếu từng nhân viên với Excel chuẩn. Các test hiện có dùng fixture mô phỏng và các baseline đã có trong repo (`tests/regression/baseline_*`).
- **Chưa kiểm thử trên Windows**; E2E chạy trên Linux/xvfb.
- Không có quyền push lên GitHub trong phiên này → commit nằm ở nhánh local `feature/luong-hak-offline-completion-v5`, **chưa có Pull Request**.
