# V10.4 alpha.31 — số thập phân và quy trình nghiệm thu OCR

## Thay đổi người dùng thấy được

- CNN offline có thể ghép các chữ số tách rời khi thấy một dấu phân cách thập phân rõ: ví dụ `0,5`, `1,5`. Dấu chấm/phẩy được chuẩn hóa thành dấu phẩy; không đoán dấu bị mất. Chưa hỗ trợ chữ số dính nét, tên viết tay tiếng Việt hoặc mọi kiểu ký hiệu công.
- Vùng ảnh ô gốc đặt trước bảng và giữ trên màn hình khi cuộn. Nút **Ô cần kiểm tra tiếp theo** chuyển đến các ô có cảnh báo/gợi ý, không tự duyệt. Danh sách này là danh sách đối chiếu ban đầu; sửa ô không được hiểu là xác nhận nghiệm thu.
- Chọn gợi ý vẫn đi qua luồng sửa và học mẫu hiện có, không tự ghi chấm công hoặc thay công thức lương.
- **Xuất phiếu nghiệm thu OCR** tải JSON không có tên, mã nhân viên, tên tệp nguồn hoặc ảnh. Dữ liệu ô vẫn phải được giữ riêng. Phiếu lưu kết quả OCR ban đầu, không lấy giá trị đã sửa làm kết quả máy nhận dạng.

## Nghiệm thu thực tế (chưa thực hiện trong lần nâng cấp này)

1. Chuẩn bị 30–50 trang và ít nhất 3.000 ô trong tập kiểm thử cuối, có ảnh rõ và khó. Tài liệu gốc ở kho riêng, không nằm trong GitHub. Có thể bắt đầu nhỏ để sửa lỗi nhưng không coi là đủ nghiệm thu.
2. Nhóm theo tài liệu/người viết: cùng tài liệu, ảnh chụp lại hoặc người viết không nằm ở cả tập train/validation và test. Trường `group` phải phản ánh nhóm này; công cụ kiểm tra trùng nhóm nhưng không tự xác minh danh tính người viết.
3. Đọc ảnh bằng app, xuất phiếu. Điền `expected` từng ô theo giấy gốc (ô trống dùng chuỗi rỗng, số 0 dùng `"0"`), `aligned` true/false sau khi đối chiếu đúng người/ngày, `quality` clear/hard và `group` mã giả của nhóm. `needsReview` giữ nguyên trạng thái cảnh báo do máy xuất. `kind` chỉ đặt `real-private` khi thực sự là ảnh thực; chọn `synthetic` cho mẫu tổng hợp. Tập train/validation không được tính vào kết quả cuối.
4. Ghép các phần `pages` vào một tệp riêng; giữ ID trang duy nhất. Chạy từ thư mục app: `node scripts/ocr-acceptance.cjs C:/PRIVATE/input.json C:/PRIVATE/report.json`. Hai đường dẫn do người vận hành chọn ở kho riêng. Không đưa các tệp này vào repo.
5. Báo cáo chỉ có số lượng/tỷ lệ tổng hợp: đúng từng ô, sai bố cục, tỷ lệ cần duyệt, số gợi ý sai. Lệch người/ngày tính là sai dù giá trị số trùng. Dấu chấm/phẩy thập phân được coi tương đương; ô trống khác số 0. Phiếu thiếu đáp án/xác nhận bố cục bị từ chối.
6. Cổng kỹ thuật yêu cầu không có lỗi người/ngày, đúng >=99% ô rõ, đủ số mẫu và có trang khó. `READY_FOR_HUMAN_SIGNOFF` là đủ điều kiện xem xét, không phải đã nghiệm thu. Người phụ trách còn phải xem tỷ lệ duyệt tay/gợi ý sai, đo thời gian trên máy Windows mục tiêu, kiểm tra offline, màn xem trước nhập và kiểm thử hồi quy lương trước khi ký.

Mã thoát: 0 đủ điều kiện xem xét; 2 chưa đủ/không đạt; 1 đầu vào không hợp lệ. Công cụ không ghi ảnh hoặc dữ liệu nhân sự ra log. Nó dựa vào nhãn do người nghiệm thu cung cấp, không thay người kiểm tra độc lập.

## Phạm vi bằng chứng tự động

Các mẫu thập phân ghép từ ảnh chữ số MNIST công khai và dấu phân cách vẽ bằng máy. Chúng kiểm tra đường nhận dạng, bảo toàn OCR gốc, chọn gợi ý và giao diện; không đại diện cho số thập phân viết tay thực tế. Trọng số CNN không được huấn luyện lại trong lần này. Bước tách trang/chỉnh nghiêng hiện có được giữ nguyên; chưa công bố cải thiện độ chính xác bố cục trên ảnh thực.

Không thay `main`, công thức lương hoặc chính sách lưu dữ liệu. Mã OCR mới được lưu vào nhánh feature của HAK_OCR_ENGINE và được app khóa theo commit/SHA256.
