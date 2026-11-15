# Prompt nâng cấp Lương HAK Offline (từ v2.0.12)

Dán nguyên phần dưới đây vào một phiên Claude Code mới mở trên repo `saoluucvhak-pixel/HAK_LUONG_OFFLINE`.

---

Bạn làm việc trên repo `HAK_LUONG_OFFLINE`. App phát hành nằm trong `LuongHAK_Offline/` (Electron 43, đóng gói NSIS cho Windows, chạy hoàn toàn offline), hiện ở bản **2.0.12**. Đây là phần mềm tính lương thật của công ty: sai một đồng trong bảng lương hoặc làm hỏng một kỳ đã chốt là lỗi nghiêm trọng hơn mọi lợi ích của việc nâng cấp. Mục tiêu của đợt này là dọn nợ kỹ thuật và làm chắc quy trình phát hành, **không thay đổi kết quả tính lương**.

## Hiện trạng đã kiểm tra (15/11/2026, commit `bda8e83`)

- `npm test` trong `LuongHAK_Offline`: 900/900 đạt. `npm run test:kpi`: 17/17. `npm run test:legacy`: 37/37.
- `npx eslint .` báo 2 lỗi `no-undef`: `HTMLElement` tại `app.js:2076`. Job `check` của `.github/workflows/build-exe.yml` chạy eslint với `--max-warnings 0` trên mọi PR đụng `LuongHAK_Offline/**`, nên PR hiện sẽ đỏ.
- `npm audit --omit=dev`: 0 lỗ hổng. `npm audit` đầy đủ: 6 lỗ hổng mức moderate, đều nằm dưới `electron-builder` (chỉ dùng lúc build).
- Bản đang dùng so với bản mới nhất: electron 43.8.9 → 45.3.2, electron-builder 26.15.3 → 26.18.0, jsdom 30.1.3 → 31.0.1, tesseract.js 5.1.1 → 7.0.0. SheetJS trong `xlsx.full.min.js` đã là 0.20.3.
- `app.js` nặng 659 KB, khoảng 1.680 hàm trong một file. `docs/TODO_ROADMAP.md` đã có kế hoạch tách (Phase 2) nhưng chưa làm.
- Electron đã bật `contextIsolation`, `sandbox`, tắt `nodeIntegration`, có CSP chặt, chặn mở cửa sổ và điều hướng. Công thức lương dùng parser riêng, không `eval`.
- Dữ liệu trên đĩa chưa mã hóa (chỉ bản sao lưu có `main/backup-crypt.js`). Bộ cài chưa ký số.
- Bốn workflow trong `.github/workflows` chồng chéo nhau. `build-exe.yml` và `luong-offline-quality-audit.yml` chỉ chạy khi push lên hai nhánh cũ (`claude/dazzling-cray-idw87u`, `audit/luong-hak-offline-v10-3-quality`). Hai job E2E cài hai bản Playwright khác nhau (1.56.1 và 1.64.1).
- Các thư mục `HAK_SMART_FILTER/`, `HAK_ACCOUNTING_REPORT_STANDARD/`, `HAK_CODE_QUALITY_TEST/`, `HAK_AI_SKILLS/`, `design-system/` là bản sao của các repo riêng cùng tên và đã lệch so với repo gốc: cấu trúc thư mục khác, repo gốc có thêm file và test mới (ví dụ `large-number.test.js`, `REPORT_FORMAT_SPEC.md`), `src/index.js` và `src/moisture-settings.js` của Accounting Report Standard khác nội dung.
- `docs/TODO_ROADMAP.md` còn ghi trạng thái bản 1.4.0 ngày 10/10/2026; `docs/CHANGELOG.md` dừng ở alpha.25; `docs/RELEASE_NOTES.md` dừng ở alpha.4. Ghi chú các bản sau nằm rời trong `docs/releases/`.
- `npm run check` (`scripts/check-consolidation.cjs`) dừng với lỗi `Not a valid commit name` khi repo được clone nông. Chưa xác minh được nó có đạt trên bản clone đầy đủ hay không.

## Ràng buộc không được vi phạm

1. Không đổi công thức lương, thuế, bảo hiểm, công chuẩn, quy tắc làm tròn. Sau mỗi bước, kết quả tính của engine phải giống hệt trước đó trên toàn bộ bộ test hồi quy và kịch bản lương. Nếu thấy một công thức có vẻ sai, ghi lại kèm ví dụ số cụ thể và hỏi chủ sở hữu, không tự sửa.
2. Không đổi cấu trúc dữ liệu đã lưu, không đụng tới kỳ đã chốt, không làm bản sao lưu cũ mất khả năng khôi phục. Nếu một việc bắt buộc phải đổi schema, dừng lại và trình bày phương án chuyển đổi trước.
3. Không commit dữ liệu lương thật, ảnh chứng từ thật, bản sao lưu, mật khẩu hay khóa. Test chỉ dùng dữ liệu tổng hợp.
4. App phải tiếp tục chạy không cần mạng. Không thêm thư viện tải từ CDN lúc chạy.
5. Không bỏ qua, tắt hay nới lỏng test để CI xanh. Test đỏ nghĩa là phải tìm nguyên nhân.
6. Giao diện, thông báo và tài liệu cho người dùng viết bằng tiếng Việt, cùng giọng với phần đã có.
7. Mỗi nhóm việc bên dưới là một PR riêng, nhỏ, xem lại được. Không gộp việc tách file với việc đổi hành vi trong cùng một PR.

## Việc cần làm, theo thứ tự ưu tiên

### 1. Đưa CI về trạng thái tin được
- Sửa 2 lỗi eslint bằng cách khai báo `HTMLElement` trong `browserGlobals` của `eslint.config.js`. Rà xem còn global trình duyệt nào đang được dùng mà chưa khai báo.
- Gộp bốn workflow thành một luồng rõ ràng: kiểm tra cú pháp, lint, unit, integration, regression và `test:ui-dom` chạy trên mọi PR và mọi lần push lên `main`; E2E Electron chạy dưới xvfb; build bộ cài Windows chỉ chạy sau khi các bước trên đạt. Bỏ điều kiện push theo hai nhánh cũ. Dùng một phiên bản Playwright duy nhất, ghi cố định.
- Thêm `eslint` vào `devDependencies` và một script `lint` trong `package.json` để máy lập trình viên và CI dùng cùng phiên bản.
- Làm cho `scripts/check-consolidation.cjs` báo lỗi dễ hiểu khi thiếu lịch sử git (nêu rõ cần clone đầy đủ), và để CI checkout với `fetch-depth: 0` ở bước chạy script này.

### 2. Cập nhật phụ thuộc
- Nâng `electron-builder` lên bản 26.x mới nhất rồi chạy lại `npm audit`. Báo cáo những lỗ hổng còn lại và lý do chưa xử lý được.
- Nâng Electron lần lượt từng bản major (43 → 44 → 45). Ở mỗi bước đọc danh sách thay đổi phá vỡ tương thích, chạy toàn bộ test và E2E. Chú ý `node:sqlite`, `safeStorage`, sandbox của preload và các kênh IPC trong `main/ipc-guard.js`.
- `tesseract.js` 5 → 7 ảnh hưởng trực tiếp độ chính xác OCR chấm công. Chỉ nâng nếu `npm run test:ocr-eval` cho kết quả theo từng ô không kém hơn bản hiện tại; ghi số liệu trước và sau. Nếu kém hơn thì giữ bản 5 và nêu lý do.
- `jsdom` nâng bình thường, chỉ ảnh hưởng test.

### 3. Đồng bộ các module dùng chung
- So sánh từng thư mục sao chép với repo gốc tương ứng (`HAK_SMART_FILTER`, `HAK_ACCOUNTING_REPORT_STANDARD`, `HAK_CODE_QUALITY_TEST`, `HAK_AI_SKILLS`, `HAK-Enterprise-Design-System`). Lập bảng: file nào app thực sự nạp lúc chạy, file nào chỉ là tài liệu, bên nào mới hơn.
- Đề xuất một cơ chế duy nhất để giữ đồng bộ, theo mẫu `shared-ocr.lock.json` đang dùng cho OCR: ghi commit nguồn và SHA-256 của từng file, kèm một script kiểm tra chạy trong CI. Trình bày đề xuất và chờ đồng ý trước khi thay thế hàng loạt.
- Thay đổi nào trong repo gốc chạm tới định dạng số, làm tròn hoặc bộ lọc trên báo cáo lương thì phải có test so sánh đầu ra trước và sau.

### 4. Tách `app.js`
- Làm theo `docs/ARCHITECTURE.md` §2 và Phase 2 trong `docs/TODO_ROADMAP.md`: mỗi màn hình một file, phần báo cáo `bc*` chuyển sang `core/reporting` và có test.
- Chỉ di chuyển mã, không viết lại logic. Mỗi PR tách một nhóm màn hình, kèm chứng cứ là toàn bộ test và E2E đạt, cùng ảnh chụp màn hình trước và sau ở 1366×768 và 1920×1080.
- Bắt đầu từ phần ít phụ thuộc nhất. Trước khi tách, liệt kê các biến toàn cục mà nhiều màn hình dùng chung và cách bạn định xử lý chúng.
- Gom bốn đường ghi còn lại (nhập Excel, gộp chấm công, thêm nhân viên, xóa nhân viên) vào `core/repository.js` như roadmap đã ghi, có test khóa hành vi trước khi chuyển.

### 5. Bảo vệ dữ liệu và phát hành
- Mã hóa file dữ liệu trên đĩa (RISK-07). Trước khi viết mã, trình bày thiết kế: khóa lấy từ đâu, xử lý ra sao khi đổi máy hoặc quên mật khẩu, bản cũ mở dữ liệu mới thì thế nào, Full Backup và kho năm bị ảnh hưởng ra sao, đường quay lui. Chờ duyệt rồi mới làm.
- Ký số bộ cài để hết cảnh báo SmartScreen: nêu loại chứng thư cần mua và cách cấu hình trong `electron-builder`. Phần này cần chủ sở hữu cung cấp chứng thư, không tự tạo.

### 6. Tài liệu
- Cập nhật `docs/TODO_ROADMAP.md` về đúng trạng thái 2.0.12, đánh dấu việc đã xong, bỏ tên các nhánh không còn dùng.
- Gộp ghi chú từ `docs/releases/` vào `docs/CHANGELOG.md` để có một lịch sử liên tục từ alpha.25 đến 2.0.12. `docs/RELEASE_NOTES.md` hoặc được cập nhật, hoặc chuyển thành trang dẫn sang `docs/releases/`.
- Lập danh sách các câu hỏi nghiệp vụ còn chờ trả lời trong `docs/BUSINESS_RULES.md` (các mục Q-xx và bốn điểm lệch với Excel trong `LuongHAK_Offline/docs/V9_PAYROLL_RECONCILIATION.md`) thành một bảng duy nhất cho chủ sở hữu.

## Cách kiểm chứng

Sau mỗi PR, chạy và dán kết quả thật:

```text
npm --prefix LuongHAK_Offline ci
npm test
npm --prefix LuongHAK_Offline run lint
npm --prefix LuongHAK_Offline run test:ui-dom
npm run test:legacy
npm run test:kpi
xvfb-run -a npm --prefix LuongHAK_Offline run test:e2e
```

Với thay đổi chạm tới engine, báo cáo hoặc lưu dữ liệu, chạy thêm `tests/perf/bench.js` và so với số liệu trong `docs/PERFORMANCE_REPORT.md`; chậm hơn 10% trở lên phải giải thích.

Môi trường Linux không thay được máy Windows thật. Việc nào chưa chạy trên Windows thì ghi rõ là chưa nghiệm thu, không ghi là đã xong.

## Cách báo cáo

Mỗi PR mô tả: đã đổi gì, vì sao, kết quả test (số đạt và số hỏng, kèm đầu ra khi có lỗi), việc nào chưa làm và lý do, việc nào cần chủ sở hữu quyết định. Tăng số phiên bản và thêm ghi chú trong `docs/releases/` theo cách các bản 2.0.x đã làm. Không tạo bản phát hành hay merge vào `main` khi chưa được yêu cầu.

Bắt đầu bằng nhóm việc 1. Trước khi sửa, đọc `README.md`, `docs/ARCHITECTURE.md`, `docs/BUSINESS_RULES.md` và `docs/TODO_ROADMAP.md`, rồi nêu ngắn gọn kế hoạch cho PR đầu tiên.
