"use strict";
// Khóa phiên ghi: đường dẫn thư mục dữ liệu có chứa chữ "PID" KHÔNG được làm kho không mở được
// (lỗi cũ: acquireLock nhận diện "khóa của tiến trình khác" bằng /PID/ trên thông báo lỗi; thông báo ENOENT có chứa đường dẫn).
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { createSqliteStorage } = require("../../main/sqlite-storage");
const { fixture } = require("../fixtures/production-carry");
const opts = { exportDelayMs: 20 };

for (const name of ["hak-PID-", "hak-tGIPID-", "hak-pid-"]) {
  test("U-LOCK-01 thư mục dữ liệu có '" + name + "' trong đường dẫn, chưa có tệp khóa: mở và lưu được", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), name)), s = createSqliteStorage(dir, opts);
    assert.equal(s.save(JSON.stringify(fixture())), true);
    assert.ok(fs.existsSync(path.join(dir, "data.sqlite.lock")), "đã tạo tệp khóa phiên");
    s.close();
    assert.ok(!fs.existsSync(path.join(dir, "data.sqlite.lock")), "đóng kho thì nhả khóa");
  });
}

test("U-LOCK-02 vẫn chặn khi tệp khóa thuộc tiến trình khác còn sống (hành vi cũ không đổi)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-lock-")), boot = Math.round(Date.now() / 1000 - os.uptime());
  fs.writeFileSync(path.join(dir, "data.sqlite.lock"), JSON.stringify({ pid: process.ppid, boot, at: new Date().toISOString() }));
  const s = createSqliteStorage(dir, opts), r = s.save(JSON.stringify(fixture()));
  assert.notEqual(r, true); assert.match(String(r), /PID \d+/);
});
