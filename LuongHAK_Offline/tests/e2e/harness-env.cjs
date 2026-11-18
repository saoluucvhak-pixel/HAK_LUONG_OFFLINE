"use strict";
// Cờ HẠ TẦNG KIỂM THỬ (không phải hành vi sản phẩm) cho các kịch bản E2E Electron — mặc định giống CI (`.github/workflows/luong-hak-v10-4-setup.yml`, khối `env`):
//  HAK_SQLITE_EXPORT_SYNC=1      xuất data.json NGAY sau mỗi lần lưu (sản phẩm thật xuất trễ ≤ 3 giây, khi đóng, hoặc trước khi đọc sao lưu);
//  HAK_SQLITE_ADOPT_EXTERNAL=1   cho phép kịch bản ghi data.json từ ngoài rồi để app nhận lại (kịch bản kiểm lưu/khôi phục dựa vào đó).
// Lý do: nhiều kịch bản đọc data.json NGAY sau thao tác. Thiếu cờ, kịch bản hỏng ở ca đọc "data.json" trễ (vd. "Thêm nhân viên: có Quốc tịch…" ở run-e2e.js)
// dù app đúng — đã tái hiện: chạy `npm run test:e2e` không cờ → 164 đạt rồi hỏng ca đó. Đặt cờ ở đây để chạy cục bộ giống CI, KHÔNG sửa app cho vừa test.
// Đã đặt sẵn giá trị (kể cả "0") thì giữ nguyên. Kịch bản kiểm chế độ THẬT (sqlite-default.cjs, installed-setup.cjs) KHÔNG dùng file này.
for (const [k, v] of [["HAK_SQLITE_EXPORT_SYNC", "1"], ["HAK_SQLITE_ADOPT_EXTERNAL", "1"]]) if (process.env[k] === undefined) process.env[k] = v;
