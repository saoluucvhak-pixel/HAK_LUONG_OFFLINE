# Cổng gộp bằng máy và kiểm sau gộp (handoff 014, issue #116)

Ba agent dùng chung một tài khoản GitHub nên không phân biệt được ai bấm gộp. Từ khi 014 gộp: **người gộp chạy `merge-gate.cjs`, chỉ gộp khi lệnh in `KẾT QUẢ: PASS`**, và **dán nguyên đầu ra của lệnh vào bình luận `/da-kiem`**; sau khi gộp chạy `post-merge-check.cjs` và **dán nguyên đầu ra vào `/da-gop`**.

Yêu cầu: Node ≥ 22 và `gh` đã đăng nhập (chỉ dùng REST qua `gh api`; môi trường Claude Code chặn GraphQL nên script không dùng `gh release download`/`gh pr merge`). Script **không lưu, không in token**. Chỉ-đọc, trừ cờ `--merge`.

## 1. `node scripts/merge-gate.cjs <số PR> [--merge] [--json]`
In từng dòng `PASS`/`FAIL`; **mặc định không gộp**; mã thoát ≠ 0 nếu có FAIL (2 = lỗi đọc GitHub).

**Ba nhóm tệp (theo CEO, `/yeu-cau-sua #118`):** (a) **mã sản phẩm** = tệp dưới `LuongHAK_Offline/` trừ `tests/**` và `*.md` — cần `/dong-y-gop` **và** bước 6; (b) **công cụ** = `scripts/**`, `ci/**`, tệp gốc khác không phải docs — cần `/dong-y-gop`, **bỏ qua bước 6**; (c) **docs/tests** = `docs/**`, `tests/**`, `*.md` — không cần cả hai. Nhóm của PR in ngay dòng đầu (`nhóm: product|tool|docs`).

| Mục | Kiểm | FAIL khi |
|---|---|---|
| 0 | PR đang mở | PR đã đóng/gộp |
| 1 | CI ở `head.sha` (40 ký tự): **đủ 8 job bắt buộc** (`Cú pháp · Lint · Unit/Integration/Regression · Phụ thuộc`, `inherited-quality`, `consolidation`, `workspace-visual`, `electron-e2e`, `E2E trên Electron thật`, `Build bộ cài Windows`, `publish-release`) | thiếu job nào (workflow không kích hoạt đủ); job chưa `success`; chỉ `publish-release` được `skipped`. Cùng tên nhiều lần chạy thì lấy **lần mới nhất** (`completed_at`, rồi `id`) — chạy lại xanh không bị lần cũ đỏ che |
| 2 | `mergeable_state` | khác `clean` (dirty, behind, unstable, blocked) |
| 3 | nhóm (a)/(b): `/dong-y-gop` | thiếu bình luận mở đầu `[CEO_LUONG (thay thế)` chứa `/dong-y-gop #<n> <đúng head.sha>` (SHA cũ, PR khác, không có nhãn "(thay thế)" đều FAIL). SHA được phép nằm trong dấu backtick hoặc nháy |
| 4 | `/da-kiem` | không có bình luận `/da-kiem` đăng **sau** commit cuối |
| 5 | nhãn | có `ceo-yeu-cau-sua` |
| 6 | phiên bản (chỉ nhóm (a)) | `package.json` không lớn hơn `main`; trùng tag; `docs/CHANGELOG.md` thiếu mục; `ui/workspace-v104.js` `VERSION` lệch; thiếu `docs/releases/vX.Y.Z.md` |
| 7 | tệp thuộc mục 6 của `CEO_BAN_GIAO.md` | sửa `.github/workflows/**`, `scripts/check-consolidation.cjs`, `shared-modules.lock.json`, `core/importer.js`, `engine.js`, `hr.js`, `core/integrity.js`, `core/production-alloc.js`, hoặc tệp trong `shared-modules.lock.json` → ghi "cần `/hoi-chu-so-huu`" |
| 8 | đổi xuống dòng (014-B) | có tệp bị **viết lại cả tệp** (`additions = deletions` ≈ tổng số dòng tệp, từ 20 dòng trở lên) hoặc, khi có `patch`, ≥ 3/4 dòng đổi chỉ khác CR (CRLF↔LF). Tệp mới/xóa và tệp đổi dưới 20 dòng bỏ qua. Gợi ý: chạy `bump-version.cjs` hoặc khôi phục kiểu xuống dòng gốc |

Cờ `--merge`: chỉ khi **tất cả PASS** thì gộp squash (`PUT /pulls/<n>/merge`, `sha` = `head.sha`). **Nếu PUT lỗi (405/409…) in NGUYÊN `message` và thoát 1 trước khi đọc lại PR**; nếu thành công thì đọc lại PR và in `merged:true` + SHA commit trên `main`. Cờ `--json`: in thêm một dòng JSON cuối (`pass`, `kind`, `checks`, `merged`, `mergeCommit`, `error`) cho máy đọc / dán vào `/da-kiem`. Không có cờ ép gộp; không bao giờ đổi nhãn bản phát hành (việc của CEO).

## 2. `node scripts/post-merge-check.cjs <X.Y.Z> [--wait]`
CHỈ ĐỌC. Kiểm: (1) tag `vX.Y.Z` tồn tại và trỏ commit nào; (3) CI của commit đó xanh (`--wait` đợi tới 20 phút); (4) bản phát hành có đủ `TinhLuongHAK-V10.4-Setup-X.Y.Z.exe`, `SHA256SUMS.txt`, `BUILD_INFO.json`; (5) **tải `.exe` và tự băm SHA-256** khớp `SHA256SUMS.txt`; (6) `BUILD_INFO.json` `commit` = commit của tag; (7) nhãn còn **Pre-release** (đúng; chỉ CEO đổi sang Latest). Mã thoát ≠ 0 nếu có FAIL.

## 3. Đã kiểm
`tests/unit/merge-gate.test.js` (27 ca, thêm `tests/unit/bump-version.test.js` 4 ca; hàm quyết định thuần với dữ liệu giả, **không gọi mạng**): thiếu `/dong-y-gop`; `/dong-y-gop` SHA cũ; không có nhãn "(thay thế)"; PR khác; thiếu `/da-kiem` hoặc đăng trước commit cuối; CI có `failure`/đang chạy/trống; mergeable ≠ clean; nhãn `ceo-yeu-cau-sua`; phiên bản không tăng/trùng tag/thiếu CHANGELOG/VERSION lệch/thiếu docs; sửa tệp khóa; PR chỉ docs; script không in token và không có cờ ép gộp. Thêm: ba nhóm tệp, đủ job bắt buộc, lần chạy mới nhất, SHA trong backtick, `--merge` lỗi (gh giả, không mạng) và `--json`. Chạy thật (chỉ đọc) trên PR #117 và bản v2.0.43: đúng PASS/FAIL (v2.0.43: PASS cả 6 mục, `.exe` 142 MB tự băm khớp). **Chưa thử** nhánh `--merge` trên PR thật (chưa gộp bằng script lần nào).

## 4. Nâng phiên bản: luôn dùng `node scripts/bump-version.cjs <x.y.z>` (014-B)
Một số tệp trên `main` lưu **CRLF** (`LuongHAK_Offline/package-lock.json`, `LuongHAK_Offline/ui/workspace-v104.js`), số khác LF. Sửa tay hoặc bằng trình ghi văn bản của ngôn ngữ lập trình (Python `open(...).write`, v.v.) rất dễ đổi cả tệp sang LF: diff +4.948/−4.948, không rà được, chắc chắn xung đột giữa các PR cùng nâng phiên bản (đã xảy ra ở #120, #121).
- `bump-version.cjs` đổi đúng: `package.json` (`"version"`), `package-lock.json` (2 chỗ đầu), `ui/workspace-v104.js` (`VERSION`); thêm khung mục `docs/CHANGELOG.md` (trước mục cũ nhất, đúng kiểu xuống dòng của tệp) và tạo khung `docs/releases/vX.Y.Z.md`. Đọc/ghi chuỗi thô nên **giữ nguyên CRLF/LF từng tệp**; kiểm hết trước khi ghi (số không hợp lệ / không lớn hơn bản hiện tại / thiếu dòng phiên bản / đã có mục → không ghi tệp nào, thoát ≠ 0). Cờ: `--root DIR`, `--date DD/MM/YYYY`, `--no-docs`.
- Sau khi chạy: điền các dòng `(điền …)` trong CHANGELOG và `docs/releases/vX.Y.Z.md`; nếu tự sửa thêm tệp CRLF thì dùng ghi **nhị phân**, rồi kiểm `git diff --stat origin/main...HEAD -- <tệp>` chỉ còn vài dòng.
- Chưa thêm `.gitattributes` toàn repo (sẽ đổi hàng loạt tệp) — nếu muốn thì `/hoi-chu-so-huu`.
