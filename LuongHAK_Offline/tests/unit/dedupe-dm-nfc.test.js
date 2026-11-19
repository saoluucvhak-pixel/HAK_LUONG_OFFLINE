// 013-C (issue #114, việc sau 013-B do CEO ghi ở #119): (1) danh mục dm_* cũng dò NGHI TRÙNG theo khóa chuẩn hóa;
// (2) sửa một dòng danh mục: ô KHÔNG đổi giữ nguyên giá trị đã lưu (không chuẩn hóa NFC lại) để nhật ký không ghi thay đổi giả. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const V = require("../../core/validate.js"), R = require("../../core/repository.js"), P = require("../../core/permissions.js"), HR = require("../../hr.js");
const APP = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");

const repo = (db) => { const user = { tenDangNhap: "admin", vaiTro: "admin" }; let n = 0; return R.createRepo({ db: () => db, transaction: (t, fn) => fn() !== false, can: (p) => P.can(user, p), audit: () => {}, uid: () => "id" + (++n), hdChildren: HR.HD_TABS }); };

for (const [t, have, add] of [
  ["dm_phongban", { "Mã phòng ban": "P01", "Tên phòng ban": "Tổ 1" }, { "Mã phòng ban": "p 01", "Tên phòng ban": "Tổ khác" }],
  ["dm_chucvu", { "Mã chức vụ": "TT", "Tên chức vụ": "Tổ trưởng" }, { "Mã chức vụ": "tt", "Tên chức vụ": "Khác" }],
  ["dm_luong", { "Mã lương": "L1", "Hiệu lực từ": "2026-01-01", "Số tiền khoán": "100" }, { "Mã lương": "l-1", "Hiệu lực từ": "2026-01-01", "Số tiền khoán": "200" }],
  ["dm_bacthue", { "Mã thuế TNCN": "T", "Bậc": "1", "Hiệu lực từ": "2026-01-01", "Thuế suất": "5%" }, { "Mã thuế TNCN": "t", "Bậc": "1", "Hiệu lực từ": "2026-01-01", "Thuế suất": "6%" }],
  ["dm_cc", { "Mã CC": "X", "Hình thức công": "BT", "Hệ số": "1" }, { "Mã CC": "x", "Hình thức công": "BT", "Hệ số": "2" }]
]) {
  test("U-DMDUP " + t + ": thêm tay mã chỉ khác chữ hoa/khoảng trắng/gạch nối với mã đã có → NGHI TRÙNG, bị chặn", () => {
    const db = { auditlog: [], kyluong: [] }; db[t] = [have];
    const r = repo(db).plan("insert", t, null, add, { what: "thêm danh mục" });
    assert.equal(r.ok, false, "hiện tại cho thêm: " + JSON.stringify(r).slice(0, 200)); assert.equal(r.code, "dup");
  });
}
test("U-DMDUP-groups Kiểm tra dữ liệu liệt kê nhóm nghi trùng trong danh mục đã lưu (chỉ báo)", () => {
  const db = { dm_phongban: [{ "Mã phòng ban": "P01" }, { "Mã phòng ban": "p01" }] };
  assert.ok(V.nearDuplicateGroups(db).some((g) => g.table === "dm_phongban"));
});
test("U-DMDUP-ok mã thật sự khác (P01 / P02) không bị chặn; mã giữ số 0 đầu khác nhau (01 / 1) không bị coi là trùng", () => {
  const db = { auditlog: [], kyluong: [], dm_phongban: [{ "Mã phòng ban": "P01" }, { "Mã phòng ban": "01" }] };
  assert.notEqual(repo(db).plan("insert", "dm_phongban", null, { "Mã phòng ban": "P02" }, {}).code, "dup");
  assert.notEqual(repo(db).plan("insert", "dm_phongban", null, { "Mã phòng ban": "1" }, {}).code, "dup");
});

/** Hàm thuần lấy nguyên văn từ app.js (cặp mốc CLEAN-DRAFT-BEGIN/END ở app-src/07). Chưa có → null. */
function cleanDraftFn() {
  const i = APP.indexOf("// CLEAN-DRAFT-BEGIN"), j = APP.indexOf("// CLEAN-DRAFT-END"); if (i < 0 || j < i) return null;
  const c = {}; vm.createContext(c); vm.runInContext(APP.slice(i, j) + "\nthis.fn = cleanDraft;", c); return c.fn;
}
test("U-NFC-CELL sửa dòng danh mục: ô KHÔNG sửa giữ nguyên giá trị đã lưu (kể cả chữ NFD), ô ĐÃ sửa mới chuẩn hóa NFC", () => {
  const fn = cleanDraftFn(); assert.ok(fn, "thiếu hàm cleanDraft (CLEAN-DRAFT-BEGIN/END) trong app.js");
  const nfd = "Tổ trưởng".normalize("NFD"), orig = { "Mã chức vụ": "TT", "Tên chức vụ": nfd, "Ghi chú": "cũ" };
  const draft = { "Mã chức vụ": "TT", "Tên chức vụ": nfd, "Ghi chú": "mới ghi".normalize("NFD") };
  const r = fn(["Mã chức vụ", "Tên chức vụ", "Ghi chú"], draft, orig, V.normCell);
  assert.equal(r.errs.length, 0, String(r.errs)); // mảng từ vm khác ngữ cảnh: so độ dài
  assert.equal(r.cleaned["Tên chức vụ"], nfd, "ô không sửa phải giữ nguyên byte (không NFC)");
  assert.equal(r.cleaned["Ghi chú"], "mới ghi".normalize("NFC"), "ô đã sửa được chuẩn hóa NFC");
});
test("U-NFC-CELL thêm mới (không có bản gốc): mọi ô chuẩn hóa như trước; ô sai vẫn báo lỗi", () => {
  const fn = cleanDraftFn(); assert.ok(fn);
  const r = fn(["Mã lương", "Số tiền khoán"], { "Mã lương": " L9 ", "Số tiền khoán": "abc" }, null, V.normCell);
  assert.equal(r.cleaned["Mã lương"], "L9"); assert.ok(r.errs.some((e) => /Số tiền khoán/.test(e)), JSON.stringify(r.errs));
});
