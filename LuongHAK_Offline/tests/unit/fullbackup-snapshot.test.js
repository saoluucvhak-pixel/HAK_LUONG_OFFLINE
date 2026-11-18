// Bản chụp SQLite TRONG gói Full Backup (chỉ đạo 002b): tạo, kiểm, tương thích app 2.0.35 ↔ app mới, từ chối bản chụp xấu, khôi phục từ gói. Dữ liệu GIẢ.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto"), cp = require("node:child_process");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const FB = require("../../main/fullbackup"), Z = require("../../main/zip");
const LEGACY = require("../fixtures/legacy-2.0.35/main/fullbackup.js"), LEGACY_RS = require("../fixtures/legacy-2.0.35/main/restore.js"); // nguyên văn mã tag v2.0.35 (xem README cạnh file)
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { createVault } = require("../../main/documents"), { createStore } = require("../../main/ocr-library.js"), { createRestorer } = require("../../main/restore");
const store = require("../../main/sqlite-store.js");
const { fixture } = require("../fixtures/production-carry");
const KILL = path.resolve(__dirname, "../fixtures/sqlite-restore-kill.cjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-fbs-"));
const opts = { exportDelayMs: 20 };
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const SNAP = "sqlite/data-snapshot.sqlite";

/** Kho SQLite có dữ liệu + gói Full Backup (có bản chụp). */
function make(mut) {
  const dir = tmp(), s = createSqliteStorage(dir, opts), d = JSON.parse(JSON.stringify(fixture())); if (mut) mut(d);
  assert.equal(s.save(JSON.stringify(d)), true);
  const text = s.load().text, snapFile = path.join(dir, "pkg-snap.sqlite"), sn = s.snapshotForPackage(snapFile);
  const pkg = FB.create({ dataText: text, destDir: path.join(dir, "out"), sqliteSnapshot: sn && sn.ok ? sn : null });
  return { dir, s, d, text, sn, pkg };
}
/** Ghi lại gói với nội dung từng mục do fn quyết định (kiểm thử gói bị sửa/giả mạo). fn(name, buf) → buf mới | null (bỏ mục). */
function repack(file, fn) {
  const out = file + ".sua.zip", zip = Z.openZip(file), w = Z.createWriter(out, {});
  try { zip.entries.forEach((e) => { const b = fn(e.name, zip.readBuffer(e)); if (b) w.addBuffer(e.name, b); }); w.finish(); } finally { zip.close(); }
  return out;
}
const manifestOf = (file) => { const z = Z.openZip(file); try { return JSON.parse(z.readBuffer(z.byName["manifest.json"]).toString("utf8")); } finally { z.close(); } };
const setUserVersion = (file, v) => { const { DatabaseSync } = store.driver(), db = new DatabaseSync(file); try { db.exec("PRAGMA journal_mode = DELETE; PRAGMA user_version = " + v); } finally { db.close(); } };
const corrupt = (dir) => { fs.truncateSync(path.join(dir, "data.sqlite"), 200); for (const x of ["-wal", "-shm"]) fs.rmSync(path.join(dir, "data.sqlite") + x, { force: true }); };
const rowsOf = (text) => { const o = JSON.parse(text); return Object.keys(o).reduce((n, k) => n + (Array.isArray(o[k]) ? o[k].length : 0), 0); };

test("U-FBS-00 hằng số schema của gói khớp schema của kho SQLite", () => { assert.equal(FB.SNAPSHOT_SCHEMA_MAX, store.SCHEMA_VERSION); });

test("U-FBS-01 gói mới: có sqlite/data-snapshot.sqlite + manifest.sqliteSnapshot đủ trường; manifest.version không đổi; data.json vẫn là nguồn chuẩn", () => {
  const { pkg, text } = make();
  assert.equal(pkg.ok, true, JSON.stringify(pkg).slice(0, 300)); assert.equal(pkg.sqliteSnapshot, true);
  const m = manifestOf(pkg.file), plain = FB.create({ dataText: text, destDir: path.join(tmp(), "o") }); assert.equal(m.version, manifestOf(plain.file).version, "manifest.version KHÔNG đổi so với gói không có bản chụp (hiện là 1; 2 khi có hồ sơ năm)"); assert.ok(m.version <= 2);
  assert.deepEqual(Object.keys(m.sqliteSnapshot).sort(), ["createdAt", "path", "records", "rev", "schema", "sha256", "size"]);
  assert.equal(m.sqliteSnapshot.path, SNAP); assert.equal(m.sqliteSnapshot.records, rowsOf(text)); assert.equal(m.sqliteSnapshot.schema, store.SCHEMA_VERSION);
  const rep = FB.inspect(pkg.file); assert.equal(rep.ok, true, rep.problems.join(";")); assert.equal(rep.dataText, text); assert.equal(rep.sqlite.ok, true); assert.deepEqual(rep.warnings, []);
});

test("U-FBS-02 GÓI MỚI → APP 2.0.35 (mã nguyên văn của tag): inspect đạt, data.json đúng; bộ khôi phục 2.0.35 stage đạt và bỏ qua phần lạ", () => {
  const { pkg, text } = make(), z = Z.openZip(pkg.file); try { assert.ok(z.byName[SNAP], "gói có bản chụp"); } finally { z.close(); }
  const rep = LEGACY.inspect(pkg.file); assert.equal(rep.ok, true, rep.problems.join(";")); assert.deepEqual(rep.problems, []); assert.equal(rep.dataText, text);
  const root = tmp(), userData = path.join(root, "ud"); fs.mkdirSync(userData);
  const v = createVault(path.join(root, "documents")), lib = createStore(path.join(root, "lib"), { spoolDir: path.join(root, "spool") });
  const rs = LEGACY_RS.createRestorer({ userData, getVault: () => v, getOcrLib: () => lib, readData: () => ({ ok: false }), maxSchema: 5 });
  const r = rs.stage(pkg.file); assert.equal(r.ok, true, r.error); assert.ok(r.phases.every((p) => p.ok)); assert.equal(r.text, text);
});

test("U-FBS-03 GÓI CŨ (tạo bằng mã 2.0.35) → APP MỚI: inspect/stage đạt, không báo thiếu bản chụp; khôi phục từ gói cũ báo rõ 'không có bản chụp'", () => {
  const dir = tmp(), d = fixture(), text = JSON.stringify(d), old = LEGACY.create({ dataText: text, destDir: path.join(dir, "o") });
  assert.equal(old.ok, true); const rep = FB.inspect(old.file); assert.equal(rep.ok, true, rep.problems.join(";")); assert.equal(rep.sqlite, null); assert.deepEqual(rep.warnings, []);
  const root = tmp(), userData = path.join(root, "ud"); fs.mkdirSync(userData);
  const v = createVault(path.join(root, "documents")), lib = createStore(path.join(root, "lib"), { spoolDir: path.join(root, "spool") });
  const rs = createRestorer({ userData, getVault: () => v, getOcrLib: () => lib, readData: () => ({ ok: false }), maxSchema: 5 }); const r = rs.stage(old.file); assert.equal(r.ok, true, r.error);
  const ex = FB.extractSqliteSnapshot(old.file, path.join(dir, "x.sqlite")); assert.equal(ex.ok, false); assert.match(ex.error, /không có bản chụp/i);
});

test("U-FBS-04 bản chụp sai SHA-256 trong gói: gói VẪN hợp lệ (dùng data.json), cảnh báo, không khôi phục từ bản chụp", () => {
  const { pkg, text } = make(), bad = repack(pkg.file, (n, b) => (n === SNAP ? Buffer.concat([b.subarray(0, b.length - 1), Buffer.from([(b[b.length - 1] + 1) & 255])]) : b));
  const rep = FB.inspect(bad); assert.equal(rep.ok, true, rep.problems.join(";")); assert.equal(rep.dataText, text); assert.equal(rep.sqlite.ok, false); assert.match(rep.warnings.join("|"), /SHA-256/);
  const ex = FB.extractSqliteSnapshot(bad, path.join(tmp(), "x.sqlite")); assert.equal(ex.ok, false); assert.match(ex.error, /SHA-256/);
});

test("U-FBS-05 bản chụp schema MỚI HƠN app: (a) lúc tạo gói bị bỏ kèm cảnh báo, gói vẫn tốt; (b) gói giả mạo manifest/bản chụp schema mới → inspect bỏ bản chụp, cảnh báo", () => {
  const { dir, s, text, sn: sn0 } = make(); const f = path.join(dir, "newer.sqlite"); fs.copyFileSync(path.join(dir, "pkg-snap.sqlite"), f); setUserVersion(f, store.SCHEMA_VERSION + 3);
  const r = FB.create({ dataText: text, destDir: path.join(dir, "out2"), sqliteSnapshot: { file: f, rev: 1, schema: store.SCHEMA_VERSION + 3, records: sn0.records } }); assert.equal(r.ok, true); assert.equal(r.sqliteSnapshot, false); assert.match(r.warnings.join("|"), /schema/i);
  const m2 = manifestOf(r.file); assert.equal(m2.sqliteSnapshot, undefined); const z = Z.openZip(r.file); try { assert.equal(!!z.byName[SNAP], false); } finally { z.close(); } void s;
  const { pkg } = make(), fake = repack(pkg.file, (n, b) => { if (n === "manifest.json") { const m = JSON.parse(b); m.sqliteSnapshot.schema = store.SCHEMA_VERSION + 3; return Buffer.from(JSON.stringify(m)); } return b; });
  const rep = FB.inspect(fake); assert.equal(rep.ok, true, rep.problems.join(";")); assert.equal(rep.sqlite.ok, false); assert.match(rep.warnings.join("|"), /schema/i);
});

test("U-FBS-06 bản chụp LỆCH data.json: lúc tạo gói bị bỏ kèm cảnh báo; gói giả mạo (bản chụp của dữ liệu khác, SHA/manifest khớp nhau) → khôi phục từ gói từ chối, dữ liệu hiện có không đổi", () => {
  const A = make(), B = make((d) => { d.nhanvien.push({ "Mã NV": "LỆCH", "Họ và tên": "Dòng chỉ có ở B" }); });
  const r = FB.create({ dataText: A.text, destDir: path.join(A.dir, "o2"), sqliteSnapshot: B.sn }); assert.equal(r.ok, true); assert.equal(r.sqliteSnapshot, false); assert.match(r.warnings.join("|"), /lệch|không khớp/i);
  const bytesB = fs.readFileSync(B.sn.file), forged = repack(A.pkg.file, (n, b) => { if (n === SNAP) return bytesB; if (n === "manifest.json") { const m = JSON.parse(b); m.sqliteSnapshot.sha256 = sha(bytesB); m.sqliteSnapshot.size = bytesB.length; return Buffer.from(JSON.stringify(m)); } return b; });
  const dir = tmp(), s = createSqliteStorage(dir, opts); assert.equal(s.save(A.text), true); const before = fs.readFileSync(path.join(dir, "data.sqlite"));
  const forgedHealthy = s.restoreFromPackage(forged, "x", { tmpDir: dir }); assert.equal(forgedHealthy.ok, false, "kho đang lành: từ chối"); s.close();
  corrupt(dir); const hurt = fs.readFileSync(path.join(dir, "data.sqlite")); const s2 = createSqliteStorage(dir, opts); assert.equal(s2.load().ok, false);
  const res = s2.restoreFromPackage(forged, "x", { tmpDir: dir }); assert.equal(res.ok, false); assert.match(res.error, /lệch|không khớp/i); assert.deepEqual(fs.readFileSync(path.join(dir, "data.sqlite")), hurt, "data.sqlite hiện có không đổi"); void before; s2.close();
});

test("U-FBS-07 khôi phục từ bản chụp TRONG gói khi data.sqlite hỏng: dữ liệu = lúc tạo gói, bản cũ cất, nhật ký ghi 'gói …', ghi tiếp được; kho đang lành thì tự từ chối", () => {
  const { dir, d, s, text, pkg } = make(); const healthy = s.restoreFromPackage(pkg.file, "x", { tmpDir: dir }); assert.equal(healthy.ok, false); assert.match(healthy.error, /đang mở bình thường/);
  d.nhanvien.push({ "Mã NV": "SAU-GOI", "Họ và tên": "Thêm sau khi tạo gói" }); assert.equal(s.save(JSON.stringify(d)), true); s.close(); corrupt(dir);
  const s2 = createSqliteStorage(dir, opts); assert.equal(s2.load().ok, false);
  const r = s2.restoreFromPackage(pkg.file, "Quản trị giả", { tmpDir: dir }); assert.equal(r.ok, true, JSON.stringify(r));
  const after = JSON.parse(s2.load().text); assert.equal(after.nhanvien.some((x) => x["Mã NV"] === "SAU-GOI"), false); assert.equal(after.nhanvien.length, JSON.parse(text).nhanvien.length);
  const last = after.auditlog[after.auditlog.length - 1]; assert.equal(last.thaoTac, "Khôi phục từ bản chụp SQLite"); assert.match(last.chiTiet, /gói LuongHAK_FullBackup_/);
  assert.ok(fs.readdirSync(dir).some((f) => /^data\.sqlite\.truoc-khoi-phuc-/.test(f)), "bản cũ được cất"); assert.equal(fs.readdirSync(dir).filter((f) => /^restore-snapshot-.*\.sqlite$/.test(f)).length, 0, "tệp tạm đã dọn");
  after.nhanvien[0]["Họ và tên"] = "Sửa sau khôi phục"; assert.equal(s2.save(JSON.stringify(after)), true); s2.close();
});

for (const at of ["sau-marker", "truoc-doi-ten", "sau-doi-ten"]) {
  test("U-FBS-08 kill -9 THẬT giữa lúc khôi phục từ bản chụp trong gói (" + at + "): mở lại nhất quán = dữ liệu lúc tạo gói, bản cũ còn, marker dọn", () => {
    const { dir, s, text, pkg } = make(); s.close(); corrupt(dir);
    const r = cp.spawnSync(process.execPath, ["--no-warnings", KILL, dir, at, pkg.file], { encoding: "utf8", timeout: 60000 });
    if (process.platform === "win32") assert.ok(r.status !== 0, "phải chết đột ngột. status=" + r.status + " " + r.stdout + r.stderr.slice(0, 200)); else assert.equal(r.signal, "SIGKILL", r.stdout + r.stderr.slice(0, 200));
    assert.match(r.stdout, new RegExp("KILL " + at)); assert.doesNotMatch(r.stdout, /DONE/);
    const s2 = createSqliteStorage(dir, opts), ld = s2.load(); assert.equal(ld.ok, true, JSON.stringify(ld).slice(0, 300));
    const dd = JSON.parse(ld.text); assert.equal(dd.nhanvien.length, JSON.parse(text).nhanvien.length); assert.equal(dd.auditlog.filter((x) => x.thaoTac === "Khôi phục từ bản chụp SQLite").length, 1);
    assert.equal(fs.existsSync(path.join(dir, "data.sqlite.restore-pending")), false); assert.ok(fs.readdirSync(dir).some((f) => /^data\.sqlite\.truoc-khoi-phuc-/.test(f))); assert.equal(s2.save(JSON.stringify(dd)), true); s2.close();
  });
}

test("U-FBS-09 lỗi tạo bản chụp KHÔNG làm hỏng gói: file bản chụp mất/hỏng → gói vẫn SUCCESS, không có mục sqlite, cảnh báo", () => {
  const dir = tmp(), text = JSON.stringify(fixture());
  for (const sn of [{ file: path.join(dir, "khong-ton-tai.sqlite"), rev: 1, schema: 2, records: 1 }, (() => { const f = path.join(dir, "rac.sqlite"); fs.writeFileSync(f, "không phải SQLite"); return { file: f, rev: 1 }; })()]) {
    const r = FB.create({ dataText: text, destDir: path.join(dir, "o" + Math.random().toString(36).slice(2, 6)), sqliteSnapshot: sn });
    assert.equal(r.ok, true, JSON.stringify(r).slice(0, 200)); assert.equal(r.sqliteSnapshot, false); assert.match(r.warnings.join("|"), /bản chụp SQLite/i);
    const rep = FB.inspect(r.file); assert.equal(rep.ok, true); assert.equal(rep.sqlite, null);
  }
});
