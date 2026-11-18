// A02: sao lưu từ kho SQLite chính không được "thành công giả" bằng dữ liệu cũ khi xuất data.json lỗi. Dữ liệu giả, fs thật.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { fixture } = require("../fixtures/production-carry");

const dirOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-bk-"));
const doc = (name) => { const d = JSON.parse(JSON.stringify(fixture())); d.nhanvien.push({ "Mã NV": "0005", "Họ và tên": name || "Gốc" }); return d; };
function failExport(code, fn) {
  const real = fs.renameSync; fs.renameSync = function (a, b) { if (String(b).endsWith("data.json")) { const e = new Error(code + ": giả lập"); e.code = code; throw e; } return real.apply(this, arguments); };
  try { return fn(); } finally { fs.renameSync = real; }
}
function make() {
  const dir = dirOf(), s = createSqliteStorage(dir, { exportDelayMs: 600000 }), old = doc("Cũ"), latest = doc("DỮ LIỆU MỚI");
  assert.equal(s.save(JSON.stringify(old)), true); assert.equal(s.syncJson(), true);
  const good = s.backup("manual"); assert.ok(good, "bản sao lưu tốt trước đó");
  assert.equal(s.save(JSON.stringify(latest)), true); // SQLite đã commit dữ liệu mới, data.json còn cũ
  return { dir, s, old, latest, good };
}
const files = (s) => { try { return fs.readdirSync(s.backupDir).sort(); } catch (e) { return []; } };

for (const code of ["EACCES", "ENOSPC"]) {
  test("U-A02-01 " + code + " khi xuất data.json: backup/backupYear/lịch/đóng/mirror KHÔNG thành công giả, KHÔNG tạo bản từ file cũ, bản tốt trước đó nguyên vẹn", () => {
    const { s, good } = make(), before = files(s);
    failExport(code, () => {
      assert.equal(s.backup("manual"), null); assert.match(s.lastBackupError(), /KHÔNG tạo bản sao lưu từ file cũ/);
      assert.equal(s.backupYear(2026), null);
      assert.equal(s.backupOnClose(), null);
      assert.equal(s.tickSchedule(), null);
      const m = s.syncMirror(); assert.equal(m.ok, false); assert.match(m.error, /KHÔNG tạo bản sao lưu từ file cũ/);
      assert.equal(s.changedSinceBackup(), true, "không biết chắc → coi là đã đổi, không báo 'không đổi'");
    });
    assert.deepEqual(files(s), before, "không sinh thêm file sao lưu nào"); assert.ok(s.readBackup(good).ok, "bản tốt trước đó còn đọc được"); s.close();
  });
}

test("U-A02-02 hết lỗi xuất → bản sao lưu chứa ĐÚNG revision mới nhất; khôi phục (đọc lại) bản vừa tạo khớp từng ký tự", () => {
  const { s, latest } = make();
  failExport("EACCES", () => assert.equal(s.backup("manual"), null));
  const f = s.backup("manual"); assert.ok(f, "sau khi hết lỗi tạo được");
  const r = s.readBackup(f); assert.equal(r.ok, true); assert.equal(r.text, JSON.stringify(latest), "đúng dữ liệu mới nhất, không phải bản cũ");
  assert.ok(s.verifyAll().filter((b) => b.name === f).every((b) => b.status === "ok" || b.status === "unverified"), "checksum bản sao lưu hợp lệ"); s.close();
});

test("U-A02-03 bản bảo vệ trước thay đổi (đầu ngày): không tạo được thì CHẶN lưu, SQLite giữ nguyên, không có bản từ file cũ", () => {
  const dir = dirOf(), s = createSqliteStorage(dir, { exportDelayMs: 600000 }), a = doc("A"), b = doc("B");
  assert.equal(s.save(JSON.stringify(a)), true); // lần lưu đầu: chưa có trạng thái trước
  const before = files(s);
  const r = failExport("EACCES", () => s.save(JSON.stringify(b)));
  assert.equal(typeof r, "string"); assert.match(r, /Không tạo được bản sao lưu bảo vệ/); assert.match(r, /Dữ liệu chưa bị thay đổi/);
  assert.equal(s.load().text, JSON.stringify(a), "bộ nhớ không đi trước"); assert.deepEqual(files(s), before);
  assert.equal(s.save(JSON.stringify(b)), true, "hết lỗi thì lưu được");
  const daily = s.list().find((x) => x.tag === "daily"); assert.ok(daily); assert.equal(s.readBackup(daily.name).text, JSON.stringify(a), "bản đầu ngày = trạng thái TRƯỚC thay đổi"); s.close();
});

test("U-A02-04 bản sao lưu vừa tạo không khớp revision (file xuất bị đổi giữa chừng) bị hủy, không báo thành công", () => {
  const { s, dir, good } = make(); s.syncJson();
  // data.json bị ghi đè NGAY sau khi xuất (ngoài ứng dụng) rồi mới tới bước sao lưu
  const exportOk = s.syncJson(); assert.equal(exportOk, true); fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(doc("BỊ GHI ĐÈ NGOÀI APP")));
  assert.equal(s.backup("manual"), null, "export không khớp revision → không sao lưu"); assert.match(s.lastBackupError(), /KHÔNG tạo bản sao lưu từ file cũ|không khớp/);
  assert.ok(s.readBackup(good).ok); s.close();
});
