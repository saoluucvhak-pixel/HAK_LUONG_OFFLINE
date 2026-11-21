// P1.3 — T-06: Full Backup có mật khẩu mà mã hóa lỗi: phải trả ok:false, xóa bản rõ, không chép dự phòng.
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");

test("U-FB-ENC-01: kiểm tra logic trong main.js khi mã hóa Full Backup bị lỗi", () => {
  const mainSrc = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");
  const fbCreateIdx = mainSrc.indexOf('ipcMain.handle("fb-create"');
  assert.ok(fbCreateIdx > -1, "main.js phải có ipcMain.handle('fb-create')");
  const fbCreateBlock = mainSrc.slice(fbCreateIdx, mainSrc.indexOf('ipcMain.handle("fb-cancel"', fbCreateIdx));
  
  // Khi mã hóa lỗi trong catch(err):
  // Phải đặt ok = false, status = "FAILED", error = "KHÔNG tạo được gói mã hóa...", xóa plain và plain.sha256
  assert.match(fbCreateBlock, /await fsp0\.unlink\(plain\)/, "phải xóa file plain khi mã hóa lỗi");
  assert.match(fbCreateBlock, /r\.ok\s*=\s*false/, "phải đặt r.ok = false khi mã hóa lỗi");
  assert.match(fbCreateBlock, /r\.status\s*=\s*["']FAILED["']/, "phải đặt r.status = 'FAILED' khi mã hóa lỗi");
});
