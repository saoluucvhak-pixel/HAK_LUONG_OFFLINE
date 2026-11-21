# BÁO CÁO KHẢO SÁT HỆ THỐNG VÀ BỘ PROMPT NÂNG CẤP MÃ NGUỒN TOÀN DIỆN
**Dự án:** HAK Lương Offline V10.4 (`saoluucvhak-pixel/HAK_LUONG_OFFLINE`)  
**Phiên bản hiện tại:** `v2.0.95`  
**Ngày lập báo cáo:** 22/11/2026  
**Trạng thái hệ thống:** Đã hoàn thành 100% 4 đợt gộp (40/40 PRs #138 – #177), CI 8/8 Jobs xanh.

---

## MỤC LỤC
1. [PHẦN I: BÁO CÁO KHẢO SÁT & RÀ SOÁT HIỆN TRẠNG TOÀN DIỆN](#phần-i-báo-cáo-khảo-sát--rà-soát-hiện-trạng-toàn-diện)
   - 1.1. Tổng quan kiến trúc & các thông số kỹ thuật cốt lõi
   - 1.2. Đánh giá kết quả sau khi hợp nhất 40 PRs
   - 1.3. Phân tích chi tiết các điểm nghẽn kỹ thuật & nợ tồn đọng
   - 1.4. Ma trận đánh giá rủi ro kỹ thuật
2. [PHẦN II: NGUYÊN TẮC BẤT BIẾN KHI NÂNG CẤP](#phần-ii-nguyên-tắc-bất-biến-khi-nâng-cấp)
3. [PHẦN III: BỘ PROMPT NÂNG CẤP & SỬA CHỮA ĐẦY ĐỦ (AGENT-READY)](#phần-iii-bộ-prompt-nâng-cấp--sửa-chữa-đầy-đủ-agent-ready)
   - Prompt 1: Nâng cấp Đường ghi Delta & Tối ưu hóa SQLite (Hiệu năng p50 < 150 ms)
   - Prompt 2: Modularize Frontend sang ES Modules với Bundler esbuild Offline
   - Prompt 3: Bảo mật dữ liệu trên đĩa & Cứng hóa Electron (Mã hóa trong suốt, Ký số bộ cài)
   - Prompt 4: Quy trình Phê duyệt Bảng lương 3 bước & Quyết toán Thuế TNCN Năm
   - Prompt 5: Danh mục kiểm thử nghiệm thu môi trường thật (Windows, Máy in, MS Excel)

---

# PHẦN I: BÁO CÁO KHẢO SÁT & RÀ SOÁT HIỆN TRẠNG TOÀN DIỆN

### 1.1. Tổng quan kiến trúc & các thông số kỹ thuật cốt lõi

- **Môi trường chạy:** Desktop App xây dựng trên nền tảng **Electron 45.3.2**, đóng gói NSIS cho hệ điều hành Windows x64.
- **Mô hình hoạt động:** **100% Offline**, không kết nối internet, không nạp bất kỳ tài nguyên động nào từ CDN lúc runtime.
- **Cơ sở dữ liệu:** 
  - Nguồn dữ liệu chính mặc định: **SQLite (`data.sqlite`)** thông qua module chuẩn `node:sqlite` tích hợp sẵn trong Node/Electron.
  - Bản xuất phụ trợ / quay lui: `data.json` (kích hoạt bằng cờ `HAK_STORAGE=json`).
- **Giao diện người dùng (Renderer):** 
  - Mã nguồn giao diện được phân tách thành **31 tệp** trong `LuongHAK_Offline/app-src/` và `app-src/screens/`.
  - Được ghép tự động thành tệp duy nhất `LuongHAK_Offline/app.js` (dung lượng ~734 KB) thông qua script `scripts/build-app.cjs`.
- **Chất lượng kiểm thử & CI Pipeline:**
  - Quy trình CI một luồng chặt chẽ `.github/workflows/luong-hak-v10-4-setup.yml` gồm đủ 8 jobs.
  - Số lượng kiểm thử tự động: Hơn **1.130 unit/integration tests**, **297 E2E Electron tests**, bộ OCR đánh giá độ chính xác 4/4 ca đạt chuẩn.
  - Các tệp khóa băm bất biến: `engine.js`, `hr.js`, `core/importer.js`, `core/integrity.js`, `core/production-alloc.js` và `shared-modules.lock.json`.

---

### 1.2. Đánh giá kết quả sau khi hợp nhất 40 PRs (#138 – #177)

Dự án vừa trải qua 4 đợt gộp tuần tự quy mô lớn:
1. **Đợt 1 (PR #138 – #142):** Ổn định lõi sao lưu, khắc phục lỗi hiển thị bản sao lưu hỏng, bảo vệ snapshot SQLite.
2. **Đợt 2 (PR #143 – #153):** Siết chặt an toàn nhập liệu, bọc IPC Guard phân quyền, cảnh báo trùng Mã NV, chống dán đè ngoài transaction.
3. **Đợt 3 (PR #154 – #165):** Tối ưu độ tương phản WCAG AA, hoàn thiện bố cục màn Sao lưu, chống xóa mồ côi nhân viên khi khôi phục kỳ, bổ sung bộ biểu tượng SVG nội bộ.
4. **Đợt 4 (PR #166 – #177):** Chuẩn hóa báo cáo kế toán HAK: đồng nhất định dạng ngày `dd/mm/yyyy`, nhãn kỳ đệm số 0 (`09/2026`), xuất PDF/Excel có nhãn cảnh báo bản nháp `_TAM`, chuyển đổi xuất Excel sang mẫu chuyên nghiệp `proXlsx`, tối ưu in gọn phiếu lương `>= 2` phiếu/trang A4.

---

### 1.3. Phân tích chi tiết các điểm nghẽn kỹ thuật & nợ tồn đọng

Qua rà soát kỹ thuật, hệ thống tồn tại **5 vấn đề cốt lõi** cần được giải quyết trong giai đoạn nâng cấp tiếp theo:

#### Điểm nghẽn 1: Kiến trúc Monolith Frontend (`app.js` & `app-src/`)
- **Hiện trạng:** Dù đã chia thành 31 file trong `app-src/`, bản chất đây vẫn chỉ là việc chia nhỏ chuỗi văn bản rồi nối lại. Khi chạy, toàn bộ 31 file nằm trong một hàm bao (IIFE) duy nhất.
- **Rủi ro:** 
  - Các biến trạng thái (`db`, `st`, `session`, `REPO`, `C`) bị chia sẻ toàn cục không kiểm soát.
  - Bất kỳ màn hình nào cũng có thể vô tình đọc/ghi đè biến của màn hình khác.
  - Chưa sử dụng hệ thống module tiêu chuẩn (ES Modules) với `import`/`export`.

#### Điểm nghẽn 2: Đường ghi dữ liệu toàn phần (Full-Document Write Path) & Bộ nhớ RAM
- **Hiện trạng:** Phía giao diện (Renderer) giữ toàn bộ cấu trúc dữ liệu trong biến `db` trên RAM. Mỗi khi người dùng bấm Lưu một dòng hoặc một bảng nhỏ, cơ chế hiện tại thường serialize và gửi khối dữ liệu lớn qua IPC về main process để ghi đĩa.
- **Hệ quả:**
  - Bộ nhớ RAM tiêu thụ (RSS) lên tới ~1,6 GB khi thử nghiệm với 10.000 nhân sự.
  - Thời gian phản hồi ghi đĩa ở 5.000 nhân sự đang ở mức ~270 ms p50, chưa đạt mục tiêu tối ưu `< 150 ms`.
  - Chưa hoàn thành thiết kế **Delta Write Path** (theo `docs/WRITE_PATH_DELTA_DESIGN.md`).

#### Điểm nghẽn 3: Bảo mật dữ liệu trên đĩa & Cứng hóa bộ cài
- **Hiện trạng:** Tệp cơ sở dữ liệu `data.sqlite` và thư mục dữ liệu trên máy tính để ở dạng thô không mã hóa. Nếu thiết bị của kế toán bị truy cập vật lý hoặc sao chép ổ cứng, toàn bộ thông tin mức lương, số tài khoản, số CCCD sẽ bị lộ.
- **Bộ cài Windows:** Bộ cài NSIS chưa được ký số điện tử (Code Signing Certificate), dẫn đến việc Windows Defender SmartScreen hiện cảnh báo màn hình xanh khi cài đặt lần đầu trên máy người dùng.

#### Điểm nghẽn 4: Quy trình kiểm soát nghiệp vụ & Quyết toán thuế năm
- **Quy trình duyệt kỳ lương:** Hiện tại hệ thống cho phép người dùng có quyền tính lương thực hiện Chốt kỳ trực tiếp. Thiếu luồng phê duyệt 3 bên chuẩn doanh nghiệp: **Kế toán lập &rarr; Kế toán trưởng rà soát & duyệt &rarr; Giám đốc phê duyệt &rarr; Chốt kỳ**.
- **Quyết toán thuế TNCN năm:** Báo cáo thuế năm hiện tại chỉ dừng ở mức hiển thị số liệu cơ bản, chưa có bảng đối chiếu tự động khấu trừ thừa/thiếu cho cả năm và chưa xuất được mẫu đối chiếu tương thích bảng kê 05/KK-TNCN.

#### Điểm nghẽn 5: Kiểm thử trên môi trường phần cứng thật
- **Hiện trạng:** 100% các bài kiểm tra tự động và E2E hiện chạy trên môi trường ảo hóa headless (Ubuntu CI với xvfb và Windows Server runner).
- **Thiếu sót:** Chưa có biên bản nghiệm thu trực tiếp trên máy in vật lý văn phòng (kiểm tra ngắt trang thực tế, lề giấy máy in HP/Canon) và chưa mở kiểm tra trực quan các tệp `.xlsx` phức tạp trên phần mềm Microsoft Excel thật.

---

### 1.4. Ma trận đánh giá rủi ro kỹ thuật

| Vấn đề | Mức độ nghiêm trọng | Khả năng xảy ra | Tác động nếu không xử lý | Hướng khắc phục ưu tiên |
| :--- | :---: | :---: | :--- | :--- |
| **Ghi đè dữ liệu nền (`baseSig`)** | Cao | Trung bình | Xung đột dữ liệu khi mở nhiều cửa sổ hoặc lỗi mạng IPC | Thêm `baseSig` và kiểm soát phiên bản dữ liệu nền |
| **Tràn RAM ở quy mô lớn** | Trung bình | Cao | App bị đơ, giật lag khi danh sách NV > 5.000 | Chuyển sang Delta Write Path & phân trang ảo |
| **Lộ dữ liệu nhạy cảm trên đĩa** | Cao | Thấp | Rủi ro pháp lý về dữ liệu cá nhân (CCCD, Lương) | Mã hóa trong suốt bằng Electron `safeStorage` |
| **Cảnh báo SmartScreen** | Thấp | Rất cao | Giảm sự tin cậy của người dùng khi cài đặt mới | Mua chứng thư và cấu hình ký số NSIS |

---

# PHẦN II: NGUYÊN TẮC BẤT BIẾN KHI NÂNG CẤP

Mọi kỹ sư và AI Agent khi triển khai nâng cấp bắt buộc phải tuân thủ **7 nguyên tắc bất biến**:

1. **Tuyệt đối không thay đổi công thức lương:** Không sửa công thức tính thu nhập, công chuẩn, mức giảm trừ, thuế suất lũy tiến, mức đóng bảo hiểm xã hội, và các quy tắc làm tròn tiền tệ đã quy định trong `engine.js` và `docs/PAYROLL_FORMULAS.md`.
2. **Bảo vệ tuyệt đối dữ liệu kỳ đã chốt:** Không làm mất tính toàn vẹn của các kỳ lương lịch sử đã chốt (`kyluong`). Mọi bản sao lưu `.bak` cũ phải luôn khôi phục được 100%.
3. **Môi trường 100% Offline:** Không bổ sung bất kỳ liên kết CDN, API đám mây, hoặc mã nạp tài nguyên từ xa khi ứng dụng vận hành.
4. **Không nới lỏng cổng Merge-gate CI:** Tuyệt đối không tắt test, không xóa assertion, không nới lỏng cảnh báo eslint để làm CI xanh giả tạo. Test đỏ bắt buộc phải sửa tận gốc mã nguồn.
5. **Giữ chuẩn giao diện tiếng Việt kế toán:** Toàn bộ thông báo, nhãn trường, menu, tài liệu phải viết bằng tiếng Việt chuẩn mực, đúng thuật ngữ nghiệp vụ tiền lương Việt Nam.
6. **Mỗi thay đổi là một nhánh/PR độc lập:** Không gộp việc tái cấu trúc (refactoring) với việc thay đổi tính năng nghiệp vụ trong cùng một lần commit/PR.
7. **Đo đạc số liệu trước và sau:** Bất kỳ nâng cấp hiệu năng nào cũng phải có bằng chứng đo lường benchmark định lượng (RAM, CPU, thời gian ms).

---

# PHẦN III: BỘ PROMPT NÂNG CẤP & SỬA CHỮA ĐẦY ĐỦ (AGENT-READY)

Bạn có thể sao chép nguyên văn từng khung prompt dưới đây để giao nhiệm vụ cho AI Coding Assistant (Antigravity, Claude Code, Cursor) hoặc nhóm phát triển:

---

### 🚀 PROMPT 1: NÂNG CẤP ĐƯỜNG GHI DELTA & TỐI ƯU HÓA SQLITE (ƯU TIÊN 1 - HIỆU NĂNG)

```text
Bạn là Kỹ sư hiệu năng cao cấp làm việc trên repository HAK_LUONG_OFFLINE (nhánh main, v2.0.95).
Mục tiêu: Hiện thực hóa thiết kế Delta Write Path tại docs/WRITE_PATH_DELTA_DESIGN.md, đưa thời gian phản hồi ghi dữ liệu xuống dưới 150 ms và giải phóng áp lực RAM khi làm việc với 5.000 đến 10.000 nhân sự.

Tài liệu cần đọc trước khi viết mã:
- docs/WRITE_PATH_DELTA_DESIGN.md
- docs/WRITE_PATHS_INVENTORY.md
- docs/DATABASE_SCHEMA.md
- LuongHAK_Offline/main/sqlite-storage.js
- LuongHAK_Offline/main/sqlite-store.js
- LuongHAK_Offline/core/repository.js

Nhiệm vụ cụ thể:
1. Cơ chế baseSig (Kiểm soát bản nền):
   - Bổ sung trường chữ ký phiên bản dữ liệu `baseSig` vào mỗi lần giao diện đọc dữ liệu từ kho.
   - Khi lưu qua kênh IPC `store-save`, main process kiểm tra `baseSig`: nếu dữ liệu đĩa đã bị thay đổi bởi tiến trình khác, từ chối ghi và yêu cầu Renderer đồng bộ lại, chống hoàn toàn nguy cơ ghi đè mất dữ liệu.
2. Thiết kế cấu trúc Mutation Payload:
   - Thay vì gửi toàn bộ mảng dữ liệu qua IPC, xây dựng cấu trúc gói thay đổi:
     {
       table: string,
       action: 'insert' | 'update' | 'delete' | 'batch_upsert',
       keys: string[],
       delta: object | object[],
       baseSig: string
     }
   - Cập nhật các hàm `save()`, `txn()`, `saveNow()` trong `core/repository.js` để phát sinh gói delta này.
3. Tối ưu hóa tầng lưu trữ SQLite:
   - Đảm bảo cơ sở dữ liệu luôn chạy ở chế độ WAL (`PRAGMA journal_mode = WAL;`) và `PRAGMA synchronous = NORMAL;`.
   - Chuyển đổi tiến trình Full Backup sang sử dụng cơ chế SQLite Backup API hoặc lệnh `VACUUM INTO` để sao lưu trực tuyến mà không khóa bảng hay cản trở thao tác người dùng.
4. Kiểm thử & Đo đạc bằng chứng:
   - Bổ sung bài kiểm tra tự động `tests/unit/delta-write-path.test.js` kiểm tra đủ 4 thao tác thêm/sửa/xóa/xung đột `baseSig`.
   - Chạy kiểm tra benchmark trước và sau nâng cấp với 5.000 nhân viên tổng hợp, lập bảng so sánh thời gian p50, p95 (mục tiêu: p50 < 150 ms).
```

---

### 📦 PROMPT 2: MODULARIZE FRONTEND SANG ES MODULES VỚI ESBUILD OFFLINE (ƯU TIÊN 2 - KIẾN TRÚC)

```text
Bạn là Kỹ sư kiến trúc Frontend làm việc trên repository HAK_LUONG_OFFLINE (nhánh main, v2.0.95).
Mục tiêu: Xóa bỏ nợ kỹ thuật closure ghép thô, chuyển đổi 31 tệp trong LuongHAK_Offline/app-src/ sang chuẩn ES Modules hiện đại, sử dụng esbuild làm bundler ngoại tuyến (chạy hoàn toàn offline).

Tài liệu cần đọc trước khi viết mã:
- docs/KE_HOACH_TACH_APP_JS.md
- docs/ARCHITECTURE.md §2
- LuongHAK_Offline/scripts/build-app.cjs
- LuongHAK_Offline/ui/workspace-v104.js

Ràng buộc nghiêm ngặt:
- 100% giao diện, phím tắt, vị trí nút bấm và kết quả hiển thị của người dùng không được thay đổi dù chỉ 1 pixel.
- Không sử dụng các framework nặng (như React/Vue/Angular) làm phình to bộ cài; giữ nguyên vanilla DOM components hiệu năng cao.
- Quá trình build hoàn toàn offline, dùng binary của esbuild được cấu hình trong devDependencies.

Nhiệm vụ cụ thể:
1. Thiết kế ranh giới module rõ ràng:
   - Module Trạng thái lõi (`app-src/state/`): Quản lý tập trung `st`, `db`, `session`, phát sự kiện thay đổi trạng thái (Pub/Sub pattern gọn nhẹ).
   - Module Dịch vụ dữ liệu (`app-src/services/`): Đóng gói giao tiếp Repository, IPC client.
   - Module Màn hình (`app-src/screens/`): Mỗi màn hình là một module độc lập export hàm khởi tạo giao diện riêng biệt, chỉ nhận các dependencies qua tham số hoặc import tường minh.
2. Cấu hình esbuild:
   - Viết script `scripts/bundle-renderer.cjs` thay thế `scripts/build-app.cjs`.
   - Cấu hình esbuild với target `chrome120+` (tương ứng Electron 45), bật tree-shaking, tạo sourcemap cục bộ để hỗ trợ debug khi cần thiết.
3. Xác minh tính toàn vẹn:
   - Đảm bảo lệnh `npm run test:ui-dom` (kiểm tra drawer DOM) và bộ test E2E Playwright (`npm run test:e2e`) đạt 100% pass.
   - Kiểm tra giao diện ở 2 độ phân giải chuẩn 1366×768 và 1920×1080 không có hiện tượng vỡ layout hay lỗi console.
```

---

### 🔒 PROMPT 3: BẢO MẬT DỮ LIỆU ĐĨA & CỨNG HÓA ELECTRON (ƯU TIÊN 3 - BẢO MẬT)

```text
Bạn là Chuyên gia an toàn thông tin & Electron làm việc trên repository HAK_LUONG_OFFLINE (nhánh main, v2.0.95).
Mục tiêu: Triển khai mã hóa trong suốt cơ sở dữ liệu trên đĩa nhằm chống lộ dữ liệu tiền lương/nhân thân khi máy tính bị đánh cắp, đồng thời thiết lập quy chuẩn ký số cho bộ cài Windows.

Tài liệu cần đọc trước khi viết mã:
- docs/CRASH_DURABILITY_MATRIX.md
- docs/AUDIT_REPORT.md (Mục RISK-07)
- LuongHAK_Offline/main/backup-crypt.js
- LuongHAK_Offline/main/sqlite-storage.js
- LuongHAK_Offline/package.json (Mục build NSIS)

Nhiệm vụ cụ thể:
1. Mã hóa cơ sở dữ liệu SQLite trong suốt:
   - Nghiên cứu ứng dụng API `safeStorage` của Electron: Sử dụng khóa mã hóa được bảo vệ bởi Windows DPAPI để mã hóa/giải mã các trường thông tin nhạy cảm (hoặc mã hóa toàn bộ trang đĩa SQLite).
   - Thiết lập cơ chế dẫn xuất khóa dự phòng an toàn từ mật khẩu quản trị viên cấp cao (Admin Master Key) để khôi phục dữ liệu khi chuyển sang máy tính khác.
2. Kiểm thử chống hỏng dữ liệu khi sự cố (Crash Durability):
   - Viết kịch bản kiểm thử giả lập ngắt điện / kill -9 tiến trình khi cơ sở dữ liệu đang thực hiện ghi mã hóa.
   - Đảm bảo cơ chế Rollback Journal / WAL tự phục hồi và dữ liệu không bị hỏng hóc hoặc mất mát bản ghi.
3. Quy chuẩn Ký số Ứng dụng (Code Signing):
   - Cập nhật cấu hình `win` trong `package.json` của `LuongHAK_Offline` hỗ trợ ký số thông qua file chứng thư `.pfx` hoặc token phần cứng USB (EV Certificate).
   - Soạn thảo tài liệu hướng dẫn vận hành chi tiết: Các bước nhập chứng thư số, cấu hình biến môi trường `CSC_LINK` và `CSC_KEY_PASSWORD` để triệt tiêu hoàn toàn cảnh báo Windows SmartScreen.
```

---

### 📑 PROMPT 4: QUY TRÌNH PHÊ DUYỆT BẢNG LƯƠNG & QUYẾT TOÁN THUẾ NĂM (ƯU TIÊN 4 - NGHIỆP VỤ)

```text
Bạn là Kỹ sư phần mềm kế toán - nhân sự làm việc trên repository HAK_LUONG_OFFLINE (nhánh main, v2.0.95).
Mục tiêu: Xây dựng quy trình phê duyệt bảng lương 3 bước chuẩn mực kiểm soát nội bộ và mô đun tự động tổng hợp số liệu phục vụ quyết toán thuế TNCN năm.

Tài liệu cần đọc trước khi viết mã:
- docs/BUSINESS_RULES.md
- docs/QUY_TRINH_TINH_LUONG.md
- LuongHAK_Offline/app-src/17-chot-ky.js
- LuongHAK_Offline/app-src/18-bao-cao-luong.js
- LuongHAK_Offline/core/reporting/payroll-reports.js

Nhiệm vụ cụ thể:
1. Quy trình phê duyệt bảng lương nhiều bước (Approval Workflow):
   - Mở rộng trạng thái kỳ lương (`kyluong`):
     `DRAFT` (Tính tạm / Dự thảo) &rarr; `PENDING_REVIEW` (Chờ rà soát) &rarr; `APPROVED` (Đã duyệt) &rarr; `LOCKED` (Đã chốt).
   - Phân quyền chặt chẽ:
     + Kế toán lập bảng lương: Chỉ có quyền chuyển từ `DRAFT` sang `PENDING_REVIEW`.
     + Kế toán trưởng / Người phê duyệt: Kiểm tra số liệu, có nút "Phê duyệt" (chuyển sang `APPROVED`) hoặc "Yêu cầu sửa" (chuyển ngược lại `DRAFT` kèm ghi chú lý do).
     + Chỉ khi bảng lương ở trạng thái `APPROVED`, nút "Chốt kỳ" (`LOCKED`) mới được phép kích hoạt.
   - Ghi lại đầy đủ nhật ký kiểm toán (Audit Trail): Ai duyệt, vào thời điểm nào, nội dung ghi chú.
2. Mô đun Quyết toán Thuế TNCN Năm (Mẫu đối chiếu 05/KK-TNCN):
   - Nâng cấp màn hình `thuenam` thành công cụ quyết toán hoàn chỉnh cho năm tài chính:
     + Tự động cộng dồn thu nhập chịu thuế, tổng các khoản giảm trừ (bản thân + người phụ thuộc), tiền đóng bảo hiểm bắt buộc từ 12 kỳ lương đã chốt trong năm.
     + Tính lại số thuế TNCN phải nộp của cả năm theo biểu thuế lũy tiến từng phần dành cho cá nhân cư trú ký hợp đồng lao động từ 3 tháng trở lên.
     + Đối chiếu với tổng số thuế đã tạm khấu trừ hàng tháng &rarr; Tính ra chính xác số thuế nộp thừa (được hoàn/bù trừ kỳ sau) hoặc số thuế nộp thiếu (phải nộp thêm).
     + Hỗ trợ xuất bảng tính ra Excel chuyên nghiệp tương thích cấu trúc bảng kê 05-1/BK-QTT-TNCN của Tổng cục Thuế.
3. Kiểm thử:
   - Viết các test case trong `tests/unit/payroll-approval-flow.test.js` và `tests/unit/annual-tax-settlement.test.js` bao quát toàn bộ các kịch bản duyệt và quyết toán thuế mẫu.
```

---

### 🖥️ PROMPT 5: DANH MỤC KIỂM THỬ NGHIỆM THU TRÊN PHẦN CỨNG THẬT (WINDOWS & MÁY IN)

```text
Bạn là Kỹ sư đảm bảo chất lượng (QA Lead) chuẩn bị phiên bản phát hành thực tế cho HAK Lương Offline.
Mục tiêu: Thực hiện danh mục kiểm thử thủ công và nghiệm thu trên máy tính Windows thật, máy in văn phòng thật và phần mềm Microsoft Excel thật trước khi bàn giao cho phòng Kế toán.

Danh mục kiểm tra bắt buộc (Checklist):
1. Nghiệm thu bộ cài đặt NSIS trên Windows 10 / Windows 11 thật:
   - Cài đặt mới hoàn toàn trên máy tính trắng: Kiểm tra đường dẫn cài đặt mặc định, desktop shortcut, khởi động ngầm, cấp quyền thư mục `AppData`.
   - Nâng cấp cài đè: Cài phiên bản v2.0.95 đè lên bản cũ v2.0.50 mà không làm mất tệp `data.sqlite` và các cấu hình người dùng.
   - Thử nghiệm gỡ cài đặt (Uninstall): Xác nhận dữ liệu người dùng được giữ lại an toàn trong thư mục dữ liệu, không bị xóa sạch.
2. Nghiệm thu in ấn trên máy in thật (A4 & A3):
   - Kết nối máy in laser (HP / Canon): In thử Bảng lương tổng hợp (khổ A3) &rarr; Kiểm tra việc lặp tiêu đề cột ở trang 2 và không bị tràn lề mất chữ.
   - In thử Phiếu lương chế độ In gọn (khổ A4): Đo kích thước thực tế, xác nhận vừa vặn 2 hoặc 3 phiếu lương trên 1 trang giấy A4 mà không bị nhảy trang mồ côi (`break-inside: avoid`).
   - In thử Báo cáo chấm công và Bảng kê chuyển khoản ngân hàng: Kiểm tra độ sắc nét của đường kẻ bảng và font chữ tiếng Việt không bị lỗi glyph.
3. Nghiệm thu tệp Excel trên Microsoft Excel 2016 / 2019 / 365 thật:
   - Mở toàn bộ các tệp `.xlsx` được xuất bởi `saveXlsx(..., "pro")` và `bh-xlsx`:
     + Xác nhận không xuất hiện hộp thoại cảnh báo "We found a problem with some content...".
     + Kiểm tra tính năng AutoFilter, đóng băng vùng tiêu đề (Freeze Panes `ySplit <= 5`).
     + Kiểm tra định dạng số: Cột Mã NV, STK, CCCD giữ đúng số 0 ở đầu (dạng Text), cột Tiền tệ hiển thị đúng dấu phân cách hàng nghìn.
4. Lập biên bản nghiệm thu:
   - Ghi nhận chi tiết kết quả vào file `docs/BIEN_BAN_NGHIEM_THU_THUC_TE.md` có đầy đủ chữ ký xác nhận của đại diện Kỹ thuật và đại diện Kế toán sử dụng.
```
