// Kho SQLite làm nguồn chính (HAK_STORAGE=sqlite): lưu/đọc lại, khởi động lại, chuyển lần đầu, xuất data.json, bảo vệ cũ, xung đột, mất điện giả lập. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { createStorage } = require("../../main/storage.js");
const store = require("../../main/sqlite-store.js");
const { fixture } = require("../fixtures/production-carry");

// CI đặt hai cờ nghiệm thu cho bộ E2E cũ; các test kho này kiểm hành vi THẬT (xuất trễ, không nhận data.json lạ) nên gỡ chúng trong tiến trình test này.
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const dirOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-sq-"));
const doc = () => { const d = JSON.parse(JSON.stringify(fixture())); d.nhanvien.push({ "Mã NV": "0005", "Họ và tên": "Nguyễn Văn Ánh", "Ghi chú": null }); return d; };
const opts = { exportDelayMs: 20 };

test("U-SS-01 hồ sơ mới: lưu → đọc lại; khởi động lại vẫn đúng; data.json là bản xuất đúng từng ký tự sau syncJson/close", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, opts), d = doc();
  assert.deepEqual(s.load(), { ok: true, text: null });
  assert.equal(s.save(JSON.stringify(d)), true);
  assert.equal(s.load().text, JSON.stringify(d));
  d.nhanvien[0]["Họ và tên"] = "Đã sửa"; assert.equal(s.save(JSON.stringify(d)), true);
  s.close();
  assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), JSON.stringify(d), "data.json = bản xuất đủ giao dịch");
  assert.match(fs.readFileSync(path.join(dir, "hak-storage.txt"), "utf8"), /data\.sqlite/);
  const s2 = createSqliteStorage(dir, opts), r = s2.load(); assert.equal(r.ok, true); assert.equal(r.text, JSON.stringify(d)); s2.close();
});

test("U-SS-02 mất điện/đóng đột ngột: SQLite đã commit nhưng data.json chưa xuất → mở lại vẫn thấy ĐỦ giao dịch và xuất lại data.json", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, { exportDelayMs: 60000 }), d = doc();
  s.save(JSON.stringify(d)); s.syncJson(); d.nhanvien[0]["Họ và tên"] = "Chưa kịp xuất"; assert.equal(s.save(JSON.stringify(d)), true);
  assert.notEqual(fs.readFileSync(path.join(dir, "data.json"), "utf8"), JSON.stringify(d), "data.json đang cũ (mô phỏng chết trước khi xuất)");
  // không gọi close(): giả lập tiến trình bị kill; mở lại như phiên mới
  const s2 = createSqliteStorage(dir, opts), r = s2.load(); assert.equal(r.ok, true); assert.equal(r.text, JSON.stringify(d));
  assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), JSON.stringify(d), "xuất lại khi khởi động"); s2.close(); s.close();
});

test("U-SS-03 chuyển lần đầu từ data.json có sẵn: sao lưu trước, đối chiếu, nguồn chính SQLite; data.json giữ nguyên nội dung", () => {
  const dir = dirOf(), d = doc(), legacy = createStorage(dir); assert.equal(legacy.save(JSON.stringify(d, null, 1)), true); // định dạng có thụt lề, như file cũ
  const before = fs.readFileSync(path.join(dir, "data.json"), "utf8");
  const s = createSqliteStorage(dir, opts), r = s.load();
  assert.equal(r.ok, true); assert.deepEqual(JSON.parse(r.text), d);
  assert.ok(s.list().some((b) => b.tag === "truoc-chuyen-sqlite"), "có bản sao lưu trước chuyển");
  const db = store.open(path.join(dir, "data.sqlite"), { readonly: true }); try { assert.equal(db.prepare("SELECT value FROM meta WHERE key='primary'").get().value, "1"); } finally { db.close(); }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8")), d, "data.json còn đúng dữ liệu"); assert.ok(before.length > 0); s.close();
  const s2 = createSqliteStorage(dir, opts); assert.deepEqual(JSON.parse(s2.load().text), d); s2.close();
});

test("U-SS-04 chuyển hỏng giữa chừng (file nguồn không hợp lệ) → báo lỗi, data.json GIỮ NGUYÊN, không có data.sqlite dở", () => {
  const dir = dirOf(); fs.writeFileSync(path.join(dir, "data.json"), "{ hỏng");
  const s = createSqliteStorage(dir, opts), r = s.load(); assert.equal(r.ok, false); assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), "{ hỏng"); assert.ok(!fs.existsSync(path.join(dir, "data.sqlite")));
});

test("U-SS-05 data.json bị thay ngoài app → KHÔNG đoán: báo xung đột, từ chối ghi; cất file lạ rồi dùng SQLite", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, opts), d = doc(); s.save(JSON.stringify(d)); s.close();
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ nhanvien: [{ "Mã NV": "LẠ" }] }));
  const s2 = createSqliteStorage(dir, opts), r = s2.load(); assert.equal(r.ok, false); assert.match(r.error, /không phải bản xuất gần nhất của kho SQLite/); assert.match(r.error, /Chênh lệch/); assert.doesNotMatch(r.error, /mới hơn|bản đầy đủ hơn|Sửa lần cuối/, "không dùng ngày giờ file làm căn cứ");
  assert.match(String(s2.save(JSON.stringify(d))), /không phải bản xuất gần nhất/, "không ghi khi đang xung đột");
  const moved = s2.quarantineCorrupt(); assert.match(moved, /^data\.corrupt_.*\.json\.bak$/);
  assert.equal(s2.load().ok, true); assert.deepEqual(JSON.parse(s2.load().text), d); assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8")), d); s2.close();
});

test("U-SS-06 bảo vệ cũ còn nguyên: sao lưu đầu ngày chụp trạng thái TRƯỚC thay đổi; bản theo năm; giảm >50% tạo bản trước-giảm", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, opts), d = doc(); s.save(JSON.stringify(d)); // lần lưu đầu: chưa có trạng thái trước
  d.nhanvien[0]["Họ và tên"] = "Sau thay đổi"; s.save(JSON.stringify(d));
  const daily = s.list().find((b) => b.tag === "daily"); assert.ok(daily, "có bản đầu ngày");
  assert.deepEqual(JSON.parse(s.readBackup(daily.name).text), doc(), "bản đầu ngày = trạng thái trước thay đổi");
  assert.ok(s.list().some((b) => b.tag.startsWith("nam-")), "bản theo năm");
  const big = doc(); big.chamcong = Array.from({ length: 400 }, (_, i) => ({ "Kỳ": "2026-09", "Mã NV": "N" + i, "01": "1" })); s.save(JSON.stringify(big)); s.save(JSON.stringify(doc()));
  assert.ok(s.list().some((b) => b.tag === "truoc-giam-du-lieu"), "giảm đột ngột → có bản trước-giảm"); s.close();
});

test("U-SS-07 mọi hàm sao lưu đọc data.json MỚI: backup/changedSinceBackup/backupOnClose xuất trước khi đọc", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, { exportDelayMs: 60000 }), d = doc(); s.save(JSON.stringify(d));
  const f = s.backup("manual"); assert.ok(f); assert.deepEqual(JSON.parse(s.readBackup(f).text), d, "bản sao lưu chứa dữ liệu mới nhất dù data.json chưa kịp xuất");
  d.nhanvien[0]["Họ và tên"] = "X"; s.save(JSON.stringify(d)); assert.equal(s.changedSinceBackup(), true); s.close();
});

test("U-SS-08 sig đổi theo mỗi lần lưu (để write-policy không dùng cache cũ); schema mới hơn app bị từ chối; dữ liệu không hợp lệ bị từ chối", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, opts), d = doc(); s.save(JSON.stringify(d)); const a = s.sig(); d.nhanvien[0]["Họ và tên"] = "Y"; s.save(JSON.stringify(d)); assert.notEqual(s.sig(), a);
  assert.match(String(s.save("không phải json")), /không hợp lệ/); assert.match(String(s.save("[1,2]")), /không hợp lệ/); s.close();
  const db = store.open(path.join(dir, "data.sqlite")); db.exec("PRAGMA user_version = " + (store.SCHEMA_VERSION + 1)); store.close(db);
  const s2 = createSqliteStorage(dir, opts), r2 = s2.load(); assert.equal(r2.ok, false); assert.match(r2.error, /mới hơn app/); assert.match(String(s2.save(JSON.stringify(d))), /mới hơn app/, "không ghi đè khi không mở được kho");
});

test("U-SS-09 từ v2.0.29 mặc định là SQLite; HAK_STORAGE=json quay về data.json; thiếu node:sqlite thì dùng data.json", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");
  assert.match(src, /if \(process\.env\.HAK_STORAGE === "json"\) return createStorage\(dir\);/);
  assert.match(src, /try \{ require\("node:sqlite"\); \} catch \(e\) \{ return createStorage\(dir\); \}/);
  assert.match(src, /return require\("\.\/main\/sqlite-storage"\)\.createSqliteStorage\(dir\);/);
});

test("U-SS-10 tiến trình phụ (kho năm) ghi data.json bằng kho JSON → adoptJson đưa vào SQLite; không còn xung đột khi mở lại", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, opts), d = doc(); s.save(JSON.stringify(d)); s.syncJson();
  const worker = createStorage(dir); d.nhanvien.push({ "Mã NV": "TỪ-WORKER" }); assert.equal(worker.save(JSON.stringify(d)), true); // như year-archive-worker
  assert.equal(s.adoptJson(), true); assert.equal(JSON.parse(s.load().text).nhanvien.at(-1)["Mã NV"], "TỪ-WORKER"); s.close();
  const s2 = createSqliteStorage(dir, opts), r = s2.load(); assert.equal(r.ok, true); assert.equal(JSON.parse(r.text).nhanvien.at(-1)["Mã NV"], "TỪ-WORKER"); s2.close();
});

test("U-SS-11 lỗi ghi SQLite giữa chừng: save trả lỗi, KHÔNG báo thành công, dữ liệu trước đó nguyên vẹn, lưu lại sau khi hết lỗi được", () => {
  const cset = require("../../main/sqlite-changeset.js"), real = cset.applyToDb;
  const dir = dirOf(), s = createSqliteStorage(dir, opts), d = doc(); s.save(JSON.stringify(d));
  const d2 = JSON.parse(JSON.stringify(d)); d2.nhanvien[0]["Họ và tên"] = "Lưu lỗi";
  cset.applyToDb = (db, cs) => { real(db, cs); throw new Error("SYNTHETIC_DISK_FAILURE"); }; // đã ghi một phần rồi lỗi → giao dịch phải hoàn tác
  try { assert.match(String(s.save(JSON.stringify(d2))), /SYNTHETIC_DISK_FAILURE/); } finally { cset.applyToDb = real; }
  assert.deepEqual(JSON.parse(s.load().text), d, "bộ nhớ không đi trước đĩa"); s.close();
  const s2 = createSqliteStorage(dir, opts); assert.deepEqual(JSON.parse(s2.load().text), d, "đĩa giữ nguyên trạng thái trước"); assert.equal(s2.save(JSON.stringify(d2)), true); assert.equal(JSON.parse(s2.load().text).nhanvien[0]["Họ và tên"], "Lưu lỗi"); s2.close();
});

test("U-SS-12 tự kiểm đóng gói: vòng lưu/sửa/đóng/mở/đọc đạt, dọn sạch thư mục tạm", () => {
  const st = require("../../main/sqlite-selftest.js"), dir = path.join(os.tmpdir(), "hak-selftest-" + process.pid), r = st.run(dir);
  assert.equal(r.ok, true, JSON.stringify(r)); assert.ok(/^\d+\.\d+/.test(r.sqliteVersion)); assert.ok(r.steps.length >= 6 && r.steps.every((x) => x.pass)); assert.ok(!fs.existsSync(dir));
});

test("U-SS-13 khóa phiên ghi: tiến trình khác còn sống giữ kho → từ chối mở, không ghi; khóa của tiến trình đã chết bị bỏ qua; đóng thì nhả khóa", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, opts); assert.equal(s.save(JSON.stringify(doc())), true);
  const lock = path.join(dir, "data.sqlite.lock"); assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).pid, process.pid); s.close(); assert.ok(!fs.existsSync(lock), "đóng thì nhả khóa");
  fs.writeFileSync(lock, JSON.stringify({ pid: process.ppid, boot: Math.round(Date.now() / 1000 - os.uptime()), at: new Date().toISOString() })); // tiến trình cha: còn sống, khác pid hiện tại
  const t = createSqliteStorage(dir, opts), r = t.load(); assert.equal(r.ok, false); assert.match(r.error, /tiến trình khác \(PID \d+\)/);
  assert.match(String(t.save(JSON.stringify(doc()))), /tiến trình khác/, "không ghi khi đang bị khóa");
  fs.writeFileSync(lock, JSON.stringify({ pid: process.ppid, boot: 1000, at: "2020-01-01T00:00:00Z" })); // khóa của lần khởi động máy khác: PID có thể đã bị cấp lại → bỏ qua
  { const u0 = createSqliteStorage(dir, opts); assert.equal(u0.load().ok, true); u0.close(); }
  fs.writeFileSync(lock, JSON.stringify({ pid: 2147483646, boot: Math.round(Date.now() / 1000 - os.uptime()), at: "2020-01-01T00:00:00Z" })); // pid không tồn tại = khóa mồ côi
  const u = createSqliteStorage(dir, opts); assert.equal(u.load().ok, true); u.close();
});
