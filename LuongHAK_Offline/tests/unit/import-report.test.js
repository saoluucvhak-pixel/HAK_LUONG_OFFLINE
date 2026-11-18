// 009-B (issue #98): thông báo lỗi có "sửa thế nào", file lỗi để SỬA RỒI NHẬP LẠI, đối chiếu tổng dòng/tổng tiền với file nguồn.
// Hàm lấy NGUYÊN VĂN từ app.js (app-src/04, cặp dấu mốc IMPORT-REPORT-BEGIN/END) và chạy trong vm. Dữ liệu GIẢ.
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
const TABLES = Object.keys(COLS), OPEN = "2026-10";
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
const lockedMap = (db) => { const m = {}; (db.kyluong || []).forEach((k) => { m[k.ky] = true; }); return m; };
const repoFor = (db, save) => { const user = { tenDangNhap: "admin", vaiTro: "admin" }; let n = 0; const rt = runtime(db, save || (() => true)); return R.createRepo({ db: () => db, transaction: rt.txn, can: (p) => P.can(user, p), audit: (a, d) => db.auditlog.push({ thaoTac: a, chiTiet: d }), uid: () => "id" + (++n), hdChildren: HR.HD_TABS }); };
const planOf = (db, t, rows, mode) => IMP.plan(db, t, COLS[t], rows, { lockedPeriods: lockedMap(db), mode: mode || "merge" });


const E = require("../../engine.js");
function helpers() {
  const i = APP.indexOf("// IMPORT-REPORT-BEGIN"), j = APP.indexOf("// IMPORT-REPORT-END"); assert.ok(i > 0 && j > i, "thiếu dấu mốc IMPORT-REPORT trong app.js");
  const c = {}; vm.createContext(c); vm.runInContext(APP.slice(i, j) + "\nthis.h = { hint: importFixHint, totals: importTotals, sheets: importErrorSheets, SUM: IMPORT_SUM_COLS };", c); return c.h;
}
const H = helpers();
const MIXED = (t) => { const bad = Object.assign(raw(t, OPEN, "A2"), { [t === "chamcong" ? "Kỳ" : t === "sanluong" || t === "bandam" ? "Ngày cân" : t === "tiencom" ? "Ngày" : "Ngày hạch toán"]: "sai-ngày" }), ref = Object.assign(raw(t, OPEN, "A3"), { "Mã NV": "KHONGCO" }); return [raw(t, OPEN, "A1", 2), bad, ref, Object.assign({}, raw(t, OPEN, "A1", 2))]; };

test("U-IMPRPT-01 mỗi loại lỗi có 'Cách sửa' cụ thể bằng tiếng Việt (không để trống, không chung chung khi đã biết lỗi)", () => {
  const cases = [["invalid", "Thiếu Mã NV", /Điền giá trị cho cột Mã NV/], ["invalid", 'Tạm ứng: Số tiền không đọc được ("abc")', /Nhập số tiền như 500000/], ["invalid", 'Ngày hạch toán: Ngày không hợp lệ (cần dạng 2026-09-15 hoặc 15/09/2026) ("hôm qua")', /Nhập ngày dạng 15\/09\/2026/],
    ["invalid", 'Số suất cơm: phải là số (ví dụ 2 hoặc 1,5), không nhập chữ — nhập 2 thay vì hai ("hai")', /Nhập số \(ví dụ 2/], ["invalid", 'Kỳ: Kỳ không hợp lệ (cần dạng 2026-09) ("x")', /2026-09/], ["invalid", 'Ngày 01: số công âm', /Ô ngày chấm công/],
    ["refError", "Mã NV 5 chưa có trong Nhân sự", /Thêm nhân viên này ở màn Nhân sự.*số 0 đầu/], ["conflict", "Cùng khóa với dòng 3", /xóa hoặc sửa dòng còn lại/], ["locked", "Thuộc kỳ 2026-09 đã chốt lương", /mở chốt/], ["duplicate", "Trùng y hệt", /Không cần làm gì/]];
  for (const [a, r, want] of cases) assert.match(H.hint(a, r), want, a + " " + r);
  assert.equal(H.hint("add", ""), ""); assert.ok(H.hint("invalid", "lỗi lạ").length > 10);
});

for (const t of TABLES) {
  test("U-IMPRPT-" + t + "-totals đối chiếu: số dòng file = ghi + gộp + không ghi; tổng cột số của file = ghi + không ghi", () => {
    const db = newDb(), p = planOf(db, t, MIXED(t)), [r] = H.totals([p], E.num);
    assert.equal(r.file.rows, p.items.length); assert.equal(r.file.rows, r.ghi.rows + r.gop.rows + r.khong.rows);
    assert.equal(r.ghi.rows, p.items.filter((i) => i.action === "add" || i.action === "update").length);
    for (const c of H.SUM[t] || []) assert.ok(Math.abs(r.file.sums[c] - (r.ghi.sums[c] + r.khong.sums[c])) < 1e-9, c);
    // số liệu độc lập: cộng tay các dòng hợp lệ của file
    for (const c of H.SUM[t] || []) { const handSum = p.items.filter((i) => i.action === "add").reduce((n, i) => n + E.num(i.row[c]), 0); assert.equal(r.ghi.sums[c], handSum); }
    const res = repoFor(db).importWorkbook([p], "x", "merge", () => false); assert.equal(res.value, r.ghi.rows, "số dòng ghi thật = số 'Sẽ ghi' đã hiện");
    if ((H.SUM[t] || []).length) { const c = H.SUM[t][0]; assert.equal(db[t].reduce((n, row) => n + E.num(row[c]), 0), r.ghi.sums[c], "tổng đã ghi vào dữ liệu = tổng 'Sẽ ghi' đã hiện"); }
  });
}
test("U-IMPRPT-sum số kiểu Việt: tổng đọc đúng '500.000' + '1.234,5' + '2' (cùng quy tắc engine)", () => {
  const db = newDb(), rows = [["500.000", "A1"], ["250.000", "A2"], ["1.234,5", "A3"]].map(([v, tag], i) => Object.assign(raw("ungluong", OPEN, tag), { "Số chứng từ": "S" + i, "Tạm ứng": v })), p = planOf(db, "ungluong", rows), [r] = H.totals([p], E.num);
  assert.equal(r.file.sums["Tạm ứng"], 500000 + 250000 + 1234.5); assert.equal(r.ghi.sums["Tạm ứng"], r.file.sums["Tạm ứng"]);
});

test("U-IMPRPT-sheet file lỗi để sửa: chỉ dòng lỗi, đúng cột của bảng + Dòng Excel/Lỗi/Cách sửa; SỬA RỒI NHẬP LẠI bằng chính chức năng nhập được (cột thêm bị bỏ qua)", () => {
  const t = "ungluong", db = newDb(), rowsIn = [raw(t, OPEN, "A1"), Object.assign(raw(t, OPEN, "A2"), { "Tạm ứng": "abc" }), Object.assign(raw(t, OPEN, "A3"), { "Mã NV": "KHONGCO" })];
  const p = planOf(db, t, rowsIn), sheets = H.sheets([p], (x) => COLS[x], (x) => "Tạm ứng");
  assert.equal(sheets.length, 1); const sh = sheets[0]; assert.equal(sh.rows.length, 2); assert.deepEqual(sh.cols, COLS[t].concat(["Dòng Excel", "Lỗi", "Cách sửa"]));
  assert.deepEqual(sh.rows.map((r) => r["Dòng Excel"]), [3, 4]); assert.match(sh.rows[0]["Lỗi"], /Tạm ứng.*abc/); assert.match(sh.rows[0]["Cách sửa"], /Nhập số tiền/); assert.match(sh.rows[1]["Lỗi"], /KHONGCO/);
  assert.equal(sh.rows[0]["Tạm ứng"], "abc", "giữ nguyên giá trị sai để người dùng thấy và sửa");
  // người dùng sửa 2 lỗi rồi nhập lại: đọc sheet như một file Excel (hàng tiêu đề + các dòng)
  sh.rows[0]["Tạm ứng"] = "500.000"; sh.rows[1]["Mã NV"] = "NVA3";
  const aoa = [sh.cols].concat(sh.rows.map((r) => sh.cols.map((c) => r[c]))), again = planOf(db, t, IMP.rowsFromAoa(aoa, t, COLS[t]).rows);
  assert.deepEqual(again.items.map((i) => i.action), ["add", "add"], JSON.stringify(again.items.map((i) => i.reason))); assert.equal(again.items[0].row["Tạm ứng"], "500000");
  assert.equal(repoFor(db).importWorkbook([again], "sua.xlsx", "merge", () => false).value, 2);
  assert.equal(H.sheets([planOf(newDb(), t, [raw(t, OPEN, "A1")])], (x) => COLS[x], (x) => x).length, 0, "không có dòng lỗi → không có sheet");
});
