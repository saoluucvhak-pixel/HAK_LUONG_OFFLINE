# Danh mục màn hình, tab và hộp thoại (chỉ đạo 005, issue #97)

Nguồn: **menu thật** của app v2.0.x, đăng nhập lần lượt 7 vai trò mặc định (`core/permissions.js`) trên dữ liệu giả (`tests/e2e/layout-audit.cjs`, `syntheticData`). Không đoán: danh sách do script đọc `#nav button[data-k]` rồi ghi lại.

Vai trò: **Admin** = Quản trị; **NS** = Nhân sự; **KTL** = Kế toán lương; **KTTT** = Kế toán thanh toán; **TBP** = Trưởng bộ phận; **PD** = Người phê duyệt; **XBC** = Người xem báo cáo. Số màn thấy được: Admin 39, NS 18, KTL 38, KTTT 26, TBP 19, PD 37, XBC 23.

## 1. Màn (mục menu bên trái) × vai trò thấy được × kết quả kiểm bố cục tự động

Cột kết quả: 1366×768 / 1920×1080 / 1024×768 — `Đạt` hoặc danh sách nhóm lỗi (chi tiết ở `docs/UI_ISSUES.md`).

| Nhóm menu | Mã màn (`data-k`) | Tên hiển thị | Vai trò thấy | 1366×768 | 1920×1080 | 1024×768 |
|---|---|---|---|---|---|---|
| Tổng Quan | `home` | Tổng quan | Admin, NS, KTL, KTTT, TBP, PD, XBC | Đạt | Đạt | thanh trên xuống hàng |
| Nhân Sự | `nhansu` | Danh sách nhân viên & hồ sơ | Admin, NS, KTL, KTTT, TBP, PD | tương phản dưới AA | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Nhân Sự | `nvns` | Nghiệp vụ nhân sự | Admin, NS, KTL, KTTT, TBP, PD | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Nhân Sự | `capphat` | Cấp phát | Admin, NS, KTL, KTTT, TBP, PD | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Chấm Công | `chamcong` | Bảng chấm công | Admin, NS, KTL, TBP, PD | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Chấm Công | `ocr` | Đọc ảnh chấm công | Admin, KTL, TBP | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Chấm Công | `ocrlib` | Thư viện mẫu OCR | Admin, NS, KTL, TBP, PD | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Sản Lượng | `sanluong` | Sản lượng | Admin, NS, KTL, TBP, PD | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Sản Lượng | `bandam` | Ban dăm xuất hàng | Admin, NS, KTL, TBP, PD | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Sản Lượng | `rp_sl` | Phiếu gốc sản lượng | Admin, NS, KTL, TBP, PD | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Sản Lượng | `rp_bd` | Phiếu gốc Ban dăm xuất hàng | Admin, NS, KTL, TBP, PD | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Nghiệp Vụ Tiền Lương | `psluong` | Thưởng / Trừ | Admin, NS, KTL, TBP, PD | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Nghiệp Vụ Tiền Lương | `ungluong` | Tạm ứng | Admin, NS, KTL, TBP, PD | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Nghiệp Vụ Tiền Lương | `tiencom` | Suất cơm | Admin, NS, KTL, TBP, PD | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Tính Lương | `luong` | Tính lương theo kỳ | Admin, KTL, KTTT, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Tính Lương | `ktbl` | Kiểm tra bảng lương | Admin, KTL, KTTT, PD, XBC | thanh trên xuống hàng; ít dòng nhìn thấy | Đạt | thanh trên xuống hàng; ít dòng nhìn thấy |
| Tính Lương | `kyluong` | Kỳ lương đã chốt | Admin, KTL, KTTT, PD, XBC | Đạt | Đạt | thanh trên xuống hàng |
| Tính Lương | `doichieu` | Đối chiếu Excel | Admin, KTL, KTTT, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Thanh Toán Lương | `rp_thanhtoan` | Bảng thanh toán lương | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Thanh Toán Lương | `rp_cttt` | Chi tiết thanh toán | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Thanh Toán Lương | `rp_soct` | Sổ chứng từ thanh toán | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Thanh Toán Lương | `rp_ck` | Bảng kê chuyển khoản | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Thanh Toán Lương | `rp_tm` | Thanh toán tiền mặt | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Báo Cáo Lương | `bangtinh` | Bảng tính lương | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Báo Cáo Lương | `rp_tonghop` | Bảng tổng hợp lương | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Báo Cáo Lương | `rp_ctnv` | Tổng hợp chi tiết nhân viên | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Báo Cáo Lương | `slips` | Phiếu lương chi tiết | Admin, KTL, KTTT, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Báo Cáo Lương | `rp_tncn` | Khấu trừ thuế TNCN | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Báo Cáo Khác | `rp_pb` | Tổng hợp theo phòng ban | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Báo Cáo Khác | `baocaoluong` | Báo cáo lương khác | Admin, KTL, KTTT, PD, XBC | tương phản dưới AA; thanh trên xuống hàng | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng; ít dòng nhìn thấy |
| Báo Cáo Khác | `baocao` | Báo cáo nhân sự | Admin, NS, KTL, TBP, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Báo Cáo Nghiệp Vụ | `rp_ns` | Danh sách nhân sự | Admin, NS, KTL, KTTT, TBP, PD | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Báo Cáo Nghiệp Vụ | `rp_th` | Bảng kê thưởng / trừ | Admin, KTL, KTTT, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng; ít dòng nhìn thấy |
| Báo Cáo Nghiệp Vụ | `rp_tu` | Bảng kê tạm ứng | Admin, KTL, KTTT, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Báo Cáo Nghiệp Vụ | `rp_com` | Tổng hợp suất cơm | Admin, NS, KTL, TBP, PD | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Danh Mục | `dm` | Danh mục | Admin, NS, KTL, KTTT, TBP, PD, XBC | tương phản dưới AA | tương phản dưới AA | tương phản dưới AA; thanh trên xuống hàng |
| Cài Đặt | `caidat` | Công thức & phương pháp | Admin, KTL, KTTT, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |
| Cài Đặt | `backup` | Công ty & Sao lưu | Admin | Đạt | Đạt | thanh trên xuống hàng |
| Cài Đặt | `huongdan` | Hướng dẫn & Quy chế | Admin, NS, KTL, KTTT, TBP, PD, XBC | thanh trên xuống hàng | Đạt | thanh trên xuống hàng |

## 2. Hộp thoại đã kiểm tự động (ví dụ tiêu biểu, ở 3 cỡ)

| Hộp thoại | Đường vào | Kiểm | Kết quả |
|---|---|---|---|
| Thêm nhân viên | Nhân sự → Thêm nhân viên | vừa khung nhìn; nút chính thấy ngay | Đạt ở cả 3 cỡ |
| Xem trước nhập Excel | Nhập Excel (VD Suất cơm) | như trên | Đạt ở cả 3 cỡ |
| Danh mục: lịch sử | Danh mục → Lịch sử | như trên | Đạt ở cả 3 cỡ |

Các hộp thoại còn lại (qua `modal(` trong `app-src/`) **chưa kiểm bằng máy** — danh sách tiêu đề hộp thoại ở mục 3.

## 3. Hộp thoại có trong mã (`modal("…")`, đối chiếu tĩnh)

Tiêu đề chuỗi cố định (hộp thoại có tiêu đề động ghép chuỗi không liệt kê được bằng grep): “Lịch sử — ”; “📂 File đã tải”; “⚠ Dữ liệu đã đổi trước khi chốt ”; “Đổi mật khẩu — ”; “Đối soát nguồn — ”; “Đối soát ”; “Đối chiếu đơn nghỉ — ”; “Đối chiếu tiền đã chi — ”; “Đối chiếu tiền đã chi trước khi chốt lại”; “Đối chiếu ”; “Xác nhận gắn tiêu chuẩn”; “Xác nhận có làm để chia sản lượng”; “Xem trước: chia ”; “Xem trước — ”; “Xem trước tất cả phiếu bị ảnh hưởng — ”; “Xem trước nhập Excel”; “Xem trước nhập Excel cấp phát”; “Xem trước chứng từ ”; “Xem trước chuyển hẳn sản lượng”; “Xem cách tính — ”; “Tăng lương / biến động — ”; “Tìm nhanh”; “Tiêu chuẩn phúc lợi”; “Thử tính thuế TNCN”; “Thêm nhân viên mới”; “Thu hồi / điều chỉnh phiếu ”; “Theo dõi khoản khấu trừ còn thiếu”; “Sửa thông tin cơ bản”; “Sửa bản nháp — ”; “Sửa ”; “Sản lượng phát sinh / kỳ chi trả”; “Quy chế tính lương”; “Phương pháp bù chưa khớp”; “Phiếu chưa hợp lệ”; “Nhập Excel cấp phát”; “Người phụ thuộc — ”; “Mã khôi phục quản trị”; “Lịch sử tài liệu — ”; “Kiểm tra cấu hình thuế TNCN”; “Chứng từ gốc của ô”; “Chuyển thành sản lượng kỳ mới”; “Chi tiết — ”; “Chi tiết hợp đồng ”; “Checklist trước khi chốt kỳ lương”; “CHỨNG TỪ ”; “CHI TIẾT TÍNH THUẾ TNCN — ”; “CHI TIẾT THANH TOÁN LƯƠNG — ”; “Biểu thuế TNCN — mã ”. Tổng 48 tiêu đề.

## 4. Chưa nghiệm thu
- Kiểm bằng mắt trên màn hình Windows thật của chủ sở hữu; mọi kết quả trên chạy ở Linux (xvfb) và CI Windows bằng chính các kiểm tự động, KHÔNG thay cho mắt người.
- Tab con trong từng màn (ví dụ Ban dăm: theo tổ / trực tiếp; Danh mục: các bảng) mới được kiểm ở tab mặc định.
- Hộp thoại chưa liệt kê ở mục 2.
