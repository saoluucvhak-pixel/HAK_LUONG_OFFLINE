# Khôi phục từ bản chụp SQLite ở thư mục sao lưu đã chọn (v2.1.7)

Khi `data.sqlite` hỏng/mất **và** bản chụp trong thư mục dữ liệu (`backups`) cũng mất/hỏng, màn khôi phục (trước đăng nhập) liệt kê bản chụp ở **hai nguồn**: Thư mục dữ liệu và Thư mục SQLite đã chọn (khóa `sqliteDir`, USB / ổ khác / NAS / Drive đồng bộ).

## Thứ tự xử lý
1. Mở app → màn "Không mở được file dữ liệu" → khối **Bản chụp SQLite tìm thấy**.
2. Nguồn không đọc được (USB chưa cắm, ổ mạng mất, không có quyền, quá thời gian chờ ~6 giây): app nêu **đường dẫn + nguyên nhân**; cắm lại rồi bấm **Quét lại**. Các nguồn còn lại vẫn dùng được.
3. **Kiểm tra** từng bản (chép về tệp tạm cục bộ, kiểm SHA-256 + integrity_check + số dòng) hoặc **Tìm bản hợp lệ mới nhất** (bỏ qua bản mới hơn mà hỏng, kèm lý do). App **không bao giờ tự khôi phục**.
4. **Khôi phục từ bản này** → hộp xác nhận (nguồn, thời điểm, số dòng, nơi cất bản cũ).
5. Bản `data.sqlite(+wal/shm)` và `data.json` cũ được cất cạnh với tên `*.truoc-khoi-phuc-<thời điểm>`. Nhật ký kiểm toán ghi nguồn `thư mục SQLite đã chọn: <đường dẫn>`. Nếu khôi phục nhầm: đóng app, chép lại các tệp `*.truoc-khoi-phuc-*` về tên gốc.

## Bảo đảm an toàn
- Chỉ khôi phục khi kho **không mở được** (lớp lưu trữ tự từ chối nếu kho đang lành).
- Bản ở thư mục đã chọn là **nguồn đọc-chỉ**: không sửa/xóa/dọn. Luôn chép về tệp tạm cục bộ rồi mới mở (không mở SQLite trực tiếp trên USB/mạng); tệp tạm luôn được dọn.
- Giao diện chỉ gửi `id` trong danh sách do tiến trình chính liệt kê; đường dẫn lạ / `..` bị từ chối.
- Bản của app **mới hơn** (schema lớn hơn) bị từ chối; hai bản cùng tên nhưng khác SHA-256 được cảnh báo.
- Ngắt điện / kill giữa chừng: dùng marker `restore-pending`, mở lại tự hoàn tất (đã kiểm với kill -9 thật tại 3 điểm).

## Kiểm tra bản ngoài máy khi đang dùng (đã đăng nhập)
Tab "Lịch & thư mục sao lưu" → dòng "Sao lưu SQLite": hiện **bản ngoài máy gần nhất** (đọc từ thư mục thật) và nút **Kiểm tra** đối chiếu SHA-256 từng bản với thư mục dữ liệu + kiểm đầy đủ bản mới nhất.

## Chưa làm / chưa nghiệm thu
Chưa nghiệm thu Windows thật (USB, NAS, Google Drive). Chưa làm: kiểm định kỳ khi mở app, diễn tập khôi phục không ghi, hàng đợi chép bù, giữ bản kiểu 7 ngày + 4 tuần + 12 tháng; mã hóa bản chụp (RISK-07, chủ chưa duyệt).
