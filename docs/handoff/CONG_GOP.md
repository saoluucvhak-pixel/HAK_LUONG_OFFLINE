# Cổng gộp bằng máy và kiểm sau gộp (handoff 014, issue #116)

Ba agent dùng chung một tài khoản GitHub nên không phân biệt được ai bấm gộp. Từ khi 014 gộp: **người gộp chạy `merge-gate.cjs`, chỉ gộp khi lệnh in `KẾT QUẢ: PASS`**, và **dán nguyên đầu ra của lệnh vào bình luận `/da-kiem`**; sau khi gộp chạy `post-merge-check.cjs` và **dán nguyên đầu ra vào `/da-gop`**.

Yêu cầu: Node ≥ 22 và `gh` đã đăng nhập (chỉ dùng REST qua `gh api`; môi trường Claude Code chặn GraphQL nên script không dùng `gh release download`/`gh pr merge`). Script **không lưu, không in token**. Chỉ-đọc, trừ cờ `--merge`.

## 1. `node scripts/merge-gate.cjs <số PR> [--merge]`
In từng dòng `PASS`/`FAIL`; **mặc định không gộp**; mã thoát ≠ 0 nếu có FAIL (2 = lỗi đọc GitHub).

| Mục | Kiểm | FAIL khi |
|---|---|---|
| 0 | PR đang mở | PR đã đóng/gộp |
| 1 | CI ở `head.sha` (40 ký tự) | còn check-run chưa `success`; chỉ `publish-release` được `skipped`; chưa có check-run nào |
| 2 | `mergeable_state` | khác `clean` (dirty, behind, unstable, blocked) |
| 3 | PR đổi mã sản phẩm (tệp ngoài `docs/**`, `tests/**`, `*.md`) | thiếu bình luận mở đầu `[CEO_LUONG (thay thế)` chứa `/dong-y-gop #<n> <đúng head.sha>` (SHA cũ, PR khác, không có nhãn "(thay thế)" đều FAIL) |
| 4 | `/da-kiem` | không có bình luận `/da-kiem` đăng **sau** commit cuối |
| 5 | nhãn | có `ceo-yeu-cau-sua` |
| 6 | phiên bản (chỉ khi đổi mã sản phẩm) | `package.json` không lớn hơn `main`; trùng tag; `docs/CHANGELOG.md` thiếu mục; `ui/workspace-v104.js` `VERSION` lệch; thiếu `docs/releases/vX.Y.Z.md` |
| 7 | tệp thuộc mục 6 của `CEO_BAN_GIAO.md` | sửa `.github/workflows/**`, `scripts/check-consolidation.cjs`, `shared-modules.lock.json`, `core/importer.js`, `engine.js`, `hr.js`, `core/integrity.js`, `core/production-alloc.js`, hoặc tệp trong `shared-modules.lock.json` → ghi "cần `/hoi-chu-so-huu`" |

PR chỉ docs/tests: mục 3 và 6 tự PASS (không cần `/dong-y-gop`, không bắt buộc tăng phiên bản); các mục còn lại vẫn áp dụng.

Cờ `--merge`: chỉ khi **tất cả PASS** thì gộp squash (`PUT /pulls/<n>/merge`, `sha` = `head.sha`), đọc lại PR và in `merged:true` + SHA commit trên `main`. Không có cờ ép gộp; không bao giờ đổi nhãn bản phát hành (việc của CEO).

## 2. `node scripts/post-merge-check.cjs <X.Y.Z> [--wait]`
CHỈ ĐỌC. Kiểm: (1) tag `vX.Y.Z` tồn tại và trỏ commit nào; (3) CI của commit đó xanh (`--wait` đợi tới 20 phút); (4) bản phát hành có đủ `TinhLuongHAK-V10.4-Setup-X.Y.Z.exe`, `SHA256SUMS.txt`, `BUILD_INFO.json`; (5) **tải `.exe` và tự băm SHA-256** khớp `SHA256SUMS.txt`; (6) `BUILD_INFO.json` `commit` = commit của tag; (7) nhãn còn **Pre-release** (đúng; chỉ CEO đổi sang Latest). Mã thoát ≠ 0 nếu có FAIL.

## 3. Đã kiểm
`tests/unit/merge-gate.test.js` (16 ca, hàm quyết định thuần với dữ liệu giả, **không gọi mạng**): thiếu `/dong-y-gop`; `/dong-y-gop` SHA cũ; không có nhãn "(thay thế)"; PR khác; thiếu `/da-kiem` hoặc đăng trước commit cuối; CI có `failure`/đang chạy/trống; mergeable ≠ clean; nhãn `ceo-yeu-cau-sua`; phiên bản không tăng/trùng tag/thiếu CHANGELOG/VERSION lệch/thiếu docs; sửa tệp khóa; PR chỉ docs; script không in token và không có cờ ép gộp. Chạy thật (chỉ đọc) trên PR #117 và bản v2.0.43: đúng PASS/FAIL (v2.0.43: PASS cả 6 mục, `.exe` 142 MB tự băm khớp). **Chưa thử** nhánh `--merge` trên PR thật (chưa gộp bằng script lần nào).
