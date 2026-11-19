# CHANGELOG

> Lịch sử liên tục từ 2.0.0-alpha.25 đến 2.0.33 (cập nhật 18/11/2026). Các bản từ **2.0.0-alpha.37** trở đi được gộp từ `docs/releases/vX.md` (nguồn gốc, vẫn giữ nguyên trong thư mục đó). Ghi chú của các bản **alpha.26 đến alpha.36** không còn lưu trong repo nên không có mục ở đây; các bản đó nằm giữa alpha.25 (bên dưới) và alpha.37.
> Từ nay mỗi bản mới thêm một file `docs/releases/vX.Y.Z.md` (bắt buộc: CI kiểm tra) và thêm mục tương ứng ở đầu file này.

## [2.0.53] — 19/11/2026
- **Bỏ hai thanh cuộn dọc lồng nhau ở màn nhập liệu / danh sách (handoff 005B-UI004, issue #97).** Chi tiết: `docs/releases/v2.0.53.md`.

## [2.0.50] — 19/11/2026
- **Danh sách bản sao lưu có cột Định dạng / Phạm vi và lọc theo định dạng, gồm cả lịch sử bản chụp SQLite (handoff 012-C, issue #113).** Chi tiết: `docs/releases/v2.0.50.md`.

## [2.0.49] — 19/11/2026
- **Quy trình sao lưu khi nơi lưu chính là SQLite (CEO rà, issue #113):** mọi lần sao lưu (tay, định kỳ, khi đóng app, đầu ngày, đầu năm) đều tạo bản chụp `.sqlite` đã kiểm; có lịch sử 10 bản chụp (bản sau chốt kỳ / theo năm giữ vĩnh viễn); chép bản chụp sang thư mục dự phòng; lỗi bản chụp báo lên giao diện. Chi tiết: `docs/releases/v2.0.49.md`.

## [2.0.48] — 19/11/2026
- **Thanh trên 1 hàng ở 1366×768 (handoff 005B-UI001, issue #97):** tiêu đề dài cắt bằng "…" (có title), khi cửa sổ ≤ 1500px nút Tìm kiếm / File đã tải / Đăng xuất chỉ còn biểu tượng (tên vẫn ở aria-label/title); kiểm `topWrap` thành PASS/FAIL. Chi tiết: `docs/releases/v2.0.48.md`.

## [2.0.47] — 19/11/2026
- **Sao lưu/khôi phục theo KỲ LƯƠNG — lõi + IPC (handoff 012-B1, issue #113):** gói `LuongHAK_Ky_YYYY-MM_<ngày-giờ>.zip` (hoặc `.hakenc` có mật khẩu) gồm phát sinh của kỳ + toàn bộ nhân sự/danh mục; khôi phục kỳ không đổi kỳ khác, chặn kỳ đã chốt, xóa mặc định tắt và không xóa hàng đang được dùng. Chưa có giao diện (012-B2). Chi tiết: `docs/releases/v2.0.47.md`.

## [2.0.46] — 19/11/2026
- **Màn Sao lưu & Khôi phục gọn 5 khu (handoff 012-A, issue #113):** một nút Sao lưu toàn bộ (SQLite / Full Backup / JSON) + một nút Khôi phục; một bảng thư mục (thêm thư mục sao lưu JSON); bỏ chọn thư mục dự phòng trùng; chữ "giữ N ngày" theo cài đặt. Chưa có sao lưu theo kỳ (012-B). Chi tiết: `docs/releases/v2.0.46.md`.

## [2.0.45] — 19/11/2026
- **Màn nhập liệu thấy ≥ 12 dòng ở 1366×768 (handoff 005B-UI002, issue #97):** hướng dẫn/chú giải/chi tiết tổng được gấp lại, thanh nút–bộ lọc–hàng bảng nén gọn; kiểm bố cục `fewRows` thành PASS/FAIL. Không đổi dữ liệu/công thức. Chi tiết: `docs/releases/v2.0.45.md`.

## [2.0.44] — 19/11/2026
- **Chống trùng khi nhập (handoff 013, issue #114):** Mã NV / Phiếu cân / Số chứng từ / Số HĐLĐ khác **chữ hoa/thường, khoảng trắng, chữ toàn khổ, gạch nối** nay được coi là NGHI TRÙNG thay vì thành bản ghi mới (`nv01` = `NV 01` = `ＮＶ01`; `pc-001` = `PC - 001`). Nhập Excel: dòng "Nghi trùng" KHÔNG được ghi, có lý do + "Cách sửa", vào file lỗi để sửa (đối chiếu `file = ghi + gộp + không ghi` vẫn đúng). Nhập tay: chặn trùng theo khóa chuẩn hóa cho nhân sự, hợp đồng, sản lượng, ban dăm, tiền cơm, thưởng/trừ, tạm ứng (tiền cơm nhập tay trùng Ngày + Mã NV nay bị chặn như nhập Excel); `input-safety` so phiếu theo khóa chuẩn hóa (lọt cả lúc tính lương trước đây). Chữ nhập MỚI chuẩn hóa NFC (thưởng chép từ Mac/web hết bị tính 2 lần). "Kiểm tra dữ liệu" liệt kê nhóm nghi trùng đã lỡ có (chỉ báo, không tự gộp). Khóa so sánh chỉ để SO SÁNH — không sửa dữ liệu đã lưu; không đổi công thức, lược đồ, kỳ đã chốt, `core/importer.js`.

## [2.0.43] — 18/11/2026
- **Nhập Excel (handoff 009-B, issue #98):** bản xem trước thêm cột **"Cách sửa"** cho mọi dòng không ghi/lỗi (nêu việc cần làm bằng tiếng Việt), bảng **"Đối chiếu với file nguồn"** (số dòng + tổng cột số của file = ghi + gộp + không ghi, theo từng bảng) và nút **"⬇ Tải file lỗi để sửa & nhập lại"** (đúng cột của bảng + Dòng Excel/Lỗi/Cách sửa; sửa xong nhập lại bằng chính chức năng Nhập Excel, cột thêm bị bỏ qua). Thông báo sau khi ghi kèm đối chiếu "file N dòng = ghi + gộp + không ghi". Chỉ đổi hiển thị/xuất file lỗi: không đổi quy tắc nhập, công thức, lược đồ, kỳ đã chốt. Đối chiếu tiền đủ ba số hạng `file = ghi + gộp + không ghi` (sửa theo review CEO).
## [2.0.42] — 18/11/2026
- **Không mất việc đang làm (handoff 009-C, issue #98 mục 4):** đóng cửa sổ khi Danh mục đang có bản nháp CHƯA LƯU (danh mục không tự lưu khi nhập) nay **hỏi trước** (Hủy = giữ cửa sổ, OK = bỏ nháp) — trước đây đóng im lặng và mất nháp. Thêm E2E cho: gõ dở trong ô rồi đóng, dán nhiều dòng có ô sai, nháp danh mục (chuyển màn/đóng), đóng khi đang xem trước nhập Excel. Không đổi công thức, lược đồ, định dạng dữ liệu, kỳ đã chốt.
## [2.0.40] — 18/11/2026
- **Nhập liệu (handoff 009, issue #98):** (1) `Số suất cơm` chứa chữ (ví dụ "hai") nay bị **chặn khi nhập** (Excel, nhập tay, dán dùng chung `normCell`) với thông báo nêu dòng/cột/giá trị/cách sửa — trước đây được nhận và `engine.num` đọc thành 0 suất (mất tiền cơm âm thầm); (2) NV "Đã nghỉ việc" nhận tạm ứng/thưởng/suất cơm và (3) số tiền âm ở Tạm ứng/Thưởng/Thu nhập khác/Trừ khác chỉ **CẢNH BÁO** ở bản xem trước (vẫn ghi được sau khi xác nhận). Thêm script chỉ đọc `docs/v2.0.40/liet-ke-suat-com-khong-phai-so.cjs`. Không đổi công thức (`engine.num` giữ nguyên), không sửa dữ liệu đã lưu, không đổi lược đồ/kỳ đã chốt.

## [2.0.39] — 18/11/2026
- **Sửa lỗi khóa phiên ghi:** nếu đường dẫn thư mục dữ liệu có chứa chữ "PID" (ví dụ tên người dùng/thư mục) và chưa có tệp `data.sqlite.lock`, kho SQLite không mở được (lỗi "ENOENT … data.sqlite.lock"), vì `acquireLock` nhận diện "tiến trình khác đang dùng" bằng cách khớp chữ `/PID/` trên thông báo lỗi. Nay dùng cờ riêng. Test mới `U-LOCK-01/02` (đỏ trước khi sửa). Không đổi công thức, lược đồ, định dạng dữ liệu, kỳ đã chốt.

## [2.0.38] — 18/11/2026
- **Bản chụp SQLite trong gói Full Backup** (`sqlite/data-snapshot.sqlite` + `manifest.sqliteSnapshot`, tùy chọn; `manifest.version` không đổi): kiểm khi tạo (integrity, số dòng = `data.json`) và khi mở (SHA-256, schema, lệch `data.json`); lỗi bản chụp chỉ là cảnh báo, gói vẫn đủ bằng `data.json`. Khôi phục từ bản chụp trong gói ở màn hình khôi phục (cùng đường kiểm/cất/thay nguyên tử của 2.0.36). App 2.0.35 mở gói mới bình thường (kiểm cả bằng app Electron thật). Dung lượng gói +3,95 MB ở 5.000 NV giả. Không đổi công thức, lược đồ, `data.json`, kỳ đã chốt.

## [2.0.37] — 18/11/2026
- Lớp lưu trữ tự từ chối `restoreFromSnapshot` khi kho đang mở bình thường (trước đó chỉ lớp IPC chặn). Thêm test `U-SNAP-04b`. Không đổi công thức, lược đồ, định dạng sao lưu, kỳ đã chốt.

## [2.0.36] — 18/11/2026
- **Khôi phục từ bản chụp SQLite** (`backups/data-snapshot.sqlite`) khi `data.sqlite` hỏng/mất: kiểm bản chụp (kho HAK, schema ≤ app, integrity/foreign key, số dòng), cất dữ liệu hiện có (`…truoc-khoi-phuc-<ngày-giờ>`), thay nguyên tử có marker (kill giữa chừng tự hoàn tất), ghi kiểm toán, nút ở màn hình khôi phục. Không đổi công thức, lược đồ, định dạng sao lưu, kỳ đã chốt. Unit 7 ca (3 ca kill -9 thật) + E2E +7 ca.

## [2.0.35] — 18/11/2026
- **Bản nền (`baseSig`) cho lưu dữ liệu:** giao diện gửi kèm phiên bản kho đã nạp/lưu gần nhất; tiến trình chính TỪ CHỐI ghi (`STALE_BASE`) khi kho đã đổi ở nơi khác, thay vì để bản cũ của giao diện ghi đè âm thầm (rủi ro cấu trúc phát hiện ở 2.0.34, tái hiện: `docs/v2.0.34/`). Đóng cửa sổ: hỏi, chỉ cho đóng khi người dùng đồng ý bỏ thay đổi chưa lưu; tải lại giao diện (sau khôi phục/lưu trữ năm): không ghi đè, không giữ trang; đường lưu thường: hỏi tải lại hoặc giữ màn hình.
- Khách cũ/kịch bản không gửi `baseSig` giữ hành vi cũ. Không đổi công thức lương, kỳ đã chốt, định dạng dữ liệu.
- Thêm `tests/e2e/stale-base.cjs` (12 ca, vào CI Windows) và `tests/unit/store-base-sig.test.js`.

## [2.0.34] — 18/11/2026
- **Nghiệm thu:** thêm 20 test đối chiếu bảng ↔ Excel ↔ HTML (báo cáo vận hành 13 ca, bảo hiểm 4, cấp phát 3), kiểm từng dòng/cột và tổng = cộng dòng.
- **CI:** bước mới trong job `windows-setup` cài im lặng bộ cài NSIS THẬT, chạy app đã cài (nâng cấp JSON→SQLite, lưu/đóng/mở), nâng cấp ĐÈ lên bản đã phát hành trước đó và gỡ cài (dữ liệu người dùng được giữ). Không thay thế thử trên máy Windows thật.
- **Đo hiệu năng** 300/5.000/10.000 NV kèm RSS (`docs/PERFORMANCE_REPORT.md`, `docs/v2.0.34/`): chuỗi ghi p50 15/272/548 ms; RSS tiến trình chính ~142/872/1.644 MB; mục tiêu < 150 ms ở 5.000 NV CHƯA đạt.
- **Tài liệu:** sửa các đoạn còn ghi SQLite "mặc định tắt/chưa cutover" (`MIGRATION_PLAN`, `ACCEPTANCE_SQLITE_RELEASE`, `WRITE_PATHS_INVENTORY`); thêm ma trận nghiệm thu mục 12 (`ACCEPTANCE_SQLITE_RELEASE` §7).
- Không đổi mã chạy của ứng dụng, công thức lương hay quy tắc ghi.

## [2.0.33] — 18/11/2026
- **Đường ghi dữ liệu giai đoạn 1:** phân tích văn bản lưu MỘT lần và bản cũ MỘT lần cho mỗi lần lưu (trước đây ~6 lần phân tích 9,5 MB). Chuỗi ghi của tiến trình chính ở 5.000 NV: ≈420–450 ms → ≈290 ms. KHÔNG đổi quy tắc kiểm ghi, nội dung lỗi hay thứ tự kiểm; chứng minh bằng test tương đương và deep-freeze toàn bộ test.
- Thêm `docs/WRITE_PATH_DELTA_DESIGN.md`: số đo, thiết kế delta (giai đoạn 2) và tiêu chí nghiệm thu. Giai đoạn 2 CHƯA làm.

## [2.0.32] — 18/11/2026
- **Nhập Excel:** ô/dòng chỉ có khoảng trắng là trống (trước đây thành `0` hoặc dòng rác).
- **SQLite lược đồ v2:** ràng buộc CHECK cho `records` (json hợp lệ, rev ≥ 1, id/tbl không rỗng); nâng từ v1 giữ nguyên dữ liệu. Bản ≤ 2.0.31 sẽ từ chối mở kho v2 (dùng `HAK_STORAGE=json` hoặc cài lại bản mới).
- **Bản chụp SQLite xoay vòng** `backups/data-snapshot.sqlite` kèm mỗi bản sao lưu thành công (đã kiểm integrity_check).
- Thêm test đối chiếu bảng ↔ dòng xuất ↔ HTML in sau lọc cho 9 loại báo cáo lương.

## [2.0.31] — 18/11/2026
- **C01:** bộ lọc/tổng không còn loại nhầm dòng dữ liệu thật có tên bắt đầu bằng "TỔNG"; dòng tổng được đánh dấu bằng thuộc tính nội bộ.
- Thêm `docs/SCREEN_ACCEPTANCE_MATRIX.md`, `docs/REPORT_CATALOG_AND_PARITY.md` (mục chưa kiểm ghi CHƯA KIỂM).
- Phát hành: bản có dòng `Trạng thái: thử nghiệm có kiểm soát` trong ghi chú luôn được đánh dấu prerelease.

## [2.0.30] — 18/11/2026
- **A01 (nghiêm trọng):** thao tác kho năm không còn chạy trên `data.json` cũ hay nhận lại dữ liệu cũ vào SQLite; `preview/table` không đổi dữ liệu; `archive/restore` có marker, kiểm revision, hoàn tác và phục hồi sau gián đoạn (`main/year-job.js`).
- **A02:** sao lưu (tay, lịch, khi đóng, theo năm, thư mục thứ hai, bản bảo vệ) không còn "thành công giả" bằng dữ liệu cũ khi xuất `data.json` lỗi; bản vừa tạo được kiểm đúng revision.
- Đính chính hướng dẫn xung đột: không dùng ngày giờ file làm căn cứ; nêu chênh lệch bảng/dòng. Khóa phiên ghi cấp dữ liệu (`data.sqlite.lock`).

## [2.0.29] — 18/11/2026
- **Kho dữ liệu chính chuyển sang SQLite (`data.sqlite`)**, mặc định BẬT. Lần mở đầu: tự sao lưu `truoc-chuyen-sqlite`, chuyển `data.json` vào SQLite, đối chiếu từng ký tự rồi mới dùng; hỏng giữa chừng thì `data.json` giữ nguyên.
- `data.json` thành bản xuất (ghi lại sau tối đa 3 giây, khi đóng app và ngay trước mỗi sao lưu/Full Backup) nên sao lưu, Full Backup, kho năm và công cụ cũ vẫn dùng như trước. `HAK_STORAGE=json` quay về kho `data.json`.
- Ghi bền vững theo giao dịch SQLite (WAL, synchronous FULL); bị kill ngay sau khi lưu vẫn không mất. `data.json` bị sửa/thay ngoài app thì app báo xung đột kèm ngày giờ hai file, không tự đoán.
- Hiệu năng: lưu một lần sửa nhỏ chậm hơn kho JSON khoảng 1,5 lần ở 5.000 nhân viên (giao diện vẫn gửi cả tài liệu); đổi lại ghi nguyên tử theo giao dịch. Dung lượng ổ đĩa tăng (SQLite + data.json xuất).
- Kiểm thử mới: `sqlite-storage`, `sqlite-changeset`, `sqlite-migrate`, E2E chế độ thật `sqlite-default.cjs` (nâng cấp từ data.json, kill sau khi lưu, xung đột, quay lui) và tự kiểm SQLite trong bản đóng gói Windows.

## [2.0.28] — 18/11/2026
- Cấp phát: thu hồi/đổi cỡ có Ngày giao dịch do người dùng chọn (mặc định ngày Việt Nam); hồ sơ cũ quy đổi UTC → giờ Việt Nam khi xem/lọc, không sửa chứng từ cũ.
- F01: bộ lọc Phòng ban của Thưởng/Trừ, Tạm ứng, Suất cơm và Chấm công theo tổ TẠI NGÀY của từng dòng (trước đây dùng tổ hiện tại nên chứng từ kỳ cũ biến mất khi lọc tổ cũ); không còn phụ thuộc quyền xem lương hay việc tính lương thành công; thiếu căn cứ lịch sử thì ghi "(Không có)", không gán tổ hiện tại.
- F02: phần giải thích đơn giá, mức sàn, ngưỡng công trong Excel phân bổ theo hiệu lực của kỳ (cùng API tra hiệu lực của engine) thay vì dòng đầu/cuối danh mục; kỳ có nhiều mức nêu từng mức; bản chốt thiếu danh mục báo thiếu căn cứ. Không đổi công thức hay số tiền bảng lương.
- Thêm kiểm thử: `input-dept`, `pbkl-rules`, `v94-payroll-reports` U-F02-10, E2E `input-filter-dept.cjs` (chạy cả trên Windows CI).

## [2.0.27] — 17/11/2026
- Tách `core/benefits.js` thành `benefits-rules.js` (tiêu chuẩn, định mức, kiểm tra, thu hồi), `benefits-ledger.js` (sổ cái, báo cáo) và `benefits-import.js` (nhập Excel); `core/benefits.js` còn là cửa chung giữ nguyên tên hàm. Chỉ chuyển mã, không đổi hành vi; kiểm thử cũ chạy nguyên không sửa.

## [2.0.26] — 17/11/2026
- Báo cáo tổng hợp Cấp phát gom theo tổ đã lưu trên từng lượt: người chuyển tổ nhận ở hai tổ thì hiện đúng từng tổ (Tổ 1 = 10, Tổ 2 = 5, tổng = 15), trước đây dồn vào tổ đầu tiên. Phân biệt theo mã vật tư, đơn vị tính và cỡ. Sữa: định mức tính một lần theo nhân viên/tháng, người chuyển tổ có dòng định mức riêng.
- Lượt thu hồi và lượt cấp thay thế (đổi cỡ) giữ tổ, tên mặt hàng, đơn vị, cỡ của dòng cấp gốc (trước đây tra lại tổ hiện tại và tên vật tư hiện tại). Chi tiết có Ngày giao dịch, Ngày cấp gốc, Mã điều chỉnh, thời điểm thao tác. Phiếu cũ thiếu tổ: ghi rõ nguồn suy ra hoặc thiếu căn cứ.
- Thêm kiểm thử Electron `tests/e2e/capphat.cjs` (chạy cả trên runner Windows): hai chế độ sử dụng, nhập Excel, chuyển tổ + thu hồi, báo cáo màn hình/Excel/PDF, đóng-mở lại, nâng cấp từ dữ liệu kiểu v2.0.24, Full Backup → khôi phục vào hồ sơ riêng.

## [2.0.25] — 17/11/2026
- Cấp phát thống nhất sữa phúc lợi + bảo hộ lao động (Nghiệp vụ nhân sự → Cấp phát): danh sách phiếu, màn chi tiết ba vùng (thông tin phiếu · người nhận · thao tác), nhập Excel theo phiếu có xem trước và báo lỗi theo số dòng, xác nhận, thu hồi một phần và đổi cỡ, báo cáo Tổng hợp/Chi tiết dùng chung HAK Smart Filter, Excel và PDF cùng nguồn số liệu. Danh mục Cấp phát: Tiêu chuẩn phúc lợi và Đồ bảo hộ lao động. Mở phiếu gốc từ báo cáo hoặc hồ sơ nhân viên, quay lại giữ bộ lọc và trang. Dữ liệu sữa cũ dùng nguyên. Chi tiết: `docs/CAP_PHAT.md`, quy tắc R-74.
- Đối chiếu bảng lương Excel hai chiều: hiện riêng "Có trong app, thiếu trong Excel" và "Có trong Excel, không khớp app"; tổng kết số nhân viên đã đối chiếu, số người thiếu mỗi bên, số người có chênh lệch. File Excel xuất có sheet TongKet, ThieuTrongExcel, KhongKhopNguoi, DoiChieu cùng số liệu với màn hình và luôn xuất được. Giữ quy tắc v2.0.23 (có mã thì khớp theo mã; chỉ khớp theo tên khi Excel trống mã và tên duy nhất).
- Báo cáo phúc lợi tháng giữ mọi khoản đã cấp theo phiếu đã xác nhận: mặt hàng không còn định mức hiệu lực (tiêu chuẩn bị thay thế/hết hạn) vẫn hiện mã NV, mặt hàng, số đã cấp, ghi chú "Không còn định mức hiệu lực", cột Phiếu cấp và nút mở phiếu gốc; Excel và PDF cùng số liệu. Phiếu nháp và phiếu đã thu hồi không cộng.
- File mẫu nhập liệu: cột Mã NV, số tài khoản, CCCD, số HĐLĐ và các cột mã định dạng Text cho cả cột để giữ số 0 đầu khi nhập tay; dòng ví dụ có cột "Dòng ví dụ = VÍ DỤ" nên app bỏ qua khi nhập và nêu trong bản xem trước; dòng thật trùng giá trị mẫu vẫn được giữ (chỉ cảnh báo); mẫu cũ vẫn đọc được.
- `build:app --check` so khớp sau khi chuẩn hóa xuống dòng nên đúng trên cả Windows (CRLF) và Linux (LF).

## [2.0.24] — 17/11/2026
- File Excel mẫu nhập liệu (nút "Tải file mẫu") có định dạng: tiêu đề tô màu, cố định dòng đầu, bộ lọc, độ rộng cột theo nội dung, dòng ví dụ nền vàng kèm ghi chú xóa, cột tiền có dấu phân cách nghìn, sheet Hướng dẫn tô màu. Chỉ đổi trình bày: tên sheet, tên cột và giá trị mẫu giữ nguyên nên nhập lại vẫn đọc đúng. Có phương án dự phòng nếu thiếu ExcelJS.

## [2.0.23] — 17/11/2026
- Bảo hiểm: ô tỷ lệ BHXH/BHYT/BHTN phía người lao động để TRỐNG ở mã bảo hiểm đang dùng trong kỳ (có người có căn cứ đóng) nay chặn chốt kỳ, nêu rõ mã, tên cột và người bị ảnh hưởng; main process tự tính lại. Khai 0 hoặc 0% vẫn hợp lệ (0đ). Danh mục không dùng trong kỳ không chặn. Công thức, cách đọc tỷ lệ, ngưỡng công, truy thu giữ nguyên.
- Đối chiếu bảng lương Excel: Excel có mã NV nhưng không khớp thì vào mục "Mã NV không khớp" kể cả khi họ tên trùng duy nhất; chỉ khớp theo họ tên khi Excel để trống mã và tên khớp đúng một người. Hiện số dòng Excel, mã, họ tên; báo tên trùng nhiều người và mã trùng trong file; giữ mã có số 0 đầu.
- Tiêu chuẩn phúc lợi: gắn tiêu chuẩn vào hợp đồng kiểm tra phiên bản có hiệu lực tại ngày bắt đầu ở cả giao diện và main process, hiện mặt hàng/định mức/hiệu lực trước khi lưu. Phiên bản mới hết hạn thì dừng tại ngày hết hạn, không tự quay về định mức cũ.
- Kiểm thử hồi quy: `insurance-rate-blank`, `reconcile-matching`, `benefit-validity`.

## [2.0.22] — 17/11/2026
- Đối chiếu phiếu cân và chấm công: bộ lọc phiếu cần đối chiếu; xác nhận ca dài theo người, tổ, ngày, xem trước phiếu bị ảnh hưởng, thu hồi có nhật ký.
- Đổi tên "Bơm dăm" thành "Ban dăm xuất hàng", giữ khả năng đọc mẫu Excel cũ. Suất cơm: báo cáo và máy tính lương dùng chung một quy tắc.
- Duyệt lương: giữ cặp lập–duyệt khi đổi tài khoản, bỏ thông tin hành chính khỏi dấu kiểm duyệt, hiện phê duyệt trong kho năm.
- Phúc lợi (định mức sữa): danh mục, gắn tiêu chuẩn vào hợp đồng, nhập tay hoặc Excel theo phiếu, xác nhận và thu hồi, báo cáo tháng Excel/PDF. Xác nhận cấp phát phải có thời điểm ISO hợp lệ.
- Đối chiếu bảng lương Excel: ô dạng chữ nay đọc đúng theo cùng quy tắc của engine — tiền `"500.000"` ra 500.000 (trước là 500), `"1.234,5"` ra 1.234,5, công/hệ số `"0,175"` ra 0,175 (trước là 175). Chỉ ảnh hưởng kết quả đối chiếu, không ảnh hưởng bảng lương.
- Thanh 7 bước tính lương: ở chế độ phân quyền, nói rõ trạng thái duyệt (chưa gửi duyệt, đang chờ duyệt, dữ liệu đã đổi cần gửi lại, đã duyệt) thay vì chỉ "có thể chốt". Không đổi trạng thái từng bước.
- CI: thêm hai ngoại lệ có ghi lý do cho `core/reconcile.js` và `core/payroll-steps.js` trong bước chặn sửa nguồn chưa duyệt (chủ sở hữu duyệt sửa hai lỗi này ngày 17/11/2026).

## [2.0.20] — 16/11/2026
- Chốt lương chỉ rõ khoản lệch theo từng nhân viên, kể cả khi tổng thu nhập và thực lĩnh vẫn khớp.
- Khi chốt lại kỳ đã chi, đối chiếu đã trả, đang chờ chi, còn phải trả và trả thừa. Chi bổ sung tham chiếu chứng từ cũ.
- Theo dõi khoản khấu trừ còn thiếu. Người dùng lập khoản trừ có chủ đích, có kiểm tra số dư và khả năng khấu trừ khi chốt.
- Chặn nhập tay trùng chứng từ sản lượng chuyển kỳ do app tự sinh.
- Giữ nguyên công thức tính lương và quy tắc tính tiền cơm.

## [2.0.19] — 16/11/2026
- Chặn ghi đè chứng từ thưởng, khoản trừ và tạm ứng sang kỳ khác. Cho cập nhật chứng từ trong cùng kỳ.
- Bảng kê thưởng/trừ tách phần nhập tay và phần sản lượng chuyển kỳ đã tính vào Thu nhập khác.
- Từ bảng phân bổ mở đúng phiếu gốc theo số và ngày cân. Màn hình, Excel và PDF ghi rõ dữ liệu nháp, đã lưu hoặc đã chốt.
- Bảng kê kỳ đã chốt dùng dữ liệu và danh tính lưu khi chốt. Lương 12 tháng tách truy thu BH và đếm mỗi mã nhân viên một lần trong năm.
- Công thức tính lương và định dạng lưu dữ liệu đang dùng giữ nguyên.
- Chuẩn bị SQLite: thêm công cụ `tools/sqlite-shadow.js` (`npm run sqlite:shadow`) ghi dữ liệu sang một file SQLite riêng **chỉ để so sánh**. App vẫn đọc và ghi JSON, công cụ không vào bộ cài. Kết quả đo ở `MIGRATION_PLAN.md` §2.
- CI: nâng các action của GitHub lên bản chạy Node 24 (`checkout`, `setup-node`, `upload-artifact`, `setup-python` → v7; `cache` → v6) để hết cảnh báo Node 20 ngừng hỗ trợ.
- Công cụ: nâng `eslint` 9.39.5 → 10.15.0 (chỉ dùng khi phát triển, không vào bộ cài). Không phải sửa mã hay cấu hình lint.
- CI: bước đo OCR (`test:ocr-eval`) kiểm thêm tốc độ. Mỗi ca đọc quá `OCR_EVAL_MAX_MS` (mặc định 20 giây) thì bước này đỏ; báo cáo ghi thời gian từng ca, tổng và ca chậm nhất.

## [2.0.18] — 16/11/2026
- OCR: nâng `tesseract.js` 5.1.1 → 7.0.0. `ocr/worker.js` chạy được với cả hai bản; thêm `ocr/tesseract-compat.js` để việc đoán chiều ảnh cả trang vẫn đếm được từ (bản 7 không còn trả `data.words`). Không sửa `main/ocr-service.js` dùng chung. Đánh giá OCR theo ô: 4/4 ca, mỗi ca 90/90 ô, bằng bản 5.1.1.
- CI: bộ quét bảo mật không còn báo nhầm `regex.exec()` là "thực thi mã động" (trước đây 39 lỗi mức cao, đều là báo nhầm), bỏ qua thư viện đã nén và dòng chú thích, và nay là bước bắt buộc trên mã đi vào bộ cài.
- Test: thêm 4 kiểm tra Electron cho luồng kho bộ lọc đã lưu bị lỗi (báo, không ghi đè, nút sao lưu tạo kho mới, bản cũ còn nguyên).

## [2.0.17] — 16/11/2026
- Tách `app.js`, bước 1: chuyển 43 hàm trợ giúp không dùng trạng thái sang `ui/app-helpers.js` (chỉ di chuyển, không đổi nội dung hàm). Không đổi hành vi, không đổi kết quả tính lương.
- Tách `app.js`, bước 2: mã nguồn giao diện chia thành 28 file theo màn hình trong `LuongHAK_Offline/app-src/`; `npm run build:app` ghép lại thành `app.js`. Nội dung `app.js` chỉ thêm một dòng chú thích.
- Bộ lọc đã lưu: khi kho bộ lọc trên máy bị lỗi hoặc do phiên bản khác tạo, app không còn ghi đè lên nó. Bảng "Bộ lọc đã lưu" báo rõ và có nút **Sao lưu kho cũ và tạo kho mới**. Kết quả lọc không đổi. (`core/smart-filter.js` đồng bộ với `HAK_SMART_FILTER`.)
- Đổi tên thư mục công cụ CI `HAK_CODE_QUALITY_TEST/` thành `ci/quality-python/`.
- CI: khóa các file dùng chung với `HAK_SMART_FILTER` và design system (`shared-modules.lock.json`, `npm run check:shared`).

- Báo cáo kỳ đã chốt lấy chấm công và phân bổ từ dữ liệu lưu khi chốt. App báo rõ khi bản chốt cũ thiếu chi tiết.
- Nhập Excel và OCR kiểm tra lại khóa kỳ và khóa bản ghi ngay trước khi ghi. Kế hoạch đã áp dụng không thể ghi lần hai.
- Kho bộ lọc lỗi có thể tải nguyên văn trước khi tạo kho mới. Mỗi lần sao lưu giữ một bản riêng.
- CI kiểm tra tag từ đầu. Khi phiên bản đã phát hành, CI vẫn tạo artifact Windows để kiểm thử và bỏ qua phát hành.
- Giữ nguyên công thức tính lương và dữ liệu kỳ đã chốt.

## [2.0.16] — 15/11/2026
- Nâng Electron 43.8.9 → 45.3.2, đi lần lượt qua 44.11.3 (mỗi bước chạy đủ unit test và E2E). Đã đối chiếu danh sách thay đổi phá vỡ tương thích của Electron 44 và 45: app không dùng `safeStorage`, `node:sqlite`, module `clipboard` của Electron; preload chỉ dùng `contextBridge` và `ipcRenderer`; bộ cài chỉ đóng gói x64. Bộ E2E 275/275 đạt trên Linux ở cả hai bản. Chưa nghiệm thu bản đóng gói trên máy Windows thật.
- Nâng `electron-builder` 26.15.3 → 26.18.0 và `jsdom` 30.1.3 → 31.0.1 (jsdom chỉ dùng cho test).
- `npm audit --omit=dev`: 0 lỗ hổng (phần chạy trong app). `npm audit` đầy đủ còn 6 mức moderate, cùng một gốc là `minimatch` (từ chối dịch vụ qua mẫu glob) nằm trong `app-builder-lib` của electron-builder, chỉ dùng lúc build, không đi vào bộ cài. Cách "sửa" duy nhất `npm audit` đề xuất là hạ electron-builder về 24.13.3, nên không áp dụng.
- Giữ `tesseract.js` 5.1.1, không nâng lên 7.0.0: với bản 7.0.0 bộ `test:ocr-eval` không chạy được (dừng ở bước mở hộp chọn tệp, hết thời gian chờ) và `npm test` treo ở phần OCR thật, trong khi bản 5.1.1 đạt 4/4 ca, mỗi ca 90/90 ô (100%). Chưa tìm nguyên nhân sâu hơn; nâng tesseract cần một đợt chỉnh mã OCR riêng.
- Không đổi công thức lương, thuế, bảo hiểm hay dữ liệu đã lưu.

## [2.0.15] — 15/11/2026
- Gộp bốn workflow CI thành một luồng duy nhất `luong-hak-v10-4-setup.yml`. Xóa `build-exe.yml`, `build-windows.yml` và `luong-offline-quality-audit.yml` (hai file sau chỉ chạy khi push lên nhánh cũ, phần việc của chúng đã nằm trong luồng chung).
- Thứ tự chạy: `check` (cú pháp, lint, unit/integration/regression, kiểm tra DOM giao diện, kiểm tra phụ thuộc) → E2E Electron, kiểm tra giao diện, chất lượng thừa kế và đối chiếu hợp nhất → build bộ cài Windows → phát hành (chỉ nhánh `main`). Build bộ cài nay chỉ chạy khi các bước trước đã đạt.
- Mọi pull request đều chạy đủ bộ kiểm tra (không còn lọc theo thư mục). Push lên `main` vẫn chỉ chạy khi đổi mã hoặc cấu hình, để đổi riêng tài liệu không kích hoạt phát hành trùng phiên bản.
- Dùng một phiên bản Playwright duy nhất, 1.64.1, ghi cố định trong biến `PLAYWRIGHT_VERSION` của workflow (trước đây 1.56.1 trên Linux, 1.64.1 trên Windows, và bản mới nhất ở kiểm tra giao diện). Bộ E2E 275/275 đạt trên Linux với 1.64.1.
- Bước tự kiểm OCR trong bản đóng gói của job build cũ được chuyển vào job build bộ cài. Tên các check còn lại giữ nguyên; job `audit` (trùng với `check`) không còn.
- Không đổi app, công thức lương, thuế, bảo hiểm hay dữ liệu đã lưu.

## [2.0.14] — 15/11/2026
- Thêm `eslint` 9.39.5 vào `devDependencies` và script `npm run lint` (`eslint . --max-warnings 0`) để máy lập trình viên và CI dùng cùng một phiên bản. Chỉ thêm gói dùng lúc phát triển; không gói nào trong app thay đổi phiên bản.
- `scripts/check-consolidation.cjs` nay kiểm tra lịch sử git trước khi đối chiếu. Khi repo là bản clone nông hoặc thiếu commit, script báo rõ các commit thiếu và cách khắc phục (`git fetch --unshallow`, hoặc `fetch-depth: 0` trong CI) thay vì dừng với lỗi "Not a valid commit name".
- Không đổi app, công thức lương, thuế, bảo hiểm hay dữ liệu đã lưu.

## [2.0.13] — 15/11/2026
- Khôi phục quy tắc của v2.0.7 cho mục "Phiếu cần đối chiếu chấm công": ô công **để trống** được xem như ô ghi **0**. Người không có công đi làm (BT) vào ngày có phiếu cân, kể cả ô trống, không có dòng chấm công hoặc chỉ có PN, CL, CC, đều được báo nếu chưa ghi trong "NV vắng". Từ v2.0.9 chỉ ô ghi đúng số 0 mới được báo.
- Cách chia tấn không đổi: người không có công vẫn không được chia. Chỉ khôi phục cảnh báo.
- Cập nhật chữ giải thích ở màn hình, sheet DoiChieuChamCong và hướng dẫn sử dụng.
- Không đổi công thức lương, thuế, bảo hiểm hay phân quyền.

Tạo Full Backup trước khi nâng cấp.

## [2.0.12] — 15/11/2026
- Ngày nghỉ có lương đã duyệt chỉ ghi PN.
- Ngày nghỉ ốm, không lương và thai sản đã duyệt chặn ghi mọi hình thức công. Kiểm tra khi nhập tay, dán, nhập Excel và lưu dữ liệu.
- Giữ đường sửa để xóa hoặc giảm số công sai có từ trước. Nếu còn xung đột, bước chốt kỳ sẽ báo để xử lý.

## [2.0.11] — 15/11/2026
- Đối soát thưởng, khoản trừ và tạm ứng theo từng nhân viên. Mở chứng từ nguồn, xem cảnh báo số chứng từ lặp và chênh lệch với bảng lương. Kỳ đã chốt dùng bản chốt.
- Đối chiếu đơn nghỉ với các hình thức công đã ghi theo từng ngày, kể cả tăng ca và công cơm. Xem trước và áp dụng công phép đã duyệt vào bảng chấm công ở trạng thái nháp.
- Kiểm tra phép năm theo hợp đồng, số ngày cấp và phép cộng dồn. Chặn đơn vượt hạn mức khi lập, gửi và duyệt. Nếu kỳ đang chốt có phát sinh phép làm vượt hạn mức, phải xử lý trước khi chốt. Phần vượt từ kỳ trước vẫn hiển thị để đối chiếu.
- Cập nhật hướng dẫn sử dụng. Công thức tính lương giữ nguyên.

## [2.0.10] — 15/11/2026
- Khi phương pháp bù đã dùng để tính bảng lương khác phương pháp có hiệu lực, hộp thoại chốt kỳ hiển thị cả hai và có nút **Dùng phương pháp trong Cài đặt**.
- Nút chỉ chọn phương pháp. Kế toán vẫn phải bấm **Tính lương** lại, kiểm tra kết quả rồi chốt. Kỳ đã chốt tiếp tục khóa phương pháp và chức năng tính lại.
- Hướng dẫn sử dụng ghi rõ các bước xử lý. Công thức tính lương và dữ liệu kỳ đã chốt giữ nguyên.

## [2.0.9] — 15/11/2026
- Xuất 11 báo cáo kỳ lương bằng Excel hoặc PDF, gồm chấm công theo hình thức, phân bổ và đối soát sản lượng theo phiếu, bù sản lượng, thuế TNCN chi tiết, bảo hiểm, hạch toán và đối chiếu chi lương.
- Khi xuất kỳ đã chốt, báo cáo dùng số liệu của bản chốt. Đối chiếu chi lương cập nhật theo sổ chứng từ tại thời điểm xuất. Kỳ cũ hiển thị lưu ý nếu bản chốt thiếu dữ liệu chi tiết.
- Cập nhật luồng thao tác kỳ lương, nghiệp vụ nhân sự, hạch toán, chi trả và hướng dẫn sử dụng.
- Khi chốt, kiểm tra phương pháp bù đã dùng để tính khớp Cài đặt của kỳ. Đổi lựa chọn rồi phải bấm Tính lương lại trước khi chốt.

## [2.0.8] — 15/11/2026
- Sửa báo cáo "Chi tiết nhân viên" báo sai lỗi chặn "thực lĩnh lớn hơn tổng thu nhập". Thực lĩnh được làm tròn đến 1.000đ nên có thể lớn hơn tổng thu nhập tới 500đ; đây là kết quả hợp lệ. Nay chỉ chặn khi chênh quá 500đ (cùng dung sai với báo cáo "Chi tiết thanh toán"). Trước đây lỗi sai này làm báo cáo không đạt điều kiện xuất chính thức.
- Ô nhập tiền nay hiện dấu chấm phân nghìn ngay khi gõ (gõ 1500000 thấy 1.500.000), giữ nguyên vị trí con trỏ; số thập phân như 1.5 hoặc 1.250,5 giữ nguyên.
- Các cột tiền `Lương cơ bản`, `Thanh toán TM`, `Giá trị tiền thưởng`, `Số tiền khoán`, `Trần lương đóng BHXH/BHTN`... trước đây được kiểm tra là tiền nhưng ô nhập không hiện dấu phân nghìn; nay dùng chung một danh sách cột tiền.
- Ô "KL hàng (Tấn)": báo đỏ khi gõ chữ; khi gõ dạng 12,345 hoặc 12.345 sẽ nhắc rằng ô được hiểu là 12,345 tấn (dấu , hoặc . là dấu thập phân). Cách đọc số không đổi.
- Không đổi công thức lương, thuế, bảo hiểm hay phân quyền.

Tạo Full Backup trước khi nâng cấp.

## [2.0.7] — 14/11/2026
- **Đối chiếu chấm công theo phiếu cân báo cả ô công để trống.** Trước đây chỉ người có ô công ghi "0" vào ngày cân (và chưa được ghi trong "NV vắng") mới được đưa vào mục "Phiếu cần đối chiếu chấm công" và sheet DoiChieuChamCong; người để ô trống vẫn bị loại khỏi phần chia tấn nhưng không có cảnh báo nào. Nay cả hai trường hợp đều được báo, đúng quy tắc R-73 "công = 0 / trống → cảnh báo".
  - Ô trống được xem đúng như ô ghi 0: người không có dòng chấm công nào trong kỳ, hoặc chỉ có dòng PN (nghỉ phép), CL (nghỉ lễ), CC (tiền cơm) vào ngày đó, cũng được báo, vì không có công đi làm (BT) ngày đó.
  - Người đã ghi trong "NV vắng" của phiếu vẫn không bị báo; có công đi làm thì hết báo.
  - Cách chia tấn không đổi: người không có công vẫn không được chia. Chỉ thêm cảnh báo.
  - Mỗi phiếu liệt kê riêng, nên một người trống nhiều ngày sẽ xuất hiện ở nhiều phiếu (một ngày có thể có nhiều phiếu).
- Sửa tiêu đề màn hình ở đầu trang bị cắt chữ khi cửa sổ hẹp (khoảng 1100 px): "Nhân sự" chỉ còn hiện "Nhân…". Tiêu đề nay giữ tối thiểu 150 px, tối đa 480 px; khi thanh đầu trang chật, các nút tự xuống hàng. Chỉ đổi CSS (`ui/workspace-v104.css` và bản dùng chung `design-system/hak-workspace-layout.css`).
- Không đổi công thức lương, thuế, bảo hiểm hay phân quyền. `engine.js` giữ nguyên; `hr.js` chỉ đổi phần nhận diện người cần đối chiếu.

Tạo Full Backup trước khi nâng cấp. OCR chữ tay vẫn chưa nghiệm thu đầy đủ trên hồ sơ thật.

## [2.0.5] — 14/11/2026
- Chữ "null" (và "undefined", "NaN") do hệ thống cũ xuất ra thay cho ô trống trong bảng chấm công được coi là ô trống khi nhập hoặc khôi phục dữ liệu, và khi nhập Excel / gõ tay. Trước đây app coi đó là nhãn công tác: sinh lỗi "ngày 31 không tồn tại" cho tháng 30 ngày, cảnh báo nhãn công tác lạ, báo xung đột nhãn trong cùng ngày (làm mất phụ cấp công tác của ngày đó) và chặn chốt kỳ. Số ô đã đổi được báo cho người dùng sau khi nhập.
- Khi nhập hoặc khôi phục dữ liệu, các dòng Tổng (Total / Tổng cộng) không có ngày cân, tổ, người nhận và biển số lẫn trong Sản lượng hoặc Bơm dăm được loại bỏ và báo rõ số tấn của dòng tổng. Dòng này trước đây làm cả việc tính lương dừng với lỗi "ngày/kỳ không hợp lệ". Phiếu thật thiếu ngày cân, hoặc dòng có tổ, vẫn được giữ lại để xử lý.
- Không đổi công thức lương, thuế, bảo hiểm hay phân quyền. engine.js, hr.js và core/integrity.js giữ nguyên.

Tạo Full Backup trước khi nâng cấp. OCR chữ tay vẫn chưa nghiệm thu đầy đủ trên hồ sơ thật.

## [2.0.4] — 14/11/2026
- Bổ sung mục Phiếu cần đối chiếu chấm công trong báo cáo sản lượng và sheet DoiChieuChamCong khi xuất Excel báo cáo.
- Chỉ đưa vào đối chiếu người có ô công ghi bằng 0 vào ngày cân và chưa được ghi trong NV vắng.
- Hiển thị số người nhận, mã và họ tên người được chia, người không được chia và người cần kiểm tra công trên từng phiếu.

## [2.0.3] — 14/11/2026
- Chuẩn hóa ngày cân khi đọc phiếu cũ để phiếu hợp lệ được đưa vào đúng kỳ.
- Chặn tính và chốt khi khối lượng hoặc số xe sai định dạng, bằng 0 hoặc âm.
- Báo phiếu giao trực tiếp khi nhân viên không có hợp đồng hiệu lực vào ngày cân.
- Nhập Excel báo xung đột khi cập nhật phiếu sang kỳ khác. Đối chiếu rồi dùng chuyển kỳ hoặc sửa phiếu có xác nhận.

## [2.0.2] — 14/11/2026
- Xóa kỳ và thay toàn bộ kỳ Sản lượng liệt kê và dọn các dòng tổng không có ngày cân. Phiếu thiếu ngày cần đối chiếu được giữ lại và báo trong bản xem trước.
- Khi thay toàn bộ kỳ, bỏ qua các dòng Total hoặc Tổng cộng nhận diện được và vẫn kiểm tra từng phiếu.
- Xuất bảng Sản lượng và Bơm dăm ở dạng dữ liệu Excel để đối chiếu và nhập lại. Lỗi bảng lương không chặn xuất Sản lượng.
- Khi xuất bảng, số tiền định dạng hàng nghìn được chuyển đúng sang ô số Excel.

## [2.0.1] — 13/11/2026
- Dashboard hiển thị số đầu vào còn nháp của kỳ đang xem và phiên bản ứng dụng hiện tại.
- Danh mục Tăng ca, Phụ cấp và Hỗ trợ có bảng gọn hơn, số tiền định dạng thống nhất và menu thao tác phụ.
- Ngăn chi tiết giữ tiêu đề, bốn tab và chân nút trong tầm nhìn. Điều hướng tab bằng phím mũi tên, Home và End.
- Bộ lọc nâng cao hiện tên màn hình và giữ vị trí khi dựng lại nội dung.

## [2.0.0] — 13/11/2026
- Chặn chốt khi phiếu Sản lượng hoặc Bơm dăm chưa gán hoặc được phân cho người không có trong bảng lương kỳ đó.
- Chặn chốt khi nhiều nhãn công tác xung đột trong cùng ngày. Hiện mã nhân viên, ngày và các nhãn cần đối chiếu.
- Cảnh báo công tăng ca thiếu mã và tiền cơm ghi ở cả hai nguồn cùng ngày. Suất bổ sung vẫn được tính theo dữ liệu đã nhập.
- Báo lỗi cấu hình số tiền hoặc hệ số không hợp lệ ở các mã Tăng ca, Phụ cấp và Hỗ trợ được sử dụng.
- Kế thừa các bản sửa của alpha.58.

## [2.0.0-alpha.58] — 12/11/2026
- Nâng Electron 43.7.9 → 43.8.9 (bản vá cùng dòng 43): hết cảnh báo bảo mật mức cao về chứng chỉ trung gian bị lộ. Không đổi tính năng.
- Kiểm tra dữ liệu (người phụ thuộc: "Ngày cấp CCCD ở tương lai") lấy ngày hôm nay theo giờ máy thay cho giờ UTC — trước 7 giờ sáng giờ Việt Nam không còn tính lệch một ngày.
- Cập nhật thư viện phụ của công cụ build (fast-uri 3.1.9, undici 6.29.1 / 7.30.2) qua `npm audit fix`: hết cảnh báo mức cao; còn 6 cảnh báo mức trung bình trong chuỗi electron-builder (minimatch), chỉ dùng lúc đóng gói, không nằm trong app đã cài.
- Không đổi công thức lương, thuế, bảo hiểm hay phân quyền.

Tạo Full Backup trước khi nâng cấp. OCR chữ tay vẫn chưa nghiệm thu đầy đủ trên hồ sơ thật.

## [2.0.0-alpha.57] — 11/11/2026
- Mã dùng công thức TC5 loại công tăng ca khỏi lương thời gian cùng quy tắc với mã TC5.
- Hỗ trợ dùng danh mục đúng kỳ. Kiểm tra trước khi chốt hiển thị mã phụ cấp hoặc hỗ trợ thiếu, hết hiệu lực hoặc chưa được tính.
- Ô công ở ngày không tồn tại được loại khỏi phép tính và báo lỗi trước khi chốt.
- KT-19 đối chiếu tổng giảm trừ với các thành phần trước làm tròn thực lĩnh.
- Sản lượng hiện ngày cân gốc và ngày phân bổ. Xem trước chuyển kỳ hiện NV vắng, tổng tấn theo người và phiếu chờ phân bổ.

## [2.0.0-alpha.56] — 10/11/2026
Ngày: 10/11/2026. Kế thừa alpha.55 / cc51ff8.

- **Trần lương đóng bảo hiểm:** BHXH/BHYT mặc định 46.800.000đ trước 07/2026 và 50.600.000đ từ 07/2026. Danh mục có hai cột trần để cấu hình theo hiệu lực. Giá trị trần âm hoặc sai định dạng bị chặn. Với BHTN, cần khai trần vùng khi lương đóng vượt mức trần thấp nhất trong các vùng.
- **Tỷ lệ bảo hiểm:** ô nhập chỉ nhận 0.08 / 0,08 / 8%; gõ "8" (thành 800%) bị từ chối. Dữ liệu cũ có tỷ lệ > 100%: không tính bảo hiểm bằng số sai và chặn chốt kỳ (INPUT_INVALID) cho đến khi sửa.
- **Ô tiền không đọc được** (chữ, "(200.000)", "1.5.2"…) ở Thưởng / Thu nhập khác / Trừ khác / Tạm ứng / Lương thỏa thuận / Lương cơ bản: không còn lặng lẽ coi là 0 — báo rõ dòng lỗi và chặn chốt kỳ.
- **Ngày theo giờ máy:** ngày chứng từ thanh toán, tên file "Sao lưu ra file" và mốc cảnh báo hợp đồng sắp hết hạn không còn lấy theo giờ UTC (trước 7 giờ sáng bị lùi 1 ngày).
- **Chi tiết hợp đồng:** ổn định vùng cuộn, bỏ hiệu ứng làm mờ nền và giữ form khi kéo chọn chữ.
- Kỳ đã chốt giữ nguyên số đã lưu. Không đổi thuế TNCN, công chuẩn, tăng ca, phân quyền.

Thuế vãng lai theo danh mục do người dùng cấu hình. Tạo Full Backup trước khi nâng cấp. OCR chữ tay vẫn chưa nghiệm thu đầy đủ trên hồ sơ thật.

## [2.0.0-alpha.55] — 04/11/2026
- Chốt kỳ không tự đổi phương pháp bù rồi tính lại. Nếu phương pháp xem thử khác quy chế chính thức, chặn chốt và yêu cầu chủ động chọn, tính và kiểm tra lại.
- Xác minh đầy đủ các cột công khai của bảng lương, bảo hiểm và thuế tại tiến trình chính.
- Tỷ lệ bảo hiểm dạng 8% / 1,5% được hiểu đúng như 0.08 / 0.015; nhập bậc thuế phân biệt mã thuế cha.
- Chuyển thành SL kỳ mới: chuyển hẳn phiếu sang tháng nhận, phân bổ theo người/tổ/công tháng nhận và dùng đơn giá/bù tháng nhận. Giữ số ngày trong tháng, lưu ngày/kỳ gốc; xem trước và xác nhận, cần Lưu để tính lương lại ở hai kỳ. Chỉ hỗ trợ cùng năm; ngày không tồn tại, kỳ chốt, phiếu trùng hoặc sổ chuyển chi trả đang tồn tại đều bị chặn.
- Chỉ đổi kỳ chi trả SL: giữ công kỳ nguồn; cảnh báo phân bổ đủ được hiển thị để xác nhận, lỗi chưa phân bổ báo chi tiết.
- Ổn định form hợp đồng, hồ sơ cơ bản, biến động lương, danh mục cha–con và bộ lọc. Bổ sung hướng dẫn công tính lương, tăng ca và hai cách chuyển sản lượng.

Kiểm chứng trước phát hành: 848 test unit/integration/regression; bộ Electron chung 264 kiểm tra trước thay đổi chuyển hẳn kỳ, cùng test Electron chuyển hẳn kỳ và các test ổn định form/danh mục. CI chạy lại các bộ kiểm tra trên commit phát hành.

Tạo Full Backup trước cập nhật. Bản cập nhật không tự sửa bảng lương đã chốt và không tự chuyển dữ liệu sản lượng.

## [2.0.0-alpha.54] — 03/11/2026
Sửa KT-20 bỏ sót Truy thu BH khi cộng tổng giảm trừ, gây chặn chốt sai dù thực lĩnh engine đã đúng. Giữ kiểm tra độc lập: thu nhập − BH NLĐ − KPCĐ − truy thu BH − thuế − trừ khác − tạm ứng; làm tròn nghìn khi không âm, âm thì thực lĩnh 0. Không thay đổi công thức engine hoặc số tiền đã tính.

Thêm test tái hiện 186.300 − 62.100 − 124.200 = 0 và vẫn chặn số thực lĩnh sai 124.000. Tạo Full Backup trước cập nhật.

## [2.0.0-alpha.53] — 03/11/2026
BH NLĐ và KPCĐ NLĐ luôn khấu trừ theo mức đóng, không phụ thuộc ngưỡng công. Không đạt ngưỡng thì truy thu phần công ty đã đóng khi có cả phần BH NLĐ và công ty đóng. Giữ truy thu trong phép trừ thực lĩnh. Tổng bảo hiểm cộng từ các khoản đã làm tròn. Đồng bộ tổng hợp, theo phòng ban và phần giải thích giảm trừ; không cộng truy thu lặp vào tổng BH phải nộp.

Bao gồm mẫu Excel bảo hiểm bốn sheet từ alpha.52 (bản alpha.52 chưa phát hành do người dùng yêu cầu dừng).

Tạo Full Backup trước khi cập nhật. Kỳ đã chốt không tự thay đổi; đối soát trước khi mở chốt và tính lại.

## [2.0.0-alpha.52] — 03/11/2026
Định dạng lại bốn sheet Excel bảo hiểm: tiêu đề công ty/kỳ/phạm vi/ngày lập, đầu cột xanh đậm, số tiền phân cách hàng nghìn, dòng tổng nổi bật, độ rộng cột, chữ ký, cố định tiêu đề và in A4 ngang. Mã nhân viên/sổ BH giữ dạng chữ. Sheet không có biến động vẫn hiện thông báo. Không đổi số liệu và công thức lương.

Tạo Full Backup trước khi cập nhật.

## [2.0.0-alpha.51] — 03/11/2026
Cộng BH NLĐ đóng luôn bằng tổng ba khoản BHXH, BHYT, BHTN đã làm tròn ở các cột chi tiết, kể cả người chưa đủ ngưỡng công. Quy tắc khấu trừ lương và truy thu giữ nguyên; tổng hợp trừ lương tiếp tục chỉ lấy người đủ điều kiện. KPCĐ là khoản riêng.

Tạo Full Backup trước khi cập nhật; kỳ đã chốt giữ nguyên.

## [2.0.0-alpha.50] — 03/11/2026
- Bù tổ chỉ tính số người hưởng lương sản phẩm có công BT trong tháng > 0. Người nghỉ cả tháng không làm giảm bình quân tổ.
- Người có công dưới ngưỡng vẫn tham gia mẫu số nhưng chưa nhận bù; mức sàn và ngưỡng giữ theo mã lương.
- Tên phương pháp: BÙ THEO ĐƠN GIÁ BÌNH QUÂN TỔ CỐ ĐỊNH NGÀY CÔNG THÁNG.
- Chuyển kỳ giữ công/người kỳ nguồn và đơn giá/ngày lịch kỳ chi trả. Cập nhật hướng dẫn.

Kiểm thử: 827/827 unit, integration, regression đạt; lint các tệp sửa đạt. Kiểm thử Electron và đóng gói Windows được xác nhận bởi CI của bản phát hành.

Tạo Full Backup trước khi cập nhật. Các kỳ đã chốt giữ kết quả; không mở chốt hoặc tính lại lịch sử nếu chưa đối soát.

## [2.0.0-alpha.49] — 29/10/2026
- Hồ sơ nhân sự trong form chỉ đóng và báo thành công sau khi ghi đĩa xác nhận thành công. Lỗi ghi hoàn tác dữ liệu và giữ nội dung form để thử lại; lần thử lại không tạo trùng hoặc dùng tham chiếu bản ghi cũ.
- Áp dụng cùng cơ chế cho sửa thông tin cơ bản, đổi Mã NV nhiều bảng và lập phụ lục biến động. Hủy xác nhận hồi tố không làm thay đổi dữ liệu hoặc báo nhầm lỗi ghi đĩa.
- Khi giao diện bị crash, không phản hồi hoặc không thể thực hiện lệnh xác nhận lưu, đóng cửa sổ cho chọn Giữ cửa sổ hoặc Thoát ứng dụng. Mặc định giữ cửa sổ; thoát cưỡng bức có thể mất thay đổi chưa lưu, không ghi đè file đã lưu.
- Xử lý cả trường hợp renderer ngừng hoạt động trong lúc đang chờ xác nhận đóng; phản hồi cũ không tự đóng cửa sổ sau khi người dùng chọn giữ lại.
- Vẫn chặn đóng khi thao tác lưu trữ năm đang chạy, và vẫn giữ cửa sổ khi ghi đĩa thất bại nhưng renderer đang hoạt động bình thường.
- Bổ sung unit/Electron regression bằng dữ liệu giả, cập nhật hướng dẫn trong app.

Không đổi công thức/đơn giá lương hay schema 5. Tạo Full Backup trước khi cập nhật.

## [2.0.0-alpha.48] — 29/10/2026
- Chặn phiếu Sản lượng/Bơm dăm trùng ở tầng repository khi sửa ô/dán dữ liệu. Kiểm lại trước xác nhận đầu vào và tại tiến trình chính trước tính/chốt/xuất lương; không chỉ kiểm trong form.
- Không cho xóa trống hoặc ghi ngày cân không hợp lệ. Dòng lỗi cũ được hiển thị riêng với Sửa/Xóa; không bị biến khỏi màn hình rồi tính thiếu sản lượng. Ngày/kỳ không xác định chặn tính lương cho đến khi sửa/xóa, vì không thể xác định kỳ chịu ảnh hưởng.
- Chặn việc xóa/thêm Mã NV để ngầm đổi cách phân bổ Bơm dăm. Đổi cách phân bổ cần xóa phiếu và tạo lại đúng tab. Giữ một nút tạo phiếu theo ngữ cảnh, bỏ nút thêm trùng chức năng.
- Khi đóng cửa sổ Windows, tiến trình chính yêu cầu renderer ghi xong và xác nhận thành công trước khi đóng. Nếu ghi thất bại thì giữ cửa sổ và dữ liệu đang sửa; có thể thử lưu lại. Trình duyệt cũng có bảo vệ beforeunload.
- Nâng lớp tiêu đề cột Thao tác cố định để các tiêu đề cuộn ngang không che lên, kiểm thử ở viewport 1024×768.
- Bổ sung test từ các tình huống lỗi đã tái hiện; cập nhật hướng dẫn trong app.

Không thay đổi công thức hoặc đơn giá lương, không thay đổi schema 5. Dữ liệu thử hoàn toàn giả; không đưa dữ liệu lương/backup thật vào repo. Tạo Full Backup trước khi cập nhật.

## [2.0.0-alpha.47] — 29/10/2026
## Nháp → Lưu để tính lương

- Chấm công, Sản lượng và Bơm dăm có nút **Lưu để tính lương**. Nhập Excel, thêm, sửa, dán hoặc xóa tạo thay đổi Nháp, vẫn được giữ trên máy để tiếp tục sau khi mở lại.
- Khi còn Nháp, không chạy tính lương/chốt/xuất bảng lương chính thức của kỳ đó. Tiến trình chính cũng kiểm tra, không chỉ ẩn nút trên giao diện. Sản lượng chuyển kỳ phải lưu cả đầu vào kỳ nguồn.
- Nút Lưu xác nhận toàn bộ kỳ đang chọn của bảng/tab, không chỉ các dòng đang lọc. Lỗi ghi đĩa hoàn tác trạng thái xác nhận; không báo đã lưu thành công.
- Dữ liệu có trước nâng cấp được giữ là đã lưu. Kỳ đã chốt vẫn giữ nguyên bản chốt. Full Backup giữ cả Nháp và trạng thái xác nhận, không phụ thuộc nhật ký trên máy cũ.
- Cấu trúc dữ liệu 5 bảo vệ dữ liệu có trạng thái Nháp khỏi bị bản app cũ tự dùng tính lương. Sao lưu đầy đủ trước khi cập nhật; dùng alpha.47 hoặc mới hơn để mở dữ liệu đã nâng cấp.

## Bơm dăm tách hai tab

- **Phân bổ theo tổ**: phiếu, ngày cân, số xe, tổ/phòng ban và NV vắng; mẫu Excel chia tổ.
- **Phân bổ trực tiếp nhân viên**: phiếu, ngày cân, số xe và Mã NV; mẫu Excel giao trực tiếp giữ số 0 đầu mã.
- Danh sách, cột nhập, tổng theo bộ lọc và xác nhận Lưu tách riêng cho từng cách. File nhập sai cách phân bổ bị báo, không ghi lẫn.
- Sửa phiếu giữ đúng cách phân bổ hiện tại. Nếu chọn sai cách, xóa phiếu rồi tạo lại ở tab đúng và Lưu để tính lương.
- Bỏ cột nút ✕ trùng ở cuối ba bảng; chỉ giữ Sửa/Xóa trong cột Thao tác ở đầu.

Không đổi đơn giá hoặc công thức lương. Kiểm thử chỉ dùng dữ liệu giả.

## [2.0.0-alpha.46] — 29/10/2026
## Bơm dăm: chọn rõ cách phân bổ
- Thêm dòng hoặc Giao trực tiếp cho Mã NV mở form phiếu, chọn Trực tiếp theo Mã NV / Chia theo tổ.
- Trực tiếp: chọn nhân viên, nhập số xe được giao; dữ liệu Mã phòng ban/NV vắng được bỏ khi lưu, không chia thêm cho tổ.
- Theo tổ: giữ cách chia người có mặt/NV vắng hiện tại, bỏ Mã NV của cách trực tiếp.
- Nút Sửa/Xóa rõ ở đầu dòng; sửa phiếu không tạo thêm một dòng mới.
- Mẫu Excel giao trực tiếp: Phiếu cân, Ngày cân, Biển số, Số xe, Mã NV. Dùng Nhập Excel tại Bơm dăm. Bảng trống để điền dữ liệu thật, không chứa dòng nhân viên mẫu; cột Mã NV, số phiếu và biển số đặt dạng Chữ để giữ số 0 đầu.
- Cột hiển thị Số xe giữ tương thích trường lưu KL hàng (Tấn) cũ; hỗ trợ phần xe lẻ như cách tính hiện có.
- Chặn trùng cùng phiếu/người nhận hoặc trộn một phiếu chia tổ với dòng giao trực tiếp trong form. Kỳ đã chốt/quyền nhập liệu vẫn được kiểm tra; giao dịch hoàn tác và giữ form khi ghi đĩa thất bại.

Không đổi công thức/đơn giá bơm dăm, thuật toán chia tổ, sổ chuyển SL hay cấu trúc dữ liệu. Logic nhận Mã NV vốn đã có được đưa thành lựa chọn UI rõ ràng. Khôi phục máy mới không phụ thuộc nhật ký.

Kiểm thử chỉ dùng hồ sơ giả: 14 test mới, Electron nhập trực tiếp/đổi cách chia/đổi lại/chặn trùng, kiểm tra giá trị lương và nhập Excel trực tiếp. CI kiểm toàn bộ hồi quy và đóng gói Windows theo commit phát hành.

## [2.0.0-alpha.45] — 28/10/2026
## Nhập liệu
- Bảng Chấm công và Sản lượng có nút Sửa/Xóa rõ ở đầu dòng.
- Thay toàn bộ kỳ từ Excel: xem trước số xóa/thêm, chỉ chấp nhận dòng đúng kỳ và hợp lệ, sao lưu trước, giao dịch hoàn tác khi ghi đĩa thất bại. Không tác động kỳ khác.
- Xóa dữ liệu kỳ: xem trước và xác nhận riêng; kỳ đã chốt vẫn khóa.

## Sản lượng kỳ trước trả kỳ sau
Trong Sản lượng, chọn kỳ phát sinh (ví dụ 09/2026) → Chuyển kỳ chi trả SL → chọn 10/2026 → xem trước → xác nhận.
- Giữ phiếu/ngày cân, tổ và chấm công tháng 9; người vào tháng 10 không nhận phiếu tháng 9.
- Dùng mã lương sản lượng của hồ sơ kỳ phát sinh, tra đơn giá và quy chế bù CHÍNH THỨC hiệu lực kỳ chi trả. Công/ngày làm và Chủ nhật theo kỳ phát sinh; chia bình quân tổ dùng số ngày kỳ chi trả.
- Chuyển toàn bộ sản lượng của một kỳ, một lần, trong cùng năm. Chưa hỗ trợ chuyển một phần phiếu hoặc chuyển qua năm.
- Người đã nghỉ trước kỳ trả vẫn nhận khoản chuyển; phải chọn rõ mã thuế kỳ chi trả trong xem trước. Không tự trả thêm lương thời gian/BH cho người chỉ nhận khoản chuyển.
- Tiền SL và bù chuyển được cộng một lần vào Thu nhập khác của kỳ trả, xử lý thuế cùng kỳ; có cột đối soát riêng Kỳ nguồn/Tấn/Lương SL/Bù SL kỳ trước.
- Kỳ phát sinh không tính lại SL/bù đã chuyển. Khi kỳ nguồn đã chốt có tiền SL/bù hoặc thiếu đối soát: chặn, yêu cầu mở chốt và đối soát; không sửa bản chốt đã trả.
- Chặn kỳ trả đã chốt, chuyển trùng, chưa phân bổ hết, thiếu công nguồn/đơn giá/quy chế. Muốn sửa công/phiếu/hồ sơ nguồn đang chuyển: hủy chuyển rồi lập lại (khi chưa chốt).
- Main tự kiểm sổ chuyển và tính lại trước chốt. Hồ sơ năm lưu cả sổ chuyển. Không thay các công thức mặc định cho dữ liệu không dùng chuyển kỳ; chỉ thêm nhánh tách kỳ được chủ sở hữu yêu cầu.

Khôi phục không phụ thuộc nhật ký trên máy mới. Không chứa hồ sơ thật.

Khi xác nhận chuyển, dữ liệu lên cấu trúc 4; các bản cũ chỉ hỗ trợ tới cấu trúc 3 sẽ từ chối mở để tránh tính trùng. Hồ sơ năm giữ nguyên số cấu trúc khi đóng kho. Tệp chưa dùng chuyển kỳ không tự nâng lên 4.

## [2.0.0-alpha.44] — 28/10/2026
- Đăng xuất thủ công lưu các thay đổi và nhật ký trước khi thu hồi phiên. Nếu ghi thất bại, giữ phiên và nội dung, báo nguyên nhân để thử lại.
- Tự khóa sau 30 phút vẫn khóa đúng hạn ngay cả khi không ghi được; giữ dữ liệu chưa lưu trong RAM và cảnh báo đăng nhập lại. Đóng app khi còn lỗi lưu vẫn có thể mất các thay đổi chưa được ghi.
- Sao lưu thông thường dừng nếu không ghi được thay đổi hiện tại, tránh tạo bản sao cũ nhưng tưởng đã bao gồm nội dung mới.
- Không dùng ngoại lệ máy mới để bỏ qua lỗi lưu dữ liệu đang chỉnh sửa.
- Nạp danh mục chuẩn dùng giao dịch: lỗi ghi hoàn tác danh mục và nhật ký, không báo thành công.

10 test mới kiểm tra thứ tự lưu/thu hồi phiên, tự khóa, sao lưu và hoàn tác nạp danh mục. Test máy mới mô phỏng đúng trạng thái sạch khi chưa có tệp dữ liệu; có test riêng cho máy chưa có tệp nhưng còn thay đổi chưa lưu.

Khôi phục dữ liệu máy mới không phụ thuộc nhật ký tồn tại hoặc trùng khớp. Công thức lương không thay đổi; kiểm thử chỉ dùng dữ liệu giả. Kết quả kiểm thử/build xem workflow gắn với commit phát hành.

## [2.0.0-alpha.43] — 27/10/2026
Các thao tác quản trị chỉ báo thành công sau khi dữ liệu được ghi xuống đĩa.

- Tạo/sửa tài khoản: ghi thất bại giữ form, hoàn tác tài khoản và nhật ký phát sinh, hiện nguyên nhân.
- Đổi mật khẩu và cấp lại mã khôi phục: ghi thất bại giữ mật khẩu/mã cũ, không hiện mã mới chưa lưu.
- Khôi phục quyền Admin: cập nhật mật khẩu và mã khôi phục trong một giao dịch; thất bại hoàn tác trạng thái.
- Xóa toàn bộ: thất bại ghi đĩa trả lại dữ liệu trong RAM, vẫn có bản sao lưu trước thao tác.
- Giao dịch thất bại giữ trạng thái chỉnh sửa chưa lưu từ trước và đồng bộ lại tham chiếu phiên người dùng.
- Bổ sung 10 test giao dịch và ca Electron riêng cho dữ liệu 1.3 có kỳ lương đã chốt.

Khôi phục dữ liệu trên máy mới không yêu cầu nhật ký tồn tại hoặc khớp. Công thức tính lương không thay đổi. Không chứa dữ liệu thật.

Kiểm chứng tại máy phát triển: 751/751 unit/integration/regression; 3/3 first-run restore; DOM Smart Filter và 3 danh mục; ca legacy độc lập đạt. Electron đầy đủ đạt 264/264 tại máy phát triển. Build Windows xem workflow đi kèm commit.

## [2.0.0-alpha.42] — 27/10/2026
Ngày: 27/10/2026. Kế thừa main alpha.41 / 276351e.

- Khôi phục JSON không báo thành công hoặc chạy bước tiếp theo nếu chưa ghi được xuống đĩa. Trả lại dữ liệu trước khôi phục trên giao diện và hiện lý do lỗi. Trạng thái trước thao tác không bị sửa qua tham chiếu chung của nhật ký/tài khoản.
- Khi kiểm tra sau khôi phục không đạt, trả lại trạng thái cũ và báo riêng nếu việc ghi lại trạng thái cũ cũng thất bại.
- Đồng bộ hoạt động gõ/bấm thật với phiên tại tiến trình chính (tối đa một lần/phút). Nhập liệu lâu không còn tự hết phiên chỉ vì chưa bấm Lưu. Không có tác vụ nền tự giữ phiên; không thao tác vẫn hết hạn sau 30 phút; phiên hết hạn, tài khoản khóa/thu hồi không tự được phục hồi.
- **Giữ chính sách khôi phục độc lập nhật ký của alpha.41 theo yêu cầu chủ sở hữu. Không yêu cầu khớp, không dùng nhật ký để chặn khôi phục trên máy mới.** File có tài khoản dùng tài khoản cũ; file chỉ có bảng dữ liệu cho tạo Admin sau khi khôi phục. Không thay main/write-policy.js.
- Thêm kiểm thử máy mới: file có nhật ký cũ, nhật ký rỗng, hoặc không có cả tài khoản lẫn nhật ký; dữ liệu nhân viên vẫn còn sau đăng nhập/tạo Admin.

Không đổi công thức lương, kiểm tra CCCD hay các quyền nghiệp vụ. Không chứa dữ liệu thật.

Tạo Full Backup trước khi nâng cấp. Giữ SHA256SUMS.txt và BUILD_INFO.json cùng Setup để truy vết. OCR chữ tay vẫn chưa nghiệm thu đầy đủ trên hồ sơ thật.

## [2.0.0-alpha.41] — 27/10/2026
Ngày: 27/10/2026. Kế thừa alpha.40 / 457ada8.

- Màn thiết lập ban đầu có 2 lựa chọn rõ ràng: (1) tạo dữ liệu và tài khoản mới; (2) khôi phục từ dữ liệu cũ. File có sẵn tài khoản thì đăng nhập bằng tài khoản cũ; file chỉ có bảng dữ liệu thì giữ dữ liệu và yêu cầu tạo tài khoản Admin.
- Khôi phục / nhập file chỉ có bảng dữ liệu không còn bị chặn ghi xuống đĩa: giữ tài khoản, bảo mật, thông tin công ty, nhật ký, kỳ lương đã chốt và chứng từ thanh toán của máy khi file không có các phần này. File có sẵn các phần đó thì dùng nguyên trong file (cài lại Windows không mất nhật ký/tài khoản).
- Máy mới chưa có file dữ liệu: không coi "chưa có gì để sao lưu" là lỗi sao lưu trước khi khôi phục.
- **Thay đổi chính sách ghi (main/write-policy.js):** bỏ chốt "nhật ký thao tác chỉ được thêm, không được sửa/xóa" theo yêu cầu của chủ sở hữu. Nhật ký không còn chặn ghi nhưng cũng không còn là bằng chứng chống sửa; đối chiếu lịch sử dựa vào các bản sao lưu. Các chốt khác (quyền theo bảng, kỳ đã chốt, chứng từ đã thanh toán, tài khoản) giữ nguyên.
- Hộp thoại "Đã nạp dữ liệu nhưng CHƯA lưu được xuống đĩa" hiện thêm dòng **Lý do**.
- Màn Công ty & Sao lưu: bảng "vị trí dữ liệu" không tràn khung ở cửa sổ hẹp (nút thao tác tự xuống dòng, bảng cuộn ngang).
- Sao lưu theo năm `nam-YYYY` (alpha.35) giữ nguyên.
- Không thay công thức lương, phân quyền theo bảng hay kiểm tra CCCD.

Tạo Full Backup trước khi nâng cấp. Giữ SHA256SUMS.txt và BUILD_INFO.json cùng Setup. OCR chữ tay vẫn chưa nghiệm thu đầy đủ trên hồ sơ thật.

## [2.0.0-alpha.40] — 27/10/2026
Ngày: 27/10/2026. Kế thừa alpha.39 / d134d31.

- Form nhập liệu thông thường không tự đóng khi click nền ngoài; chỉ đóng bằng nút × / Hủy / hoàn tất thao tác. Tránh mất bản nháp khi kéo bôi đen từ ô nhập ra ngoài form.
- Khi thêm nhân viên không lưu được, hiện lý do gốc từ tiến trình lưu (quyền ghi, phiên đăng nhập, lỗi ổ đĩa…) ngay trong thông báo. Không chỉ hiện cảnh báo chung.
- Giao dịch thất bại vẫn hoàn tác các bảng nhân viên/cá nhân/hợp đồng/phụ lục/thanh toán/học vấn và nhật ký; form giữ nguyên để sửa hoặc thử lại.
- Không thay công thức lương, phân quyền, kiểm tra CCCD hay dữ liệu thật.

Lưu ý: sửa việc che mất lý do lỗi không đồng nghĩa đã xác định nguyên nhân mọi máy bị từ chối lưu. Nếu vẫn gặp lỗi, giữ form và gửi phần **Lý do**; không tắt các kiểm tra bảo vệ để ép ghi.

Tạo Full Backup trước khi nâng cấp. Giữ SHA256SUMS.txt và BUILD_INFO.json cùng Setup. OCR chữ tay vẫn chưa nghiệm thu đầy đủ trên hồ sơ thật.

## [2.0.0-alpha.39] — 23/10/2026
Ngày chuẩn bị: 23/10/2026. Kế thừa main bd293d7 và Setup alpha.38.

- Chặn 1 người có 2 Mã NV (cùng Số CCCD) bị trả lương 2 lần (PR #7):
  - Chốt kỳ bị chặn cứng (như Mã NV trùng) khi 2 nhân viên CÓ TRONG bảng lương kỳ đó dùng chung Số CCCD. Người đã nghỉ trước kỳ không tính.
  - Sửa ô, dán nhiều dòng, form hồ sơ: không cho gán Số CCCD đã thuộc nhân viên khác.
  - Nhập Excel: dòng gán CCCD của người khác (đã có trong dữ liệu, hoặc dòng khác trong cùng file) được đánh dấu "Xung đột (không ghi)"; chính người đang giữ CCCD vẫn cập nhật được.
  - CCCD được chuẩn hóa trước khi so (bỏ khoảng trắng / dấu, bù số 0 đầu bị Excel làm mất).
- Logic nằm trong mô-đun mới core/identity.js. Không đổi engine.js, hr.js, repository, importer hay công thức tính lương.
- Giữ nguyên toàn bộ nội dung alpha.38 (Excel SheetJS 0.20.3, công tắc Umi-OCR, tiến độ / dừng đọc OCR).

Dữ liệu ĐANG có 2 người trong bảng lương cùng Số CCCD sẽ không chốt được cho tới khi gộp về 1 Mã NV hoặc sửa CCCD nhập sai — chạy Công ty & Sao lưu → Kiểm tra dữ liệu trước kỳ chốt.

OCR chữ tay và ảnh chụp thật chưa nghiệm thu đầy đủ. Trước khi cài: tạo Full Backup. Giữ SHA256SUMS.txt và BUILD_INFO.json kèm Setup để truy vết. Không ghi đè release alpha.37 / alpha.38.

## [2.0.0-alpha.38] — 23/10/2026
Ngày chuẩn bị: 23/10/2026. Kế thừa main 83a2b8d và Setup alpha.37.

- Nâng thư viện nhập Excel SheetJS từ 0.18.5 lên 0.20.3 (nguồn CDN chính thức); giữ giới hạn file 20 MB.
- Bao gồm Umi-OCR tùy chọn từ PR #6. Thêm công tắc trong trang Đọc ảnh chấm công; thiết lập áp dụng trong phiên mở app. HAK_UMI_OCR=0 vẫn tắt bắt buộc.
- Hiển thị tiến độ theo ô; Dừng đọc ngừng sau ô hiện tại, bỏ lô đang đọc dở, giữ trang đã hoàn thành. Không tự nhập dữ liệu.
- Giảm gọi Umi-OCR lặp bằng SHA-256 của PNG giống hệt nhau; tối đa 512 kết quả trong RAM, xóa khi đổi công tắc, không lưu ảnh xuống đĩa. Đây là tối ưu ô trùng, chưa ghép nhiều ô vào một ảnh.
- Giữ nguyên mô-đun OCR dùng chung được ghim và công thức tính lương.

OCR chữ tay và ảnh chụp thật chưa nghiệm thu đầy đủ. Umi-OCR do người dùng tự cài/chạy trên máy; chỉ cung cấp gợi ý, không thay kết quả tự động. Không tuyên bố mức tăng độ chính xác trên hồ sơ thật.

Trước khi cài: tạo Full Backup. Giữ SHA256SUMS.txt và BUILD_INFO.json kèm Setup để truy vết. Không ghi đè release alpha.37.

## [2.0.0-alpha.37] — 22/10/2026
Ngày chuẩn bị phát hành: 22/10/2026. Đây là bản alpha, chưa coi OCR chữ tay là đã nghiệm thu đầy đủ.

## Thay đổi

- Hợp nhất quản lý repo về main, lấy LuongHAK_Offline làm app chính; bảo toàn lịch sử 11 nhánh nguồn.
- Giữ mã dev đã hardening tại legacy/dev-reference và các mô-đun KPI chưa duyệt tại experimental/kpi; không đưa hai vùng này vào bộ cài.
- Tích hợp nắn trang ảnh OCR từ feature/ocr-page-rectify.
- Giữ giá trị Còn thiếu (thực lĩnh âm) khi khấu trừ vượt thu nhập. Ví dụ 800.000đ thu nhập, 5.000.000đ tạm ứng: thực lĩnh 0đ, còn thiếu 4.200.000đ. Cột hiện trong bảng và Excel, giữ trong bản chốt mới; không tự trừ tháng sau, không sửa bản chốt cũ.
- Phiếu lương phân biệt khoản thiếu với tiền làm tròn.
- Đã kiểm tra chuỗi tiền 20.800.000 được đọc thành 20800000 trên app chính.
- Cấu hình lint phù hợp môi trường Electron/Node, không thay quy tắc lương CĐ hay tự kích hoạt tiền KPI.

## Cài đặt và dữ liệu

Tên Setup chứa phiên bản 2.0.0-alpha.37. Giữ tệp SHA256SUMS.txt và BUILD_INFO.json kèm bản cài để truy vết đúng commit/build. Tạo Full Backup trước khi nâng cấp, đặc biệt khi đã có kho hồ sơ năm. Không hạ về bản không hỗ trợ schema 3 sau khi đã lưu trữ năm.

## Kế thừa

Phiên bản app, package-lock và nhãn UI phải khớp. Mỗi bản tiếp theo tăng phiên bản và thêm ghi chú phát hành riêng. Workflow main chỉ phát hành sau khi các kiểm tra đạt, không ghi đè tag hoặc release đã tồn tại. Lịch sử các nhánh gốc: docs/CONSOLIDATED_BRANCHES.json.

## [2.0.0-alpha.25] — pre-release V9.4 (chưa phải bản ổn định; chưa nghiệm thu thực địa trên Windows → `WINDOWS_UAT_PENDING`)
### Chức năng mới / thay đổi
- **OCR chấm công tự ghi mẫu sửa**: mỗi ô sửa/dán hiện trạng thái lưu (đã lưu chờ duyệt / hàng đợi / lỗi) ngay trên ô và ở thanh trạng thái; dòng chưa ghép nhân viên có khóa mẫu riêng (không trùng nhau); dán nhiều ô được ghi mẫu.
- **Bộ lọc dùng chung**: một popover duy nhất (đóng nhóm cũ khi mở nhóm mới), lựa chọn nháp + **Áp dụng/Hủy**, nhãn “Nhóm: Tất cả / Nhóm (n)”, chip điều kiện + “Xóa tất cả”, định vị trong cửa sổ (mở lên trên khi gần mép dưới), Escape/bấm ngoài đóng; tick checkbox không render lại ứng dụng. Áp dụng cho Báo cáo lương, Chấm công, Sản lượng, Bơm dăm. Bản tính lương tạm được nhớ theo phiên bản dữ liệu nên đổi bộ lọc **không tính lại engine**.
- **Danh mục chỉ xem mặc định**: Thêm mới / Sửa → **Lưu / Hủy**, không tự lưu khi gõ; hỏi khi rời có thay đổi chưa lưu; Sao chép, Lịch sử, **Xóa chỉ khi chưa dùng, đã dùng → Ngừng hiệu lực**; main từ chối xóa mã đã nằm trong bản chốt kỳ lương.
- **Thuế TNCN cha–con**: nút **Chi tiết** ở từng phiên bản của mã cha mở đúng các bậc con (mã + hiệu lực tự gán); kiểm tra bậc **chồng** → `TAX_CONFIG_CONFLICT`, **hở/tỷ lệ sai** → `TAX_CONFIG_ERROR` (chặn chốt/xuất, kể cả ở main).
- **Ba chỉ tiêu thuế tách riêng** (Thu nhập chịu thuế / Thu nhập tính thuế / Thuế khấu trừ) và nút **XEM CHI TIẾT TÍNH THUẾ** (hồ sơ, NPT, giảm trừ, bậc áp dụng, đối chiếu thuế tính lại).
- **Nhóm menu BÁO CÁO LƯƠNG**: Bảng tính lương, Bảng tổng hợp lương, Bảng thanh toán lương, Bảng kê chuyển khoản, Thanh toán tiền mặt, Phiếu lương, Báo cáo lương khác. Tiêu đề báo cáo **IN HOA** trên màn hình, PDF, Excel.
- **Sổ chứng từ thanh toán lương** (`ttluong`): lập → duyệt (người duyệt ≠ người lập) → ghi nhận đã chi; hủy cần lý do; chống lập trùng; số tiền lấy từ *còn phải thanh toán* (thực lĩnh − đã chi − đang chờ), không từ tổng thu nhập; trạng thái thanh toán chỉ đổi theo nghiệp vụ, **không đổi khi xuất file**; quyền mới `payment.record`; dòng “Đã thanh toán” bất biến ở main.
- **Excel chuyên nghiệp** (ExcelJS): khối tiêu đề + phạm vi lọc + đơn vị + ngày, tổng, chữ ký, A4 ngang (A3 khi > 14 cột), vừa chiều ngang, lặp dòng tiêu đề, vùng in, đóng băng, AutoFilter; Mã NV/STK dạng chữ.
- Không xuất chính thức khi còn lỗi nghiêm trọng (thiếu STK/ngân hàng, thiếu HTTT, blocker bảng lương); bảng thanh toán/kê chỉ xuất từ kỳ đã chốt.
### Sửa lỗi
- Lưu danh mục bị chặn hồi tố nay hiện thông báo rõ thay vì chỉ ghi vào dòng; `isPayrollFile` nhận thêm tên “KeChuyenKhoan”.
### Chưa làm / không đạt (xem docs/V9_4_AUDIT_RELEASE.md)
Mã hóa dữ liệu trên đĩa; thanh tiến độ khi chuyển thư mục dữ liệu; đối chiếu workbook nguồn (`BLOCKED_SOURCE_DATA`); thử với bản scan thật; chạy trên Windows thật; các báo cáo “Lương 12 tháng / Thu nhập năm / Thuế TNCN năm” chưa được thiết kế lại sang Excel chuyên nghiệp (vẫn là bản V9.2).

## [2.0.0-alpha.24] — pre-release V9.2 (chưa phải bản ổn định; chưa nghiệm thu thực địa trên Windows)
### Chức năng mới
- **Thuế TNCN cha–con**: `DM_TNCN` (mã thuế, phương pháp, hiệu lực, trạng thái) + `DM_TNCN_BIEUTHUE` (bậc). Tra theo Mã thuế trên HĐLĐ, theo kỳ và phiên bản hiệu lực; Nháp không được dùng; Ngừng bị chặn. Giao diện: thêm dòng, sao chép phiên bản, duyệt, ngừng, kiểm tra chồng/hở bậc, thử tính, lịch sử. Thuế **luôn** trừ vào thực lĩnh theo kết quả công thức (không có công tắc tắt).
- **Thiếu/sai mã thuế hoặc biểu thuế → `TAX_CONFIG_ERROR`**: chặn chốt kỳ và xuất bảng lương; không tự chọn mã khác, không âm thầm tính 0.
- **Người phụ thuộc**: CCCD, ngày cấp, giới tính, MST, ngày sinh, địa chỉ, kỳ giảm trừ từ/đến (tháng), trạng thái đăng ký; CCCD/MST lưu dạng chữ (giữ số 0 đầu); phát hiện trùng và chồng kỳ; chỉ giảm trừ ở tháng hợp lệ.
- **Công chuẩn** = Ngày cơ sở − Số ngày giảm trừ (DM_LUONG), không còn số 25/30 cứng; lỗi cấu hình → `CONG_CHUAN_ERROR` chặn chốt.
- **Tài liệu đính kèm HĐLĐ** (PDF/JPG/PNG, nhiều file/hợp đồng, bảng `HDLD_TAILIEU`) lưu trong kho chứng từ (DocumentID + SHA-256); xem trước chỉ nạp khi bấm, mở, thay thế (giữ bản cũ), gỡ liên kết (bắt buộc lý do), lịch sử, kiểm tra toàn vẹn; nằm trong Full Backup/Restore. Kiểm tra nội dung thật của file (magic bytes, cắt cụt, PDF có `/Launch`/`/JavaScript` bị từ chối — kiểm tra heuristic).
- **Bộ lọc**: Chấm công — chọn nhiều hình thức công + “không có hình thức”; Sản lượng/Bơm dăm — dùng chung một thành phần (phòng ban nhiều lựa chọn, từ–đến ngày, tháng, kỳ lương), tổng tính lại từ đúng dòng đã lọc (theo ngày/phòng ban, đã/chờ phân bổ, phiếu trùng chỉ tính một lần), xuất Excel/PDF đúng dòng lọc.
- **CompanyID**: nút Admin “Gán Mã công ty cho dữ liệu cũ” — chỉ chạy khi xác định được duy nhất một công ty có mã; nhiều công ty/thiếu mã → chặn, không đoán; không ghi đè; có sao lưu trước.
### Bảo mật tiến trình chính
- `store-save` kiểm quyền theo từng bảng (so sánh với trạng thái trên đĩa): kỳ lương bất biến, nhật ký chỉ thêm, tài khoản chỉ Admin; chốt kỳ được **tính lại ở main** và bị từ chối nếu còn blocker (gồm sản lượng chưa phân bổ).
- Tải file bảng lương của kỳ chưa chốt còn blocker bị hủy ở main (tên file “khối lượng/sản lượng” không bị coi là bảng lương).
- Kho chứng từ HĐLĐ: quyền `hr.view/hr.edit` kiểm ở main.
- Khôi phục Full Backup: chỉ Admin được thay dữ liệu, và chỉ trong cửa sổ main đang giữ khóa khôi phục.
### Chưa làm / không đạt (xem docs/V9_2_AUDIT_RELEASE.md)
Mã hóa dữ liệu trên đĩa; tiến độ/hủy khi chuyển thư mục dữ liệu; đối chiếu với workbook nguồn (`BLOCKED_SOURCE_DATA`); chạy thật trên Windows; thử với bản scan thật.

## [2.0.0-alpha.23] — pre-release V9 (chưa phải bản ổn định; chưa nghiệm thu thực địa trên Windows)
### Chức năng mới
- **Phân quyền do tiến trình chính quyết định**: đăng nhập được kiểm tra tại main (đọc tài khoản trên đĩa, tự băm/so mật khẩu, tự tra vai trò → quyền); giao diện không còn gửi được danh sách quyền. Thu hồi quyền (khóa/đổi vai trò/xóa tài khoản) có hiệu lực ngay; phiên tự hết hạn sau 30 phút không thao tác; chặn khung (iframe) và trang lạ.
- **OCR học từ sửa tên nhân viên**: nhớ “chuỗi tên trên giấy ↔ Mã NV” đã được xác nhận; chỉ chọn sẵn khi đã xác nhận trên ≥ 2 chứng từ, không bao giờ tự chọn khi trùng họ tên hoặc xung đột.
- **Cặp chữ số dễ nhầm** (1/7, 3/8, 0/6, 5/6, X/-) không còn được tự chấp nhận, luôn chuyển sang “gợi ý”.
- **Lưới chấm công** có thêm lọc: hình thức công, dòng có ô lỗi, nguồn OCR (có/không/đã sửa tay sau nhập).
- **Bộ lọc dùng chung** chọn nhiều giá trị (khối, phòng ban, tổ, mã lương, thanh toán, hình thức công, nhân viên), tìm không dấu, lưu bộ lọc.
- **Cache công thức** (AST): 40.000 lượt tính ở 5.000 NV từ 205,6 ms còn 15,7 ms, kết quả không đổi.
### Lỗi đã sửa / chặn
- Bảng lương có **FORMULA_ERROR** không còn xuất được như bản chính thức (Excel/PDF).
- **Khôi phục** kiểm cả nội dung (SHA-256 từng bảng + tổng snapshot kỳ đã chốt), không chỉ số dòng.
- Chống bấm 2 lần: chốt kỳ, nhập Excel; khôi phục không chạy song song.
- Tên người thực hiện ghi vào thư viện OCR / chứng từ / Full Backup lấy từ phiên đã xác thực ở main.
### Thay đổi dữ liệu
- Thêm bảng `ocr_ten` (bộ nhớ tên OCR) và dùng `chungtu_lienket`; không đổi công thức lương, không đổi kỳ đã chốt. Bản sao lưu cũ vẫn nhập được.
### Giới hạn / lỗi đã biết
- Chưa chạy trên máy Windows thật, chưa thử scan viết tay thật; Full Backup còn chạy trên luồng chính (không có nút hủy).
- Nghiệp vụ lương trong giao diện (chốt/mở kỳ, sửa danh mục) vẫn kiểm quyền ở renderer; dữ liệu trên đĩa chưa mã hóa.
- 4 điểm lệch với Excel cần quyết định của quản lý (thuế TNCN có khấu trừ vào thu nhập còn lại, KPCĐ khi tính thuế, truy thu BH, công chuẩn mã CĐ) — xem `LuongHAK_Offline/docs/V9_PAYROLL_RECONCILIATION.md`.
### Nâng cấp / quay lại
- Trước khi cập nhật: **Full Backup** (Công ty & Sao lưu → Full Backup). Cài đè bản mới, dữ liệu ở `%APPDATA%\Tinh Luong HAK` không bị xóa.
- Quay lại bản cũ: cài lại bản trước, dùng Full Backup/Sao lưu tự động trong `backups\` để khôi phục.

## [2.0.0-alpha.22] — 12/10/2026 — OCR: bảng chấm công tay (dấu x, ghi giờ, số ca)
- **Chủ sở hữu duyệt quy ước đọc** (R-69): *"x: 1 công, xx: 2 công, xxx: 3 công, ghi giờ = giờ/8"* và lịch ca *"1 ca = 1 công; "1+2" = 2 công"*.
- Đọc ảnh chấm công → chọn **Cách đọc ô**:
  - **Số công**: như cũ;
  - **Dấu x · giờ / 8**: đếm số dấu x trong ô; ô ghi "7h-15h" thì lấy số giờ / 8, qua đêm được;
  - **Số ca**: "1" / "2" / "3" = 1 công, "1+2" = 2 công, X = nghỉ.
- Chọn cho file mới, hoặc đổi riêng từng trang thì app đọc lại trang đó.
- Bảng dọc mỗi người 1 cột (bảng tay của tổ):
  - tên người lấy từ tiêu đề cột, loại *Chấm công BT*;
  - cột Ngày, Thứ, Ghi chú, Ký tên… bỏ qua;
  - tiêu đề viết tay không đọc được nhưng cột có ≥ 5 ô có số (khi đọc dấu x / số ca) → mặc định *Chấm công BT*, chọn nhân viên bằng tay.
- Bảng **2 khối ngày** đặt cạnh nhau (1–15 | 16–31) ghép đủ tháng theo tên cột, cộng dòng TC của các khối. Ô ngày chia 2 dòng (Ngày / Đêm) thì cộng lại.
- Ô đếm dấu lưng chừng (cụm dính rộng 1,5 dấu, không thấy dấu) tô **vàng**. Ô xem ảnh gốc ghi cách tính ("2 dấu", "giờ 8", "X = nghỉ").
- Sửa:
  - nhãn "TC" ở ô hẹp không còn bị tính thành ngày 31;
  - tiêu đề cột là tên người bị đọc thành số ("6") → đọc lại dạng chữ;
  - kỳ nhận cả "THÁANG 09/2026" (OCR thừa chữ) và "… 10/2026".
- **Chữ viết tay thật vẫn đọc chưa tốt** (ảnh thật của người dùng, chỉ kiểm trên máy kiểm thử): bảng dấu x rõ nét đọc đúng phần lớn, ô ghi giờ viết tay, ô có ghi chú và lịch ca viết tay còn nhiều ô "?" — **luôn soát lại trước khi ghi**.
- **Q-29 đã trả lời** (R-70): thuế TNCN **trừ hằng tháng**; ai không trừ thì chọn mã thuế TNCN *Miễn / Không tính thuế* (TNCN0 / MT00). App vốn đã tính như vậy; thêm test U-TAX-01/02.
- **Chia sản lượng theo chấm công** (R-73, chủ sở hữu duyệt 12/10/2026):
  - Công > 0 ngày cân → chia đều (0,3 hay 1 như nhau). Công = 0 / trống → không chia + cảnh báo "coi như nghỉ nguyên ngày".
  - Vẫn trừ NV vắng trên phiếu và người có đơn nghỉ. Ngày cả tổ chưa nhập chấm công → chia theo NV vắng + cảnh báo.
  - Đối chiếu dữ liệu thật: Đại Hiệp 8/2026 không đổi. CNHAK 9/2026, HAKQN 7/2026, HAK ĐN 11/2025 có người nhận phiếu ngày công trống → số đổi so với Excel cũ (tối đa −341.953đ / người).
- **Người nghỉ không lương / nghỉ phép / nghỉ ốm** (R-72, chủ sở hữu duyệt 12/10/2026):
  - Đơn nghỉ **đã duyệt** tự loại người đó khỏi tổ khi chia sản lượng / bơm dăm các ngày nghỉ, không cần ghi NV vắng. Tính lương ghi rõ "… Nghỉ không hưởng lương (đơn đã duyệt) — không chia N ngày cân".
  - Đơn nghỉ được để trống **Đến ngày** = chưa biết ngày về.
  - Đơn nghỉ phủ kỳ đã chốt được bảo vệ như phụ lục (hồi tố). Bản chốt lưu kèm đơn nghỉ.
- Sửa cảnh báo khi tính lương (chủ sở hữu báo 12/10/2026, CNHAK 9/2026):
  - **NV vắng không khớp ai trong tổ**: cảnh báo ghi đúng tên trên phiếu ("Đức", trước ghi "duc"), và **gộp 1 dòng cho mỗi tổ + tên**: số phiếu, khoảng ngày, vài số phiếu. Trước đó mỗi phiếu 1 dòng, CNHAK 9/2026 có 33 dòng giống nhau. Chi tiết từng phiếu vẫn ở bảng đối soát. Thường là người đã nghỉ việc / chuyển tổ mà phiếu vẫn ghi vắng; phiếu vẫn chia đúng cho người có mặt.
  - **"Có công sau ngày chấm dứt hợp đồng"**: ô chấm công ghi **0** không còn bị tính là có công (Excel CNHAK ghi 0 thay vì để trống).
  - Số tiền không đổi (đối chiếu lại CNHAK 9/2026: tổng thực lĩnh như cũ).
- **Q-31 đã trả lời** (R-71): lương sản lượng làm tròn **1 lần trên tổng tháng**, thống nhất mọi đơn vị (Excel Đại Hiệp cũ làm tròn theo ngày — lệch ≤ 2đ/người, chấp nhận).
- **Không đổi công thức lương.** Test 211 (+6 U-OCR, +2 I-OCR, +2 U-TAX, +1 U-QC, +4 U-PA, +1 U-LV, +1 U-GRD), E2E 95/95 (+1).

## [2.0.0-alpha.21] — 11/10/2026 — Quy chế lương HAK Group 2026 (engine 1.8.0)
- **Chủ sở hữu duyệt: HAK, CNHAK, HAKQN cùng một quy chế lương** (R-68). Engine 1.8.0 thêm *Quy chế lương HAK Group 2026* — **mặc định** cho kỳ chưa chốt: (C1) lương thời gian trả đủ công đi làm, (C2) công chuẩn = số ngày − *Số ngày giảm trừ* (TG3 = 26 thay vì 22), (C3) công nhân sản phẩm chỉ hưởng lương thời gian cho công lễ / phép, (C4) bù bình quân tổ chỉ tính tiền sản lượng, (C5) công nhật tính tăng ca theo công thức mã tăng ca (× 50%), (C6) phụ cấp không ghi cách tính thì chia theo công, (C7) trừ KPCĐ 0,5% phần người lao động, (C8) chưa có Lương cơ bản thì không tính BH / truy thu, (C9) công nhật: công chuẩn = số ngày − Số ngày giảm trừ, (C10) công tăng ca mã TC5 (ca vị trí khác) không cộng vào lương thời gian.
- Kiểm bằng bảng lương thật (chỉ trên máy kiểm thử, không đưa vào repo): **HAK ĐN 11/2025 61/61**, **Đại Hiệp 8/2026 38/45** (7 người lệch 2đ làm tròn), **CNHAK 9/2026 42/44**, **HAKQN 7/2026 31/50** người khớp từng đồng; người còn lại lệch đúng phần thuế TNCN (Excel CNHAK / HAKQN không trừ, Đại Hiệp có trừ — app trừ, chờ xác nhận Q-29).
- Phân bổ khối lượng: NV vắng so **có dấu** trước — "Tưởng" vắng không còn kéo theo "Tường" cùng tổ (lỗi làm 1 công nhân HAKQN mất ~10 triệu sản lượng 7/2026); gõ không dấu vẫn nhận.
- **Tính lương → Quy chế tính lương**: chọn *Quy chế 2026* hoặc *Cách tính cũ (1.7)* để đối chiếu; lưu theo dữ liệu, cần quyền *Sửa danh mục*, ghi nhật ký. Bản chốt ghi quy chế đã dùng; kỳ đã chốt **không đổi số**; "Đối chiếu với dữ liệu hiện tại" dùng đúng quy chế lúc chốt.
- Danh mục mã lương thêm cột **Số ngày giảm trừ** (TG3 4, TG4 2, CN2 4); nhập Excel nhận cả tên cột "Ngày giảm trừ". Báo cáo bảo hiểm có cột NLĐ.KPCĐ.
- Sửa: "Lưu hồ sơ công ty" không còn xóa các trường ngoài form.
- Test: 194 (+11 U-QC, +1 U-PA; hồi quy v1.3.0 / alpha.4 vẫn trùng 100% ở cách tính cũ), E2E 94/94 (+3).

## [2.0.0-alpha.20] — 11/10/2026 — Đọc ảnh / PDF bảng chấm công, chấm cơm (OCR offline)
- Menu **Nhập liệu hàng tháng → 📷 Đọc ảnh chấm công**: chọn **ảnh chụp (JPG, PNG) hoặc PDF quét** (nhiều file, PDF tối đa 30 trang). App tự xoay ảnh về đúng chiều, tìm các ô theo đường kẻ, đọc chữ / số từng ô bằng **Tesseract chạy offline trên máy** (không gửi ảnh ra mạng, không lưu ảnh), dựng **bảng xem như Excel** sửa được ngay trong app.
- Đọc được 2 kiểu bảng: **dòng = người, cột = ngày 1…31** (có Tổng công / Tổng cơm, dòng Công / Tăng ca) và **dòng = ngày, cột = Công / Cơm** ("Lịch làm …", dòng TC). Tự nhận kỳ trong tiêu đề ("Tháng 09/2026"), tự gợi ý nhân viên theo tên (bỏ "anh / chú / cô"; không chắc thì để người dùng chọn).
- Đọc **nhiều ảnh / nhiều PDF** một lần (mỗi trang 1 thẻ, mỗi trang chọn kỳ riêng). Nút **■ Dừng đọc**: dừng sau lô ô đang đọc, trang đã đọc giữ nguyên, trang chưa đọc đánh dấu ■ — bấm *Đọc lại* để đọc riêng trang đó.
- Ô nghi ngờ tô **vàng** (OCR không chắc, nhận theo nét "1" viết tay, giá trị > 3), ô không đọc được có **?**, dòng **lệch tổng trên giấy** tô đỏ; bấm ô xem ảnh gốc của ô đó. Xoay trái / phải, đọc lại từng trang.
- **⬇ Xuất Excel** (mỗi trang 1 sheet) và **✔ Đưa vào Chấm công / Suất cơm…** — ghi **qua màn hình xem trước như nhập Excel** (kiểm tra kỳ đã chốt, chọn bổ sung / thay thế, ghi nhật ký). Dòng chưa chọn nhân viên / còn ô "?" bị bỏ qua và được báo.
- Kèm thư viện offline: tesseract.js 5.1.1 (Apache-2.0), dữ liệu ngôn ngữ vie + eng (tessdata_best_int), pdf.js 3.11.174 (Apache-2.0, chạy với `isEvalSupported: false` + CSP không eval).
- Giới hạn: chữ in / bảng quét đọc tốt; **chữ viết tay và ảnh chụp nhỏ, nghiêng đọc kém** — luôn phải xem lại. Giấy tăng ca, xác nhận vân tay, sổ xe… (không phải bảng kẻ ô theo ngày) không đọc tự động.
- **Không đổi công thức lương.** Test: 182 (+8 U-OCR, +4 I-OCR chạy Tesseract thật trên ảnh mẫu giả lập), E2E 91/91 (+9). CI: bước tự kiểm OCR trong bản đóng gói Windows.

## [2.0.0-alpha.19] — 11/10/2026 — Phân bổ khối lượng như công cụ HAK (engine 1.7.0)
- **Chia phiếu cân theo tổ** như công cụ "Phân bổ khối lượng tính lương": phiếu ghi **Mã phòng ban** + **NV vắng** → chia đều cho người của tổ có mặt ngày cân (đã vào làm, chưa nghỉ việc, đúng tổ theo phụ lục ngày đó), trừ người vắng (tên cuối hoặc Mã NV). Phiếu ghi Mã NV vẫn giao trực tiếp. Phiếu không chia được → "chưa phân bổ" + cảnh báo. Áp dụng cho Sản lượng và Bơm dăm.
- **2 cách bù lương của công cụ** (chọn ở Tính lương): **theo ngày — bậc thang (Đại Hiệp)** và **theo bình quân tổ**. Đối chiếu từng trường hợp với công thức của công cụ: trùng 100%. 2 cách bù cũ giữ nguyên số. Danh mục Mã lương thêm cột *Ngưỡng công bù theo tổ*; danh mục chuẩn: SP mức sàn 200.000đ/công, ngưỡng 15 công (như công cụ).
- **Biểu mẫu như công cụ** (ExcelJS 4.4.0): *Tải file mẫu* ở Sản lượng / Bơm dăm = đúng mẫu công cụ; *Nhập Excel* đọc được file mẫu công cụ (dòng tiêu đề phía trên, "Ngày cân 1", "Biển số 1", "Số xe", "Mã phòng ban", "NV vắng"). **Báo cáo lương → Phân bổ sản lượng → Xuất Excel (mẫu công cụ phân bổ)**: Hướng dẫn, Tổng hợp phòng ban, Phân bổ theo ngày, Chi tiết công nhân, Đối soát phiếu cân, BD…, Tiền lương và bù lương, Dữ liệu gốc — tiêu đề, màu, khối chữ ký như công cụ.
- Kỳ đã chốt giữ nguyên số (lưu cả cách bù đã dùng). Test: 170 (+8 U-PA), E2E 82/82 (+6).

## [2.0.0-alpha.18] — 11/10/2026 — Sổ lao động đủ thông tin + Báo cáo bảo hiểm + Phiếu lương
- **Thêm nhân viên** có đủ trường của sổ quản lý lao động: Quốc tịch (điền sẵn "Việt Nam", sửa được), Dân tộc, Mã số thuế, Số sổ BHXH, mục **Trình độ** (trình độ học vấn / chuyên môn, bậc kỹ năng nghề, bằng cấp). Vị trí việc làm vẫn ở phần Lương.
- **Sổ quản lý lao động** báo **ai còn thiếu thông tin bắt buộc** (giới tính, ngày sinh, quốc tịch, CCCD, nơi cư trú, trình độ, HĐLĐ, lý do chấm dứt, vị trí việc làm, mức đóng BH, số sổ BHXH) — bấm mục để mở đúng tab hồ sơ bổ sung. Mục "nếu có" (bậc nghề, nâng lương, đào tạo, kỷ luật, tai nạn) không coi là thiếu.
- **Báo cáo lương → 🛡 Báo cáo bảo hiểm** theo kỳ: tổng hợp theo khoản (BHXH, BHYT, BHTN, KPCĐ — công ty / NLĐ), tăng / giảm / điều chỉnh mức đóng so với kỳ trước, theo phòng ban, chi tiết từng người; xuất Excel 4 sheet. Chỉ cộng số engine đã tính (không tính lại); báo cáo nội bộ, **không thay mẫu chính thức** D02-LT / C12-TS.
- **🧾 Phiếu lương** thành mục riêng trong menu: kỳ đã chốt lấy đúng bảng đã chốt (chưa chốt → báo tính tạm), lọc phòng ban, tìm mã / tên (không dấu), in mỗi phiếu 1 trang hoặc **in gọn** nhiều phiếu / trang, **xuất Excel** phiếu lương. Nhật ký ghi lần in / xuất.
- **Không đổi công thức lương.** Test: 162 (+3 U-BHR, +1 U-SLD-05), E2E 76/76 (+4).

## [2.0.0-alpha.17] — 11/10/2026 — Lịch sao lưu + đối chiếu nghỉ phép / ốm
- **Lịch sao lưu tự động** (Công ty & Sao lưu, Admin đổi): sao lưu **định kỳ** khi app đang mở (tắt / 1 / 2 / 4 / 8 giờ, mặc định 2 giờ), **sao lưu khi đóng app** (mặc định bật), **số ngày giữ bản đầu ngày** (30 / 60 / 90 / 180 / 365, mặc định 60). Chỉ sao lưu khi dữ liệu đã đổi so với bản gần nhất (không tạo bản trùng); có thư mục thứ hai thì tự chép sang. Cấu hình theo máy (`settings.json`). Bản định kỳ giữ 48, bản khi đóng app giữ 10; bản sau chốt kỳ vẫn giữ vĩnh viễn.
- **Q-27 = phương án A — đối chiếu đơn nghỉ với chấm công** (R-64): khi tính lương, khung *Hồ sơ cần bổ sung* báo đơn phép có lương đã duyệt mà chưa chấm PN / vẫn chấm công thường, đơn nghỉ không lương / nghỉ ốm đã duyệt mà vẫn có công, chấm PN không có đơn, đơn còn *Chờ duyệt*. **Chỉ cảnh báo — lương vẫn tính theo chấm công, không đổi công thức.**
- Test: 158 (+5 U-SCH, +5 U-LV), E2E 72/72 (+3).

## [2.0.0-alpha.16] — 11/10/2026 — Shortcut chuyên nghiệp + File đã tải
- **Bộ cài**: icon riêng của app (HAK · LƯƠNG), shortcut **"Tính Lương HAK"** ngoài Desktop và trong Start Menu (thư mục *HAK*), cho chọn thư mục cài, tự chạy app sau khi cài, tên trong *Apps & features* là "Tính Lương HAK <phiên bản>". Gỡ cài đặt **vẫn không xóa dữ liệu**. Tên sản phẩm nội bộ giữ nguyên nên thư mục dữ liệu `%APPDATA%\Tinh Luong HAK` không đổi.
- **Tải file (Excel, báo cáo, phiếu lương, file Word, sao lưu ra file)**: lưu thẳng vào thư mục **Tài liệu\Tinh Luong HAK\File xuat** (không hỏi nơi lưu, **không ghi đè** — trùng tên thêm "(1)", "(2)"). Tải xong app **mở thư mục, chọn sẵn file** và hiện thẻ báo có nút **Mở file** / **Mở thư mục**.
- Nút **📂 File đã tải** (thanh trên, Ctrl+K): danh sách file mới nhất, mở file / mở thư mục từng file, **Đổi thư mục lưu…** (hộp chọn thư mục của Windows), *Dùng thư mục mặc định*, bật / tắt *Tự mở thư mục sau mỗi lần tải*. Cấu hình theo máy (`settings.json`).
- An toàn: giao diện chỉ gửi **tên file**; app chỉ mở file nằm trong thư mục lưu và đúng loại app xuất ra (xlsx, xls, csv, pdf, doc, docx, json, txt) — không mở .exe / file ngoài thư mục.
- Thanh trên cùng gọn hơn trên laptop 1366px (Tìm kiếm và Đổi mật khẩu thành nút icon).
- **Không đổi công thức lương / dữ liệu.** Test: 148 (+5 U-EX), E2E 69/69 (+5).

## [2.0.0-alpha.15] — 11/10/2026 — Giao diện 2.0 + tăng lương / biến động nhân sự
- **Giao diện mới** cùng bộ màu với app *Quản lý xuất hàng* (xanh ngọc #0e7c86, menu xanh than, nền #f3f6fa) — chủ sở hữu duyệt bản mẫu. **Chế độ sáng / tối** (nhớ theo máy).
- Thanh trên cùng: **Tìm kiếm Ctrl+K** (màn hình, nhân viên, báo cáo; gõ không dấu), kỳ lương, vai trò, đăng xuất, nút sáng / tối. Menu nhóm lại.
- **Tổng quan** mới: banner kỳ lương, các bước, ô Mở nhanh, *Cần xử lý trước khi chốt*, *An toàn dữ liệu* (giữ đủ lời nhắc sao lưu).
- **Chấm công** tô màu ô theo số công / loại dòng (PN, CL, TC, có nhãn, không đọc được số) — chỉ hiển thị.
- **Hồ sơ**: sửa trong ngăn kéo bên phải có khung **"Sẽ lưu N thay đổi"** (cũ → mới, ô đã đổi viền vàng). Thông tin cá nhân / tài khoản: chọn **Thông tin mới** (thêm bản mới, giữ bản cũ) hoặc **Sửa lỗi nhập sai**. Bản ghi bị khóa (Q-15, kỳ chốt) báo ngay khi mở.
- **Tăng lương / biến động**: lập phụ lục mới từ phụ lục hiện tại, chọn loại biến động, % thay đổi, ghi chú điều chỉnh mức đóng BH. Phụ lục có thêm *Loại biến động*, *Số quyết định* (không bắt buộc, không dùng trong công thức).
- **Lịch sử nhân viên**: quá trình lương + dòng thời gian thay đổi từ nhật ký (lọc theo phần; che số tiền khi không có quyền xem lương).
- **Báo cáo Biến động nhân sự** theo khoảng tháng: tăng mới, nghỉ việc (lý do), tăng / giảm lương (+%), điều chuyển, đổi chức vụ, mức đóng BH — tự nhận biết, dữ liệu cũ không phải nhập lại.
- **Cảnh báo có công sau ngày chấm dứt hợp đồng** khi tính lương (chỉ cảnh báo, số tiền không đổi).
- **Không đổi công thức lương** — hồi quy v1.3.0 / alpha.4 trùng 100%. Test: 143 (+3 U-BD, +1 I-23), E2E 64/64 (+6).

## [2.0.27] — 17/11/2026 — Q-26
- Chủ sở hữu chọn **phương án A** cho BH tháng nghỉ việc: giữ nguyên quy tắc R-57 (quy chế R-60). **Không đổi công thức**; thêm test I-22 khóa hành vi.

## [2.0.0-alpha.14] — 11/10/2026 — Sổ quản lý lao động theo NĐ 145/2020 Điều 3
- **Sổ quản lý lao động** (Báo cáo nhân sự) chọn **năm**, có đủ nội dung khoản 2 Điều 3 Nghị định 145/2020/NĐ-CP. Các cột cũ giữ nguyên, thêm: quốc tịch, chuyên môn, bậc kỹ năng nghề, vị trí việc làm, ngày bắt đầu làm việc, mức đóng BHXH, nâng bậc / nâng lương trong năm, nghỉ hằng năm / việc riêng có lương / không lương / ốm, làm thêm (công TC), đào tạo, kỷ luật & trách nhiệm vật chất, tai nạn LĐ / bệnh nghề nghiệp, ngày + lý do chấm dứt HĐ.
- Hồ sơ thêm: *Bậc trình độ kỹ năng nghề* (Học vấn), *Vị trí việc làm* (Phụ lục HĐ), *Lý do chấm dứt* (Hợp đồng), *Loại nghỉ* (Đơn nghỉ — trống = nghỉ hằng năm), *Hình thức kỷ luật* + *Bồi thường thiệt hại* (Nội quy).
- 2 tab hồ sơ mới: **🎓 Đào tạo / nâng cao trình độ**, **🚑 Tai nạn lao động / Bệnh nghề nghiệp** (nhập tay, nhập Excel).
- Báo cáo nghỉ phép: chỉ nghỉ hằng năm trừ phép; tách 2 cột việc riêng có lương / không lương.
- **Không đổi công thức lương** — hồi quy v1.3.0 và alpha.4 trùng 100%.
- Test: 137 (+4 U-SLD), E2E 55/55.

## [2.0.0-alpha.13] — 11/10/2026 — Sao lưu ra ngoài máy (A + B + D)
- **(A) Thư mục sao lưu thứ hai**: Admin chọn USB / ổ mạng / thư mục Google Drive đồng bộ bằng hộp chọn thư mục của Windows. Mọi bản sao lưu tự chép sang và **đọc lại kiểm SHA-256**. USB rút ra / ổ mạng mất kết nối → sao lưu trên máy vẫn bình thường, app báo lỗi và có nút *Chép sang thư mục thứ hai ngay*.
- **(B) Bản sao lưu sau chốt kỳ** `sau-chot-<kỳ>`: tạo ngay khi chốt, **giữ vĩnh viễn** (không bị dọn), tự chép sang thư mục thứ hai.
- **(D) Nhắc nhở**: chưa từng / quá 7 ngày chưa sao lưu ra ngoài máy → Trang chủ cảnh báo (người có quyền sao lưu / Admin).
- Cấu hình thư mục là của **từng máy** (`settings.json`), không nằm trong `data.json`.
- Test: 133 (+4 U-MIR), E2E 55/55 (+4).

## [2.0.0-alpha.12] — 11/10/2026 — Q-19: chia chi phí lương theo phòng ban khi điều chuyển (engine 1.6.0)
- Nhân viên đổi phòng ban trong tháng (phụ lục mới đổi *Phòng ban*) → báo cáo **Tổng hợp theo phòng ban** và **Bảng hạch toán** chia chi phí theo **số công làm ở từng phòng**:
  - thu nhập, BH NLĐ, BH công ty, thuế, tạm ứng, thực lĩnh;
  - mỗi phòng vào đúng TK chi phí (622 / 641 / 642…).
- Tổng các phòng luôn bằng tổng bảng lương. **Số tiền lương từng người không đổi.**
- Màn hình Tính lương có dòng thông báo người được chia và tỷ lệ.
- Kỳ chốt trước bản này giữ báo cáo cũ. Người không điều chuyển: báo cáo y hệt trước (U-ALLOC-04).
- Q-04 / Q-23 / Q-25 (chủ sở hữu xác nhận): giữ công thức BH dưới ngưỡng; ngưỡng khai ở Danh mục Mã lương (R-57) — gỡ đánh dấu "cần quyết định" trong quy chế.
- I-21: chứng minh công thức truy thu BH tự áp dụng ngay khi khai ngưỡng trong danh mục (danh mục mẫu trống là thiếu dữ liệu, không phải thiếu công thức).
- `core/allocation.js` (mới). Test: 129 (+4 U-ALLOC, +1 I-21), E2E 51/51.

## [2.0.0-alpha.11] — 11/10/2026 — Q-22: chọn cách áp dụng phụ lục giữa tháng (engine 1.5.0)
- Phụ lục có thêm ô **Cách áp dụng trong tháng hiệu lực**:
  - *Cả tháng* (mặc định, để trống = như cũ);
  - *Từ ngày hiệu lực*: công trước ngày hiệu lực tính theo lương thỏa thuận cũ, công từ ngày hiệu lực tính theo mức mới (cùng mã lương).
  - BH theo phụ lục đang hiệu lực. Khác mã lương thì không chia và có cảnh báo.
- Ví dụ: 20 tr → 26 tr từ 16/09 → lương tháng 9 = 23.000.000 (trước đây 26.000.000).
- Quy chế trong app, hướng dẫn và `PAYROLL_FORMULAS.md` §4a đã cập nhật; Q-01 = Q-22 đã trả lời.
- **Không đổi** kết quả của mọi phụ lục không chọn *Từ ngày hiệu lực*: hồi quy v1.3.0 và alpha.4 trùng 100%.
- Test: 124 (+5 U-PL), E2E 51/51 (+1).

## [2.0.0-alpha.10] — 11/10/2026 — Q-20 Số chứng từ; ghi nhận câu trả lời Q-18, Q-19, Q-21, Q-22, Q-23
- **(Q-20) Số chứng từ** cho *Thưởng / Trừ* và *Tạm ứng*. Cột mới, không bắt buộc.
  - Nhập lại file có cùng *Số chứng từ + Mã NV* thì **cập nhật**, không cộng thêm. Bản cũ: nhập lại file tạm ứng đã sửa số tiền thì thành 2 khoản.
  - Lưới chặn dòng trùng số chứng từ.
  - *Kiểm tra dữ liệu* báo **High** khi một số chứng từ có nhiều dòng cho cùng NV, **Medium** khi có dòng giống hệt nhau mà chưa có số chứng từ.
  - Nhập Excel nhắc ghi số chứng từ.
- Ghi nhận câu trả lời của chủ sở hữu:
  - R-52 (Q-18): nhiều ca / ngày phân biệt bằng mã chấm công;
  - R-55 (Q-21): giữ nguyên cách tính ô sai cũ, chỉ cảnh báo.
- Đang triển khai: R-53 (Q-19) chia chi phí theo phòng ban; R-56 (Q-22) chọn cách áp dụng phụ lục giữa tháng.
- Q-23: đã kiểm tra danh mục và công thức → câu hỏi tiếp **Q-25**.
- Test: 119 (+4 U-CT), E2E 50/50.

## [2.0.0-alpha.9] — 11/10/2026 — Q-24 bảo mật lương cá nhân
- (Q-24, chủ sở hữu duyệt) **Ẩn Lương thỏa thuận / Lương cơ bản** với người không có quyền *Xem bảng lương* và không có quyền *Sửa hồ sơ*. Với vai trò mặc định, chỉ **Trưởng bộ phận** bị ẩn. Áp dụng ở:
  - danh sách Nhân sự (bỏ cột);
  - đầu hồ sơ;
  - bảng *Lương & phụ lục HĐ* (hiện `🔒 ẩn`);
  - form phụ lục (không hiện ô lương);
  - báo cáo *Sổ lao động* và *Lịch sử*;
  - **Giá trị tiền thưởng** trong hồ sơ *Khen thưởng* (chủ sở hữu duyệt bổ sung).
- Quy tắc R-51. Không đổi dữ liệu, công thức hay quyền khác.
- Test: 115 (+2 U-PAY), E2E 50/50 (+3).

## [2.0.0-alpha.8] — 11/10/2026 — PR5 giao diện: bảng lớn, tìm kiếm, bàn phím
- **PERF-03 (High)**: lưới nhập liệu vẽ toàn bộ dòng của kỳ. Ở 1.000 NV, mở *Chấm công* mất 5,6–6,9 giây, gõ 4 ký tự tìm kiếm mất 19 giây; ở 5.000 NV app treo. Nay:
  - **chia trang** (50/100/200/500 dòng, mặc định 100) → mở lưới 0,3 giây, kết quả lọc 0,4–0,55 giây;
  - tìm kiếm chỉ chạy khi ngừng gõ;
  - áp dụng cả cho danh sách *Nhân sự*.
- **Ô tìm kiếm nhớ riêng từng bảng**: khi chuyển màn hình hoặc mở lại app vẫn giữ; số dòng hiện "đang lọc …" để không bị nhầm là mất dữ liệu.
- **Bàn phím**: Enter = xuống ô cùng cột dòng dưới, Shift+Enter = lên; Ctrl+F = vào ô tìm kiếm.
- `tests/perf/ui-bench.js`: đo giao diện trên Electron thật.
- Câu hỏi mới **Q-24** (Trưởng bộ phận đang xem được lương thỏa thuận).
- Test: 113 unit/integration/regression, E2E 47/47 (+4).

## [2.0.0-alpha.7] — 11/10/2026 — PR4 lưu dữ liệu nhanh hơn (PERF-02)
- Lưu dữ liệu: bước đọc lại để xác nhận đĩa ghi đúng nay **so sánh từng byte** thay vì giải mã UTF-8 + 2 lần SHA-256. Mức kiểm tra chặt như cũ.
- 5.000 NV: lưu **243 → 110 ms**; 1.000 NV: 50 → 24 ms. Mọi kiểm tra an toàn khác giữ nguyên.
- Chưa chuyển sang SQLite: đo cho thấy phần lớn thời gian còn lại nằm ở giao diện. Điều kiện chuyển đổi được cập nhật trong `MIGRATION_PLAN.md` §2; chi tiết ở `PERFORMANCE_REPORT.md` §6.
- Test: 113 (+1 U-STO-17), E2E 43/43.

## [2.0.0-alpha.6] — 10/10/2026 — PR3 tầng repository
### Sửa lỗi
- **A3-01 (High)**: sửa *Số HĐLĐ* của hợp đồng có hiệu lực trong kỳ đã chốt, rồi bị chặn (không phải Admin) hoặc bấm **Hủy** ở hộp xác nhận → phụ lục lương, nghỉ phép… của hợp đồng **đã bị đổi sang số mới** trong khi hợp đồng giữ số cũ → phụ lục "mồ côi", không được tính lương. Nguyên nhân: đổi bảng con **trước** khi kiểm tra hồi tố. Nay chỉ đổi sau khi mọi kiểm tra đã qua và người dùng đồng ý.
### Thay đổi
- `core/repository.js`: 1 cửa ghi dữ liệu (`plan` → xác nhận → `apply`) cho lưới nhập liệu, form hồ sơ, xóa hồ sơ. Không đổi quy tắc nghiệp vụ, không đổi công thức.
- Nhật ký thêm: dán dữ liệu danh mục hồi tố (Admin) nay được ghi nhật ký như sửa từng ô.
- Test: 112 (+8 U-REPO), E2E 43/43 (+1 A3-01).

## [2.0.0-alpha.5] — 10/10/2026 — PR2 hiệu năng (PERF-01)
- Chỉ mục Mã NV (`HR.buildIndex`) cho dựng danh sách lương, danh sách Nhân sự, báo cáo nhân sự. Ở 5.000 NV:
  - dựng danh sách lương **1.175 → 22 ms**;
  - danh sách Nhân sự **550 → 12 ms**;
  - báo cáo nhân sự **1.952 → 54 ms**.
- Kết quả **giống hệt** bản alpha.4 (test so sánh với bản lưu nguyên `baseline_2.0.0-alpha.4/hr.js`). Không đổi engine, không đổi dữ liệu.
- `tests/perf/bench.js` đo thêm danh sách Nhân sự, báo cáo; `HR_IMPL=` để so bản cũ. `docs/PERFORMANCE_REPORT.md`.
- Test: 104 (+3 R-PERF), E2E 42/42.

## [2.0.0-alpha.4] — 10/10/2026 — Audit V2: kiểm tra ô ngày chấm công, kịch bản tính lương
### Sửa lỗi (chi tiết, bằng chứng: `AUDIT_V2.md` §2)
- **A2-01/02 (High)**: ô chấm công số âm (`-1`), chữ lạ (`1.5.2`, `#`) trước đây được nhập không báo lỗi → nay **từ chối** khi nhập Excel, gõ trên lưới và dán Ctrl+V.
- **A2-03 (High)**: ngày không có trong tháng (31/09, 29/02 năm thường) được nhập và **được trả lương** → nay chặn nhập; lưới khóa cột ngày không tồn tại; dữ liệu cũ được *Kiểm tra dữ liệu* báo **High** và hộp chốt kỳ báo số ô sai. Cách tính với dữ liệu cũ giữ nguyên chờ **Q-21**.
- **A2-06 (High)**: dán Ctrl+V ô sai định dạng vẫn ghi vào dữ liệu → nay không ghi ô sai.
- **A2-04/05 (Medium)**: xem trước nhập Excel có cột **Cảnh báo** (quá 3 công/ngày, nhãn chưa có mã phụ cấp).
### Thêm
- `VAL.dayCell()`, `VAL.daysInKy()` (`core/validate.js`) — 1 quy tắc dùng chung cho nhập Excel, lưới, dán, kiểm tra dữ liệu, chốt kỳ (R-03d).
- Test kịch bản tính lương I-15…I-20 (vào/nghỉ giữa tháng, nhiều tạm ứng/thưởng, trừ vượt thu nhập, phụ lục giữa tháng) — số tính tay, **không đổi công thức**.
- `docs/AUDIT_V2.md`: kiến trúc, danh sách vấn đề, rà soát 13 đường ghi dữ liệu, đánh giá thư viện Excel.
- Câu hỏi mới **Q-18…Q-23** (ca làm việc, 2 phòng ban, chứng từ tạm ứng, ô sai cũ, phụ lục giữa tháng, ngưỡng BH).
- Test: 101 unit/integration/regression (+5 U-CC, +6 I), E2E 42/42 (+2).

## [2.0.0-alpha.3] — 10/10/2026 — Hướng dẫn trong app, Quy trình tính lương, Dự thảo Quy chế trả lương
- Menu mới **Hướng dẫn & Quy chế** (`ui/guide.js`) gồm:
  - Bắt đầu nhanh;
  - **Quy trình tính lương hằng tháng**: 9 bước, ghi vai trò phụ trách, kèm cách điều chỉnh sau chốt;
  - **Dự thảo Quy chế trả lương**;
  - Hướng dẫn từng màn hình;
  - Câu hỏi thường gặp.
- **Dự thảo Quy chế trả lương**:
  - Gồm 7 chương: căn cứ, nguyên tắc, hình thức lương, chấm công, phụ cấp/hỗ trợ/tăng ca, BH/KPCĐ, thuế TNCN, khấu trừ/thực lĩnh/kỳ hạn trả, chốt và điều chỉnh, hiệu lực.
  - Bảng số liệu sinh **trực tiếp từ danh mục có hiệu lực của kỳ đang chọn**; cách tính mô tả **đúng công thức engine** (có test đối chiếu).
  - Đánh dấu rõ các điểm **[cần quyết định]** (Q-01…Q-10, Q-17).
  - **In** được (định dạng văn bản, ẩn menu) và **tải file Word (.doc)** để chỉnh sửa rồi ban hành.
- Câu hỏi mới **Q-17**: đối chiếu hệ số tăng ca với mức tối thiểu ở Điều 98 Bộ luật Lao động 2019.
- `docs/QUY_TRINH_TINH_LUONG.md`. Lint bao phủ thêm thư mục `ui/`.
- Test: 90 unit/integration/regression (+3 U-GUIDE), E2E 40/40 (+1).

## [2.0.0-alpha.2] — 10/10/2026 — Đăng nhập & phân quyền (Q-14, Q-16) · quy tắc chấm công Q-12
### Thêm mới
- **Đăng nhập** bắt buộc.
  - Lần đầu: tạo Admin + **mã khôi phục**.
  - Mật khẩu băm PBKDF2-SHA256 (210.000 vòng, muối riêng).
  - Sai 5 lần → chờ 30 giây; 30 phút không thao tác → tự đăng xuất.
  - Đổi mật khẩu; mật khẩu tạm bắt buộc đổi; quên mật khẩu Admin → dùng mã khôi phục (cấp mã mới).
- **7 vai trò** theo Master Prompt 2.0 §9. Quyền kiểm tra ở **tầng nghiệp vụ** (`core/permissions.js`).
  - **Chỉ Admin** sửa dữ liệu hồi tố, mở chốt, khôi phục dữ liệu, quản trị người dùng.
  - Nhân sự không xem bảng lương.
  - Kế toán lương chốt nhưng không mở chốt.
- Màn hình **Người dùng & phân quyền** (Admin): thêm, sửa vai trò, khóa, đặt lại mật khẩu, cấp lại mã khôi phục. Không thể khóa hoặc hạ quyền Admin cuối cùng.
- Nhật ký ghi tài khoản đăng nhập. Thêm thao tác đăng nhập, đăng xuất, quản trị người dùng.
### Thay đổi
- **Q-15**: phụ lục HĐ đã dùng tính lương kỳ đã chốt → không ai sửa/xóa được (kể cả Admin); không đổi được Số HĐLĐ hoặc xóa hợp đồng chứa nó; nhập Excel không cập nhật được → phải **thêm phụ lục mới**.
- **Q-13**: nhập Excel có dòng trùng → màn hình xem trước báo số dòng trùng và cho chọn **Bổ sung** / **Ghi đè** (nút chọn rõ ràng thay cho ô thả xuống).
- Sửa: đổi Số HĐLĐ từng kéo theo phụ lục **trước khi** kiểm tra quyền — nay kiểm tra quyền và khóa trước mọi thay đổi.
- Q-12: chấm công cùng ngày + cùng hình thức = **nhập trùng** → cùng số công tính 1 lần, khác số công báo xung đột (nhập Excel + công cụ gộp).
- Bỏ ô "Người đang sử dụng máy này" (thay bằng đăng nhập).
### Sửa lỗi
- Xóa nhân viên: cần quyền, có sao lưu và nhật ký; nhân viên đã có trong bảng lương đã chốt → chỉ Admin xóa được. (BUG-040)
- *Xóa toàn bộ dữ liệu* giữ lại tài khoản và nhật ký. (BUG-041)
### Kiểm thử
- 87 unit/integration/regression (+8 phân quyền, +1 Q-15).
- 39 E2E (+12): Q-15 (Admin không sửa được phụ lục đã chốt, thêm phụ lục mới được), tạo Admin, khóa khi sai mật khẩu, bắt buộc đổi mật khẩu tạm, menu theo vai trò, chặn mở chốt, chặn sửa hồi tố (Admin được), mật khẩu đã băm, nhật ký theo tài khoản, mã khôi phục.

## [2.0.0-alpha.1] — 10/10/2026 — 2.0 giai đoạn ưu tiên 1: sửa lỗi dữ liệu, chốt kỳ, sao lưu
Chi tiết: `AUDIT_REPORT.md` §6, `BUG_FIX_REPORT.md` (phần 2.0). **Công thức tính lương không đổi**: hồi quy so với v1.3.0 vẫn trùng 100%.

### Sửa lỗi — mất dữ liệu
- Nhập Excel bổ sung không còn **xóa ô đang có** khi ô trong file để trống. Ví dụ: file ngày 16–30 không còn xóa ngày 1–15; file Nhân viên thiếu CCCD không còn xóa CCCD. (BUG-022)
- Bảng dữ liệu sai cấu trúc không còn bị thay bằng bảng rỗng. File của phiên bản mới hơn không còn bị ghi đè. Dữ liệu trình duyệt bị hỏng không còn bị ghi đè. (BUG-026/027/028)
- Màn hình khôi phục chỉ cất file hỏng **sau khi** bạn xác nhận khôi phục. (BUG-029)
- Bản sao lưu không còn ghi đè nhau khi tạo trong cùng 1 giây. Có **mã kiểm tra SHA-256**; bản sao lưu bị hỏng hoặc bị sửa **không được khôi phục**. Ghi an toàn có đọc lại để xác minh. Thông báo rõ khi đầy ổ đĩa hoặc không có quyền ghi. Không bao giờ xóa bản sao lưu tốt cuối cùng. (BUG-030…033)

### Sửa lỗi — sai lương
- Chấm công tách nhiều dòng cùng người, cùng hình thức trong 1 file → **gộp theo ngày**, không mất công. Trùng ngày → báo xung đột, không đoán. (BUG-021)
- Nhập lại khi dữ liệu đang có dòng trùng khóa → chặn, có nút **Gộp dòng chấm công trùng**. "bt" / "BT" / để trống và "2026-9" / "2026-09" được nhận là cùng bản ghi → hết cộng đôi. (BUG-023/024)

### Kiểm soát kỳ đã chốt & truy vết
- Phân loại mọi thay đổi theo 3 nhóm:
  - **dữ liệu kỳ đã chốt**: chặn;
  - **hồi tố**: cảnh báo + nhật ký trước/sau, nhãn HỒI TỐ;
  - **không ảnh hưởng**.
  
  Áp dụng cho: form hồ sơ, xóa hồ sơ, danh mục, cho nghỉ việc, nhập Excel. (BUG-035)
- Không đổi được Mã NV đã có trong bảng lương đã chốt. Đổi Mã NV không bao giờ sửa dữ liệu của kỳ đã chốt. (BUG-034)
- Ghi **người thực hiện** (tên khai trên máy + tài khoản Windows) vào nhật ký, người chốt và người mở chốt. Thêm màn hình **Nhật ký thao tác** (xuất được Excel). (BUG-036)
- Checksum bản chốt bao cả dữ liệu đầu vào. (BUG-037)
- Khôi phục: báo các kỳ đã chốt sẽ mất hoặc đổi; kiểm tra cấu trúc trước khi thay thế.
- Nhập Excel luôn sao lưu trước khi ghi; lưu thất bại thì hoàn tác toàn bộ. (BUG-038)

### Thêm mới
- Chế độ cập nhật khi nhập Excel: **Bổ sung** (mặc định) hoặc **Ghi đè cả dòng** (báo trước số ô bị xóa). Hiển thị chi tiết từng ô trước → sau.
- *Kiểm tra dữ liệu* thêm phần kiểm tra cấu trúc:
  - phiên bản, bảng, kiểu ngày / tiền / kỳ;
  - Mã NV, quan hệ hợp đồng ↔ phụ lục;
  - toàn vẹn kỳ chốt và lịch sử chốt.
- Nút **Kiểm tra tất cả bản sao lưu**.
- Module mới: `core/period-guard.js`, `core/schema.js`.

### Kỹ thuật
- Phiên bản 2.0.0-alpha.1 (bản thử nghiệm của lộ trình 2.0). `schemaVersion` vẫn là 2, chỉ thêm trường.
- Test: 78 unit/integration/regression (thêm 34), 27 kịch bản E2E (thêm 4).
- Khảo sát: `node:sqlite` có sẵn trong Electron 43 → SQLite ở giai đoạn 2 không cần module native.

## [1.4.0] — 10/10/2026 — Phase 1: kiểm toán & sửa lỗi nghiêm trọng
### Sửa lỗi
- **Số tiền**: form phụ lục lương không còn làm hỏng số tiền khi mở rồi lưu (300.000 → 300); gõ "500.000" ở mọi bảng được hiểu là 500.000đ; dữ liệu cũ dạng "500.000" tự chuẩn hóa. (BUG-001, BUG-002)
- **Chốt kỳ / Mở chốt / Cho nghỉ việc chạy được trong bản cài .exe** (trước đây dùng `prompt()` không được Electron hỗ trợ). (BUG-003)
- File dữ liệu hỏng không còn bị ghi đè bằng dữ liệu trống — app mở màn hình khôi phục. (BUG-004)
- Bản sao lưu trong ngày không còn bị ghi đè liên tục. (BUG-005)
- Nhập Excel không còn tạo dòng trùng (nhập lại chấm công không làm lương tăng gấp đôi). (BUG-006)
- Không thể nhập/dán/chuyển dữ liệu vào kỳ đã chốt. (BUG-007)
- Chốt luôn dùng số tính lại mới nhất; chỉ báo thành công khi đã ghi xuống đĩa. (BUG-008, BUG-009)
- CCCD/SĐT không còn mất số 0 đầu khi nhập Excel; ngày dd/mm/yyyy và kỳ "2026-9" được nhận đúng. (BUG-011, BUG-012)
- Lỗi hiển thị không còn làm trắng màn hình. (BUG-013)
### Thêm mới
- **Trung tâm nhập Excel**: xem trước, phân loại Thêm mới / Cập nhật / Trùng / Lỗi dữ liệu / Sai tham chiếu / Kỳ đã chốt, tải danh sách lỗi.
- **Phiên bản kỳ lương**: mở chốt bắt buộc lý do, giữ bản cũ trong lịch sử, chốt lại = phiên bản mới, so sánh trước/sau, kiểm tra toàn vẹn (checksum); snapshot lưu cả dữ liệu đầu vào và danh mục.
- **Quản lý sao lưu**: danh sách bản sao lưu tự động, khôi phục từng bản; sao lưu khi mở app, đầu ngày, **trước nâng cấp**, trước nhập Excel / mở chốt / khôi phục / xóa toàn bộ.
- **Kiểm tra dữ liệu**: trùng Mã NV/CCCD, chấm công trùng, ngày sai bị bỏ qua, lương nghi bị lỗi lưu, phiếu cân chia nhiều người…
- Cảnh báo khi tính lương: thực lĩnh âm, thiếu giảm trừ/biểu thuế, lương đóng BH quá nhỏ, NV nghỉ việc chưa chấm dứt HĐ, chuyển khoản thiếu số TK.
- Nhật ký thao tác (`auditlog`).
### Giao diện
- Giao diện mới **"Xanh ngọc & Champagne"**: giữ màu xanh HAK, menu nền xanh đậm, điểm nhấn vàng champagne, thẻ bo tròn có bóng mềm, số liệu thẳng cột.
- Icon nét mảnh đơn sắc (SVG) thay cho emoji ở menu, nút, tab, tiêu đề (`ui/icons.js`; nhãn trong mã nguồn giữ nguyên, chỉ đổi khi hiển thị).
- Font **Be Vietnam Pro** (SIL OFL 1.1) đóng gói sẵn trong app (`ui/fonts/`), chạy offline, hiển thị giống nhau trên mọi máy.
- Sửa: cột Mã NV ở bảng chấm công bị cắt; ngày trong các thẻ hồ sơ nhân viên hiện `dd/mm/yyyy`.
### Kỹ thuật
- Electron 33.2.0 (hết hỗ trợ) → **43.7.9**; electron-builder 26.15.3; `package-lock.json`.
- Cứng hóa bảo mật: sandbox, CSP, chặn cửa sổ/điều hướng ngoài, chỉ 1 cửa sổ app.
- Module mới: `core/validate.js`, `core/importer.js`, `core/integrity.js`, `core/payroll-close.js`, `main/storage.js`.
- Kiểm thử: 44 test unit/integration/regression, 23 kịch bản E2E Electron (gồm nâng cấp từ dữ liệu 1.3.0), benchmark hiệu năng; CI chạy lint + test + audit + E2E trước khi build.
- Tài liệu dự án trong `docs/`.

## [1.3.0] — 10/10/2026
- Báo cáo lương: theo phòng ban, tổng hợp công, phân bổ sản lượng, hạch toán, phiếu chi, so sánh kỳ, 12 tháng, thu nhập & thuế TNCN cả năm.
## [1.2.0] — 10/10/2026
- Chốt kỳ lương, khóa dữ liệu kỳ, xem lại, đối chiếu, mở chốt.
## [1.1.0] — 10/10/2026
- Hồ sơ nhân sự theo QL_NHANSU (hợp đồng, phụ lục, nhân thân…), báo cáo nhân sự, lương theo phụ lục hiệu lực, lưu ra file + sao lưu hằng ngày.
## [1.0.x] — 08/10/2026
- App tính lương offline (port từ Google Apps Script), bộ cài Windows, nhập/xuất Excel, file mẫu.
