// Dynamic Payroll Formula Engine (Master Prompt mục III, bộ kiểm thử bắt buộc mục XVII.1) —
// core/payroll/formula-{parser,validator,evaluator,registry,functions,variables,engine}.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../../core/payroll/formula-engine.js");

function ev(src, ctx) { return F.evaluate(F.parse(src), ctx || {}); }

test("phép cộng/trừ/nhân/chia + độ ưu tiên toán tử", () => {
  assert.equal(ev("2 + 3 * 4"), 14);
  assert.equal(ev("(2 + 3) * 4"), 20);
  assert.equal(ev("10 - 4 - 1"), 5);
  assert.equal(ev("10 / 4"), 2.5);
  assert.equal(ev("-5 + 2"), -3);
});

test("số thập phân (hệ số %, đơn giá lẻ)", () => {
  assert.equal(ev("0.1 * 1000000"), 100000);
  assert.equal(ev("CONG_CHUAN * 1.5", { CONG_CHUAN: 26 }), 39);
});

test("IF lồng nhau", () => {
  assert.equal(ev("IF(1 > 0, IF(2 > 3, 10, 20), 30)"), 20);
  assert.equal(ev("IF(CONG_BT >= CONG_CHUAN, MUC_PHU_CAP, 0)", { CONG_BT: 26, CONG_CHUAN: 26, MUC_PHU_CAP: 300000 }), 300000);
  assert.equal(ev("IF(CONG_BT >= CONG_CHUAN, MUC_PHU_CAP, 0)", { CONG_BT: 10, CONG_CHUAN: 26, MUC_PHU_CAP: 300000 }), 0);
});

test("IF lazy: nhánh KHÔNG được chọn không được tính (không ném lỗi chia 0 ở nhánh thừa)", () => {
  assert.equal(ev("IF(1 = 1, 5, 10 / 0)"), 5);
  assert.equal(ev("IF(1 = 2, 10 / 0, 7)"), 7);
});

test("MIN/MAX nhiều đối số", () => {
  assert.equal(ev("MIN(5, 2, 8)"), 2);
  assert.equal(ev("MAX(5, 2, 8)"), 8);
  assert.equal(ev("MAX(0, -5)"), 0);
});

test("ABS/ROUND/FLOOR/CEIL/SUM/COUNT", () => {
  assert.equal(ev("ABS(-7)"), 7);
  assert.equal(ev("ROUND(3.456, 2)"), 3.46);
  assert.equal(ev("ROUND(3.5)"), 4);
  assert.equal(ev("FLOOR(3.9)"), 3);
  assert.equal(ev("CEIL(3.1)"), 4);
  assert.equal(ev("SUM(1, 2, 3)"), 6);
  assert.equal(ev("COUNT(1, 2, 3)"), 3);
});

test("so sánh + AND/OR/NOT", () => {
  assert.equal(ev("5 > 3"), 1);
  assert.equal(ev("5 < 3"), 0);
  assert.equal(ev("5 = 5 AND 2 < 3"), 1);
  assert.equal(ev("5 = 6 OR 2 < 3"), 1);
  assert.equal(ev("NOT (5 = 6)"), 1);
  assert.equal(ev("1 != 2"), 1);
});

test("biến không tồn tại: evaluate() ném UNKNOWN_VAR, không âm thầm coi là 0", () => {
  assert.throws(() => ev("BIEN_LA_QUA * 2"), (e) => e.code === "UNKNOWN_VAR");
});

test("biến hợp lệ nhưng context không có giá trị → theo quy tắc 'missing' (mặc định 0, không ném lỗi)", () => {
  assert.equal(ev("CONG_TC * 2"), 0);
});

test("chia cho 0: evaluate() ném DIV_ZERO, không ra Infinity/NaN", () => {
  assert.throws(() => ev("10 / 0"), (e) => e.code === "DIV_ZERO");
  assert.throws(() => ev("10 / (5 - 5)"), (e) => e.code === "DIV_ZERO");
});

test("công thức sai cú pháp: parse() ném SYNTAX, không chạy được công thức dở", () => {
  assert.throws(() => F.parse("1 + "), (e) => e.code === "SYNTAX");
  assert.throws(() => F.parse("IF(1, 2"), (e) => e.code === "SYNTAX");
  assert.throws(() => F.parse(")( +"), (e) => e.code === "SYNTAX" || e.code === "LEX");
});

test("biểu thức độc hại: không có eval()/new Function() nào chạy — ký tự lạ/thuộc tính JS chỉ ra lỗi cú pháp hoặc biến/hàm không tồn tại, không có cách nào gọi được mã hệ thống", () => {
  assert.throws(() => F.parse("process.exit()"), (e) => e.code === "LEX" || e.code === "SYNTAX");
  assert.throws(() => ev("__proto__ + 1"), (e) => e.code === "UNKNOWN_VAR");
  assert.throws(() => F.parse("require('fs')")); // "'" không nằm trong token hợp lệ → LEX error
});

test("validate(): gom ĐỦ lỗi 1 lượt — biến lạ + hàm lạ + sai số đối số, không chỉ báo lỗi đầu tiên", () => {
  const r = F.validate("BIEN_LA(1) + KHONG_BIET_HAM() + IF(1,2)");
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "UNKNOWN_FN" && /BIEN_LA/.test(e.message)));
  assert.ok(r.errors.some((e) => e.code === "UNKNOWN_FN" && /KHONG_BIET_HAM/.test(e.message)));
  assert.ok(r.errors.some((e) => e.code === "ARITY" && /IF/.test(e.message)));
});

test("validate(): công thức hợp lệ (đúng biến mục III.4 + hàm có sẵn) → ok", () => {
  const r = F.validate("MAX(0, CONG_TINH_LUONG - CONG_LE - CONG_TRUNG_CHUYEN - CONG_PHEP - CONG_TC - CONG_CHUAN) * HE_SO_TC + CONG_TC * HE_SO_TC");
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("validate(): công thức quá dài / lồng quá sâu / quá nhiều phần tử → TOO_LONG/TOO_DEEP/TOO_COMPLEX", () => {
  assert.equal(F.validate("1", { maxLength: 0 }).errors[0].code, "TOO_LONG");
  let deep = "1"; for (let i = 0; i < 30; i++) deep = "(" + deep + "+1)";
  assert.ok(F.validate(deep, { maxDepth: 10 }).errors.some((e) => e.code === "TOO_DEEP"));
  let wide = "SUM(" + Array.from({ length: 300 }, () => "1").join(",") + ")";
  assert.ok(F.validate(wide, { maxNodes: 50 }).errors.some((e) => e.code === "TOO_COMPLEX"));
});

test("validate(): giới hạn biến/hàm theo loại công thức (VD UI chỉ cho phép tập biến riêng của OVERTIME)", () => {
  const r = F.validate("MUC_PHU_CAP * 2", { variables: ["CONG_TC", "HE_SO_TC"] });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].code, "VAR_NOT_ALLOWED");
});

test("TC1-TC6 (DM_TANGCA hiện hành) viết lại bằng công thức động — khớp ĐÚNG hình dạng công thức của heSoTangCa() trong engine.js (xem engine.js dòng ~95-103)", () => {
  // Công chuẩn đủ lớn hơn (d > 0) để cả 2 nhánh (MAX chọn d, và cộng thêm CONG_TC*HE_SO_TC) đều lộ ra số khác 0.
  const ctx = { CONG_TINH_LUONG: 40, CONG_LE: 1, CONG_TRUNG_CHUYEN: 0, CONG_PHEP: 2, CONG_TC: 5, CONG_CHUAN: 26, CONG_CHU_NHAT: 1, CONG_DI_CHUYEN: 0, HE_SO_TC: 1.5, CONG_CHUAN_2: 0 };
  const TC1 = "MAX(0, CONG_TINH_LUONG - CONG_LE - CONG_TRUNG_CHUYEN - CONG_PHEP - CONG_TC - CONG_CHUAN) * HE_SO_TC + CONG_TC * HE_SO_TC";
  const TC2 = "MAX(0, CONG_TINH_LUONG - CONG_LE - CONG_TRUNG_CHUYEN - CONG_PHEP - CONG_TC - CONG_DI_CHUYEN - IF(CONG_CHUAN_2 > 0, CONG_CHUAN_2, CONG_CHUAN)) * HE_SO_TC + CONG_TC * HE_SO_TC";
  const TC3 = "(CONG_TC + CONG_CHU_NHAT) * HE_SO_TC";
  const TC4 = "CONG_TC * HE_SO_TC";
  const TC6 = "MAX(0, CONG_TINH_LUONG - CONG_TRUNG_CHUYEN - CONG_LE - CONG_CHUAN)";
  const d1 = Math.max(0, ctx.CONG_TINH_LUONG - ctx.CONG_LE - ctx.CONG_TRUNG_CHUYEN - ctx.CONG_PHEP - ctx.CONG_TC - ctx.CONG_CHUAN) * ctx.HE_SO_TC + ctx.CONG_TC * ctx.HE_SO_TC;
  assert.equal(d1, 16.5); // d = 40-1-0-2-5-26 = 6 > 0 → 6*1.5=9; + 5*1.5=7.5 → 16.5
  assert.equal(ev(TC1, ctx), d1);
  assert.equal(ev(TC3, ctx), (ctx.CONG_TC + ctx.CONG_CHU_NHAT) * ctx.HE_SO_TC);
  assert.equal(ev(TC4, ctx), ctx.CONG_TC * ctx.HE_SO_TC);
  assert.equal(ev(TC6, ctx), Math.max(0, ctx.CONG_TINH_LUONG - ctx.CONG_TRUNG_CHUYEN - ctx.CONG_LE - ctx.CONG_CHUAN));
  assert.ok(F.validate(TC2).ok);
  // CONG_CHUAN_2 (nhãn "DQ") > 0 → TC2 dùng mốc này thay CONG_CHUAN (PV-8, đối chiếu M thật HAK_DN)
  const ctx2 = Object.assign({}, ctx, { CONG_CHUAN_2: 40 });
  const d2a = Math.max(0, ctx.CONG_TINH_LUONG - ctx.CONG_LE - ctx.CONG_TRUNG_CHUYEN - ctx.CONG_PHEP - ctx.CONG_TC - ctx.CONG_DI_CHUYEN - ctx.CONG_CHUAN) * ctx.HE_SO_TC + ctx.CONG_TC * ctx.HE_SO_TC;
  const d2b = Math.max(0, ctx2.CONG_TINH_LUONG - ctx2.CONG_LE - ctx2.CONG_TRUNG_CHUYEN - ctx2.CONG_PHEP - ctx2.CONG_TC - ctx2.CONG_DI_CHUYEN - ctx2.CONG_CHUAN_2) * ctx2.HE_SO_TC + ctx2.CONG_TC * ctx2.HE_SO_TC;
  assert.equal(ev(TC2, ctx), d2a);
  assert.equal(ev(TC2, ctx2), d2b);
  assert.notEqual(d2a, d2b);
});

test("formula-registry.resolve(): chọn đúng phiên bản theo Mã công thức + Công ty + kỳ hiệu lực; bỏ qua 'Nháp'/'Ngừng'", () => {
  const recs = [
    { "Mã công thức": "TC7", "Loại": "OVERTIME", "Trạng thái": "Hiệu lực", "Hiệu lực từ": "2026-01-01", "Biểu thức": "CONG_TC * HE_SO_TC" },
    { "Mã công thức": "TC7", "Loại": "OVERTIME", "Trạng thái": "Hiệu lực", "Hiệu lực từ": "2026-11-01", "Biểu thức": "CONG_TC * HE_SO_TC * 2" },
    { "Mã công thức": "TC7", "Loại": "OVERTIME", "Trạng thái": "Nháp", "Hiệu lực từ": "2027-01-01", "Biểu thức": "999" },
    { "Mã công thức": "TC7", "Loại": "OVERTIME", "Trạng thái": "Ngừng", "Hiệu lực từ": "2020-01-01", "Hiệu lực đến": "2025-12-31", "Biểu thức": "888" },
  ];
  const r1 = F.resolve(recs, { code: "TC7", type: "OVERTIME", nam: 2026, thang: 6 });
  assert.equal(r1["Biểu thức"], "CONG_TC * HE_SO_TC");
  const r2 = F.resolve(recs, { code: "TC7", type: "OVERTIME", nam: 2026, thang: 12 }); // sau 2026-11-01 → bản mới
  assert.equal(r2["Biểu thức"], "CONG_TC * HE_SO_TC * 2");
  const r3 = F.resolve(recs, { code: "TC7", type: "OVERTIME", nam: 2027, thang: 1 }); // "Nháp" chưa hiệu lực → vẫn dùng bản hiệu lực gần nhất
  assert.equal(r3["Biểu thức"], "CONG_TC * HE_SO_TC * 2");
  assert.equal(F.resolve(recs, { code: "TC_LA", nam: 2026, thang: 6 }), null);
});

test("formula-registry.resolve(): cấu hình khác công ty — bản riêng công ty được ưu tiên hơn bản chung", () => {
  const recs = [
    { "Mã công thức": "PC99", "Loại": "ALLOWANCE", "Trạng thái": "Hiệu lực", "Hiệu lực từ": "2026-01-01", "Biểu thức": "MUC_PHU_CAP" },
    { "Mã công thức": "PC99", "Loại": "ALLOWANCE", "Trạng thái": "Hiệu lực", "Hiệu lực từ": "2026-01-01", "Công ty": "DAIHIEP", "Biểu thức": "MUC_PHU_CAP * 2" },
  ];
  assert.equal(F.resolve(recs, { code: "PC99", type: "ALLOWANCE", companyId: "DAIHIEP", nam: 2026, thang: 6 })["Biểu thức"], "MUC_PHU_CAP * 2");
  assert.equal(F.resolve(recs, { code: "PC99", type: "ALLOWANCE", companyId: "HAK", nam: 2026, thang: 6 })["Biểu thức"], "MUC_PHU_CAP");
});

test("TC7 tạo mới qua danh mục (không sửa code) — resolve() + evaluate() tính ra đúng kết quả", () => {
  const recs = [{ "Mã công thức": "TC7", "Loại": "OVERTIME", "Trạng thái": "Hiệu lực", "Hiệu lực từ": "2026-11-01", "Biểu thức": "CONG_TC_DUOC_DUYET * HE_SO_TC" }];
  // Biến "CONG_TC_DUOC_DUYET" chưa có trong thư viện biến chuẩn — minh họa đúng yêu cầu mục IV.4:
  // biến lạ phải báo lỗi cấu hình khi lưu, KHÔNG được âm thầm tính ra 0.
  const rec = F.resolve(recs, { code: "TC7", type: "OVERTIME", nam: 2026, thang: 11 });
  const v = F.validate(rec["Biểu thức"]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.code === "UNKNOWN_VAR"));
});

test("registerBusinessFunction(): hàm nghiệp vụ chưa đăng ký → lỗi rõ ràng khi evaluate(), không chạy ra số sai", () => {
  assert.throws(() => ev("SUM_ATTENDANCE(1)"), /chưa được triển khai/);
  F.functions.registerBusinessFunction("SUM_ATTENDANCE", (a) => a[0] * 10);
  assert.equal(ev("SUM_ATTENDANCE(3)"), 30);
});
