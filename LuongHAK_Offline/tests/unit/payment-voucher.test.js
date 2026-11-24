// v2.1.22 (A6-14 / Q10 phần 3/3): PHIẾU CHI tiền mặt in được (mẫu theo Mẫu 02-TT: số, ngày, người nhận, lý do, số tiền, BẰNG CHỮ, chữ ký). Chỉ ĐỌC chứng từ đã lập; không đổi số tiền.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../../ui/payment-voucher.js");

test("U-PCH-01 số tiền bằng chữ (tiếng Việt): các ca đặc biệt linh / mốt / lăm / tư, nghìn-triệu-tỷ", () => {
  const w = (n) => V.words(n);
  assert.equal(w(0), "Không đồng"); assert.equal(w(1000), "Một nghìn đồng"); assert.equal(w(15000), "Mười lăm nghìn đồng"); assert.equal(w(21000), "Hai mươi mốt nghìn đồng");
  assert.equal(w(1250000), "Một triệu hai trăm năm mươi nghìn đồng"); assert.equal(w(5000000), "Năm triệu đồng"); assert.equal(w(105), "Một trăm linh năm đồng");
  assert.equal(w(1005000), "Một triệu không trăm linh năm nghìn đồng"); assert.equal(w(10000000), "Mười triệu đồng"); assert.equal(w(2000000000), "Hai tỷ đồng");
  assert.equal(w(1234567890), "Một tỷ hai trăm ba mươi bốn triệu năm trăm sáu mươi bảy nghìn tám trăm chín mươi đồng");
  assert.equal(w(1000000000000), "Một nghìn tỷ đồng"); assert.equal(w(45), "Bốn mươi lăm đồng"); assert.equal(w(101), "Một trăm linh một đồng");
});
test("U-PCH-02 làm tròn đồng, số âm/không hợp lệ → 'Không đồng' (không bịa số)", () => {
  assert.equal(V.words(1000.4), "Một nghìn đồng"); assert.equal(V.words(1000.6), "Một nghìn không trăm linh một đồng"); assert.equal(V.words(-5), "Không đồng"); assert.equal(V.words("abc"), "Không đồng");
});
const vch = (o) => Object.assign({ so: "TM-2026-10-001", ngay: "2026-11-05", ky: "2026-10", maNV: "NV001", hoTen: "Nguyễn Văn An", soTien: 8950000, lyDo: "Chi lương tháng 10/2026", nguoiLap: "kế toán", nguoiDuyet: "giám đốc", hinhThuc: "Tiền mặt" }, o || {});
test("U-PCH-03 mỗi phiếu một trang A4: số, ngày dd/mm/yyyy, người nhận, lý do, số tiền 8.950.000, BẰNG CHỮ, khối ký 5 chức danh", () => {
  const h = V.html({ congTy: "CTY A", diaChi: "Quảng Ngãi", vouchers: [vch(), vch({ so: "TM-2026-10-002", maNV: "NV002" })] });
  assert.equal((h.match(/<section class="pc">/g) || []).length, 2); assert.match(h, /@page\{size:A4 portrait/);
  ["PHIẾU CHI", "Số: TM-2026-10-001", "05/11/2026", "Nguyễn Văn An", "Mã NV: NV001", "Chi lương tháng 10/2026", "8.950.000", "Tám triệu chín trăm năm mươi nghìn đồng chẵn", "Người lập phiếu", "Kế toán trưởng", "Thủ quỹ", "Giám đốc", "Người nhận tiền", "Ngày …… tháng …… năm ……"].forEach((t) => assert.ok(h.includes(t), "thiếu: " + t));
  assert.equal(/<script/i.test(h), false);
});
test("U-PCH-04 escape chuỗi người dùng; danh sách rỗng hợp lệ; tên tệp", () => {
  const h = V.html({ congTy: "A&B<img onerror=1>", vouchers: [vch({ hoTen: '<script>x</script>', lyDo: "a & b" })] });
  assert.equal(/<script/i.test(h), false); assert.equal(/<img/i.test(h), false); assert.ok(h.includes("a &amp; b"));
  assert.equal((V.html({ vouchers: [] }).match(/<section/g) || []).length, 0); assert.equal(V.filename("2026-10", 3), "PhieuChi_2026-10_3phieu.pdf"); assert.equal(V.filename("2026-10", 1, "TM-2026-10-001"), "PhieuChi_TM-2026-10-001.pdf");
});
test("U-PCH-05 phiếu chưa duyệt/hủy ghi rõ trạng thái; chỉ phiếu Tiền mặt được lọc ra", () => {
  const h = V.html({ vouchers: [vch({ trangThai: "Đã lập" })] }); assert.match(h, /CHƯA DUYỆT/); assert.equal(/CHƯA DUYỆT/.test(V.html({ vouchers: [vch({ trangThai: "Đã duyệt" })] })), false); assert.equal(/CHƯA DUYỆT/.test(V.html({ vouchers: [vch({ trangThai: "Đã thanh toán" })] })), false);
  const sel = V.pick([{ "Hình thức": "Tiền mặt", "Số chứng từ": "A", "Trạng thái": "Đã lập", "Số tiền": 1 }, { "Hình thức": "Chuyển khoản", "Số chứng từ": "B" }, { "Hình thức": "Tiền mặt", "Số chứng từ": "C", "Trạng thái": "Đã hủy", "Số tiền": 2 }]);
  assert.deepEqual(sel.map((x) => x.so), ["A"], "bỏ chuyển khoản và phiếu đã hủy");
});

test("U-PCH-06 màn Sổ chứng từ (tabPayReport) có nút in phiếu chi gọi HAKUI.paymentVoucher; index.html nạp ui/payment-voucher.js", () => {
  const fs = require("node:fs"), path = require("node:path");
  const src = fs.readFileSync(path.join(__dirname, "../../app-src/screens/tabPayReport.js"), "utf8");
  assert.match(src, /type === "SO_CHUNG_TU"\) tools\.appendChild\(btn\("⬇ In phiếu chi tiền mặt \(PDF\)"/); assert.match(src, /HAKUI\.paymentVoucher/); assert.match(fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8"), /ui\/payment-voucher\.js/);
});
