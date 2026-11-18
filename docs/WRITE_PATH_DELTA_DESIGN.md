# Đường ghi dữ liệu: đo đạc, giai đoạn 1 (đã làm), thiết kế delta (giai đoạn 2) và tiêu chí nghiệm thu

Phạm vi: đường lưu `store-save` của HAK Lương Offline (giao diện → tiến trình chính → kho SQLite). Không đổi công thức lương, kỳ đã chốt, hai chế độ sử dụng, quy tắc phân quyền ghi.

## 1. Đường ghi hiện tại (v2.0.32 trở đi)

1. Giao diện `saveNow()` (`app-src/01-luu-tru.js`): `JSON.stringify(db)` toàn bộ rồi `ipcRenderer.sendSync("store-save", text)` — **đồng bộ**: giao diện đứng hình đến khi tiến trình chính trả lời, và dùng kết quả `true` để biết "đã lưu".
2. `main.js` `store-save`: kiểm phiên (`ipc-guard`) → `write-policy.check` (quyền ghi từng bảng, chốt kỳ, nhập liệu, phúc lợi…) → `years.checkWrite` (kho năm) → `storage.save`.
3. `sqlite-storage.save`: so với trạng thái trước theo dòng (`sqlite-changeset`) → ghi MỘT giao dịch SQLite (WAL, `synchronous=FULL`) → đánh dấu xuất `data.json` (≤ 3 giây, khi đóng, trước khi đọc sao lưu).

Số điểm gọi ghi trong giao diện: ~30 `save()`, ~27 `txn([bảng…], fn)`, ~22 `saveNow()` trực tiếp.

## 2. Số đo (5.000 NV, tài liệu 9,5 MB; Linux 4 vCPU, Node 22; sửa 1 ô; trung vị nhiều lần)

| Khâu | Trước giai đoạn 1 | Sau giai đoạn 1 |
|---|---|---|
| Giao diện: `JSON.stringify(db)` | 66–98 ms | 66–98 ms (chưa đổi) |
| Truyền IPC 9,5 MB | chưa đo riêng (chỉ có trên Electron) | không đổi |
| `write-policy.check` | 200–236 ms (≈5 lần phân tích bản cũ + 1 lần bản mới) | 105–111 ms |
| `years.checkWrite` | ≈82 ms (phân tích lại cả bản mới lẫn bản cũ) | ≈42 ms |
| `sqlite.save` (phân tích + so + ghi) | 128–136 ms | 81–85 ms |
| **Tổng tiến trình chính** | **≈420–450 ms** | **≈290 ms** (gồm 1 lần phân tích bản mới ≈47 ms) |

Nguồn thời gian còn lại (giai đoạn 2 nhắm tới): phân tích 9,5 MB bản mới (≈45 ms, bắt buộc khi còn nhận cả văn bản), `snapshot()` băm mọi bảng trong policy (≈60 ms), quét dòng kho năm (≈40 ms), so dòng + ghi SQLite (≈80 ms). Đo lại: `node docs/v2.0.33/chain.cjs 5000 parsed` (kết quả trong `docs/v2.0.33/do-chuoi-ghi.txt`). Lưu ý: chế độ không `parsed` của script vẫn dùng bộ nhớ đệm bản cũ mới, nên con số "cũ" của script (≈407 ms) thấp hơn thực tế v2.0.32 (≈420–450 ms đo trước khi sửa).

## 3. Giai đoạn 1 — ĐÃ LÀM (v2.0.33): phân tích một lần, không đổi quy tắc

- `main.js`: phân tích văn bản mới **một lần** rồi truyền `parsed` cho policy, kho năm và `storage.save(text, parsed)`.
- `write-policy.js`: bản cũ (đang lưu) đọc + phân tích một lần cho mỗi `sig`; xóa bộ nhớ đệm khi `commit()`/`reset()`. Mọi hàm kiểm tra chỉ ĐỌC đối tượng đó — kiểm chứng bằng **deep-freeze**: chạy toàn bộ 1.100+ test với `HAK_POLICY_FREEZE_OLD=1` (đạt) và test `U-WPO-02`.
- `year-archive.js`: bản đang lưu phân tích một lần cho mỗi `sig` của kho.
- `sqlite-storage.js`: `save(text, parsed)` dùng lại bản đã phân tích.
- Giữ nguyên: thứ tự kiểm, nội dung lỗi, kết quả từng bước. Test tương đương `U-WPO-01..05`.

Giới hạn: tiến trình chính vẫn nhận cả văn bản và giao diện vẫn dựng cả văn bản; chưa đạt mục tiêu < 150 ms.

## 4. Vì sao KHÔNG chỉ "gửi delta qua IPC"

Đã tính trước khi làm: `sendSync` chặn giao diện đến khi main trả lời. Nếu giao diện chỉ gửi bảng đổi mà main vẫn phải dựng lại toàn văn rồi chạy đúng chuỗi cũ (policy → năm → kho), thì thời gian chờ **không giảm** (chỉ chuyển 70 ms từ giao diện sang main). Lợi ích thật chỉ có khi **main làm việc theo phần đổi** (policy, kho năm, so dòng) và giữ bản đã phân tích trong bộ nhớ. Vì vậy thiết kế dưới đây đổi cả hai phía.

## 5. Giai đoạn 2 — thiết kế delta cấp bảng (CHƯA làm; cần duyệt trước khi viết mã)

### 5.1 Giao thức
`store-save-delta(baseSig, patch)` với `patch = { tables: {tên: [dòng…]}, top: {khóa: giá trị}, dropTables: [tên], dropTop: [khóa] }`.
- Main so `baseSig` với `storage.sig()`. Khác → trả `{stale:true}`; giao diện **tự gửi bản đầy đủ** (đường hiện tại). Không bao giờ ghi delta lên nền không khớp.
- Main dựng `next` = bản đang lưu (đối tượng đã phân tích, giữ trong bộ nhớ) với các bảng thay thế **nguyên bảng** (delta cấp BẢNG, chưa cấp dòng, để dễ chứng minh tương đương).
- `write-policy.check` nhận `parsed=next` và danh sách `changedTables` (bỏ băm các bảng không đổi bằng so tham chiếu); `years.checkWrite` chỉ quét bảng đổi; `sqlite.save` chỉ so dòng các bảng đổi.
- Kiểm tra liên bảng (`production-carry.validate`, `input-review.validate`) vẫn chạy trên `next` đầy đủ (đối tượng, không phân tích lại).

### 5.2 Giao diện
- Chỉ bảng khai báo qua `txn([bảng…])` hoặc `save(bảng…)` mới được gửi dạng delta. Điểm `save()` không khai báo bảng → gửi đầy đủ (an toàn mặc định). Mở rộng dần từng màn.
- Bộ nhớ đệm "đã xác nhận": chỉ cập nhật sau khi main trả `true`; lỗi/`stale` → dùng đầy đủ.

### 5.3 Bất biến phải giữ
1. Kết quả cuối (JSON xuất, SHA-256) của đường delta = đường đầy đủ cho mọi chuỗi thao tác.
2. Mọi lệnh từ chối của policy giữ nguyên (cùng nội dung lỗi).
3. Không có thao tác ghi nào bị bỏ qua kiểm quyền vì "chỉ là delta".
4. Mất điện/kill giữa chừng: SQLite vẫn một giao dịch; không có trạng thái nửa vời (đã có test kill).
5. Cờ tắt khẩn cấp: `HAK_SAVE=full` ép đường đầy đủ.

### 5.4 Tiêu chí nghiệm thu (tất cả phải đạt trước khi bật mặc định)
- **Tương đương:** test ngẫu nhiên có hạt giống (≥ 2.000 chuỗi sửa/thêm/xóa nhiều bảng, nhiều vai trò) so SHA-256 bản xuất giữa hai đường; 0 khác biệt.
- **Chính sách:** toàn bộ test phân quyền/ghi hiện có chạy trên đường delta; thêm ca "bảng không đổi bị giả mạo trong patch".
- **Hiệu năng (5.000 NV, sửa 1 bảng nhỏ):** giao diện chờ p95 < 150 ms; bảng lớn (`chamcong` 27.602 dòng) p95 < 400 ms; đo trên Electron thật (Windows CI + máy người dùng).
- **Lỗi:** tiêm lỗi đĩa/SQLite giữa chừng (các kịch bản có sẵn), `stale`, bấm đúp, đổi màn nhanh, nhiều cửa sổ; không mất dữ liệu, không báo thành công giả.
- **E2E Electron toàn bộ** (297+) và các kịch bản `sqlite-default`, `year-archive`, `restore-first-run`.
- **Triển khai:** bản thử nghiệm có kiểm soát với cờ MẶC ĐỊNH TẮT; ít nhất một chu kỳ dùng thật trên máy người dùng (cài mới + nâng cấp bằng Setup) trước khi bật mặc định.

### 5.5 Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Bản đã phân tích trong main lệch với đĩa | `sig` + xóa cache khi `commit`/khôi phục/năm; test đột biến |
| Điểm `save()` quên khai báo bảng đổi → mất thay đổi | Mặc định gửi đầy đủ; test tương đương bắt khác biệt; chế độ "shadow" so delta với đầy đủ trong bản thử nghiệm |
| Đột biến đối tượng dùng chung | deep-freeze trong test; tách bản sao ở điểm ghi |
| Chênh quyền do kiểm theo bảng | policy vẫn nhận `next` đầy đủ; chỉ bỏ BĂM bảng không đổi |

### 5.6 Quay lui
Tắt bằng `HAK_SAVE=full` (không cần cài lại). Gỡ hẳn: bỏ IPC mới; dữ liệu/SQLite không đổi định dạng.

## 6. Kiểm chứng giai đoạn 1 (đã chạy)
Unit/integration 1.111 ca đạt (cả khi bật deep-freeze), lint sạch, `build:app --check` khớp, E2E Electron Linux (cờ CI) — xem `docs/releases/v2.0.33.md`. Setup Windows thật: **CHƯA KIỂM**.
