# UI_WORKFLOW_GUIDE — Hướng dẫn quy trình sử dụng (v2.0.30)

Dành cho người dùng nghiệp vụ. Mô tả đúng những gì app làm hiện nay; không mô tả tính năng chưa có.

## 1. Menu (nhóm công việc)
Nhân sự (hồ sơ, hợp đồng/phụ lục, nghỉ phép/ốm) · Dữ liệu tính lương (Chấm công, Sản lượng, Ban dăm, Thưởng/Trừ, Tạm ứng, Suất cơm) · Tính và chốt lương (tính, kiểm tra, duyệt nếu bật phân quyền, chốt, kỳ đã chốt) · Thanh toán · **Cấp phát** (Sữa phúc lợi và Bảo hộ lao động dùng chung một màn phiếu và một màn báo cáo, chọn loại ở đầu màn) · Báo cáo · Danh mục · Hệ thống (công ty, chế độ sử dụng, sao lưu/khôi phục, kho năm).

## 2. Quy trình nhập đến thanh toán
1. **Nhập tay hoặc nhập Excel** → xem trước (báo lỗi theo số dòng Excel; dòng "Total/Tổng cộng" thuần bị bỏ, báo số dòng bỏ qua) → **Nháp**.
2. Sửa lỗi → **Lưu để tính lương** (đầu vào của kỳ được xác nhận dùng để tính).
3. **Tính lương** → **Kiểm tra** (cảnh báo/lỗi có mã, bấm để đi tới dữ liệu) → **Duyệt** nếu đang ở chế độ *Sử dụng phân quyền* (người xác nhận phải khác người lập) → **Chốt kỳ**.
4. **Thanh toán** theo bảng lương đã chốt.
Chế độ *Một người sử dụng*: Quản trị tự xác nhận, vẫn có nhật ký. Phiếu Cấp phát có trạng thái riêng (Nháp → Đã cấp; thu hồi/đổi cỡ bằng phiếu điều chỉnh), không đi qua bước tính lương.

## 3. Bộ lọc và ngày
- Thanh lọc có tìm kiếm, kỳ hoặc khoảng ngày, phòng ban/tổ, nhân viên, trạng thái; **Đặt lại**; "Hiển thị x / y dòng" và phạm vi đang áp.
- **Phòng ban/tổ lọc theo ngày của từng dòng** (ngày hạch toán, ngày tạm ứng, ngày ăn cơm), không theo tổ hiện tại. Dòng chưa có căn cứ lịch sử hiện ở "(Không có)".
- Cấp phát phân biệt **Ngày giao dịch** (ngày thu hồi/đổi cỡ, bộ lọc khoảng ngày), **Ngày cấp gốc** và **Tháng hưởng** (theo phiếu gốc).
- Mở chi tiết rồi quay lại giữ bộ lọc và trang đang xem.

## 4. Sửa sai
- Kỳ **chưa chốt**: sửa dữ liệu rồi Lưu để tính lương lại, tính lại.
- Kỳ **đã chốt**: bất biến. Sửa dữ liệu hiện tại không đổi bản chốt. Cần sửa: **Mở chốt** (ghi lý do, giữ phiên bản cũ), sửa, tính lại, chốt lại. Đổi phương pháp bù sau khi đã tính thì không cho chốt bản cũ — phải tính lại.
- Cấp phát: không sửa phiếu đã xác nhận; dùng **Thu hồi/Điều chỉnh** (chọn ngày giao dịch, không trước ngày cấp gốc).

## 5. Lưu trữ, sao lưu và khôi phục (từ v2.0.29)
- Dữ liệu chính nằm trong `data.sqlite` (thư mục dữ liệu của app). `data.json` là **bản xuất** (ghi lại ≤3 giây sau khi lưu, khi đóng app và trước mỗi sao lưu); không sửa tay. Không đặt thư mục dữ liệu trên OneDrive/Drive/NAS và không mở hai bản app cùng lúc.
- **Chỉ thấy "Đã lưu" khi lưu thành công.** Lưu lỗi thì giữ nguyên form và báo lỗi cụ thể.
- **Sao lưu**: tự động (đầu ngày, định kỳ, khi đóng, theo năm) và tay. Nếu app không xuất được dữ liệu hiện tại ra `data.json` (quyền ghi/ổ đĩa) thì **không tạo bản sao lưu** và báo lỗi, các bản tốt trước đó giữ nguyên. Kiểm tra thư mục dữ liệu và thử lại.
- **Full Backup** (gói ZIP: dữ liệu + chứng từ + kho năm + manifest SHA-256): tạo trước khi nâng cấp phiên bản, cất ra ổ khác. **Khôi phục** sang hồ sơ mới (máy mới không cần nhật ký máy cũ): Hệ thống → Khôi phục từ gói.
- **Xung đột `data.json` khác `data.sqlite`**: app nêu chênh lệch (bảng, số dòng) và không tự chọn; không dựa vào ngày giờ file. Chọn giữ SQLite (file lạ được cất sang `.bak`, không xóa) hoặc khôi phục từ bản sao lưu/Full Backup.
- **Kho năm**: Hệ thống → Lưu trữ theo năm. Chỉ chạy khi dữ liệu hiện tại đã được xuất đúng; lỗi thì thông báo và không đổi dữ liệu.
- **Quay lui phiên bản**: xem `docs/releases/v2.0.30.md` (mục Quay lui).

## 6. Giới hạn đã biết
Chưa thử cài/nâng cấp bằng Setup trên Windows thật; chưa thử máy in; lưu chậm hơn kho JSON khoảng 1,5 lần; chưa có gói sao lưu chứa snapshot SQLite.
