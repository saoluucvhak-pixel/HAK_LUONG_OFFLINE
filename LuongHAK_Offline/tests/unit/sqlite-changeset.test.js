// Bộ thay đổi: apply(prev, diff(prev,next)) == next từng ký tự; ghi vào SQLite chỉ đúng phần đổi và dựng lại khớp. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const store = require("../../main/sqlite-store.js"), cset = require("../../main/sqlite-changeset.js"), M = require("../../main/sqlite-migrate.js"), mirror = require("../../main/sqlite-mirror.js");
const { fixture } = require("../fixtures/production-carry");

const clone = (x) => JSON.parse(JSON.stringify(x));
let seed = 12345; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
function mutate(doc) {
  const d = clone(doc), keys = Object.keys(d).filter((k) => Array.isArray(d[k])), pick = () => keys[rnd(keys.length)];
  for (let i = 0, n = 1 + rnd(4); i < n; i++) {
    const t = pick(), rows = d[t], op = rnd(7);
    if (op === 0) rows.push({ "Mã NV": "N" + rnd(1000), "Ghi chú": "thêm " + rnd(99), _id: rnd(2) ? "id" + rnd(1e6) : undefined });
    else if (op === 1 && rows.length) rows.splice(rnd(rows.length), 1);
    else if (op === 2 && rows.length) rows[rnd(rows.length)]["Sửa"] = "v" + rnd(99);
    else if (op === 3 && rows.length > 1) { const a = rnd(rows.length), b = rnd(rows.length); [rows[a], rows[b]] = [rows[b], rows[a]]; }
    else if (op === 4) rows.splice(rnd(rows.length + 1), 0, { "Chèn": rnd(99) }, { "Chèn": rnd(99) });
    else if (op === 5) d["top" + rnd(3)] = { x: rnd(9), y: [1, null, "ó"] };
    else if (op === 6) { const k = Object.keys(d)[rnd(Object.keys(d).length)]; if (rnd(3) === 0) delete d[k]; else if (rnd(2)) d["bang_moi" + rnd(3)] = [{ a: rnd(9) }, { a: rnd(9) }]; }
  }
  return d;
}

test("U-CS-01 thuộc tính: apply(prev, diff(prev, next)) == next từng ký tự trên 400 biến đổi ngẫu nhiên (thêm/xóa/sửa/đổi chỗ/chèn nhiều/bảng mới/bỏ bảng/giá trị cấp ngoài)", () => {
  let prev = clone(fixture());
  for (let i = 0; i < 400; i++) {
    const next = mutate(prev), cs = cset.diff(prev, next);
    assert.equal(JSON.stringify(cset.apply(prev, cs)), JSON.stringify(next), "lần " + i);
    prev = next;
  }
});

test("U-CS-02 không đổi → change set rỗng; sửa MỘT dòng giữa bảng lớn → đúng 1 dòng; thêm cuối → đúng 1 dòng", () => {
  const d = clone(fixture()); d.chamcong = Array.from({ length: 5000 }, (_, i) => ({ "Kỳ": "2026-09", "Mã NV": "N" + i, "Hình thức công": "BT", "01": "1" }));
  assert.equal(cset.isEmpty(cset.diff(d, clone(d))), true);
  const e1 = clone(d); e1.chamcong[2500]["01"] = "0.5"; const c1 = cset.diff(d, e1); assert.equal(c1.rows, 1); assert.equal(c1.tables.chamcong.updates[0].pos, 2500);
  const e2 = clone(d); e2.chamcong.push({ "Kỳ": "2026-09", "Mã NV": "NEW", "Hình thức công": "BT" }); assert.equal(cset.diff(d, e2).rows, 1);
  const e3 = clone(d); e3.chamcong.splice(10, 1); assert.equal(cset.diff(d, e3).tables.chamcong.remove, 1);
});

test("U-CS-03 ghi vào SQLite chỉ phần đổi và dựng lại KHỚP sau mỗi bước (200 biến đổi ngẫu nhiên, gồm chèn giữa, xóa giữa, đổi chỗ, bảng mới/bỏ)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-cs-")), db = store.open(path.join(dir, "s.sqlite")); store.migrate(db);
  let prev = {}, cur = clone(fixture());
  for (let i = 0; i < 200; i++) {
    const cs = cset.diff(prev, cur); store.tx(db, () => cset.applyToDb(db, cs)); prev = cur;
    assert.equal(JSON.stringify(M.toData(db)), JSON.stringify(cur), "bước " + i);
    assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    cur = mutate(cur);
  }
  store.close(db);
});

test("U-CS-04 sửa một dòng trong bảng 5.000 dòng chỉ ghi vài thay đổi SQLite (không quét lại cả bảng)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-cs-")), db = store.open(path.join(dir, "s.sqlite")); store.migrate(db);
  const d = { chamcong: Array.from({ length: 5000 }, (_, i) => ({ "Mã NV": "N" + i, v: i })) }; store.tx(db, () => cset.applyToDb(db, cset.diff({}, d)));
  const e = clone(d); e.chamcong[1234].v = -1; const total = () => Number(db.prepare("SELECT total_changes() t").get().t), t0 = total();
  const written = store.tx(db, () => cset.applyToDb(db, cset.diff(d, e))); assert.equal(written, 1); assert.ok(total() - t0 <= 3, "thay đổi SQLite: " + (total() - t0));
  store.close(db);
});

test("U-CS-05 mirror: lỗi không ném ra; dữ liệu khớp ở chế độ verify; chuỗi lưu liên tiếp giống đường store-save", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-mir-")), data = path.join(dir, "data.json"), m = mirror.create(data, "verify");
  let cur = clone(fixture()); for (let i = 0; i < 30; i++) { m.mirror(JSON.stringify(cur)); cur = mutate(cur); }
  m.mirror("{ không phải json"); m.mirror(JSON.stringify(cur)); m.close();
  const log = fs.readFileSync(path.join(dir, "shadow.log"), "utf8"); assert.ok(!/MISMATCH/.test(log), log); assert.match(log, /ERROR/, "lỗi được ghi log, không ném");
  assert.ok((log.match(/ OK /g) || []).length >= 20, "số lần ghi OK: " + (log.match(/ OK /g) || []).length);
  const back = M.exportJson(path.join(dir, "shadow.sqlite"), path.join(dir, "back.json")); assert.ok(back.bytes > 0);
  assert.equal(fs.readFileSync(path.join(dir, "back.json"), "utf8"), JSON.stringify(cur));
});

test("U-CS-06 bản sao bóng TẮT mặc định: main.js chỉ tạo mirror khi có HAK_SQLITE_SHADOW", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");
  assert.match(src, /if \(process\.env\.HAK_SQLITE_SHADOW\) \{ try \{ shadow = require\("\.\/main\/sqlite-mirror"\)/);
  assert.match(src, /const saveJson = storage\.save; storage\.save = \(text\) => \{ const r = saveJson\(text\); if \(r === true && shadow\) shadow\.mirror\(text\)/, "bọc storage.save (điểm ghi duy nhất)");
  assert.doesNotMatch(src.slice(src.indexOf('ipcMain.on("store-save"'), src.indexOf('ipcMain.on("store-info"')), /shadow/, "store-save không gọi mirror riêng (tránh ghi hai lần)");
  assert.doesNotMatch(src, /sqlite-store\b|sqlite-migrate|sqlite-changeset/, "main.js không nạp lớp thấp của kho trực tiếp (chỉ qua sqlite-storage / sqlite-mirror)");
});
