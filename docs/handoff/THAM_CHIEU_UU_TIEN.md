# Tham chiếu ưu tiên khi viết và thực hiện đề bài nâng cấp

Chủ sở hữu chỉ định 6 repo dưới đây là **tham chiếu ưu tiên**. CEO viết đề bài, STAFF thực hiện và KCS kiểm tra đều đối chiếu với chúng **trước** khi tự nghĩ ra cách làm. Mọi đề bài nâng cấp có mục "Tham chiếu ưu tiên" nêu rõ tệp nào của repo nào áp dụng.

| # | Repo (đọc, shallow) | Dùng cho | Nội dung chính cần bám | Trạng thái so với app |
|---|---|---|---|---|
| 1 | `HAK-Enterprise-Design-System` (`0eab12e`) | Bố cục, thiết kế dễ dùng, tương phản (việc 005) | `design-system/V10.4-LAYOUT.md` (tiêu chí 1366×768 và 1920×1080, master–detail, Side Drawer), `hak-enterprise-components.css`, `hak-workspace-layout.css`, `tokens/luxe.css` (có `--mut-aa`), 4 chủ đề luxe/classic/neutral/champagne sáng/tối, `docs/ARCHIVE_YEARBOOK_PATTERN.md`, test tương phản AA ≥ 4,5:1 | **Khóa trong `shared-modules.lock.json`, cả 3 tệp `identical`** |
| 2 | `HAK_SMART_FILTER` (`555d29c`) | Bộ lọc thông minh mọi màn (004.3, 010) | `createFilter`, `setField`, `filter()` trả `{rows,total,kept,unsupported,state,scope}`, `savePreset/loadPreset`, chế độ `strict`, từ chối khoảng ngày đảo ngược, không lưu thông tin nhạy cảm trong preset, `docs/INTEGRATION.md` (thứ tự nạp `core` → `filter-popover` → `ui`) | **Khóa, cả 3 tệp `identical`** |
| 3 | `HAK_ACCOUNTING_REPORT_STANDARD` (`b6bd885`) | Chuẩn trình bày báo cáo, định dạng số/ngày (010, 004.2) | `src/index.js` (`formatNumber` kiểu Việt `1.250.000,75`, `formatDateISO` dd/MM/yyyy, `-0` hiển thị `0`), `docs/REPORT_FORMAT_SPEC.md` (đơn vị lập, tên báo cáo, kỳ, phạm vi lọc, dòng cộng, người lập/duyệt; Excel, PDF và in dùng cùng tập dòng và cùng điều kiện lọc; lặp tiêu đề cột khi phân trang; không làm tròn trước khi tổng hợp), `DECIMAL_PRECISION_POLICY.md`, `dist/hak-report-standard.js` (bản trình duyệt) | **Chưa khóa, app chưa nạp.** Chuẩn tự ghi là *dự thảo, chưa phải mẫu biểu pháp lý*: không được coi là thay đổi quy tắc làm tròn của lương |
| 4 | `HAK_OCR_ENGINE` (`20189d0`) | OCR chấm công và chứng từ (004.1b) | Thư mục `js/` (Tesseract.js, tìm lưới bảng chấm công, học từ chỗ người dùng sửa), kết quả OCR luôn qua bước người duyệt, offline, "Stop dropped decimal dots in per-cell numeric OCR" | **Chưa khóa.** App có bản OCR riêng; cần so sánh trước khi đổi |
| 5 | `HAK_AI_SKILLS` (`7cf4e1a`) | Danh mục kiểm tra theo chủ đề | `hak-ui-designer`, `hak-smart-filter`, `hak-data-integrity`, `hak-payroll-validator`, `hak-electron-security`, `hak-release-builder`, `hak-migration-manager`, `hak-code-auditor`: dùng `SKILL.md` làm checklist rà soát | Tài liệu, không phải mã chạy |
| 6 | `HAK_CODE_QUALITY_TEST` (`b78d9b2`) | Kiểm tĩnh bổ sung | CLI quét tĩnh (AST, vòng phụ thuộc, file trùng, handler thiếu). **Chỉ là quét tĩnh, không phải đã kiểm thử ứng dụng** (theo `docs/QUALITY_GATES.md`) | Công cụ ngoài, không vào bộ cài |

## Quy tắc dùng tham chiếu (bắt buộc)
1. **Không sao chép đè cả thư mục.** Tệp đã khóa trong `shared-modules.lock.json` đang `identical` với repo gốc; muốn đổi một tệp khóa thì phải sửa ở repo gốc trước rồi đồng bộ, hoặc đánh dấu `diverged` kèm lý do. Cả hai việc đụng nhóm "khóa băm/dùng chung" nên **cần chủ sở hữu cho phép**. Phiên CEO hiện chỉ có quyền đọc các repo này.
2. **Chuẩn trình bày không đổi cách tính.** Mọi thay đổi theo tham chiếu chỉ đổi cách hiển thị, định dạng, bố cục, lọc. Chạm công thức lương, thuế, bảo hiểm, làm tròn, kỳ đã chốt, lược đồ hoặc định dạng dữ liệu đã lưu thì **dừng và hỏi chủ sở hữu**.
3. **Nêu nguồn:** mỗi PR liệt kê tệp tham chiếu đã đối chiếu (repo, tệp, commit) và chỗ nào app giữ khác với tham chiếu, kèm lý do.
4. **Không có tham chiếu cho một việc thì nói rõ**, không bịa. Mẫu biểu pháp lý không có trong 6 repo này.
5. **Nếu repo gốc đã đổi** so với commit khóa: STAFF so sánh, báo CEO trước khi đồng bộ.
6. Việc đẩy bản sửa của app lên repo gốc cần chủ sở hữu cấp quyền ghi; mặc định không làm.

## Gắn với đề bài hiện có
- **#97 (005, bố cục):** tiêu chí V10.4-LAYOUT.md, tương phản AA, 4 chủ đề sáng/tối, checklist `hak-ui-designer`.
- **#92 mục 3 (004.3) và #99 (010):** API `HAK_SMART_FILTER`, `REPORT_FORMAT_SPEC.md`, định dạng số/ngày kiểu Việt, checklist `hak-smart-filter`.
- **#98 (009, quy trình nhập):** checklist `hak-data-integrity`; OCR theo `HAK_OCR_ENGINE/js`.
- **KCS:** có thể chạy `HAK_CODE_QUALITY_TEST` như một cổng tĩnh bổ sung (không thay test).
