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
| 6c | `-wal` mất/cắt cụt/hỏng, data.json CHƯA xuất kịp (≤ 3 s, mặc định) | Thật (kill) + hỏng tệp | `U-DUR-06c` (đánh dấu `todo`) | **HỎNG — mất dữ liệu âm thầm**: mở bình thường, thiếu giao dịch cuối, không báo. Đã báo CEO ở issue #91, **chưa sửa, chờ quyết định** (A chấp nhận+tài liệu, B tệp phụ rev, C checkpoint sau mỗi lần lưu) |

## Giải thích 6c
Một crash thường không làm mất giao dịch (6a). Mất chỉ xảy ra khi **tệp `-wal` bị mất/hỏng** (xóa tay, antivirus, hỏng ổ): các giao dịch chưa checkpoint biến mất cùng `rev`/`exported_sha` (nằm trong chính DB), nên app không có gì để so sánh, trừ khi `data.json` đã xuất (6b). Cửa sổ rủi ro = từ lần xuất `data.json` cuối (≤ 3 s) đến lúc mất tệp.

## Chưa kiểm
- Windows thật (khóa tệp/`-wal` do antivirus, `taskkill`); CI Windows chạy các test này nhưng không phải máy dùng thật.
- Đĩa đầy THẬT (ENOSPC từ hệ điều hành) và lỗi ghi `data.json`/`atomicWrite` khi đĩa đầy (test 4 chỉ phủ ghi vào SQLite).
- Mất điện thật (chỉ có `kill -9`, không mô phỏng được việc ổ bỏ qua `fsync`).
- Kill ở giữa IPC thật của Electron (kịch bản 1 được kiểm ở tầng lưu trữ; E2E hiện có chỉ kill SAU khi nhận phản hồi).
