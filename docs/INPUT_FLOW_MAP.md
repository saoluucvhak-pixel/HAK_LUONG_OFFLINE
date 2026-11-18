# Bản đồ luồng nhập liệu + ca xấu (chỉ đạo 009, issue #98) — PR 009-A

Phạm vi PR này: **bản đồ luồng** và **ca xấu của đường nhập Excel** cho 6 bảng nhập liệu theo tháng. Nhập tay/dán, nhân sự/danh mục/cấp phát và "không mất bản nháp" thuộc PR 009-C; thông báo lỗi/xuất lỗi/đối chiếu tổng thuộc 009-B (mục dưới nói rõ cái gì ĐÃ có sẵn).

## 1. Các bảng nhập liệu trong app

| Bảng | Nhập tay | Excel | Dán (Ctrl+V) | Trường bắt buộc khi nhập Excel | Khóa nghiệp vụ (cùng khóa = cập nhật) | Quyền | Nháp → xác nhận |
|---|---|---|---|---|---|---|---|
| `chamcong` Bảng chấm công | có | Nhập Excel, Mẫu, "Thay toàn bộ kỳ" | có | Mã NV, Kỳ | Kỳ + Mã NV + Hình thức công (cùng khóa → gộp ô ngày) | `input.edit` + `import` | ghi vào bảng ngay là **Nháp**; **Lưu để tính lương** (kiểm `inputSafety`) mới đưa vào lương |
| `sanluong` Sản lượng | có | có | có | Ngày cân, KL hàng (Tấn) | Phiếu cân + Mã NV | `input.edit` + `import` | như trên (Nháp → Lưu để tính lương) |
| `bandam` Ban dăm xuất hàng | có (2 tab: theo tổ / trực tiếp NV) | có | có | Ngày cân, KL hàng (Tấn) = SỐ XE | Phiếu cân + Mã NV | `input.edit` + `import` | như trên |
| `psluong` Thưởng/Trừ | có | có | có | Mã NV, Ngày hạch toán | Số chứng từ + Mã NV (không có số → chỉ chặn dòng trùng y hệt) | `input.edit` + `import` | ghi thẳng (không có bước Nháp) |
| `ungluong` Tạm ứng | có | có | có | Mã NV, Ngày hạch toán, Tạm ứng | Số chứng từ + Mã NV | `input.edit` + `import` | ghi thẳng |
| `tiencom` Suất cơm | có | có | có | Mã NV, Ngày | Ngày + Mã NV | `input.edit` + `import` | ghi thẳng |

Chú thích đối chiếu với đề bài: **tăng ca** không phải bảng riêng — là các Hình thức công `TC`/`TC1–TC6` của chấm công; **phụ cấp** = nhãn ở ô ngày (VD `1QC`) + Danh mục phụ cấp; **hỗ trợ** là Danh mục (`dm_hotro`) và cấp phát bảo hộ ở màn Cấp phát (sẽ rà ở 009-C). Nhân sự/danh mục dùng `hr.edit`/`dm.edit`.

## 2. Các lớp kiểm tra và nơi chạy (tất cả chạy trong giao diện, trừ lớp 6)

1. **Đọc file** (`IMP.rowsFromAoa`, `core/importer.js`): tìm dòng tiêu đề trong 15 dòng đầu; tên cột khớp không phân biệt hoa/thường/dấu + bí danh; cột thừa bị bỏ; dòng trống bỏ; mỗi dòng nhớ **số dòng Excel thật** (`__line`).
2. **Chuẩn hóa ô** (`normCell`, `core/validate.js`): số tiền kiểu Việt (`500.000`, `1.234,5`, `500,000`, `500000đ`) → số chuẩn; ngày `dd/mm/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`, số tuần tự Excel → `yyyy-mm-dd`; kỳ `2026-9` → `2026-09`; mã/hình thức công cắt khoảng trắng, hình thức công viết hoa.
3. **Kế hoạch nhập** (`IMP.plan`): mỗi dòng ra một phân loại — `add`/`update`/`merged`/`duplicate`/`invalid`/`refError`/`locked`/`conflict` — kèm **lý do tiếng Việt nêu cột + giá trị** và cảnh báo (`warn`) cho trường hợp nhận nhưng bất thường. Kỳ đã chốt → `locked`.
4. **Xem trước** (`importPreview`, `app-src/04`): hiện tổng theo phân loại, bảng "Chi tiết các dòng cập nhật / không ghi" (cột *Dòng Excel*, *Phân loại*, *Lý do*, *Cảnh báo*), nút **⬇ Tải chi tiết** (xuất Excel `KiemTraNhapExcel.xlsx`), nút **Ghi N dòng** (N = chỉ dòng `add`+`update`).
5. **Ghi** (`REPO.importWorkbook`): kiểm lại quyền/kỳ đã chốt/trùng khóa/dữ liệu đã đổi ngay trước khi ghi; ghi **một giao dịch** (`txn`): lỗi hoặc lưu thất bại → hoàn tác cả bảng + nhật ký. Chỉ dòng `add`/`update` được ghi; dòng `invalid`/`refError`/`conflict`/`locked` KHÔNG BAO GIỜ vào dữ liệu.
6. **Lưu để tính lương** (`core/input-safety.js`, chỉ `chamcong`/`sanluong`/`bandam`): chặn dòng không có ngày/kỳ, khối lượng/số xe không phải số dương, trùng khóa, trộn phân bổ tổ/trực tiếp — thông báo nêu bảng, số dòng, số phiếu, giá trị.
7. **Tiến trình chính** (`store-save`): kiểm quyền + chính sách ghi + `baseSig` (chống ghi đè bản cũ) khi lưu cả kho — không biết nghiệp vụ từng bảng.

## 3. Ca xấu × bảng × kết quả (`tests/unit/import-bad-cases.test.js`, 64 đạt + 3 `todo`)

| Ca | Kết quả mong đợi | chamcong | sanluong | bandam | psluong | ungluong | tiencom |
|---|---|---|---|---|---|---|---|
| Chữ trong ô số (`abc`; chấm công `1.5.2`) | chặn, thông báo nêu cột + giá trị | **Đạt** | **Đạt\*** | **Đạt\*** | **Đạt** | **Đạt** | **HỎNG** (todo 009-1) |
| `500.000` / `1.234,5` / `500,000` / `  7 ` | chuẩn hóa đúng, không báo lỗi | n/a | **Đạt** (động cơ đọc `12,5`/`1.234,5`/`1.500.000` đúng) | **Đạt** | **Đạt** | **Đạt** | **Đạt** |
| Ngày `dd/mm/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`, số Excel | → `yyyy-mm-dd` | n/a | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** |
| Ngày sai (`hôm qua`, `31/02`, `2026/10/12`, trống) | chặn, nêu cột | Kỳ: **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** |
| Ngày ngoài kỳ đang xem | nhận vào đúng kỳ của dòng (nhập nhiều kỳ là chủ ý, #96) | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** |
| Mã `0005` / số `5` / ` NVA1 ` / `nva1` / mã lạ | `0005` nhận; `5`, `nva1`, mã lạ chặn nêu mã; khoảng trắng cắt | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** |
| Trùng y hệt / cùng khóa khác số liệu | `duplicate`; `conflict` cả hai, không ghi dòng nào (chấm công: gộp ô ngày) | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** | n/a (khóa Ngày+Mã NV; chưa có ca riêng) |
| Dòng "Tổng cộng" lẫn trong dữ liệu | chặn (thiếu ngày/kỳ), không ghi | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** |
| Cột đổi thứ tự / thừa / tên gần đúng / tiêu đề lệch xuống / thiếu cột bắt buộc | đọc đúng; thừa bỏ; số dòng Excel thật; thiếu → chặn nêu cột | (kiểm trên `ungluong`; cùng đường đọc cho mọi bảng) | | | | **Đạt** | |
| File rỗng / chỉ tiêu đề / sheet sai tên | 0 dòng, không lỗi, không ghi | (kiểm trên `ungluong`) | | | | **Đạt** | |
| File 10.500 dòng | đủ dòng, một giao dịch, < 20 s | (kiểm trên `ungluong`: ghi 10.500 dòng) | | | | **Đạt** | |
| NV "Đã nghỉ việc" | nhận kèm cảnh báo | — | — | — | **HỎNG** (todo 009-2) | **HỎNG** | **HỎNG** |
| Số tiền âm | nhận kèm cảnh báo | — | — | — | **HỎNG** (todo 009-3, thấp) | **HỎNG** | — |
| Số 0 ở số tiền | nhận | — | — | — | **Đạt** | **Đạt** | — |
| `Hình thức công` ` bt `/`Bt` | → `BT`, trùng như một | **Đạt** | — | — | — | — | — |
| File lẫn dòng tốt + dòng lỗi + mã lạ | chỉ dòng tốt được ghi, dòng lỗi không vào dữ liệu | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** |
| Lưu thất bại giữa nhập | hoàn tác toàn bộ + nhật ký | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** | **Đạt** |

\* Với sản lượng/ban dăm, bước nhập nhận chữ trong ô KL làm **nháp**; bước **Lưu để tính lương** (lớp 6) chặn có thông báo nêu số phiếu + giá trị (test khẳng định cả hai bước). Kỳ đã chốt: đã có `U-IMPK-*` (PR #96), không lặp lại.

## 4. Lỗi thật tìm được (chưa sửa — chờ quyết định)
- **009-1 (đáng kể): `Số suất cơm` nhận chữ (`hai`) không chặn, không cảnh báo; động cơ đọc `num("hai") = 0` → mất tiền cơm âm thầm.** `normCell` không kiểm cột này; lớp `inputSafety` không áp cho `tiencom`. Hướng sửa an toàn: chặn khi nhập (không đụng công thức) — nhưng nằm ở `core/validate.js`/`core/importer.js` (nhóm được bảo vệ bằng CI) nên cần quyết định trước.
- **009-2:** NV `Đã nghỉ việc` nhận tạm ứng/thưởng/cơm không cảnh báo (có thể hợp lệ khi thanh toán cuối cùng, nhưng người dùng không được báo).
- **009-3 (thấp):** số âm ở Tạm ứng/Thưởng nhận không cảnh báo (có thể là hoàn ứng).
Ba test `todo` giữ làm tài liệu sống (hành vi mong muốn); khi sửa thì gỡ `todo`.

## 5. Đã có sẵn cho mục 3 và 5 của đề bài (009-B sẽ bổ sung phần còn thiếu)
- Có: bảng chi tiết dòng không ghi (dòng Excel, phân loại, lý do nêu cột/giá trị) + **⬇ Tải chi tiết** ra Excel; tổng theo phân loại; kỳ báo "Đã ghi N dòng (X mới, Y cập nhật, gộp Z)".
- Chưa kiểm/chưa có: danh sách lỗi dạng *file để sửa rồi nhập lại* (hiện là bảng chi tiết, không phải mẫu nhập lại); đối chiếu **tổng tiền** đã nhập so với tổng trong file nguồn trên màn hình; thông báo có "sửa thế nào" cho mọi loại lỗi.

## 6. Chưa kiểm
Nhập tay/dán, nhân sự/danh mục/cấp phát, mất bản nháp khi đóng app/chuyển màn (009-C); giao diện thật (chỉ kiểm lớp `core` + `REPO` + `txn` thật của app); Windows thật; file Excel thật nhiều sheet/ô gộp/công thức (test dùng mảng đã đọc, không đọc `.xlsx`); "nhân viên đổi tổ giữa tháng" ở luồng nhập (chưa có ca riêng; bộ lọc phòng ban theo ngày đã có test ở F01).
