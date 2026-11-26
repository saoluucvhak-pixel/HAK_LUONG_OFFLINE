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

## 004.1b — bảng nhân sự / danh mục theo NGÀY HIỆU LỰC, file nhiều sheet, OCR (v2.0.54)
`tests/unit/import-multi-period-hr.test.js` (16 ca). File có 2 dòng: hiệu lực 01/09/2026 (kỳ 9/2026 ĐÃ CHỐT) và 01/10/2026 (kỳ mở).

| Bảng | Không phải Admin: dòng hồi tố bị chặn, cả lần ghi không đổi | Admin: ghi được, bản chốt không đổi, nhật ký ghi "HỒI TỐ kỳ đã chốt" | Nhập lại cùng file không thêm dòng |
|---|---|---|---|
| Tài khoản nhận lương (`thanhtoan`) | Đạt | Đạt (sửa v2.0.54) | Đạt |
| Phụ lục HĐ (`chitiethd`) | Đạt | Đạt (sửa v2.0.54) | Đạt |
| Danh mục lương (`dm_luong`) | Đạt | Đạt (sửa v2.0.54) | Đạt |
| Danh mục phụ cấp (`dm_phucap`) | Đạt | Đạt (sửa v2.0.54) | Đạt |
| Thông tin cá nhân (`canhan`) | — (không dùng tính lương → không phải hồi tố, ghi được) | — (nhật ký không ghi hồi tố) | Đạt |

- **File nhiều sheet** (`nhanvien` + `canhan` + `thanhtoan` trong một lần `importWorkbook`): ghi trong MỘT giao dịch; lưu thất bại → hoàn tác cả ba bảng (Đạt).
- **OCR chấm công** (`app-src/22-ocr-cham-cong.js` `ocrApply`): lập kế hoạch bằng chính `IMP.plan` với `lockedPeriods` rồi ghi qua cùng `importPreview` → `REPO.importWorkbook`; mỗi dòng mang Kỳ riêng nên ca nhiều kỳ của `chamcong`/`tiencom` ở bảng trên áp dụng nguyên vẹn.
- **Lỗi thật tìm được:** nhập Excel dòng có hiệu lực hồi tố vào kỳ đã chốt (Admin) — nhật ký chỉ ghi "Nhập Excel … +2/~0", **không ghi hồi tố** (sửa tay thì có). Đã sửa: `core/repository.js` `importWorkbook` thêm " · [HỒI TỐ kỳ đã chốt 9/2026]".

## Phạm vi và chưa kiểm
- "Mọi bảng nhập liệu" ở đây = 6 bảng nhập theo tháng của `core/importer.js` (`MONTHLY`). Bảng nhân sự/danh mục (hiệu lực theo ngày, không theo kỳ lương) dùng cùng bộ lập kế hoạch nhưng không có khái niệm "kỳ chốt" như trên; việc chặn hồi tố của chúng nằm ở `GRD.impactChange` (đã có test ở `tests/unit/guard-schema.test.js`, `repository.test.js`) — **chưa gom vào ma trận này**.
- OCR chấm công: xem mục 004.1b ở trên (cùng đường kế hoạch + ghi). Chưa có E2E OCR ảnh thật nhiều kỳ.
- File nhiều sheet: xem mục Giai đoạn 1 bên dưới (giao diện) và mục 004.1b ở trên (tầng ghi hồ sơ).
- Chưa kiểm bằng mắt bố cục hộp "Xem trước nhập Excel"; chưa chạy trên Windows thật (CI Windows có chạy bước E2E này).

## Giai đoạn 1 — File Excel tổng nhiều sheet, nhiều kỳ

- Bản xem trước ghi tên sheet và số dòng thật trong Excel. Dòng trống, dòng ví dụ đã bỏ qua và phần tiêu đề ở trên bảng không làm lệch số dòng.
- Kiểm thử tích hợp `workbook-preview.test.js` dùng XLSX thật cho sheet Suất cơm và Sản lượng, kiểm tra số dòng đúng và phân loại kỳ mở/kỳ đã chốt trong chế độ ghi đè.
- Kịch bản Electron `sqlite-default.cjs`, bước 9, mở bộ chọn file bằng **Nhập từ file Excel tổng**. Workbook có Tạm ứng và Suất cơm cùng hai kỳ mở (11–12/2026) và một kỳ đã chốt (08/2026). Kịch bản kiểm vị trí hai dòng bị từ chối, nhập lại không nhân đôi và lỗi SQLite ở sheet thứ hai hoàn tác cả dữ liệu lẫn nhật ký trước khi cho thử lại.
- Quy tắc hồi tố hồ sơ/danh mục của 004.1b tiếp tục áp dụng cho hồ sơ hiệu lực theo ngày. Bảng nhập liệu thuộc kỳ đã chốt vẫn bị khóa kể cả khi chọn **Ghi đè**.
