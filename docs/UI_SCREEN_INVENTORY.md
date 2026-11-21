# Danh mục màn hình, tab và hộp thoại (chỉ đạo 005, issue #97)

Nguồn: **menu thật** của app v2.0.x, đăng nhập lần lượt 7 vai trò mặc định (`core/permissions.js`) trên dữ liệu giả (`tests/e2e/layout-audit.cjs`, `syntheticData`). Không đoán: danh sách do script đọc `#nav button[data-k]` rồi ghi lại.

Vai trò: **Admin** = Quản trị; **NS** = Nhân sự; **KTL** = Kế toán lương; **KTTT** = Kế toán thanh toán; **TBP** = Trưởng bộ phận; **PD** = Người phê duyệt; **XBC** = Người xem báo cáo. Số màn thấy được: Admin 39, NS 18, KTL 38, KTTT 26, TBP 19, PD 37, XBC 23.

## 1. Màn (mục menu bên trái) × vai trò thấy được × kết quả kiểm bố cục tự động

Cột kết quả: 1366×768 / 1920×1080 / 1024×768 — **Hiện trạng (từ v2.0.53):** toàn bộ 4 nhóm lỗi ghi nhận ban đầu (`UI-001` thanh trên xuống hàng v2.0.48, `UI-002` ít dòng nhìn thấy v2.0.45, `UI-003` tương phản chữ dưới AA v2.0.52, `UI-004` hai thanh cuộn dọc lồng nhau v2.0.53) đã được xử lý và kiểm PASS/FAIL trong `tests/e2e/layout-audit.cjs` + `tests/e2e/input-filter-dept.cjs` (0 lỗi cứng ở 117 màn × cỡ, chi tiết ở `docs/UI_ISSUES.md`).

| Nhóm menu | Mã màn (`data-k`) | Tên hiển thị | Vai trò thấy | 1366×768 | 1920×1080 | 1024×768 |
|---|---|---|---|---|---|---|
| Tổng Quan | `home` | Tổng quan | Admin, NS, KTL, KTTT, TBP, PD, XBC | Đạt | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Nhân Sự | `nhansu` | Danh sách nhân viên & hồ sơ | Admin, NS, KTL, KTTT, TBP, PD | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Nhân Sự | `nvns` | Nghiệp vụ nhân sự | Admin, NS, KTL, KTTT, TBP, PD | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Nhân Sự | `capphat` | Cấp phát | Admin, NS, KTL, KTTT, TBP, PD | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Chấm Công | `chamcong` | Bảng chấm công | Admin, NS, KTL, TBP, PD | Đạt (UI-001..004 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..004 đã sửa) |
| Chấm Công | `ocr` | Đọc ảnh chấm công | Admin, KTL, TBP | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Chấm Công | `ocrlib` | Thư viện mẫu OCR | Admin, NS, KTL, TBP, PD | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Sản Lượng | `sanluong` | Sản lượng | Admin, NS, KTL, TBP, PD | Đạt (UI-001..004 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..004 đã sửa) |
| Sản Lượng | `bandam` | Ban dăm xuất hàng | Admin, NS, KTL, TBP, PD | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Sản Lượng | `rp_sl` | Phiếu gốc sản lượng | Admin, NS, KTL, TBP, PD | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Sản Lượng | `rp_bd` | Phiếu gốc Ban dăm xuất hàng | Admin, NS, KTL, TBP, PD | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Nghiệp Vụ Tiền Lương | `psluong` | Thưởng / Trừ | Admin, NS, KTL, TBP, PD | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Nghiệp Vụ Tiền Lương | `ungluong` | Tạm ứng | Admin, NS, KTL, TBP, PD | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Nghiệp Vụ Tiền Lương | `tiencom` | Suất cơm | Admin, NS, KTL, TBP, PD | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Tính Lương | `luong` | Tính lương theo kỳ | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Tính Lương | `ktbl` | Kiểm tra bảng lương | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001/002 đã sửa) | Đạt | Đạt (UI-001/002 đã sửa) |
| Tính Lương | `kyluong` | Kỳ lương đã chốt | Admin, KTL, KTTT, PD, XBC | Đạt | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Tính Lương | `doichieu` | Đối chiếu Excel | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Thanh Toán Lương | `rp_thanhtoan` | Bảng thanh toán lương | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001..003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Thanh Toán Lương | `rp_cttt` | Chi tiết thanh toán | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001..003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Thanh Toán Lương | `rp_soct` | Sổ chứng từ thanh toán | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Thanh Toán Lương | `rp_ck` | Bảng kê chuyển khoản | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Thanh Toán Lương | `rp_tm` | Thanh toán tiền mặt | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Báo Cáo Lương | `bangtinh` | Bảng tính lương | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Báo Cáo Lương | `rp_tonghop` | Bảng tổng hợp lương | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001..003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Báo Cáo Lương | `rp_ctnv` | Tổng hợp chi tiết nhân viên | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001..003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Báo Cáo Lương | `slips` | Phiếu lương chi tiết | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Báo Cáo Lương | `rp_tncn` | Khấu trừ thuế TNCN | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001..003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Báo Cáo Khác | `rp_pb` | Tổng hợp theo phòng ban | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Báo Cáo Khác | `baocaoluong` | Báo cáo lương khác | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001/003 đã sửa) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001..003 đã sửa) |
| Báo Cáo Khác | `baocao` | Báo cáo nhân sự | Admin, NS, KTL, TBP, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Báo Cáo Nghiệp Vụ | `rp_ns` | Danh sách nhân sự | Admin, NS, KTL, KTTT, TBP, PD | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Báo Cáo Nghiệp Vụ | `rp_th` | Bảng kê thưởng / trừ | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001/002 đã sửa) |
| Báo Cáo Nghiệp Vụ | `rp_tu` | Bảng kê tạm ứng | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Báo Cáo Nghiệp Vụ | `rp_com` | Tổng hợp suất cơm | Admin, NS, KTL, TBP, PD | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Danh Mục | `dm` | Danh mục | Admin, NS, KTL, KTTT, TBP, PD, XBC | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-003 đã sửa v2.0.52) | Đạt (UI-001/003 đã sửa) |
| Cài Đặt | `caidat` | Công thức & phương pháp | Admin, KTL, KTTT, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Cài Đặt | `backup` | Công ty & Sao lưu | Admin | Đạt | Đạt | Đạt (UI-001 đã sửa v2.0.48) |
| Cài Đặt | `huongdan` | Hướng dẫn & Quy chế | Admin, NS, KTL, KTTT, TBP, PD, XBC | Đạt (UI-001 đã sửa v2.0.48) | Đạt | Đạt (UI-001 đã sửa v2.0.48) |

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
