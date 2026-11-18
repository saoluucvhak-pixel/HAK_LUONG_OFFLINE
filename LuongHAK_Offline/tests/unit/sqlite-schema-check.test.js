"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const store = require("../../main/sqlite-store.js");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-sqlchk-"));

test("U-SCHK-01: schema v2 từ chối json hỏng, rev < 1, id rỗng", () => {
  const dir = tmp(), db = store.open(path.join(dir, "d.sqlite")); store.migrate(db);
  const put = (id, js, rev) => db.prepare("INSERT INTO records (tbl, id, pos, bkey, json, rev) VALUES ('t', ?, ?, NULL, ?, ?)").run(id, Math.floor(Math.random() * 1e6), js, rev);
  assert.doesNotThrow(() => put("a", "{\"x\":1}", 1));
  assert.throws(() => put("b", "{hỏng", 1), /CHECK/);
  assert.throws(() => put("c", "{}", 0), /CHECK/);
  assert.throws(() => put("", "{}", 1), /CHECK/);
  store.close(db);
});

test("U-SCHK-02: nâng v1 → v2 giữ nguyên toàn bộ dòng, thứ tự, rev và chỉ mục", () => {
  const dir = tmp(), f = path.join(dir, "d.sqlite");
  const { DatabaseSync } = require("node:sqlite"), raw = new DatabaseSync(f);
  raw.exec("PRAGMA journal_mode = WAL;");
  // dựng đúng schema v1 bằng migration đầu tiên
  const v1 = store.MIGRATIONS ? store.MIGRATIONS[0] : null;
  assert.ok(v1, "store phải xuất MIGRATIONS");
  raw.exec(v1.sql); raw.exec("PRAGMA user_version = 1");
  raw.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, 'khoi-tao', 'x')").run();
  const ins = raw.prepare("INSERT INTO records (tbl, id, pos, bkey, json, rev) VALUES (?, ?, ?, ?, ?, ?)");
  for (let i = 0; i < 50; i++) ins.run("nhanvien", "id" + i, i, "k" + i, JSON.stringify({ n: i }), i % 3 + 1);
  raw.close();
  const db = store.open(f); store.migrate(db);
  assert.equal(db.prepare("PRAGMA user_version").get().user_version, 2);
  const rows = db.prepare("SELECT id, pos, rev, json FROM records WHERE tbl='nhanvien' ORDER BY pos").all();
  assert.equal(rows.length, 50);
  rows.forEach((r, i) => { assert.equal(r.id, "id" + i); assert.equal(r.pos, i); assert.equal(r.rev, i % 3 + 1); assert.equal(JSON.parse(r.json).n, i); });
  const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='records'").all().map((x) => x.name);
  assert.ok(idx.includes("records_pos") && idx.includes("records_bkey"));
  assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  store.close(db);
});

test("U-SCHK-03: bản chụp VACUUM INTO nhất quán, qua integrity_check, ghi đè an toàn, lỗi không để lại file dở", () => {
  const dir = tmp(), db = store.open(path.join(dir, "d.sqlite")); store.migrate(db);
  const ins = db.prepare("INSERT INTO records (tbl, id, pos, bkey, json, rev) VALUES ('t', ?, ?, NULL, '{}', 1)");
  for (let i = 0; i < 20; i++) ins.run("i" + i, i);
  const dest = path.join(dir, "snap.sqlite"), r = store.snapshot(db, dest);
  assert.deepEqual(r, { ok: true, records: 20 });
  assert.ok(!fs.existsSync(dest + ".tmp"));
  ins.run("i99", 99);
  assert.equal(store.snapshot(db, dest).records, 21, "ghi đè bằng bản mới");
  const bad = store.snapshot(db, path.join(dir, "khong-co-thu-muc", "x.sqlite"));
  assert.equal(bad.ok, false);
  store.close(db);
});
