# V10.1 — Checklist phát hành và mức nghiệm thu

## Trạng thái nghiệm thu (theo mức)

| Mức | Trạng thái | Căn cứ |
| --- | --- | --- |
| `CODE_DONE` | **Đạt cho phạm vi đã làm** (Phase 1–5) | `V10_1_AUDIT.md` |
| `TEST_DONE` | **Đạt cục bộ** | 558 unit/integration/regression, E2E 220/220, 0 lint, 0 lỗi JS ở 90 lượt duyệt màn hình |
| `CI_PASS` | **Chờ** — cập nhật theo run của đúng HEAD của PR | tab Checks của PR |
| `WINDOWS_BUILD_PASS` | **Chờ** — job Windows trong `build-exe.yml` | Artifacts của run |
| `WINDOWS_UAT_PASS` | **Chưa thực hiện** | `V10_1_WINDOWS_UAT.md` |
| `BUSINESS_RECONCILED` | **Một phần** (HAK ĐN 2 kỳ 2025, A=0, B/C/E chờ quyết định); các công ty/kỳ khác `BLOCKED_SOURCE_DATA` | `V10_1_PAYROLL_RECONCILIATION.md` |
| `RELEASE_READY` | **KHÔNG** | còn các điều kiện bên dưới |

## Điều kiện chưa đạt (chặn `RELEASE_READY`)

- [ ] CI xanh trên HEAD mới nhất + bộ cài Windows dựng được.
- [ ] Windows UAT 12 kịch bản.
- [ ] Quyết định quản lý cho nhóm B/C/E trong đối chiếu; workbook các công ty/kỳ còn lại.
- [ ] Quyền **đọc** theo vai trò tại Main (DESIGN_GAP).
- [ ] Mã hóa dữ liệu trên đĩa (hoặc chấp nhận rủi ro bằng văn bản cho máy tin cậy).
- [ ] Mẫu in riêng cho báo cáo nhân sự/sản lượng/bơm dăm/thưởng/tạm ứng/suất cơm; thử in thật.
- [ ] Vai trò "chỉ xem phiếu lương cá nhân".
- [ ] Visual regression có ảnh chuẩn; đo "độ trễ tương tác" và thời gian lọc.

## Đã đạt theo tiêu chí Phần XX (tóm tắt)
Lỗi P0 đã sửa có test ✔ · Tạo nhân viên lưu đủ dữ liệu và không nửa chừng ✔ · Main bảo vệ **ghi** ✔ (đọc ✘) · Khôi phục Admin xác thực ✔ · Duyệt nhân sự nguyên tử ✔ · Không vượt gate xuất ✔ · Không bỏ qua lỗi phân bổ sản lượng ✔ · Chi tiết thanh toán đủ NV, đủ cột ✔ · Thanh 7 bước thật ✔ · Chỉ hai phương pháp bù ở bản chốt ✔ · Công thức không đổi ✔ · Master–detail chứng từ ✔ · Ngày dd/MM/yyyy ở tạo nhân viên và xuất ✔ · Excel/PDF bảng rộng ✔ · Benchmark ✔ · Tài liệu + PR ✔.

## Quy tắc
Không tự merge. Không sửa `main`. PR ở trạng thái DRAFT. Nhánh chồng trên PR #30 (`feature/luong-hak-v10-business-ux-redesign`).
