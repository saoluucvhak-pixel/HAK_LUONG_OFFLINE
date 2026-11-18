# Nghiệm thu SQLite — trạng thái 18/11/2026

> **Cập nhật phát hành v2.0.29:** SQLite là nguồn dữ liệu chính MẶC ĐỊNH (theo yêu cầu của chủ sở hữu). Mục 5 và các bảng bên dưới mô tả trạng thái trước khi đổi mặc định; xem `docs/releases/v2.0.29.md` cho hướng dẫn nâng cấp/quay lui. Kết luận phát hành: **chỉ đủ thử nghiệm có kiểm soát** (chưa thử Setup Windows, chưa thử máy in, chưa dùng SQLite Backup API).

**Kết luận: Chưa hoàn thành đợt SQLite — không phát hành "bản SQLite".** Đã làm xong phần nền (giai đoạn 0 và một phần giai đoạn 2). Chưa có cutover, nên app vẫn lưu `data.json`. Không dùng đợt này để tuyên bố đã chuyển sang SQLite.

## 1. Trạng thái theo giai đoạn (prompt tổng thể, mục L)

| GĐ | Nội dung | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|
| 0 | Fetch, kiểm kê, F01/F02 | **Xong** | v2.0.28 (PR #69, commit `e7f1a96`); `docs/NGHIEM_THU_V2_0_28.md` |
| 1 | Repository/delta, ID ổn định, read model | **Làm một phần** | Đã kiểm kê: `data.json` chỉ ghi qua `storage.save` (`docs/WRITE_PATHS_INVENTORY.md`); đã có change set theo dòng + ghi delta vào SQLite, kiểm chứng bằng bản sao bóng chạy cả bộ E2E (0 sai lệch). Chưa có delta từ giao diện qua IPC; chưa có read model/ID ổn định lưu trong dữ liệu |
| 2 | SQLite/schema/migrations, đối chiếu trên dữ liệu giả | **Làm một phần** | `main/sqlite-store.js`, `main/sqlite-migrate.js`, 9 test `sqlite-migrate.test.js`. Lược đồ v1 là "dòng nguyên vẹn + khóa nghiệp vụ", chưa chuẩn hóa theo nghiệp vụ/khóa ngoại |
| 3 | Cutover, backup/restore SQLite, kho năm, quay lui | **Làm một phần, sau cờ, MẶC ĐỊNH TẮT** | `main/sqlite-storage.js` (bật bằng `HAK_STORAGE=sqlite`): SQLite là nguồn chính, `data.json` là bản xuất dẫn xuất; chuyển lần đầu có sao lưu + đối chiếu; xung đột `data.json` bị sửa ngoài app thì báo lỗi, không đoán. Sao lưu, Full Backup, kho năm dùng `data.json` xuất ra; chưa dùng SQLite Backup API/`VACUUM INTO`. Chưa thử Setup Windows. |
| 4 | Đồng bộ UI/luồng/bộ lọc/báo cáo | **Chưa làm** (ngoài F01/F02/Cấp phát đã xong ở v2.0.28) | Không đổi menu/bố cục trong đợt này vì chưa có lỗi thao tác được chứng minh |
| 5 | E2E toàn bộ, thử Setup cài mới/nâng cấp | **Chưa làm** | Môi trường này không cài được Setup Windows |
| 6 | Gộp main, phát hành | **Không áp dụng** | Chưa có gì để phát hành là bản SQLite |

## 2. Đã kiểm chứng (Linux, máy phát triển, dữ liệu giả)

- `node:sqlite` chạy trong Electron 45.3.2 (Node 24.22.2, SQLite 3.53.4) bằng `ELECTRON_RUN_AS_NODE`. **Chưa kiểm trong app/Setup Windows đóng gói.**
- Kết nối: `foreign_keys=1`, `journal_mode=wal`, `synchronous=FULL(2)`, `busy_timeout=5000` — đọc lại sau khi đặt, từ chối mở nếu PRAGMA không có hiệu lực (U-SQL-07). Kho có `user_version` mới hơn app bị từ chối.
- Chuyển trên bản sao: nguồn chỉ đọc (SHA-256 trước/sau bằng nhau); `integrity_check` = ok; `foreign_key_check` rỗng; dựng lại **giống nguồn từng ký tự** (thứ tự khóa, thứ tự dòng, số 0 đầu `0005`, Unicode/emoji, null, rỗng, âm, số lẻ) (U-SQL-01).
- Chạy lại không nhân bản; khác nguồn thì từ chối, không ghi đè (U-SQL-02). Dòng trùng y hệt và `_id` trùng không bị gộp, trùng khóa nghiệp vụ được báo (U-SQL-03). ID không dựa chỉ số mảng (U-SQL-04). Số nguyên ngoài miền an toàn bị chặn (U-SQL-05). Lỗi giữa chừng không để lại ứng viên dở, chạy lại thành công (U-SQL-06).
- Ghi một dòng: giao dịch gồm dữ liệu + revision + audit cùng commit; `requestId` chống bấm đúp/retry; `expectedRev` lỗi thời bị từ chối; audit lỗi thì hoàn tác cả dữ liệu (U-SQL-08).
- Cùng engine: `tinhBangLuong` từ JSON nguồn và từ dữ liệu xuất lại từ SQLite **bằng nhau** ở từng kỳ có chấm công của fixture (U-SQL-09). Vì xuất ngược giống nguồn từng ký tự nên phép thử này chứng minh chiều bảo toàn, chưa phải so sánh hai đường tính độc lập trên kho SQLite chuẩn hóa.

## 3. Đo hiệu năng (Linux 4 vCPU Intel Xeon 2.1 GHz, Node 22.23.4, dữ liệu tổng hợp 12 kỳ chấm công)

Ngân sách đặt trước khi đo: ghi một dòng < 5 ms ở p95; chuyển 5.000 NV < 30 s; không hạ tiêu chí hồi quy hiện có.

| Phép đo | 300 NV (4.600 dòng) | 5.000 NV (76.666 dòng) |
|---|---|---|
| JSON | 1,2 MB | 19,9 MB |
| SQLite ứng viên | 2,3 MB | 37,1 MB |
| Chuyển + kiểm (một lần) | 215 ms | 3.566 ms |
| Ghi MỘT dòng bằng SQLite (p50 / p95) | 0,4 / 0,6 ms | 0,4 / 0,7 ms |
| Ghi lại cả file JSON hiện nay (p50 / p95) | 11,2 / 20,9 ms | 223,1 / 281,6 ms |
| Lọc theo tiền tố khóa nghiệp vụ (p50 / p95) | 0,6 / 0,7 ms | 14,5 / 16,5 ms |
| RSS tiến trình đo | 100 MB | 604 MB |

Kế hoạch truy vấn khóa nghiệp vụ dùng chỉ mục `records_bkey`. Chưa đo 10.000 NV, chưa đo trên Windows/Electron đóng gói, chưa đo thời gian mở app và RAM của app thật.

## 4. Chưa kiểm chứng / còn thiếu

1. Giao diện vẫn gửi cả tài liệu mỗi lần lưu; SQLite chỉ nhận delta ở chế độ bóng (mặc định TẮT, `HAK_SQLITE_SHADOW`). Chưa có thao tác nào ghi trực tiếp SQLite làm nguồn chính.
2. Chưa có cutover (con trỏ nguồn hoạt động, journal phục hồi khi khởi động dở dang, chặn hai phiên ghi).
3. Chưa có Full Backup/restore bằng SQLite Backup API hoặc `VACUUM INTO`; chưa có kho năm trên SQLite.
4. Chưa chuẩn hóa lược đồ theo nghiệp vụ (bảng phiếu cân/dòng phân bổ, cấp phát, thanh toán…), chưa có khóa ngoại/CHECK nghiệp vụ.
5. Chưa thử kill/crash ở mốc sau commit trước phản hồi, giữa import nhiều bảng, chốt, restore; chưa thử đĩa đầy, DB bị lock bởi tiến trình khác.
6. Chưa thử Setup cài mới và nâng cấp từ JSON; chưa thử máy in.
7. Tài liệu `DATABASE_SCHEMA.md` chưa được viết lại theo lược đồ thực tế; `DATA_FLOW_AND_RECONCILIATION.md`, `UI_WORKFLOW_GUIDE.md` chưa lập.

Không nên cutover khi các mục 1–3 và 5–6 chưa đạt.


## 5. Cutover sớm có cờ (HAK_STORAGE=sqlite) — kết quả

Theo lựa chọn của chủ sở hữu: giao diện vẫn gửi cả tài liệu, tiến trình chính tính delta và ghi SQLite làm nguồn chính. **Mặc định vẫn là `data.json`**; chưa đổi mặc định vì chưa thử Setup Windows.

Thiết kế: `save()` kiểm hợp lệ (phân tích một lần) → bảo vệ cũ (bản đầu ngày/năm/giảm đột ngột chụp TRẠNG THÁI TRƯỚC thay đổi) → delta vào SQLite trong một giao dịch `synchronous=FULL` (điểm bền vững) → `data.json` xuất lại nguyên tử ở nhịp trễ 3 giây, khi đóng app và NGAY TRƯỚC mọi hàm sao lưu đọc nó. Kho năm (tiến trình phụ ghi `data.json` bằng kho JSON) được đồng bộ trước và nhận lại sau (`syncJson`/`adoptJson`).

| Kiểm chứng (Linux, dữ liệu giả) | Kết quả |
|---|---|
| Unit `sqlite-storage.test.js` (11): lưu/đọc lại, khởi động lại, kill trước khi xuất `data.json`, chuyển lần đầu có sao lưu, chuyển hỏng giữ nguyên `data.json`, xung đột bị sửa ngoài app, bảo vệ cũ, sao lưu đọc dữ liệu mới nhất, `sig`, schema mới hơn app, tiến trình phụ, lỗi ghi SQLite giữa chừng | 11/11 |
| E2E với cờ bật (xuất `data.json` đồng bộ để bộ E2E đọc được): `run-e2e` 297/297, `capphat` 42/42, F01 10/10, kho năm 13/13, khôi phục hồ sơ mới 3/3, nâng cấp từ dữ liệu cũ đạt | Đạt |
| `hr-save-close.cjs` với cờ bật | **Không áp dụng**: ca này giả lập lỗi đĩa bằng cách làm `fs.renameSync` ném lỗi, đường mà SQLite không đi qua; ở chế độ SQLite thay bằng unit U-SS-11. Chạy ở chế độ mặc định vẫn đạt |

**Hiệu năng (main process, `save()` một lần sửa nhỏ, 4 vCPU Xeon 2,1 GHz, Node 22, dữ liệu tổng hợp):**

| | JSON | SQLite chính (xuất trễ) |
|---|---|---|
| 300 NV, p50 / p95 | 12 / 77 ms | 18 / 114 ms |
| 5.000 NV, p50 / p95 | 244 / 1.317 ms | 377 / 1.727 ms |
| 5.000 NV, lần lưu đầu | 482 ms | 2.538 ms |

**Kết luận về hiệu năng: cách này CHẬM HƠN ghi `data.json`** (khoảng 1,5 lần ở p50 5.000 NV), vì phần tốn kém là tuần tự hóa và so sánh cả tài liệu, không phải việc ghi đĩa; ghi SQLite chỉ vài phần nghìn giây. Lợi ích có được: ghi bền vững theo giao dịch thay vì viết lại cả file, đọc lại không phụ thuộc kích thước file, nền cho bước tiếp theo. Lợi ích về tốc độ chỉ đến khi giao diện gửi delta (cần lớp theo dõi thay đổi theo bảng trong giao diện — chưa làm). Không nên đổi mặc định vì lý do hiệu năng.

**Chưa làm cho cutover:** SQLite Backup API/`VACUUM INTO` cho Full Backup; kho năm trên SQLite; kiểm kill/crash ở mốc sau commit trước phản hồi bằng kill tiến trình thật; thử Setup Windows (cài mới và nâng cấp từ JSON); chặn hai phiên ghi vào cùng hồ sơ; hướng dẫn người dùng và quy trình quay lui trên Setup.


## 6. Cập nhật v2.0.30 (sau nghiệm thu v2.0.29)

**Kết luận: Chỉ đủ thử nghiệm có kiểm soát.** Hai lỗi nghiêm trọng của v2.0.29 đã sửa và có test; chưa thử Setup Windows thật, chưa hoàn thành delta từ giao diện và chuẩn hóa lược đồ.

| Hạng mục (prompt sau v2.0.29) | Trạng thái | Bằng chứng |
|---|---|---|
| **A01** kho năm ghi lùi dữ liệu | **Đã sửa** | Tái hiện trên v2.0.29: `docs/v2.0.30/a01-a02-tai-hien-truoc-khi-sua-v2.0.29.txt` (kịch bản `tai-hien-a01-a02.cjs`). Sửa: `main/year-job.js`, `main/sqlite-storage.js` (marker, `snapshotExported`, `adoptJson({expectRev})`, phục hồi theo marker). Test: `tests/unit/year-job.test.js` (9: sync lỗi, preview/table không đổi dữ liệu và revision, worker chỉ-đọc ghi bậy, archive thật, worker lỗi/ngoại lệ, adopt bị từ chối/đổi giữa chừng, crash theo marker, xung đột) với worker kho năm thật |
| **A02** sao lưu thành công giả | **Đã sửa** | Tái hiện cùng tệp trên. Sửa: `backupWrap/readWrap/mirrorWrap`, `verifyBackup`, bản bảo vệ trong `save()`. Test: `tests/unit/sqlite-backup-integrity.test.js` (EACCES, ENOSPC, hết lỗi thì đúng revision, bản bảo vệ chặn lưu, bản không khớp bị hủy). Chưa thử: sao lưu bị hủy giữa chừng (Full Backup `fb-cancel`), mirror mất kết nối thiết bị thật |
| Full Backup ZIP nhất quán | **Đánh giá, chưa đổi** | Lấy `storage.load().text` = bản đang giữ trong bộ nhớ (cùng revision SQLite); các lệnh ghi bị chặn trong lúc chạy (`fbJob`). Chưa có bằng chứng lỗi stale JSON ở đường này; chưa có gói chứa snapshot SQLite |
| `VACUUM INTO`/Backup API | **Đánh giá** | `VACUUM INTO` chạy được ở Node 22 và Node 24 (Electron 45), bản chụp nhất quán gồm cả WAL. Chưa tích hợp: các bản sao lưu/khôi phục hiện đọc `.json` |
| Khóa phiên ghi | **Đã làm** | `data.sqlite.lock` (PID + thời điểm khởi động máy), test U-SS-13; Electron đã chặn mở hai bản app |
| Hướng dẫn "file mới hơn đầy đủ hơn" | **Đã bỏ** | thông báo xung đột nêu chênh lệch bảng/dòng, không dùng ngày giờ (U-A01-09) |
| Delta từ giao diện, read model, phân trang | **Chưa làm** | giao diện vẫn gửi cả tài liệu |
| Khóa ngoại/CHECK, tách phiếu gốc/phân bổ, cấp phát/điều chỉnh | **Chưa làm** | lược đồ v1 lưu dòng nguyên vẹn + khóa nghiệp vụ |
| Menu/bố cục, ảnh 1366×768 và 1920×1080 | **Chưa làm** | chưa có lỗi thao tác mới được chứng minh; ảnh sáng/tối do job `workspace-visual` của CI |
| Thử Setup Windows (cài mới, nâng cấp, gỡ cài đặt, nút X, shortcut) | **Chưa làm** | môi trường không cài được Setup; CI chạy trên runner và win-unpacked |
| Đo hiệu năng | **Đã đo lại** | 5.000 NV, ghi một lần sửa nhỏ: SQLite p50 378 / p95 2.494 ms; JSON p50 241 / p95 1.280 ms. Không có tăng tốc; chưa đo 10.000 NV và Electron đóng gói |

Điều kiện còn thiếu để xác nhận bàn giao chính thức: thử Setup Windows (cài mới + nâng cấp từ JSON có kỳ chốt/chứng từ/kho năm), delta từ giao diện hoặc chấp nhận chi phí hiện tại, chuẩn hóa lược đồ, gói sao lưu có snapshot SQLite và thử restore sang hồ sơ mới trong cùng ca.
