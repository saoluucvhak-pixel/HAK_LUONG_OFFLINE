# Đo thử phương án C — `checkpoint(TRUNCATE)` sau mỗi lần lưu (Q3, 24/11/2026)

Chủ chọn "đo thử C" cho test TODO `U-DUR-06c` (mất giao dịch cuối khi `-wal` hỏng trước khi `data.json` kịp xuất). **Chỉ ĐO — không đổi sản phẩm.** Công cụ: `tests/perf/wal-checkpoint-bench.js` (`node tests/perf/wal-checkpoint-bench.js [số lần lặp]`).

## Cách đo
Dữ liệu giả `regressionDataset(N)` (300 / 1.000 / 5.000 nhân viên), mỗi lần sửa 1 ghi chú nhân viên rồi `save()`; so (a) hiện tại với (b) hiện tại + `PRAGMA wal_checkpoint(TRUNCATE)` ngay sau mỗi lần lưu (kết nối phụ trên cùng tệp, gần đúng chi phí). 12 lần lặp/ô; môi trường: container Linux (không phải Windows).

## Kết quả (trung vị ms của một lần lưu)
| Nhân viên | Hiện tại | Thêm C | Chênh | WAL sau lưu (hiện tại → C) |
|---|---|---|---|---|
| 300 | 8,1 | 13,1 | +5,1 | 1,7 MB → 0 |
| 1.000 | 26,4 | 35,5 | +9,1 | 4,7 MB → 0 |
| 5.000 | 149,8 | 142,6 | −7,2 (trong nhiễu) | 22,8 MB → 0 |

p95 (≈ 100 ms / 340 ms / 1,6 s) chủ yếu do lần lưu đầu và dao động đĩa, hai phương án gần như như nhau.

## Nhận định
- Chi phí thêm của C đo được: **vài ms đến ~10 ms** mỗi lần lưu ở quy mô 300–1.000 người, **không phân biệt được với nhiễu** ở 5.000 người.
- C làm tệp `-wal` luôn ≈ 0 sau mỗi lần lưu (hiện tại phình tới ~23 MB ở 5.000 người và chỉ gộp khi đóng kho) → loại bỏ đúng điều kiện gây mất giao dịch của `U-DUR-06c` (đã có mô phỏng U-DUR-06d đạt).
- **Hạn chế của phép đo:** môi trường Linux/đĩa nhanh; trên Windows (NTFS, antivirus) `fsync` của checkpoint thường tốn hơn; kết nối phụ chỉ gần đúng chi phí trong cùng kết nối; chưa đo người dùng đồng thời / ổ mạng.

## Đề xuất (chưa làm — chờ chủ duyệt)
Nếu chủ muốn đóng rủi ro này: áp dụng C trong `main/sqlite-storage.js` (`save`/`saveDelta`), bật cờ `HAK_SQLITE_CHECKPOINT=0` để tắt khi cần, đo lại **trên Windows thật** ở 5.000 nhân viên trước khi phát hành; chuyển 3 ca `U-DUR-06c` từ `todo` thành test thật. Cho tới khi chủ duyệt: giữ phương án A.
