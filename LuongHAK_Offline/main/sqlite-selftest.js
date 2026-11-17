// Tự kiểm SQLite trong app đóng gói: lưu → sửa một dòng → đóng → mở lại → đọc, trên thư mục tạm (không đụng dữ liệu người dùng).
"use strict";
const fs = require("node:fs"), path = require("node:path");
const { createSqliteStorage } = require("./sqlite-storage.js");
const store = require("./sqlite-store.js");

function run(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const out = { ok: false, steps: [] };
  const step = (name, cond, extra) => { out.steps.push({ name, pass: !!cond, extra: extra || "" }); if (!cond) throw new Error("Không đạt: " + name + (extra ? " — " + extra : "")); };
  try {
    const db0 = store.open(path.join(dir, "probe.sqlite")); out.sqliteVersion = db0.prepare("select sqlite_version() v").get().v; out.pragmas = db0.pragmas; store.close(db0);
    step("PRAGMA có hiệu lực (khóa ngoại, WAL, synchronous FULL, busy_timeout)", out.pragmas.foreign_keys === 1 && out.pragmas.journal_mode === "wal" && out.pragmas.synchronous === 2 && out.pragmas.busy_timeout === 5000, JSON.stringify(out.pragmas));
    const sample = { nhanvien: [{ "Mã NV": "0005", "Họ và tên": "Nguyễn Văn Ánh" }, { "Mã NV": "0006", "Họ và tên": "Trần Thị Bé" }], chamcong: [{ "Kỳ": "2026-10", "Mã NV": "0005", "01": "1" }], cauhinh: { ky: "2026-10", n: 7 } };
    const s = createSqliteStorage(dir, { exportSync: true });
    step("hồ sơ mới đọc được (chưa có dữ liệu)", s.load().ok === true && s.load().text === null);
    step("lưu lần đầu", s.save(JSON.stringify(sample)) === true);
    sample.nhanvien[1]["Họ và tên"] = "Đã sửa"; step("sửa một dòng", s.save(JSON.stringify(sample)) === true);
    s.close();
    step("data.json là bản xuất đủ giao dịch", fs.readFileSync(path.join(dir, "data.json"), "utf8") === JSON.stringify(sample));
    const s2 = createSqliteStorage(dir, { exportSync: true }), r = s2.load();
    step("mở lại và đọc đúng từng ký tự (số 0 đầu, Unicode)", r.ok === true && r.text === JSON.stringify(sample));
    s2.close(); out.ok = true;
  } catch (e) { out.error = String(e && e.message || e); }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* bỏ qua */ }
  return out;
}
module.exports = { run };
