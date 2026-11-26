// v2.1.18 (A6-12, chủ chọn "làm luôn" 24/11/2026): phiếu lương PDF từng người — mỗi người một trang A4 dọc, có khối ký, kỳ chưa chốt ghi TẠM TÍNH, mọi chuỗi được escape.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../ui/slip-pdf.js");
const mkLines = (tl) => [{ sec: "I. THU NHẬP" }, { label: "Lương thời gian", value: 10000000 }, { label: "Tổng thu nhập", value: 10000000, tot: true }, { sec: "II. KHẤU TRỪ" }, { label: "Bảo hiểm", value: 1050000 }, { label: "Cộng khấu trừ", value: 1050000, tot: true }, { sec: "III. TẠM ỨNG" }, { label: "Cộng tạm ứng", value: 0, tot: true }, { label: "THỰC LĨNH (I − II − III)", value: tl, tot: true, grand: true }];
const vm = (chot, n) => ({ congTy: "CÔNG TY A & B", ky: "10/2026", chot, nguoiLap: "kế toán", slips: Array.from({ length: n }, (_, i) => ({ maNV: "NV00" + i, hoTen: "Nguyễn Văn " + i, phongBan: "Tổ 1", tongCong: 26, congChuan: 26, lines: mkLines(8950000) })) });

test("U-SPF-01 mỗi người đúng một <section class=slip> = một trang; trang cuối không ngắt trang thừa; A4 dọc", () => {
  const h = S.html(vm(true, 3)); assert.equal((h.match(/<section class="slip">/g) || []).length, 3);
  assert.match(h, /@page\{size:A4 portrait/); assert.match(h, /\.slip:last-child\{page-break-after:auto/); assert.equal(/<script/i.test(h), false);
});
test("U-SPF-02 nội dung phiếu: tên, mã NV, phòng ban, 3 phần, thực lĩnh định dạng 8.950.000, khối ký có 'Người lao động nhận' + dòng Ngày…tháng…năm…", () => {
  const h = S.html(vm(true, 1));
  ["PHIẾU LƯƠNG THÁNG 10/2026", "Nguyễn Văn 0", "Mã NV: NV000", "Phòng ban: Tổ 1", "I. THU NHẬP", "II. KHẤU TRỪ", "III. TẠM ỨNG", "8.950.000", "Người lao động nhận", "Người lập", "Ngày …… tháng …… năm ……", "Bảng lương đã chốt"].forEach((t) => assert.ok(h.includes(t), "thiếu: " + t));
  assert.equal(h.includes("TẠM TÍNH"), false, "kỳ đã chốt: không có nhãn tạm tính");
});
test("U-SPF-03 kỳ CHƯA chốt: banner + nền chữ TẠM TÍNH trên MỌI trang", () => {
  const h = S.html(vm(false, 2)); assert.equal((h.match(/class="wm">TẠM TÍNH/g) || []).length, 2); assert.equal((h.match(/BẢN TẠM TÍNH — kỳ lương CHƯA chốt/g) || []).length, 2); assert.ok(!h.includes("Bảng lương đã chốt"));
});
test("U-SPF-04 escape: tên có <script>, &, dấu nháy không phá HTML (an toàn cho PDF service chặn <script>)", () => {
  const v = vm(true, 1); v.slips[0].hoTen = '<script>alert(1)</script> & "x"'; v.congTy = "A<img onerror=1>";
  const h = S.html(v); assert.equal(/<script/i.test(h), false); assert.ok(h.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;")); assert.equal(/<img/i.test(h), false);
});
test("U-SPF-05 tiền âm và làm tròn; tên tệp: kỳ yyyy-mm, hậu tố, _TAM khi chưa chốt", () => {
  assert.equal(S.money(-1234567.4), "-1.234.567"); assert.equal(S.money(0), "0"); assert.equal(S.money("abc"), "0");
  assert.equal(S.filename("10/2026", { chot: true }), "PhieuLuong_TungNguoi_2026-10.pdf"); assert.equal(S.filename("10/2026", { chot: false, suffix: "NV001" }), "PhieuLuong_TungNguoi_2026-10_NV001_TAM.pdf");
});
test("U-SPF-06 danh sách rỗng vẫn trả HTML hợp lệ (không có trang)", () => { const h = S.html({ ky: "10/2026", chot: true, slips: [] }); assert.equal((h.match(/<section/g) || []).length, 0); assert.ok(h.endsWith("</body></html>")); });

test("Phiếu dài có tiêu đề lặp và nhóm Thực lĩnh cùng phần ký", () => {
  const h = S.html(vm(false, 1));
  assert.match(h, /<thead>[\s\S]*PHIẾU LƯƠNG THÁNG 10\/2026[\s\S]*Mã NV: NV000[\s\S]*<\/thead>/);
  assert.match(h, /<tbody class="settlement">[\s\S]*THỰC LĨNH[\s\S]*Người lao động nhận[\s\S]*<\/tbody>/);
});
