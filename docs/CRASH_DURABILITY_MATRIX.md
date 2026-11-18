# Ma trận crash / độ bền (chỉ đạo 003, issue #91)

Dữ liệu GIẢ. "Thật" = tiến trình thật bị `kill -9` / hai tiến trình thật; "mô phỏng" = hiện tượng được dựng lại bằng cơ chế thật của SQLite nhưng không làm hỏng phần cứng thật.
Chạy: `node --test tests/unit/sqlite-durability.test.js` (+ `tests/unit/fullbackup-snapshot.test.js` cho kịch bản 3, `tests/e2e/sqlite-default.cjs` cho kịch bản 5 trên Electron thật).

| # | Kịch bản | Cách kiểm | Test | Kết quả |
|---|---|---|---|---|
| 1 | Kill NGAY SAU commit SQLite, trước mọi phản hồi | Thật: tiến trình con `save()` trả true rồi tự `SIGKILL` | `U-DUR-01` | **Đạt** — mở lại thấy đúng một dòng đã lưu; lưu lại cùng bản không tăng revision, không nhân đôi dòng |
| 2 | Kill GIỮA chốt kỳ lương | Thật: vòng chốt kỳ liên tục (snapshot chốt + nhật ký + bảng trạng thái trong MỘT lần lưu), kill ở 6 thời điểm khác nhau | `U-DUR-02` | **Đạt** — mọi bản chốt `verify = ok`, nhật ký/trạng thái đủ cặp với bản chốt, kỳ đã chốt trước đó giống từng byte, kỳ đã báo SAVED còn |
| 3 | Kill giữa khôi phục từ gói Full Backup | Thật: `SIGKILL` ở 3 điểm (sau marker, trước/sau đổi tên) | `U-FBS-08` (PR #90) + `U-SNAP-05` (khôi phục từ bản chụp, 002) | **Đạt** |
| 4 | Đĩa đầy / không ghi được giữa lúc lưu | **Mô phỏng**: `SQLITE_FULL` THẬT của SQLite (`PRAGMA max_page_count`) — không làm đầy đĩa thật | `U-DUR-04` | **Đạt** — `save()` trả chuỗi lỗi (không ném), dữ liệu cũ nguyên vẹn (bộ nhớ, revision, đóng/mở lại), nhả chỗ rồi lưu lại được |
| 5 | Hai phiên cùng một thư mục dữ liệu | Thật: hai tiến trình (unit) + hai tiến trình Electron (E2E) | `U-DUR-05`, `sqlite-default.cjs` bước 8 | **Đạt** — phiên sau bị chặn với thông báo nêu PID, không ghi gì; Electron thứ hai tự thoát; khóa của phiên chết bị bỏ qua |
| 6a | Crash thường, KHÔNG đụng `-wal` | Thật: lưu v2 chỉ nằm trong `-wal`, `SIGKILL` | `U-DUR-06a` | **Đạt** — giao dịch còn (`synchronous = FULL`) |
| 6b | `-wal` mất/cắt cụt/hỏng, data.json ĐÃ xuất kịp | Thật (kill) + hỏng tệp | `U-DUR-06b` | **Đạt** — app KHÔNG mở âm thầm: báo xung đột nêu chênh lệch, không ghi đè |
| 6c | `-wal` mất/cắt cụt/hỏng, data.json CHƯA xuất kịp (≤ 3 s, mặc định) | Thật (kill) + hỏng tệp | `U-DUR-06c` (**3 test `todo`**) | **HỎNG – chờ chủ sở hữu quyết định A/C**: mất giao dịch ÂM THẦM (mở bình thường, thiếu giao dịch cuối, không báo). Chưa sửa mã. Phương án C đã đo (bên dưới) và mô phỏng (`U-DUR-06d`) |
| 6d | Như 6c nhưng với phương án C (MÔ PHỎNG: `wal_checkpoint(TRUNCATE)` sau mỗi lần lưu) | Mô phỏng bằng bọc `store.tx` trong tiến trình con; kill thật + hỏng tệp | `U-DUR-06d` | **Đạt (mô phỏng)** — `-wal` rỗng sau mỗi lần lưu nên xóa/cắt/hỏng `-wal` không mất giao dịch nào |

## Giải thích 6c
Một crash thường không làm mất giao dịch (6a). Mất chỉ xảy ra khi **tệp `-wal` bị mất/hỏng** (xóa tay, antivirus, hỏng ổ): các giao dịch chưa checkpoint biến mất cùng `rev`/`exported_sha` (nằm trong chính DB), nên app không có gì để so sánh, trừ khi `data.json` đã xuất (6b). Cửa sổ rủi ro = từ lần xuất `data.json` cuối (≤ 3 s) đến lúc mất tệp.

## Đo chi phí phương án C (`docs/v2.0.39/do-checkpoint-moi-lan-luu.cjs`, không sửa `main/`)
Dữ liệu giả 5.000 NV, 120 lần lưu/vòng, 5 vòng xen kẽ A/C (mỗi 10 lần có 1 lần sửa 50 dòng, còn lại sửa 1 dòng); Linux, ext4 trên đĩa ảo của máy phát triển:

| phương án | sửa 1 dòng p50 / p95 / max (ms) | sửa 50 dòng p50 / p95 / max (ms) | cỡ `-wal` cuối vòng |
|---|---|---|---|
| A: hiện tại (WAL tự checkpoint) | 130,1 / 193,3 / 1168,8 | 135,9 / 225,3 / 241,6 | 23.384 KB |
| C: `checkpoint(TRUNCATE)` mỗi lần lưu | 126,8 / 185,9 / 1258,0 | 128,8 / 205,9 / 237,8 | 0 KB |

Kết quả: ở máy này chi phí thêm **không đo được** (chênh p50 −3 ms, p95 −7 ms, trong nhiễu; lần chạy đầu: p50 0, p95 −10 ms). Thời gian lưu ~125–135 ms p50 chủ yếu là so sánh/tuần tự hóa, không phải ghi đĩa (mục tiêu < 150 ms vẫn chưa đạt như đã biết). `-wal` lúc nghỉ là 0 KB thay vì ~23 MB. **Giới hạn của phép đo:** đĩa ảo/ext4 có chi phí `fsync` thấp; trên ổ cơ (HDD), USB hoặc máy có antivirus quét tệp, một lượt `fsync` thêm của tệp chính mỗi lần lưu có thể đắt hơn nhiều — chưa đo được ở đây (cần chạy script trên máy Windows thật của người dùng).

## Chưa kiểm
- Windows thật (khóa tệp/`-wal` do antivirus, `taskkill`); CI Windows chạy các test này nhưng không phải máy dùng thật.
- Đĩa đầy THẬT (ENOSPC từ hệ điều hành) và lỗi ghi `data.json`/`atomicWrite` khi đĩa đầy (test 4 chỉ phủ ghi vào SQLite).
- Mất điện thật (chỉ có `kill -9`, không mô phỏng được việc ổ bỏ qua `fsync`).
- Kill ở giữa IPC thật của Electron (kịch bản 1 được kiểm ở tầng lưu trữ; E2E hiện có chỉ kill SAU khi nhận phản hồi).
