"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createStorage } = require("../../main/storage.js");

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "hak-year-")); }
function clock(start) { let t = new Date(start).getTime(); return { now: () => new Date(t), add: (ms) => { t += ms; } }; }

test("lần lưu đầu tiên của mỗi năm tự tạo bản nam-<năm>, không tạo lặp trong năm", () => {
  const c = clock("2026-12-30T08:00:00"), s = createStorage(tmp(), { now: c.now });
  s.save('{"v":"2026-a"}');           // chưa có file cũ → chưa sao lưu gì
  c.add(864e5 * 3); s.save('{"v":"2027-a"}'); s.save('{"v":"2027-b"}'); // sang 2027
  const y = s.list().filter((b) => b.tag === "nam-2027");
  assert.equal(y.length, 1);
  assert.equal(y[0].year, "2027");
  assert.equal(JSON.parse(s.readBackup(y[0].name).text).v, "2026-a"); // số liệu ngay trước khi sang năm mới
  assert.equal(s.verifyBackup(y[0].name).status, "ok");
});
test("bản theo năm không bao giờ bị dọn, kể cả khi bản daily bị dọn", () => {
  const c = clock("2026-01-02T08:00:00"), dir = tmp(), s = createStorage(dir, { now: c.now });
  s.setSchedule({ keepDaily: 30 });
  s.save('{"v":0}'); c.add(864e5); s.save('{"v":1}');
  assert.equal(s.list().filter((b) => b.tag === "nam-2026").length, 1);
  for (let i = 0; i < 45; i++) { c.add(864e5); s.save('{"v":' + (i + 2) + '}'); }
  assert.equal(s.list().filter((b) => b.tag === "daily").length, 30);
  assert.equal(s.list().filter((b) => b.tag === "nam-2026").length, 1);
});
test("backupYear tạo bản tay cho năm chỉ định; năm không hợp lệ bị từ chối", () => {
  const s = createStorage(tmp());
  s.save('{"v":1}');
  const f = s.backupYear(2025);
  assert.match(f, /^nam-2025_/);
  assert.equal(s.yearBackups(2025).length, 1);
  assert.equal(s.backupYear("abc"), null);
  assert.equal(s.backupYear(1999), null);
});
