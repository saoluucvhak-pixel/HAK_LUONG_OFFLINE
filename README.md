# HAK_LUONG_OFFLINE — app lương chính V10.4

`main` là nơi quản lý thống nhất. **Ứng dụng được phát hành nằm trong `LuongHAK_Offline/`**, dùng Electron và NSIS. Chỉ tải Setup từ workflow **LUONG HAK V10.4 Windows Setup** có commit/test đạt; không dùng bộ cài dev v0.1.0 cũ.

## Bố trí mã nguồn

- `LuongHAK_Offline/`: app chính — tính/chốt kỳ, danh mục cha–con, OCR, kho năm, Full Backup.
- `design-system/`, `HAK_SMART_FILTER/`, `HAK_AI_SKILLS/`, `HAK_CODE_QUALITY_TEST/`, `HAK_ACCOUNTING_REPORT_STANDARD/`: tài nguyên dùng chung đã có trong dòng V10.4.
- `experimental/kpi/`: mô-đun, test và dự thảo KPI được giữ riêng. Chưa nạp vào app hoặc dùng để trả lương.
- `legacy/dev-reference/`: bản tham chiếu của nhánh dev đã hardening, không đóng gói vào app chính. Không chạy HAKDocs hay workflow phát hành trong bản tham chiếu.
- Các tệp `.gs` và `index.html` ở gốc: nguồn Google Apps Script cũ, không phải entry point của app Electron.

Lịch sử các nhánh được giữ bằng merge commit; [bảng theo dõi nhánh](docs/CONSOLIDATED_BRANCHES.json) ghi rõ commit và cách tích hợp. Không xóa nhánh cũ trong đợt hợp nhất này. Repo `LUONG_HAK` cũ và `HAK_OCR_ENGINE` dùng chung vẫn quản lý riêng.

## Phát triển và kiểm tra

```text
npm --prefix LuongHAK_Offline ci
npm test
npm run check
npm run test:legacy
npm run test:kpi
```

App chính: `npm --prefix LuongHAK_Offline start` nếu host có script start, hoặc chạy Electron với thư mục `LuongHAK_Offline`. Đóng gói Windows: `npm --prefix LuongHAK_Offline run dist`. Hướng dẫn người dùng: [USER_GUIDE](docs/USER_GUIDE.md).

## Dữ liệu và giới hạn

Không commit dữ liệu lương, ảnh chứng từ thật, backup, mật khẩu hoặc khóa. Full Backup phải mang cả chứng từ và kho năm. Chữ tay OCR chưa nghiệm thu đầy đủ; luôn đối chiếu trước khi nhập. Lương cố định CĐ giữa tháng giữ quy chế hiện có, không tự đổi công thức trong đợt hợp nhất. Dữ liệu cũ cần kiểm tra danh mục thuế hiệu lực, không suy ra đúng chỉ vì danh mục mẫu đã cập nhật.
