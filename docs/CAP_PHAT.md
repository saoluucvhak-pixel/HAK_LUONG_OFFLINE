# Cấp phát sữa phúc lợi và bảo hộ lao động — hướng dẫn ngắn

## Vị trí
- **Nghiệp vụ nhân sự → Cấp phát**: *Phiếu cấp phát* (lập, nhập Excel, xác nhận, thu hồi) và *Báo cáo cấp phát* (Tổng hợp / Chi tiết). Bộ chọn **Tất cả / Sữa phúc lợi / Bảo hộ lao động**.
- **Danh mục → Cấp phát**: *Tiêu chuẩn phúc lợi* (sữa) và *Đồ bảo hộ lao động*.
- **Hồ sơ nhân viên → chi tiết hợp đồng → Tiêu chuẩn phúc lợi**: gắn tiêu chuẩn theo ngày hiệu lực và xem các phiếu của người đó (bấm mã phiếu để mở, quay lại hồ sơ).

## Lập phiếu bằng tay
1. Chọn loại → **Lập phiếu**. Một phiếu thuộc một loại; một ngày có thể lập nhiều phiếu.
2. Nhập thông tin phiếu (ngày giao, địa điểm, lý do), thêm từng dòng hoặc **Điền cho cả tổ** (chọn tổ, mặt hàng, cỡ, số lượng) rồi sửa từng người.
3. **Lưu nháp** → người có quyền xác nhận bấm **Xác nhận cấp phát** (chế độ phân quyền: phải khác người lập).
4. Phiếu đã xác nhận không sửa; dùng **Thu hồi / điều chỉnh** (một phần được; không vượt số còn lại; bảo hộ có thể **đổi cỡ**).

## Nhập Excel
**Tải mẫu** (sữa hoặc bảo hộ) → nhập dữ liệu ở dòng mới (dòng nền vàng là ví dụ, tự bị bỏ qua) → **Nhập Excel** → xem trước theo phiếu → sửa lỗi theo số dòng Excel → **Lưu nháp**. Cột Mã phiếu, Mã NV, Mã mặt hàng/vật tư, Kích cỡ là Text (giữ số 0 đầu). Nhập lại cùng file không cộng số lượng lần hai.

## Báo cáo
Tổng hợp: theo tổ/phòng ban và mặt hàng (bảo hộ có thể tách theo cỡ), đã cấp − thu hồi = thực cấp, sữa có thêm định mức, còn lại, vượt; cộng riêng theo đơn vị tính. Chi tiết: từng lượt cấp hoặc thu hồi, bấm mã phiếu để mở chứng từ gốc. Phiếu nháp không tính. Excel và PDF dùng đúng bộ lọc và số liệu đang hiển thị.

## Phạm vi
Ghi nhận cấp phát thực tế. Tồn kho, chu kỳ thay thế và định mức bảo hộ theo chức danh cần quy chế riêng.

## Ngày giao dịch thu hồi và đổi cỡ (từ v2.0.28)
- Khi ghi thu hồi/đổi cỡ, chọn **Ngày giao dịch** đúng ngày phát sinh. Mặc định là ngày hiện tại theo giờ Việt Nam; không được trước ngày cấp gốc.
- Ngày giao dịch dùng để lọc khoảng ngày trên báo cáo, Excel và PDF. **Ngày cấp gốc**, **tháng hưởng**, tổ/phòng ban của dòng cấp gốc vẫn giữ nguyên.
- Ví dụ: cấp ngày 20/10, thu hồi ngày 02/11 → lọc giao dịch tháng 11 thấy lượt thu hồi; tháng hưởng vẫn là tháng 10. Nếu lọc thêm tháng hưởng 11 thì lượt này không thuộc phạm vi đó.
- Thời điểm thao tác được giữ riêng phục vụ tra cứu, hiển thị giờ Việt Nam. Dữ liệu cũ chưa có ngày giao dịch sẽ lấy ngày theo giờ Việt Nam từ thời điểm đã lưu; không ghi sửa lại chứng từ cũ.
- Phiếu cũ thu hồi toàn bộ không có thời điểm thu hồi vẫn hiển thị theo ngày cấp gốc kèm chú thích thiếu ngày thu hồi; không suy đoán ngày.

## Kiểm tra trước bàn giao
1. Cấp tháng 10, thu hồi tháng 11; đối chiếu Tổng hợp/Chi tiết và Excel/PDF cùng bộ lọc.
2. Nhân viên chuyển tổ sau khi cấp: lượt thu hồi/đổi cỡ vẫn thuộc tổ đã lưu ở dòng cấp gốc.
3. Sao lưu toàn bộ, khôi phục sang hồ sơ mới; đối chiếu mã phiếu, số lượng và lịch sử điều chỉnh.
4. Sữa tính định mức theo nhân viên/tháng hưởng. Người chuyển tổ trong tháng có dòng định mức riêng, không tự phân đôi định mức theo tổ.
