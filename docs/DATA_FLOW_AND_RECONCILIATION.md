# DATA_FLOW_AND_RECONCILIATION — Luồng dữ liệu và đối chiếu

Trạng thái: 18/11/2026, v2.0.29. Mô tả điều đã kiểm chứng bằng mã và test; mục nào chưa kiểm chứng được ghi rõ "chưa kiểm chứng". Khóa nghiệp vụ lấy từ `core/importer.js` (KEYS); đường ghi từ `docs/WRITE_PATHS_INVENTORY.md`.

## 1. Đường ghi duy nhất
```
Màn hình (sửa db trong bộ nhớ) → saveNow() → IPC store-save
  → main: write-policy.check (đăng nhập, quyền theo bảng, kỳ chốt, phiếu đã xác nhận, đổi chế độ…)
  → storage.save (kho SQLite: delta một giao dịch; data.json xuất trễ)  → trả true | lỗi
Lưu trữ/khôi phục kho năm (tiến trình phụ): syncJson trước → ghi data.json bằng kho JSON → adoptJson nhận lại vào SQLite
```
Giao dịch nhiều bước (`txn()` ở giao diện) chụp các bảng liên quan, ghi MỘT lần lưu; lưu thất bại hoặc bị từ chối ⇒ hoàn tác trong bộ nhớ. Chỉ báo "đã lưu" khi `store-save` trả `true`.

## 2. Bảng nguồn → xử lý → kết quả

| Nhóm | Màn nhập chính | Bảng gốc (khóa) | Trạng thái | Xử lý | Kết quả/báo cáo | Phép đối chiếu |
|---|---|---|---|---|---|---|
| Nhân sự | Nhân sự | `nhanvien` (Mã NV); `hopdong` (Mã NV+Số HĐLĐ); `chitiethd` (…+Hiệu lực từ); `canhan`, `thanhtoan` (Mã NV+Hiệu lực từ); `congtac` | Nháp/Chờ duyệt/Đã duyệt khi bật phân quyền | `HRM.hienHanh(db, mã, NGÀY)` tra hợp đồng/phụ lục/tổ tại ngày | tổ ở bộ lọc (F01), phân bổ sản lượng, Cấp phát (tổ tại ngày cấp) | tổ của một dòng không bao giờ lấy tổ hiện tại; thiếu căn cứ → "(Không có)" |
| Chấm công / nghỉ | Chấm công; Nghỉ phép; Nghỉ ốm | `chamcong` (Kỳ+Mã NV+Hình thức công); `nghiphep`/`nghiom` (Mã NV+Số HĐLĐ+Từ ngày); `quyenloiphep` (…+Năm áp dụng) | dữ liệu gốc → "Đã lưu để tính lương" | `leaveCheck`, `leave-reconciliation` (PN, nghỉ không lương/ốm/thai sản, định mức cộng dồn) | bảng lương (công), Đối soát chấm công | PN khớp đơn đã duyệt; vượt định mức bị chặn; đơn chờ/từ chối chỉ nhắc |
| Sản lượng | Sản lượng (phiếu cân) | `sanluong` (Phiếu cân+Mã NV) | Nháp/Đã lưu (`inputReview`) | `ALLOC`: chia theo tổ/người, loại NV vắng; chuyển kỳ T9→T10 (`production-reperiod`/`carry`) | Excel phân bổ, bảng lương | gốc = đã phân bổ + chưa phân bổ; công=0 không có NV vắng → danh sách cần xác nhận (`attendanceReview`) |
| Ban dăm | Ban dăm xuất hàng | `bandam` (Phiếu cân+Mã NV), lưu riêng theo tổ/trực tiếp | Nháp/Đã lưu theo từng chế độ | cùng `ALLOC` | cùng Excel phân bổ | một phiếu không tính hai lần (khóa phiếu) |
| Thu nhập/khấu trừ | Thưởng/Trừ; Tạm ứng; Suất cơm; danh mục phụ cấp/tăng ca/hỗ trợ/bảo hiểm/thuế | `psluong`, `ungluong` (Số chứng từ+Mã NV); `tiencom` (Ngày+Mã NV); `dm_*` (Mã+Hiệu lực từ) | dữ liệu gốc → Đã lưu | `engine.tinhBangLuong` (công thức theo danh mục hiệu lực) | bảng lương, sổ khoản thiếu, đối soát theo nhân viên | bảo hiểm: tổng = thành phần; khoản trừ vượt thu nhập giữ số thiếu |
| Lương / chốt | Tính lương → Duyệt (nếu bật) → Chốt kỳ | `kyluong` (snapshot nguyên vẹn + checksum), `kyluong_lichsu` | bản tính → duyệt → chốt → mở chốt có lý do | `payroll-close`: chốt không tính lại; đổi phương pháp bù sau tính thì từ chối chốt | báo cáo lương đọc bản chốt | sửa dữ liệu hiện tại không đổi bản chốt; danh mục hiện hành không thay số/tên lịch sử |
| Thanh toán | Chứng từ chi | chứng từ thanh toán gắn bản chốt | theo bản chốt | `payment-ledger` | còn trả/đã trả | không tạo thêm khấu trừ đã có trong bảng lương |
| Cấp phát | Cấp phát (Sữa phúc lợi, Bảo hộ) | `benefitStandards`, `benefitAssignments`, `benefitPpeItems`, `benefitIssues` (Mã phiếu), `benefitAdjustments` (Mã điều chỉnh, chỉ thêm) | Nháp → Đã cấp → thu hồi/đổi cỡ bằng điều chỉnh | `core/benefits-*.js` | Tổng hợp/Chi tiết = Excel = PDF cùng bộ lọc | cấp − thu hồi = thực cấp theo vật tư/đơn vị/cỡ; định mức sữa tính một lần/nhân viên/tháng |
| Hồ sơ lưu | Sao lưu; Lưu trữ theo năm; Kho chứng từ OCR | `data.sqlite` + `data.json` (bản xuất), `backups/`, kho năm, chứng từ | — | Full Backup/restore (`fullbackup`, `restore`), kho năm (`year-archive`) | khôi phục sang hồ sơ mới không cần nhật ký máy cũ | SHA-256 từng gói; sau restore số dòng khớp |

## 3. Nguyên tắc đối chiếu đã có test
- Bộ lọc, tổng theo bộ lọc, Excel, PDF và in dùng chung một lượt quét/báo cáo (F01: `ui/input-dept.js`; Cấp phát: `C.benefits.report`; Excel phân bổ: F02 `ui/pbkl-rules.js` cùng API `E.hieuLuc` của tính lương).
- Kỳ đã chốt: mở, đổi bộ lọc, in, xuất không tính lại; xuất đọc danh mục lưu trong bản chốt.
- Lưu: SQLite bị kill ngay sau khi lưu vẫn đủ dữ liệu (`sqlite-default.cjs`, cả Windows CI); `data.json` bị sửa ngoài app thì báo xung đột.

## 4. Chưa kiểm chứng / còn thiếu
- Phép đối chiếu tự động "tổng người = tổng tổ = tổng kỳ" cho mọi báo cáo lương chưa có một test xuyên suốt; hiện kiểm theo từng báo cáo.
- Chưa chuẩn hóa dữ liệu thành bảng phiếu gốc/dòng phân bổ riêng trong SQLite (lược đồ v1 lưu dòng nguyên vẹn).
- Chưa có kiểm thử trên Setup Windows thật.
