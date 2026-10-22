# V10.4 — Nắn thẳng cả trang ảnh chấm công trước khi đọc OCR

Nguồn dùng chung: `HAK_OCR_ENGINE`, nhánh `feature/page-rectify-v1`, commit `577851d2c913e0f632fa9b2e84ff1587445abd6d` (ghim trong `LuongHAK_Offline/shared-ocr.lock.json`, CI so khớp nguyên văn + SHA256). Bản này cũng mang theo cập nhật `timesheet-parse.js` của commit `6fd5382` (giờ viết tay `7h`, `09:3`, số dòng nguồn, ngày ISO / `needsYear`).

## Vấn đề

Ảnh chụp điện thoại hiếm khi thẳng tuyệt đối. Trước đây app chỉ tự xoay theo bội số 90°; khung bảng nghiêng vài độ hoặc chụp chéo làm ô bị ghép nhầm dòng / cột — **lỗi im lặng**: số đọc đúng nhưng nằm sai người / sai ngày.

## Cách làm

`core/page-rectify.js` (chạy ngay sau bước đoán chiều ảnh, trong `core/timesheet-ocr.js`):

1. Bám 4 đường viền ngoài của bảng (`table-grid.traceLines`), khớp đường thẳng, lấy 4 góc khung.
2. Biến đổi phối cảnh đưa khung về hình chữ nhật, áp cho **cả trang** (giữ tiêu đề, dòng "Tháng …/…", chữ ký ngoài bảng); nội suy bicubic để không làm nhòe nét chữ thêm.
3. An toàn: ảnh đã thẳng → giữ nguyên (`STRAIGHT`); không thấy đường kẻ (`NO_TABLE_LINES`), lệch > 15° (`ANGLE_OUT_OF_RANGE`), khung quá nhỏ (`TABLE_TOO_SMALL`) hoặc hình học bất thường (`GEOMETRY_INVALID`) → **không nắn**.
4. `result.rectify` ghi trạng thái, góc, có phối cảnh hay không, 4 góc nguồn và ma trận; bảng có cảnh báo "Ảnh đã được nắn thẳng …" để người duyệt đối chiếu ô với ảnh đã nắn. Không tự duyệt dữ liệu, không đổi luồng xem trước / nhập.

## Đo trên ảnh giả lập làm xấu (Tesseract offline đóng gói, 90 ô / ảnh)

| Ảnh | Không nắn: đúng / sai im lặng / không đọc | Có nắn |
| --- | --- | --- |
| Thẳng (gốc) | 90 / 0 / 0 | 90 / 0 / 0 (không nắn) |
| Nghiêng 2° | 78 / 9 / 3 | **90 / 0 / 0** |
| Nghiêng 5° | 45 / 22 / 23 | **90 / 0 / 0** |
| Giả lập chụp điện thoại (mờ, nhiễu, sáng không đều, JPEG, nghiêng 2,5°) | 66 / 14 / 10 | **90 / 0 / 0** |
| Chụp rất xấu (60% độ phân giải, bóng đổ, nghiêng −3,5°, phối cảnh) | 47 / 16 / 27 | 72 / 1 / 17 |

Kiểm tra tự động: `tests/integration/ocr-fixtures.test.js` I-OCR-07 (nghiêng 2° / 5° / chụp điện thoại: 90 ô đúng, 0 sai im lặng, đủ tên và kỳ lương), I-OCR-08 (chụp rất xấu: ≥ 65 ô đúng, ≤ 2 sai im lặng) và I-OCR-02 (ảnh thẳng không bị nắn) — ảnh trong `tests/fixtures/ocr/rectify/`, sinh bằng `make-degraded.py` từ ảnh mẫu giả lập).

## Giới hạn

- Ảnh tổng hợp từ bảng in giả lập, **không** thay nghiệm thu trên ảnh chụp thật (xem `V10_4_OCR_ACCEPTANCE.md`).
- Cần thấy được 4 đường viền ngoài của bảng. Bảng không có viền ngoài, giấy cong / nhàu mạnh chưa được xử lý.
- Ô `0,5` có thể bị Tesseract đọc mất dấu phẩy thành `05` → 5 (có cả khi không nắn; cột "Tổng công" bắt được lệch). Việc sửa thuộc phần đọc số, không thuộc phần nắn ảnh.
