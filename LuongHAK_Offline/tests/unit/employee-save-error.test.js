"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
function runtime(save) {
  const c = { session: null, clearTimeout() {}, toast() {}, store: { save }, readOnly: false, saveTimer: null, dirty: false, lastSaveError: "", lastTxnError: "", dbRev: 0, st: {}, db: { nhanvien: [], canhan: [], hopdong: [], auditlog: [] } };
  vm.createContext(c);
  vm.runInContext(src.slice(src.indexOf("  function saveNow() {"), src.indexOf("  function save() {")), c);
  return c;
}
for (const reason of ["Không có quyền ghi vào thư mục dữ liệu", "Ổ đĩa đã đầy", "Tiến trình chính từ chối ghi: chưa đăng nhập", "Năm 2025 đã lưu trữ"]) {
  test("Thêm NV: lý do gốc không mất, hoàn tác mọi bảng khi " + reason, () => {
    const c = runtime(() => reason), original = JSON.stringify(c.db);
    assert.equal(c.txn(["nhanvien", "canhan", "hopdong"], () => {
      c.db.nhanvien.push({ "Mã NV": "TEST001" }); c.db.canhan.push({ "Mã NV": "TEST001" }); c.db.hopdong.push({ "Mã NV": "TEST001" }); c.db.auditlog.push({ thaoTac: "Thêm" }); return true;
    }), false);
    assert.equal(c.lastTxnError, reason); assert.equal(JSON.stringify(c.db), original);
  });
}
test("Lỗi IPC được giữ, lần lưu sau thành công không dùng lại lỗi cũ", () => {
  let fail = true;
  const c = runtime(() => { if (fail) throw Error("IPC disconnected"); return true; });
  assert.equal(c.txn(["nhanvien"], () => { c.db.nhanvien.push({ "Mã NV": "TEST001" }); }), false);
  assert.equal(c.lastTxnError, "IPC disconnected");
  fail = false;
  assert.equal(c.txn(["nhanvien"], () => { c.db.nhanvien.push({ "Mã NV": "TEST001" }); }), true);
  assert.equal(c.lastTxnError, ""); assert.equal(c.db.nhanvien.length, 1);
});
test("Thông báo của wizard chứa lý do giao dịch và giữ form khi thất bại", () => {
  const wizard = src.slice(src.indexOf("  function wizardNV() {"), src.indexOf("  function wizardNV() {") + 8000);
  assert.match(wizard, /if \(!okNV\).*Lý do:.*lastTxnError.*return;/);
});
