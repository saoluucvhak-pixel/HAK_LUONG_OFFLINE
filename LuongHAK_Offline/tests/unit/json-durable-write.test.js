// 012-A (issue #113, CEO yêu cầu #121): sao lưu JSON ghi tệp tạm BỀN (fsync) trước khi rename — mất điện không để lại tệp rỗng mang tên hợp lệ.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const R = require("../../main/restore");

test("U-JSON-DUR-01 writeTextDurable có sẵn và ghi đúng nội dung (kể cả tiếng Việt có dấu)", () => {
  assert.equal(typeof R.writeTextDurable, "function");
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "hak-dur-")), f = path.join(d, "a.tmp"), text = JSON.stringify({ nhanvien: [{ "Họ và tên": "Nguyễn Thị Đào" }] });
  R.writeTextDurable(f, text);
  assert.equal(fs.readFileSync(f, "utf8"), text);
});

test("U-JSON-DUR-02 fsync được gọi trên đúng tệp VÀ trước khi đóng tệp (rồi mới tới rename của người gọi)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "hak-dur-")), f = path.join(d, "b.tmp"), calls = [], oF = fs.fsyncSync, oC = fs.closeSync;
  let fdOpened = null;
  fs.fsyncSync = (fd) => { fdOpened = fd; calls.push("fsync"); return oF(fd); };
  fs.closeSync = (fd) => { if (fd === fdOpened) calls.push("close"); return oC(fd); };
  try { R.writeTextDurable(f, "x".repeat(1000)); } finally { fs.fsyncSync = oF; fs.closeSync = oC; }
  assert.deepEqual(calls, ["fsync", "close"], "thứ tự: fsync rồi mới close");
  assert.equal(fs.statSync(f).size, 1000);
});

test("U-JSON-DUR-03 lỗi khi ghi vẫn đóng tệp (không rò mô tả tệp) và ném lỗi lên", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "hak-dur-")), f = path.join(d, "c.tmp"), oW = fs.writeFileSync, oC = fs.closeSync; let closed = 0;
  fs.writeFileSync = () => { throw new Error("đĩa đầy giả lập"); };
  fs.closeSync = (fd) => { closed++; return oC(fd); };
  try { assert.throws(() => R.writeTextDurable(f, "x"), /đĩa đầy giả lập/); } finally { fs.writeFileSync = oW; fs.closeSync = oC; }
  assert.equal(closed, 1);
});
