# RELEASE_NOTES

Trang này chỉ là lối dẫn. Ghi chú từng bản phát hành nằm ở:

- **`docs/releases/vX.Y.Z.md`** — một file cho mỗi bản (nguồn gốc; CI yêu cầu file này phải có cho phiên bản trong `package.json`, và workflow phát hành dùng nó làm nội dung release trên GitHub).
- **`docs/CHANGELOG.md`** — lịch sử liên tục từ 2.0.0-alpha.25 đến bản mới nhất.
- **GitHub Releases** của repo — kèm file cài đặt và mã băm SHA-256.

Ghi chú cũ của các bản 2.0.0-alpha.2 và 2.0.0-alpha.4 (đăng nhập & phân quyền, kiểm tra ô chấm công) vẫn xem được qua lịch sử git của file này.

Mỗi lần nâng phiên bản: thêm `docs/releases/vX.Y.Z.md`, thêm mục ở đầu `CHANGELOG.md`, và nâng số phiên bản ở `package.json`, `package-lock.json` (hai chỗ), `ui/workspace-v104.js`.
