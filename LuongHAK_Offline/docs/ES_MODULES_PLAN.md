# Kế hoạch chuyển app-src/ sang ES Modules + esbuild (PROMPT 2)

## v2.0.97 – giai đoạn A (đã làm)
- `esbuild 0.28.2` (devDependency, chạy cục bộ, không mạng): `npm run build:app -- --verify` phân tích cú pháp app.js, báo kích thước và bản nén thử.
- `npm run build:app -- --sourcemap` ghi `app.js.map` (Source Map v3, mức dòng; mỗi dòng app.js trỏ về đúng dòng trong `app-src/` hoặc `app-src/screens/`). Tệp này không commit, không đóng gói.
- Ghép 31 tệp ~20 ms (mục tiêu < 200 ms). `app.js` giữ nguyên từng ký tự.
- Test: U-APP-ESB-01..05.

## Chưa chuyển (nói thẳng)
- **31 tệp CHƯA là ES Modules chuẩn.** Chúng là các đoạn của một IIFE dùng chung closure (`db`, `st`, `session`, `REPO`…), không độc lập.
- Lý do chưa làm trong một PR: Electron/NSIS và 35 tệp test đọc thẳng `app.js`, 14 cặp comment `-BEGIN/-END` được test trích xuất; esbuild bó gọn sẽ xóa comment thường và phá các marker. Chuyển hàng loạt có nguy cơ làm sai logic tính lương.

## Các giai đoạn tiếp theo (cần chủ ý, từng PR nhỏ)
1. Rút các hàm thuần (không đụng closure) thành module `ui/*.js` + test, giữ marker.
2. Thay dần biến closure dùng chung bằng đối tượng context truyền vào.
3. Khi test không còn đọc marker trong app.js: chuyển sang `esbuild --bundle` thật.
Mỗi bước phải giữ 100% test xanh và không sửa tệp khóa băm.
