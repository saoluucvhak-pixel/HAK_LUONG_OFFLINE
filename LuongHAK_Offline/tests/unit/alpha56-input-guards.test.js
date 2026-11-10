// alpha.56: trần lương đóng BH, chặn tỷ lệ BH > 100%, ô tiền không đọc được phải chặn (không coi là 0)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../../engine.js");
const V = require("../../core/validate.js");
const G = require("../../core/payroll-gate.js");
const { baseDb, ccRow, staff } = require("../fixtures/build.js");

function run(over, edit) {
  const db = baseDb(); if (edit) edit(db);
  db.nhansu = [staff(Object.assign({ "Mã nhân viên": "A", "Mã tiền lương 1": "TG1", "Lương thỏa thuận": "9000000", "Lương cơ bản": "5000000", "Mã BHXH": "BH01", "Mã TNCN": "MT00" }, over))];
  db.chamcong = [ccRow("A", 2026, 9)];
  return E.tinhBangLuong(db, 2026, 9, false);
}
const codes = (kq) => G.blockers(kq).map((b) => b.code);

test("trần BH: cột trần trống → BHXH, BHYT tính trên 46.800.000; BHTN chưa khai trần tính trên toàn bộ", () => {
  const kq = run({ "Lương thỏa thuận": "100000000", "Lương cơ bản": "100000000" }), b = kq.bhxh[0];
  assert.equal(b["Lương đóng BHXH"], 46800000);
  assert.equal(b["NLĐ.BHXH"], 3744000);  // 46.800.000 × 8%
  assert.equal(b["NLĐ.BHYT"], 702000);   // × 1,5%
  assert.equal(b["NLĐ.BHTN"], 1000000);  // 100.000.000 × 1%
  assert.equal(b["CTY.BHXH"], 8190000);  // × 17,5%
  assert.equal(b["Cộng BH NLĐ đóng"], 3744000 + 702000 + 1000000);
  assert.ok(kq.canhbao.some((w) => /vượt trần/.test(w)));
});
test("trần BH: nhập trần riêng cho BHXH/BHYT và BHTN; nhập 0 = không áp trần", () => {
  let kq = run({ "Lương cơ bản": "100000000", "Lương thỏa thuận": "100000000" }, (db) => { db.dm_baohiem[0]["Trần lương đóng BHXH, BHYT"] = "50.000.000"; db.dm_baohiem[0]["Trần lương đóng BHTN"] = "80000000"; });
  assert.equal(kq.bhxh[0]["NLĐ.BHXH"], 4000000); assert.equal(kq.bhxh[0]["NLĐ.BHTN"], 800000);
  kq = run({ "Lương cơ bản": "100000000", "Lương thỏa thuận": "100000000" }, (db) => { db.dm_baohiem[0]["Trần lương đóng BHXH, BHYT"] = "0"; });
  assert.equal(kq.bhxh[0]["NLĐ.BHXH"], 8000000);
});
test("lương đóng dưới trần: số bảo hiểm không đổi so với trước", () => {
  const b = run({}).bhxh[0];
  assert.equal(b["Lương đóng BHXH"], 5000000); assert.equal(b["NLĐ.BHXH"], 400000); assert.equal(b["NLĐ.BHYT"], 75000); assert.equal(b["NLĐ.BHTN"], 50000);
});
test("tỷ lệ BH gõ '8' (thiếu %) → không tính BH bằng số sai, chặn chốt INPUT_INVALID", () => {
  const kq = run({}, (db) => { db.dm_baohiem[0]["NLD.BHXH"] = "8"; });
  assert.equal(kq.bhxh.length, 0);
  assert.equal(kq.bangluong[0]["Thực lĩnh"], 9000000);
  assert.deepEqual(codes(kq), ["INPUT_INVALID"]);
  assert.equal(codes(run({}, (db) => { db.dm_baohiem[0]["NLD.BHXH"] = "8%"; })).length, 0);
});
test("ô nhập tỷ lệ BH: nhận 0.08 / 0,08 / 8%, từ chối 8 / 150% / chữ", () => {
  ["0.08", "0,08", "8%", "", "0"].forEach((v) => assert.equal(V.normCell("NLD.BHXH", v).error, undefined, v));
  ["8", "150%", "abc", "-0.08"].forEach((v) => assert.ok(V.normCell("DN.BHYT", v).error, v));
});
test("ô tiền không đọc được ('abc', '(200.000)') → chặn chốt, không lặng lẽ thành 0", () => {
  for (const bad of ["abc", "(200.000)", "1.5.2"]) {
    const kq = run({}, (db) => { db.psluong = [{ "Mã NV": "A", "Ngày hạch toán": "2026-09-10", "Trừ khác": bad }]; });
    assert.deepEqual(codes(kq), ["INPUT_INVALID"], bad);
    assert.ok(V.normCell("Trừ khác", bad).error, bad);
  }
  const ok = run({}, (db) => { db.psluong = [{ "Mã NV": "A", "Ngày hạch toán": "2026-09-10", "Trừ khác": "200.000", "Thưởng": "" }]; });
  assert.equal(codes(ok).length, 0); assert.equal(ok.bangluong[0]["Trừ khác"], 200000);
  assert.deepEqual(codes(run({ "Lương cơ bản": "năm triệu" })), ["INPUT_INVALID"]);
});
