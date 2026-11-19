# Truy vết quy tắc Hiệu lực / Nghiệp vụ / Chốt → test tự động

CEO_LUONG (thay thế) rà 20/11/2026 (v2.0.54) theo `docs/BUSINESS_RULES.md`. "Test" = tệp trong `LuongHAK_Offline/tests/`. Không đổi công thức nào. Chưa nghiệm thu trên Windows thật.

## Hiệu lực
| Quy tắc | Nội dung tóm tắt | Test |
|---|---|---|
| R-10 | Lương theo phụ lục mới nhất có hiệu lực ≤ cuối tháng | `unit/rules-effective-close` R-10; `integration/payroll-scenarios` I-20 |
| R-11 | HĐ chấm dứt trước đầu tháng → không tính | `unit/rules-effective-close` R-11; `payroll-scenarios` I-17 (tháng sau nghỉ) |
| R-12 | "Đã nghỉ việc" mà HĐ chưa chấm dứt → vẫn tính + cảnh báo | `unit/rules-effective-close` R-12 |
| R-13 | Người phụ thuộc còn hiệu lực trong kỳ | `unit/v92-dependents-taxcfg`, `integration/flows` |
| R-56 (Q-22) | Phụ lục giữa tháng: cả tháng / từ ngày hiệu lực | `unit/phuluc-q22`, `payroll-scenarios` I-20 |
| R-61 / R-62 | Biến động = phụ lục mới; hồ sơ lưu theo hiệu lực | `unit/bien-dong`, `integration/flows`, `unit/import-multi-period-hr` |
| R-63 | Có công sau ngày chấm dứt → cảnh báo, số tiền không đổi | `payroll-scenarios` I-23 |
| R-49 (Q-15) | Phụ lục đã dùng cho kỳ chốt bị khóa với mọi người | `unit/guard-schema`, `integration/flows-v2` (frozen) |
| Q-14 | Hồi tố kỳ đã chốt chỉ Admin; nhật ký ghi hồi tố | `unit/import-multi-period-hr` (nhập Excel, sửa v2.0.54), `integration/flows-v2` (sửa tay) |

## Nghiệp vụ
| Quy tắc | Test |
|---|---|
| R-53 chia chi phí theo công khi điều chuyển | `unit/bien-dong`, `unit/allocation` |
| R-57 / R-60 BH ít công, tháng nghỉ việc | `payroll-scenarios` I-16, I-21, I-22; `unit/insurance-total` |
| R-66 / R-73 phân bổ khối lượng | `unit/production-alloc`, `unit/daihiep-bacthang` |
| R-70 thuế TNCN theo mã trên phụ lục | `payroll-scenarios` I-15; `unit/v92-dependents-taxcfg` |
| R-71 sản lượng làm tròn 1 lần | `unit/quy-che-2026` |
| R-72 nghỉ không lương | `unit/leave-check`, `unit/so-lao-dong` |
| R-54 số chứng từ chống trùng | `unit/import-multi-period` (psluong/ungluong) |

## Chốt / thanh toán
| Quy tắc | Test |
|---|---|
| R-20 chốt tính lại từ dữ liệu mới nhất | `unit/v92-write-policy` |
| R-21 chốt chỉ thành công khi đã ghi đĩa | `integration/flows-v2`, `unit/core` |
| R-22 kỳ chốt khóa 6 bảng nhập liệu | `unit/import-multi-period` (36 ca), E2E nhập nhiều kỳ |
| R-23 / R-28 snapshot + checksum | `unit/guard-schema`, `unit/audit-regressions`, `unit/sqlite-durability` |
| R-24 mở chốt có lý do, lịch sử, chốt lại | `integration/flows`, `integration/flows-v2`, `unit/year-archive`; khôi phục kỳ cảnh báo chốt lại: `unit/period-restore*` |
| R-27 không đổi Mã NV đã chốt — **chặn ở tầng nghiệp vụ từ v2.0.54** (trước chỉ ở giao diện) | `unit/rules-effective-close` R-27, R-27b |
| R-47 xóa NV đã chốt chỉ Admin, nhật ký | `unit/rules-effective-close` R-47 |

**Lỗi thật tìm được:** (1) R-27 chỉ được chặn ở màn Sửa thông tin cơ bản; `REPO.plan("update","nhanvien")` cho Admin đổi Mã NV đã có trong bảng lương chốt (trái R-44 "quyền kiểm ở tầng nghiệp vụ") — đã sửa. (2) Nhật ký nhập Excel thiếu dấu hồi tố — đã sửa (xem `IMPORT_MULTI_PERIOD_MATRIX.md`).
