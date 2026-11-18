// Import Excel NHIỀU KỲ cho MỌI bảng nhập liệu theo tháng (chỉ đạo 004, mục 1; issue #92). Dữ liệu GIẢ.
// Đường thật của app: IMP.plan (kế hoạch + khóa kỳ đã chốt) → REPO.importWorkbook (kiểm lại + ghi theo giao dịch). Mỗi bảng: file ≥ 2 kỳ (1 kỳ đã chốt + kỳ mở).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const IMP = require("../../core/importer.js"), R = require("../../core/repository.js"), CLS = require("../../core/payroll-close.js"), P = require("../../core/permissions.js"), HR = require("../../hr.js"), V = require("../../core/validate.js");
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
const TABLES = Object.keys(COLS), CLOSED = "2026-09", OPEN = "2026-10", OPEN2 = "2026-11";
/** Dòng thô của file Excel cho bảng t ở kỳ ky; tag làm khóa khác nhau. */
function raw(t, ky, tag, val) {
  const d = ky + "-12";
  switch (t) {
    case "chamcong": { const r = { "Kỳ": ky, "Mã NV": "NV" + tag, "Hình thức công": "BT" }; ["01", "02", "03"].forEach((c) => { r[c] = val || 1; }); return r; }
    case "sanluong": return { "Phiếu cân": "PC" + ky + tag, "Ngày cân": d, "Biển số": "51C-1", "KL hàng (Tấn)": String(val || 10), "Mã NV": "NV" + tag };
    case "bandam": return { "Phiếu cân": "BD" + ky + tag, "Ngày cân": d, "Biển số": "51C-2", "KL hàng (Tấn)": String(val || 8), "Mã NV": "NV" + tag };
    case "psluong": return { "Ngày hạch toán": d, "Số chứng từ": "PS" + ky + tag, "Mã NV": "NV" + tag, "Thưởng": String((val || 1) * 100000) };
    case "ungluong": return { "Ngày hạch toán": d, "Số chứng từ": "UL" + ky + tag, "Mã NV": "NV" + tag, "Tạm ứng": String((val || 1) * 500000) };
    case "tiencom": return { "Ngày": d, "Mã NV": "NV" + tag, "Số suất cơm": String(val || 1) };
  }
}
function newDb() {
  const db = F.baseDb();
  ["A1", "A2", "A3", "A4"].forEach((t) => db.nhanvien.push({ "Mã NV": "NV" + t, "Họ và tên": "Người " + t, "Trạng thái": "Đang làm việc" }));
  db.auditlog = [];
  return db;
}
/** Đóng kỳ CLOSED (bản chốt thật bằng CLS) — dữ liệu hiện có của kỳ này phải được khóa. */
function closeKy(db, ky) { CLS.close(db, CLS.buildSnapshot(db, ky, { bangluong: [{ "Mã NV": "NVA1", "Họ và tên": "A", "Thực lĩnh": 1, "Tổng thu nhập": 1 }], bhxh: [], tncn: [], canhbao: [] }, [])); }
const lockedMap = (db) => { const m = {}; (db.kyluong || []).forEach((k) => { m[k.ky] = true; }); return m; };
const repoFor = (db, save) => { const user = { tenDangNhap: "admin", vaiTro: "admin" }; let n = 0; const rt = runtime(db, save || (() => true)); return R.createRepo({ db: () => db, transaction: rt.txn, can: (p) => P.can(user, p), audit: (a, d) => db.auditlog.push({ thaoTac: a, chiTiet: d }), uid: () => "id" + (++n), hdChildren: HR.HD_TABS }); };
const planOf = (db, t, rows, mode) => IMP.plan(db, t, COLS[t], rows, { lockedPeriods: lockedMap(db), mode: mode || "merge" });
const periodsOf = (db, t) => (db[t] || []).map((r) => V.rowPeriod(t, r));
const snap = (db) => JSON.stringify(db);

for (const t of TABLES) {
  test("U-IMPK-" + t + "-1 file nhiều kỳ (kỳ đã chốt + 2 kỳ mở): kỳ mở nhận đúng, kỳ đã chốt bị chặn có thông báo, kỳ đã chốt không đổi", () => {
    const db = newDb(); db[t].push(raw(t, CLOSED, "A1", 3)); closeKy(db, CLOSED); // đã có 1 dòng kỳ chốt
    const file = [raw(t, CLOSED, "A2"), raw(t, OPEN, "A1"), raw(t, OPEN, "A2"), raw(t, OPEN2, "A3")];
    const p = planOf(db, t, file);
    assert.deepEqual(p.items.map((i) => i.action), ["locked", "add", "add", "add"], JSON.stringify(p.items.map((i) => i.reason)));
    assert.match(p.items[0].reason, /đã chốt/); assert.equal(p.summary.locked, 1); assert.equal(p.summary.add, 3);
    const kyBefore = JSON.stringify(db.kyluong), closedBefore = JSON.stringify(db[t].filter((r) => V.rowPeriod(t, r) === CLOSED));
    const res = repoFor(db).importWorkbook([p], "nhieu-ky.xlsx", "merge", () => false);
    assert.equal(res.ok, true, JSON.stringify(res)); assert.equal(res.value, 3);
    assert.deepEqual(periodsOf(db, t).filter((k) => k === CLOSED).length, 1, "kỳ đã chốt không có thêm dòng nào");
    assert.equal(db[t].filter((r) => V.rowPeriod(t, r) === OPEN).length, 2); assert.equal(db[t].filter((r) => V.rowPeriod(t, r) === OPEN2).length, 1);
    assert.equal(JSON.stringify(db.kyluong), kyBefore, "bản chốt không đổi"); assert.equal(JSON.stringify(db[t].filter((r) => V.rowPeriod(t, r) === CLOSED)), closedBefore, "dòng kỳ đã chốt giống từng byte");
  });

  test("U-IMPK-" + t + "-2 nhập lại CÙNG file: không nhân đôi dòng, dữ liệu giữ nguyên từng byte", () => {
    const db = newDb(); closeKy(db, CLOSED);
    const file = [raw(t, CLOSED, "A2"), raw(t, OPEN, "A1"), raw(t, OPEN2, "A3")];
    assert.equal(repoFor(db).importWorkbook([planOf(db, t, file)], "f.xlsx", "merge", () => false).ok, true);
    const after1 = JSON.stringify(db[t]) + JSON.stringify(db.kyluong), n1 = db[t].length;
    const p2 = planOf(db, t, file);
    assert.equal(p2.summary.add, 0, "lần 2 không còn dòng mới: " + JSON.stringify(p2.items.map((i) => i.action))); assert.equal(p2.summary.update || 0, 0);
    assert.deepEqual(p2.items.map((i) => i.action).sort(), ["duplicate", "duplicate", "locked"]);
    const res = repoFor(db).importWorkbook([p2], "f.xlsx", "merge", () => false); assert.equal(res.ok, true); assert.equal(db[t].length, n1); assert.equal(JSON.stringify(db[t]) + JSON.stringify(db.kyluong), after1, "bảng dữ liệu và bản chốt giữ nguyên từng byte");
  });

  test("U-IMPK-" + t + "-3 dòng file TRÙNG KHÓA với bản ghi sẵn có của kỳ đã chốt, dữ liệu khác: bị chặn (locked), bản ghi cũ giữ nguyên; kỳ mở cùng file vẫn nhận", () => {
    const db = newDb(); const existing = raw(t, CLOSED, "A1", 2); db[t].push(existing); closeKy(db, CLOSED);
    const file = [raw(t, CLOSED, "A1", 9), raw(t, OPEN, "A1", 9)];
    const p = planOf(db, t, file); assert.deepEqual(p.items.map((i) => i.action), ["locked", "add"]); assert.match(p.items[0].reason, /kỳ.*đã chốt|đã chốt/i);
    const before = JSON.stringify(existing); assert.equal(repoFor(db).importWorkbook([p], "f.xlsx", "merge", () => false).ok, true); assert.equal(JSON.stringify(db[t][0]), before, "bản ghi kỳ chốt không đổi");
    assert.equal(db[t].length, 2);
  });

  test("U-IMPK-" + t + "-4 không ghi nửa chừng: kế hoạch bị sửa/lỗi thời (có dòng THUỘC KỲ ĐÃ CHỐT bị đánh dấu ghi) → toàn bộ lần nhập bị từ chối, kể cả dòng kỳ mở; dữ liệu giữ nguyên từng byte", () => {
    const db = newDb(); closeKy(db, CLOSED);
    const p = planOf(db, t, [raw(t, OPEN, "A1"), raw(t, CLOSED, "A2")]); assert.deepEqual(p.items.map((i) => i.action), ["add", "locked"]);
    p.items[1].action = "add"; p.items[1].reason = "(kế hoạch bị sửa trong kiểm thử)"; // giả lập kế hoạch lỗi thời/bị sửa: dòng kỳ chốt lọt vào danh sách ghi
    const before = snap(db), res = repoFor(db).importWorkbook([p], "f.xlsx", "merge", () => false);
    assert.equal(res.ok, false, "phải bị từ chối"); assert.equal(snap(db), before, "dữ liệu giữ nguyên từng byte — dòng kỳ mở cũng KHÔNG được ghi");
  });

  test("U-IMPK-" + t + "-6 đĩa không nhận lần lưu (mô phỏng 'Ổ đĩa đã đầy'): toàn bộ lần nhập bị hoàn tác — không bảng nào, không nhật ký nào bị đổi", () => {
    const db = newDb(); closeKy(db, CLOSED); const p = planOf(db, t, [raw(t, OPEN, "A1"), raw(t, OPEN, "A2"), raw(t, CLOSED, "A3")]); assert.equal(p.summary.add, 2);
    const before = snap(db), res = repoFor(db, () => "Ổ đĩa đã đầy").importWorkbook([p], "f.xlsx", "merge", () => false);
    assert.equal(res.ok, false); assert.equal(snap(db), before, "dữ liệu giữ nguyên từng byte (kể cả nhật ký)");
  });
}

for (const t of ["sanluong", "bandam", "psluong", "ungluong"]) {
  test("U-IMPK-" + t + "-5 chứng từ có sẵn ở kỳ mở, file đổi sang kỳ khác (hoặc sang kỳ đã chốt): xung đột/chặn, không ghi, bản ghi cũ giữ nguyên", () => {
    const db = newDb(); closeKy(db, CLOSED); const existing = raw(t, OPEN, "A1", 1); db[t].push(existing);
    const moved = JSON.parse(JSON.stringify(raw(t, OPEN, "A1", 4)));
    const dateCol = t === "sanluong" || t === "bandam" ? "Ngày cân" : "Ngày hạch toán", keyCol = t === "sanluong" || t === "bandam" ? "Phiếu cân" : "Số chứng từ";
    for (const [toKy, expect] of [[OPEN2, /conflict/], [CLOSED, /conflict|locked/]]) {
      const row = Object.assign({}, moved, { [dateCol]: toKy + "-12", [keyCol]: existing[keyCol] }), p = planOf(db, t, [row]);
      assert.match(p.items[0].action, expect, JSON.stringify(p.items[0])); assert.equal(p.summary.add + p.summary.update, 0, "không có dòng nào để ghi (nút Ghi của giao diện bị vô hiệu)"); const before = JSON.stringify(db[t]) + JSON.stringify(db.kyluong);
      repoFor(db).importWorkbook([p], "f.xlsx", "merge", () => false); assert.equal(JSON.stringify(db[t]) + JSON.stringify(db.kyluong), before, "không ghi gì khi chứng từ đổi kỳ → " + toKy);
    }
  });
}

test("U-IMPK-00 bảng kê: 6 bảng nhập liệu theo tháng × 6 ca (nhiều kỳ, nhập lại, trùng khóa kỳ chốt, không ghi nửa chừng, lưu thất bại hoàn tác) + 4 ca đổi kỳ chứng từ — đủ số ca", () => {
  assert.deepEqual(TABLES, ["chamcong", "sanluong", "bandam", "psluong", "ungluong", "tiencom"], "đủ các bảng nhập liệu theo tháng của app (core/importer.js MONTHLY)");
});
