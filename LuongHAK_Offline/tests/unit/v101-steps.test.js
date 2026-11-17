// V10.1 — trạng thái THẬT của 7 bước tính lương (core/payroll-steps.js)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../core/payroll-steps.js");
const st = (i) => S.compute(i).map((x) => x.trangThai);

test("U-V101-STEP-01 chưa tính: bước 2 'đang', các bước sau 'chưa'; luôn đủ 7 bước", () => {
  const r = S.compute({ chot: false, daTinh: false, loiDauVao: 0, loiChan: 0 });
  assert.equal(r.length, 7); assert.deepEqual(st({ chot: false, daTinh: false, loiDauVao: 0, loiChan: 0 }), ["xong", "dang", "dang", "chua", "chua", "chua", "chua"]);
});
test("U-V101-STEP-02 lỗi dữ liệu nghiêm trọng → bước 2 BỊ CHẶN, chưa cho coi là xong; không thể chốt", () => {
  const x = st({ chot: false, daTinh: false, loiDauVao: 3, loiChan: 0 });
  assert.equal(x[1], "chan"); assert.equal(x[2], "chua"); assert.equal(x[4], "chua");
});
test("U-V101-STEP-03 đã tính nhưng còn lỗi chặn → bước 4 'chan', chốt 'chua'; hết lỗi → bước 4 'dang', chốt 'dang'", () => {
  let x = st({ chot: false, daTinh: true, loiDauVao: 0, loiChan: 2 }); assert.equal(x[3], "chan"); assert.equal(x[4], "chua");
  x = st({ chot: false, daTinh: true, loiDauVao: 0, loiChan: 0 }); assert.equal(x[3], "dang"); assert.equal(x[4], "dang");
});
test("U-V101-STEP-04 đã chốt: bước 1-5 xong; thanh toán 'dang' đến khi mọi người trả đủ rồi mới 'xong'", () => {
  let x = st({ chot: true, thanhToan: { soNV: 10, soCT: 0, nguoiDaTraDu: 0 } }); assert.deepEqual(x.slice(0, 5), ["xong", "xong", "xong", "xong", "xong"]); assert.equal(x[5], "dang");
  x = st({ chot: true, thanhToan: { soNV: 10, soCT: 2, nguoiDaTraDu: 9 } }); assert.equal(x[5], "dang");
  x = st({ chot: true, thanhToan: { soNV: 10, soCT: 3, nguoiDaTraDu: 10 } }); assert.equal(x[5], "xong");
  x = st({ chot: true, thanhToan: { soNV: 0, soCT: 0, nguoiDaTraDu: 0 } }); assert.equal(x[5], "dang", "0 nhân viên không được coi là đã thanh toán xong");
});
test("U-V101-STEP-05 chế độ phân quyền: thanh bước nói rõ cần duyệt trước khi chốt, không đổi trạng thái các bước", () => {
  const base = { chot: false, daTinh: true, loiDauVao: 0, loiChan: 0 }, plain = S.compute(base);
  assert.match(plain[3].ly, /có thể chốt/); assert.equal(plain[4].ly, "", "không bật chế độ phân quyền: giữ nguyên lời cũ");
  for (const duyet of ["chua_gui", "cho_duyet", "het_hieu_luc", "da_duyet"]) {
    const r = S.compute({ ...base, duyet });
    assert.deepEqual(r.map((x) => x.trangThai), plain.map((x) => x.trangThai), "trạng thái không đổi: " + duyet);
    assert.ok(r[3].ly.includes(S.DUYET[duyet]) && r[4].ly === S.DUYET[duyet], duyet);
  }
  assert.doesNotMatch(S.compute({ ...base, duyet: "cho_duyet" })[3].ly, /có thể chốt/);
  assert.equal(S.compute({ ...base, loiChan: 2, duyet: "cho_duyet" })[4].ly, "", "còn lỗi chặn: không nói chuyện duyệt");
  assert.equal(S.compute({ chot: true, duyet: "cho_duyet", thanhToan: { soNV: 1, soCT: 1, nguoiDaTraDu: 1 } })[4].ly, "");
});

