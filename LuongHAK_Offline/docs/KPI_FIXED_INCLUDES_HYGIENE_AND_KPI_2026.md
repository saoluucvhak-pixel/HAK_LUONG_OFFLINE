# HAK KPI BRIDGE — CHỐT PHƯƠNG ÁN: LƯƠNG THÁNG BẢO ĐẢM ĐÃ BAO GỒM KPI
Trạng thái: DỰ THẢO KIỂM THỬ, chưa phải quy chế có hiệu lực. Phương án cũ cộng KPI ngoài mức bảo đảm đã được thay thế.

M = C + V0 + P0 + F0 là phân bổ mục tiêu kỳ chuẩn (các quỹ được phê duyệt theo HĐLĐ/quy chế). B là mức BHXH tham chiếu, **không phải mặc nhiên bằng C**, không dùng B để tự quyết định loại trừ bảo hiểm. M là mức thu nhập cam kết trong phạm vi xác định, trước khấu trừ; phải ghi rõ các khoản nào đã nằm trong M.

D = công hưởng hợp lệ, N = công chuẩn, DV = ngày vệ sinh được hưởng, DP = ngày hưởng KPI, KV = hệ số vệ sinh đã đánh giá A/B/C/D, KP = hệ số KPI được đánh giá độc lập. H = tỷ lệ quyền hưởng bảo đảm được xác nhận từ HĐLĐ/quy định nghỉ phép (KHÔNG từ KV hay KP).

L_C=ROUND(C*MIN(D,N)/N); L_F=ROUND(F0*MIN(D,N)/N);
L_V=ROUND(V0*MIN(DV,N)/N*KV); L_P=ROUND(P0*MIN(DP,N)/N*KP).
FLOOR=ROUND(M*H);
PRE=L_C+L_V+L_P+L_F;
TOPUP=MAX(0,FLOOR-PRE);
TOTAL=PRE+TOPUP=MAX(FLOOR,PRE).

Nếu PRE > FLOOR, cần xác minh căn cứ chi phần vượt, không tự trừ khoản đã phát sinh hoặc mặc nhiên coi là thưởng ngoài M. KPI **chỉ xuất hiện một lần** trong PRE. Khoản ngoài M (OT, nghỉ lễ, khoản bổ sung) phải được tách và chống trùng theo chứng từ.

Không thể suy đồng thời KV và KP từ lương tháng được bảo đảm: sau TOPUP, tổng có thể luôn bằng M. Để suy KV, bắt buộc biết PRE, KP, V0>0 và DV>0:
KV=(PRE-L_C-L_F-P0*rP*KP)/(V0*rV).
Để suy KP, bắt buộc biết PRE, KV, P0>0 và DP>0:
KP=(PRE-L_C-L_F-V0*rV*KV)/(P0*rP).
rV=MIN(DV,N)/N; rP=MIN(DP,N)/N. Các kết quả suy ngược dùng để kiểm toán, **KHÔNG thay cho chấm/duyệt KPI và vệ sinh**.

Ví dụ M=8.000.000, C=6.000.000, V0=1.200.000, P0=800.000, F0=0, N=D=DV=DP=24, KV=0,9, KP=0,75:
PRE=6.000.000+1.080.000+600.000=7.680.000; TOPUP=320.000; TOTAL=8.000.000.

Phương án cộng KPI ngoài mức bảo đảm cùng mã nguồn và tài liệu đã bị xóa khỏi nhánh. Duy nhất phương án FIXED_INCLUDES_KPI được giữ để mô phỏng.
Mô phỏng: core/kpi-included-guarantee.js. Giao diện: menu KPI Bridge. Payroll Engine gốc không thay đổi, các kỳ đã chốt không bị tác động.
