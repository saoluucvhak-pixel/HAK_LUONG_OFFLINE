# Nghiệm thu kỹ thuật v2.0.28

**Kết luận: Chỉ đủ thử nghiệm có kiểm soát.** Hai lỗi F01, F02 và lỗi ngày giao dịch Cấp phát đã sửa, có test hồi quy và đã chạy đạt trên máy phát triển Linux và runner Windows của CI. Chưa đủ điều kiện bàn giao chính thức vì chưa có bằng chứng cài mới/nâng cấp bằng Setup trên tài khoản Windows riêng, chưa thử máy in thật, và một số mục trong ma trận mục 4 mới chỉ có test liên quan, chưa đối chiếu từng ý. Toàn bộ dữ liệu thử là dữ liệu giả.

## 1. Bảng lỗi

| Mã | Mức | Tái hiện | Nguyên nhân | Tệp/hàm | Test xác minh | Trạng thái |
|---|---|---|---|---|---|---|
| CP-DATE | Trung bình | Thu hồi 01:00 giờ VN ngày 01/11 (lưu 18:00 UTC ngày 31/10) bị lọc vào ngày 31/10 | Dùng ngày UTC của dấu thời gian làm ngày giao dịch | `core/benefits-ledger.js` (`adjustmentDate/Clock`), `core/benefits-rules.js` (`adjustmentProblem`), `app-src/28-cap-phat.js` | `tests/unit/benefit-transaction-date.test.js` (4); `tests/e2e/capphat.cjs` | Đã sửa (PR #69) |
| F01 | Trung bình | A ở tổ 02.01 tháng 10, chuyển 02.02 từ 01/11. Lọc tạm ứng tháng 10 theo tổ 02.01 trên v2.0.27: 1 dòng (200.000) thay vì 3 dòng (350.000); lọc tổ 02.02 hiện 2 dòng chứng từ tháng 10. Bằng chứng: `docs/v2.0.28/f01-e2e-truoc-khi-sua-v2.0.27.txt` | `inputPbMap()` gọi `HRM.hienHanh(db, ma, null)`: tổ hôm nay áp cho mọi dòng. Chấm công còn lấy tổ từ bảng lương nên cần `payroll.view` và tính lương thành công | `ui/input-dept.js` (mới, `create().at(ma, ngày)`), `app-src/05-o-nhap-bo-loc.js` (`inputPass`, `inputPbMap`), `app-src/07-bang-nhap-lieu.js` (bộ lọc chấm công, danh sách tổ) | `tests/unit/input-dept.test.js` (6, gồm lỗi cũ, kỳ trước/sau chuyển tổ, sát mốc 31/10–01/11, thiếu căn cứ); `tests/e2e/input-filter-dept.cjs` (10, vai trò Nhân sự không có `payroll.view`): sau sửa `docs/v2.0.28/f01-e2e-sau-khi-sua.txt` | Đã sửa |
| F02 | Thấp–trung bình | `exportPBKL` lấy SP bằng dòng cuối, BD dòng đầu của danh mục: xuất tháng 9 ghi đơn giá 200, sàn 20 của tháng 10 trong phần giải thích | Chọn theo thứ tự mảng, không theo hiệu lực | `ui/pbkl-rules.js` (mới, dùng `E.hieuLuc` của engine), `app-src/18-bao-cao-luong.js`, `ui/pbkl-xlsx.js` | `tests/unit/pbkl-rules.test.js` (9), `tests/unit/v94-payroll-reports.test.js` U-F02-10 (gọi `exportPBKL` thật, chặn đầu vào workbook) | Đã sửa. Chưa chứng minh tổng tiền bảng lương sai do đoạn này |

Phạm vi sửa F01: lọc, tổng theo bộ lọc, Excel, PDF và in dùng chung một lượt quét (`scan()`), nên dùng cùng quy tắc. Dòng không có ngày hoặc chưa có hợp đồng/phụ lục hiệu lực tại ngày đó có tổ rỗng, hiện ở mục "(Không có)", không gán tổ hiện tại. Tổ của dòng chấm công lấy tại ngày cuối kỳ (xấp xỉ cho người chuyển tổ giữa tháng; chưa có quy tắc chủ sở hữu duyệt cho trường hợp này).

Phạm vi sửa F02: kỳ chưa chốt dùng danh mục hiện hành; kỳ đã chốt chỉ đọc danh mục đã lưu trong bản chốt. Nhiều mức hiệu lực trong kỳ được liệt kê từng mức, app tính lương theo mức hiệu lực mới nhất của kỳ (đúng như engine). Bản chốt thiếu danh mục thì in "Thiếu căn cứ", không tính lại. Kỳ đã chốt vẫn không in đơn giá (giữ hành vi cũ, test `payroll-close` U-… kiểm tra điều này).

## 2. Nguồn dữ liệu và khóa nghiệp vụ

Khóa theo `core/importer.js` (KEYS); Cấp phát theo `core/benefits-*.js`. Nơi ghi chính là màn nhập chính; các màn khác mở lại cùng bản ghi.

| Nhóm | Màn nhập chính | Bảng dữ liệu gốc | Khóa nghiệp vụ | Trạng thái | Đối chiếu/báo cáo dùng lại |
|---|---|---|---|---|---|
| Nhân viên/hợp đồng | Nhân sự (hồ sơ, hợp đồng, phụ lục) | `nhanvien`, `canhan`, `thanhtoan`, `hopdong`, `chitiethd`, `congtac` | Mã NV; Mã NV+Số HĐLĐ; Mã NV+Số HĐLĐ+Hiệu lực từ | Nháp/Chờ duyệt/Đã duyệt (chế độ phân quyền) | Tổ theo ngày qua `HRM.hienHanh(…, ngày)`; đọc cả ở bộ lọc, phân bổ sản lượng, cấp phát |
| Chấm công/nghỉ | Chấm công; Nghỉ phép/ốm | `chamcong`, `nghiphep`, `nghiom`, `quyenloiphep` | Kỳ+Mã NV+Hình thức công; Mã NV+Số HĐLĐ+Từ ngày | Dữ liệu gốc → Đã lưu để tính lương | Kiểm tra nghỉ phép (`leaveCheck`), Đối soát chấm công |
| Sản lượng | Sản lượng (phiếu cân) | `sanluong` | Phiếu cân+Mã NV | Nháp/Đã lưu (`inputReview`) | Phân bổ theo tổ/trực tiếp (`ALLOC`), Excel phân bổ, bảng lương |
| Ban dăm xuất hàng | Ban dăm | `bandam` | Phiếu cân+Mã NV; chế độ theo tổ/trực tiếp lưu riêng | Nháp/Đã lưu, trạng thái theo chế độ | Cùng luồng phân bổ; chống tính hai lần bằng khóa phiếu |
| Thu nhập/khấu trừ | Thưởng/Trừ, Tạm ứng, Suất cơm; danh mục phụ cấp, tăng ca, hỗ trợ, bảo hiểm, thuế | `psluong`, `ungluong`, `tiencom`, `dm_*` | Số chứng từ+Mã NV (nếu có số); Ngày+Mã NV (cơm) | Dữ liệu gốc → Đã lưu | Bảng lương, sổ khoản thiếu, đối soát theo nhân viên |
| Lương/thanh toán | Tính lương, Duyệt (nếu bật phân quyền), Chốt kỳ, Chứng từ chi | `kychot` (bản chốt), chứng từ thanh toán | Kỳ | Bản tính → Duyệt → Chốt → Thanh toán; mở chốt có ghi vết | Báo cáo lương đọc bản chốt, không tính lại |
| Cấp phát | Cấp phát (sữa, bảo hộ); danh mục tiêu chuẩn/vật tư | `benefitStandards`, `benefitAssignments`, `benefitPpeItems`, `benefitIssues`, `benefitAdjustments` | Mã phiếu (phiếu); Mã điều chỉnh (thu hồi/đổi cỡ, chỉ thêm) | Nháp → Đã cấp → Thu hồi (chỉ thêm điều chỉnh) | Báo cáo Tổng hợp/Chi tiết = Excel = PDF; hồ sơ nhân viên mở lại phiếu |
| Hồ sơ lưu trữ | Sao lưu, Lưu trữ theo năm, Kho chứng từ OCR | `data.json`, `backups`, kho năm, kho chứng từ | SHA-256 từng gói | — | Khôi phục sang hồ sơ máy mới không cần nhật ký máy cũ |

Chưa kết luận "đã chống trùng" cho toàn bộ bảng chỉ vì có khóa; xem trạng thái từng mục ở mục 4.

## 3. Kết quả đã chạy

| Kiểm tra | Môi trường | Kết quả |
|---|---|---|
| Lint, `build:app --check`, `npm run check` | Linux, máy phát triển | Đạt, không cảnh báo |
| Unit/integration/regression (`npm test`) | Linux | 1041/1041 đạt (có 6 + 9 + 1 test mới cho F01/F02) |
| Electron toàn bộ (`run-e2e.js`) | Linux (Xvfb) | 297/297 đạt |
| Electron Cấp phát (`capphat.cjs`) | Linux (Xvfb) | 42/42 đạt |
| Electron bộ lọc theo tổ (`input-filter-dept.cjs`), vai trò Nhân sự | Linux (Xvfb) | 10/10 đạt; trên v2.0.27 cùng kịch bản: 3 mục không đạt (xem bằng chứng) |
| CI của đúng commit (Windows: `electron-e2e`, `workspace-visual`, Build bộ cài) | GitHub Actions | Ghi ở phần bàn giao sau khi chạy |

## 4. Ma trận kiểm thử nghiệp vụ nhiều kỳ

Trạng thái: **Đạt** = có test chạy đạt đối chiếu đúng ý; **Liên quan** = có test về chủ đề nhưng chưa đối chiếu từng ý trong lần này; **Chưa có** = chưa có test riêng.

| # | Nội dung | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Nhập cùng file hai lần không nhân đôi | Đạt (chấm công, cấp phát) | `importer-chamcong` U-CC-01; `core.test` "nhập chấm công 2 lần"; `capphat.cjs` nhập lại phiếu Excel |
| 2 | Bổ sung, thay thế kỳ, sửa, xóa | Đạt (chấm công) / Liên quan (các bảng khác) | U-CC-05..07; `input-review.test` |
| 3 | Bỏ dòng tổng khi nhập; báo số dòng nhận/bỏ/lỗi | **Đạt** | `core/input-batch.js` `isProductionTotal`: chỉ nhãn ĐÚNG BẰNG total/tổng/tổng cộng và không có ngày cân, biển số, mã tổ, mã NV, NV vắng; test `alpha59-null-and-total` (thêm ca phiếu thật `TOTAL-123`, `Tổng hợp 5`, `Total A`, `Total` có biển số/mã NV vẫn được giữ). Số dòng bỏ qua hiển thị ở `app-src/06-danh-muc-sua.js` |
| 4 | Mã NV số 0 đầu; mã lạ/trùng tên báo đối chiếu | Đạt | `template-text-codes`, `reconcile-matching`, `capphat.cjs` (mã 0005) |
| 5 | Hai tháng, 12/1: sửa/xóa một kỳ không tác động kỳ khác | Liên quan | `benefit-transaction-date` (qua năm), `year-backup`, `production-carry`; chưa có ca riêng cho khóa phiếu có ngày/kỳ |
| 6 | Chuyển sản lượng T9 → T10 | Đạt | `production-reperiod`, `production-carry` (đơn giá/quy chế T10, không tính hai kỳ, dấu vết nguồn) |
| 7 | Công bằng 0, không có NV vắng → danh sách xác nhận | Liên quan | `production-alloc`, `v94-payroll-reports` (attendanceReview) |
| 8 | NV vắng/nghỉ duyệt, vào/ra giữa tháng, đổi phụ lục/tổ | Đạt một phần | `production-alloc`, `phuluc-q22`, F01 (đổi tổ) |
| 9 | Phép: PN có công, vượt định mức, gối năm, đơn hủy | Liên quan | `leave-check` U-LV-01..07, `run-e2e.js` |
| 10 | Tăng ca/phụ cấp/hỗ trợ: cha–con, hiệu lực | Liên quan | `engine`, `v102-overtime-master`, `formula-*`; chưa đối chiếu từng ca cha–con trong lần này |
| 11 | Bảo hiểm: tổng bằng thành phần; truy thu không hai lần | Liên quan | `insurance-total`, `bh-report`, `quy-che-2026` |
| 12 | Trừ vượt thu nhập: giữ số thiếu; KT-20 | Liên quan | `payroll-deficit`, `engine` |
| 13 | Kỳ đã chốt: xem/lọc/in/xuất không đổi số | Liên quan | `payroll-close`, `v94-payroll-reports` U-F02-10 (xuất bản chốt dùng danh mục đã lưu) |
| 14 | Đổi phương pháp bù sau tính: không cho chốt | Liên quan | Kiểm thử chốt bất biến/đổi phương pháp bù đã đạt ở PR #69 |
| 15 | Lỗi lưu, đóng nhanh, renderer crash, khôi phục thất bại | Đạt | `storage-failures` U-STO-11..14, `restore` U-RS-06..08, `hr-save-close.cjs` |
| 16 | Cấp phát nhiều tháng, thu hồi từng phần, đổi cỡ, chuyển tổ | Đạt | `dispensing-core`, `dispensing-transfer`, `benefit-transaction-date`, `capphat.cjs` |
| 17 | Sao lưu/khôi phục sang hồ sơ mới | Đạt (Cấp phát, dữ liệu Full Backup) / Liên quan (checksum từng nhóm, kho chứng từ) | `capphat.cjs`, `fullbackup`, `restore`, `restore-first-run.cjs` |
| 18 | Lưu trữ theo năm, không cộng trùng | Liên quan | `year-archive`, `year-archive.cjs` |

Mục "Liên quan" và "Chưa có" chưa được đối chiếu từng ý; không dùng để kết luận không còn lỗi.

## 5. Bố cục và quy trình sử dụng

Đã kiểm trực tiếp trên Electron với dữ liệu giả: màn Cấp phát (hộp thoại thu hồi có ô Ngày giao dịch), bộ lọc Phòng ban của Tạm ứng và Thưởng/Trừ. Ảnh: `docs/v2.0.28/` và các ảnh `tests/e2e/screenshots` (CI). Kiểm tra giao diện sáng/tối và hai kích thước cửa sổ chạy ở job `workspace-visual` của CI Windows; chưa đánh giá thủ công từng ảnh 1366×768/1920×1080 trong lần này. Chưa kiểm tỉ lệ hiển thị Windows khác 100%.

## 6. Chưa đủ căn cứ xác nhận
- Cài mới và nâng cấp từ v2.0.26 bằng Setup trên tài khoản Windows riêng: chưa thực hiện. Không cài đè vào tài khoản đang dùng thật. Bước nén NSIS bị Access denied ở máy phát triển; bộ Setup lấy từ CI Windows của đúng commit. Thử `win-unpacked` không thay thế thử trình cài.
- Chưa thử in trên máy in thật.
- Khôi phục sang hồ sơ mới đã thử cho Cấp phát; chưa đối chiếu checksum từng nhóm nghiệp vụ, bản chốt và kho năm trong cùng một ca.
- Quy tắc sữa định mức khi chuyển tổ giữa tháng: giữ theo xác nhận của chủ sở hữu (một dòng riêng mỗi tháng).

## 7. Bàn giao
Hướng dẫn: `docs/CAP_PHAT.md`. Phiên bản hiển thị và package/lock: 2.0.28. Commit, PR, CI, tên Setup, kích thước và SHA-256 ghi theo kết quả thực tế ở bản phát hành `v2.0.28`.
