# Dữ liệu ngôn ngữ OCR (Tesseract) — đóng gói kèm app, dùng offline

| File | Nguồn | Giấy phép | SHA-256 |
|---|---|---|---|
| lang/vie.traineddata.gz | npm `@tesseract.js-data/vie` (4.0.0_best_int) — tessdata_best của dự án Tesseract | Apache-2.0 | `2284f610f262a1b19ec8df9f196b9ff6ce38ddb4a66329e998941df4b8961c8d` |
| lang/eng.traineddata.gz | npm `@tesseract.js-data/eng` (4.0.0_best_int) | Apache-2.0 | `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` |

Dùng bởi `main/ocr-service.js` (tesseract.js 7.0.0, Apache-2.0). Thư mục này nằm ngoài asar (`build.asarUnpack`).

## tesseract.js 7

- `worker.js`: bọc worker gốc của thư viện để chạy trong luồng phụ của tiến trình chính. Bản 5 cần thay gói `is-electron`; bản 7 không còn gói đó nên bước này chỉ chạy khi gói có mặt.
- `tesseract-compat.js`: từ bản 6, `recognize()` không trả `data.words`. `main/ocr-service.js` (file dùng chung với `HAK_OCR_ENGINE`, bị khóa bởi `shared-ocr.lock.json`) đọc `data.words` khi đoán chiều ảnh cả trang, nên `main.js` truyền thư viện đã bọc qua `tesseract-compat.js`. Chỉ worker đọc cả trang xin thêm danh sách từ. Khi `HAK_OCR_ENGINE` tự hỗ trợ bản 7 thì bỏ được file này (test `I-OCR-TESS7-01` sẽ báo).

