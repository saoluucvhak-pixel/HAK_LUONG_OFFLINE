# PHỤ LỤC ĐỀ XUẤT — BẢO ĐẢM THU NHẬP THÁNG VÀ THƯỞNG KPI ĐỘC LẬP

**Dự thảo thử nghiệm. Không thay đổi bảng lương thực tế, hợp đồng lao động, căn cứ BHXH hoặc kỳ đã khóa.**

## Nguyên tắc ưu tiên
1. Thu nhập tháng bảo đảm G là quyền lợi theo hợp đồng/quy chế đã được xác nhận; **không phải mặc nhiên bằng mức đóng BHXH B**.
2. G là **mức sàn thu nhập trước các khoản khấu trừ hợp lệ** cho **đúng phạm vi công và quyền hưởng**. Nghỉ không lương, hợp đồng thay đổi giữa tháng hoặc tình huống đặc thù phải có tỷ lệ quyền hưởng H có căn cứ, không suy từ KPI hoặc hệ số vệ sinh.
3. Tách tiền vệ sinh, bảo dưỡng đã được xác nhận theo mức A/B/C/D và ngày đủ điều kiện. Khoản này chỉ giảm vì nhiệm vụ thực tế chưa đạt; nhưng phần bảo đảm G không được giảm do nó. Những khoản đã cam kết cố định vẫn phải được bảo đảm.
4. KPI là **khoản thưởng ngoài G** nếu chính sách đã quy định như vậy. Không lấy hiệu suất giảm để thu hồi hoặc bù trừ quyền hưởng G.
5. Các khoản ngoài phạm vi bảo đảm (tăng ca/lễ/ca đêm, tiền hỗ trợ riêng, thưởng khác) đối chiếu độc lập và không sử dụng để triệt tiêu phần bù G nếu hợp đồng không cho phép.
6. Không sử dụng tên "tiền vệ sinh", "bù bảo đảm" để tự loại nghĩa vụ BHXH. Phải rà soát bản chất thỏa thuận và pháp luật hiện hành.

## Biến
- G: thu nhập tháng được bảo đảm theo chính sách (cố định trong kỳ hiệu lực).
- C: lương thời gian tháng theo hợp đồng (khác B là mức BHXH tham chiếu).
- D: ngày công hưởng lương hợp lệ, N: công chuẩn; H: tỷ lệ quyền hưởng G theo hợp đồng/quy chế (0..1).
- V: tiền vệ sinh/bảo dưỡng đã tính theo A/B/C/D, đã chấm và được xác nhận.
- F: khoản cố định khác **được xác định là nằm trong G**, F được tính theo công chuẩn.
- P: quỹ KPI mục tiêu **ngoài G**; Q: hệ số KPI theo chấm duyệt; D_KPI: ngày công đủ điều kiện KPI.

## Thuật toán
`FLOOR = ROUND(G*H)`
`TG = ROUND(C*MIN(D,N)/N)`
`OTHER_IN_FLOOR = ROUND(F*MIN(D,N)/N)`
`PROTECTED_COMPONENTS = TG + V + OTHER_IN_FLOOR`
`TOPUP = MAX(0,FLOOR - PROTECTED_COMPONENTS)`
`PROTECTED_TOTAL = PROTECTED_COMPONENTS + TOPUP = MAX(FLOOR, PROTECTED_COMPONENTS)`
`KPI_PREVIEW = ROUND(P*MIN(D_KPI,N)/N*Q)`
`TOTAL_PREVIEW = PROTECTED_TOTAL + KPI_PREVIEW` (chưa gồm các khoản ngoài bảo đảm và khấu trừ).

Khi Q=0 hoặc K vệ sinh giảm, **PROTECTED_TOTAL không nhỏ hơn FLOOR**. Nếu PROTECTED_COMPONENTS cao hơn FLOOR thì không thu hồi phần cao hơn. Không tự động suy hệ số V hoặc Q từ TOPUP. KPI chưa được duyệt chỉ là số giả định để thử, giá trị trả thực tế phải qua phê duyệt.

Ví dụ G=8 triệu, C=6 triệu, V=1,05 triệu, F=0,5 triệu, D=N=24, H=1, P=1,2 triệu, Q=0,95: TOPUP=450 nghìn, PROTECTED_TOTAL=8 triệu, KPI_PREVIEW=1,14 triệu, TOTAL_PREVIEW=9,14 triệu.

## Quản lý bảng lương
- Chấm công và các loại công ngoài chuẩn phải theo quy trình Payroll Engine gốc, không tính tiền vượt chuẩn hai lần.
- Biến G là **điều khoản đã cam kết**, không tính ngược từ lương đóng BHXH và không dùng tiền vệ sinh để thay đổi căn cứ đóng.
- Mô phỏng nằm trong `core/kpi-guarantee.js` và màn hình KPI Bridge. Chưa ghi vào payroll; cần bổ sung xác nhận quy chế, phân loại cấu phần, nhân sự duyệt và kiểm thử E2E thực tế trước khi dùng sản xuất.
