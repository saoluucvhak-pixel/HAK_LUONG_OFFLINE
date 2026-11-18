// Kho SQLite: KILL TIẾN TRÌNH THẬT giữa lúc lưu nhiều bảng, và DB bị khóa bởi kết nối khác. Dữ liệu GIẢ.
// Chứng minh: (1) bị kill -9 bất kỳ lúc nào, mở lại chỉ thấy MỘT phiên bản trọn vẹn (hai bảng cùng nhãn), không mất phiên bản đã báo "SAVED", không lẫn nửa cũ nửa mới;
// (2) DB bị khóa giữ ngoài app → lưu báo LỖI (không báo thành công), dữ liệu trước đó nguyên vẹn; nhả khóa thì lưu lại được.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const store = require("../../main/sqlite-store.js");
const dirOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-crash-"));
const LOOP = path.resolve(__dirname, "../fixtures/sqlite-save-loop.cjs");

/** Chạy tiến trình con lưu liên tục; đợi ít nhất `minSaved` lần lưu xong rồi kill -9 sau thêm `extraMs`. Trả { lastSaved, lastSaving }. */
function runAndKill(dir, start, minSaved, extraMs) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, ["--no-warnings", LOOP, dir, "1500", String(start)], { stdio: ["ignore", "pipe", "pipe"] });
    let buf = "", lastSaved = 0, lastSaving = 0, saved = 0, killed = false, err = "";
    child.stderr.on("data", (c) => { err += c; });
    child.stdout.on("data", (c) => {
      buf += c; let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        let m;
        if ((m = /^SAVING (\d+)$/.exec(line))) lastSaving = +m[1];
        else if ((m = /^SAVED (\d+)$/.exec(line))) { lastSaved = +m[1]; saved++; if (saved >= minSaved && !killed) { killed = true; setTimeout(() => { try { child.kill("SIGKILL"); } catch (e) { /* đã thoát */ } }, extraMs); } }
        else if (/^ERROR/.test(line)) reject(new Error(line));
      }
    });
    child.on("exit", () => resolve({ lastSaved, lastSaving, err }));
    setTimeout(() => { try { child.kill("SIGKILL"); } catch (e) { /* bỏ qua */ } }, 90000).unref();
  });
}

test("U-CRASH-01: kill -9 thật giữa lúc lưu hai bảng (6 lần liên tiếp, thời điểm kill khác nhau): mở lại luôn thấy MỘT phiên bản trọn vẹn, không mất phiên bản đã báo SAVED", { timeout: 240000 }, async () => {
  const dir = dirOf(); let start = 1; const history = [];
  for (const [minSaved, extra] of [[2, 0], [2, 7], [3, 23], [2, 61], [4, 3], [2, 111]]) {
    const r = await runAndKill(dir, start, minSaved, extra);
    assert.ok(r.lastSaved >= 1, "tiến trình con phải lưu được ít nhất 1 lần. stderr: " + r.err.slice(0, 200));
    // Mở lại như app khởi động sau sự cố (khóa còn sót của tiến trình đã chết phải được nhận ra là cũ)
    const s = createSqliteStorage(dir, { exportDelayMs: 60000 }), ld = s.load();
    assert.equal(ld.ok, true, "mở lại sau kill: " + JSON.stringify(ld).slice(0, 200));
    const d = JSON.parse(ld.text);
    const nvTags = new Set(d.nhanvien.map((x) => x["Nhãn lưu"])), hdTags = new Set(d.hopdong.map((x) => x["Nhãn lưu"]));
    assert.equal(nvTags.size, 1, "bảng nhanvien lẫn nhiều phiên bản: " + [...nvTags].join(","));
    assert.equal(hdTags.size, 1, "bảng hopdong lẫn nhiều phiên bản: " + [...hdTags].join(","));
    const v = [...nvTags][0];
    assert.equal(v, [...hdTags][0], "hai bảng lệch phiên bản (không nguyên tử): " + v + " vs " + [...hdTags][0]);
    assert.ok(v >= r.lastSaved, "mất phiên bản đã báo SAVED: còn " + v + " < " + r.lastSaved);
    assert.ok(v <= r.lastSaving, "phiên bản không từng được bắt đầu lưu: " + v + " > " + r.lastSaving);
    history.push({ saved: r.lastSaved, saving: r.lastSaving, found: v });
    // Kho mở lại phải ghi được tiếp (không kẹt khóa/WAL hỏng)
    d.nhanvien.forEach((x) => { x["Nhãn lưu"] = v + 1; }); d.hopdong.forEach((x) => { x["Nhãn lưu"] = v + 1; });
    assert.equal(s.save(JSON.stringify(d)), true, "ghi tiếp sau sự cố");
    s.close(); start = v + 2;
    const db = store.open(path.join(dir, "data.sqlite"), { readonly: true });
    try { assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok"); } finally { store.close(db); }
  }
  if (process.env.HAK_TEST_VERBOSE) console.log("KILL-HISTORY " + JSON.stringify(history));
  assert.equal(history.length, 6);
  assert.ok(history.some((h) => h.saving > h.saved), "ít nhất một lần kill phải rơi vào GIỮA lúc lưu (SAVING > SAVED), nếu không test chưa chứng minh gì: " + JSON.stringify(history));
});

test("U-CRASH-02: DB bị khóa ghi bởi kết nối khác → lưu báo LỖI (không báo thành công), dữ liệu cũ nguyên; nhả khóa thì lưu lại được", { timeout: 60000 }, () => {
  const dir = dirOf(), s = createSqliteStorage(dir, { exportDelayMs: 60000 });
  const { regressionDataset } = require("../fixtures/build.js"), d = regressionDataset(50);
  assert.equal(s.save(JSON.stringify(d)), true);
  const before = s.load().text;
  const other = store.open(path.join(dir, "data.sqlite"));
  other.exec("BEGIN IMMEDIATE"); // kết nối ngoài giữ khóa ghi
  try {
    d.nhanvien[0]["Họ và tên"] = "Sửa khi DB đang bị khóa";
    const t0 = Date.now(), r = s.save(JSON.stringify(d)), took = Date.now() - t0;
    assert.notEqual(r, true, "KHÔNG được báo thành công khi DB bị khóa");
    assert.match(String(r), /./, "phải có thông báo lỗi");
    assert.ok(took >= 3000 && took < 20000, "chờ theo busy_timeout (≈5 s) rồi báo lỗi, không treo vô hạn: " + took + " ms");
    assert.equal(s.load().text, before, "dữ liệu trong bộ nhớ/kho giữ nguyên sau lần lưu hỏng");
  } finally { other.exec("ROLLBACK"); store.close(other); }
  assert.equal(s.save(JSON.stringify(d)), true, "nhả khóa → lưu lại được");
  assert.equal(JSON.parse(s.load().text).nhanvien[0]["Họ và tên"], "Sửa khi DB đang bị khóa");
  s.close();
  const s2 = createSqliteStorage(dir, { exportDelayMs: 60000 });
  assert.equal(JSON.parse(s2.load().text).nhanvien[0]["Họ và tên"], "Sửa khi DB đang bị khóa", "mở lại vẫn đủ");
  s2.close();
});
