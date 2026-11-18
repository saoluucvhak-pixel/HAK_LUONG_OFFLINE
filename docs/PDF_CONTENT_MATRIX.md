# Ma trận nội dung PDF (chỉ đạo 004 mục 2, issue #92)

Dữ liệu GIẢ. **Cách kiểm:** dựng HTML in bằng module thật (`core/reporting/report-html.js`, đúng như app truyền cho `exportSheetsPdf`: `OPS.toSheets` có cột tường minh, `BH.*`, `B.report`, `IPAY.build`) → xuất PDF bằng **đường thật** `hakReport.pdf` (IPC `report-pdf` → `main/pdf.js` `printToPDF` của Electron) → **trích văn bản từ file PDF** bằng bộ trích không phụ thuộc thư viện (`tests/helpers/pdf-text.cjs`: giải nén Flate, ánh xạ glyph → Unicode bằng ToUnicode CMap, theo dõi ma trận văn bản/biến đổi để biết vị trí từng ô) → đối chiếu với **dữ liệu báo cáo** (dòng mong đợi lấy từ dữ liệu, số định dạng viết lại độc lập, không lấy từ HTML). Chạy: `tests/e2e/sqlite-default.cjs` bước 10 (Electron thật; CI Windows chạy bước này); bộ trích có 3 unit test riêng trên PDF tự dựng (`tests/unit/pdf-text-helper.test.js`) phủ phông Type0/Identity-H (Windows) và Type3 (Skia dự phòng), Flate, trục lật.

Mức khớp từng dòng dữ liệu (mỗi dòng được xếp vào mức MẠNH NHẤT đạt): **nguyên dòng** — mọi ô xuất hiện lần lượt trên một dòng PDF; **theo khối** — ô dài bị ngắt dòng hoặc bảng rộng bị tách phần cột, neo theo ô khóa duy nhất của dòng, mọi từ phải có trong khối; **yếu** — dòng không có ô khóa (thường là dòng "TỔNG CỘNG"), mọi từ phải có đâu đó trong PDF.

| Nhóm | Báo cáo (sheet) | Dòng dữ liệu | Kết quả |
|---|---|---|---|
| Vận hành | Nhân sự (không lọc / lọc NV001) + Số nhân sự theo phòng ban | 5+3 / 2+2 | Đạt |
| Vận hành | Sản lượng (không lọc / lọc) + tổng hợp theo tổ + theo công nhân | 4+2+4 / 2+2+2 | Đạt |
| Vận hành | Bơm/ban dăm (không lọc / lọc) + theo tổ + theo công nhân | 3+2+3 / 2+2+2 | Đạt |
| Vận hành | Thưởng/trừ (không lọc / lọc) + theo nhân viên | 3+3 / 2+2 | Đạt |
| Vận hành | Tạm ứng (không lọc / lọc) + theo nhân viên | 3+3 / 2+2 | Đạt |
| Vận hành | Suất cơm (không lọc / lọc) — bảng RỘNG tách 4 phần cột + theo phòng ban + đối chiếu | 3+3+3 / 2+2+2 | Đạt (bảng rộng khớp theo khối) |
| Bảo hiểm | Chi tiết · theo phòng ban · tổng hợp theo khoản | 5 · 3 · 5 | Đạt |
| Cấp phát | Tổng hợp · chi tiết (kể cả dòng thu hồi) | 5 · 4 | Đạt |
| Lương | Bảng lương nội bộ nhóm theo phòng ban (`RH.table`) | 2 | Đạt |
| Tiếng Việt | 7 tên/ghi chú đủ dấu thanh/mũ/móc/đ + tên công ty hoa có dấu | 7 | Đạt từng ký tự |
| Đối chứng | Sửa 1 số trong dòng mong đợi (2.000.000 → 2.000.001) | — | **Bị PHÁT HIỆN** (bộ kiểm không "khớp cho qua") |

Tổng 36 báo cáo/sheet, 101 dòng dữ liệu: 85 nguyên dòng, 13 theo khối, 3 yếu (dòng tổng); 39 ca E2E mới (36 báo cáo + đối chứng + tiếng Việt + kiểm lỗi JavaScript).

**Lỗi thật tìm được:** không có trong mã sản phẩm. (Hai lần "lệch" lúc dựng bộ kiểm là lỗi của chính bộ kiểm/dữ liệu thử: dựng bảng không truyền cột tường minh làm JavaScript xếp khóa số lên trước — app thật luôn truyền `cols`; và dấu `:`/`(`/`)` không có trong bảng ToUnicode của phông Type3 dự phòng — đã chuẩn hóa khi so sánh. Đã kiểm lại các nơi gọi `exportSheetsPdf`: màn hình nhập liệu "⬇ PDF" không có cột chấm công nên không dính vấn đề thứ tự khóa số.)

## Giới hạn / chưa kiểm
- Chưa kiểm **bằng mắt** bố cục (căn lề, ngắt trang, màu) — chỉ kiểm nội dung văn bản; chưa so sánh số trang với bản mẫu.
- Dấu gạch `-`, `:`, `(`, `)` được bỏ khi so sánh (phông dự phòng của Skia không ghi chúng vào ToUnicode) — nên một lỗi chỉ ở các dấu này sẽ không bị bắt; dấu chấm/phẩy của số được GIỮ nguyên khi so.
- Chạy trên Linux: Chromium dùng phông Type3 dự phòng; trên Windows thật là phông TrueType (Type0) — bộ trích đã có unit test cho dạng này nhưng chưa có bằng chứng chạy trên PDF Windows thật ngoài CI.
- Chưa phủ: báo cáo lương dạng nhiều bảng khác (thanh toán, chuyển khoản, tiền mặt, thuế TNCN — `payroll-reports`), báo cáo kỳ đã chốt, bộ báo cáo kỳ lương (`17-chot-ky`), PDF của màn hình nhập liệu "⬇ PDF", PDF kho năm, PDF từ OCR. Ma trận này là bước đầu cho 4 nhóm chính.
