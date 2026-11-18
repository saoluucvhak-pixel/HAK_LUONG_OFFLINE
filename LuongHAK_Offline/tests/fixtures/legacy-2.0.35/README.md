# Mã nguyên văn của tag v2.0.35 (chỉ để kiểm thử tương thích)

`main/fullbackup.js`, `main/zip.js`, `main/data-digest.js`, `main/restore.js` ở đây là bản sao **nguyên văn** từ tag `v2.0.35`
(`git show v2.0.35:LuongHAK_Offline/main/<tệp>`). Không sửa. `tests/unit/fullbackup-snapshot.test.js` dùng chúng để chứng minh
**app 2.0.35 mở/khôi phục (stage) gói Full Backup mới có bản chụp SQLite bình thường và bỏ qua phần lạ** (002b), và để tạo gói "cũ" cho
kiểm tra app mới mở gói cũ. Chạy thật cả app Electron 2.0.35: `docs/v2.0.38/app-cu-mo-goi-moi.cjs`.
