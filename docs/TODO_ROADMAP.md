# TODO_ROADMAP — Lộ trình & tiến độ

> File này là "bộ nhớ" của dự án: phiên làm việc sau đọc file này để tiếp tục mà không mất ngữ cảnh.

## Trạng thái hiện tại (15/11/2026)
- Nhánh phát hành: `main` · phiên bản **2.0.16** (engine 1.8.x, quy chế lương HAK Group 2026). Ghi chú từng bản: `docs/releases/`; lịch sử liên tục: `CHANGELOG.md`.
- Đã xong từ 2.0.0 đến 2.0.16: đăng nhập và phân quyền, chốt kỳ an toàn, sao lưu theo năm và Full Backup, OCR chấm công (CNN chữ số tay, ý kiến thứ hai Umi-OCR tùy chọn), phân bổ sản lượng theo tổ và công BT (R-66/R-73), bộ báo cáo kỳ lương Excel/PDF, đối chiếu đơn nghỉ với chấm công và hạn mức phép năm, CI một luồng duy nhất (`.github/workflows/luong-hak-v10-4-setup.yml`), Electron 45.3.2, SheetJS 0.20.3.
- Kiến trúc đích: theo sơ đồ của chủ sở hữu (Giao diện → HRM/PAYROLL/REPORTS → Core Engine → Database & Integrations) — `ARCHITECTURE.md`.
- Nghiệm thu: mọi bản đã kiểm tra trên Linux (unit, integration, regression, E2E Electron) và build bộ cài Windows trong CI. **Chưa nghiệm thu trên máy Windows thật** theo `LuongHAK_Offline/docs/V10_1_WINDOWS_UAT.md`.

## Việc đang chờ người khác
| Việc | Ai | Ghi chú |
|---|---|---|
| Trả lời các câu hỏi nghiệp vụ còn mở và 4 điểm lệch với Excel | Chủ sở hữu / kế toán | Bảng duy nhất: `CAU_HOI_CHO_CHU_SO_HUU.md`. Không đổi công thức trước khi có xác nhận. |
| Cài thử bộ cài mới nhất trên Windows; chạy *Kiểm tra dữ liệu* với dữ liệu thật | Chủ sở hữu / kế toán | Báo lại cảnh báo để nhập lại |
| Xử lý dữ liệu thật: thiếu STK/ngân hàng, mã BH_KPCD, Quyền lợi phép chưa nhập, phiếu cân chưa gán người | Bên vận hành | Mục C của `CAU_HOI_CHO_CHU_SO_HUU.md` |
| Duyệt thiết kế mã hóa file dữ liệu (RISK-07) và cung cấp chứng thư ký số bộ cài | Chủ sở hữu | Tạm dừng theo yêu cầu (15/11/2026) |
| Duyệt đề xuất đồng bộ module dùng chung (`HAK_SMART_FILTER`, `HAK_ACCOUNTING_REPORT_STANDARD`, `HAK_CODE_QUALITY_TEST`, `HAK_AI_SKILLS`, `design-system`) | Chủ sở hữu | Đã có khóa và script kiểm tra (`shared-modules.lock.json`, `npm run check:shared`); còn chờ trả lời câu 2–5 trong `DONG_BO_MODULE_DUNG_CHUNG.md` §4 |
| Thống nhất ngưỡng hiệu năng (thời gian tính lương, mở app) | Chủ sở hữu | Baseline ở `PERFORMANCE_REPORT.md` |

## Phase 1 — Audit & sửa lỗi nghiêm trọng ✅ (mã) / ⏳ (nghiệm thu Windows)
- [x] Kiểm toán toàn bộ repo → `AUDIT_REPORT.md`
- [x] Sửa lỗi lưu dữ liệu, sao lưu, file hỏng (BUG-004/005, storage)
- [x] Sửa lỗi nhập trùng / nhập vào kỳ đã chốt (BUG-006/007)
- [x] Sửa lỗi tiền (BUG-001/002), CCCD, ngày/kỳ (BUG-011/012)
- [x] Sửa chốt kỳ (BUG-003/008/009/010) + phiên bản + lịch sử
- [x] Test nền tảng: unit, integration, regression vs 1.3.0, E2E Electron, benchmark
- [x] CI: cú pháp, lint, test, audit, E2E, build
- [x] Cứng hóa bảo mật Electron (`contextIsolation`, `sandbox`, CSP, chặn mở cửa sổ); nay Electron 45.3.2
- [x] Vá SheetJS 0.20.3 — SEC-03
- [ ] Nghiệm thu bộ cài trên Windows thật

## 2.0 — Giai đoạn ưu tiên 1: sửa lỗi dữ liệu, chốt kỳ, sao lưu ✅ (mã + test)
- [x] Kiểm toán lại từ HEAD `6a4e954` → `AUDIT_REPORT.md` §6 (BUG-021…039, RISK-01…04)
- [x] Chấm công / nhập Excel: chuẩn hóa khóa, gộp theo ngày, xung đột, chế độ bổ sung/ghi đè, gộp dữ liệu trùng sẵn có, hoàn tác khi lưu lỗi
- [x] Kỳ đã chốt: phân loại locked/retro/none, cảnh báo hồi tố + nhật ký trước/sau, chặn đổi Mã NV, người thực hiện, checksum dữ liệu đầu vào, khôi phục báo kỳ chốt mất/đổi
- [x] Sao lưu: tên duy nhất, SHA-256, ghi an toàn + đọc lại, không xóa bản tốt cuối cùng, mô phỏng lỗi đĩa
- [x] Kiểm tra cấu trúc dữ liệu (`core/schema.js`), chặn ghi khi cấu trúc nguy hiểm
- [x] Test: 78 unit/integration/regression, 27 E2E
- [ ] Chủ sở hữu trả lời Q-12…Q-16
- [ ] Nghiệm thu trên Windows thật

## 2.0-alpha.2 — Đăng nhập & phân quyền ✅
- [x] Đăng nhập, Admin đầu tiên + mã khôi phục, 7 vai trò, kiểm tra quyền ở nghiệp vụ, chỉ Admin sửa hồi tố (Q-14), quản trị người dùng, nhật ký theo tài khoản (Q-16)
- [ ] Giới hạn **Trưởng bộ phận** theo phòng ban của mình (cần danh sách phòng ban ↔ người phụ trách)
- [ ] Quy trình **phê duyệt** bảng lương trước khi chốt (vai trò Người phê duyệt đã có, chưa có luồng)
- [ ] Mã hóa file dữ liệu (RISK-07); chặn bản cũ mở dữ liệu có tài khoản (RISK-06)
- [ ] Chủ sở hữu duyệt ma trận quyền mặc định (`BUSINESS_RULES.md` R-45)

## 2.0 tối ưu toàn diện — PR1 Audit V2 ✅ (mã + test) (alpha.4)
- [x] `AUDIT_V2.md`: kiến trúc, danh sách vấn đề A2-01…A2-11, rà soát 13 đường ghi, đánh giá thư viện Excel
- [x] Kiểm tra ô ngày chấm công (âm, chữ lạ, ngày không tồn tại, > 3 công) ở nhập Excel, lưới, dán, kiểm tra dữ liệu, chốt kỳ
- [x] Test kịch bản tính lương I-15…I-20 (chờ Kế toán xác nhận Q-22, Q-23)
- [ ] Chờ chủ sở hữu: Q-18…Q-23; mở mạng `cdn.sheetjs.com` (SEC-03)
- [x] **PR2 hiệu năng**(alpha.5): chỉ mục Mã NV, 5.000 NV dựng DS lương 22 ms — `PERFORMANCE_REPORT.md`
- [x] **PR3 repository**(alpha.6): `core/repository.js`, sửa A3-01; ngoại lệ còn lại khóa bằng U-REPO-08
- [x] **PR4 lưu dữ liệu**(alpha.7): lưu 5.000 NV 243 → 110 ms; SQLite hoãn tới khi mọi đường ghi qua repository (`MIGRATION_PLAN.md` §2)
- [x] **PR5 giao diện**(alpha.8): chia trang bảng lớn, tìm kiếm nhớ theo bảng, phím tắt
- [x] Q-24 ẩn lương cá nhân với Trưởng bộ phận (alpha.9, R-51)
- [ ] Chờ chủ sở hữu: R-45 ma trận quyền, phạm vi Trưởng bộ phận theo phòng ban
- [x] Q-20 Số chứng từ (alpha.10); Q-18/Q-21 ghi nhận (R-52, R-55)
- [x] Q-22 chọn cách áp dụng phụ lục giữa tháng (R-56, alpha.11, engine 1.5.0)
- [x] Q-19 chia chi phí theo phòng ban (R-53, alpha.12)
- [x] Q-04/Q-23/Q-25 BH dưới ngưỡng: giữ công thức, ngưỡng khai ở Danh mục Mã lương (R-57)
- [x] Sao lưu ra ngoài máy A + B + D (alpha.13, R-58); C (mã hóa bản sao lưu) — chưa làm theo quyết định chủ sở hữu
- Tiếp theo: gom 4 đường ghi còn lại (nhập Excel, gộp chấm công, thêm NV, xóa NV) vào repository → SQLite ghi theo dòng

## Phase 2 — Chuẩn hóa kiến trúc (bước tiếp theo)
0. (Đã khảo sát khi app dùng Electron 43; nay Electron 45.3.2 — kiểm lại khi làm) SQLite qua `node:sqlite` có sẵn trong Node đi kèm Electron, không cần module native. App hiện **chưa** dùng SQLite.
1. *(Đang làm — xong: 43 hàm trợ giúp sang `ui/app-helpers.js`; `app.js` chia thành 28 file trong `app-src/`, ghép bằng `npm run build:app`; xem `KE_HOACH_TACH_APP_JS.md` §8.)* Tách `app.js` theo `ARCHITECTURE.md` §2: `src/renderer/pages/*` (mỗi trang 1 file), `src/modules/payroll/reports.js` (chuyển `bc*` ra khỏi UI, có test), `src/modules/hrm/*` (từ `hr.js`).
2. Tầng repository: mọi truy cập `db.<bảng>` qua `repo.list/get/insert/update/remove` (kiểm tra khóa, khóa kỳ, nhật ký trước/sau tại 1 chỗ). Viết test cho repository trước khi chuyển.
3. ~~PERF-01~~ ✅ alpha.5 (22 ms / 5.000 NV).
4. SQLite theo `MIGRATION_PLAN.md` §2 (chạy song song JSON/SQLite, so sánh kết quả = 0 khác biệt).
5. Bundler (esbuild) để dùng module ES trong renderer; giữ build không cần mạng khi chạy.

## Phase 3 — HRM chuyên nghiệp
Cơ cấu tổ chức nhiều cấp (tập đoàn → công ty → chi nhánh → khối → phòng → bộ phận → tổ), định biên, trung tâm chi phí; lịch sử thay đổi trước/sau + lý do + người sửa cho mọi trường quan trọng; quyết định tiếp nhận/điều chuyển/bổ nhiệm/lương/nghỉ việc; đào tạo, chứng chỉ; trung tâm cảnh báo (hết thử việc, khám sức khỏe, phép vượt số dư, thiếu thông tin trả lương, trùng CCCD).

## Phase 4 — Payroll linh hoạt
Rule engine an toàn (parser riêng, không eval) với bộ quy tắc mặc định = engine hiện tại (hồi quy 100%); giải thích từng dòng lương; ca/lịch làm việc/ngày lễ; mô hình sản lượng gốc → phân bổ → tính lương (6 phương thức chia); chính sách BH/thuế có nguồn pháp lý + phiên bản; tạm ứng có trạng thái (không trừ trùng); thanh toán nhiều đợt có mã giao dịch chống lặp; quyết toán thuế năm (đã khấu trừ / tính lại / điều chỉnh).

## Phase 5 — Báo cáo & giao diện
Dashboard; 18 báo cáo (lọc, nhóm, sắp xếp, drill-down, Excel, PDF, lưu mẫu, tùy chỉnh cột); kiểm tra đối ứng hạch toán; chế độ sáng/tối; bảng lớn virtual scrolling; nhập liệu bàn phím.

## Phase 6 — Mở rộng & phát hành
Đăng nhập + phân quyền theo vai trò/phạm vi (kiểm tra ở tầng nghiệp vụ); mã hóa file dữ liệu; sao lưu mã hóa; chuẩn bị đồng bộ (ID ổn định, version, updatedAt, xóa mềm); ký số bộ cài (tránh cảnh báo SmartScreen); hướng dẫn sử dụng đầy đủ; nghiệm thu.
