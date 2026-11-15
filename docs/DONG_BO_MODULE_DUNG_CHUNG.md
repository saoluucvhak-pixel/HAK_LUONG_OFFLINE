# Đồng bộ các module dùng chung với repo gốc

Phân tích ngày 15/11/2026 (nhóm việc 3). **Chỉ phân tích và đề xuất, chưa thay thế file nào.** Cần chủ sở hữu đồng ý đề xuất ở §3 trước khi thay hàng loạt.

So sánh bằng SHA-256 sau khi chuẩn hóa xuống dòng (CRLF → LF), thư mục trong repo này với bản clone mới nhất của repo gốc cùng tên:

| Thư mục ở repo này | Repo gốc | Commit gốc đã so |
|---|---|---|
| `HAK_SMART_FILTER/` | `saoluucvhak-pixel/HAK_SMART_FILTER` | `e99bb7e` |
| `HAK_ACCOUNTING_REPORT_STANDARD/` | `saoluucvhak-pixel/HAK_ACCOUNTING_REPORT_STANDARD` | `d324996` |
| `HAK_CODE_QUALITY_TEST/` | `saoluucvhak-pixel/HAK_CODE_QUALITY_TEST` | `b78d9b2` |
| `HAK_AI_SKILLS/` | `saoluucvhak-pixel/HAK_AI_SKILLS` | `7cf4e1a` |
| `design-system/` | `saoluucvhak-pixel/HAK-Enterprise-Design-System` | `69ac08a` |

## 1. Bảng so sánh

"Nạp lúc chạy" nghĩa là file có trong bộ cài hoặc được `index.html` / mã app nạp. `package.json` chỉ đóng gói `LuongHAK_Offline/` nên **không thư mục nào ở gốc repo đi vào bộ cài**.

| Thư mục | Vai trò thực sự trong repo này | Giống / khác repo gốc | Bên nào mới hơn | Ảnh hưởng đến app |
|---|---|---|---|---|
| `HAK_SMART_FILTER/` | Thư viện tham chiếu (query v1.2, định dạng kế toán, adapter) + test. Không ai nạp. | Cấu trúc khác hẳn: repo này có `src/` và `tests/` riêng, repo gốc có `core/`, `ui/`, `index.js`, `browser.js`. Chỉ trùng đường dẫn `README.md` (khác). | Không so sánh trực tiếp được. | Không (không nạp). |
| ↳ bản chạy thật của bộ lọc | `LuongHAK_Offline/core/smart-filter.js`, `ui/smart-filter.js`, `ui/filter-popover.js` (nạp trong `index.html`) | `filter-popover.js` **giống** repo gốc. `core/smart-filter.js` **khác** (12 dòng). `ui/smart-filter.js` **khác** (11 dòng). | `core/smart-filter.js`: **repo gốc mới hơn** (thêm `discardCorrupt()` và từ chối ghi khi kho bộ lọc đã lưu bị lỗi/khác phiên bản; app có phát hiện kho lỗi qua `isCorrupt()` nhưng khi lưu bộ lọc mới vẫn ghi đè kho cũ, không sao lưu). `ui/smart-filter.js`: **app mới hơn** (giữ focus và vị trí cuộn khi vẽ lại, tiêu đề lấy theo màn hình). | **Có** — đây là mã chạy thật. Hai bên cùng có cải tiến mà bên kia thiếu. |
| `HAK_ACCOUNTING_REPORT_STANDARD/` | Thư viện định dạng số/báo cáo tham chiếu + test. Không ai nạp. | 17 file trùng đường dẫn: 12 giống, 5 khác (`README.md`, `docs/MOISTURE_DRYNESS_SETTINGS.md`, `src/index.js`, `src/moisture-settings.js`, `tests/moisture-settings.test.js`). Repo gốc có thêm `docs/REPORT_FORMAT_SPEC.md`, `tests/large-number.test.js`, `.github/workflows/test.yml`. | **Repo gốc mới hơn**: `formatExact` và chặn số ≥ 2^53 (không hiển thị số sai âm thầm). | Không (không nạp). Định dạng số trong báo cáo lương do `core/reporting/report-html.js` và `ui/report-xlsx.js` tự xử lý. |
| `HAK_CODE_QUALITY_TEST/` | **Công cụ CI Python** đang chạy thật trong job `inherited-quality` (`quality_gate.py`, `security_audit.py`, `architecture_analyzer.py`, `ci_observer.py`, cấu hình `config/luong-hak.json`). | **Hai sản phẩm khác nhau cùng tên**: repo này là bộ Python (35 file), repo gốc là CLI Node `hak-quality` (15 file: `bin/`, `src/`, `package.json`). Chỉ trùng `README.md` (khác nội dung). | Không so sánh được. | Có, nhưng chỉ trong CI. Không vào bộ cài. |
| `HAK_AI_SKILLS/` | 5 file `SKILL.md` hướng dẫn cho tác tử AI. Không ai nạp. | Không trùng file nào. Repo gốc có 216 file theo cấu trúc `skills/<tên>/…` (ví dụ `skills/archify`). | Repo gốc rộng hơn nhiều. | Không. |
| `design-system/` | Bản sao tài liệu + 2 file CSS gốc của giao diện. `ui/hak-enterprise-components.css` và `ui/workspace-v104.css` của app là bản sao y hệt, **được test khóa** (`tests/unit/v104-design-contract.test.js`). | `hak-enterprise-components.css`: **giống** repo gốc. `V10.4-LAYOUT.md`: **giống**. `hak-workspace-layout.css`: **khác** repo gốc (66 dòng). Repo gốc xếp file trong `design-system/` và `css/`, repo này xếp phẳng. | `hak-workspace-layout.css`: **app mới hơn** (có sửa tiêu đề màn hình không bị cắt chữ ở v2.0.6/2.0.7, chưa có ở repo gốc, commit gốc ngày 18/10/2026). | **Có** — CSS chạy thật. Repo gốc thiếu bản sửa của app. |

## 2. Kết luận ngắn

1. **Có đúng ba chỗ ảnh hưởng đến app đang chạy:** `core/smart-filter.js`, `ui/smart-filter.js`, `ui/workspace-v104.css` (bản sao `design-system/hak-workspace-layout.css`). Các thư mục còn lại không đi vào bộ cài.
2. **Không bên nào luôn mới hơn.** Với `core/smart-filter.js` thì repo gốc tốt hơn; với `ui/smart-filter.js` và CSS layout thì app tốt hơn. Thay cả thư mục bằng bản gốc sẽ **làm mất** các sửa lỗi giao diện đã làm trong app.
3. **`HAK_CODE_QUALITY_TEST` nên đổi tên hoặc ghi chú rõ**, vì trùng tên với một sản phẩm khác ở repo gốc và dễ bị đồng bộ nhầm.
4. **`HAK_AI_SKILLS`, `HAK_SMART_FILTER/src`, `HAK_ACCOUNTING_REPORT_STANDARD` không phải mã chạy.** Có thể giữ làm tài liệu tham chiếu, hoặc bỏ hẳn nếu không ai dùng (cần chủ sở hữu quyết định).

## 3. Đề xuất cơ chế đồng bộ (chờ chủ sở hữu đồng ý)

Theo mẫu đang dùng cho OCR (`LuongHAK_Offline/shared-ocr.lock.json` + `scripts/verify-shared-ocr.cjs`, chạy trong job `inherited-quality`):

1. **Một file khóa duy nhất** `shared-modules.lock.json` ở gốc repo. Mỗi mục ghi: repo gốc, commit gốc, đường dẫn trong repo gốc, đường dẫn trong repo này, `normalizedSha256` của bản đang dùng, và trạng thái (`identical` hoặc `diverged` kèm lý do ngắn, ví dụ "app có sửa focus ở ui/smart-filter.js").
2. **Một script kiểm tra** `scripts/verify-shared-modules.cjs`:
   - luôn kiểm tra SHA-256 từng file khớp khóa (bắt thay đổi ngoài ý muốn);
   - khi có checkout repo gốc (CI dùng `actions/checkout` ghim commit, như đang làm với OCR), kiểm tra mục `identical` thật sự giống bản gốc.
3. **Chỉ khóa những file có vai trò rõ ràng:** ba file chạy thật ở §2.1, hai CSS thiết kế, và thư mục `HAK_CODE_QUALITY_TEST` (công cụ CI). Các file tham chiếu không nạp thì ghi nhận là "không đồng bộ" trong khóa.
4. **Cách xử lý các điểm lệch (mỗi điểm một PR riêng, có test so sánh đầu ra trước và sau):**
   - `core/smart-filter.js`: đưa `discardCorrupt()` và chặn ghi đè kho lỗi từ repo gốc vào app. Đây là thay đổi hành vi (hộp thoại khi kho bộ lọc đã lưu bị hỏng) nên cần thiết kế giao diện cho thông báo. Bộ lọc nằm trên đường báo cáo lương, nên PR phải kèm test so sánh kết quả lọc trước/sau với cùng dữ liệu.
   - `ui/smart-filter.js` và `hak-workspace-layout.css`: không kéo về từ repo gốc; ngược lại, **đề xuất đưa bản sửa của app lên repo gốc** (cần quyền ghi vào repo gốc; phiên này chỉ có quyền đọc).
   - `HAK_ACCOUNTING_REPORT_STANDARD`: nếu muốn dùng `formatExact` cho báo cáo lương, cần quyết định riêng vì chạm định dạng số; hiện chưa có chỗ nào gọi nó.
5. **Không thay thế hàng loạt, không xóa thư mục nào** cho đến khi có đồng ý bằng văn bản.

## 4. Câu hỏi cần chủ sở hữu trả lời

1. Đồng ý cơ chế khóa + script ở §3 không (một PR, chỉ thêm file khóa và script, không đổi mã chạy)?
2. Với `core/smart-filter.js`: có muốn đưa vào app cơ chế không ghi đè kho bộ lọc lỗi của repo gốc không?
3. Với `ui/smart-filter.js` và `hak-workspace-layout.css`: có muốn đẩy bản sửa của app lên repo gốc (cần cấp quyền ghi) không?
4. `HAK_AI_SKILLS`, `HAK_SMART_FILTER/src`, `HAK_ACCOUNTING_REPORT_STANDARD`: giữ làm tham chiếu hay bỏ?
5. `HAK_CODE_QUALITY_TEST`: đổi tên thành thư mục riêng cho CI (ví dụ `ci/quality-python`) để khỏi lẫn với repo gốc cùng tên không?

## 5. Đã làm (cập nhật 15/11/2026)

Bước 1 của §3 đã có, **không đổi dòng mã chạy nào**:

- `shared-modules.lock.json` ở gốc repo: khóa 6 file gốc (8 bản trong repo này) của `HAK_SMART_FILTER` tại `e99bb7e` và `HAK-Enterprise-Design-System` tại `69ac08a`. 3 file `identical`, 3 file `diverged` kèm lý do.
- `scripts/verify-shared-modules.cjs` (chạy tay: `npm run check:shared`): so mã băm từng file với khóa. Job `inherited-quality` của CI chạy script này kèm bản checkout hai repo gốc tại đúng commit đã ghim, nên mục `identical` được đối chiếu thật với bản gốc.
- Khi cố ý sửa một file trong danh sách, cập nhật mã băm trong khóa ở cùng PR. Khi muốn theo commit mới của repo gốc, đổi `commit` trong khóa và `ref` tương ứng trong workflow.

## 6. Quyết định của chủ sở hữu ngày 15/11/2026 và việc đã làm

Chủ sở hữu đồng ý cả bốn đề xuất (câu 2–5 ở §4):

1. **`core/smart-filter.js` nhận bản của repo gốc** (`e99bb7e`): khi kho bộ lọc đã lưu bị lỗi hoặc do phiên bản khác ghi, `save()` và `remove()` từ chối, không ghi đè; `discardCorrupt()` chép nguyên văn kho cũ sang khóa `hak.sf.presets.bak` rồi mới tạo kho trống. Khóa chuyển mục này sang `identical`. 21 hàm lọc còn lại giống hệt bản cũ (đã so nguyên văn từng hàm), nên kết quả lọc trên báo cáo lương không đổi; chỉ `presets()` khác.
   - Giao diện (`ui/smart-filter.js`): bảng "Bộ lọc đã lưu" báo khi kho lỗi và có nút **Sao lưu kho cũ và tạo kho mới**; app không tự tạo kho mới. Test: `tests/unit/smart-filter-corrupt-store.test.js` (5 test).
   - CI: thêm `core/smart-filter.js` vào danh sách file được phép khác mốc `c389ef4` trong job `inherited-quality`.
2. **Đẩy bản sửa của app lên repo gốc**: phiên làm việc đã được cấp quyền ghi vào `HAK_SMART_FILTER` và `HAK-Enterprise-Design-System`; trạng thái xem §7.
3. **Giữ các thư mục tham chiếu** (`HAK_AI_SKILLS`, `HAK_SMART_FILTER/`, `HAK_ACCOUNTING_REPORT_STANDARD/`), không xóa. Chúng không vào bộ cài và không được app nạp.
4. **Đổi tên `HAK_CODE_QUALITY_TEST/` thành `ci/quality-python/`** để khỏi lẫn với repo gốc cùng tên (sản phẩm khác). Đã cập nhật workflow, cấu hình và tài liệu trỏ tới thư mục này. Các file lịch sử (`docs/releases/`, `CHANGELOG.md`, `PROMPT_NANG_CAP_V2_1.md`) giữ tên cũ.

## 7. Trạng thái sau khi đồng bộ (15/11/2026)

- `HAK_SMART_FILTER` đã nhận `ui/smart-filter.js` của app (PR 2 của repo đó, commit gộp `2348786`).
- `HAK-Enterprise-Design-System` đã nhận `design-system/hak-workspace-layout.css` của app (PR 1 của repo đó, commit gộp `0eab12e`).
- `shared-modules.lock.json` ghim hai commit trên. **Cả 6 file gốc (8 bản trong repo này) đều ở trạng thái `identical`**; không còn mục `diverged`. CI đối chiếu với đúng hai commit này.
- Ghi chú: bảng ở §1–§2 mô tả tình trạng trước khi đồng bộ, giữ lại làm lịch sử.

