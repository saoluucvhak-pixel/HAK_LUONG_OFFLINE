// Bản chụp SQLite TRONG gói Full Backup (002b): (1) kiểm một tệp bản chụp trước khi đưa vào / nhận từ gói; (2) khôi phục kho từ bản chụp trong gói.
// Mã SQLite chỉ nằm ở các tệp main/sqlite-*.js (xem tests/unit/sqlite-shadow.test.js U-SQL-07) nên fullbackup.js gọi vào đây thay vì tự mở SQLite.
// Khôi phục: gói đã qua inspect → giải nén bản chụp ra tệp tạm → storage.restoreFromSnapshot (cùng đường kiểm/cất bản cũ/thay nguyên tử/kiểm toán như
// khôi phục từ backups/data-snapshot.sqlite) → dọn tệp tạm. Chỉ chạy được khi kho không mở được (restoreFromSnapshot tự từ chối khi kho đang lành).
"use strict";
const fs = require("node:fs"), path = require("node:path");
const SQ = require("./sqlite-store");

/** Kiểm tệp bản chụp: kho HAK, schema ≤ app, integrity_check ok, số dòng records = wantRows (số dòng của data.json cùng thời điểm). Ném lỗi nếu không đạt. → { schema, records } */
function checkSnapshotFile(file, wantRows) {
  const { DatabaseSync } = SQ.driver(), db = new DatabaseSync(file, { readOnly: true });
  try {
    const mk = db.prepare("SELECT value FROM meta WHERE key = 'mark'").get(); if (!mk || mk.value !== SQ.MARK) throw new Error("không phải kho dữ liệu của HAK Lương");
    const schema = Number(db.prepare("PRAGMA user_version").get().user_version); if (schema > SQ.SCHEMA_VERSION) throw new Error("schema v" + schema + " mới hơn app này (v" + SQ.SCHEMA_VERSION + ")");
    const ic = db.prepare("PRAGMA integrity_check").get().integrity_check; if (ic !== "ok") throw new Error("integrity_check: " + ic);
    const records = db.prepare("SELECT COUNT(*) AS c FROM records").get().c; if (records !== wantRows) throw new Error("lệch data.json (" + records + " dòng so với " + wantRows + " dòng trong data.json)");
    return { schema, records };
  } finally { db.close(); }
}

/** @param storage kho SQLite (createSqliteStorage) · @param pkgFile gói .zip (đã giải mã nếu có mã hóa) · @param opts { tmpDir } → kết quả của restoreFromSnapshot | { ok:false, error } */
function restoreFromPackage(storage, pkgFile, actor, opts) {
  const FB = require("./fullbackup"); // nạp muộn: fullbackup.js cũng nạp tệp này
  if (!storage || typeof storage.restoreFromSnapshot !== "function") return { ok: false, error: "Chế độ lưu này không hỗ trợ khôi phục từ bản chụp SQLite." };
  if (!storage.needsRecovery()) return { ok: false, error: "Kho dữ liệu đang mở bình thường — không khôi phục từ bản chụp trong gói để tránh ghi đè dữ liệu tốt. Chỉ dùng khi data.sqlite hỏng hoặc mất." };
  const tmp = path.join((opts && opts.tmpDir) || path.dirname(pkgFile), "restore-snapshot-" + process.pid + "-" + Date.now() + ".sqlite");
  try {
    const ex = FB.extractSqliteSnapshot(pkgFile, tmp); if (!ex.ok) return { ok: false, error: ex.error };
    return storage.restoreFromSnapshot(actor, { file: tmp, source: "gói " + path.basename(pkgFile), expectRecords: ex.rows });
  } finally { for (const x of ["", "-wal", "-shm"]) { try { fs.rmSync(tmp + x, { force: true }); } catch (e) { /* bỏ qua */ } } }
}
module.exports = { checkSnapshotFile, restoreFromPackage, SCHEMA_VERSION: SQ.SCHEMA_VERSION };
