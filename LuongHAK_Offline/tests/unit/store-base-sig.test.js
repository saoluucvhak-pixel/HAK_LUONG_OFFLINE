// Bản nền (baseSig) của lưu dữ liệu: nối dây giữa preload, tiến trình chính và giao diện (kiểm hành vi thật ở tests/e2e/stale-base.cjs). Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, "../..", f), "utf8");

test("U-BSIG-01 preload: save nhận baseSig và có sig()", () => {
  const t = read("preload.js");
  assert.match(t, /save:\s*\(text,\s*baseSig\)\s*=>\s*ipcRenderer\.sendSync\("store-save",\s*text,\s*baseSig\)/);
  assert.match(t, /sig:\s*\(\)\s*=>\s*ipcRenderer\.sendSync\("store-sig"\)/);
});

test("U-BSIG-02 main: store-sig; store-save từ chối STALE_BASE TRƯỚC khi kiểm quyền/ghi; không gửi baseSig thì giữ hành vi cũ", () => {
  const t = read("main.js");
  assert.match(t, /ipcMain\.on\("store-sig"/);
  const i = t.indexOf('ipcMain.on("store-save"'), j = t.indexOf("policy().check", i), k = t.indexOf("STALE_BASE", i);
  assert.ok(i > 0 && k > i && k < j, "kiểm bản nền phải nằm trước write-policy.check");
  assert.match(t, /typeof baseSig === "string" && baseSig !== String\(sigNow\(\)\)/);
});

test("U-BSIG-03 giao diện: gửi baseSig, làm mới sau mỗi lần ghi thành công, xử lý STALE (hỏi, không ghi đè, không bẫy người dùng)", () => {
  const a = read("app.js");
  assert.match(a, /store\.save\(str, baseSig\)/);
  assert.match(a, /baseSig = String\(store\.sig\(\)\)/, "làm mới baseSig sau khi ghi thành công");
  assert.match(a, /isStale\(r\)/);
  assert.match(a, /function onStaleBase\(\)/);
  // beforeunload không dùng confirm (Chromium chặn) và không giữ trang khi bản nền cũ
  const bu = a.slice(a.indexOf('window.addEventListener("beforeunload"'), a.indexOf('window.addEventListener("beforeunload"') + 900);
  assert.doesNotMatch(bu.replace(/\/\/.*$/gm, ""), /confirm\(/);
  assert.match(bu, /lastSaveStale/);
  // đường đóng cửa sổ hỏi và chỉ cho đóng khi người dùng đồng ý
  assert.match(a, /if \(lastSaveStale\) \{ if \(confirm\(/);
});
