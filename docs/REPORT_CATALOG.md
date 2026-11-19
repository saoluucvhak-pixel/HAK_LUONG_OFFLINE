# Danh mục báo cáo và màn hình (chỉ đạo 010, issue #99)

Lập **bằng máy** 20/11/2026 (v2.0.54) từ bộ kiểm bố cục `tests/e2e/layout-audit.cjs` (mỗi màn của menu, cỡ 1366×768, dữ liệu giả): có Bộ lọc thông minh dùng chung (`ui/smart-filter.js`, ô `[data-sf-q]`) hay không, có nút xuất Excel / PDF-in hay không. Chạy lại: `HAK_INV_OUT=inv.json PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/input-filter-dept.cjs`.

| Nhóm | Màn / báo cáo | Bộ lọc | Excel | PDF / In |
|---|---|---|---|---|
| Tổng quan | Tổng quan (`home`) | — | Có | — |
| Nhân sự | Nhân sự (`nhansu`) | **Có** | Có | Có |
| Nhân sự | Nghiệp vụ nhân sự (`nvns`) | — | Có | Có |
| Nhân sự | Cấp phát sữa phúc lợi và bảo hộ lao động (`capphat`) | **Có** | — | — |
| Chấm công | Chấm công (`chamcong`) | **Có** | Có | — |
| Chấm công | Đọc ảnh bảng chấm công / chấm cơm (OCR) (`ocr`) | — | — | Có |
| Chấm công | OCR & Chứng từ — Thư viện mẫu (`ocrlib`) | — | — | — |
| Sản lượng | Sản lượng (`sanluong`) | **Có** | Có | Có |
| Sản lượng | Ban dăm xuất hàng (`bandam`) | **Có** | Có | Có |
| Sản lượng | BẢNG KÊ PHIẾU CÂN SẢN LƯỢNG (`rp_sl`) | Riêng: bộ lọc riêng của mẫu báo cáo nghiệp vụ (Phòng ban, Từ khóa) | Có | Có |
| Sản lượng | BẢNG KÊ BAN DĂM XUẤT HÀNG (`rp_bd`) | Riêng: bộ lọc riêng của mẫu báo cáo nghiệp vụ (Phòng ban, Từ khóa) | Có | Có |
| Nghiệp vụ tiền lương | Thưởng / Trừ (`psluong`) | **Có** | Có | Có |
| Nghiệp vụ tiền lương | Tạm ứng (`ungluong`) | **Có** | Có | Có |
| Nghiệp vụ tiền lương | Suất cơm (`tiencom`) | **Có** | Có | Có |
| Tính lương | Tính lương (`luong`) | Riêng: chạy tính lương; xem kết quả ở các báo cáo lương | — | — |
| Tính lương | Kiểm tra bảng lương (`ktbl`) | Riêng: danh sách kiểm, lọc theo mức | Có | — |
| Tính lương | Kỳ lương đã chốt (`kyluong`) | Riêng: danh sách kỳ | — | — |
| Tính lương | Đối chiếu lương Power Query (`doichieu`) | — | Có | — |
| Thanh toán lương | BẢNG THANH TOÁN LƯƠNG (`rp_thanhtoan`) | **Có** | Có | Có |
| Thanh toán lương | CHI TIẾT THANH TOÁN (`rp_cttt`) | **Có** | Có | Có |
| Thanh toán lương | SỔ CHỨNG TỪ THANH TOÁN (`rp_soct`) | **Có** | Có | Có |
| Thanh toán lương | BẢNG KÊ CHUYỂN KHOẢN (`rp_ck`) | **Có** | Có | Có |
| Thanh toán lương | BẢNG THANH TOÁN LƯƠNG TIỀN MẶT (`rp_tm`) | **Có** | Có | Có |
| Báo cáo lương | BẢNG TÍNH LƯƠNG (`bangtinh`) | **Có** | Có | Có |
| Báo cáo lương | BẢNG TỔNG HỢP LƯƠNG (`rp_tonghop`) | **Có** | Có | Có |
| Báo cáo lương | BẢNG TỔNG HỢP CHI TIẾT LƯƠNG TOÀN BỘ NHÂN VIÊN (`rp_ctnv`) | **Có** | Có | Có |
| Báo cáo lương | PHIẾU LƯƠNG CHI TIẾT (`slips`) | Riêng: chọn nhân viên / phòng ban để in phiếu | Có | Có |
| Báo cáo lương | BÁO CÁO KHẤU TRỪ THUẾ TNCN (`rp_tncn`) | **Có** | Có | Có |
| Báo cáo khác | BẢNG TỔNG HỢP LƯƠNG THEO PHÒNG BAN (`rp_pb`) | **Có** | Có | Có |
| Báo cáo khác | BÁO CÁO LƯƠNG (`baocaoluong`) | **Có** | Có | Có |
| Báo cáo khác | Báo cáo nhân sự (`baocao`) | Riêng: 9 báo cáo nhân sự, chọn loại; lọc theo loại | Có | Có |
| Báo cáo nghiệp vụ | DANH SÁCH NHÂN SỰ (`rp_ns`) | Riêng: bộ lọc riêng của mẫu báo cáo nghiệp vụ (Phòng ban, Từ khóa, Trạng thái NV) | Có | Có |
| Báo cáo nghiệp vụ | BẢNG KÊ THƯỞNG / TRỪ (`rp_th`) | Riêng: bộ lọc riêng của mẫu báo cáo nghiệp vụ (Phòng ban, Từ khóa) | Có | Có |
| Báo cáo nghiệp vụ | BẢNG KÊ TẠM ỨNG LƯƠNG (`rp_tu`) | Riêng: bộ lọc riêng của mẫu báo cáo nghiệp vụ (Phòng ban, Từ khóa) | Có | Có |
| Báo cáo nghiệp vụ | TỔNG HỢP SUẤT CƠM (`rp_com`) | Riêng: bộ lọc riêng của mẫu báo cáo nghiệp vụ (Phòng ban, Từ khóa) | Có | Có |
| Danh mục | Danh mục (`dm`) | **Có** | Có | — |
| Cài đặt | Cài đặt — Công thức & phương pháp tính lương (`caidat`) | — | — | — |
| Cài đặt | Công ty & Sao lưu (`backup`) | — | Có | — |
| Cài đặt | Hướng dẫn & Quy chế lương (`huongdan`) | — | — | Có |

## Chuẩn trình bày (mục 3) — bằng chứng đã có
- **Tiêu đề đơn vị, tên báo cáo IN HOA, kỳ, phạm vi lọc, ngày lập, người lập, chữ ký, A4 ngang**: mẫu chung `core/reporting/report-html.js` (PDF) và `ui/report-xlsx` (`HAKUi.reportXlsx.buildMany`, Excel) cho mọi báo cáo nghiệp vụ / lương / thanh toán; báo cáo có lỗi dữ liệu bị chặn xuất (`opsExportOk`).
- **Số căn phải, định dạng Việt `1.234.567`, dòng TỔNG CỘNG in đậm**: `opsTable` (lớp `r`, `tr-sum`), `E.money`.
- **Bảng ↔ Excel ↔ PDF khớp từng dòng/cột**: `docs/PDF_CONTENT_MATRIX.md` (36 báo cáo, 101 dòng, có đối chứng); xuất Excel theo bộ lọc khớp màn hình: `input-filter-dept` (7 màn Smart Filter).

## Kết luận kiểm kê
- 20/39 màn có Smart Filter dùng chung; mọi báo cáo **lương, thanh toán, thuế** đều có.
- **6 báo cáo nghiệp vụ** (`rp_ns`, `rp_sl`, `rp_bd`, `rp_th`, `rp_tu`, `rp_com`) dùng **bộ lọc riêng** của mẫu (Phòng ban + Từ khóa, nhân sự thêm Trạng thái). Lọc đúng, phạm vi lọc in trên báo cáo, nhưng khác kiểu với Smart Filter, và từ khóa **dùng chung một ô nhớ cho cả 6 báo cáo** (lọc ở Thưởng/Trừ rồi mở Suất cơm vẫn giữ từ khóa — ô tìm hiện rõ từ khóa nên không ẩn dữ liệu âm thầm).
- Màn không phải danh sách (Tổng quan, Tính lương, Cài đặt, Hướng dẫn, OCR) không cần bộ lọc.

## Đề xuất (mục 5 — chưa làm, cần chủ sở hữu duyệt vì đổi giao diện các báo cáo đang dùng)
1. Thay bộ lọc riêng của 6 báo cáo nghiệp vụ bằng Smart Filter dùng chung, giữ bộ lọc **riêng từng báo cáo**; thêm kiểm `input-filter-dept` cho 6 màn này.
2. Ghim báo cáo hay dùng lên Tổng quan; lưu mẫu lọc đặt tên.
3. Chưa kiểm: in trên máy in thật, Windows thật, số trang / tiêu đề lặp khi in nhiều trang so với bản mẫu.
