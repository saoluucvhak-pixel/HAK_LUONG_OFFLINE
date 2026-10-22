# V10.4 — nguồn kế thừa và phạm vi nâng cấp

Không tạo lại bộ công cụ đã có. Các thư mục dưới đây được khôi phục có chọn lọc, không merge mã lương từ nhánh công cụ.

| Thành phần | Nguồn | Commit |
|---|---|---|
| HAK Code Quality, Architecture Analyzer, Observer, Dashboard V3.2 | feature/hak-dashboard-auto-json-v3-2 | a19ad8ab21cb9fcc37ca0519c7e8ccbe9130e4d5 |
| HAK Accounting Report Standard, HAK Smart Filter, skill định dạng và bộ lọc | cùng snapshot công cụ trên | a19ad8ab21cb9fcc37ca0519c7e8ccbe9130e4d5 |
| HAK Enterprise Design System | design/hak-enterprise-v10-4 | 8748f2e5550b5dceb7436f6ff5fac3ac2624ca1d |
| Baseline sản phẩm để so sánh UI | feature/luong-hak-v10-3-smart-filter-allowance-support | 4576259a2f7d079b91a915abeeec54cdd4e82d64 |

## Thiết kế đã chốt

Giữ `luxe` làm mặc định, giữ nguyên token navy–champagne–nền ngà từ V10.3, không tự chuyển palette hoặc ghi đè tùy chọn cũ. Thay đổi bố cục phải dùng các token sẵn có và hỗ trợ sáng/tối. Không triển khai quy tắc tính lương theo DQ/QC mới trong đợt UI này.

`design-system/hak-enterprise-components.css` là tài nguyên thiết kế gốc. Bản sao tại `LuongHAK_Offline/ui/hak-enterprise-components.css` được nạp trong app và đóng gói cùng Electron; kiểm thử xác nhận hai tệp khớp nhau. Bản sao này phục vụ đường dẫn tương đối trong ứng dụng đã đóng gói.

## Nâng cấp có thể quan sát

- Dashboard: tiêu đề và kỳ đang xử lý, bốn chỉ số, tiến độ sáu mốc dựa trên dữ liệu hiện có, lối vào công việc. Không tự tính lại lương.
- Menu: bố cục gọn; nhóm đang hoạt động cũng thu gọn/mở được và trạng thái ARIA khớp các mục hiển thị.
- Danh mục: bảng gọn mặc định, có nút mở đầy đủ cột; giữ các thao tác cũ và vùng xem công thức/phiên bản bên cạnh khi đủ chiều rộng.
- Side Drawer: cuộn trong vùng nội dung, chân thao tác riêng, đóng trả focus về mã đang xem sau khi danh sách vẽ lại.
- Smart Filter: khoảng cách và phân nhóm dễ đọc hơn, giữ nguyên trạng thái nháp/áp dụng và phạm vi dữ liệu.

## Công cụ và skill

Giữ bản gốc tại `HAK_CODE_QUALITY_TEST`, `HAK_SMART_FILTER`, `HAK_ACCOUNTING_REPORT_STANDARD`; hướng dẫn gọi ba công cụ ở `HAK_AI_SKILLS/code-quality`, `architecture-analyzer`, `quality-observer`. Dashboard chất lượng chạy cục bộ theo tài liệu đi kèm. Đây là công cụ phát triển, không thêm menu kỹ thuật vào phần mềm lương.

Workflow V10.4 chạy kiểm thử thư viện kế thừa, quét mã/bảo mật, phân tích kiến trúc, tạo báo cáo Observer và lưu artifact. Cảnh báo tĩnh không được gọi là lỗ hổng đã xác nhận và không bị giấu đi để tạo kết quả xanh.

Ảnh trước–sau và kiểm tra bố cục dùng Electron thật, cùng dữ liệu giả, cùng kích thước 1366×768 và 1920×1080. Ca trước dùng đúng commit V10.3 nêu trên. Artifact không chứa cơ sở dữ liệu giả, backup hay dữ liệu thực.

## Giới hạn cần giữ rõ

Read-isolation của `store-load` là khoảng trống bảo mật đã được ghi trong tài liệu audit từ trước; thiết kế UI không giải quyết nó. Quét tĩnh có thể nhận nhầm fixture/vùng vendor và bỏ sót luồng dữ liệu. Architecture Analyzer không mô hình hóa đầy đủ các global renderer. Không tuyên bố chứng nhận bảo mật hoặc đủ điều kiện dùng dữ liệu thật chỉ dựa trên test xanh.
