# Kiểm kê đường ghi dữ liệu (SQLite giai đoạn 1) — 18/11/2026

Kiểm kê bằng đọc mã (`grep` các lệnh ghi file và mọi `ipcMain`) rồi **kiểm chứng bằng chạy**: bật bản sao bóng SQLite ở chế độ `verify` và chạy toàn bộ E2E.

## 1. Kết quả chính
**`data.json` chỉ được ghi qua MỘT hàm: `storage.save(text)` (`main/storage.js`).** Có đúng hai nơi gọi:
1. IPC `store-save` (`main.js`): đường duy nhất của giao diện (`saveNow()` trong `app-src/01-luu-tru.js` → `JSON.stringify(db)` → `store.save`), qua `write-policy.check` (kiểm quyền, chốt kỳ, phiếu đã xác nhận) rồi `storage.save`.
2. `saveChecked()` trong `main/year-archive.js`: lưu trữ/khôi phục kho năm chạy ở tiến trình chính, không đi qua `store-save` (nhưng có `years.checkWrite`).

Mọi nghiệp vụ (nhập tay/Excel, gộp công, thêm/xóa nhân viên, cấp phát, chốt kỳ, thanh toán, restore) đều là thay đổi trong bộ nhớ của giao diện rồi một lần `store.save` toàn tài liệu — chưa có đường ghi theo từng dòng. Giao dịch nhiều bảng (`txn()`) hoàn tác trong RAM khi lưu thất bại.

## 2. Các thứ khác được ghi xuống đĩa (KHÔNG phải `data.json`)
| Nơi | Nội dung | Đường ghi |
|---|---|---|
| `backups/` + `.sha256` | bản sao lưu JSON | `storage.backup*` (`main/storage.js`), ghi tạm → đổi tên, SHA-256 |
| Thư mục sao lưu thứ hai | bản chép | `storage.syncMirror` |
| Full Backup `.zip` | dữ liệu + chứng từ + kho năm + thư viện OCR | `main/fullbackup.js` (tạo tạm → đổi tên → `.sha256`) |
| Restore | thay chứng từ/thư viện OCR, nhật ký journal | `main/restore.js`; phần dữ liệu quay lại giao diện rồi đi `store-save` (cờ `restoring`) |
| Chứng từ OCR/tài liệu | ảnh, meta | `main/documents.js` (`wx`: không ghi đè), `main/ocr-library.js` |
| Kho năm | `nam-<YYYY>` bất biến | `main/year-archive.js` (`wx`), xuất `year-archive-export.js` |
| Cấu hình máy | `settings.json` | `main/storage-paths.js`, lịch sao lưu |
| Xuất file | Excel/PDF | `exportsDir` |
| `localStorage` của trình duyệt | bản sao `KEY` khi không có `store` (chế độ không Electron) + tùy chọn giao diện | `app-src/01-luu-tru.js` |

## 3. Kiểm chứng bằng chạy (Linux, dữ liệu giả)
Bản sao bóng `HAK_SQLITE_SHADOW=verify` bọc `storage.save`; mỗi lần lưu ghi **chỉ phần thay đổi** vào `shadow.sqlite`, rồi dựng lại TOÀN BỘ từ SQLite so với nội dung vừa lưu. Chạy cả bộ E2E thật:

| Bộ E2E | Kết quả bộ | Bản sao bóng |
|---|---|---|
| `run-e2e.js` (297 ca), `capphat.cjs` (42), `input-filter-dept.cjs` (10) | 297/297, 42/42, 10/10 | 133 lần lưu có thay đổi, 0 `MISMATCH`, 0 `ERROR` |
| `year-archive.cjs`, `restore-first-run.cjs` | 13/13, 3/3 | lưu trữ/khôi phục năm (hàng nghìn dòng) và restore sang hồ sơ mới được phản chiếu đúng, 0 `MISMATCH`/`ERROR` |

Kết luận có giới hạn: với các kịch bản E2E hiện có, mọi lần ghi đều đi qua `storage.save` và cho cùng dữ liệu khi chỉ ghi delta vào SQLite. Không suy ra rằng chưa có đường ghi nào khác ngoài các kịch bản đã chạy; test `U-SQL-07`/`U-CS-06` khóa việc app không nạp SQLite khi chưa bật cờ.

## 4. Còn thiếu cho giai đoạn 1
- Giao diện vẫn tuần tự hóa và gửi cả tài liệu mỗi lần lưu; delta hiện được tính ở tiến trình chính bằng so sánh (chi phí vẫn tỉ lệ kích thước tài liệu, nhưng GHI xuống SQLite chỉ phần đổi). Muốn bỏ hẳn chi phí này cần mỗi màn gửi thay đổi riêng qua IPC có kiểm quyền (việc lớn, theo từng màn).
- Dịch vị trí đuôi khi chèn/xóa giữa bảng tốn O(số dòng sau đó); cần khóa thứ tự thưa nếu đo thấy chậm.
- Chưa có ID nội bộ ổn định được lưu lại trong `data.json` (dòng không có `_id` nhận id băm trong kho; đổi nội dung thì id đổi vì kho hiện định danh theo vị trí khi cập nhật).
