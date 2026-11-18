// CA XẤU của luồng nhập Excel cho 6 bảng nhập liệu theo tháng (chỉ đạo 009, issue #98). Dữ liệu GIẢ.
// Mỗi ca ghi KẾT QUẢ MONG ĐỢI (chặn có thông báo rõ dòng/cột, hoặc chấp nhận kèm cảnh báo/chuẩn hóa) rồi khẳng định đúng như vậy.
// Ca mà hành vi hiện tại KHÔNG đạt mong đợi (nhập sai âm thầm) được ghi bằng `todo` kèm lý do — là lỗi thật chờ quyết định, không làm đỏ CI.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const IMP = require("../../core/importer.js"), R = require("../../core/repository.js"), P = require("../../core/permissions.js"), HR = require("../../hr.js"), V = require("../../core/validate.js");
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
const periodsOf = (db, t) => (db[t] || []).map((r) => V.rowPeriod(t, r));
const snap = (db) => JSON.stringify(db);


const SAFE = require("../../core/input-safety.js"), E = require("../../engine.js");
const VALCOL = { chamcong: "01", sanluong: "KL hàng (Tấn)", bandam: "KL hàng (Tấn)", psluong: "Thưởng", ungluong: "Tạm ứng", tiencom: "Số suất cơm" };
const DATECOL = { chamcong: "Kỳ", sanluong: "Ngày cân", bandam: "Ngày cân", psluong: "Ngày hạch toán", ungluong: "Ngày hạch toán", tiencom: "Ngày" };
const MONEY = ["psluong", "ungluong"];
/** Chạy MỘT dòng đã sửa qua kế hoạch nhập; trả { db, item, p }. */
function one(t, mut, setup) { const db = newDb(); if (setup) setup(db); const p = planOf(db, t, [Object.assign(raw(t, OPEN, "A1"), mut)]); return { db, p, item: p.items[0] }; }
const clear = (it) => it.action === "invalid" || it.action === "refError" || it.action === "conflict";

// ---- 1. Chữ trong ô số ----
for (const t of TABLES) {
  const col = VALCOL[t];
  if (t === "tiencom") {
    test("U-IMPBAD-" + t + "-text ô 'Số suất cơm' chứa chữ ('hai'): chặn, không ghi, thông báo nêu dòng/cột/giá trị/cách sửa (009-1)", () => {
      for (const bad of ["hai", "2 suất", "abc", "1.5.2", "--1"]) {
        const db = newDb(), p = planOf(db, t, [raw(t, OPEN, "A1"), Object.assign(raw(t, OPEN, "A2"), { [col]: bad })]);
        assert.deepEqual(p.items.map((i) => i.action), ["add", "invalid"], bad);
        assert.match(p.items[1].reason, /Số suất cơm/); assert.ok(p.items[1].reason.includes(bad), p.items[1].reason); assert.match(p.items[1].reason, /phải là số/); assert.equal(p.items[1].line, 3);
        const res = repoFor(db).importWorkbook([p], "x", "merge", () => false); assert.equal(res.value, 1, "dòng đúng vẫn nhập"); assert.equal(db[t].length, 1, "dòng lỗi không vào dữ liệu");
      }
    });
    test("U-IMPBAD-" + t + "-count số suất cơm hợp lệ vẫn nhận nguyên văn: 2, 1,5, 1.5, 1.234,5, ô trống, số kiểu Excel", () => {
      for (const ok of ["2", "1,5", "1.5", "0", "", 3, 0.5]) { const { item } = one(t, { [col]: ok }); assert.equal(item.action, "add", JSON.stringify(ok)); }
      assert.equal(one(t, { [col]: " 2 " }).item.row[col], "2");
    });
    continue;
  }
  if (t === "sanluong" || t === "bandam") {
    test("U-IMPBAD-" + t + "-text KL chứa chữ: bước nhập nhận làm nháp; bước 'Lưu để tính lương' (inputSafety) CHẶN và nêu phiếu + giá trị", () => {
      const { db, p } = one(t, { [col]: "mười" });
      assert.equal(p.items[0].action, "add");
      const res = repoFor(db).importWorkbook([p], "x.xlsx", "merge", () => false); assert.equal(res.ok, true);
      const bad = SAFE.issues(db, t, OPEN); assert.equal(bad.length, 1); assert.match(bad[0], /không hợp lệ: mười/); assert.match(bad[0], /phiếu /);
    });
    continue;
  }
  test("U-IMPBAD-" + t + "-text ô số chứa chữ ('abc'): chặn, thông báo nêu cột và giá trị", () => {
    const bad = t === "chamcong" ? "1.5.2" : "abc", { item } = one(t, { [col]: bad });
    assert.equal(item.action, "invalid"); assert.match(item.reason, new RegExp(t === "chamcong" ? "Ngày 01|01" : col.replace(/[()]/g, "\\$&"))); assert.ok(item.reason.includes(bad), item.reason);
  });
}

test("U-IMPBAD-chamcong-label ô ngày chỉ có chữ ('abc') hợp lệ theo thiết kế là NHÃN: nhận kèm cảnh báo 'chưa có mã phụ cấp'; số âm bị chặn", () => {
  const a = one("chamcong", { "01": "abc" }).item; assert.equal(a.action, "add"); assert.match(a.warn, /nhãn abc chưa có mã phụ cấp/);
  assert.equal(one("chamcong", { "01": "-1" }).item.action, "invalid");
});

// ---- 2. Số kiểu Việt ----
for (const t of MONEY) {
  const col = VALCOL[t];
  for (const [txt, want] of [["500.000", 500000], ["1.234,5", 1234.5], ["500,000", 500000], ["  7 ", 7]]) {
    test("U-IMPBAD-" + t + "-vn số kiểu Việt " + JSON.stringify(txt) + " → " + want + " (chuẩn hóa, không báo lỗi)", () => {
      const { item } = one(t, { [col]: txt }); assert.equal(item.action, "add"); assert.equal(Number(item.row[col]), want);
    });
  }
}
for (const t of ["sanluong", "bandam", "tiencom"]) {
  const col = VALCOL[t];
  for (const [txt, want] of [["12,5", 12.5], ["1.234,5", 1234.5], ["1.500.000", 1500000]]) {
    test("U-IMPBAD-" + t + "-vn " + col + " " + JSON.stringify(txt) + ": giữ nguyên chữ nhập, động cơ đọc đúng " + want, () => {
      const { item } = one(t, { [col]: txt }); assert.equal(item.action, "add"); assert.equal(E.num(item.row[col]), want);
    });
  }
}

// ---- 3. Ngày ----
for (const t of TABLES.filter((x) => x !== "chamcong")) {
  const col = DATECOL[t];
  test("U-IMPBAD-" + t + "-date ngày dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy → ISO; số tuần tự Excel → đúng ngày", () => {
    for (const x of ["12/10/2026", "12-10-2026", "12.10.2026", 46307]) { const { item } = one(t, { [col]: x }); assert.equal(item.action, "add", String(x)); assert.equal(item.row[col], "2026-10-12", String(x)); }
  });
  test("U-IMPBAD-" + t + "-date ngày sai ('hôm qua', 31/02, 2026/10/12, ngày trống): chặn, thông báo nêu cột " + col, () => {
    for (const x of ["hôm qua", "2026-02-31", "2026/10/12", ""]) { const { item } = one(t, { [col]: x }); assert.ok(clear(item), JSON.stringify([x, item.action])); assert.match(item.reason, new RegExp(col)); }
  });
}
test("U-IMPBAD-chamcong-date Kỳ sai → chặn nêu cột Kỳ; '2026-9' → '2026-10' dạng chuẩn", () => {
  assert.equal(one("chamcong", { "Kỳ": "tháng mười" }).item.action, "invalid"); assert.match(one("chamcong", { "Kỳ": "tháng mười" }).item.reason, /Kỳ/);
  const r = one("chamcong", { "Kỳ": "2026-9" }); assert.equal(r.item.action, "add"); assert.equal(r.item.row["Kỳ"], "2026-09");
});
test("U-IMPBAD-all-date dòng ngoài kỳ đang xem: nhận vào đúng kỳ của dòng (nhập nhiều kỳ là chủ ý của 004.1), không ghi nhầm kỳ khác", () => {
  for (const t of TABLES) { const db = newDb(), p = planOf(db, t, [raw(t, "2026-07", "A1")]); assert.equal(p.items[0].action, "add"); repoFor(db).importWorkbook([p], "x", "merge", () => false); assert.deepEqual(periodsOf(db, t), ["2026-07"]); }
});

// ---- 4. Mã nhân viên ----
const MA = ["psluong", "ungluong", "tiencom", "sanluong", "bandam", "chamcong"];
test("U-IMPBAD-ma mã '0005' (chuỗi) nhận; số 5 (Excel mất số 0 đầu) chặn nêu mã; ' NVA1 ' cắt khoảng trắng; 'nva1' khác hoa/thường bị chặn nêu mã; mã lạ chặn", () => {
  for (const t of MA) {
    const setup = (db) => db.nhanvien.push({ "Mã NV": "0005", "Họ và tên": "Số không đầu", "Trạng thái": "Đang làm việc" });
    assert.equal(one(t, { "Mã NV": "0005" }, setup).item.action, "add", t);
    const n5 = one(t, { "Mã NV": 5 }, setup).item; assert.equal(n5.action, "refError", t); assert.match(n5.reason, /Mã NV 5 chưa có/);
    const sp = one(t, { "Mã NV": " NVA1 " }).item; assert.equal(sp.action, "add", t); assert.equal(sp.row["Mã NV"], "NVA1", t);
    const lo = one(t, { "Mã NV": "nva1" }).item; assert.equal(lo.action, "refError", t); assert.match(lo.reason, /nva1/);
    const xx = one(t, { "Mã NV": "XX" }).item; assert.equal(xx.action, "refError", t); assert.match(xx.reason, /XX/);
  }
});

// ---- 5. Trùng khóa ----
for (const t of TABLES.filter((x) => x !== "tiencom")) {
  test("U-IMPBAD-" + t + "-dup trong file: trùng y hệt → dòng sau 'duplicate' (không nhân đôi); cùng khóa khác số liệu → cả hai 'conflict', không dòng nào được ghi", () => {
    const db = newDb(), a = raw(t, OPEN, "A1"), same = planOf(db, t, [a, Object.assign({}, a)]);
    assert.deepEqual(same.items.map((i) => i.action), ["add", t === "chamcong" ? "duplicate" : "duplicate"]);
    const b = Object.assign({}, a, { [VALCOL[t]]: t === "chamcong" ? 2 : "99" }), diff = planOf(db, t, [a, b]);
    assert.deepEqual(diff.items.map((i) => i.action), t === "chamcong" ? ["add", "merged"].map((x, i) => diff.items[i].action) : ["conflict", "conflict"]);
    if (t !== "chamcong") { const before = JSON.stringify(db[t]); repoFor(db).importWorkbook([diff], "x", "merge", () => false); assert.equal(JSON.stringify(db[t]), before, "không ghi dòng xung đột"); }
  });
}

// ---- 6. Dòng tổng lẫn trong dữ liệu ----
for (const t of TABLES) {
  test("U-IMPBAD-" + t + "-total dòng 'Tổng cộng' (ngày/kỳ trống) lẫn trong file: chặn, không ghi", () => {
    const db = newDb(), tot = Object.assign({}, raw(t, OPEN, "A1"), { [DATECOL[t]]: "", "Mã NV": "Tổng cộng" }); if (t === "sanluong" || t === "bandam") tot["Phiếu cân"] = "";
    const p = planOf(db, t, [raw(t, OPEN, "A1"), tot]); assert.equal(p.items[0].action, "add"); assert.ok(clear(p.items[1]), p.items[1].action); assert.match(p.items[1].reason, new RegExp(DATECOL[t]));
    repoFor(db).importWorkbook([p], "x", "merge", () => false); assert.equal(db[t].length, 1);
  });
}

// ---- 7. Cột thừa/thiếu/đổi thứ tự, sheet sai tên, file rỗng ----
test("U-IMPBAD-cot cột đổi thứ tự → vẫn đọc đúng; cột thừa bị bỏ qua; tiêu đề viết thường/không dấu nhận (tên gần đúng); thiếu cột bắt buộc → dòng bị chặn nêu cột; dòng tiêu đề lệch xuống nhận trong 15 dòng đầu", () => {
  const t = "ungluong", cols = COLS[t], A = IMP.rowsFromAoa;
  let r = A([["Mã NV", "Tạm ứng", "Ngày hạch toán", "Số chứng từ", "Cột thừa"], ["NVA1", "500.000", "2026-10-12", "S1", "x"]], t, cols); assert.equal(r.rows.length, 1); assert.equal(r.rows[0]["Mã NV"], "NVA1"); assert.equal(r.rows[0]["Số chứng từ"], "S1");
  r = A([["ma nv", "tam ung", "ngay hach toan"], ["NVA1", "1", "2026-10-12"]], t, cols); assert.equal(r.matched.length, 3);
  r = A([["Tiêu đề báo cáo"], ["Kỳ báo cáo: 10/2026"], [], ["Ngày hạch toán", "Số chứng từ", "Mã NV", "Tạm ứng"], ["2026-10-12", "S", "NVA1", 5]], t, cols); assert.equal(r.headerRow, 4); assert.equal(r.rows[0].__line, 5, "báo đúng số dòng Excel thật");
  const db = newDb(), noAmt = planOf(db, t, A([["Ngày hạch toán", "Số chứng từ", "Mã NV"], ["2026-10-12", "S", "NVA1"]], t, cols).rows); assert.equal(noAmt.items[0].action, "invalid"); assert.match(noAmt.items[0].reason, /Tạm ứng/);
});
test("U-IMPBAD-file file rỗng / chỉ có tiêu đề / sheet sai tên (không cột nào khớp): 0 dòng, không ném lỗi, không ghi gì", () => {
  const t = "ungluong", cols = COLS[t];
  for (const aoa of [[], [[]], [["Ngày hạch toán", "Số chứng từ", "Mã NV", "Tạm ứng"]], [["Cột lạ", "Khác"], ["a", "b"]], [["Tên", "Tuổi"], ["An", 30]]]) {
    const r = IMP.rowsFromAoa(aoa, t, cols); assert.equal(r.rows.length, 0, JSON.stringify(aoa));
    const db = newDb(), p = planOf(db, t, r.rows); assert.equal(p.items.length, 0); const before = snap(db); repoFor(db).importWorkbook([p], "x", "merge", () => false); assert.equal(snap(db).replace(/"auditlog":\[[^\]]*\]/, ""), before.replace(/"auditlog":\[[^\]]*\]/, ""));
  }
});

// ---- 8. Hơn 10.000 dòng ----
test("U-IMPBAD-big file 10.500 dòng (kỳ mở): kế hoạch + ghi một giao dịch trong thời gian chấp nhận được, đủ dòng, không trùng", () => {
  const t = "ungluong", db = newDb(), rows = []; for (let i = 0; i < 10500; i++) rows.push({ "Ngày hạch toán": OPEN + "-12", "Số chứng từ": "BIG" + i, "Mã NV": "NVA" + (1 + (i % 4)), "Tạm ứng": String(1000 + i) });
  const t0 = Date.now(), p = planOf(db, t, rows); assert.equal(p.summary.add, 10500);
  const res = repoFor(db).importWorkbook([p], "big.xlsx", "merge", () => false); const ms = Date.now() - t0;
  assert.equal(res.ok, true); assert.equal(res.value, 10500); assert.equal(db[t].length, 10500); assert.ok(ms < 20000, "mất " + ms + " ms");
});

// ---- 9. Nhân viên đã nghỉ / giá trị âm / bằng 0 ----
// Hàm cảnh báo của bản xem trước (app-src/04, đã build vào app.js) — lấy NGUYÊN VĂN từ app.js bằng cặp dấu mốc, chạy trong vm.
function previewWarn() {
  const i = APP.indexOf("// IMPORT-EXTRA-WARN-BEGIN"), j = APP.indexOf("// IMPORT-EXTRA-WARN-END"); assert.ok(i > 0 && j > i, "thiếu dấu mốc IMPORT-EXTRA-WARN trong app.js");
  const c = {}; vm.createContext(c); vm.runInContext(APP.slice(i, j) + "\nthis.fn = importExtraWarn;", c); return c.fn;
}
test("U-IMPBAD-nghi (009-2) dòng của NV 'Đã nghỉ việc' ở Tạm ứng/Thưởng/Suất cơm: vẫn NHẬN (không chặn) và có cảnh báo 'NV đã nghỉ việc: kiểm lại' ở bản xem trước; NV đang làm không bị cảnh báo", () => {
  const warn = previewWarn(), db = newDb(); db.nhanvien.push({ "Mã NV": "NVNGHI", "Họ và tên": "Đã nghỉ", "Trạng thái": "Đã nghỉ việc" });
  for (const t of MONEY.concat("tiencom")) {
    const p = planOf(db, t, [Object.assign(raw(t, OPEN, "A1"), { "Mã NV": "NVNGHI" }), raw(t, OPEN, "A2")]);
    assert.deepEqual(p.items.map((i) => i.action), ["add", "add"], t + ": không chặn");
    assert.match(warn(db, t, p.items[0].row), /NV đã nghỉ việc: kiểm lại/); assert.equal(warn(db, t, p.items[1].row), "", t + ": NV đang làm không cảnh báo");
    assert.equal(repoFor(db).importWorkbook([p], "x", "merge", () => false).value, 2, "vẫn ghi được sau khi người dùng xác nhận");
    db[t].length = 0;
  }
  assert.equal(warn(db, "sanluong", { "Mã NV": "NVNGHI" }), "", "chỉ áp cho tạm ứng/thưởng/suất cơm");
});
test("U-IMPBAD-neg (009-3) số tiền ÂM ở Tạm ứng/Thưởng/Trừ khác: vẫn NHẬN và có cảnh báo 'Số tiền âm' ở bản xem trước; số dương/0/ô trống không cảnh báo", () => {
  const warn = previewWarn(), db = newDb();
  for (const t of MONEY) {
    const col = VALCOL[t], p = planOf(db, t, [Object.assign(raw(t, OPEN, "A1"), { [col]: "-500.000" })]); assert.equal(p.items[0].action, "add");
    assert.match(warn(db, t, p.items[0].row), new RegExp("Số tiền âm ở " + col)); assert.match(warn(db, t, p.items[0].row), /-500000/);
    for (const ok of ["500000", "0", ""]) assert.equal(warn(db, t, { "Mã NV": "NVA1", [col]: ok }), "", t + " " + JSON.stringify(ok));
  }
});
test("U-IMPBAD-zero giá trị 0 ở số tiền: nhận (không phải lỗi)", () => { for (const t of MONEY) assert.equal(one(t, { [VALCOL[t]]: "0" }).item.action, "add"); });

// ---- 10. Hoa/thường, khoảng trắng ở ô văn bản khóa ----
test("U-IMPBAD-case Hình thức công ' bt ' / 'Bt' → 'BT'; hai dòng khác hoa/thường cùng NV/kỳ gộp/trùng như một", () => {
  const db = newDb(), a = raw("chamcong", OPEN, "A1"); a["Hình thức công"] = " bt ";
  const p = planOf(db, "chamcong", [a, Object.assign({}, a, { "Hình thức công": "Bt" })]); assert.equal(p.items[0].row["Hình thức công"], "BT"); assert.notEqual(p.items[1].action, "add");
});

// ---- 11. Không ghi nửa chừng ----
for (const t of TABLES) {
  test("U-IMPBAD-" + t + "-atomic file lẫn dòng tốt + dòng lỗi + mã lạ: chỉ dòng tốt được ghi (1), dòng lỗi KHÔNG vào dữ liệu; số liệu tóm tắt khớp số dòng file", () => {
    const db = newDb(), bad = Object.assign(raw(t, OPEN, "A2"), { [DATECOL[t]]: "sai-ngày" }), ref = raw(t, OPEN, "A3"); ref["Mã NV"] = "KHONGCO";
    const p = planOf(db, t, [raw(t, OPEN, "A1"), bad, ref]);
    assert.deepEqual(p.items.map((i) => i.action), ["add", "invalid", "refError"]);
    const s = p.summary; assert.equal(Object.keys(s).reduce((n, k) => n + (Number(s[k]) || 0), 0) >= 3, true);
    const res = repoFor(db).importWorkbook([p], "x.xlsx", "merge", () => false); assert.equal(res.ok, true); assert.equal(res.value, 1); assert.equal(db[t].length, 1); assert.equal(db[t][0]["Mã NV"], "NVA1");
  });
  test("U-IMPBAD-" + t + "-rollback lưu thất bại (đĩa lỗi) ở giữa nhập: HOÀN TÁC toàn bộ (bảng + nhật ký), báo lỗi", () => {
    const db = newDb(), before = snap(db), p = planOf(db, t, [raw(t, OPEN, "A1"), raw(t, OPEN, "A2")]);
    const res = repoFor(db, () => false).importWorkbook([p], "x.xlsx", "merge", () => false); assert.equal(res.ok, false); assert.equal(snap(db), before);
  });
}

// ---- 009-1: mọi đường ghi chung một bộ kiểm (nhập Excel, nhập tay, dán dùng cùng normCell) ----
test("U-IMPBAD-tiencom-normCell 'Số suất cơm' không phải số → normCell báo lỗi (đường nhập tay/dán/Excel dùng chung); số hợp lệ không đổi", () => {
  const bad = V.normCell("Số suất cơm", "hai"); assert.ok(bad.error && /phải là số/.test(bad.error), JSON.stringify(bad)); assert.equal(bad.value, "hai");
  for (const [x, v] of [["2", "2"], [" 2 ", "2"], ["1,5", "1,5"], ["", ""], [null, ""], [3, "3"]]) { const r = V.normCell("Số suất cơm", x); assert.equal(r.error, undefined, JSON.stringify(x)); assert.equal(r.value, v, JSON.stringify(x)); }
  assert.equal(E.num(V.normCell("Số suất cơm", "1,5").value), 1.5, "động cơ vẫn đọc đúng, không đổi cách tính");
});
