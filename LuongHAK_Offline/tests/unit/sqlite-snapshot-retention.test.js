// P2.6 (T-12): Giữ lịch sử bản chụp SQLite theo từng nhãn (startup không đẩy daily/manual ra ngoài)
// và main.js chỉ gọi storage.backup("startup") khi dữ liệu đã đổi (changedSinceBackup()).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

delete process.env.HAK_SQLITE_EXPORT_SYNC;
delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;

const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { fixture } = require("../fixtures/production-carry");

const dirOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-snapret-"));
let seq = 0;
const doc = () => {
  const d = JSON.parse(JSON.stringify(fixture()));
  d.nhanvien.push({ "Mã NV": "R" + (++seq), "Họ và tên": "Nhân viên " + seq });
  return d;
};
const snaps = (dir) => {
  try { return fs.readdirSync(dir).filter((x) => /^snap_.*\.sqlite$/i.test(x)).sort(); }
  catch (e) { return []; }
};

test("T-12.1: 12 bản startup không đẩy bản daily và manual ra khỏi lịch sử bản chụp SQLite", () => {
  const dir = dirOf();
  const s = createSqliteStorage(dir, { exportDelayMs: 600000 });
  assert.equal(s.save(JSON.stringify(doc())), true);
  assert.ok(s.backup("manual"), "phải tạo được bản manual");
  assert.ok(s.backup("sau-chot-2026-10"), "phải tạo được bản sau-chot");
  assert.ok(s.backup("nam-2026"), "phải tạo được bản nam-2026");

  for (let i = 0; i < 12; i++) {
    assert.equal(s.save(JSON.stringify(doc())), true);
    assert.ok(s.backup("startup"), "startup lần " + i);
  }

  const all = snaps(s.backupDir);
  const byTag = (tag) => all.filter((x) => new RegExp("_" + tag + "\\.sqlite$", "i").test(x));
  assert.ok(byTag("daily").length >= 1, "bản daily không bị startup đẩy ra: " + all.join(","));
  assert.equal(byTag("manual").length, 1, "bản manual không bị startup đẩy ra: " + all.join(","));
  assert.equal(byTag("sau-chot-2026-10").length, 1, "bản sau-chot giữ vĩnh viễn");
  assert.equal(byTag("nam-2026").length, 1, "bản năm giữ vĩnh viễn");
  assert.equal(byTag("startup").length, 10, "nhãn startup giữ tối đa 10 bản: " + byTag("startup").length);
});

test("T-12.2: changedSinceBackup() trả false khi chưa có dữ liệu hoặc chưa đổi từ bản sao lưu gần nhất", () => {
  const dir = dirOf();
  const s = createSqliteStorage(dir, { exportDelayMs: 600000 });
  assert.equal(s.changedSinceBackup(), false, "chưa có dữ liệu thì không cần sao lưu startup");
  assert.equal(s.save(JSON.stringify(doc())), true);
  assert.ok(s.backup("startup"), "lần đầu có dữ liệu phải sao lưu được");
  assert.equal(s.changedSinceBackup(), false, "vừa sao lưu xong thì không đổi");
  assert.equal(s.save(JSON.stringify(doc())), true);
  assert.equal(s.changedSinceBackup(), true, "sau khi sửa dữ liệu phải báo đã đổi");
});

test("T-12.3: main.js chỉ gọi storage.backup('startup') khi changedSinceBackup() đúng", () => {
  const mainSrc = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");
  const m = mainSrc.match(/[^\r\n]*storage\.backup\("startup"\)[^\r\n]*/);
  assert.ok(m, "phải có lời gọi storage.backup('startup') trong main.js");
  assert.match(m[0], /changedSinceBackup\s*\(\s*\)/, "startup backup phải kiểm tra changedSinceBackup(): " + m[0]);
});
