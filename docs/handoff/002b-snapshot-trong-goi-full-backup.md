# 002b — Đưa bản chụp SQLite vào gói Full Backup (CHỈ THIẾT KẾ — chưa có mã, cần chủ sở hữu duyệt)

Trạng thái: **đề xuất, chờ chủ sở hữu duyệt** (đổi định dạng gói sao lưu thuộc nhóm phải hỏi). Người viết: STAFF_LUONG, theo chỉ đạo 002 (issue #86).

## 1. Hiện trạng (đã đọc `main/fullbackup.js`)
Gói ZIP: `manifest.json` (`format: "HAK-FULLBACKUP"`, `version` 1, hoặc 2 khi có `year_archives/`), `data.json` (+SHA-256 và size trong `manifest.data`), chứng từ, thư viện OCR, hồ sơ năm. App cũ từ chối gói có `version` lớn hơn `VERSION` của nó ("gói do phiên bản MỚI HƠN tạo"). Khôi phục đọc `data.json` trong gói.

## 2. Đề xuất
- Thêm một tệp tùy chọn **`sqlite/data-snapshot.sqlite`** (bản `VACUUM INTO` ở thời điểm tạo gói, đã `integrity_check`) và khai trong manifest một khối mới `sqliteSnapshot: { path, size, sha256, schema, records, rev, createdAt }`. `data.json` **vẫn là bản xuất cùng thời điểm** và vẫn là nguồn khôi phục chuẩn; snapshot chỉ là bản thay thế nhanh/đối chứng.
- Đối chiếu khi tạo gói: `records` của snapshot = số dòng dựng lại từ `data.json` trong gói (cùng revision, vì bản xuất đã đồng bộ trước khi sao lưu).
- Cờ `manifest.version`: **giữ 2** nếu khối `sqliteSnapshot` là trường tùy chọn mà app cũ bỏ qua được (xem §3) — tránh đẩy cả máy đang dùng bản cũ vào trạng thái "gói mới hơn, không mở được". Chỉ nâng lên 3 nếu chủ sở hữu muốn app cũ CHẶN gói mới.

## 3. Tương thích
- **App cũ mở gói mới (có `sqliteSnapshot`, version giữ 2):** kiểm `manifest.version`, `data`, chứng từ, hồ sơ năm như cũ; không đọc khối lạ và tệp `sqlite/…` không nằm trong danh sách kiểm ⇒ bị bỏ qua. *Cần xác nhận bằng test trước khi phát hành (hiện chỉ suy từ mã, chưa chạy).* Nếu chủ sở hữu chọn version 3: app cũ báo "cập nhật app" và không khôi phục — an toàn nhưng chặn cứng.
- **Gói cũ (không có snapshot) khôi phục bằng app mới:** giữ nguyên đường hiện tại (đọc `data.json`); không báo lỗi thiếu snapshot.
- **Gói có snapshot nhưng snapshot sai SHA-256/schema mới hơn:** bỏ snapshot, dùng `data.json` và ghi cảnh báo; gói vẫn hợp lệ nếu `data.json` đạt.
- Khôi phục từ snapshot trong gói dùng ĐÚNG đường kiểm/cất/thay nguyên tử của 002 (`restoreFromSnapshot`), thêm nguồn tệp.

## 4. Quay lui
Bỏ khối `sqliteSnapshot` khỏi bộ tạo gói là đủ (tệp gói cũ vẫn mở được, vì chỉ là phần thêm). Không đụng lược đồ SQLite, `data.json`, hay gói đã tạo.

## 5. Rủi ro / việc cần quyết (chủ sở hữu)
1. Giữ `manifest.version = 2` (tương thích, cần test app cũ bỏ qua) hay nâng 3 (chặn app cũ)?
2. Dung lượng gói tăng ≈ kích thước `data.sqlite` đã nén VACUUM (đo trên dữ liệu 5.000 NV trước khi chốt).
3. Mã hóa gói (`main/backup-crypt.js`) đang tạm dừng theo chỉ đạo: snapshot phải đi cùng cơ chế mã hóa khi mở lại.
4. Thời điểm: sau 002 được review; viết mã + test tương thích cũ↔mới là một PR riêng.

## 6. Test cần có khi làm thật (chưa làm)
gói mới → app cũ (bản 2.0.35) mở/khôi phục; gói cũ → app mới; snapshot sai SHA; snapshot schema mới hơn; snapshot lệch `data.json`; kill giữa lúc khôi phục từ snapshot trong gói.
