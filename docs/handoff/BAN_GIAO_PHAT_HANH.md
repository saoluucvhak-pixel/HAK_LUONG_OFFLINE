# Bàn giao phát hành — Tính lương HAK (LuongHAK_Offline)

Người lập: CEO_LUONG (thay thế), 19/11/2026. Từ 08:00 19/11 chủ sở hữu giao CEO tự làm toàn bộ (sửa mã, kiểm, gộp, phát hành, bàn giao); STAFF_LUONG và KCS đã dừng; CEO_LUONG gốc nghỉ hẳn (lịch quay lại 12:00 trong `CEO_BAN_GIAO.md` đã hủy).

## 1. Bộ cài ứng viên
- **Phiên bản ứng viên: v2.0.54** (bản mới nhất trên `main` sau khi gộp #132). Nhãn GitHub: **Pre-release** (thử nghiệm).
- Bản chính thức hiện hành (nhãn Latest): **v2.0.30** (18/11/2026).
- Mỗi bản có `TinhLuongHAK-V10.4-Setup-X.Y.Z.exe`, `SHA256SUMS.txt`, `BUILD_INFO.json`. Kiểm: `node scripts/post-merge-check.cjs X.Y.Z` (tag ↔ commit, CI 8/8, tự băm `.exe`, `BUILD_INFO.commit` = tag, nhãn).
- **Điều kiện đổi sang Latest:** (1) chủ sở hữu kiểm tay trên Windows thật theo issue **#115** và đánh dấu đạt; (2) chủ sở hữu ghi chấp nhận các nhóm còn "Một phần" ở `docs/ACCEPTANCE_SQLITE_RELEASE.md` §7 hoặc yêu cầu làm tiếp; (3) chủ sở hữu ghi **"đồng ý phát hành vX.Y.Z"**. Sau đó CEO đổi nhãn và đăng ghi chú phát hành.
- Bộ cài **chưa ký số** (tạm dừng theo chủ sở hữu): Windows SmartScreen có thể cảnh báo — bấm "Vẫn chạy" sau khi kiểm SHA-256.

## 2. Những gì đã làm trong đợt 18–19/11/2026 (đã gộp, đã nghiệm thu bằng máy)
| Bản | Việc | PR |
|---|---|---|
| 2.0.42 | Hỏi trước khi đóng cửa sổ khi Danh mục còn nháp | #110 |
| 2.0.43 | Nhập Excel: cột "Cách sửa", đối chiếu `file = ghi + gộp + không ghi`, tải file lỗi | #109 |
| 2.0.44 | **Chống trùng**: `nv01`/`NV 01`/`ＮＶ01`, `pc-001`, chữ NFD không còn thành bản ghi mới | #117, #119 |
| — | Cổng gộp bằng máy (`scripts/merge-gate.cjs`, `post-merge-check.cjs`), nâng phiên bản giữ CRLF (`bump-version.cjs`) | #118, #122 |
| 2.0.45 | Màn nhập liệu thấy ≥ 12 dòng ở 1366×768 | #120 |
| 2.0.46 | Màn Sao lưu & Khôi phục 5 khu, thư mục JSON | #121 |
| 2.0.47 | Sao lưu / khôi phục **theo kỳ lương** (`.zip`/`.hakenc`, xem trước, xác nhận riêng, không nhân đôi, chặn kỳ đã chốt, cảnh báo chốt lại kỳ) | #123 |
| 2.0.48 | Thanh trên 1 hàng ở 1366×768 | #124 |
| 2.0.49 | Quy trình sao lưu khi lưu chính là SQLite: mọi lần sao lưu có bản chụp `.sqlite` đã kiểm, lịch sử 10 bản, chép dự phòng, báo lỗi | #125 |
| — | Test chuyển máy qua giao diện; ma trận §7; hướng dẫn sao lưu / chuyển máy (`docs/USER_GUIDE.md`) | #126 |
| 2.0.50 | Danh sách bản sao lưu có cột Định dạng / Phạm vi, lọc | #127 |
| 2.0.51 | Chống trùng danh mục `dm_*`; sửa dòng danh mục không đổi ô không chạm (NFC theo ô) | #129 |
| 2.0.52 | Chữ gợi ý đạt tương phản AA mọi màn (UI-003) | #130 |
| 2.0.53 | Bỏ hai thanh cuộn dọc lồng nhau (UI-004) | #131 |
| 2.0.54 | Nhập nhiều kỳ nhân sự / danh mục, file nhiều sheet (004.1b); nhật ký nhập ghi hồi tố; chặn đổi Mã NV đã chốt ở tầng nghiệp vụ (R-27); `RULES_TEST_MATRIX.md`; `REPORT_CATALOG.md` | #132 |

## 3. Trạng thái nghiệm thu
Xem `docs/ACCEPTANCE_SQLITE_RELEASE.md` §7 (v2.0.54). **Đạt / đạt bằng máy**: Lỗi đã biết, Import, Hiệu lực, Nghiệp vụ, Chốt/thanh toán, SQLite, Sao lưu–khôi phục–chuyển máy, UI (Linux/CI), Phân quyền. **Một phần**: Ghi dữ liệu (delta 006), Báo cáo/lọc (6 báo cáo nghiệp vụ dùng bộ lọc riêng — đề xuất thống nhất chờ duyệt), Hiệu năng (006), Setup (Windows thật). **Chưa nghiệm thu trên Windows thật: tất cả.**

## 4. Rủi ro còn lại
1. Chưa thử trên Windows thật (đường dẫn có dấu, USB/ổ mạng, tỉ lệ hiển thị 125%/150%, tắt nóng, đĩa gần đầy) — #115.
2. Kịch bản 6c `-wal` mất khi `data.json` chưa xuất kịp (≤ 3 s) — chủ sở hữu đã chấp nhận (quyết định A).
3. Hiệu năng lưu ở 5.000 NV ~130 ms p50, chưa đạt < 150 ms ở p95 mọi trường hợp — chờ quyết định 006.
4. Bộ cài chưa ký số; dữ liệu trên đĩa chưa mã hóa (tạm dừng). File sao lưu JSON không mã hóa — Full Backup và gói kỳ đặt được mật khẩu.
5. Lỗi Windows ngẫu nhiên ở `tests/e2e/legacy-upgrade.cjs` (gặp một lần ở #108) chưa rõ nguyên nhân; quy ước: gặp lại thì lưu log, không chạy lại cho qua.

## 5. Việc tiếp theo (chờ chủ sở hữu quyết định)
- Thống nhất bộ lọc thông minh cho 6 báo cáo nghiệp vụ (`docs/REPORT_CATALOG.md` mục Đề xuất).
- 006: thiết kế ghi delta / hiệu năng lưu 5.000 NV.
- E2E chọn file nhiều sheet / ảnh OCR nhiều kỳ qua giao diện (tầng ghi đã kiểm).
- Khôi phục từ một bản chụp SQLite cũ trong lịch sử (hiện dùng bản JSON cùng thời điểm).

## 6. Cách làm việc / lệnh kiểm (cho người tiếp nhận)
```
git fetch origin main && git checkout --detach origin/main     # lịch sử ĐỦ (clone nông làm `npm run check` đỏ giả)
cd LuongHAK_Offline && npm ci --no-audit --no-fund
npm test && npm run lint && npm run build:app -- --check
cd .. && npm run check && npm run check:shared
cd LuongHAK_Offline && PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/sqlite-default.cjs
PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/input-filter-dept.cjs
node ../scripts/merge-gate.cjs <PR> [--merge]       # cổng gộp
node ../scripts/post-merge-check.cjs <x.y.z>        # kiểm bản phát hành
node ../scripts/bump-version.cjs <x.y.z>            # nâng phiên bản, giữ CRLF
```
Ràng buộc giữ nguyên: không đổi công thức lương/thuế/bảo hiểm/làm tròn, lược đồ, định dạng dữ liệu đã lưu, workflow CI, tệp khóa băm (`shared-modules.lock.json`, `main/storage.js`, `ui/workspace-v104.css`…), `core/importer.js` — cần đổi thì hỏi chủ sở hữu.
