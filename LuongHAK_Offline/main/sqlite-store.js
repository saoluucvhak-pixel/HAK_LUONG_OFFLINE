// Kho SQLite ỨNG VIÊN của HAK Lương Offline (node:sqlite — có sẵn trong Node 22.5+/Electron 45, không cần module native).
// CHƯA phải nguồn dữ liệu vận hành: app vẫn đọc/ghi data.json cho tới khi qua đủ các cổng nghiệm thu (docs/MIGRATION_PLAN.md).
// Phần này gồm: mở kết nối có PRAGMA kiểm chứng, migrations đánh số, giao dịch ghi một dòng có revision + idempotency key + audit cùng commit.
"use strict";

const SCHEMA_VERSION = 1;   // user_version tối đa app này hiểu; file mới hơn → từ chối mở
const MARK = "hak-luong-sqlite", BUSY_MS = 5000;

function driver() {
  try { return require("node:sqlite"); }
  catch (e) { throw new Error("Bản Node/Electron này không có node:sqlite (cần Node 22.5+ hoặc Electron 45): " + e.message); }
}

/** Các bước nâng schema, theo thứ tự; mỗi bước chạy trong MỘT giao dịch cùng việc ghi user_version. */
const MIGRATIONS = [
  { version: 1, name: "khoi-tao", sql: `
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
    CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);
    CREATE TABLE migration_journal (id INTEGER PRIMARY KEY, state TEXT NOT NULL, source_sha256 TEXT, detail TEXT, at TEXT NOT NULL);
    -- Giá trị cấp ngoài cùng không phải bảng dòng (đối tượng cấu hình, số, chuỗi): giữ nguyên thứ tự và JSON gốc
    CREATE TABLE top_value (pos INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, json TEXT) ;
    -- Mỗi dòng nghiệp vụ một dòng: id nội bộ ổn định (không phải chỉ số mảng), pos giữ thứ tự gốc, json là payload NGUYÊN VẸN
    -- (kể cả snapshot kỳ chốt: không chuẩn hóa/sắp xếp lại nên checksum cũ không đổi). bkey là khóa nghiệp vụ chuẩn hóa (không UNIQUE: trùng được báo, không tự gộp).
    CREATE TABLE records (tbl TEXT NOT NULL, id TEXT NOT NULL, pos INTEGER NOT NULL, bkey TEXT, json TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (tbl, id)) WITHOUT ROWID;
    CREATE UNIQUE INDEX records_pos ON records (tbl, pos);
    CREATE INDEX records_bkey ON records (tbl, bkey);
    -- Thao tác ghi: idempotency key chống bấm đúp/retry; audit nằm CÙNG giao dịch với dữ liệu
    CREATE TABLE applied_requests (request_id TEXT PRIMARY KEY, applied_at TEXT NOT NULL, revision INTEGER NOT NULL) WITHOUT ROWID;
    CREATE TABLE audit (seq INTEGER PRIMARY KEY, at TEXT NOT NULL, actor TEXT, action TEXT NOT NULL, tbl TEXT, id TEXT, detail TEXT);
  ` }
];

function pragma(db, name) { const row = db.prepare("PRAGMA " + name).get(); return row ? Object.values(row)[0] : undefined; }

/** Mở kết nối: bật foreign_keys, WAL, synchronous FULL, busy_timeout; ĐỌC LẠI để xác nhận từng PRAGMA thực sự có hiệu lực. */
function open(file, opts) {
  const { DatabaseSync } = driver(), db = new DatabaseSync(file);
  const readonly = !!(opts && opts.readonly);
  db.exec("PRAGMA busy_timeout = " + BUSY_MS + "; PRAGMA foreign_keys = ON;");
  if (!readonly) db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
  const got = { foreign_keys: pragma(db, "foreign_keys"), journal_mode: String(pragma(db, "journal_mode")).toLowerCase(), synchronous: pragma(db, "synchronous"), busy_timeout: pragma(db, "busy_timeout") };
  if (got.foreign_keys !== 1 || got.busy_timeout !== BUSY_MS || (!readonly && (got.journal_mode !== "wal" || got.synchronous !== 2))) {
    db.close(); throw new Error("PRAGMA không có hiệu lực như thiết kế: " + JSON.stringify(got));
  }
  const version = pragma(db, "user_version");
  if (version > SCHEMA_VERSION) { db.close(); throw new Error("Kho dữ liệu có schema v" + version + " mới hơn app này (hỗ trợ tới v" + SCHEMA_VERSION + "): không mở — hãy cập nhật ứng dụng."); }
  db.pragmas = got;
  return db;
}

function tx(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try { const out = fn(); db.exec("COMMIT"); return out; }
  catch (e) { try { db.exec("ROLLBACK"); } catch (e2) { /* giao dịch đã tự hủy */ } throw e; }
}

/** Nâng schema tới SCHEMA_VERSION (idempotent). */
function migrate(db) {
  const current = pragma(db, "user_version");
  MIGRATIONS.filter((m) => m.version > current).forEach((m) => tx(db, () => {
    db.exec(m.sql);
    db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(m.version, m.name, new Date().toISOString());
    db.exec("PRAGMA user_version = " + m.version);
  }));
  db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('mark', ?)").run(MARK);
  return pragma(db, "user_version");
}

function isHakStore(db) { try { const row = db.prepare("SELECT value FROM meta WHERE key = 'mark'").get(); return !!row && row.value === MARK; } catch (e) { return false; } }

/**
 * Ghi thay đổi của MỘT thao tác nghiệp vụ trong một giao dịch: dòng dữ liệu + revision + audit cùng commit.
 *   change = { requestId, actor, action, table, upsert: [{ id, row, bkey?, expectedRev? }], remove: [{ id, expectedRev? }] }
 * - requestId đã áp dụng → trả lại kết quả cũ, KHÔNG ghi lần hai (chống bấm đúp / retry IPC).
 * - expectedRev lệch revision hiện tại → từ chối (bản sửa đã cũ).
 * - Bất kỳ lỗi nào (kể cả ghi audit) → hoàn tác toàn bộ, không báo thành công.
 * Chỉ ghi đúng các dòng được nêu; không quét hay tuần tự hóa lại cả hồ sơ.
 */
function applyChange(db, change) {
  if (!change || !change.requestId || !change.table) throw new Error("Thiếu requestId hoặc bảng");
  const done = db.prepare("SELECT revision FROM applied_requests WHERE request_id = ?").get(change.requestId);
  if (done) return { duplicate: true, revision: done.revision, written: 0 };
  return tx(db, () => {
    const again = db.prepare("SELECT revision FROM applied_requests WHERE request_id = ?").get(change.requestId);
    if (again) return { duplicate: true, revision: again.revision, written: 0 };
    const sel = db.prepare("SELECT rev FROM records WHERE tbl = ? AND id = ?"), maxPos = db.prepare("SELECT COALESCE(MAX(pos), -1) AS p FROM records WHERE tbl = ?");
    let written = 0;
    (change.upsert || []).forEach((u) => {
      const text = JSON.stringify(u.row), now = sel.get(change.table, u.id);
      if (u.expectedRev != null && (!now || now.rev !== u.expectedRev)) throw new Error("Bản ghi " + change.table + "/" + u.id + " đã được sửa ở nơi khác (revision " + (now ? now.rev : "không có") + " ≠ " + u.expectedRev + "): tải lại rồi sửa tiếp.");
      if (now) db.prepare("UPDATE records SET json = ?, bkey = COALESCE(?, bkey), rev = rev + 1 WHERE tbl = ? AND id = ?").run(text, u.bkey == null ? null : u.bkey, change.table, u.id);
      else db.prepare("INSERT INTO records (tbl, id, pos, bkey, json) VALUES (?, ?, ?, ?, ?)").run(change.table, u.id, maxPos.get(change.table).p + 1, u.bkey == null ? null : u.bkey, text);
      written++;
    });
    (change.remove || []).forEach((r) => {
      const now = sel.get(change.table, r.id);
      if (r.expectedRev != null && (!now || now.rev !== r.expectedRev)) throw new Error("Bản ghi " + change.table + "/" + r.id + " đã đổi: không xóa theo bản cũ.");
      written += db.prepare("DELETE FROM records WHERE tbl = ? AND id = ?").run(change.table, r.id).changes;
    });
    const rev = Number((db.prepare("SELECT COALESCE(MAX(revision), 0) + 1 AS r FROM applied_requests").get() || { r: 1 }).r);
    db.prepare("INSERT INTO audit (at, actor, action, tbl, id, detail) VALUES (?, ?, ?, ?, ?, ?)").run(new Date().toISOString(), change.actor || "", change.action || "ghi", change.table,
      ((change.upsert || [])[0] || (change.remove || [])[0] || {}).id || "", JSON.stringify({ upsert: (change.upsert || []).length, remove: (change.remove || []).length, requestId: change.requestId }));
    db.prepare("INSERT INTO applied_requests (request_id, applied_at, revision) VALUES (?, ?, ?)").run(change.requestId, new Date().toISOString(), rev);
    return { duplicate: false, revision: rev, written };
  });
}

/** Checkpoint WAL rồi đóng: file .sqlite đứng một mình, không còn -wal/-shm. */
function close(db) { try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch (e) { /* chỉ đọc */ } db.close(); }

module.exports = { SCHEMA_VERSION, MARK, driver, open, migrate, tx, applyChange, close, isHakStore, pragma };
