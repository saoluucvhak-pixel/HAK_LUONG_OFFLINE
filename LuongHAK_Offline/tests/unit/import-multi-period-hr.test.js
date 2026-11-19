// 004.1b (issue #92): nhập Excel NHIỀU KỲ cho bảng nhân sự / danh mục theo NGÀY HIỆU LỰC (canhan, thanhtoan, chitiethd, dm_*),
// và file NHIỀU SHEET (nhiều bảng trong một lần ghi). Đường thật: IMP.plan → REPO.importWorkbook (giao dịch txn của app.js). Dữ liệu GIẢ.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const IMP = require("../../core/importer.js"), R = require("../../core/repository.js"), CLS = require("../../core/payroll-close.js"), P = require("../../core/permissions.js"), HR = require("../../hr.js");
const F = require("../fixtures/build.js");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const APP = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
function runtime(db, save) {
  const c = { session: null, clearTimeout() {}, toast() {}, store: { save }, readOnly: false, saveTimer: null, dirty: false, lastSaveError: "", lastTxnError: "", dbRev: 0, st: {}, db };
  vm.createContext(c);
  vm.runInContext(APP.slice(APP.indexOf("  // Phiên bản kho mà giao diện đã nạp/lưu gần nhất"), APP.indexOf("  function save() {")), c);
  return c;
}
const CLOSED = "2026-09";
function newDb() {
  const db = F.baseDb(); db.auditlog = [];
  ["A1", "A2"].forEach((t) => db.nhanvien.push({ "Mã NV": "NV" + t, "Họ và tên": "Người " + t, "Trạng thái": "Đang làm việc" }));
  db.hopdong.push({ "Mã NV": "NVA1", "Số HĐLĐ": "HD1", "Hình thức HĐLĐ": "Không xác định thời hạn", "Ngày vào làm": "2026-01-01" });
  return db;
}
function closeKy(db, ky) { CLS.close(db, CLS.buildSnapshot(db, ky, { bangluong: [{ "Mã NV": "NVA1", "Họ và tên": "A", "Thực lĩnh": 1, "Tổng thu nhập": 1 }], bhxh: [], tncn: [], canhan: [], canhbao: [] }, [])); }
const isHr = (t) => !!(HR.TABS && HR.TABS[t]) || ["canhan", "thanhtoan", "chitiethd", "hopdong", "nhanvien"].includes(t);
function repoFor(db, role, audits) {
  const user = { tenDangNhap: role, vaiTro: role }; let n = 0; const rt = runtime(db, () => true);
  return R.createRepo({ db: () => db, transaction: rt.txn, can: (p) => P.can(user, p), audit: (a, d) => { (audits || []).push(a + " " + d); }, uid: () => "id" + (++n), hdChildren: HR.HD_TABS });
}
const lockedMap = (db) => Object.fromEntries((db.kyluong || []).map((k) => [k.ky, true]));
const planOf = (db, t, rows) => IMP.plan(db, t, Object.keys(Object.assign({}, ...rows)), rows, { lockedPeriods: lockedMap(db), mode: "merge" });
const ROW = {
  canhan: (ma, hl) => ({ "Mã NV": ma, "Số CCCD": "0790" + hl.replace(/-/g, ""), "Ngày sinh": "1990-01-01", "Giới tính": "Nam", "Hiệu lực từ": hl }),
  thanhtoan: (ma, hl) => ({ "Mã NV": ma, "Số tài khoản": "0011" + hl.replace(/-/g, ""), "Tên ngân hàng": "NH Giả", "Hiệu lực từ": hl }),
  chitiethd: (ma, hl) => ({ "Mã NV": ma, "Số HĐLĐ": "HD1", "Loại phụ lục": "Phụ lục sửa đổi", "Hiệu lực từ": hl, "Phòng ban": "VP", "Mã hình thức lương": "LTG", "Mã lương": "CĐ", "Lương thỏa thuận": "9000000", "HTTT": "Chuyển khoản", "Mức đóng bảo hiểm": "BH", "Thuế TNCN": "TN" }),
  dm_luong: (ma, hl) => ({ "Mã lương": "LGIA", "Mã hình thức lương": "LTG", "Hình thức lương": "Giả", "Số tiền khoán": hl === "2026-09-01" ? "100" : "200", "Cách tính": "Cố định", "Hiệu lực từ": hl }),
  dm_phucap: (ma, hl) => ({ "Mã phụ cấp": "PCGIA", "Tên phụ cấp": "Giả", "Số tiền": hl === "2026-09-01" ? "1000" : "2000", "Hiệu lực từ": hl })
};
const TABLES = Object.keys(ROW);
const keysOf = (db, t) => db[t].map((r) => IMP.keyOf(t, r));

const NO_PAYROLL = { canhan: true }; // thông tin cá nhân không dùng tính lương → không phải hồi tố (period-guard PAYROLL_TABLES)
for (const t of TABLES) {
  const file = () => [ROW[t]("NVA1", "2026-09-01"), ROW[t]("NVA1", "2026-10-01")]; // hiệu lực trong kỳ ĐÃ CHỐT (hồi tố) + kỳ mở

  test("U-IMPHR-" + t + "-1 không phải Admin: dòng hiệu lực trong kỳ đã chốt bị CHẶN ở bước kiểm; cả lần ghi không đổi dữ liệu", () => {
    const db = newDb(); closeKy(db, CLOSED); const before = JSON.stringify(db);
    const role = /^dm_/.test(t) ? "ketoanluong" : "nhansu";
    const res = repoFor(db, role).importWorkbook([planOf(db, t, file())], "nv.xlsx", "merge", isHr);
    if (NO_PAYROLL[t]) { assert.equal(res.ok, true, JSON.stringify(res)); return; }
    assert.equal(res.ok, false, "người không có retro.edit đã ghi được dữ liệu hồi tố: " + JSON.stringify(res).slice(0, 200));
    assert.equal(JSON.stringify(db), before, "dữ liệu đổi dù lần ghi bị từ chối");
  });

  test("U-IMPHR-" + t + "-2 Admin: ghi cả hai kỳ, bản chốt không đổi, nhật ký ghi rõ HỒI TỐ kỳ đã chốt", () => {
    const db = newDb(); closeKy(db, CLOSED); const ky = JSON.stringify(db.kyluong), n0 = db[t].length, audits = [];
    const res = repoFor(db, "admin", audits).importWorkbook([planOf(db, t, file())], "nv.xlsx", "merge", isHr);
    assert.equal(res.ok, true, JSON.stringify(res)); assert.equal(db[t].length, n0 + 2);
    assert.equal(JSON.stringify(db.kyluong), ky, "bản chốt bị đổi");
    if (NO_PAYROLL[t]) { assert.ok(!audits.some((a) => /HỒI TỐ/.test(a)), JSON.stringify(audits)); return; }
    assert.ok(audits.some((a) => /HỒI TỐ/.test(a) && /\b0?9\/2026|2026-09/.test(a)), "nhật ký nhập không ghi hồi tố: " + JSON.stringify(audits));
  });

  test("U-IMPHR-" + t + "-3 nhập lại CÙNG file: không thêm dòng, dữ liệu giữ nguyên từng byte", () => {
    const db = newDb(); closeKy(db, CLOSED);
    assert.equal(repoFor(db, "admin").importWorkbook([planOf(db, t, file())], "nv.xlsx", "merge", isHr).ok, true);
    const after1 = JSON.stringify(db[t]);
    const p2 = planOf(db, t, file());
    assert.equal(p2.summary.add, 0, JSON.stringify(p2.items.map((i) => i.action + ":" + (i.reason || ""))));
    assert.equal(repoFor(db, "admin").importWorkbook([p2], "nv.xlsx", "merge", isHr).ok, true);
    assert.equal(JSON.stringify(db[t]), after1);
    assert.equal(new Set(keysOf(db, t)).size, db[t].length, "có khóa trùng");
  });
}

test("U-IMPHR-sheets file nhiều sheet (nhanvien + canhan + thanhtoan): ghi trong MỘT giao dịch; lưu thất bại → hoàn tác cả ba bảng", () => {
  const db = newDb(); const before = JSON.stringify(db);
  const plans = [planOf(db, "nhanvien", [{ "Mã NV": "NVB1", "Họ và tên": "Người B1", "Trạng thái": "Đang làm việc" }]),
    planOf(db, "canhan", [ROW.canhan("NVA2", "2026-10-01")]), planOf(db, "thanhtoan", [ROW.thanhtoan("NVA2", "2026-10-01")])];
  const user = { tenDangNhap: "admin", vaiTro: "admin" }; let n = 0; const rt = runtime(db, () => false);
  const repo = R.createRepo({ db: () => db, transaction: rt.txn, can: (p) => P.can(user, p), audit: () => {}, uid: () => "id" + (++n), hdChildren: HR.HD_TABS });
  const res = repo.importWorkbook(plans, "nhieu-sheet.xlsx", "merge", isHr);
  assert.equal(res.ok, false); assert.equal(JSON.stringify(db), before, "lưu thất bại nhưng còn dữ liệu dở dang");
  const db2 = newDb(); const plans2 = [planOf(db2, "nhanvien", [{ "Mã NV": "NVB1", "Họ và tên": "Người B1", "Trạng thái": "Đang làm việc" }]), planOf(db2, "canhan", [ROW.canhan("NVA2", "2026-10-01")]), planOf(db2, "thanhtoan", [ROW.thanhtoan("NVA2", "2026-10-01")])];
  const r2 = repoFor(db2, "admin").importWorkbook(plans2, "nhieu-sheet.xlsx", "merge", isHr);
  assert.equal(r2.ok, true, JSON.stringify(r2)); assert.equal(r2.value, 3);
});
