// Chữ "null" trong ô chấm công và dòng Tổng (Total) lẫn trong Sản lượng — dữ liệu từ hệ thống cũ
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../../core/validate.js");
const B = require("../../core/input-batch.js");
const E = require("../../engine.js");
const G = require("../../core/payroll-gate.js");
const { baseDb, ccRow, staff } = require("../fixtures/build.js");

test("isNullText: chỉ nhận null / undefined / NaN (không phân biệt hoa thường), không nhận nhãn thật", () => {
  ["null", "NULL", " Null ", "undefined", "NaN"].forEach((v) => assert.equal(V.isNullText(v), true, v));
  ["", "1", "0", "1QC", "ĐH", "Nulla", null, 0, undefined].forEach((v) => assert.equal(V.isNullText(v), false, String(v)));
});
test("normCell: ô ngày 'null' → ô trống, không lỗi; cột khác giữ nguyên hành vi", () => {
  assert.deepEqual(V.normCell("31", "null"), { value: "" });
  assert.equal(V.dayCell("31", "null", "2025-11").error, null); // ngày 31 của tháng 30 ngày, nhưng ô trống → không lỗi
  assert.ok(V.dayCell("31", "1", "2025-11").error);              // ô có số thật ở ngày không tồn tại vẫn báo lỗi
  assert.equal(V.normCell("Họ và tên", "Null").value, "Null");   // tên người không bị đụng
});
test("cleanNullCells: chỉ đổi ô ngày của chấm công, đếm đúng, chạy lại = 0", () => {
  const db = { chamcong: [{ "Mã NV": "A", "01": "1", "02": "null", "31": "NULL", "Hình thức công": "BT" }], nhanvien: [{ "Họ và tên": "null" }] };
  assert.equal(V.cleanNullCells(db), 2);
  assert.deepEqual([db.chamcong[0]["02"], db.chamcong[0]["31"], db.chamcong[0]["01"]], ["", "", "1"]);
  assert.equal(db.nhanvien[0]["Họ và tên"], "null");
  assert.equal(V.cleanNullCells(db), 0);
});
test("removeTotals: loại dòng Total/Tổng cộng không ngày-tổ-người; giữ phiếu thật, phiếu thiếu ngày và dòng có tổ", () => {
  const db = { sanluong: [
    { "Phiếu cân": "13761", "Ngày cân": "2025-11-01", "Mã phòng ban": "02.02", "KL hàng (Tấn)": 14.09 },
    { "Phiếu cân": "Total", "Ngày cân": "", "Biển số": "", "Mã NV": "", "Mã phòng ban": "", "NV vắng": "", "KL hàng (Tấn)": 11975.82 },
    { "Phiếu cân": "Tổng cộng", "Ngày cân": "", "KL hàng (Tấn)": 5 },
    { "Phiếu cân": "13999", "Ngày cân": "", "KL hàng (Tấn)": 3 },              // phiếu thật thiếu ngày → GIỮ để người dùng xử lý
    { "Phiếu cân": "Total", "Ngày cân": "", "Mã phòng ban": "02.01", "KL hàng (Tấn)": 7 } // có tổ → không phải dòng tổng thuần
  ], bandam: [{ "Phiếu cân": "TOTAL", "KL hàng (Tấn)": 9 }] };
  const out = B.removeTotals(db);
  assert.deepEqual(out.map((x) => x.table + ":" + x.row["Phiếu cân"]), ["sanluong:Total", "sanluong:Tổng cộng", "bandam:TOTAL"]);
  assert.deepEqual(db.sanluong.map((r) => r["Phiếu cân"]), ["13761", "13999", "Total"]);
  assert.equal(B.removeTotals(db).length, 0);
});
test("tính lương: ô 'null' không còn thành nhãn công tác / xung đột và không mất phụ cấp", () => {
  const mk = (clean) => {
    const db = baseDb();
    db.nhansu = [staff({ "Mã nhân viên": "A", "Mã tiền lương 1": "TG1", "Lương thỏa thuận": "9000000", "Mã BHXH": "", "Mã TNCN": "MT00" })];
    const bt = ccRow("A", 2026, 9); bt["28"] = "1"; bt["30"] = "null"; bt["31"] = "null";
    db.chamcong = [bt]; if (clean) V.cleanNullCells(db);
    return db;
  };
  const kq = E.tinhBangLuong(mk(true), 2026, 9, false);
  assert.equal((kq.inputErrors || []).length, 0);
  assert.ok(!kq.canhbao.some((w) => /'null'/.test(w)));
  assert.equal(G.blockers(kq).length, 0);
});
