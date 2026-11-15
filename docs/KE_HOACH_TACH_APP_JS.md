# Kế hoạch tách `app.js` (nhóm việc 4)

Phân tích ngày 15/11/2026 trên `main` (2.0.16). **Chỉ lập kế hoạch, chưa di chuyển dòng mã nào.** Theo prompt: chỉ di chuyển mã, không viết lại logic; mỗi PR tách một nhóm; mỗi PR kèm toàn bộ test, E2E và ảnh chụp màn hình trước/sau ở 1366×768 và 1920×1080.

## 1. Hiện trạng đo được

- `LuongHAK_Offline/app.js`: **6.274 dòng, ~659 KB**, một hàm IIFE duy nhất. 327 hàm khai báo cấp 1 và 129 biến cấp 1.
- Nạp bằng một thẻ `<script src="app.js">` (dòng 97 của `index.html`, cùng hơn 70 thẻ script khác). Không có bundler; trình duyệt chạy script thường, không dùng module ES.
- Nhóm hàm lớn nhất: các màn hình `tab*` (21 hàm, ~1.300 dòng), lưới dữ liệu `grid` (1 hàm, 357 dòng), `tabOCR` (243 dòng), danh mục công thức `ct*` (18 hàm, ~330 dòng), thẻ `card*` (10 hàm, ~320 dòng), báo cáo `bc*` (7 hàm, ~116 dòng).
- Màn hình (hàm `tab*`): `tabNhanVien`, `tabNhanSu`, `tabBaoCao`, `tabHuongDan`, `tabDanhMuc`, `tabKiemTra`, `tabNghiepVuNS`, `tabCaiDat`, `tabKyLuong`, `tabBaoCaoLuong`, `tabDoiChieu`, `tabLuong`, `tabPayReport`, `tabOpsReport`, `tabBangTinhNoiBo`, `tabSlips`, `tabOcrLib`, `tabOCR`, `tabHome`, `tabSaoLuu`, `tabAllowed`.
- Báo cáo `bc*`: `bcCong`, `bcSanLuong`, `bcHachToan`, `bcSoSanh`, `bc12Thang`, `bcNVNam`, `bcThueNam`.

## 2. Biến dùng chung giữa các màn hình (phải xử lý trước khi tách)

Số hàm cấp 1 tham chiếu tới từng biến (đo bằng phân tích cú pháp, không phải đoán):

| Biến | Số hàm dùng | Bị gán lại? | Ghi chú |
|---|---:|---|---|
| `db` | 127 | **Có, 7 chỗ** | Toàn bộ dữ liệu lương. Gán lại khi mở file, khôi phục, hoàn tác lưu lỗi. |
| `st` | 104 | Không (đổi tại chỗ) | Trạng thái giao diện (màn hình, kỳ, bộ lọc). Có thể chia sẻ như đối tượng ổn định. |
| `session` | 29 | **Có, 12 chỗ** | Người đăng nhập và phiên. |
| `C`, `E`, `VAL`, `REPO`, `HR`, `PERM`, `AUTH`, `INT`, `GATE`, `RF`, … | 8–37 | Không | Hằng tham chiếu module `core/*`; chuyển được như tham số. |
| `store`, `ALL` | 20, 19 | Không | Lưu trữ và danh sách bảng. |
| `lastTxnError`, `lastSaveError` | 18, 5 | Có (4, 4) | Trạng thái lỗi lưu. |
| `dbRev`, `dirty`, `readOnly`, `loadError` | 12, 11, 5, – | Có (4, 8, 10, 10) | Cờ vòng đời lưu/đọc. |
| `now`, `winUser`, `lastActive`, `saveTimer`, `fromLocal`, … | – | Có (một số) | Chủ yếu trong khối khởi động/lưu. |

**Biến cấp 1 bị gán lại sau khai báo (23 biến):** `session`×12, `loadError`×10, `readOnly`×10, `dirty`×8, `db`×7, `lastSaveError`×4, `lastTxnError`×4, `dbRev`×4, `INDEX_PB`×3, `saveTimer`×2, `lastActive`×2, `impBusy`×2, và 11 biến chỉ gán một lần (`fromLocal`, `schemaReport`, `migMsg`, `sessionActivityAt`, `dlId`, `kqMemo`, `STEP_CACHE`, `RFCTX_KEY`, `RFCTX_LAST`, `OCRL`, `sessChecked`).

Khó khăn cốt lõi: vì app là **một closure**, hàm đưa sang file khác **mất quyền truy cập** `db`, `st`, `session`… Biến bị gán lại thì không thể chỉ "truyền tham số" một lần.

## 3. Các cách làm và đề xuất

| Cách | Mô tả | Ưu | Nhược |
|---|---|---|---|
| A. Đối tượng ngữ cảnh | Một file `ui/app-context.js` giữ trạng thái chung; các file màn hình nhận `ctx`. | Không cần công cụ build. | Phải **đổi cách truy cập** trong mã đã chuyển (`db` → `ctx.db`) — chạm vào hầu hết các dòng, trái với "không viết lại logic". |
| B. Bundler lúc build (esbuild) | Mã nguồn chia nhiều module; bước build ghép lại **một IIFE `app.js`** như hiện nay. | Giữ nguyên một closure nên **không đổi cách truy cập biến**; khớp mục 5 của Phase 2. | Thêm công cụ build; các test đọc `app.js` trực tiếp cần chỉnh (xem §4); phải bảo đảm chạy được không cần mạng (esbuild chỉ dùng lúc build). |
| C. Hai bước (đề xuất) | Bước 1: chuyển các hàm **không đụng trạng thái dùng chung** sang `ui/*.js` thường. Bước 2: chuyển các màn hình bằng cách đổi 7 + 12 chỗ gán lại `db`/`session` thành **cập nhật tại chỗ** (đối tượng ổn định), rồi chia sẻ đối tượng qua `ctx` mà không đổi cách đọc ở các màn hình. | Rủi ro thấp ở bước 1; bước 2 chỉ chạm vài chục dòng gán lại. | Bước 2 đòi hỏi test khóa hành vi hoàn tác/khôi phục trước (xem §5). |

**Đề xuất: cách C**, chia thành các PR nhỏ theo §6. Cách B để sau, nếu chủ sở hữu muốn dùng module ES.

## 4. Rủi ro riêng của repo này: test đọc nguồn `app.js`

**16 file test** đọc trực tiếp văn bản `app.js` và kiểm tra bằng biểu thức chính quy (ví dụ `cccd-duplicate`, `employee-save-error`, `icons`, `modal-selection`, `pay-privacy`, `payroll-close`, `payroll-deficit`, `pending-save-boundaries`, `permissions`, `repository`, `restore-atomic-ui`, `security-save-atomic`, `session-activity`, `shared-ocr-import`, `v104-design-contract`, `v94-payroll-reports`). Khi một đoạn chuyển sang file mới, các test này sẽ hỏng dù hành vi không đổi.

Cách xử lý, **không nới lỏng test**: thêm một hàm đọc nguồn chung (ví dụ `readAppSource()` ghép `app.js` và các file `ui/app-*.js`) và để 16 test dùng hàm đó. Kiểm tra giữ nguyên nội dung; chỉ đổi nơi đọc. Việc này làm trong PR đầu tiên, trước khi di chuyển mã.

## 5. Gom bốn đường ghi còn lại vào `core/repository.js`

Theo roadmap: nhập Excel, gộp chấm công, thêm nhân viên, xóa nhân viên. Prompt yêu cầu **test khóa hành vi trước khi chuyển**. Kế hoạch: PR riêng cho mỗi đường, mỗi PR gồm (1) test đặc tả hành vi hiện tại (kể cả đường lỗi và hoàn tác), (2) chuyển ghi qua repository, (3) chạy lại E2E nhập liệu. Làm sau khi tách xong bước 1 của §6 để diff nhỏ hơn.

## 6. Thứ tự PR đề xuất

Mỗi dòng là **một PR riêng**, cùng quy trình: chạy `npm ci`, `npm test`, lint, `test:ui-dom`, E2E, chụp màn hình trước/sau ở 1366×768 và 1920×1080, `check-consolidation`, và so sánh kết quả engine không đổi.

| PR | Nội dung | Phạm vi |
|---|---|---|
| 1 | Hàm đọc nguồn chung cho 16 test (§4). Không đổi mã chạy. | Chỉ test |
| 2 | Chuyển **134 hàm không dùng trạng thái chung** (~1.044 dòng): trợ giúp DOM (`$`, `h`, `btn`, `toast`), định dạng (`qtyText`, `fmt`, `esc`, `moneyText`, `moneyLive`), tiện ích Excel (`saveXlsx`, `readWorkbook`, `templateSheet`…), ô nhập (`dateField`, `dateFix`, `dateIso`), hộp thoại (`askText`, `askPassword`) sang `ui/app-helpers.js`. | Thấp rủi ro |
| 3 | Chuyển báo cáo `bc*` (7 hàm) và các bộ dựng báo cáo thuần sang `core/reporting/` kèm test so sánh đầu ra trước/sau trên dữ liệu tổng hợp. | Trung bình |
| 4 | Đổi 7 chỗ gán lại `db` và 12 chỗ gán lại `session` thành cập nhật tại chỗ (đối tượng ổn định) + test khóa hoàn tác/khôi phục/đăng xuất. Dừng nếu test phát hiện nơi giữ tham chiếu `db` cũ. | **Cao** — chạm vòng đời lưu |
| 5 → n | Mỗi PR một nhóm màn hình, đi từ ít phụ thuộc nhất: `tabHuongDan`, `tabHome`, `tabAllowed` → `tabKiemTra`, `tabSaoLuu` → các màn hình báo cáo (`tabBaoCao`, `tabBaoCaoLuong`, `tabPayReport`, `tabOpsReport`, `tabSlips`) → nhân sự (`tabNhanVien`, `tabNhanSu`, `tabNghiepVuNS`) → lương và kỳ (`tabLuong`, `tabKyLuong`, `tabDoiChieu`) → OCR (`tabOCR`, `tabOcrLib`) → cài đặt và danh mục (`tabCaiDat`, `tabDanhMuc`, `ct*`). Hàm `grid` (357 dòng) để cuối cùng. | Tăng dần |
| sau | Gom bốn đường ghi vào repository (§5). | Từng đường một PR |

## 7. Câu hỏi cần chủ sở hữu quyết định

1. Chọn cách C (hai bước, đề xuất) hay cách B (bundler)?
2. Đồng ý PR 4 (đổi `db`/`session` thành cập nhật tại chỗ) hay giữ nguyên và chỉ tách phần không đụng trạng thái?
3. Chấp nhận đổi cách các test đọc `app.js` (§4) không?
4. Có ưu tiên màn hình nào tách trước không (theo thứ tự dùng nhiều nhất)?

**Lưu ý nghiệm thu:** mọi bước tách chỉ được coi là xong sau khi bộ E2E đạt và có ảnh chụp trước/sau. Chưa nghiệm thu trên máy Windows thật.

## 8. Đã làm (cập nhật 15/11/2026)

**Bước 1 — chuyển hàm trợ giúp sang `ui/app-helpers.js`.** Chỉ di chuyển, nội dung từng hàm giữ nguyên từng ký tự.

- Đã chuyển **43 hàm** (152 dòng, ~19 KB): `$`, `toast`, `esc`, `fmt`, `qtyText`, `moneyText`, `moneyLive`, `dateFix`, `dateIso`, `kyLabel`, `kyKey`, `n0`, `sheetName`, `slug`, `loadScript`, các hàm ảnh/OCR thuần (`canvasOf`, `grayOf`, `grayCanvas`, `layoutCheck`…) và một số hàm định dạng khác. `app.js` lấy lại chúng qua `window.HAKAppHelpers` ở đầu file; `index.html` nạp `ui/app-helpers.js` ngay trước `app.js`.
- Con số 134 hàm ở §6 là ước lượng quá rộng. Đo lại bằng phân tích phạm vi biến (eslint-scope): chỉ **56 hàm** không đọc/ghi biến nào của `app.js` ngoài các bí danh module (`C`, `VAL`, `RP`, `FML`, `LF`). Trong đó **13 hàm được giữ lại** vì có test cắt mã nguồn `app.js` quanh chúng (ví dụ `h`, `ocrNum`, `tkChiPhi`) hoặc vì chúng gọi hàm bị giữ lại (`btn`, `simpleTable`… gọi `h`).
- Vì không hàm nào bị test cắt nguồn bị di chuyển, **16 file test đọc `app.js` không phải sửa** và hàm đọc nguồn chung ở §4 chưa cần đến.
- Kiểm chứng: `npm test` 900/900, lint sạch, `test:ui-dom` đạt, `check-consolidation` đạt, E2E Electron đầy đủ 275/275 (chạy trên Linux dưới xvfb). Chưa nghiệm thu trên Windows thật. Chưa chụp ảnh màn hình trước/sau vì giao diện không đổi và E2E đã bao phủ.
- Chưa tăng phiên bản: các bước tách sẽ phát hành chung một bản khi xong đợt.

**Bước 2 — chia `app.js` thành 28 file trong `LuongHAK_Offline/app-src/`, ghép lại lúc build** (chủ sở hữu chọn ngày 15/11/2026; là dạng đơn giản của cách B ở §3, không cần esbuild).

- Mỗi file là một đoạn liên tiếp của hàm bao, cắt tại các tiêu đề mục `// ---------- … ----------` có sẵn: lưu trữ, đăng nhập và phân quyền, Excel, danh mục, bảng nhập liệu, nhân sự, HĐLĐ, kiểm tra bảng lương, công thức lương, tính lương, chốt kỳ, báo cáo lương, OCR, sao lưu và khôi phục, khung điều hướng… Điểm cắt đã được kiểm bằng cây cú pháp: không điểm nào nằm giữa một câu lệnh.
- `scripts/build-app.cjs` (`npm run build:app`) ghép các file theo thứ tự tên thành `app.js`. `app.js` vẫn được commit và là file duy nhất Electron, bộ cài và các test đọc. So với trước khi chia, `app.js` chỉ thêm đúng một dòng chú thích "không sửa trực tiếp" ở đầu file.
- `tests/unit/app-parts.test.js` (3 test) bắt trường hợp `app.js` lệch với `app-src/`. `app-src/` không vào bộ cài và không được lint riêng (lint chạy trên `app.js` đã ghép).
- Hạn chế: các file trong `app-src/` không phải module độc lập, vẫn dùng chung một phạm vi biến. Cách này giúp tìm, đọc và xem diff theo từng màn hình; chưa tạo ranh giới phụ thuộc giữa các màn hình. Muốn có ranh giới thật thì vẫn cần PR 4 ở §6.
- Kiểm chứng: `npm test` 903/903, lint sạch, `test:ui-dom`, `check-consolidation` đạt.

**Bước 3 — chuyển bốn đường ghi và bảy báo cáo.** Nhập Excel, gộp chấm công, thêm và xóa nhân viên dùng giao dịch đồng bộ qua `core/repository.js`. Khi ghi thất bại, giao dịch hoàn tác các bảng và nhật ký. Bảy hàm `bc*` đặt trong `core/reporting/period-reports.js`. Các màn hình cung cấp dữ liệu đầu vào và dựng giao diện.

**Bước 4 — mỗi hàm dựng màn hình có một file.** 21 hàm `tab*` nằm trong `LuongHAK_Offline/app-src/screens/`. Dòng `// @screen tênHàm` cho bộ build biết vị trí ghép; bộ build báo lỗi khi thiếu, thừa hoặc ghép trùng file. `app.js` khớp từng byte với bản ngay trước bước tách màn hình.

Các file màn hình vẫn dùng chung phạm vi của hàm bao tại thời điểm chạy. `db` và `session` vẫn có thể được gán lại để các màn hình luôn đọc trạng thái hiện hành khi mở dữ liệu, hoàn tác, khôi phục hoặc đăng xuất. Ranh giới module độc lập khi chạy là thay đổi kiến trúc riêng.
