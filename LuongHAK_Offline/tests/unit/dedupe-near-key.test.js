// 013-A (issue #114): CHỐNG TRÙNG — khóa gần giống nhau (khác chữ hoa/thường, khoảng trắng, chữ toàn khổ, tổ hợp Unicode) phải bị coi là NGHI TRÙNG, không ghi thành bản ghi mới.
// Mỗi ca khẳng định kết quả ĐÚNG; ca mà mã hiện tại chưa đạt được ghi bằng `todo` ("chờ 013-B") để CI xanh — KHÔNG đánh dấu đạt giả. Dữ liệu GIẢ.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const IMP = require("../../core/importer.js"), R = require("../../core/repository.js"), P = require("../../core/permissions.js"), HR = require("../../hr.js");
const F = require("../fixtures/build.js");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

// Giao dịch THẬT của giao diện (txn trong app-src/01-luu-tru.js, lấy từ app.js đã build): chụp bảng → chạy → lưu một lần → lỗi/ lưu thất bại thì HOÀN TÁC toàn bộ.
const APP = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
function runtime(db, save) {
  const c = { session: null, clearTimeout() {}, toast() {}, store: { save }, readOnly: false, saveTimer: null, dirty: false, lastSaveError: "", lastTxnError: "", dbRev: 0, st: {}, db };
  vm.createContext(c);
  vm.runInContext(APP.slice(APP.indexOf("  // Phiên bản kho mà giao diện đã nạp/lưu gần nhất"), APP.indexOf("  function save() {")), c);
  return c;
}

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const COLS = {
  chamcong: ["Kỳ", "Mã NV", "Hình thức công"].concat(DAYS),
  sanluong: ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV", "Mã phòng ban", "NV vắng", "Cân lần 1", "Cân lần 2"],
  bandam: ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV", "Mã phòng ban", "NV vắng", "Cân lần 1", "Cân lần 2"],
  psluong: ["Ngày hạch toán", "Số chứng từ", "Mã NV", "Diễn giải", "Thưởng", "Thu nhập khác", "Trừ khác"],
  ungluong: ["Ngày hạch toán", "Số chứng từ", "Mã NV", "Diễn giải", "Tạm ứng"],
  tiencom: ["Ngày", "Mã NV", "Số suất cơm", "Ghi chú", "Suất bổ sung"]
};
const OPEN = "2026-10";
function newDb() {
  const db = F.baseDb();
  ["A1", "A2", "A3", "A4"].forEach((t) => db.nhanvien.push({ "Mã NV": "NV" + t, "Họ và tên": "Người " + t, "Trạng thái": "Đang làm việc" }));
  db.auditlog = [];
  return db;
}
const lockedMap = (db) => { const m = {}; (db.kyluong || []).forEach((k) => { m[k.ky] = true; }); return m; };
const repoFor = (db, save) => { const user = { tenDangNhap: "admin", vaiTro: "admin" }; let n = 0; const rt = runtime(db, save || (() => true)); return R.createRepo({ db: () => db, transaction: rt.txn, can: (p) => P.can(user, p), audit: (a, d) => db.auditlog.push({ thaoTac: a, chiTiet: d }), uid: () => "id" + (++n), hdChildren: HR.HD_TABS }); };



const SAFE = require("../../core/input-safety.js");
const COLS2 = Object.assign({ nhanvien: ["Mã NV", "Họ và tên", "Trạng thái"] }, COLS);
const TODO = { todo: "chờ 013-B (issue #114): chưa có khóa so sánh chuẩn hóa" };
const plan2 = (db, t, rows) => IMP.plan(db, t, COLS2[t], rows, { lockedPeriods: lockedMap(db), mode: "merge" });
/** Hàm "Nghi trùng" của bản xem trước nhập Excel (app-src/04, cặp dấu mốc IMPORT-NEARDUP-BEGIN/END trong app.js) — chưa có trước 013-B → null. */
function nearDupFn() {
  const i = APP.indexOf("// IMPORT-NEARDUP-BEGIN"), j = APP.indexOf("// IMPORT-NEARDUP-END"); if (i < 0 || j < i) return null;
  const c = {}; vm.createContext(c); vm.runInContext(APP.slice(i, j) + "\nthis.fn = importNearDup;", c); return c.fn;
}
/** Đường nhập Excel thật: IMP.plan rồi (nếu có) lớp Nghi trùng của bản xem trước. Trả plan đã xử lý. */
function excelPlan(db, t, rows) { const p = plan2(db, t, rows), fn = nearDupFn(); if (fn) fn(db, [p]); return p; }
const flagged = (it) => it.action !== "add" && it.action !== "update";
const dbWith = (mut) => { const db = newDb(); db.nhanvien.push({ "Mã NV": "NV01", "Họ và tên": "Nguyễn Văn A", "Trạng thái": "Đang làm việc" }); db.sanluong.push({ "Phiếu cân": "PC-001", "Ngày cân": OPEN + "-10", "KL hàng (Tấn)": "10", "Mã NV": "NV01" }); if (mut) mut(db); return db; };

// ---- T1–T3: Mã NV khác chữ hoa / khoảng trắng giữa / chữ toàn khổ → nhân viên thứ hai ----
for (const [tag, code] of [["T1", "nv01"], ["T2", "NV 01"], ["T3", "ＮＶ01"]]) {
  test("U-DEDUP-" + tag + " nhân sự: Mã NV " + JSON.stringify(code) + " giống 'NV01' → NGHI TRÙNG, không ghi nhân viên thứ hai", TODO, () => {
    const db = dbWith(), p = excelPlan(db, "nhanvien", [{ "Mã NV": code, "Họ và tên": "Người khác", "Trạng thái": "Đang làm việc" }]), it = p.items[0];
    assert.ok(flagged(it), "hiện tại action = " + it.action + " (ghi thành nhân viên mới)"); assert.match(it.reason, /NV01/);
    const n = db.nhanvien.length; repoFor(db).importWorkbook([p], "x", "merge", () => true); assert.equal(db.nhanvien.length, n, "không ghi thêm nhân viên");
  });
}
test("U-DEDUP-T1b trong cùng file: 'NV02' rồi 'nv02' → dòng sau NGHI TRÙNG với dòng trước", TODO, () => {
  const db = dbWith(), p = excelPlan(db, "nhanvien", [{ "Mã NV": "NV02", "Họ và tên": "B" }, { "Mã NV": "nv02", "Họ và tên": "B2" }]);
  assert.equal(p.items[0].action, "add"); assert.ok(flagged(p.items[1]), "dòng 2 action = " + p.items[1].action); assert.match(p.items[1].reason, /NV02/);
});

// ---- T4–T5: Phiếu cân khác chữ hoa / khoảng trắng → phiếu mới (khối lượng tính 2 lần) ----
for (const [tag, code] of [["T4", "pc-001"], ["T5", "PC - 001"]]) {
  test("U-DEDUP-" + tag + " sản lượng: Phiếu cân " + JSON.stringify(code) + " giống 'PC-001' (cùng NV) → NGHI TRÙNG, không tính 2 lần", TODO, () => {
    const db = dbWith(), p = excelPlan(db, "sanluong", [{ "Phiếu cân": code, "Ngày cân": OPEN + "-10", "KL hàng (Tấn)": "10", "Mã NV": "NV01" }]), it = p.items[0];
    assert.ok(flagged(it), "hiện tại action = " + it.action); assert.match(it.reason, /PC-001/);
    const n = db.sanluong.length; repoFor(db).importWorkbook([p], "x", "merge", () => true); assert.equal(db.sanluong.length, n);
  });
}

// ---- T6: phát sinh lương không số chứng từ, chữ "Thưởng" dạng NFD → thưởng 2 lần ----
test("U-DEDUP-T6 thưởng không số chứng từ: cùng dòng nhưng 'Thưởng' ở dạng NFD (chép từ Mac/web) → TRÙNG, không thưởng 2 lần", TODO, () => {
  const row = (txt) => ({ "Ngày hạch toán": OPEN + "-12", "Số chứng từ": "", "Mã NV": "NV01", "Diễn giải": txt, "Thưởng": "100000" });
  const db = dbWith((d) => { d.psluong.push(row("Thưởng")); }), nfd = "Thưởng".normalize("NFD"); assert.notEqual(nfd, "Thưởng");
  const p = excelPlan(db, "psluong", [row(nfd)]), it = p.items[0]; assert.ok(flagged(it), "hiện tại action = " + it.action);
  const n = db.psluong.length; repoFor(db).importWorkbook([p], "x", "merge", () => true); assert.equal(db.psluong.length, n, "không ghi thêm dòng thưởng");
});

// ---- T7: tiền cơm nhập TAY cùng Ngày + Mã NV với dòng đã có ----
test("U-DEDUP-T7 nhập tay tiền cơm cùng Ngày + Mã NV với dòng đã có → BỊ CHẶN (code 'dup'), như khi nhập Excel", TODO, () => {
  const db = dbWith((d) => { d.tiencom.push({ "Ngày": OPEN + "-12", "Mã NV": "NV01", "Số suất cơm": "1" }); });
  const r = repoFor(db).plan("insert", "tiencom", null, { "Ngày": OPEN + "-12", "Mã NV": "NV01", "Số suất cơm": "2" }, { what: "thêm dòng", checkDup: undefined }); // đúng tham số app truyền (CT_KEY.tiencom = undefined)
  assert.equal(r.ok, false, "hiện tại cho thêm dòng trùng"); assert.equal(r.code, "dup");
  const r2 = repoFor(db).plan("insert", "tiencom", null, { "Ngày": OPEN + "-12", "Mã NV": "nv01", "Số suất cơm": "2" }, { what: "thêm dòng" });
  assert.equal(r2.ok, false, "nhập tay 'nv01' cũng phải bị chặn theo khóa chuẩn hóa"); assert.equal(r2.code, "dup");
});

// ---- T8: nhập tay Phiếu cân 'pc-001' cùng kỳ lọt cả lúc tính lương ----
test("U-DEDUP-T8 nhập tay Phiếu cân 'pc-001' cùng kỳ + NV với 'PC-001' → input-safety.mutation CHẶN; dữ liệu đã lỡ trùng thì problems() báo", TODO, () => {
  const db = dbWith(), after = { "Phiếu cân": "pc-001", "Ngày cân": OPEN + "-11", "KL hàng (Tấn)": "5", "Mã NV": "NV01" };
  assert.match(SAFE.mutation(db, "sanluong", null, after) || "", /trùng/i, "mutation phải chặn phiếu trùng theo khóa chuẩn hóa");
  db.sanluong.push(after); const bad = SAFE.issues(db, "sanluong", OPEN); assert.ok(bad.some((m) => /trùng khóa/.test(m)), "problems phải báo trùng khóa: " + JSON.stringify(bad));
});

// ---- ĐẠT SẴN (hồi quy): phải giữ đạt trước và sau 013-B ----
test("U-DEDUP-R1 khoảng trắng đầu/cuối và NBSP cuối: ' NV01 ', 'NV01\\u00a0' đã được coi là cùng khóa (không thêm mới)", () => {
  for (const code of [" NV01 ", "NV01 "]) { const db = dbWith(), it = excelPlan(db, "nhanvien", [{ "Mã NV": code, "Họ và tên": "Nguyễn Văn A", "Trạng thái": "Đang làm việc" }]).items[0]; assert.notEqual(it.action, "add", JSON.stringify(code)); }
});
test("U-DEDUP-R2 ngày dd/mm/yyyy và số ngày kiểu Excel cùng dòng tiền cơm đã có → không thêm mới", () => {
  for (const d of ["12/10/2026", 46307]) { const db = dbWith((x) => { x.tiencom.push({ "Ngày": OPEN + "-12", "Mã NV": "NV01", "Số suất cơm": "1" }); }), it = excelPlan(db, "tiencom", [{ "Ngày": d, "Mã NV": "NV01", "Số suất cơm": "1" }]).items[0]; assert.notEqual(it.action, "add", String(d)); }
});
test("U-DEDUP-R3 tiền '100.000' / '100.000đ' cùng số chứng từ + NV với dòng đã có → không thêm mới", () => {
  const base = { "Ngày hạch toán": OPEN + "-12", "Số chứng từ": "UL-9", "Mã NV": "NV01", "Tạm ứng": "100000" };
  for (const m of ["100.000", "100.000đ"]) { const db = dbWith((x) => { x.ungluong.push(Object.assign({}, base)); }), it = excelPlan(db, "ungluong", [Object.assign({}, base, { "Tạm ứng": m })]).items[0]; assert.notEqual(it.action, "add", m); }
});
test("U-DEDUP-R4 hai dòng tiền cơm cùng ngày + NV khác số suất → conflict (cả hai), không ghi", () => {
  const db = dbWith(), p = excelPlan(db, "tiencom", [{ "Ngày": OPEN + "-12", "Mã NV": "NV01", "Số suất cơm": "1" }, { "Ngày": OPEN + "-12", "Mã NV": "NV01", "Số suất cơm": "2" }]);
  assert.deepEqual(p.items.map((i) => i.action), ["conflict", "conflict"]);
});
test("U-DEDUP-R5 Mã NV số 12 (Excel làm mất số 0) so với '0012' đang có → refError, không ghi", () => {
  const db = dbWith((x) => { x.nhanvien.push({ "Mã NV": "0012", "Họ và tên": "Số không đầu", "Trạng thái": "Đang làm việc" }); }), it = excelPlan(db, "ungluong", [{ "Ngày hạch toán": OPEN + "-12", "Số chứng từ": "UL-1", "Mã NV": 12, "Tạm ứng": "1" }]).items[0];
  assert.equal(it.action, "refError");
});
