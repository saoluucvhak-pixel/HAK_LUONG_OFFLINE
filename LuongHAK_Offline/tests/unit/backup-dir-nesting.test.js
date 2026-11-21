// P2.7 (T-13): Chống đặt thư mục JSON / mirror / Full Backup lồng hoặc trùng nhau,
// hoặc nằm trong / chứa userData / backups / export.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const mainSrc = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");

function loadIsNestedOrSame() {
  const m = mainSrc.match(/\/\*\s*@pure:isNestedOrSame\s*\*\/([\s\S]*?)\/\*\s*@end:isNestedOrSame\s*\*\//);
  assert.ok(m, "main.js phải định nghĩa hàm thuần isNestedOrSame với marker @pure:isNestedOrSame");
  const factory = new Function("path", "process", m[1] + "\nreturn isNestedOrSame;");
  return factory(path, process);
}

test("T-13.1: isNestedOrSame phát hiện trùng, lồng nhau và phân biệt win32 vs posix", () => {
  const isNestedOrSame = loadIsNestedOrSame();

  // Windows: không phân biệt hoa/thường
  assert.equal(isNestedOrSame("C:\\Data\\HAK", "c:\\data\\hak", path.win32, "win32"), true, "trùng đường dẫn win32");
  assert.equal(isNestedOrSame("C:\\Data\\HAK\\", "c:\\data\\hak\\sub", path.win32, "win32"), true, "b nằm trong a win32");
  assert.equal(isNestedOrSame("C:\\Data\\HAK\\sub", "c:\\data\\hak", path.win32, "win32"), true, "a nằm trong b win32");
  assert.equal(isNestedOrSame("C:\\Data\\HAK", "C:\\Data\\HAK2", path.win32, "win32"), false, "thư mục anh em không lồng");

  // POSIX: phân biệt hoa/thường
  assert.equal(isNestedOrSame("/tmp/HAK", "/tmp/hak", path.posix, "linux"), false, "posix phân biệt hoa/thường");
  assert.equal(isNestedOrSame("/tmp/hak", "/tmp/hak/sub", path.posix, "linux"), true, "b nằm trong a posix");
  assert.equal(isNestedOrSame("/tmp/hak/a", "/tmp/hak/b", path.posix, "linux"), false, "anh em posix không lồng");
});

test("T-13.2: json-set-dir, paths-move, backup-mirror-choose trong main.js kiểm tra lồng userData / backups / thư mục khác", () => {
  const sliceOf = (anchor) => {
    const idx = mainSrc.indexOf(anchor);
    assert.ok(idx >= 0, "không tìm thấy " + anchor);
    return mainSrc.slice(idx, idx + 1800);
  };

  for (const anchor of ['"json-set-dir"', '"paths-move"', '"backup-mirror-choose"']) {
    const block = sliceOf(anchor);
    assert.match(block, /checkDirConflict|isNestedOrSame/, anchor + " phải kiểm tra chống lồng/trùng thư mục");
  }

  // Đảm bảo danh sách kiểm tra bao gồm userData và backups
  assert.match(mainSrc, /checkDirConflict[\s\S]{0,900}userData/, "checkDirConflict phải kiểm tra userData");
  assert.match(mainSrc, /checkDirConflict[\s\S]{0,900}backupDir/, "checkDirConflict phải kiểm tra backups (backupDir)");
});
