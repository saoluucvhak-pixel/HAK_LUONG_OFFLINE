// P2.9 (T-17 + T-33 + N-02b): Kiểm tra bảo vệ IPC trong main.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const mainSrc = fs.readFileSync(path.join(__dirname, "../../main.js"), "utf8");

function handlerOf(channel) {
  const idx = mainSrc.indexOf('"' + channel + '"');
  assert.ok(idx >= 0, "không tìm thấy kênh IPC: " + channel);
  const start = Math.max(0, mainSrc.lastIndexOf("ipcMain.", idx));
  const nextOn = mainSrc.indexOf("\n  ipcMain.", idx);
  const end = nextOn > idx ? nextOn : idx + 600;
  return mainSrc.slice(start, end);
}

test("T-17: rs-commit dùng guardedW('backup.restore', ...)", () => {
  const h = handlerOf("rs-commit");
  assert.match(h, /guardedW\s*\(\s*"backup\.restore"/, "rs-commit phải dùng guardedW('backup.restore', ...): " + h);
});

test("T-33a: các kênh ghi cấu hình/sao lưu kiểm tra quyền backup.restore", () => {
  const channels = [
    "backup-schedule-set",
    "backup-mirror-clear",
    "backup-mirror-choose",
    "backup-mirror-sync",
    "store-backup",
    "store-quarantine",
    "backup-note-external"
  ];
  for (const ch of channels) {
    const h = handlerOf(ch);
    assert.match(h, /"backup\.restore"/, ch + " phải kiểm tra quyền backup.restore");
    assert.match(h, /syncGuard|guard\.deny|guardedW|guarded/, ch + " phải gọi hàm kiểm tra quyền");
  }
});

test("T-33b: các kênh đọc sao lưu nhạy cảm (store-read, store-list, store-verify) kiểm tra quyền backup.restore", () => {
  for (const ch of ["store-read", "store-list", "store-verify"]) {
    const h = handlerOf(ch);
    assert.match(h, /"backup\.restore"/, ch + " phải kiểm tra quyền backup.restore");
    assert.match(h, /syncGuard|guard\.deny/, ch + " phải gọi syncGuard/guard.deny");
  }
});

test("N-02b: các kênh mở/đổi thư mục kiểm tra đăng nhập (guard.userOf / syncGuard)", () => {
  const channels = [
    "files-choose-dir",
    "files-reset-dir",
    "files-open-after",
    "files-open",
    "files-show",
    "files-open-dir",
    "open-data-folder"
  ];
  for (const ch of channels) {
    const h = handlerOf(ch);
    assert.match(h, /guard\.userOf\s*\(\s*e\s*\)|syncGuard\s*\(\s*e/, ch + " phải kiểm tra đăng nhập");
  }
});

test("Màn khởi động/khôi phục: store-info, backup-status, store-snapshot-status, store-snapshot-info không bị chặn trước đăng nhập", () => {
  for (const ch of ["store-info", "backup-status", "store-snapshot-status", "store-snapshot-info"]) {
    const h = handlerOf(ch);
    assert.doesNotMatch(h, /guard\.deny|syncGuard|guard\.userOf/, ch + " phải giữ mở cho màn khởi động/khôi phục");
  }
});

test("Màn khôi phục: inRecovery() kiểm tra !ld.ok để cho phép đọc sao lưu & dọn file hỏng khi kho có xung đột/hỏng", () => {
  assert.match(mainSrc, /const inRecovery = \(\) => \{ try \{ const ld = storage\.load\(\); return !ld \|\| !ld\.ok/, "inRecovery phải kiểm tra load().ok");
});

