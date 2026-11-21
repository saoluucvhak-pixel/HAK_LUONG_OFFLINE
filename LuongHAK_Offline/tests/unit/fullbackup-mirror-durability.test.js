"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const fullBackup = require("../../main/fullbackup.js");
const store = require("../../main/sqlite-store.js");

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-mirror-dur-"));

test("P3.9-01 mirrorFullBackup chép gói + .sha256 sang <mirrorDir>/FullBackup an toàn và dọn .tmp mồ côi", () => {
  assert.equal(typeof fullBackup.copyFileDurable, "function", "phải export copyFileDurable");
  assert.equal(typeof fullBackup.mirrorFullBackup, "function", "phải export mirrorFullBackup");

  const dir = mkTmp();
  try {
    const srcDir = path.join(dir, "src");
    const mirrorDir = path.join(dir, "mirror");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(path.join(mirrorDir, "FullBackup"), { recursive: true });

    // Tạo .tmp mồ côi từ lần crash trước
    const orphanTmp = path.join(mirrorDir, "FullBackup", "LuongHAK_FullBackup_old.zip.tmp");
    fs.writeFileSync(orphanTmp, "partial-junk");

    const pkgName = "LuongHAK_FullBackup_20261120_120000.zip";
    const srcFile = path.join(srcDir, pkgName);
    const payload = Buffer.from("PK-test-fullbackup-content-" + "x".repeat(4096));
    const pkgSha = sha(payload);
    fs.writeFileSync(srcFile, payload);
    fs.writeFileSync(srcFile + ".sha256", pkgSha + "  " + pkgName + "\n");

    const outDir = fullBackup.mirrorFullBackup(srcFile, mirrorDir, { expectedSha256: pkgSha });
    assert.equal(outDir, path.join(mirrorDir, "FullBackup"));

    const destFile = path.join(outDir, pkgName);
    const destShaFile = destFile + ".sha256";
    assert.equal(fs.existsSync(destFile), true, "gói dự phòng phải tồn tại");
    assert.equal(fs.existsSync(destShaFile), true, "file .sha256 dự phòng phải tồn tại");
    assert.equal(sha(fs.readFileSync(destFile)), pkgSha, "SHA-256 gói dự phòng phải khớp");
    assert.equal(fs.existsSync(orphanTmp), false, "phải dọn .tmp mồ côi");
    assert.equal(fs.existsSync(destFile + ".tmp"), false, "không được để lại .tmp");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("P3.9-02 lỗi khi chép giữa chừng: không để lại gói cụt mang tên hợp lệ và phải dọn .tmp", () => {
  const dir = mkTmp();
  try {
    const srcDir = path.join(dir, "src");
    const mirrorDir = path.join(dir, "mirror");
    fs.mkdirSync(srcDir, { recursive: true });

    const pkgName = "LuongHAK_FullBackup_20261120_120001.zip";
    const srcFile = path.join(srcDir, pkgName);
    const payload = Buffer.from("valid-package-bytes");
    fs.writeFileSync(srcFile, payload);

    // Mô phỏng copyFileSync ghi một phần vào .tmp rồi crash
    const fakeFs = Object.assign({}, fs, {
      copyFileSync(s, d) {
        fs.writeFileSync(d, payload.subarray(0, 5));
        throw new Error("EIO: disk write interrupted");
      }
    });

    assert.throws(
      () => fullBackup.mirrorFullBackup(srcFile, mirrorDir, { expectedSha256: sha(payload), fsImpl: fakeFs }),
      /EIO: disk write interrupted/
    );

    const fbMirror = path.join(mirrorDir, "FullBackup");
    assert.equal(fs.existsSync(path.join(fbMirror, pkgName)), false, "không được để lại gói cụt mang tên hợp lệ");
    assert.equal(fs.existsSync(path.join(fbMirror, pkgName + ".tmp")), false, "phải dọn file .tmp khi lỗi");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("P3.9-03 sai SHA-256 khi chép dự phòng: từ chối đổi tên, không để lại gói lỗi và dọn .tmp", () => {
  const dir = mkTmp();
  try {
    const srcDir = path.join(dir, "src");
    const mirrorDir = path.join(dir, "mirror");
    fs.mkdirSync(srcDir, { recursive: true });

    const pkgName = "LuongHAK_FullBackup_20261120_120002.zip";
    const srcFile = path.join(srcDir, pkgName);
    fs.writeFileSync(srcFile, Buffer.from("actual-bytes"));

    assert.throws(
      () => fullBackup.mirrorFullBackup(srcFile, mirrorDir, { expectedSha256: "0".repeat(64) }),
      /SHA-256/i
    );

    const fbMirror = path.join(mirrorDir, "FullBackup");
    assert.equal(fs.existsSync(path.join(fbMirror, pkgName)), false, "không được đổi tên thành gói hợp lệ khi sai SHA");
    assert.equal(fs.existsSync(path.join(fbMirror, pkgName + ".tmp")), false, "phải dọn .tmp khi sai SHA");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("P3.9-04 sqlite-store.snapshot gọi fsyncSync trên tệp tạm trước renameSync", () => {
  const dir = mkTmp();
  const dbPath = path.join(dir, "data.sqlite");
  const snapPath = path.join(dir, "data-snapshot.sqlite");
  const db = store.open(dbPath);
  store.migrate(db);
  const events = [];

  const origOpen = fs.openSync;
  const origFsync = fs.fsyncSync;
  const origClose = fs.closeSync;
  const origRename = fs.renameSync;

  let trackedFd = null;
  fs.openSync = function (p, flags, mode) {
    const fd = origOpen.apply(fs, arguments);
    if (String(p) === snapPath + ".tmp" && (flags === "r+" || flags === "r")) {
      trackedFd = fd;
      events.push("open:" + p);
    }
    return fd;
  };
  fs.fsyncSync = function (fd) {
    if (fd === trackedFd) events.push("fsync:" + fd);
    return origFsync.apply(fs, arguments);
  };
  fs.closeSync = function (fd) {
    if (fd === trackedFd) events.push("close:" + fd);
    return origClose.apply(fs, arguments);
  };
  fs.renameSync = function (oldP, newP) {
    if (String(oldP) === snapPath + ".tmp" && String(newP) === snapPath) {
      events.push("rename:" + newP);
    }
    return origRename.apply(fs, arguments);
  };

  try {
    const res = store.snapshot(db, snapPath);
    assert.equal(res.ok, true, "snapshot phải thành công: " + JSON.stringify(res));
    assert.equal(fs.existsSync(snapPath), true);
    const fsyncIdx = events.findIndex((e) => e.startsWith("fsync:"));
    const closeIdx = events.findIndex((e) => e.startsWith("close:"));
    const renameIdx = events.findIndex((e) => e.startsWith("rename:"));
    assert.ok(fsyncIdx >= 0, "phải gọi fsyncSync trên tệp tạm trước khi renameSync. events=" + JSON.stringify(events));
    assert.ok(closeIdx > fsyncIdx, "phải đóng fd sau fsyncSync");
    assert.ok(renameIdx > closeIdx, "phải renameSync sau khi fsyncSync và closeSync");
  } finally {
    fs.openSync = origOpen;
    fs.fsyncSync = origFsync;
    fs.closeSync = origClose;
    fs.renameSync = origRename;
    try { store.close(db); } catch (e) { /* bỏ qua */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("P3.9-05 main.js dùng mirrorFullBackup thay cho fsp.copyFile thô ở đường dự phòng", () => {
  const mainSrc = fs.readFileSync(path.resolve(__dirname, "../../main.js"), "utf8");
  assert.match(mainSrc, /mirrorFullBackup\(/, "main.js phải gọi fullBackup.mirrorFullBackup");
  assert.doesNotMatch(mainSrc, /fsp\.copyFile\(r\.file/, "main.js không được dùng fsp.copyFile thô cho đường dự phòng");
});
