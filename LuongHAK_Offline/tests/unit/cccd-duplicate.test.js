// CCCD trùng giữa các nhân viên: 1 người 2 mã NV → trả lương 2 lần. Chặn chốt kỳ (như Mã NV trùng), chặn sửa / nhập Excel.
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const ID = require("../../core/identity.js");
const E = require("../../engine.js"), HR = require("../../hr.js"), F = require("../fixtures/build.js");

function person(db, ma, cccd, extra) {
  db.nhanvien.push(Object.assign({ "Mã NV": ma, "Họ và tên": "Người " + ma, "Trạng thái": "Đang làm việc", "Số CCCD": cccd || "" }, extra || {}));
  db.hopdong.push({ "Mã NV": ma, "Số HĐLĐ": ma + "/HD", "Ngày vào làm": "2025-01-01", "Hình thức HĐLĐ": "Xác định thời hạn", "Ngày chấm dứt": (extra && extra.cham) || "" });
  db.chitiethd.push({ "Mã NV": ma, "Số HĐLĐ": ma + "/HD", "Hiệu lực từ": "2025-01-01", "Mã lương": "TG1", "Lương thỏa thuận": "9000000", "Mức đóng bảo hiểm": "BH00", "Thuế TNCN": "MT00" });
  db.chamcong.push(F.ccRow(ma, 2026, 9));
}
const payrollMa = (db) => HR.staffForPayroll(db, 2026, 9).list.map((x) => x["Mã nhân viên"]);

test("chuẩn hóa CCCD: bỏ khoảng trắng / dấu, bù số 0 đầu bị Excel làm mất; rỗng / sai độ dài không tính", () => {
  assert.equal(ID.normCCCD(" 049 090 001 234 "), "049090001234");
  assert.equal(ID.normCCCD(49090001234), "049090001234");
  assert.equal(ID.normCCCD("049-090-001-234"), "049090001234");
  assert.equal(ID.normCCCD(""), ""); assert.equal(ID.normCCCD("12345"), "");
});

test("chủ sở hữu CCCD lấy từ cả Hồ sơ nhân sự và Thông tin cá nhân (mọi bản hiệu lực)", () => {
  const db = F.baseDb(); person(db, "A", "049090001234"); db.canhan.push({ "Mã NV": "B", "Số CCCD": "49090001234", "Hiệu lực từ": "2026-01-01" });
  assert.deepEqual(ID.ownersOf(db, "049090001234"), ["A", "B"]);
  assert.deepEqual(ID.conflictFor(db, "A", "049090001234"), ["B"]);
  assert.deepEqual(ID.conflictFor(db, "C", ""), []);
});

test("chốt kỳ: 2 nhân viên trong bảng lương kỳ trùng CCCD → lỗi chặn; lương thực sự bị trả 2 lần", () => {
  const db = F.baseDb(); person(db, "A", "049090001234"); person(db, "A2", "049090001234"); person(db, "B", "049090009999");
  const ma = payrollMa(db), kq = E.tinhBangLuong(Object.assign({}, db, { nhansu: HR.staffForPayroll(db, 2026, 9).list }), 2026, 9, false, { quyChe: "2026" });
  assert.equal(kq.bangluong.length, 3);                                        // engine không tự loại — phải chặn ở chốt kỳ
  const bl = ID.payrollDuplicates(db, ma);
  assert.equal(bl.length, 1); assert.deepEqual(bl[0].ma, ["A", "A2"]); assert.equal(bl[0].cccd, "049090001234");
  assert.match(bl[0].msg, /CCCD 049090001234.*A, A2.*TRẢ LƯƠNG 2 LẦN/);
});

test("chốt kỳ: người trùng CCCD nhưng không có trong bảng lương kỳ đó (đã nghỉ trước kỳ) → không chặn", () => {
  const db = F.baseDb(); person(db, "A", "049090001234"); person(db, "A2", "049090001234", { cham: "2026-05-31" });
  assert.deepEqual(payrollMa(db), ["A"]);
  assert.deepEqual(ID.payrollDuplicates(db, payrollMa(db)), []);
});

test("nhập Excel: dòng làm 2 mã NV dùng chung CCCD (với dữ liệu đã có hoặc với dòng khác trong file) → không ghi, ghi rõ lý do", () => {
  const db = F.baseDb(); person(db, "A", "049090001234");
  const items = [
    { action: "add", row: { "Mã NV": "X", "Số CCCD": "049090001234" } },      // trùng người đã có
    { action: "update", row: { "Mã NV": "A", "Số CCCD": "049090001234" }, target: db.nhanvien[0] }, // chính A → hợp lệ
    { action: "add", row: { "Mã NV": "Y", "Số CCCD": "079000000001" } },
    { action: "add", row: { "Mã NV": "Z", "Số CCCD": "79000000001" } },        // trùng dòng Y trong cùng file (mất số 0)
    { action: "duplicate", row: { "Mã NV": "Q", "Số CCCD": "049090001234" } }, // đã bị bỏ qua → không đụng
    { action: "add", row: { "Mã NV": "W", "Số CCCD": "" } },
  ];
  ID.blockImportItems(db, "nhanvien", items);
  assert.deepEqual(items.map((i) => i.action), ["conflict", "update", "conflict", "conflict", "duplicate", "add"]);
  assert.match(items[0].reason, /CCCD 049090001234 đã thuộc nhân viên A/);
  assert.match(items[2].reason, /dòng khác trong file.*Z/); assert.match(items[3].reason, /dòng khác trong file.*Y/);
  const other = [{ action: "add", row: { "Mã NV": "X", "Số CCCD": "049090001234" } }];
  ID.blockImportItems(db, "chamcong", other); assert.equal(other[0].action, "add");   // bảng không có CCCD: bỏ qua
});

test("app.js nối đủ 4 chỗ: chốt kỳ, sửa ô / dán, form hồ sơ, xem trước nhập Excel", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../app.js"), "utf8");
  const chot = src.slice(src.indexOf("  function chotKy() {"), src.indexOf("var fresh = tinhLuong()", src.indexOf("  function chotKy() {")));
  assert.match(chot, /ID\.payrollDuplicates\(db, HRM\.staffForPayroll\(db, st\.nam, st\.thang\)/);
  assert.ok((src.match(/ID\.checkWrite\(/g) || []).length >= 3, "sửa ô, dán dữ liệu và form hồ sơ phải kiểm tra CCCD");
  assert.match(src.slice(src.indexOf("  function importPreview("), src.indexOf("  function importPreview(") + 4000), /ID\.blockImportItems\(db, p\.table, p\.items\)/);
  assert.match(fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8"), /<script src="core\/identity\.js"><\/script>\s*\n<script src="core\/integrity\.js">/);
});

test("ghi trực tiếp: đổi / thêm CCCD đã thuộc người khác → từ chối; giữ nguyên CCCD của chính mình → cho phép", () => {
  const db = F.baseDb(); person(db, "A", "049090001234"); person(db, "B", "049090009999");
  assert.match(ID.checkWrite(db, "nhanvien", db.nhanvien[1], { "Số CCCD": "049090001234" }), /đã thuộc nhân viên A/);
  assert.match(ID.checkWrite(db, "canhan", null, { "Mã NV": "B", "Số CCCD": "49090001234" }), /đã thuộc nhân viên A/);
  assert.equal(ID.checkWrite(db, "nhanvien", db.nhanvien[0], { "Họ và tên": "Đổi tên" }), "");
  assert.equal(ID.checkWrite(db, "canhan", null, { "Mã NV": "A", "Số CCCD": "049090001234" }), "");
  assert.equal(ID.checkWrite(db, "chamcong", null, { "Mã NV": "B" }), "");
});
