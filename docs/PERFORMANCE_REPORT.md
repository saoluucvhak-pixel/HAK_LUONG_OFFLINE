# PERFORMANCE_REPORT — LUONG_HAK 2.0 (PR2 hiệu năng, 2.0.0-alpha.5)

- **Máy đo:** container Linux 4 vCPU, Node 22.22. Bản app thật chạy Electron 43 / Node 24.21.
- **Dữ liệu:** `regressionDataset(N)` (tests/fixtures) gồm N nhân viên, mỗi người 1 hợp đồng, 1–2 phụ lục, 0–3 nhân thân; chấm công / sản lượng / thưởng / tạm ứng của 3 kỳ.
- **Cách đo:** `node tests/perf/bench.js`. Số ms là 1 lần chạy, dao động ±20%.
- **So với bản cũ:** `HR_IMPL=tests/regression/baseline_2.0.0-alpha.4/hr.js node tests/perf/bench.js`.
- **Windows thật:** chưa đo.

## 1. Nguyên nhân (PERF-01)

`hr.js`: `staffForPayroll` và `hienHanh` gọi `rowsOf(db, bảng, ma)`. Hàm này **quét toàn bảng** (hợp đồng, phụ lục, nhân thân, tài khoản, cá nhân…) cho **từng** nhân viên, nên độ phức tạp là O(N × số dòng) ≈ O(N²).

Ở 5.000 NV, dựng danh sách lương mất ~1,2 giây. Danh sách Nhân sự (gõ ô tìm kiếm là vẽ lại) mất ~0,55 giây. Báo cáo nhân sự mất ~2 giây.

## 2. Thay đổi

- **`buildIndex(db)`:** dựng chỉ mục `Map` theo Mã NV **1 lần cho mỗi lượt tính**, chỉ cho các bảng được dùng tới. Danh mục tham chiếu (phòng ban, chức vụ) cũng được đánh chỉ mục.
  - Giữ **đúng thứ tự dòng** của bảng gốc, nên `latestBy()` vẫn chọn cùng một dòng khi trùng ngày hiệu lực.
  - Dùng `Map` nên so khớp **đúng kiểu** như `===`: Mã NV kiểu số `123` ≠ `"123"`. Mã lạ như `__proto__` cũng an toàn.
- Nơi dùng chỉ mục:
  - `staffForPayroll`;
  - các báo cáo nhân sự trong `reports()`;
  - danh sách *Nhân sự* (`app.js`).
- `hienHanh(db, ma, asOf, ix)`: tham số `ix` không bắt buộc. Nếu không truyền, hàm chạy như cũ.
- **Không có bộ nhớ đệm giữa các lần gọi**: chỉ mục dựng mới mỗi lượt, nên không bao giờ dùng dữ liệu cũ. Không bỏ kiểm tra nào. Engine tính lương **không đổi**.

## 3. Kết quả (ms)

| Số NV | Dòng chấm công (3 kỳ) | Dữ liệu (MB) | Dựng DS lương: cũ → **mới** | DS Nhân sự: cũ → **mới** | Báo cáo NS: cũ → **mới** | Tính lương 1 kỳ (engine, không đổi) |
|---|---|---|---|---|---|---|
| 100 | 557 | 0,19 | 2 → **2** | 1 → **1** | 4 → **3** | 7–9 |
| 500 | 2.781 | 0,9 | 8 → **3** | 5 → **1** | 20 → **6** | 14–16 |
| 1.000 | 5.549 | 1,8 | 41 → **5** | 23 → **3** | 69 → **9** | 23–24 |
| 5.000 | 27.602 | 9,1 | 1.175 → **22** | 550 → **12** | 1.952 → **54** | 90–131 |

**Mục tiêu PR2:** dựng danh sách lương < 200 ms ở 5.000 NV. **Đạt (22 ms).** R-PERF-03 chạy trong `npm test` để giữ ngưỡng này.

Các thao tác khác ở 5.000 NV (chưa tối ưu trong PR này):

| Thao tác | ms | Ghi chú |
|---|---|---|
| Kiểm tra toàn vẹn | ~360 | Tuyến tính; chỉ chạy khi mở màn *Kiểm tra dữ liệu* |
| Nhập lại chấm công 1 kỳ (9.184 dòng, lập kế hoạch) | ~330 | Tuyến tính |
| **Lưu dữ liệu** (ghi nguyên tử + SHA-256 đọc lại) | ~250 | RISK-01: ghi lại cả file JSON 9 MB mỗi lần lưu → PR4 (SQLite) |
| Sao lưu | ~210 | |
| Đọc file khi mở app | ~77 | |

## 4. Bảo đảm kết quả không đổi

| Test | Kiểm tra |
|---|---|
| `tests/regression/perf-index.test.js` R-PERF-01 | `staffForPayroll` mới = bản alpha.4 (lưu nguyên ở `baseline_2.0.0-alpha.4/hr.js`) cho 4 kỳ, 80 NV + trường hợp biên (trùng ngày hiệu lực, Mã NV kiểu số, `__proto__`); **bảng lương giống hệt** |
| R-PERF-02 | `hienHanh` có / không chỉ mục = bản alpha.4 cho mọi NV ở 3 ngày; 5 báo cáo nhân sự giống hệt |
| R-PERF-03 | 5.000 NV < 200 ms |
| Kiểm tra lại chính test (mutation) | Cố ý đổi chỉ mục sang khóa chuỗi → R-PERF-01 và R-PERF-02 **thất bại**, tức là test bắt được sai khác |
| Hồi quy v1.3.0 + toàn bộ test | 104/104; E2E 42/42 |

## 5. Rollback

Chỉ đổi `hr.js` (thêm chỉ mục) và 1 dòng `app.js`. Không đổi dữ liệu, không đổi engine. Quay lại alpha.4 bằng cách cài lại bản cũ.

## 6. PR4 (2.0.0-alpha.7) — lưu dữ liệu (PERF-02)

**Đo chi tiết 1 lần lưu ở 5.000 NV (file 9,1 MB), bản alpha.6:**

| Bước | ms | Ghi chú |
|---|---|---|
| Giao diện: `JSON.stringify` toàn bộ dữ liệu | 120–260 | Ở tiến trình giao diện, trước khi gửi IPC |
| Tiến trình chính: `JSON.parse` kiểm tra hợp lệ | ~59 | Bắt buộc: không ghi đè file tốt bằng dữ liệu hỏng |
| Ghi file tạm + fsync + đổi tên + fsync thư mục | ~50–90 | Bắt buộc: chống mất điện |
| **Đọc lại + 2 × SHA-256 (chuỗi UTF-8)** | **115–231** | Kiểm tra đĩa đã ghi đúng |

**Sửa:** mã hóa dữ liệu 1 lần (`Buffer`), ghi đúng bộ đệm đó, đọc lại và **so sánh từng byte** (`Buffer.equals`).
- Mức kiểm tra **chặt hơn hoặc bằng** so SHA-256: hai bên phải giống nhau đến từng byte.
- Các kiểm tra khác giữ nguyên: JSON hợp lệ, file tạm + fsync + đổi tên nguyên tử, sao lưu đầu ngày, sao lưu khi dữ liệu giảm > 50%.

| Lưu (tiến trình chính), trung vị 5 lần | alpha.6 | alpha.7 |
|---|---|---|
| 1.000 NV | 50 ms | **24 ms** |
| 5.000 NV | 243 ms | **110 ms** |

Test:
- U-STO-14 (đọc lại thiếu byte) vẫn bắt được lỗi.
- U-STO-17 (mới): đọc lại sai đúng **1 bit**, cùng cỡ file → không báo thành công; tiếng Việt nhiều byte ghi / đọc đúng.

**Vì sao chưa chuyển sang SQLite ở PR này:**
- App vẫn gửi **toàn bộ** dữ liệu mỗi lần lưu, nên bước `JSON.stringify` ở giao diện (120–260 ms) không giảm được.
- Muốn SQLite thực sự nhanh hơn thì phải chỉ gửi **các dòng thay đổi**. Việc đó đòi hỏi **mọi** thao tác ghi đều đi qua repository (còn ngoại lệ: nhập Excel, gộp chấm công, trợ lý thêm NV, xóa NV… — U-REPO-08).
- Nếu sót một chỗ ghi thì dòng thay đổi không được lưu, tức là **mất dữ liệu**. Vì vậy cần gom hết các đường ghi trước (`MIGRATION_PLAN.md` §2).

## 7. PR5 (2.0.0-alpha.8) — giao diện bảng lớn (PERF-03)

**Đo trên Electron thật** (`xvfb-run -a node tests/perf/ui-bench.js`): mở lưới *Chấm công* kỳ 9/2026, rồi gõ "NV00" vào ô tìm kiếm.

| | alpha.7, 1.000 NV | alpha.8, 1.000 NV | alpha.8, 5.000 NV |
|---|---|---|---|
| Dòng / ô nhập được vẽ | 1.856 / 61.248 | 100 / 3.300 | 100 / 3.300 |
| Mở lưới | **5,6–6,9 s** | **0,28–0,38 s** | 0,28–0,35 s |
| Gõ 4 phím | **19,3 s** (vẽ lại cả lưới sau mỗi phím) | 0,15 s | 0,11 s |
| Từ lúc gõ tới khi hiện kết quả lọc | > 19 s | 0,41 s | 0,55 s |

Ở alpha.7, với 5.000 NV, lưới không mở xong trong 30 giây.

**Nguyên nhân:**
- Lưới vẽ **tất cả** dòng của kỳ, mỗi dòng 34 ô nhập.
- Mỗi phím gõ trong ô tìm kiếm vẽ lại cả lưới.
- Khi lọc, tên nhân viên được tra bằng cách dò cả danh sách NV cho **từng** dòng.

**Sửa:**
- Chia trang: 50 / 100 / 200 / 500 dòng, mặc định 100, cỡ trang được nhớ.
- Tìm kiếm chỉ chạy khi ngừng gõ 250 ms.
- Tra tên bằng bảng tra dựng 1 lần cho mỗi lượt vẽ.
- Dán nhiều dòng từ Excel vẫn tiếp tục đúng thứ tự sang trang sau. Thêm dòng thì tự sang trang cuối.
- Áp dụng cho lưới nhập liệu và danh sách *Nhân sự*.

## 8. Việc tiếp theo

- Gom các đường ghi còn lại vào repository + theo dõi dòng thay đổi → SQLite ghi theo dòng (mục tiêu lưu < 50 ms ở 5.000 NV). Cần chủ sở hữu duyệt (`MIGRATION_PLAN.md` §2).
- **Cần chủ sở hữu duyệt ngưỡng:** thời gian lưu chấp nhận được và cỡ dữ liệu thực tế (số NV, số năm lưu).


## Đo theo quy mô — chuỗi ghi của tiến trình chính, v2.0.33 (18/11/2026)

Tái lập: `node docs/v2.0.34/perf-scale.cjs` (kết quả thô: `docs/v2.0.34/do-quy-mo.txt`). Linux 4 vCPU, Node 22, dữ liệu GIẢ (12 kỳ chấm công), 25 lần sửa 1 ô, bỏ 3 lần đầu; mỗi quy mô một tiến trình riêng. Chuỗi ghi = phân tích 1 lần → `write-policy.check` → `years.checkWrite` → `storage.save` (SQLite). **Chưa đo trên Electron/Windows; chưa tính IPC.**

| NV | Tài liệu | Lưu lần đầu | Tải nguội | Chuỗi ghi main p50 / p95 | Giao diện `stringify` p50 | RSS đỉnh (main, một tiến trình) |
|---|---|---|---|---|---|---|
| 300 | 0,5 MB | 91 ms | 19 ms | 15 / 17 ms | 3 ms | 142 MB |
| 5.000 | 9,1 MB | 1.299 ms | 372 ms | 272 / 378 ms | 67 ms | 872 MB |
| 10.000 | 18,2 MB | 2.827 ms | 755 ms | 548 / 666 ms | 144 ms | 1.644 MB |

Nhận định (trung thực):
- **Mục tiêu "lưu < 150 ms ở 5.000 NV" CHƯA đạt** (272/378 ms chỉ riêng tiến trình chính; giao diện còn thêm ~67 ms dựng văn bản + truyền IPC). 300 NV: đạt (15 ms).
- **Bộ nhớ là rủi ro riêng:** ở 10.000 NV, riêng tiến trình chính đạt ~1,6 GB RSS (tài liệu được giữ nhiều bản: bản đang lưu, bản đã phân tích, bộ nhớ đệm so dòng, kho năm, policy). Giao diện còn giữ thêm một bản. Cần giai đoạn 2 (làm việc theo phần đổi) và giảm số bản sao trước khi cam kết 10.000 NV.
- Thời gian tăng gần tuyến tính theo kích thước tài liệu (5.000→10.000 NV: ×2,0) nên không có điểm gãy bất ngờ trong dải đo.
- `data.sqlite-wal` bằng cỡ cơ sở dữ liệu sau lần lưu đầu (23/46 MB): bình thường với WAL, được checkpoint khi đóng.
- Chưa đo: nhiều năm/chứng từ, nhiều bảng lớn đồng thời, RAM của giao diện, Windows.
