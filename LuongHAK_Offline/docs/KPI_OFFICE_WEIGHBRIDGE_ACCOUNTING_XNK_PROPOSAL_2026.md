# HAK KPI Bridge — ĐỀ XUẤT KPI KHỐI VĂN PHÒNG (DỰ THẢO V2)
**Trạng thái:** DỰ THẢO GÓP Ý, danh mục 107 KPI/26 vai trò đã cập nhật trong core/kpi-catalog.js và KHÔNG kích hoạt ghi sang bảng lương. Tương thích phương án lương tháng cố định ĐÃ BAO GỒM KPI (KPI_FIXED_INCLUDES_HYGIENE_AND_KPI_2026.md).

## Nguyên tắc
Mức thu nhập tháng được bảo đảm G = lương thời gian theo HĐLĐ C + quỹ KPI tháng P + khoản vệ sinh được duyệt V + các khoản khác thuộc G là F tại mốc chuẩn. G không tự bằng mức đóng BHXH. Nhóm văn phòng chỉ có V khi được giao nhiệm vụ vệ sinh/bảo dưỡng thực tế và được duyệt, không tự cấp V theo chức danh. Kết quả KPI tháng được tính riêng, phần thiếu so với G được thể hiện tại dòng “Bù bảo đảm thu nhập”, không tự cấn trừ tăng ca hoặc làm giảm G. Nhân viên được đánh giá theo việc trong phạm vi kiểm soát, không theo doanh thu hay sản lượng không được giao.

## Phương pháp chấm dùng chung
- Mỗi chức danh: 4 chỉ tiêu; tổng trọng số 100%. Từng chỉ tiêu cần định nghĩa tử số/mẫu số, thời hạn (SLA), bảng chứng từ nguồn, người có trách nhiệm, điều kiện miễn trừ.
- Với tỷ lệ thực hiện R_i và mục tiêu T_i cùng đơn vị: Điểm_i = MIN(120, MAX(0,100*R_i/T_i)); KPI_score = SUM(weight_i*Điểm_i)/100. Điểm i chỉ tính khi mẫu số > 0 và có bằng chứng, xác nhận trách nhiệm; chưa đánh giá = CHỜ DUYỆT, không mặc định 100 hay 0.
- Chỉ tiêu không phát sinh (ví dụ 0 lô hàng xuất): N/A có lý do và cấp có thẩm quyền duyệt; trọng số được phân bổ lại theo bản cấu hình/phiên bản đã duyệt trước khi tính. Cần tránh nhân viên đạt mức tối đa chỉ vì khối lượng ít và mẫu số quá nhỏ: nêu số hồ sơ và độ tin cậy.
- K KPI theo các ngưỡng của quy chế hiện hành nếu được phê duyệt. K chỉ tác động nội bộ vào phần quỹ KPI P, không giảm mức bảo đảm G. Mức KPI chấm thấp sẽ làm tăng dòng bù bảo đảm tương ứng, không phải khấu trừ người lao động.

## 1. Trạm cân — TRAM_CAN (giữ trọng số danh mục gốc)
| Chỉ tiêu | W | Mục tiêu | Tử số / mẫu số | Nguồn |
|---|---:|---:|---|---|
| Phiếu cân chính xác và đầy đủ | 35 | >=99,5% | Phiếu hợp lệ không lỗi nhập thuộc trách nhiệm / phiếu cần xử lý | PhieuCan, PhieuCan_DN, So_CT, nhật ký sửa |
| Hoàn tất đúng SLA/ca | 30 | >=98% | Phiếu hoàn tất đúng hạn / phiếu đến hạn có đủ đầu vào | Thời gian cân 1/2, log phiếu |
| Đối chiếu số phiếu/khối lượng | 20 | >=99% | Phiếu đối chiếu khớp đã xác nhận / phiếu được đối chiếu | PhieuCan, DNTT_CT, đối chiếu nguồn |
| Truy vết chỉnh sửa và bàn giao | 15 | 100% | Đợt kiểm nhật ký và bàn giao đủ chứng từ / đợt được kiểm tra | Audit logs, biên bản ca |
Ngoại lệ hợp lệ: cân hỏng, lỗi kết nối, mất điện, đầu vào không hợp lệ từ bộ phận khác (có ticket). Lỗi trùng So_CT, sửa không để lại log là sự kiện kiểm soát nghiêm trọng, yêu cầu rà soát; không tự trừ lương bảo đảm.

## 2. Kế toán — KT (giữ trọng số gốc)
| Chỉ tiêu | W | Mục tiêu | Tử số / mẫu số | Nguồn |
|---|---:|---:|---|---|
| Hạch toán chứng từ đúng hạn | 35 | >=98% | Chứng từ đủ điều kiện ghi sổ đúng hạn / chứng từ đến hạn | MISA/sổ chứng từ, timestamp |
| Đối chiếu sổ và chứng từ chính xác | 30 | >=99% | Mục đối chiếu khớp hoặc được giải trình đúng / mục đối chiếu đến hạn | Sổ cái, ngân hàng, kho, công nợ |
| Hoàn thành việc đóng kỳ được phân công | 20 | 100% | Mốc đóng kỳ hoàn thành đúng hạn / mốc được giao | Lịch khóa sổ/biên bản |
| Hồ sơ truy vết được | 15 | >=98% | Bộ hồ sơ đầy đủ dấu vết / bộ hồ sơ kiểm | Hóa đơn, đề nghị, chứng từ, log |
Kế toán thanh toán: kiểm tra dữ liệu DNTT/112, sai lệch người hưởng/số TK. Kế toán kho: MT/BDMT, mượn, trả, điều chuyển. Kế toán thuế: hóa đơn/GTGT. Kế toán tổng hợp: đối chiếu sổ cái, chốt kỳ. Mỗi nhân viên được giao chức trách cụ thể, không chấm chỉ tiêu ngoài phạm vi.

## 3. Kế toán trưởng — KTT
| Chỉ tiêu | W | Mục tiêu | Nguồn |
|---|---:|---:|---|
| Báo cáo đúng hạn | 30 | 100% | BCTC, báo cáo quản trị, lịch duyệt |
| Đối chiếu và phát hiện sai lệch trọng yếu | 30 | >=99% | Sổ cái, biên bản đối chiếu, audit |
| Tuân thủ thuế, BHXH và thời hạn | 25 | 100% | Tờ khai, bảng lương, hồ sơ thuế/BH |
| Xử lý tồn đọng thuộc phạm vi quản lý | 15 | >=95% | Ticket, phân công, biên bản |
Không quy lỗi lịch nộp bị chậm do lãnh đạo chưa ký/đơn vị ngoài chưa cung cấp tài liệu nếu có biên bản xử lý và cảnh báo đúng thời hạn.

## 4. Xuất nhập khẩu — XNK (giữ trọng số gốc)
| Chỉ tiêu | W | Mục tiêu | Tử số / mẫu số | Nguồn |
|---|---:|---:|---|---|
| Chứng từ XNK đúng hạn | 35 | >=98% | Bộ hồ sơ hoàn tất trong SLA / bộ đến hạn đủ dữ liệu | Hợp đồng, Invoice, Packing List, B/L |
| Hồ sơ đúng ngay lần đầu | 30 | >=98% | Bộ hồ sơ không bị yêu cầu sửa do lỗi chủ quan / bộ hồ sơ đã kiểm | Tờ khai, chứng từ, hồ sơ hải quan |
| Phối hợp tiến độ giao hàng | 20 | >=95% | Mốc giao hàng thuộc trách nhiệm thực hiện đúng hạn / mốc được giao | Booking, kế hoạch xuất hàng, chứng từ tàu |
| Theo dõi thanh toán/quyết toán | 15 | >=98% | Mốc thanh toán, hồ sơ ngân hàng được xử lý đúng hạn / mốc đến hạn | L/C, ngân hàng, sổ theo dõi |
Hãng tàu đổi lịch, khách hàng chậm xác nhận, hải quan kiểm hóa ngoài thời gian kiểm soát: mở exception có thời gian, bằng chứng, người duyệt; không tự chấm đạt.

## 5. Các chức danh văn phòng bổ sung
- **NHAN_SU**: chấm công đúng hạn 30%, hồ sơ nhân sự 30%, đối chiếu bảng lương chính xác 25%, xử lý yêu cầu đúng SLA 15%.
- **HANH_CHINH**: đầu việc đúng hạn 30%, hồ sơ hợp lệ 30%, dịch vụ nội bộ 25%, quản lý tài sản 15%.
- **VAT_TU**: cấp vật tư đúng hạn 35%, chứng từ đặt hàng đúng 25%, đối chiếu chi phí/phê duyệt 25%, giao nhận 15%.
- **IT**: hỗ trợ đúng SLA 30%, sao lưu/khôi phục đã kiểm chứng 30%, triển khai ổn định 25%, tài liệu hóa 15%.
- **KINH_DOANH**: hiệu quả hợp đồng được giao 40%, hợp đồng đúng 25%, công nợ trong phạm vi trách nhiệm 20%, báo cáo 15%.
- **THU_KHO**: KPI nghiệp vụ nhập xuất/kiểm kê/mượn trả theo danh mục riêng. Tiền vệ sinh kho theo mã TK_VS_KHO, xếp A/B/C/D theo ngày, **không chấm nội dung vệ sinh thêm lần nữa trong KPI**.
- **KCS**: đúng hạn 25%, khả năng truy vết và kiểm soát chất lượng độ ẩm 40%, xử lý sai lệch 20%, tuân thủ lấy mẫu 15%.
- **QUAN_DOC**: sản lượng/kế hoạch, chất lượng, bàn giao máy móc, an toàn theo dữ liệu đã nghiệm thu; không gán trách nhiệm doanh thu.
- **GD**: KPI QUÝ/NĂM, không nhân hệ số vào tiền lương tháng khi chưa có quyết định thưởng kỳ riêng.

## Dữ liệu để tích hợp trên HAK_LUONG_OFFLINE
Dữ liệu tổng hợp theo EmployeeID, CompanyID, Period, RoleID, IndicatorID, PolicyVersion; có target, actual, numerator, denominator, source record IDs, exception, reviewer, approvedAt, status. Tự tổng hợp từ phiếu cân/sổ kế toán/chứng từ XNK được nhập và đã kiểm chứng, không tin dữ liệu nhập tự khai để thanh toán. Chấm đúng nghiệp vụ theo hợp đồng và kỳ hiệu lực; hồ sơ tháng đã khóa chỉ đọc.

## Việc cần làm trước khi triển khai
1. HR/Kế toán trưởng xác nhận chỉ tiêu và SLA thực tế theo vai trò chuyên trách; đừng áp cứng 98%/99% trước khi so sánh 2–3 kỳ dữ liệu gốc.
2. Chốt chính thức quỹ KPI nội bộ P (đã nằm trong M); không cộng P ngoài M lần nữa.
3. Duyệt quy trình N/A, trường hợp ngoài quyền kiểm soát, phân công duyệt và snapshot theo kỳ.
4. Kiểm thử với dữ liệu thật; đối chiếu tổng thu nhập trước/sau bù và quyền lợi BHXH/OT, rồi mới bật quy chế có hiệu lực.

**Lưu ý:** Tài liệu này là đề xuất V2; mã nguồn catalog 104 KPI gốc chưa bị sửa. Chỉ có hiệu lực khi ban hành/duyệt phiên bản.
