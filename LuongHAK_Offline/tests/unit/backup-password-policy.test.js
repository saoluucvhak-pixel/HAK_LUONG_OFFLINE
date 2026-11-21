"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MAIN_PATH = path.resolve(__dirname, "../../main.js");
const bcrypt = require("../../main/backup-crypt.js");

function extractCheckFn() {
  const src = fs.readFileSync(MAIN_PATH, "utf8");
  const m = src.match(/\/\/ HAK_EXPORT_START:checkStrongBackupPassword\r?\n([\s\S]*?)\r?\n\/\/ HAK_EXPORT_END:checkStrongBackupPassword/);
  assert.ok(m, "main.js phải có marker HAK_EXPORT_START/END cho checkStrongBackupPassword");
  return new Function(m[1] + "\nreturn checkStrongBackupPassword;")();
}

test("P3.10-01 từ chối mật khẩu < 12 ký tự (kể cả mật khẩu cũ 10-11 ký tự)", () => {
  const check = extractCheckFn();
  for (const weak of ["Abc@12345", "password12", "abcdefghij1", "Xy@12345678"]) {
    const msg = check(weak);
    assert.equal(typeof msg, "string");
    assert.ok(msg.length > 0, "phải từ chối mật khẩu ngắn: " + weak);
    assert.match(msg, /12 ký tự/);
  }
});

test("P3.10-02 từ chối mật khẩu yếu phổ biến, chuỗi lặp, chuỗi liên tiếp và chỉ 1 nhóm ký tự", () => {
  const check = extractCheckFn();
  const cases = [
    ["password1234", "từ yếu password"],
    ["qwerty123456", "từ yếu qwerty"],
    ["matkhau@2026", "từ yếu matkhau"],
    ["admin#202699", "từ yếu admin"],
    ["aaaaaa@998811", "chuỗi lặp"],
    ["abcdefghij12", "chuỗi liên tiếp chữ"],
    ["Xy!123456789", "chuỗi liên tiếp số tăng"],
    ["Xy!987654321", "chuỗi liên tiếp số giảm"],
    ["chichuthuongkhong", "chỉ 1 nhóm ký tự"]
  ];
  for (const [pwd, label] of cases) {
    const msg = check(pwd);
    assert.ok(msg && msg.length > 0, "phải từ chối (" + label + "): " + pwd);
  }
});

test("P3.10-03 chấp nhận mật khẩu mạnh >= 12 ký tự, đủ nhóm, không từ yếu/lặp/liên tiếp", () => {
  const check = extractCheckFn();
  for (const strong of ["Hak!2026#BaoVe", "CtyMay@89$AnToan", "LuongThang11!Kiem"]) {
    assert.equal(check(strong), "", "phải chấp nhận mật khẩu mạnh: " + strong);
  }
});

test("P3.10-04 main.js chỉ kiểm checkStrongBackupPassword khi tạo gói (fb-create, ky-create), không kiểm ở inspect", () => {
  const src = fs.readFileSync(MAIN_PATH, "utf8");
  const fbCreate = src.slice(src.indexOf('ipcMain.handle("fb-create"'), src.indexOf('ipcMain.handle("fb-cancel"'));
  const kyCreate = src.slice(src.indexOf('ipcMain.handle("ky-create"'), src.indexOf('ipcMain.handle("ky-inspect"'));
  const fbInspect = src.slice(src.indexOf('ipcMain.handle("fb-inspect"'), src.indexOf('ipcMain.handle("ky-create"'));
  const kyInspect = src.slice(src.indexOf('ipcMain.handle("ky-inspect"'), src.indexOf('ipcMain.handle("rs-stage"'));

  assert.match(fbCreate, /checkStrongBackupPassword\(/, "fb-create phải gọi checkStrongBackupPassword");
  assert.match(kyCreate, /checkStrongBackupPassword\(/, "ky-create phải gọi checkStrongBackupPassword");
  assert.doesNotMatch(fbInspect, /checkStrongBackupPassword/, "fb-inspect không được chặn mật khẩu gói cũ");
  assert.doesNotMatch(kyInspect, /checkStrongBackupPassword/, "ky-inspect không được chặn mật khẩu gói cũ");
});

test("P3.10-05 gói cũ mã hóa bằng mật khẩu yếu cũ (password12) vẫn giải mã được", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-pw-old-"));
  try {
    const plain = path.join(dir, "plain.zip");
    const enc = path.join(dir, "old.hakenc");
    const dec = path.join(dir, "dec.zip");
    fs.writeFileSync(plain, Buffer.from("PK-old-backup-data"));
    const en = await bcrypt.encryptFile(plain, enc, "password12", { scrypt: { N: 1 << 14, r: 8, p: 1 } });
    assert.equal(en.ok, true);
    const de = await bcrypt.decryptFile(enc, dec, "password12");
    assert.equal(de.ok, true, "giải mã gói cũ với mật khẩu cũ phải thành công");
    assert.equal(fs.readFileSync(dec, "utf8"), "PK-old-backup-data");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
