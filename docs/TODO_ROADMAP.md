# TODO_ROADMAP — Lộ trình & tiến độ

> File này là "bộ nhớ" của dự án: phiên làm việc sau đọc file này để tiếp tục mà không mất ngữ cảnh.

## Trạng thái hiện tại (18/11/2026)
- Nhánh phát hành: `main` · phiên bản **2.0.33** (ghi chú phát hành: *thử nghiệm có kiểm soát*). Ghi chú từng bản: `docs/releases/`; lịch sử liên tục: `CHANGELOG.md`. Kết luận nghiệm thu hiện hành: `ACCEPTANCE_SQLITE_RELEASE.md` §7 (**Chỉ đủ thử nghiệm có kiểm soát**).
- **Kho dữ liệu:** từ 2.0.29 **SQLite (`data.sqlite`) là nguồn chính mặc định**, `data.json` là bản xuất (quay lui: `HAK_STORAGE=json`). 2.0.30 sửa A01 (kho năm ghi lùi) và A02 (sao lưu giả); 2.0.32 thêm schema v2 (CHECK) và bản chụp SQLite xoay vòng; 2.0.33 phân tích dữ liệu một lần ở đường ghi (chuỗi ghi ≈420–450 ms → ≈290 ms ở 5.000 NV).
- **Mã giao diện:** `app.js` do `npm run build:app` ghép từ **31 file** trong `app-src/` (+ `app-src/screens/`); các đoạn vẫn chung một closure (chưa tách trách nhiệm — `KE_HOACH_TACH_APP_JS.md` là kế hoạch cũ trước `app-src/`).
- **Cổng chất lượng:** CI một luồng `luong-hak-v10-4-setup.yml`; `scripts/verify-shared-modules.cjs` (8/8 file dùng chung `identical`); `scripts/check-consolidation.cjs` khóa `engine.js`, `hr.js`, `core/importer.js`… Không nới cổng để CI xanh.
- **Đã có:** đăng nhập/phân quyền, chốt kỳ an toàn, sao lưu theo năm và Full Backup, OCR chấm công, phân bổ sản lượng, cấp phát, báo cáo (đối chiếu bảng↔Excel↔HTML cho lương, vận hành, bảo hiểm, cấp phát).
- **Còn mở (không ghi là xong):** cài mới/nâng cấp bằng Setup trên Windows THẬT và in thử; giao diện vẫn gửi cả tài liệu mỗi lần lưu (thiết kế delta ở `WRITE_PATH_DELTA_DESIGN.md`, chưa làm; mục tiêu < 150 ms chưa đạt — xem `PERFORMANCE_REPORT.md`); `store-save` chưa kiểm tra bản nền (`baseSig`, §7 của tài liệu thiết kế); Full Backup/khôi phục bằng bản chụp SQLite; khóa ngoại/chuẩn hóa schema; Smart Filter mọi màn; kiểm bố cục 1366×768/1920×1080; so nội dung PDF thật. Dữ liệu trên đĩa chưa mã hóa và bộ cài chưa ký số (tạm dừng theo yêu cầu).

## Việc đang chờ người khác
| Việc | Ai | Ghi chú |
|---|---|---|
| (Đã đóng 17/11/2026) Câu hỏi nghiệp vụ Q-xx và 4 điểm lệch E1–E4 | Chủ sở hữu | Quyết định "giữ nguyên theo app"; xem `CAU_HOI_CHO_CHU_SO_HUU.md`. Không đổi công thức. |
| Quyết định kỹ thuật: có làm `baseSig` cho `store-save` không; duyệt thiết kế delta giai đoạn 2; có gộp PR bằng chứng nghiệm thu (#77) không | Chủ sở hữu | `WRITE_PATH_DELTA_DESIGN.md` §5, §7; mục D của `CAU_HOI_CHO_CHU_SO_HUU.md` |
| Cài thử bộ cài mới nhất trên Windows; chạy *Kiểm tra dữ liệu* với dữ liệu thật | Chủ sở hữu / kế toán | Báo lại cảnh báo để nhập lại |
| Xử lý dữ liệu thật: thiếu STK/ngân hàng, mã BH_KPCD, Quyền lợi phép chưa nhập, phiếu cân chưa gán người | Bên vận hành | Mục C của `CAU_HOI_CHO_CHU_SO_HUU.md` |
| Duyệt thiết kế mã hóa file dữ liệu (RISK-07) và cung cấp chứng thư ký số bộ cài | Chủ sở hữu | Tạm dừng theo yêu cầu (15/11/2026) |
| Đồng bộ module dùng chung | Đã duyệt 15/11/2026 | Đã làm: khóa + script, `core/smart-filter.js` theo repo gốc, đổi tên `ci/quality-python`. Xem `DONG_BO_MODULE_DUNG_CHUNG.md` §6–7 |
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
- [x] Gom 4 đường ghi còn lại (nhập Excel, gộp chấm công, thêm NV, xóa NV) vào repository (2.0.17)
- [x] Bước chuẩn bị SQLite: kho bóng chỉ để so sánh (`tools/sqlite-shadow.js`), đọc lại giống hệt JSON và tính lương 0 khác biệt ở 5.000 NV — `MIGRATION_PLAN.md` §2
- Tiếp theo (chờ chủ sở hữu duyệt): repository ghi nhận dòng thay đổi → SQLite ghi theo dòng

## Phase 2 — Chuẩn hóa kiến trúc (bước tiếp theo)
0. ✅ SQLite qua `node:sqlite` (Electron 45.3.2), không cần module native. **Từ 2.0.29 là nguồn dữ liệu chính mặc định** (`HAK_STORAGE=json` để quay lui); tự kiểm trong bản đóng gói ở CI.
1. ✅ (2.0.17) Tách `app.js`: hàm trợ giúp sang `ui/app-helpers.js`, mã giao diện chia theo màn hình trong `app-src/` và `app-src/screens/`, báo cáo kỳ lương sang `core/reporting`. Các đoạn vẫn dùng chung một phạm vi biến; chưa phải module độc lập (xem `KE_HOACH_TACH_APP_JS.md` §8).
2. Tầng repository: mọi truy cập `db.<bảng>` qua `repo.list/get/insert/update/remove` (kiểm tra khóa, khóa kỳ, nhật ký trước/sau tại 1 chỗ). Viết test cho repository trước khi chuyển.
3. ~~PERF-01~~ ✅ alpha.5 (22 ms / 5.000 NV).
4. ✅ (2.0.29) SQLite làm nguồn chính theo `MIGRATION_PLAN.md`; còn mở: delta từ giao diện, khóa ngoại/chuẩn hóa, Full Backup bằng bản chụp SQLite, thử trên Windows thật (`ACCEPTANCE_SQLITE_RELEASE.md` §4, §7).
5. Bundler (esbuild) để dùng module ES trong renderer; giữ build không cần mạng khi chạy.

## Phase 3 — HRM chuyên nghiệp
Cơ cấu tổ chức nhiều cấp (tập đoàn → công ty → chi nhánh → khối → phòng → bộ phận → tổ), định biên, trung tâm chi phí; lịch sử thay đổi trước/sau + lý do + người sửa cho mọi trường quan trọng; quyết định tiếp nhận/điều chuyển/bổ nhiệm/lương/nghỉ việc; đào tạo, chứng chỉ; trung tâm cảnh báo (hết thử việc, khám sức khỏe, phép vượt số dư, thiếu thông tin trả lương, trùng CCCD).

## Phase 4 — Payroll linh hoạt
Rule engine an toàn (parser riêng, không eval) với bộ quy tắc mặc định = engine hiện tại (hồi quy 100%); giải thích từng dòng lương; ca/lịch làm việc/ngày lễ; mô hình sản lượng gốc → phân bổ → tính lương (6 phương thức chia); chính sách BH/thuế có nguồn pháp lý + phiên bản; tạm ứng có trạng thái (không trừ trùng); thanh toán nhiều đợt có mã giao dịch chống lặp; quyết toán thuế năm (đã khấu trừ / tính lại / điều chỉnh).

## Phase 5 — Báo cáo & giao diện
Dashboard; 18 báo cáo (lọc, nhóm, sắp xếp, drill-down, Excel, PDF, lưu mẫu, tùy chỉnh cột); kiểm tra đối ứng hạch toán; chế độ sáng/tối; bảng lớn virtual scrolling; nhập liệu bàn phím.

## Phase 6 — Mở rộng & phát hành
Đăng nhập + phân quyền theo vai trò/phạm vi (kiểm tra ở tầng nghiệp vụ); mã hóa file dữ liệu; sao lưu mã hóa; chuẩn bị đồng bộ (ID ổn định, version, updatedAt, xóa mềm); ký số bộ cài (tránh cảnh báo SmartScreen); hướng dẫn sử dụng đầy đủ; nghiệm thu.
