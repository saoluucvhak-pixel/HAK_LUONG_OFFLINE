# Prompt nâng cấp Lương HAK Offline (từ v2.0.34)

Dán nguyên phần dưới đây vào một phiên Claude Code mới mở trên repo `saoluucvhak-pixel/HAK_LUONG_OFFLINE`. Thay thế `docs/PROMPT_NANG_CAP_V2_1.md` (viết cho bản 2.0.12; phần lớn nhóm việc trong đó đã xong hoặc đã đổi hướng).

---

Bạn làm việc trên repo `HAK_LUONG_OFFLINE`. App phát hành nằm trong `LuongHAK_Offline/` (Electron 45, đóng gói NSIS cho Windows, chạy hoàn toàn offline), hiện ở bản **2.0.34** (trạng thái ghi trong ghi chú phát hành: *thử nghiệm có kiểm soát*). Đây là phần mềm tính lương thật của công ty: sai một đồng trong bảng lương hoặc làm hỏng một kỳ đã chốt là lỗi nghiêm trọng hơn mọi lợi ích của việc nâng cấp. Mục tiêu của đợt này là **làm chắc phần lưu trữ SQLite vừa chuyển sang mặc định, xác minh nền kiểm thử, và dọn nợ tài liệu**, không thay đổi kết quả tính lương.

## Hiện trạng (18/11/2026, `main` commit `871f0ff`; số liệu chạy tay là trên v2.0.33 `1aa1688`, phần v2.0.34 và các PR #78–#80 theo ghi chú/commit)

**Đã kiểm chứng (Linux, dữ liệu tổng hợp):**
- `npm ci`, `npm test` 1.113/1.113, `npm run lint` sạch (eslint 10.15.0, `--max-warnings 0`), `npm run test:ui-dom`, `npm run check` (`scripts/check-consolidation.cjs`, cần clone đầy đủ), `npm run test:legacy` 37/37, `npm run test:kpi` 17/17, `npm audit --omit=dev` 0 lỗ hổng.
- CI một luồng duy nhất `.github/workflows/luong-hak-v10-4-setup.yml`: `check` → E2E Linux và Windows, visual, inherited-quality, consolidation → build bộ cài → phát hành (chỉ `main`). Lần chạy v2.0.33 xanh cả 8 job. Playwright 1.64.1 ghi cố định.
- Phụ thuộc: Electron 45.3.2, electron-builder 26.18.0, jsdom 31, `tesseract.js` 7.0.0 (từ v2.0.18, độ chính xác OCR theo ô giữ 4/4 ca).
- Từ v2.0.29, **SQLite (`data.sqlite`) là nguồn dữ liệu chính mặc định**; `data.json` là bản xuất dẫn xuất. `HAK_STORAGE=json` quay về kho cũ. Ghi chú v2.0.30 đã sửa hai lỗi nghiêm trọng của v2.0.29 (A01, A02).
- `app.js` đã được tách: nay do `npm run build:app` ghép từ 31 file trong `app-src/` (đánh số `NN-ten.js`); `app.js` vẫn được commit và có test `app-parts.test.js` kiểm khớp. Đây là các **đoạn liên tiếp của một hàm bao (IIFE)**, chưa phải module độc lập; `db`, `st`, `session` vẫn dùng chung.
- Cơ chế khóa module dùng chung đã có (`scripts/verify-shared-modules.cjs`, chạy trong job `inherited-quality`). Phân tích gốc ở `docs/DONG_BO_MODULE_DUNG_CHUNG.md`.

**Chưa kiểm / còn mở (đừng ghi là đã xong):**
- **E2E chạy tay hỏng (đã xử lý):** nguyên nhân là hai cờ nghiệm thu SQLite (`HAK_SQLITE_EXPORT_SYNC=1`, `HAK_SQLITE_ADOPT_EXTERNAL=1`) mà workflow CI đặt sẵn còn lệnh chạy tay thì không, nên `data.json` (bản xuất trễ ~3 giây) còn cũ khi test đọc. PR #78 đã đặt mặc định hai cờ này cho các script E2E qua `tests/e2e/harness-env.cjs` (trừ `sqlite-default.cjs` và `installed-setup.cjs`, cố ý dùng chế độ thật). Chạy tay `npm run test:e2e` và `npm run test:ocr-eval` giờ phải xanh; nếu không, đó là vấn đề mới.
- Theo `docs/ACCEPTANCE_SQLITE_RELEASE.md` §4 và ghi chú v2.0.33: chưa có Full Backup/restore bằng SQLite Backup API hoặc `VACUUM INTO`; kho năm trên SQLite; thử kill/crash ở các mốc còn lại (đã có test `kill -9` thật giữa lúc lưu nhiều bảng và DB bị khóa bởi kết nối khác, PR #79; còn thiếu: sau commit trước phản hồi, giữa chốt kỳ, giữa khôi phục) và đĩa đầy; **chưa cài mới và nâng cấp từ JSON bằng Setup trên Windows thật**; chưa thử máy in; giao diện vẫn gửi cả tài liệu mỗi lần lưu (thiết kế delta giai đoạn 2 ở `docs/WRITE_PATH_DELTA_DESIGN.md`, chưa làm; mục tiêu < 150 ms). Chính tài liệu nghiệm thu ghi "không nên cutover khi các mục này chưa đạt", nhưng mặc định đã chuyển ở v2.0.29 theo yêu cầu chủ sở hữu.
- **v2.0.34 (PR #77, đã gộp)** ghi nhận một phát hiện chưa sửa, nay là quyết định **D1** trong `docs/CAU_HOI_CHO_CHU_SO_HUU.md` mục D: ghi vào kho qua `store-save` ngoài trạng thái bộ nhớ của giao diện bị giao diện ghi đè khi đóng/tải lại vì `store-save` không kiểm tra bản nền (`baseSig`); chưa thấy đường thực tế gây mất dữ liệu trong dùng bình thường. Cùng bản: mục tiêu lưu < 150 ms ở 5.000 nhân viên **chưa đạt** (p50 272 ms), RSS ~1,6 GB ở 10.000 nhân viên là rủi ro; chưa khôi phục từ bản chụp SQLite; CI kiểm bộ cài thật (cài im lặng, nâng cấp JSON→SQLite, cài đè, gỡ giữ dữ liệu) chạy trên runner Windows, chưa chạy trên máy và tài khoản Windows thật.
- **Tài liệu nghiệp vụ đã khớp (PR #80):** các câu hỏi Q-xx và bốn điểm lệch E1–E4 đã đóng ngày 17/11/2026 (chủ sở hữu chọn "giữ nguyên theo app"); `docs/CAU_HOI_CHO_CHU_SO_HUU.md` nay chỉ còn mục C (việc dữ liệu) và mục D (quyết định kỹ thuật D1–D5).
- **Rác bị commit trong repo:** PR #79 vô tình commit một symlink tên `LuongHAK_Offline/node_modules` trỏ vào đường dẫn tuyệt đối của máy tạo ra; `npm ci` xóa nó và git báo "deleted". Được gỡ cùng PR chứa prompt này (xem mục 1).
- Dữ liệu trên đĩa **chưa mã hóa** (chỉ bản sao lưu có `main/backup-crypt.js`); bộ cài **chưa ký số**.

## Ràng buộc không được vi phạm

1. Không đổi công thức lương, thuế, bảo hiểm, công chuẩn, quy tắc làm tròn. Sau mỗi bước, kết quả tính của engine phải giống hệt trước đó trên toàn bộ bộ test hồi quy. Nếu thấy một công thức có vẻ sai, ghi lại kèm ví dụ số cụ thể và hỏi chủ sở hữu, không tự sửa. Các file bị khóa băm trong `scripts/check-consolidation.cjs` (ví dụ `engine.js`, `hr.js`, `core/integrity.js`, `core/production-alloc.js`) và danh sách "sửa có chủ đích" của job `inherited-quality` **chỉ được thêm khi chủ sở hữu cho phép rõ ràng**; không tự nới cổng kiểm tra để CI xanh.
2. Không đổi lược đồ dữ liệu hay định dạng lưu đã phát hành nếu chưa trình bày phương án chuyển đổi, bản sao lưu cũ và đường quay lui (`HAK_STORAGE=json`, khôi phục từ Full Backup) và chờ duyệt. Không đụng tới kỳ đã chốt. Không làm bản sao lưu cũ mất khả năng khôi phục.
3. Không commit dữ liệu lương thật, ảnh chứng từ thật, bản sao lưu, mật khẩu hay khóa. Test chỉ dùng dữ liệu tổng hợp.
4. App phải tiếp tục chạy không cần mạng. Không thêm thư viện tải từ CDN lúc chạy.
5. Không bỏ qua, tắt hay nới lỏng test để CI xanh. Test đỏ nghĩa là phải tìm nguyên nhân. Nếu một test hỏng chỉ ở môi trường của bạn, hãy chứng minh điều đó (chạy lại, so với CI, tìm điểm khác) trước khi kết luận.
6. Giao diện, thông báo và tài liệu cho người dùng viết bằng tiếng Việt, cùng giọng với phần đã có. Báo giờ theo giờ Việt Nam (UTC+7).
7. Mỗi nhóm việc bên dưới là một PR riêng, nhỏ, xem lại được. Không gộp việc di chuyển mã với việc đổi hành vi trong cùng một PR. Không tạo bản phát hành hay gộp vào `main` khi chưa được yêu cầu.
8. Việc chưa chạy trên Windows thật phải ghi rõ là **chưa nghiệm thu**, không ghi là đã xong.

## Việc cần làm, theo thứ tự ưu tiên

### 0. Đọc trước khi làm
`README.md`, `docs/ARCHITECTURE.md`, `docs/BUSINESS_RULES.md`, `docs/TODO_ROADMAP.md`, `docs/ACCEPTANCE_SQLITE_RELEASE.md`, `docs/WRITE_PATHS_INVENTORY.md`, `docs/WRITE_PATH_DELTA_DESIGN.md`, `docs/DATA_FLOW_AND_RECONCILIATION.md`, `docs/CAU_HOI_CHO_CHU_SO_HUU.md`, và ghi chú `docs/releases/v2.0.29.md` đến `v2.0.33.md` (có mục "Quay lui" và các đính chính). Rồi nêu ngắn gọn kế hoạch cho PR đầu tiên.

### 1. Xác minh nền kiểm thử
- Lấy `main` mới nhất (clone đầy đủ: `git fetch --unshallow`) và chạy bộ lệnh ở mục "Cách kiểm chứng" để xác nhận nền xanh (E2E 297/297, `test:ocr-eval` 4/4 ca, unit ≥ 1.133). Không dùng `git add -A` mù: kiểm `git status` trước khi commit (đã có một symlink `node_modules` bị commit nhầm).
- Quyết định **D1** (kiểm bản nền `baseSig` ở `store-save`): lập bản tái hiện bằng test, đề xuất phương án (ví dụ bản ghi dựa trên bản cũ bị từ chối và giao diện nạp lại bản mới) và **chờ duyệt** trước khi sửa vì nó chạm đường ghi dữ liệu. Thiết kế delta giai đoạn 2 (D2) làm sau D1.

### 2. Hoàn tất phần lưu trữ SQLite (ưu tiên cao nhất vì đã là mặc định)
Mỗi mục dưới đây là một PR riêng, có test và bằng chứng; mục nào cần Windows thật thì dừng và nêu rõ cần chủ sở hữu thử gì:
- Full Backup/restore bằng SQLite Backup API hoặc `VACUUM INTO`; kiểm `integrity_check`, `foreign_key_check`, khôi phục từ bản sao lưu của các phiên bản trước (JSON), và từ bản sao lưu mã hóa nếu có.
- Kho năm trên SQLite; kiểm không ghi lùi dữ liệu (đã từng lỗi A01 ở v2.0.29).
- Thử kill/crash bằng cách kill tiến trình thật ở các mốc còn thiếu: sau commit nhưng trước phản hồi, giữa chốt kỳ, giữa khôi phục; đĩa đầy; hai phiên cùng ghi. (Đã có: kill -9 giữa lúc lưu nhiều bảng và DB bị khóa bởi kết nối khác — PR #79.)
- Giai đoạn 2 của đường ghi (giao diện gửi delta thay vì cả tài liệu) theo `WRITE_PATH_DELTA_DESIGN.md`: **trình bày lại thiết kế và đo đạc trước khi viết mã**, vì nó chạm ~30 điểm `save()`, ~27 `txn()` và ~22 `saveNow()`. Chờ duyệt.
- Viết lại `docs/DATABASE_SCHEMA.md` theo lược đồ thực tế nếu còn lệch.
- Kịch bản Setup trên Windows thật (cài mới, nâng cấp từ dữ liệu JSON cũ, gỡ cài rồi cài lại có giữ dữ liệu, in): soạn danh mục kiểm thủ công cho chủ sở hữu; không tự ghi là đã đạt.

### 3. Tách mã giao diện: bước tiếp theo
`app-src/` mới là bước chia file, chưa chia trách nhiệm: mọi file vẫn chung một closure. Chỉ làm tiếp khi chủ sở hữu chọn hướng (xem các câu hỏi cuối `docs/KE_HOACH_TACH_APP_JS.md`, nay là kế hoạch cũ trước khi có `app-src/`; cập nhật nó cho đúng hiện trạng). Hướng an toàn nhất: chuyển dần các hàm không dùng trạng thái chung sang `ui/*.js` hoặc `core/reporting/` kèm test so sánh đầu ra trước/sau; chỉ di chuyển mã, không viết lại logic. Với mỗi PR: toàn bộ test + E2E + ảnh chụp trước/sau ở 1366×768 và 1920×1080.

### 4. Tài liệu
Phần khớp quyết định nghiệp vụ đã xong (PR #80). Việc còn lại: cập nhật `docs/TODO_ROADMAP.md` và `docs/DONG_BO_MODULE_DUNG_CHUNG.md` mỗi khi hoàn tất một mục ở trên; giữ mục D của `CAU_HOI_CHO_CHU_SO_HUU.md` đúng với các quyết định đang chờ.

### 5. Tạm dừng theo yêu cầu của chủ sở hữu (15/11/2026)
Mã hóa file dữ liệu trên đĩa (RISK-07) và ký số bộ cài. **Không làm** cho tới khi chủ sở hữu bật lại. Khi được bật lại: với mã hóa, trình bày thiết kế trước (khóa lấy từ đâu, đổi máy hoặc quên mật khẩu, bản cũ mở dữ liệu mới, Full Backup và kho năm, đường quay lui; chú ý nay dữ liệu nằm trong SQLite) và chờ duyệt; với ký số, nêu loại chứng thư và cấu hình `electron-builder`, chủ sở hữu cung cấp chứng thư.

## Cách kiểm chứng

Sau mỗi PR, chạy và dán kết quả thật:

```text
npm --prefix LuongHAK_Offline ci
npm --prefix LuongHAK_Offline test
npm --prefix LuongHAK_Offline run lint
npm --prefix LuongHAK_Offline run build:app -- --check
npm --prefix LuongHAK_Offline run test:ui-dom
npm run check
npm run test:legacy
npm run test:kpi
xvfb-run -a npm --prefix LuongHAK_Offline run test:e2e
```

Với thay đổi chạm tới engine, báo cáo, lưu dữ liệu hoặc SQLite, chạy thêm `tests/perf/bench.js` và so với `docs/PERFORMANCE_REPORT.md`; chậm hơn 10% trở lên phải giải thích. Môi trường Linux không thay được máy Windows thật.

## Cách báo cáo

Mỗi PR mô tả: đã đổi gì, vì sao, kết quả test (số đạt và số hỏng, kèm đầu ra khi có lỗi), việc nào chưa làm và lý do, việc nào cần chủ sở hữu quyết định. Nâng số phiên bản và thêm ghi chú `docs/releases/vX.Y.Z.md` khi PR đổi mã chạy của app. PR chỉ sửa tài liệu hoặc bộ test thì không cần nâng: bước kiểm tra phiên bản của workflow bỏ qua phát hành khi tag đã tồn tại (nhưng vẫn build và kiểm thử). Quy trình phát hành: PR → CI xanh → gộp squash vào `main` khi được yêu cầu → workflow tự tạo tag và release.
