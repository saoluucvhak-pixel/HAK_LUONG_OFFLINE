# HAK_LUONG_OFFLINE — Tính lương offline (HAK Group)

Ứng dụng HTML/JS chạy offline (cùng khung với app *Quản lý xuất hàng*): đăng nhập nhiều người dùng (Quản trị / Nhân viên), mỗi **đơn vị** có dữ liệu riêng,
dữ liệu lưu trong IndexedDB, bộ cài Windows tự build trên GitHub Actions (kèm `HAKDocs.exe` hỗ trợ lưu file).

- `app/` — ứng dụng (mở `app/index.html` hoặc cài bằng bộ cài).
- `app/js/payroll-engine.js` — bộ máy tính lương (hàm thuần, có test trong `tests/`), port từ hệ thống Google Apps Script `LUONG_HAK`.
- `installer/` — NSIS + HAKDocs.exe. Phiên bản lấy từ `installer/setup.nsi` và `app/js/version.js` (phải khớp).

Kiểm thử: `npm run check && npm test`.
