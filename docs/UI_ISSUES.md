# Lỗi bố cục / dễ dùng tìm được bằng máy (chỉ đạo 005, issue #97) — PR 005-A

Nguồn: `LuongHAK_Offline/tests/e2e/layout-audit.cjs` chạy trong `tests/e2e/input-filter-dept.cjs` (job `electron-e2e`, Windows) trên **mọi màn của menu × 3 cỡ** (1366×768, 1920×1080, 1024×768) với dữ liệu giả 24 nhân viên ở tháng hiện tại; ảnh từng màn × cỡ nằm trong artifact `HAK-LUONG-V10.4-Electron-E2E-<số lần chạy>` (thư mục `screenshots/`, tên `ui-<mã màn>-<rộng>x<cao>.png`, `ui-dlg-*.png`; số liệu `layout-audit.json`). Danh sách màn: `docs/UI_SCREEN_INVENTORY.md`.

## 1. Kiểm cứng (CI đỏ nếu vi phạm) — kết quả hiện tại: 0 lỗi ở 117 (màn × cỡ) + 9 hộp thoại
Không tràn ngang trang · không chữ bị cắt cụt (không có `…`/tooltip) · bảng rộng có vùng cuộn riêng (không phải cả `#main`) · bảng ≥ 12 dòng có tiêu đề cột cố định (`position: sticky`) · control cùng thanh không chồng nhau · 12 lần Tab: control nhận focus đều có dấu hiệu nhìn thấy · hộp thoại (Thêm nhân viên, Xem trước nhập Excel, Danh mục-Lịch sử) vừa khung nhìn và nút chính thấy ngay. **Ca đối chứng** (cố ý chèn chữ cắt, bảng rộng, hai nút chồng, chữ mờ) chứng minh bộ kiểm bắt được lỗi.

## 2. Lỗi ghi nhận (chưa sửa; CI chỉ in số lượng, không đỏ)
| Mã | Mức | Lỗi | Phạm vi đo được | Ảnh |
|---|---|---|---|---|
| UI-001 | Trung | **Thanh trên bị đẩy xuống 2–3 hàng**: tiêu đề + Tìm kiếm + Kỳ lương + File đã tải + bảng màu + tài khoản + Đăng xuất + chủ đề không vừa một hàng; thanh cao 106–157 px thay vì 57 px (một hàng), lấy mất chiều cao làm việc | 1366×768: 34/39 màn; 1024×768: 39/39; 1920×1080: 0/39 | `ui-chamcong-1366x768.png`, `ui-home-1024x768.png` |
| UI-002 | **Cao** cho màn nhập hằng ngày | **Ít dòng dữ liệu nhìn thấy khi mở màn (< 6)**: thanh nút + bộ lọc + chú thích + chú giải màu chiếm ~480 px; người nhập phải cuộn mới thấy dòng — Bảng chấm công 4 dòng, **Sản lượng 1 dòng**, Kiểm tra bảng lương 1, Bảng thanh toán lương 0, Chi tiết thanh toán 3, Tổng hợp lương 4, Chi tiết NV 3, Thuế TNCN 4 | 1366×768: 8 màn; 1024×768: 13 màn; 1920×1080: 0 | `ui-sanluong-1366x768.png` |
| UI-003 | Thấp | **Tương phản chữ dưới AA**: dòng "Phạm vi: …" (lớp `hint`) 4,23 : 1 (< 4,5) ở thanh số dòng của Smart Filter | 60/117 (màn × cỡ) | `ui-chamcong-1366x768.png` |
| UI-004 | Thấp | **Hai thanh cuộn dọc lồng nhau** (khung trang + bảng) ở Bảng chấm công — quan sát bằng mắt từ ảnh, chưa có phép đo tự động | 1366×768 | `ui-chamcong-1366x768.png` |

Gợi ý sửa (chưa làm, mỗi nhóm một PR nhỏ có test đỏ trước, đổi CSS `ui/workspace-v104.css`/`app-src`, đổi phiên bản, chờ CEO đọc diff): UI-001 cho thanh trên co về một hàng (thu gọn nhãn "Tìm kiếm"/"File đã tải" thành biểu tượng khi hẹp); UI-002 gấp chú thích/chú giải thành "ⓘ Hướng dẫn" có thể mở và gom hai hàng nút; UI-003 đậm hơn màu `hint`. Đổi nhãn hiển thị phải giữ nguyên mã/khóa dữ liệu.

## 3. Mục 5 — "dễ dùng": đếm số bước từ màn chính (ĐỀ XUẤT, chưa chạy tự động, chưa sửa)
| Luồng | Các bước (ước tính từ giao diện) | Số bước | Nhận xét |
|---|---|---|---|
| Nhập chấm công từ Excel | Menu *Bảng chấm công* → *Nhập Excel* → chọn file → *Ghi N dòng* (bản xem trước) → *Lưu để tính lương* | 5 | Vượt 4: bước "Lưu để tính lương" tách riêng là chủ ý (nháp → xác nhận); đề xuất nhắc rõ ngay sau khi ghi ("Nháp — cần Lưu để tính lương" đã có ở thông báo) |
| Nhập sản lượng từ Excel | tương tự | 5 | như trên |
| Chốt kỳ | chưa đếm | — | cần chạy luồng thật ở PR sau |
| Xem phiếu lương | chưa đếm | — | như trên |
| Xuất báo cáo | chưa đếm | — | như trên |
Chưa đếm tự động; số bước ở trên là đọc từ giao diện, cần xác nhận bằng chạy thật. Chưa đổi cách làm việc nào — nếu muốn rút gọn thì hỏi CEO trước.

## 4. Chưa nghiệm thu
Kiểm bằng mắt trên màn hình Windows thật của chủ sở hữu; mọi phép đo ở Linux (xvfb) và CI Windows bằng máy; tab con của từng màn ngoài tab mặc định; hộp thoại ngoài 3 hộp tiêu biểu; chủ đề tối/ba bảng màu còn lại (chỉ kiểm bảng màu mặc định); tương phản mới đo trên lớp `chip/badge/pill/tag/status/hint/warn/ok/bad`.

## 5. Tham chiếu đã đối chiếu (`docs/handoff/THAM_CHIEU_UU_TIEN.md`)
`HAK-Enterprise-Design-System` (đã có bản trong kho: `design-system/V10.4-LAYOUT.md`): tiêu chí "1366×768 và 1920×1080: … không tràn trang" — kiểm bằng máy ở trên; `HAK_AI_SKILLS` `7cf4e1a` `hak-ui-designer`: chưa đọc đối chiếu chi tiết ở PR này (sẽ ghi ở PR sửa lỗi). App giữ khác tham chiếu ở: thêm cỡ 1024 rộng (theo đề bài #97).
