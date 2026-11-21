# Prompt nâng cấp Lương HAK Offline (từ v2.0.95 — Giai đoạn V11 / V2.3)

> **Hướng dẫn sử dụng:** Dán nguyên phần nội dung bên dưới vào phiên làm việc mới của AI Coding Agent (Antigravity, Claude Code, Cursor, v.v.) trên repository `saoluucvhak-pixel/HAK_LUONG_OFFLINE`. File này kế thừa và cập nhật toàn diện từ `PROMPT_NANG_CAP_V2_2.md` sau khi hoàn tất 40 PRs (#138–#177).

---

Bạn là Kỹ sư phần mềm cấp cao làm việc trên repository `HAK_LUONG_OFFLINE`.  
Ứng dụng nằm trong thư mục `LuongHAK_Offline/` (Electron 45.3.2, đóng gói NSIS cho Windows x64, chạy hoàn toàn offline không phụ thuộc internet), hiện ở phiên bản **v2.0.95**.  

Đây là **phần mềm tính lương sản xuất và vận hành thật** của doanh nghiệp: **Sai một đồng trong bảng lương, sai lệch công thức làm tròn, hoặc làm hỏng dữ liệu các kỳ đã chốt là lỗi nghiêm trọng nhất**. Mọi nâng cấp kỹ thuật phải tuân thủ nghiêm ngặt tính toàn vẹn và bất biến của dữ liệu quá khứ.

---

## I. HIỆN TRẠNG HỆ THỐNG ĐÃ KIỂM CHỨNG (v2.0.95)

1. **Kết quả gộp 40 PRs (#138 – #177):**
   - Đợt 1 (Core Fixes): #138 – #142 (`v2.0.58` → `v2.0.62`).
   - Đợt 2 (Data Safety & Backend): #143 – #153 (`v2.0.63` → `v2.0.73`).
   - Đợt 3 (UI Polish & Resilience): #154 – #165 (`v2.0.74` → `v2.0.84`).
   - Đợt 4 (Accounting & Reporting Standards): #166 – #177 (`v2.0.85` → `v2.0.95`).
2. **Cổng kiểm soát chất lượng (Merge-gate 8/8 checks):**
   - CI một luồng duy nhất `.github/workflows/luong-hak-v10-4-setup.yml` (8/8 jobs xanh hoàn toàn).
   - Bộ kiểm thử tự động phong phú: >1.130 unit/integration tests, 297 E2E tests, OCR evaluation đạt 4/4 ca.
   - Các file khóa băm bất biến: `engine.js`, `hr.js`, `core/importer.js`, `core/integrity.js`, `core/production-alloc.js` và `shared-modules.lock.json`.
3. **Lưu trữ & Dữ liệu:**
   - Nguồn dữ liệu chính: SQLite (`data.sqlite` thông qua `node:sqlite`). `data.json` là bản xuất phụ trợ.
   - Đã có snapshot xoay vòng, bọc transaction nguyên tử, kiểm tra khóa ngoại logic, chống ghi lùi dữ liệu kho năm.
4. **Giao diện & Báo cáo:**
   - Mã giao diện renderer được ghép từ 31 tệp `app-src/` thành `app.js` qua script `scripts/build-app.cjs`.
   - Hệ thống báo cáo kế toán HAK đạt chuẩn parity giữa Màn hình = Excel = PDF: phân biệt Bản nháp (`_TAM`) và Bản chốt, chống mồ côi trang, lặp tiêu đề cột (`repeatColumns`), in gọn phiếu lương (`>= 2` phiếu/trang A4).

---

## II. CÁC ĐIỂM HẠN CHẾ & NỢ KỸ THUẬT CẦN NÂNG CẤP

1. **Kiến trúc Monolith Frontend:**
   - `app.js` (ghép từ 31 file `app-src/`) vẫn dùng chung một closure (IIFE) với các biến toàn cục dùng chung (`db`, `st`, `session`, `REPO`). Chưa có module scoping thực thụ; DOM được render thủ công bằng vanilla JS.
2. **Đường ghi toàn phần (Chưa có Delta Write-Path):**
   - Mỗi lần lưu dữ liệu nhỏ, giao diện vẫn gửi lượng lớn dữ liệu sang main process thay vì gửi payload delta (xem thiết kế ở `docs/WRITE_PATH_DELTA_DESIGN.md`).
   - Bộ nhớ RAM (RSS) còn cao khi số lượng nhân sự tăng lên 5.000 – 10.000 người.
3. **Bảo mật dữ liệu trên đĩa:**
   - Tệp cơ sở dữ liệu `data.sqlite` trên đĩa chưa được mã hóa trong suốt (chỉ các file sao lưu `.bak` được mã hóa AES-256).
   - Bộ cài NSIS chưa được ký số điện tử (gây cảnh báo Windows SmartScreen khi cài đặt lần đầu).
4. **Nghiệp vụ HRM & Kiểm soát phê duyệt:**
   - Chưa có quy trình phê duyệt bảng lương chính thức nhiều bước trước khi chốt kỳ (Người lập → Kế toán trưởng → Giám đốc).
   - Chưa có mô đun hỗ trợ tự động quyết toán thuế TNCN năm (bảng tổng hợp 12 tháng đã chốt và xuất mẫu đối chiếu tờ khai 05/KK).

---

## III. NGUYÊN TẮC BẤT BIẾN (RÀNG BUỘC KỸ THUẬT)

1. **Tuyệt đối không đổi công thức tính lương, thuế, bảo hiểm, công chuẩn, và quy tắc làm tròn.** Toàn bộ 100% test hồi quy phải PASS.
2. **Không làm thay đổi cấu trúc dữ liệu của các kỳ đã chốt trong quá khứ.** Các bản sao lưu cũ phải luôn khôi phục được 100%.
3. **Ứng dụng phải hoạt động hoàn toàn Offline:** Không nạp script, font, ảnh từ CDN hay internet khi chạy.
4. **Không nới lỏng hay tắt test trong CI.** Test đỏ bắt buộc phải tìm nguyên nhân và sửa tận gốc.
5. **Giao diện, thông báo lỗi, tài liệu hướng dẫn dùng tiếng Việt chuẩn mực kế toán - nhân sự.**

---

## IV. CÁC PROMPT THỰC THI THEO TỪNG GIAI ĐOẠN

### PROMPT 1: NÂNG CẤP ĐƯỜNG GHI DELTA & TỐI ƯU HÓA SQLITE (HIỆU NĂNG)
```text
Mục tiêu: Triển khai Delta Write Path theo đúng thiết kế tại docs/WRITE_PATH_DELTA_DESIGN.md nhằm giảm thời gian lưu dữ liệu xuống < 150 ms và giảm áp lực RAM cho 5.000 - 10.000 nhân viên.

Yêu cầu thực hiện:
1. Đọc kỹ docs/WRITE_PATH_DELTA_DESIGN.md, docs/WRITE_PATHS_INVENTORY.md và main/sqlite-storage.js.
2. Thiết kế cơ chế baseSig (chữ ký phiên bản dữ liệu nền) trong store-save để chống ghi đè trạng thái giữa các cửa sổ hoặc tiến trình.
3. Thay thế việc serialize toàn bộ bảng bằng các mutation payload có cấu trúc: { table, action: 'insert'|'update'|'delete', keys, delta, baseSig }.
4. Tối ưu hóa SQLite: Sử dụng WAL mode, kết hợp SQLite Backup API cho tiến trình sao lưu trực tiếp không khóa bảng (online backup).
5. Viết bộ kiểm thử unit/benchmark đo thời gian lưu trước và sau khi nâng cấp ở mức 5.000 nhân viên (đảm bảo p50 < 150 ms).
```

### PROMPT 2: MODULARIZE FRONTEND SANG ES MODULES VỚI ESBUILD OFFLINE
```text
Mục tiêu: Chuyển đổi 31 file app-src/ từ closure ghép thô sang các ES Modules độc lập, sử dụng esbuild làm bundler offline không cần internet.

Yêu cầu thực hiện:
1. Đọc docs/KE_HOACH_TACH_APP_JS.md và docs/ARCHITECTURE.md §2.
2. Cấu hình esbuild chạy cục bộ trong devDependencies để đóng gói app-src/ thành bundle phân phối mà không thay đổi bất kỳ hành vi người dùng nào.
3. Tách các module trạng thái (State Store), module dịch vụ dữ liệu (Repository Client) và các màn hình (Screen Components) với export/import rõ ràng.
4. Đảm bảo toàn bộ 100% kiểm thử E2E (Playwright) và DOM check (drawer-dom-check.cjs) xanh hoàn toàn.
5. Đảm bảo kích thước bundle tối ưu, hỗ trợ sourcemap cục bộ để debug offline dễ dàng.
```

### PROMPT 3: BẢO MẬT DỮ LIỆU ĐĨA & CỨNG HÓA ELECTRON
```text
Mục tiêu: Bảo vệ dữ liệu nhạy cảm (Lương, CCCD, Tài khoản ngân hàng) trên đĩa cục bộ và chuẩn hóa quy trình ký số ứng dụng.

Yêu cầu thực hiện:
1. Nghiên cứu giải pháp mã hóa trong suốt: Sử dụng safeStorage API của Electron hoặc mã hóa mức trường/bảng với khóa bảo mật dẫn xuất từ thông tin người dùng và máy chủ cục bộ.
2. Đảm bảo khi mất điện đột ngột hoặc kill process thì cơ sở dữ liệu đã mã hóa không bị corrupt (kiểm tra qua bộ test crash recovery).
3. Cấu hình quy trình ký số (Code Signing) trong build/electron-builder với các hướng dẫn chi tiết về cấu hình chứng thư số EV/OV cho Windows NSIS installer.
```

### PROMPT 4: QUY TRÌNH PHÊ DUYỆT BẢNG LƯƠNG & QUYẾT TOÁN THUẾ NĂM
```text
Mục tiêu: Bổ sung luồng kiểm soát phê duyệt bảng lương trước khi chốt kỳ và mô đun quyết toán thuế TNCN năm.

Yêu cầu thực hiện:
1. Bổ sung trạng thái vòng đời bảng lương: [Dự thảo / Tính tạm] -> [Chờ duyệt] -> [Đã duyệt] -> [Đã chốt].
2. Tách biệt quyền hạn theo vai trò: Kế toán lập bảng lương -> Người phê duyệt (Kế toán trưởng / Giám đốc) xác nhận -> Kế toán thực hiện chốt kỳ. Mọi thao tác phê duyệt/từ chối đều ghi nhật ký kiểm toán (Audit Trail) chi tiết.
3. Xây dựng màn hình Quyết toán Thuế TNCN Năm (nâng cấp từ báo cáo thuenam hiện tại): Tự động cộng dồn thu nhập chịu thuế, các khoản giảm trừ bản thân/người phụ thuộc, thuế đã tạm khấu trừ từ 12 kỳ lương đã chốt; tính toán số thuế thừa/thiếu và xuất mẫu đối chiếu tương thích bảng kê 05/KK-TNCN.
```
