// Khôi phục TỪ bản chụp SQLite (backups/data-snapshot.sqlite) khi data.sqlite hỏng/mất (chỉ đạo 002). Dữ liệu GIẢ.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const store = require("../../main/sqlite-store.js");
const { fixture } = require("../fixtures/production-carry");
const KILL = path.resolve(__dirname, "../fixtures/sqlite-restore-kill.cjs");
const dirOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-snap-"));
const base = () => JSON.parse(JSON.stringify(fixture()));
const opts = { exportDelayMs: 20 };
const sq = (dir) => path.join(dir, "data.sqlite"), snap = (dir) => path.join(dir, "backups", "data-snapshot.sqlite");
const countRows = (file) => { const db = store.open(file, { readonly: true }); try { return db.prepare("SELECT COUNT(*) AS c FROM records").get().c; } finally { db.close(); } };
const sha = (f) => require("node:crypto").createHash("sha256").update(fs.readFileSync(f)).digest("hex");
/** Dựng hồ sơ: lưu v1 → sao lưu (tạo bản chụp) → lưu thêm v2 (bản chụp KHÔNG có phần này) → đóng. Trả { dir, v1, v2 }. */
function setup() {
  const dir = dirOf(), s = createSqliteStorage(dir, opts), v1 = base();
  assert.equal(s.save(JSON.stringify(v1)), true); assert.ok(s.backup("thu"), "sao lưu JSON thành công"); assert.equal(fs.existsSync(snap(dir)), true, "có bản chụp");
  const v2 = JSON.parse(JSON.stringify(v1)); v2.nhanvien.push({ "Mã NV": "9999", "Họ và tên": "Chỉ có sau bản chụp" });
  assert.equal(s.save(JSON.stringify(v2)), true); s.close();
  return { dir, v1, v2 };
}
const corrupt = (dir) => { fs.truncateSync(sq(dir), 200); for (const x of ["-wal", "-shm"]) fs.rmSync(sq(dir) + x, { force: true }); };
const kept = (dir, re) => fs.readdirSync(dir).filter((f) => re.test(f));

test("U-SNAP-01 data.sqlite hỏng: load báo lỗi kèm thông tin bản chụp hợp lệ; khôi phục cho đúng dữ liệu bản chụp, giữ bản cũ, ghi kiểm toán, ghi tiếp được", () => {
  const { dir, v1 } = setup(); const snapBefore = sha(snap(dir)), rowsSnap = countRows(snap(dir));
  corrupt(dir);
  const s = createSqliteStorage(dir, opts), ld = s.load();
  assert.equal(ld.ok, false); assert.match(ld.error, /Không mở được kho dữ liệu SQLite/);
  assert.equal(ld.snapshot.ok, true, JSON.stringify(ld.snapshot)); assert.equal(ld.snapshot.records, rowsSnap);
  assert.equal(s.needsRecovery(), true);
  const hurt = fs.readFileSync(sq(dir)); // bản hỏng phải còn nguyên để cất
  const r = s.restoreFromSnapshot("Quản trị giả");
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.records, rowsSnap, "số dòng khôi phục = số dòng bản chụp"); assert.equal(r.before, null, "data.sqlite hỏng: không đếm được số dòng trước");
  const after = s.load(); assert.equal(after.ok, true);
  const d = JSON.parse(after.text);
  assert.equal(d.nhanvien.length, v1.nhanvien.length, "đúng dữ liệu bản chụp (không có dòng 9999)");
  assert.equal(d.nhanvien.some((x) => x["Mã NV"] === "9999"), false);
  const last = d.auditlog[d.auditlog.length - 1]; assert.equal(last.thaoTac, "Khôi phục từ bản chụp SQLite"); assert.equal(last.nguoi, "Quản trị giả"); assert.match(last.chiTiet, /data-snapshot\.sqlite.*trước: không đọc được, sau: \d+/);
  const k = kept(dir, /^data\.sqlite\.truoc-khoi-phuc-/); assert.ok(k.length >= 1, "bản cũ được cất: " + fs.readdirSync(dir).join(","));
  assert.deepEqual(fs.readFileSync(path.join(dir, k.find((f) => !/-(wal|shm)$/.test(f)))), hurt, "bản cất đúng từng byte file hỏng");
  assert.ok(kept(dir, /^data\.json\.truoc-khoi-phuc-/).length === 1, "data.json cũ cũng được cất");
  assert.equal(fs.existsSync(path.join(dir, "data.sqlite.restore-pending")), false, "marker đã xóa");
  assert.equal(sha(snap(dir)), snapBefore, "bản chụp gốc không bị đổi");
  assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), after.text, "data.json = bản xuất khớp dữ liệu đã khôi phục");
  d.nhanvien[0]["Họ và tên"] = "Sửa sau khôi phục"; assert.equal(s.save(JSON.stringify(d)), true, "ghi tiếp được"); s.close();
  const s2 = createSqliteStorage(dir, opts), l2 = s2.load(); assert.equal(l2.ok, true); assert.equal(JSON.parse(l2.text).nhanvien[0]["Họ và tên"], "Sửa sau khôi phục"); s2.close();
  const db = store.open(sq(dir), { readonly: true }); try { assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok"); assert.ok(db.prepare("SELECT COUNT(*) AS c FROM audit WHERE action = 'khoi-phuc-tu-ban-chup'").get().c === 1); } finally { db.close(); }
});

test("U-SNAP-02 data.sqlite và data.json đều mất nhưng còn bản chụp: không âm thầm bắt đầu trống — báo để khôi phục; hồ sơ mới thật sự (không có bản chụp) vẫn mở trống", () => {
  const { dir } = setup(); fs.rmSync(sq(dir), { force: true }); fs.rmSync(path.join(dir, "data.json"), { force: true }); for (const x of ["-wal", "-shm"]) fs.rmSync(sq(dir) + x, { force: true });
  const s = createSqliteStorage(dir, opts), ld = s.load(); assert.equal(ld.ok, false); assert.equal(ld.snapshot.ok, true);
  assert.equal(s.restoreFromSnapshot("x").ok, true); assert.equal(s.load().ok, true); s.close();
  const fresh = createSqliteStorage(dirOf(), opts); assert.deepEqual(fresh.load(), { ok: true, text: null }); fresh.close();
});

test("U-SNAP-03 từ chối bản chụp không hợp lệ: hỏng, schema MỚI HƠN app, không phải DB của HAK — dữ liệu hiện có không bị đụng, không để lại marker/ứng viên", () => {
  const { dir } = setup(); corrupt(dir); const before = sha(sq(dir));
  const cases = {
    "hỏng (cắt cụt)": () => fs.truncateSync(snap(dir), 300),
    "schema mới hơn": () => { const db = store.open(snap(dir)); db.exec("PRAGMA user_version = " + (store.SCHEMA_VERSION + 5)); store.close(db); },
    "không phải DB của HAK": () => { const { DatabaseSync } = store.driver(); fs.rmSync(snap(dir)); const db = new DatabaseSync(snap(dir)); db.exec("CREATE TABLE x (a); INSERT INTO x VALUES (1)"); db.close(); },
    "không phải file SQLite": () => fs.writeFileSync(snap(dir), "đây không phải SQLite"),
  };
  const good = fs.readFileSync(snap(dir));
  for (const [name, make] of Object.entries(cases)) {
    fs.writeFileSync(snap(dir), good); make();
    const s = createSqliteStorage(dir, opts), ld = s.load(); assert.equal(ld.ok, false, name);
    assert.equal(ld.snapshot.ok, false, name + ": phải báo bản chụp không dùng được"); assert.ok(ld.snapshot.error, name);
    const r = s.restoreFromSnapshot("x"); assert.equal(r.ok, false, name); assert.match(r.error, /KHÔNG thay đổi dữ liệu/, name);
    assert.equal(sha(sq(dir)), before, name + ": data.sqlite hiện có không đổi");
    assert.equal(fs.existsSync(path.join(dir, "data.sqlite.restore-pending")), false, name); assert.equal(fs.existsSync(sq(dir) + ".khoi-phuc-moi"), false, name);
    assert.equal(kept(dir, /truoc-khoi-phuc/).length, 0, name + ": chưa thay gì thì không cất gì");
    s.close();
  }
  fs.rmSync(snap(dir)); const s = createSqliteStorage(dir, opts); assert.equal(s.restoreFromSnapshot("x").ok, false); s.close(); // không có bản chụp
});

test("U-SNAP-04 kho đang mở bình thường: needsRecovery = false (giao diện/IPC không cho khôi phục đè dữ liệu tốt)", () => {
  const { dir } = setup(); const s = createSqliteStorage(dir, opts); assert.equal(s.load().ok, true); assert.equal(s.needsRecovery(), false); s.close();
});

for (const at of ["sau-marker", "truoc-doi-ten", "sau-doi-ten"]) {
  test("U-SNAP-05 kill -9 THẬT giữa lúc khôi phục (" + at + "): mở lại thấy trạng thái nhất quán = dữ liệu bản chụp, bản cũ còn được cất, marker dọn", () => {
    const { dir, v1 } = setup(); corrupt(dir); const rowsSnap = countRows(snap(dir));
    const r = cp.spawnSync(process.execPath, ["--no-warnings", KILL, dir, at], { encoding: "utf8", timeout: 60000 });
    // Linux/macOS báo signal = SIGKILL; Windows kết thúc tiến trình đột ngột nhưng spawnSync trả signal = null và mã thoát khác 0 (CI Windows 06:55). Cả hai đều là chết đột ngột đúng điểm: có dòng "KILL <điểm>" và KHÔNG có "DONE" (kiểm ngay bên dưới).
    if (process.platform === "win32") assert.ok(r.status !== 0, "tiến trình con phải chết đột ngột (Windows). status=" + r.status + " stdout: " + r.stdout + " stderr: " + r.stderr.slice(0, 200));
    else assert.equal(r.signal, "SIGKILL", "tiến trình con phải bị kill đúng điểm. stdout: " + r.stdout + " stderr: " + r.stderr.slice(0, 200));
    assert.match(r.stdout, new RegExp("KILL " + at)); assert.doesNotMatch(r.stdout, /DONE/);
    assert.ok(kept(dir, /^data\.sqlite\.truoc-khoi-phuc-/).length >= 1, "bản cũ đã được cất TRƯỚC mọi bước thay thế");
    const s = createSqliteStorage(dir, opts), ld = s.load();
    assert.equal(ld.ok, true, "mở lại sau kill: " + JSON.stringify(ld).slice(0, 300));
    const d = JSON.parse(ld.text); assert.equal(d.nhanvien.length, v1.nhanvien.length); assert.equal(d.nhanvien.some((x) => x["Mã NV"] === "9999"), false);
    assert.equal(d.auditlog.filter((x) => x.thaoTac === "Khôi phục từ bản chụp SQLite").length, 1, "đúng MỘT dòng kiểm toán (không nhân đôi khi hoàn tất lại)");
    assert.equal(fs.existsSync(path.join(dir, "data.sqlite.restore-pending")), false); assert.equal(fs.existsSync(sq(dir) + ".khoi-phuc-moi"), false);
    assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), ld.text, "data.json khớp");
    assert.equal(s.save(JSON.stringify(d)), true); s.close();
    const db = store.open(sq(dir), { readonly: true }); try { assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok"); assert.ok(db.prepare("SELECT COUNT(*) AS c FROM records").get().c >= rowsSnap); } finally { db.close(); }
  });
}
