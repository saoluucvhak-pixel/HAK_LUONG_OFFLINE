"use strict";
// Kho SQLite "bóng" (tools/sqlite-shadow.js): chỉ để so sánh, app không dùng. Xem MIGRATION_PLAN §2.
// Các test này chứng minh: ghi rồi đọc lại không sai một ký tự; tính lương hai nguồn giống hệt; đổi ít thì ghi ít.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
const S = require("../../tools/sqlite-shadow.js");
const { regressionDataset } = require("../fixtures/build.js");

const dataset = (n) => Object.assign(regressionDataset(n), {
  schemaVersion: 2,
  congty: { "Tên công ty": "CÔNG TY THỬ NGHIỆM", "Mã số thuế": "0000000000" },
  caidat: { quyChe: "2026", ghiChu: "dấu \"nháy\", xuống\ndòng, emoji 🧾, tiếng Việt: Nguyễn Thị Ánh" },
  rong: [], khongCo: null
});
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hak-shadow-test-")), "shadow.sqlite");

test("U-SQL-01 ghi rồi đọc lại giống hệt JSON từng ký tự (thứ tự khóa, thứ tự dòng, số 0 đầu, chuỗi rỗng, null, Unicode)", () => {
  const data = dataset(40);
  data.canhan = [{ "Mã NV": "NV001", "CCCD": "001234567890", "SĐT": "0901234567", "Ghi chú": "" }];
  const db = S.open(":memory:"), stats = S.sync(db, data), v = S.verify(db, data);
  assert.equal(v.identical, true); assert.equal(v.integrity, "ok"); assert.equal(v.sha256Json, v.sha256Shadow);
  assert.deepEqual(Object.keys(S.read(db)), Object.keys(data), "giữ thứ tự bảng");
  assert.equal(stats.updated + stats.deleted + stats.unchanged, 0);
  assert.equal(stats.inserted, Object.values(data).filter(Array.isArray).reduce((a, t) => a + t.length, 0));
  db.close();
});

test("U-SQL-02 tính lương từ JSON và từ kho bóng: không khác biệt ở mọi kỳ có chấm công", () => {
  const data = dataset(60), db = S.open(":memory:"); S.sync(db, data);
  const r = S.comparePayroll(data, S.read(db));
  assert.deepEqual(S.periods(data), [[2026, 8], [2026, 9], [2026, 10]]);
  assert.equal(r.periods, 3); assert.ok(r.employees >= 150, "phải thật sự tính lương cho nhiều người, được " + r.employees);
  assert.deepEqual(r.different, []);
  db.close();
});

test("U-SQL-03 đổi ít thì ghi ít: sửa 1 dòng → ghi đúng 1 dòng; không đổi → không ghi dòng nào", () => {
  const data = dataset(50), db = S.open(":memory:"); S.sync(db, data);
  const total = Object.values(data).filter(Array.isArray).reduce((a, t) => a + t.length, 0);
  let s = S.sync(db, data);
  assert.deepEqual([s.inserted, s.updated, s.deleted, s.unchanged], [0, 0, 0, total]);
  data.chamcong[7]["05"] = 0.5;
  s = S.sync(db, data);
  assert.deepEqual([s.inserted, s.updated, s.deleted, s.unchanged], [0, 1, 0, total - 1]);
  assert.equal(S.verify(db, data).identical, true);
  db.close();
});

test("U-SQL-04 thêm dòng, xóa dòng, thêm bảng, bỏ bảng, đổi bảng thành giá trị và đổi thứ tự bảng đều đọc lại đúng", () => {
  const data = dataset(20), db = S.open(":memory:"); S.sync(db, data);
  data.nhanvien.push({ "Mã NV": "NV999", "Họ và tên": "Người mới" });
  data.chamcong.splice(3, 2);
  data.bangmoi = [{ a: 1 }, { a: 2 }];
  delete data.rong;
  data.psluong = { daDoi: "thành đối tượng" };
  const reordered = {}; Object.keys(data).reverse().forEach((k) => { reordered[k] = data[k]; });
  const s = S.sync(db, reordered), v = S.verify(db, reordered);
  assert.equal(v.identical, true); assert.equal(v.integrity, "ok");
  assert.ok(s.inserted >= 3 && s.deleted >= 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM row WHERE tbl IN ('rong', 'psluong')").get().n, 0, "không để lại dòng mồ côi");
  db.close();
});

test("U-SQL-05 lỗi giữa chừng thì hoàn tác trọn giao dịch: kho bóng giữ nguyên trạng thái trước", () => {
  const data = dataset(10), db = S.open(":memory:"); S.sync(db, data);
  const bad = JSON.parse(JSON.stringify(data));
  bad.nhanvien[0]["Họ và tên"] = "Đã sửa";
  bad.chamcong.push(undefined); // không lưu được dưới dạng JSON → ném lỗi sau khi đã ghi vài dòng
  assert.throws(() => S.sync(db, bad), /không lưu được/);
  assert.equal(S.verify(db, data).identical, true, "dòng đã sửa trước khi lỗi phải được hoàn tác");
  assert.throws(() => S.sync(db, [1, 2]), /đối tượng/);
  db.close();
});

test("U-SQL-06 kho bóng trên đĩa: đóng, mở lại vẫn đúng; không ghi đè file SQLite lạ; công cụ dòng lệnh không đụng file JSON gốc", () => {
  const data = dataset(15), file = tmp();
  let db = S.open(file); S.sync(db, data); db.close();
  db = S.open(file); assert.equal(S.verify(db, data).identical, true); db.close();

  const foreign = tmp(), { DatabaseSync } = require("node:sqlite"), other = new DatabaseSync(foreign);
  other.exec("CREATE TABLE khac (x)"); other.close();
  assert.throws(() => S.open(foreign), /không phải kho bóng/);

  const src = path.join(path.dirname(file), "data.json"), text = JSON.stringify(data); fs.writeFileSync(src, text);
  const run = cp.spawnSync(process.execPath, [path.join(__dirname, "../../tools/sqlite-shadow.js"), src, path.join(path.dirname(file), "cli.sqlite")], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /GIỐNG HỆT/); assert.match(run.stdout, /không khác biệt/); assert.match(run.stdout, /không bị thay đổi/);
  assert.equal(fs.readFileSync(src, "utf8"), text);
  assert.equal(cp.spawnSync(process.execPath, [path.join(__dirname, "../../tools/sqlite-shadow.js"), src, src], { encoding: "utf8" }).status, 2, "đầu ra trùng file gốc phải bị từ chối");
});

test("U-SQL-07 kho bóng không vào bộ cài và không được app nạp", () => {
  const pkg = require("../../package.json"), read = (f) => fs.readFileSync(path.join(__dirname, "../..", f), "utf8");
  assert.ok(!pkg.build.files.some((f) => /^tools/.test(f)), "tools/ không nằm trong build.files");
  for (const f of ["main.js", "preload.js", "index.html", "app.js"]) assert.doesNotMatch(read(f), /sqlite-shadow|node:sqlite/, f + " không được dùng kho bóng");
  for (const f of fs.readdirSync(path.join(__dirname, "../../main"))) assert.doesNotMatch(read("main/" + f), /sqlite-shadow|node:sqlite/, "main/" + f);
});
