# HAK · TÍNH LƯƠNG (offline)

Ứng dụng tính lương chạy hoàn toàn offline trên máy tính — dữ liệu nằm trong trình duyệt của máy (IndexedDB), không gửi ra ngoài.
Công thức tính lương lấy từ hệ thống Google Apps Script **LUONG_HAK** (chấm công, lương thời gian/sản lượng/tăng ca, phụ cấp, hỗ trợ, tiền cơm, BHXH/BHYT/BHTN/KPCĐ, thuế TNCN luỹ tiến).

## Làm lương một kỳ
1. **Tổng quan → Nạp danh mục mẫu** (lần đầu cho mỗi đơn vị) rồi chỉnh danh mục ở **Bảng dữ liệu**.
2. **Nhân sự**: mã tiền lương, lương thỏa thuận, mã tăng ca, mã phụ cấp, mã BHXH, mã TNCN của từng người.
3. **Chấm công / Sản lượng / Tiền cơm / Thưởng – Tạm ứng**: nhập tay hoặc **⬆ Nhập Excel** (tự nhận bảng theo tiêu đề cột).
4. **Tính lương** → Bảng lương, BHXH, Thuế TNCN → **Xuất Excel**.

## Lưu ý
- Sao lưu cuối mỗi kỳ: Cài đặt → Sao lưu.
- Danh mục có hiệu lực theo ngày — đổi mức lương = thêm dòng mới, dòng cũ đặt "Hiệu lực đến".
- Đối chiếu lại mức giảm trừ gia cảnh, biểu thuế và tỷ lệ bảo hiểm theo quy định hiện hành.
