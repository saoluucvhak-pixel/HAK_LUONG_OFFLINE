// T-11 (rà soát 5 agent): gửi JSON vào thư mục MẶC ĐỊNH (trong userData, cùng máy) không được ghi mốc "đã sao lưu ra ngoài máy". Dữ liệu giả.
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const SRC = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");
function fn() {
  const i = SRC.indexOf("// OUTSIDE-DATA-BEGIN"), j = SRC.indexOf("// OUTSIDE-DATA-END"); if (i < 0 || j < i) return null;
  const c = { require, process }; vm.createContext(c); vm.runInContext(SRC.slice(i, j) + "\nthis.f = outsideDataDir;", c); return c.f;
}
test("U-EXT-01 thư mục trong / trùng userData → KHÔNG phải ngoài máy; thư mục ngoài → ngoài máy (Linux)", () => {
  const f = fn(); assert.ok(f, "thiếu outsideDataDir (mốc OUTSIDE-DATA-BEGIN/END) trong main.js");
  const U = "/home/u/.config/TinhLuongHAK";
  assert.equal(f(U + "/json_backups", U, path.posix, "linux"), false);
  assert.equal(f(U, U, path.posix, "linux"), false);
  assert.equal(f(U + "/../TinhLuongHAK/json_backups", U, path.posix, "linux"), false);
  assert.equal(f("/media/usb/SaoLuu", U, path.posix, "linux"), true);
  assert.equal(f(U + "-khac/json", U, path.posix, "linux"), true, "tên bắt đầu giống nhưng là thư mục khác");
});
test("U-EXT-02 Windows: so không phân biệt hoa/thường (CHƯA NGHIỆM THU WINDOWS THẬT)", () => {
  const f = fn(); assert.ok(f);
  const U = "C:\\Users\\An\\AppData\\Roaming\\TinhLuongHAK";
  assert.equal(f("c:\\users\\an\\appdata\\roaming\\tinhluonghak\\json_backups", U, path.win32, "win32"), false);
  assert.equal(f("E:\\SaoLuu", U, path.win32, "win32"), true);
});
test("U-EXT-03 json-backup chỉ ghi mốc ngoài máy khi thư mục đích nằm ngoài userData", () => {
  const i = SRC.indexOf('ipcMain.handle("json-backup"'), body = SRC.slice(i, SRC.indexOf("\n  }));", i));
  assert.match(body, /outsideDataDir\(d, app\.getPath\("userData"\)\)/);
  assert.doesNotMatch(body, /try \{ if \(storage\.noteExternal\) storage\.noteExternal\(\); \}/, "vẫn ghi mốc vô điều kiện");
});
