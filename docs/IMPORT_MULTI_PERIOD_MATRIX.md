# Ma trận nhập Excel nhiều kỳ (chỉ đạo 004 mục 1, issue #92)

Dữ liệu GIẢ. Đường kiểm: **dữ liệu** `core/importer.js` `IMP.plan` (kế hoạch + khóa kỳ đã chốt) → `core/repository.js` `importWorkbook` (kiểm lại + ghi theo giao dịch `txn` THẬT của giao diện, lấy từ `app.js`) — `tests/unit/import-multi-period.test.js`; và **giao diện thật** (Electron, chọn file bằng hộp chọn tệp, xem trước, bấm Ghi, nhập lại) — `tests/e2e/sqlite-default.cjs` bước 9. Kỳ đã chốt = 2026-08 (bản chốt tạo bằng `CLS.buildSnapshot/close`); kỳ mở = 2026-10, 2026-11.

| Bảng nhập liệu | Nhiều kỳ: kỳ mở nhận, kỳ chốt chặn + báo | Nhập lại cùng file không nhân đôi | Trùng khóa với bản ghi kỳ chốt → chặn | Không ghi nửa chừng (kế hoạch lỗi thời → từ chối cả lần) | Lưu thất bại → hoàn tác hết | Chứng từ đổi kỳ → không ghi | Giao diện thật (E2E) |
|---|---|---|---|---|---|---|---|
| Chấm công (`chamcong`) | Đạt | Đạt | Đạt | Đạt | Đạt | — (khóa theo Kỳ, không phải chứng từ) | Đạt |
| Sản lượng (`sanluong`) | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt |
| Ban dăm xuất hàng (`bandam`) | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt (chọn "Phân bổ trực tiếp nhân viên" trước) |
| Thưởng / Trừ (`psluong`) | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt |
| Tạm ứng (`ungluong`) | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt |
| Suất cơm (`tiencom`) | Đạt | Đạt | Đạt | Đạt | Đạt | — | Đạt |

Số ca: unit 35 (6 bảng × 5 ca + 4 ca đổi kỳ chứng từ + 1 ca bảng kê); E2E 25 ca giao diện (6 bảng × 4 + 1 kiểm lỗi JavaScript).

**Lỗi thật tìm được:** không — cả hai lớp (kế hoạch và repository) đã chặn kỳ đã chốt, không nhân đôi và hoàn tác đúng cho cả 6 bảng; test này bổ sung bằng chứng tự động cho hàng "Import" của ma trận nghiệm thu §7 (trước đó chỉ có ca lẻ).

## Phạm vi và chưa kiểm
- "Mọi bảng nhập liệu" ở đây = 6 bảng nhập theo tháng của `core/importer.js` (`MONTHLY`). Bảng nhân sự/danh mục (hiệu lực theo ngày, không theo kỳ lương) dùng cùng bộ lập kế hoạch nhưng không có khái niệm "kỳ chốt" như trên; việc chặn hồi tố của chúng nằm ở `GRD.impactChange` (đã có test ở `tests/unit/guard-schema.test.js`, `repository.test.js`) — **chưa gom vào ma trận này**.
- Nhập Excel bằng OCR chấm công (`22-ocr-cham-cong.js`) dùng cùng `IMP.plan` nhưng luồng riêng — chưa có ca nhiều kỳ riêng.
- Nhập một file nhiều SHEET (nhiều bảng cùng lúc, `importAllFile`) chưa có ca nhiều kỳ riêng (mỗi bảng đã đạt riêng).
- Chưa kiểm bằng mắt bố cục hộp "Xem trước nhập Excel"; chưa chạy trên Windows thật (CI Windows có chạy bước E2E này).
