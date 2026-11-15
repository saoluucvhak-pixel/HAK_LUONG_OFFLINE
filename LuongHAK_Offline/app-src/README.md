# app-src — các đoạn của `app.js`

`../app.js` được **ghép** từ các file `.js` trong thư mục này, theo thứ tự tên file (`00-…`, `01-…`).

- `app.js` là một hàm bao duy nhất, nên mọi màn hình dùng chung `db`, `st`, `session`… Mỗi file ở đây là một **đoạn liên tiếp** của hàm đó, không phải module: không chạy riêng, không `require` được, và trình soạn thảo có thể báo lỗi cú pháp ở file đầu và file cuối (dấu mở/đóng hàm bao nằm ở `00-…` và `27-…`).
- `screens/tabXxx.js`: mỗi file là **một hàm màn hình** `tabXxx`. Nó được chèn vào đúng chỗ có dòng đánh dấu `// @screen tabXxx` trong các file `NN-…js`. Mỗi màn hình phải được chèn đúng một lần; thiếu hoặc thừa thì lệnh ghép báo lỗi.
- **Sửa giao diện: sửa file trong thư mục này**, rồi chạy `npm run build:app` (trong `LuongHAK_Offline/`) để ghi lại `app.js`, và commit cả hai.
- Không sửa thẳng `app.js`. Test `tests/unit/app-parts.test.js` sẽ đỏ nếu `app.js` và thư mục này lệch nhau; kiểm tra nhanh bằng `npm run build:app -- --check`.
- Thêm file mới: đặt tên `NN-ten-khong-dau.js`, số thứ tự không trùng, kết thúc bằng một dòng trống. Điểm cắt phải nằm giữa hai câu lệnh cấp ngoài cùng của hàm bao.
- Lint và kiểm tra cú pháp chạy trên `app.js` đã ghép, không chạy trên từng đoạn. Thư mục này không vào bộ cài.

Các hàm trợ giúp không dùng trạng thái của app nằm ở `../ui/app-helpers.js` (file độc lập, nạp trước `app.js`).
