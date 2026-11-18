# MIGRATION_PLAN — Kế hoạch chuyển đổi dữ liệu

## 1. Các lần chuyển đổi đã có (tự động khi mở app)

| Từ → đến | Hàm | Nội dung | An toàn |
|---|---|---|---|
| 1.0 → 1.1 | `HRM.migrate` | Bảng Nhân sự phẳng → nhân viên + hợp đồng `HD-<mã>` + phụ lục lương + tài khoản + người phụ thuộc; bảng cũ giữ ở `nhansu_cu` | test `integration/flows` "Migration v1.0" |
| 1.1 → 1.1 | `HRM.migrate` | Biểu thuế dạng bậc trong `dm_tncn` → `dm_bacthue` | |
| ≤1.3 → **1.4 (schemaVersion 2)** | `INT.normalizeDataset` | Tiền "500.000" → "500000"; kỳ "2026-9"/"09/2026" → "2026-09"; ngày dd/mm/yyyy → ISO; CCCD 11 số / SĐT 9 số → bù 0; thêm `kyluong_lichsu`, `auditlog`. **Không đụng snapshot kỳ đã chốt** | test `core.test` normalizeDataset (idempotent), regression |

Mỗi lần mở app: `main.js` tạo `startup_*.json` (giữ 10). Khi dữ liệu có `schemaVersion` cũ, app tạo thêm `truoc-nang-cap_*.json` **trước** khi chuyển đổi (giữ 20, chỉ tạo khi nâng schema). Nếu chuyển đổi gây lỗi, khôi phục bản này tại *Công ty & Sao lưu → Các bản sao lưu*.

| 1.4.0 → **2.0-P1** (vẫn schemaVersion 2) | không cần chuyển đổi | Chỉ **thêm** trường: `auditlog[].nguoi`, `kyluong[].inputChecksum`, file `backups/*.sha256`. Trước khi chuyển đổi, `core/schema.validate` chặn file có cấu trúc nguy hiểm (chế độ chỉ xem). Dòng chấm công trùng khóa sẵn có **không tự gộp**; người dùng bấm *Gộp dòng chấm công trùng* sau khi xem *Kiểm tra dữ liệu* (tổng công không đổi) | I-14, U-SCH-01/02, E2E cấu trúc nguy hiểm |

### Giới hạn đã biết
Số tiền đã bị **hỏng bởi BUG-001** (bản 1.1–1.3, VD đơn giá 300.000 bị lưu thành "300") **không thể tự khôi phục** vì không còn thông tin gốc. `integrity.check` liệt kê mọi phụ lục có *Lương thỏa thuận / Lương cơ bản < 1.000đ* để người dùng nhập lại; cũng có thể đối chiếu với bản sao lưu cũ hơn hoặc kỳ đã chốt (snapshot giữ số đúng tại thời điểm chốt).

## 2. JSON → SQLite (Phase 2) — kế hoạch

> **Kết quả khảo sát (10/10/2026):** Electron 43.7.9 chạy Node 24.21.0, có sẵn `node:sqlite` (`DatabaseSync`) — đã chạy thử tạo bảng, ghi, đọc. Nhờ vậy **không cần module native** như better-sqlite3 (vốn phải build lại cho từng phiên bản Electron trên Windows) → bộ cài vẫn thuần JS. `node:sqlite` còn gắn nhãn *experimental* ở Node 24 → bọc sau tầng repository để có thể thay thế.

**Cập nhật 11/10/2026 (PR4):** đo cho thấy ở 5.000 NV, 120–260 ms của mỗi lần lưu nằm ở bước giao diện chuyển **toàn bộ** dữ liệu thành JSON (`PERFORMANCE_REPORT.md` §6). SQLite chỉ giúp được nếu app gửi **dòng thay đổi**. Vì vậy thêm điều kiện: (a) **mọi** đường ghi đi qua `core/repository` (kể cả nhập Excel, gộp chấm công, trợ lý thêm NV, xóa NV); (b) repository ghi nhận dòng thay đổi, và test chứng minh không có thay đổi nào bị bỏ sót (so toàn bộ dữ liệu JSON và SQLite sau mỗi kịch bản E2E). Bước 1 dùng `node:sqlite` thay `better-sqlite3`.

**Cập nhật 16/11/2026 — bước chuẩn bị "kho bóng" (chỉ để so sánh, app vẫn đọc và ghi JSON):**

`LuongHAK_Offline/tools/sqlite-shadow.js` ghi toàn bộ dữ liệu vào một file SQLite riêng bằng `node:sqlite`, đọc lại và so sánh. Nó nằm ngoài `build.files` nên không vào bộ cài; `main.js`, `main/*`, `app.js` không nạp nó (test `U-SQL-07`). Chạy trên một bản sao dữ liệu: `npm run sqlite:shadow -- <data.json> [đầu-ra.sqlite]`; file JSON chỉ được đọc.

Kết quả đo trên dữ liệu tổng hợp (`regressionDataset`), Linux:

| Phép đo | 300 NV | 5.000 NV |
|---|---|---|
| Số dòng / cỡ JSON | 4.151 dòng / 0,6 MB | 70.236 dòng / 9,5 MB |
| Ghi lần đầu vào SQLite (một giao dịch) | 16 ms | 239 ms (Node 22), 247 ms (Node 24 của Electron 45) |
| Đọc lại so với JSON | giống hệt từng ký tự | giống hệt từng ký tự |
| `PRAGMA integrity_check` | ok | ok |
| Tính lương hai nguồn, 3 kỳ | 874 lượt NV, 0 khác biệt | 14.566 lượt NV, 0 khác biệt |
| Cỡ file SQLite | 0,8 MB | 12,9 MB |

Điều rút ra:
1. `node:sqlite` chạy được trong Node của Electron 45 (Node 24.22, SQLite 3.53) và giữ nguyên dữ liệu, kể cả thứ tự bảng, thứ tự dòng, số 0 đầu của CCCD/SĐT, chuỗi rỗng, `null` và Unicode. Trên Node 22 nó còn in cảnh báo "experimental".
2. **Chỉ đổi nơi lưu thì chưa nhanh hơn.** Sửa một ô chấm công ở 5.000 NV: kho bóng chỉ phải ghi 1 dòng, nhưng để biết dòng nào đổi nó phải so cả 70.236 dòng, mất khoảng 133 ms; ghi lại cả file JSON 9,5 MB mất khoảng 96 ms. SQLite chỉ có lợi khi tầng repository **báo sẵn dòng nào đổi** — đúng điều kiện (b) ở trên. Từ 2.0.17 bốn đường ghi lớn đã đi qua repository, nhưng repository chưa ghi nhận danh sách dòng thay đổi.
3. Cách lưu của kho bóng là "mỗi dòng dữ liệu một dòng SQLite (cột JSON)", khóa theo vị trí dòng. Nó chưa phải lược đồ chuẩn hóa ở `DATABASE_SCHEMA.md` §2 (bước 2–3 bên dưới) và chưa thử trên Windows hay với dữ liệu thật.

Việc tiếp theo nếu muốn đi tiếp (mỗi việc cần chủ sở hữu duyệt riêng): cho repository ghi nhận dòng thay đổi và test "không bỏ sót thay đổi nào"; chạy kho bóng trên bản sao dữ liệu thật của công ty; rồi mới tới bước 2–6.

**Điều kiện bắt đầu:** bộ kiểm thử hồi quy xanh; có tầng repository (`src/database/repositories`) để giao diện/module không còn đọc `db.<bảng>` trực tiếp.

| Bước | Nội dung | Kiểm tra | Rollback |
|---|---|---|---|
| 1 | Thêm `better-sqlite3` (native, build cho Electron 43) vào tiến trình chính; renderer gọi qua IPC | E2E mở/đóng app | gỡ dependency |
| 2 | Tạo schema (DATABASE_SCHEMA §2) + bảng `system_settings.schema_version` + migrations đánh số `001_init.sql`… chạy trong transaction | unit test migration trên DB tạm | xóa file `.sqlite` |
| 3 | Sao lưu bắt buộc `truoc-sqlite_*.json`; đọc `data.json` → ghi SQLite trong **1 transaction**; sinh ULID cho dòng chưa có `_id`; tiền → INTEGER; kỳ chấm công 31 cột → dòng `attendance` theo ngày | Đếm số dòng từng bảng khớp; checksum kỳ đã chốt khớp | giữ nguyên `data.json`, không xóa |
| 4 | **Chạy song song**: engine tính lương từ JSON và từ SQLite cho mọi kỳ có dữ liệu; so sánh từng nhân viên | khác biệt = 0 (hoặc đã phân loại) | quay lại JSON (cờ `storage=json`) |
| 5 | Chuyển nguồn chính sang SQLite; `data.json` đổi tên `data.pre-sqlite.json` (giữ ≥ 2 phiên bản) | E2E đầy đủ + hồi quy | cờ cấu hình về JSON + khôi phục `data.pre-sqlite.json` |
| 6 | Sao lưu SQLite: `VACUUM INTO` (nhất quán khi đang mở), kiểm tra `PRAGMA integrity_check` khi mở app và trước khi sao lưu | test sao lưu/khôi phục | — |

## 3. Ánh xạ bảng

| JSON | SQLite |
|---|---|
| `congty` | organizations |
| `dm_phongban` | departments (+ `expense_account` = Tài khoản chi phí) |
| `dm_chucvu` | positions |
| `dm_luong` | salary_policies |
| `dm_phucap`, `dm_hotro`, `dm_tangca` | allowances (phân loại theo `kind`) |
| `dm_baohiem` | insurance_policies |
| `dm_tncn`, `dm_bacthue`, `dm_giamtru` | tax_policies, tax_brackets, tax_deductions |
| `nhanvien` / `canhan` / `nhanthan` / `thanhtoan` | employees / employee_profiles / dependents / (bank_accounts trong profile hoặc bảng riêng) |
| `hopdong` / `chitiethd` / `congtac` | employment_contracts / contract_amendments / employee_assignments |
| `chamcong` (31 cột) | attendance (1 dòng/ngày/loại công) |
| `nghiphep`, `nghiom` | leave_requests |
| `sanluong`, `bandam` | production_tickets + production_allocations |
| `psluong` / `ungluong` | salary_adjustments / advances |
| `kyluong`, `kyluong_lichsu` | payroll_periods + payroll_versions + payroll_results (+ snapshot JSON trong `input_snapshot`) |
| `auditlog` | audit_logs |


## 3. Cập nhật 18/11/2026 — quyết định hiện hành (thay thế các mục mâu thuẫn ở trên)

**Các quyết định dưới đây là nguồn đúng; bảng "bước" cũ ở mục 2 (có nhắc `better-sqlite3`, quay lui chỉ bằng cờ) chỉ còn giá trị lịch sử.**

- **Driver:** `node:sqlite` (`DatabaseSync`) có sẵn trong Node của Electron — đã chạy thử trên Electron 45.3.2 (Node 24.22.2, SQLite 3.53.4) ở máy phát triển Linux. Không dùng `better-sqlite3`. Cần xác nhận lại trên bộ cài Windows đóng gói (CHƯA làm).
- **Trạng thái:** SQLite CHƯA là nguồn vận hành. App vẫn đọc/ghi `data.json`. Đã có "kho ứng viên" + công cụ chuyển/đối chiếu (xem `main/sqlite-store.js`, `main/sqlite-migrate.js`, `docs/ACCEPTANCE_SQLITE_RELEASE.md`). `tools/sqlite-shadow.js` vẫn chỉ là công cụ so sánh (khóa theo vị trí dòng), không dùng cho vận hành.
- **Lược đồ v1 của kho ứng viên:** `records(tbl, id, pos, bkey, json, rev)` với id nội bộ ổn định (dùng `_id` nếu có, ngược lại băm nội dung + số lần xuất hiện; dòng trùng y hệt vẫn có id riêng), `pos` giữ thứ tự gốc, `json` là payload nguyên vẹn (kể cả snapshot kỳ chốt, không chuẩn hóa lại nên checksum cũ không đổi), `bkey` là khóa nghiệp vụ chuẩn hóa theo `core/importer.js` KEYS — **không UNIQUE** (trùng khóa được báo trong báo cáo, không tự gộp); giá trị cấp ngoài cùng không phải bảng nằm ở `top_value`; `applied_requests` (idempotency), `audit`, `migration_journal`, `schema_migrations`. Chưa chuẩn hóa thành bảng/cột/khóa ngoại theo từng nghiệp vụ (xem lộ trình dưới).
- **Chặn số ngoài miền an toàn:** số nguyên vượt ±2^53−1 làm migration dừng, không chuyển âm thầm.
- **Quy tắc quay lui:** trước khi có ghi mới vào SQLite → bỏ ứng viên, tiếp tục JSON nguyên bản (đã kiểm SHA-256). Sau khi có ghi mới → KHÔNG chỉ bật cờ về JSON; dùng `exportJson` (đã có, đối chiếu từng ký tự khi chưa có ghi mới) để tạo bản JSON chứa đủ giao dịch mới, hoặc khôi phục một bản nhất quán và thông báo phạm vi quay lui. Bản app cũ không mở schema mới (kho có `user_version` mới hơn app → từ chối).
- **[Lịch sử — xem `docs/ACCEPTANCE_SQLITE_RELEASE.md` §4 cho trạng thái hiện hành] Chưa làm (lộ trình còn lại):** (1) kiểm kê mọi đường ghi và chuyển sang delta qua IPC có kiểm quyền; (2) chuẩn hóa lược đồ theo nghiệp vụ, khóa ngoại/CHECK; (3) cutover có journal và phục hồi khi khởi động dở dang; (4) Full Backup bằng SQLite Backup API/`VACUUM INTO`, restore staging; (5) kho năm; (6) thử Setup Windows cài mới/nâng cấp từ JSON.

**[Lịch sử — đã lỗi thời từ v2.0.29] Cập nhật cutover có cờ (18/11/2026):** `main/sqlite-storage.js` từng bật bằng `HAK_STORAGE=sqlite`, mặc định TẮT. HIỆN HÀNH: SQLite là nguồn chính MẶC ĐỊNH từ v2.0.29; `HAK_STORAGE=json` để quay lui. Xem `docs/ACCEPTANCE_SQLITE_RELEASE.md` mục 5 cho thiết kế, kết quả kiểm chứng và số đo (chậm hơn JSON ~1,5 lần vì vẫn tuần tự hóa cả tài liệu ở giao diện).

**Cập nhật v2.0.30 (18/11/2026) — thay thế các câu cũ về quay lui:** (1) KHÔNG dùng "file mới hơn là bản đầy đủ hơn": ngày giờ sửa file không chứng minh tính đầy đủ; khi `data.json` khác SQLite, app nêu chênh lệch theo bảng/số dòng và chờ người dùng chọn. (2) Gián đoạn giữa thao tác kho năm được nhận diện bằng marker `pending_op` (phương thức, SHA-256 đầu vào, revision) trong `meta`; khi mở lại: `data.json` còn là trạng thái trước thao tác hoặc đã khớp SQLite → bỏ marker, giữ SQLite; `data.json` đã là kết quả worker (ghi nguyên tử, đã kiểm) → nhận lại bằng delta và ghi `migration_journal`. (3) Sao lưu chỉ từ bản xuất đã khớp revision (`exportReady`), bản vừa tạo được đọc lại và so với dữ liệu đang giữ. (4) Khóa phiên ghi `data.sqlite.lock`. (5) `VACUUM INTO` đã thử ở Node 22/24; chưa tích hợp vào gói sao lưu.
