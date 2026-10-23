# V10.4 — Umi-OCR làm ý kiến thứ hai cho ô số (tuỳ chọn)

Nguồn dùng chung: `HAK_OCR_ENGINE`, nhánh `feature/umi-second-opinion`, commit `4ee3181603a3886fcb7583f02f2152b245d79dd9` (`main/umi-ocr.js`, `main/ocr-service.js`, `core/timesheet-ocr.js` — ghim trong `shared-ocr.lock.json`).

[Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) (MIT) là phần mềm OCR offline cho Windows dùng PaddleOCR / RapidOCR. App **không đóng gói** Umi-OCR; người dùng tự cài và chạy nó trên cùng máy. Khi Umi-OCR đang chạy, mỗi ô **số** của bảng chấm công được đọc thêm bằng Umi-OCR qua API cục bộ `http://127.0.0.1:1224/api/ocr`.

## Người dùng thấy gì

- Ô mà Umi-OCR đọc **khác** Tesseract: tô vàng, vào danh sách **Ô cần kiểm tra tiếp theo**, có nút `⇄ <số Umi đọc>`; khung ảnh ô ghi "Umi-OCR đọc KHÁC: …". Bấm nút đi qua đúng luồng sửa ô / học mẫu như sửa tay. Không ô nào bị tự thay.
- Phiếu nghiệm thu OCR đánh dấu các ô này `needsReview`.
- Nút **Kiểm tra OCR** báo Umi-OCR có đang chạy hay không.

## Cài đặt (tuỳ chọn)

1. Tải bản Windows từ trang Releases chính thức của Umi-OCR (đã thử `Umi-OCR_Rapid_v2.1.5.7z.exe` — bản Rapid chạy được trên máy cấu hình thấp), giải nén, chạy `Umi-OCR.exe`.
2. Giữ cổng mặc định 1224 (Umi-OCR → Cài đặt toàn cục → Dịch vụ). Cổng khác: đặt biến môi trường `HAK_UMI_OCR=<cổng>` trước khi mở app.
3. Mở app → Đọc ảnh chấm công → **Kiểm tra OCR** → phải thấy "Umi-OCR: đang chạy trên máy này".

Tắt hẳn: `HAK_UMI_OCR=0`. Umi-OCR không chạy → app đọc như trước (ô ghi `UNAVAILABLE`, tự bỏ qua 30 giây sau lần kết nối lỗi).

## An toàn dữ liệu

Chỉ gọi địa chỉ loopback (127.0.0.1 / localhost / ::1); địa chỉ khác bị từ chối trong mã. Ảnh ô không ghi xuống đĩa, không ra mạng. Umi-OCR là phần mềm bên thứ ba do người dùng tự cài — nên tải từ trang Releases chính thức.

## Đo trên ảnh giả lập (14 ảnh làm xấu, 90 ô / ảnh, Umi-OCR v2.1.5 Rapid, model English)

| | Chỉ Tesseract | Tesseract + Umi-OCR (ý kiến thứ hai) |
| --- | --- | --- |
| Ô "0,5" Tesseract đọc thành "05" → 5 (sai im lặng) | 6 ảnh | 2 ảnh (04, 13: Umi cũng đọc sai); **4 ảnh được đánh dấu kèm gợi ý đúng "0,5"** |
| Báo nhầm (ô đúng bị đánh dấu) | — | 1 ô / 1.260 ô |
| Thời gian / trang | ~2–4 giây | ~12–28 giây (~70 ms mỗi ô số) |

Umi-OCR **đọc một mình** kém Tesseract trên ảnh mờ / độ phân giải thấp (ảnh mờ mạnh: 25 ô đúng so với 53; ảnh 50% độ phân giải: 30 so với 89 — thường để trống, không sai), và **không có model tiếng Việt** (chỉ Trung, Anh, Nhật, Hàn, Cyrillic) → chỉ dùng làm ý kiến thứ hai cho ô số, không dùng cho tên người.

Kiểm tra tự động: `tests/integration/umi-second-opinion.test.js` (Tesseract thật + máy chủ Umi giả lập), HAK_OCR_ENGINE `js/tests/unit/umi-ocr.test.js`.

## Giới hạn

- Ảnh giả lập, chưa nghiệm thu trên ảnh chụp thật.
- Chậm hơn rõ khi bật; có thể tối ưu sau bằng cách ghép nhiều ô vào một ảnh mỗi lần gọi.
- Alpha.38 có công tắc **Đọc thêm bằng Umi-OCR** trên trang OCR (áp dụng trong phiên mở app). Tắt qua biến môi trường vẫn được ưu tiên.
- Alpha.38 báo tiến độ từng ô, Dừng đọc bỏ lô đang dở sau ô hiện tại. Cache tối đa 512 PNG giống hệt trong RAM để giảm gọi Umi lặp; không ghép nhiều ô vào một ảnh.
