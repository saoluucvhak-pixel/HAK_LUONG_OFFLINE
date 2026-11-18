// C01: bộ lọc không được bỏ nhầm dòng THẬT như dòng tổng (mã/tên bắt đầu bằng TỔNG, CẢ NĂM, TOTAL...). Gọi module báo cáo thật, dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const RF = require("../../core/reporting/report-filter.js");
const PR = require("../../core/reporting/payroll-reports.js");
const PRD = require("../../core/reporting/period-reports.js");
const OPS = require("../../core/reporting/ops-reports.js");

const emp = (ma, pb, tl) => ({ "Mã NV": ma, "Họ và tên": "Người " + ma, "Phòng ban": pb, "HTTT": "Chuyển khoản", "Tổng thu nhập": tl, "Thực lĩnh": tl });
const L = (so, ma, tien) => ({ "Số chứng từ": so, "Kỳ": "2026-10", "Hình thức": "Chuyển khoản", "Mã NV": ma, "Họ và tên": "x", "Số tiền": tien, "Trạng thái": "Đã thanh toán", "Phòng ban": "Tổ 1" });
const opt = (x) => Object.assign({ nam: 2026, thang: 10, tenCongTy: "CÔNG TY TEST", ngay: "2026-11-01", nguoiLap: "ketoan" }, x || {});

test("U-C01-01 tái hiện: sổ chứng từ có NV 'TỔNG-02' ở dòng cuối; lọc phòng ban 'Tổ 1' phải giữ cả hai (tổng 300), không bỏ 'TỔNG-02'", () => {
  const bangluong = [emp("NV01", "Tổ 1", 100), emp("TỔNG-02", "Tổ 1", 200)], lines = [L("PC-1", "NV01", 100), L("PC-2", "TỔNG-02", 200)];
  const src = { bangluong, chot: true, blockers: [] };
  const all = PR.build("SO_CHUNG_TU", src, opt({ lines })), filtered = PR.build("SO_CHUNG_TU", src, opt({ lines, filter: { phongBan: ["Tổ 1"] } }));
  assert.equal(all.rows.length, 2, "không lọc: 2 dòng");
  assert.equal(filtered.rows.length, 2, "lọc phòng ban: vẫn 2 dòng (lỗi cũ: 1)");
  assert.equal(filtered.tong["Số tiền"], 300, "tổng 300 (lỗi cũ: 100)");
  assert.deepEqual(filtered.rows.map((r) => r["Mã NV"]).sort(), ["NV01", "TỔNG-02"]);
});

test("U-C01-02 applyGeneric: dòng có giá trị cột đầu bắt đầu bằng TỔNG/CẢ NĂM/TOTAL KHÔNG phải dòng tổng nếu chưa được đánh dấu; số 0 đầu giữ nguyên", () => {
  for (const code of ["TỔNG-02", "Tổng hợp A", "CẢ NĂM 2026", "CẢ NĂM", "TOTAL", "00123"]) {
    const rows = [{ "Mã NV": "A1", "Phòng ban": "Tổ 1", "Số tiền": 1 }, { "Mã NV": code, "Phòng ban": "Tổ 1", "Số tiền": 2 }];
    const g = RF.applyGeneric(rows, { phongBan: ["Tổ 1"] });
    assert.equal(g.hadTotal, false, code); assert.equal(g.rows.length, 2, code); assert.equal(g.rows[1]["Mã NV"], code);
  }
});

test("U-C01-03 dòng tổng THẬT (addTotal) vẫn được tách ra và tính lại sau lọc; thay thứ tự/cột không làm lọt dòng thật", () => {
  const base = [{ "Mã NV": "NV01", "Phòng ban": "Tổ 1", "Số tiền": 100 }, { "Mã NV": "TỔNG-02", "Phòng ban": "Tổ 2", "Số tiền": 200 }, { "Mã NV": "NV03", "Phòng ban": "Tổ 1", "Số tiền": 50 }];
  const withTotal = PRD.addTotal(base, "TỔNG");
  assert.equal(withTotal.length, 4);
  const g = RF.applyGeneric(withTotal, { phongBan: ["Tổ 1"] });
  assert.equal(g.hadTotal, true, "dòng tổng thật được nhận ra bằng đánh dấu"); assert.deepEqual(g.rows.map((r) => r["Mã NV"]), ["NV01", "NV03"], "dòng 'TỔNG-02' thuộc Tổ 2 bị lọc đúng lý do phòng ban, không phải vì tên");
  const re = PRD.addTotal(g.rows, "TỔNG"); assert.equal(re[re.length - 1]["Số tiền"], 150);
  // đổi thứ tự cột / dòng thật cuối cùng mang tên TỔNG... không bị nuốt
  const swapped = [{ "Phòng ban": "Tổ 1", "Số tiền": 7, "Mã NV": "NV09" }, { "Phòng ban": "Tổ 1", "Số tiền": 9, "Mã NV": "TỔNG-X" }];
  assert.equal(RF.applyGeneric(swapped, { phongBan: ["Tổ 1"] }).rows.length, 2);
  const lastLabelFirstCol = [{ "Tên": "A", "Phòng ban": "Tổ 1" }, { "Tên": "CẢ NĂM học", "Phòng ban": "Tổ 1" }];
  assert.equal(RF.applyGeneric(lastLabelFirstCol, { phongBan: ["Tổ 1"] }).rows.length, 2);
});

test("U-C01-04 không có dòng tổng nào bị suy ra từ tiền tố: không lọc thì trả nguyên mảng; lọc nhiều điều kiện (OR trong tiêu chí, AND giữa tiêu chí)", () => {
  const rows = [emp("NV01", "Tổ 1", 100), emp("NV02", "Tổ 2", 200), emp("TỔNG-03", "Tổ 1", 300)];
  assert.equal(RF.applyGeneric(rows, {}).rows.length, 3);
  assert.equal(RF.applyGeneric(rows, { phongBan: ["Tổ 1"] }).rows.length, 2);
  assert.equal(RF.applyGeneric(rows, { phongBan: ["Tổ 1", "Tổ 2"], maNV: ["TỔNG-03", "NV02"] }).rows.length, 2);
  assert.equal(RF.applyGeneric(rows, { phongBan: ["Tổ 1"], maNV: ["NV02"] }).rows.length, 0);
});

test("U-C01-05 báo cáo xuất (fromRows → bảng/Excel/PDF): dòng thật tên 'TỔNG…' ở cuối KHÔNG bị tách thành dòng tổng; dòng tổng thật vẫn thành 'tong'", () => {
  const real = [{ "Mã NV": "NV01", "Số tiền": 100 }, { "Mã NV": "TỔNG-02", "Số tiền": 200 }];
  const vm = OPS.fromRows("BÁO CÁO TEST", real, { tenCongTy: "X", ngay: "2026-11-01", nguoiLap: "t", file: "f", kyKey: "k", kyText: "k" });
  assert.equal(vm.rows.length, 2, "cả hai dòng thật nằm trong bảng"); assert.deepEqual(vm.tong || {}, {}, "không có tổng suy từ tên");
  const withTotal = PRD.addTotal(real.map((r) => Object.assign({}, r)), "TỔNG");
  const vm2 = OPS.fromRows("BÁO CÁO TEST", withTotal, { tenCongTy: "X", ngay: "2026-11-01", nguoiLap: "t", file: "f", kyKey: "k", kyText: "k" });
  assert.equal(vm2.rows.length, 2); assert.equal(vm2.tong["Số tiền"], 300, "dòng tổng thật cho tổng 300");
});

test("U-C01-06 dấu đánh dấu dòng tổng không lộ ra cột/Excel/JSON và không đổi dữ liệu gốc", () => {
  const src = [{ "Mã NV": "NV01", "Số tiền": 100 }], before = JSON.stringify(src), out = PRD.addTotal(src, "TỔNG");
  assert.equal(JSON.stringify(src), before); assert.deepEqual(Object.keys(out[out.length - 1]), ["Mã NV", "Số tiền"], "không có khóa phụ");
  assert.ok(!JSON.stringify(out).includes("_tong"));
});
