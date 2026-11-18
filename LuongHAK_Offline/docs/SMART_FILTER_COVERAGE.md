# Smart Filter — phủ theo từng màn (issue #92 mục 3 / 004.3)

Khảo sát bằng Electron thật, dữ liệu giả (3 nhân viên), tài khoản quản trị. "Có SF" = màn có ô `[data-sf-q]` + thanh lọc `.sf` của HAK Smart Filter.
Test từng màn: `tests/e2e/input-filter-dept.cjs` (chạy trong CI job `electron-e2e`, Windows).

## 1. Màn CÓ Smart Filter và ĐÃ có test từng màn (7 màn)

Mỗi màn được kiểm: (a) hiển thị đủ kỳ; (b) lọc từ khóa → "Hiển thị 1/3 dòng", dòng khác biến mất; (c) chọn nhiều Phòng ban trong "Bộ lọc nâng cao" → Áp dụng → 1/3 dòng, thanh lọc hiện nhãn; (d) Đặt lại → đủ dòng; (e) Excel xuất theo bộ lọc chỉ chứa dòng đang hiển thị; (f) sang màn khác rồi quay lại vẫn giữ bộ lọc; (g) toàn bộ thao tác KHÔNG làm đổi dữ liệu đã lưu (so khớp nguyên văn `hakStore.load().text`); (h) không lỗi JavaScript.

| Màn | Từ khóa | Chọn nhiều | Giữ khi quay lại | Không ghi dữ liệu | Excel theo lọc |
|---|---|---|---|---|---|
| nhansu (Danh sách nhân viên) | Đạt | Đạt | Đạt | Đạt | Đạt (nút "Excel danh sách đang lọc") |
| chamcong | Đạt (Enter để áp dụng) | Đạt | Đạt | Đạt | Đạt |
| sanluong | Đạt | Đạt | Đạt | Đạt | Đạt |
| bandam (tab "Phân bổ trực tiếp nhân viên") | Đạt | Đạt | Đạt | Đạt | Đạt |
| psluong | Đạt | Đạt | Đạt | Đạt | Đạt |
| ungluong | Đạt | Đạt | Đạt | Đạt | Đạt |
| tiencom | Đạt | Đạt | Đạt | Đạt | Đạt |

Chưa kiểm ở các màn này: mở chi tiết một dòng (hộp thoại) rồi quay lại — mới kiểm "sang màn khác rồi quay lại".

## 2. Màn CÓ Smart Filter nhưng CHƯA có test từng màn

capphat; dm (Danh mục); rp_thanhtoan, rp_cttt, rp_soct, rp_ck, rp_tm, bangtinh, rp_tonghop, rp_ctnv, rp_tncn, rp_pb, baocaoluong.
Các báo cáo lương đã có test khớp bảng/Excel/PDF sau lọc (`docs/REPORT_CATALOG_AND_PARITY.md`) nhưng CHƯA có test "giữ bộ lọc khi quay lại" và "lọc không ghi dữ liệu" theo từng màn.

## 3. Màn CHƯA có Smart Filter

rp_sl, rp_bd (phiếu gốc), slips (phiếu lương), rp_ns, rp_th, rp_tu, rp_com (báo cáo cũ có ô nhập riêng), ktbl, nvns, ocrlib, baocao (báo cáo nhân sự).
Không áp dụng (không có bảng dữ liệu): home, ocr, luong, kyluong, doichieu, caidat, backup, huongdan.
Đề xuất chuyển sang Smart Filter dùng chung: phối hợp với #99 (010) trước khi viết mã; 004.3 không đổi mã sản phẩm.

## 4. Lỗi sản phẩm tìm thấy
Không có lỗi sản phẩm mới. Lưu ý hành vi (không phải lỗi): ô tìm của Chấm công chỉ áp dụng khi nhấn Enter; bộ lọc Phòng ban của Sản lượng/Ban dăm theo cột "Mã phòng ban" của chính dòng đó.

## 5. Chưa nghiệm thu
Windows thật (chỉ chạy Linux xvfb + CI); bố cục/độ đọc của thanh lọc ở 1366×768 (thuộc #97); mục 2 ở trên.
