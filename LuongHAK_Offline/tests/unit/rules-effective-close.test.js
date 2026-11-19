// Rà ma trận Hiệu lực / Nghiệp vụ / Chốt (CEO_LUONG thay thế, 20/11/2026): các quy tắc trong docs/BUSINESS_RULES.md chưa có test nêu rõ.
// Test MÔ TẢ HÀNH VI (không đổi công thức). Dữ liệu GIẢ.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../../engine.js"), HR = require("../../hr.js"), R = require("../../core/repository.js"), P = require("../../core/permissions.js"), CLS = require("../../core/payroll-close.js");
const { baseDb, ccRow } = require("../fixtures/build.js");

function one() {
  const db = baseDb(); db.auditlog = [];
  db.nhanvien = [{ "Mã NV": "NV001", "Họ và tên": "A", "Trạng thái": "Đang làm việc" }];
  db.hopdong = [{ "Mã NV": "NV001", "Số HĐLĐ": "H1", "Ngày vào làm": "2025-01-01" }];
  db.chitiethd = [{ "Mã NV": "NV001", "Số HĐLĐ": "H1", "Hiệu lực từ": "2025-01-01", "Mã lương": "TG1", "Lương thỏa thuận": "20000000", "Lương cơ bản": "6000000", "Mức đóng bảo hiểm": "BH01", "Thuế TNCN": "LT01", "HTTT": "Chuyển khoản" }];
  return db;
}
function pay(db, y, m) { const sp = HR.staffForPayroll(db, y, m); const kq = E.tinhBangLuong(Object.assign({}, db, { nhansu: sp.list }), y, m, false); return { b: kq.bangluong.find((x) => x["Mã NV"] === "NV001"), warn: sp.warn.concat(kq.canhbao) }; }
function closeKy(db, ky) { CLS.close(db, CLS.buildSnapshot(db, ky, { bangluong: [{ "Mã NV": "NV001", "Họ và tên": "A", "Thực lĩnh": 1, "Tổng thu nhập": 1 }], bhxh: [], tncn: [], canhbao: [] }, [])); }
function repo(db, role, audits) { const user = { tenDangNhap: role, vaiTro: role }; let n = 0; return R.createRepo({ db: () => db, transaction: (t, fn) => fn() !== false, can: (p) => P.can(user, p), audit: (a, d) => (audits || []).push(a + " " + d), uid: () => "id" + (++n), hdChildren: HR.HD_TABS }); }

test("R-10 lương lấy phụ lục MỚI NHẤT có hiệu lực ≤ cuối tháng (phụ lục hiệu lực tháng sau chưa áp dụng)", () => {
  const db = one(); db.chamcong = [ccRow("NV001", 2026, 9)];
  db.chitiethd.push(Object.assign({}, db.chitiethd[0], { "Hiệu lực từ": "2026-08-01", "Lương thỏa thuận": "26000000" }), Object.assign({}, db.chitiethd[0], { "Hiệu lực từ": "2026-10-01", "Lương thỏa thuận": "52000000" }));
  assert.equal(pay(db, 2026, 9).b["Lương thời gian"], 26000000);
});
test("R-11 hợp đồng có Ngày chấm dứt TRƯỚC đầu tháng → không tính lương tháng đó", () => {
  const db = one(); db.hopdong[0]["Ngày chấm dứt"] = "2026-08-31"; db.chamcong = [ccRow("NV001", 2026, 9)];
  assert.equal(pay(db, 2026, 9).b, undefined);
});
test("R-12 nhân viên 'Đã nghỉ việc' nhưng hợp đồng chưa chấm dứt → VẪN tính và CẢNH BÁO", () => {
  const db = one(); db.nhanvien[0]["Trạng thái"] = "Đã nghỉ việc"; db.chamcong = [ccRow("NV001", 2026, 9)];
  const r = pay(db, 2026, 9); assert.ok(r.b && r.b["Thực lĩnh"] > 0); assert.ok(r.warn.some((w) => /Đã nghỉ việc/.test(w) && /NV001/.test(w)), JSON.stringify(r.warn));
});
test("R-27 KHÔNG đổi được Mã NV đã có trong bảng lương đã chốt — chặn ở TẦNG NGHIỆP VỤ (R-44), kể cả Admin", () => {
  const db = one(); closeKy(db, "2026-09");
  const p = repo(db, "admin").plan("update", "nhanvien", db.nhanvien[0], { "Mã NV": "NV999" }, { what: "đổi Mã NV" });
  assert.equal(p.ok, false, "Admin đổi được Mã NV đã chốt ở tầng repository"); assert.match(p.msg, /Mã NV/);
  assert.equal(repo(db, "admin").plan("update", "nhanvien", db.nhanvien[0], { "Họ và tên": "A mới" }, {}).ok, true, "sửa ô khác (hồi tố) vẫn được với Admin");
});
test("R-27b Mã NV CHƯA có trong bảng lương đã chốt → đổi được", () => {
  const db = one(); db.nhanvien.push({ "Mã NV": "NV002", "Họ và tên": "B", "Trạng thái": "Đang làm việc" }); closeKy(db, "2026-09");
  assert.equal(repo(db, "admin").plan("update", "nhanvien", db.nhanvien[1], { "Mã NV": "NV003" }, {}).ok, true);
});
test("R-47 xóa nhân viên có trong bảng lương đã chốt: không phải Admin bị chặn; Admin xóa được và nhật ký ghi rõ; bản chốt giữ nguyên", () => {
  const db = one(); closeKy(db, "2026-09"); const ky = JSON.stringify(db.kyluong), before = JSON.stringify(db);
  const r1 = repo(db, "nhansu").removeEmployee(db.nhanvien[0], ["nhanvien", "hopdong", "chitiethd"]);
  assert.equal(r1.ok, false); assert.equal(r1.code, "locked"); assert.equal(JSON.stringify(db), before);
  const audits = []; const r2 = repo(db, "admin", audits).removeEmployee(db.nhanvien[0], ["nhanvien", "hopdong", "chitiethd"]);
  assert.equal(r2.ok, true, JSON.stringify(r2)); assert.equal(db.nhanvien.length, 0); assert.equal(JSON.stringify(db.kyluong), ky);
  assert.ok(audits.some((a) => /Xóa nhân viên/.test(a) && /bảng lương đã chốt/.test(a)), JSON.stringify(audits));
});
