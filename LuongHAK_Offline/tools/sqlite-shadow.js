// Kho SQLite "bóng" — CHỈ ĐỂ SO SÁNH. App không dùng file này: app vẫn đọc và ghi JSON như cũ.
//
// Mục đích (MIGRATION_PLAN §2, bước chuẩn bị): chứng minh trước khi đổi nơi lưu dữ liệu rằng
//   1. node:sqlite (có sẵn trong Node 22+/Electron 45, không cần module native) ghi và đọc lại dữ liệu lương KHÔNG sai một ký tự;
//   2. kết quả tính lương từ bản đọc lại giống hệt kết quả từ JSON, ở mọi kỳ có chấm công;
//   3. khi dữ liệu đổi ít thì chỉ phải ghi ít dòng (lợi ích chính của SQLite so với ghi lại cả file JSON).
//
// Cách lưu ở đây là "mỗi dòng dữ liệu một dòng SQLite" (cột json), CHƯA phải lược đồ chuẩn hóa trong DATABASE_SCHEMA §2.
// File này nằm ngoài danh sách build.files nên không vào bộ cài.
//
// Dùng từ dòng lệnh, trên MỘT BẢN SAO dữ liệu (file JSON chỉ được đọc, không bao giờ bị ghi):
//   node tools/sqlite-shadow.js <đường-dẫn-data.json> [file-sqlite-đầu-ra]
"use strict";
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");

const MARK = "hak-luong-sqlite-shadow", FORMAT = 1;

function sqlite() {
  try { return require("node:sqlite"); }
  catch (e) { throw new Error("Bản Node này không có node:sqlite (cần Node 22.5+ hoặc Electron 45): " + e.message); }
}
function sha256(text) { return crypto.createHash("sha256").update(text).digest("hex"); }

/** Mở (hoặc tạo) kho bóng. Từ chối mở file SQLite không phải do công cụ này tạo, để không ghi nhầm vào file khác. */
function open(file) {
  const { DatabaseSync } = sqlite(), existed = file !== ":memory:" && fs.existsSync(file) && fs.statSync(file).size > 0;
  const db = new DatabaseSync(file);
  if (existed) {
    let mark = null;
    try { mark = db.prepare("SELECT value FROM meta WHERE key = 'mark'").get(); } catch (e) { /* không có bảng meta */ }
    if (!mark || mark.value !== MARK) { db.close(); throw new Error("File đã tồn tại và không phải kho bóng của công cụ này, không ghi đè: " + file); }
  }
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;" +
    "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);" +
    "CREATE TABLE IF NOT EXISTS top (pos INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, json TEXT);" +
    "CREATE TABLE IF NOT EXISTS row (tbl TEXT NOT NULL, pos INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY (tbl, pos)) WITHOUT ROWID;");
  db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('mark', ?), ('format', ?)").run(MARK, String(FORMAT));
  return db;
}

function tx(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try { const out = fn(); db.exec("COMMIT"); return out; }
  catch (e) { db.exec("ROLLBACK"); throw e; }
}

/**
 * Đưa kho bóng về đúng trạng thái của `data`, chỉ ghi những dòng khác. Một giao dịch duy nhất: hoặc trọn bộ, hoặc không gì.
 * Khóa cấp ngoài cùng là mảng → mỗi phần tử một dòng trong `row`; giá trị khác (đối tượng, chuỗi, số) → một dòng trong `top`.
 * Trả thống kê số dòng thêm / sửa / xóa / giữ nguyên.
 */
function sync(db, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Dữ liệu phải là một đối tượng gồm các bảng");
  const stats = { inserted: 0, updated: 0, deleted: 0, unchanged: 0, tables: 0 };
  return tx(db, () => {
    const keys = Object.keys(data), oldTop = new Map(db.prepare("SELECT key, pos, kind, json FROM top").all().map((r) => [r.key, r]));
    const putTop = db.prepare("INSERT INTO top (pos, key, kind, json) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET pos = excluded.pos, kind = excluded.kind, json = excluded.json");
    const selRows = db.prepare("SELECT pos, json FROM row WHERE tbl = ? ORDER BY pos"), putRow = db.prepare("INSERT INTO row (tbl, pos, json) VALUES (?, ?, ?) ON CONFLICT(tbl, pos) DO UPDATE SET json = excluded.json");
    const delFrom = db.prepare("DELETE FROM row WHERE tbl = ? AND pos >= ?"), delTbl = db.prepare("DELETE FROM row WHERE tbl = ?"), delTop = db.prepare("DELETE FROM top WHERE key = ?");
    // vị trí tạm âm để đổi thứ tự khóa mà không vướng ràng buộc PRIMARY KEY(pos)
    db.exec("UPDATE top SET pos = -pos - 1");
    keys.forEach((key, pos) => {
      const value = data[key], isTable = Array.isArray(value), json = isTable ? null : JSON.stringify(value);
      if (!isTable && json === undefined) throw new Error("Giá trị không lưu được dưới dạng JSON ở khóa: " + key);
      putTop.run(pos, key, isTable ? "table" : "value", json);
      const before = oldTop.get(key);
      if (!isTable) { if (before && before.kind === "table") stats.deleted += delTbl.run(key).changes; return; }
      stats.tables++;
      const old = selRows.all(key);
      value.forEach((row, i) => {
        const text = JSON.stringify(row);
        if (text === undefined) throw new Error("Dòng không lưu được dưới dạng JSON: " + key + "[" + i + "]");
        if (i >= old.length) { putRow.run(key, i, text); stats.inserted++; }
        else if (old[i].json !== text) { putRow.run(key, i, text); stats.updated++; }
        else stats.unchanged++;
      });
      if (old.length > value.length) stats.deleted += delFrom.run(key, value.length).changes;
    });
    for (const key of oldTop.keys()) if (!(key in data)) { stats.deleted += delTbl.run(key).changes; delTop.run(key); }
    return stats;
  });
}

/** Đọc lại toàn bộ dữ liệu, đúng thứ tự khóa và thứ tự dòng ban đầu. */
function read(db) {
  const out = {}, rows = db.prepare("SELECT json FROM row WHERE tbl = ? ORDER BY pos");
  for (const t of db.prepare("SELECT key, kind, json FROM top ORDER BY pos").all())
    out[t.key] = t.kind === "table" ? rows.all(t.key).map((r) => JSON.parse(r.json)) : JSON.parse(t.json);
  return out;
}

/** So bản đọc lại với dữ liệu gốc theo chuỗi JSON (từng ký tự) và chạy PRAGMA integrity_check. */
function verify(db, data) {
  const want = JSON.stringify(data), got = JSON.stringify(read(db));
  const integrity = db.prepare("PRAGMA integrity_check").all().map((r) => Object.values(r)[0]).join("; ");
  return { identical: want === got, integrity, sha256Json: sha256(want), sha256Shadow: sha256(got), bytes: want.length };
}

/** Các kỳ (năm, tháng) có dòng chấm công. */
function periods(data) {
  const set = new Set();
  (Array.isArray(data.chamcong) ? data.chamcong : []).forEach((r) => { const m = /^(\d{4})-(\d{2})$/.exec(String(r && r["Kỳ"] || "")); if (m) set.add(m[0]); });
  return [...set].sort().map((k) => [Number(k.slice(0, 4)), Number(k.slice(5))]);
}

/**
 * Tính lương từ JSON và từ bản đọc lại của kho bóng cho mọi kỳ, so toàn bộ kết quả của engine.
 * Chỉ để chứng minh hai nguồn cho cùng kết quả; không thay việc tính lương trong app (app còn áp cài đặt riêng của từng công ty).
 */
function comparePayroll(jsonData, shadowData) {
  const E = require("../engine.js"), HR = require("../hr.js");
  const calc = (data, y, m) => { const db = JSON.parse(JSON.stringify(data)); return E.tinhBangLuong(Object.assign({}, db, { nhansu: HR.staffForPayroll(db, y, m).list }), y, m, false); };
  const out = { periods: 0, employees: 0, different: [] };
  for (const [y, m] of periods(jsonData)) {
    const a = calc(jsonData, y, m), b = calc(shadowData, y, m);
    out.periods++; out.employees += (a.bangluong || []).length;
    if (JSON.stringify(a) !== JSON.stringify(b)) out.different.push(y + "-" + String(m).padStart(2, "0"));
  }
  return out;
}

module.exports = { open, sync, read, verify, periods, comparePayroll, MARK, FORMAT };

if (require.main === module) {
  const src = process.argv[2];
  if (!src) { console.error("Cách dùng: node tools/sqlite-shadow.js <data.json> [file-sqlite-đầu-ra]\nChạy trên một BẢN SAO dữ liệu. File JSON chỉ được đọc."); process.exit(2); }
  const out = path.resolve(process.argv[3] || path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hak-shadow-")), "shadow.sqlite"));
  if (path.resolve(src) === out) { console.error("File đầu ra trùng file dữ liệu gốc — dừng."); process.exit(2); }
  const text = fs.readFileSync(src, "utf8"), before = sha256(text), data = JSON.parse(text);
  const db = open(out);
  let t = Date.now(); const first = sync(db, data), msFull = Date.now() - t;
  t = Date.now(); const again = sync(db, data), msNoop = Date.now() - t;
  const v = verify(db, data), pay = comparePayroll(data, read(db));
  db.close();
  const untouched = sha256(fs.readFileSync(src, "utf8")) === before;
  console.log("Kho bóng: " + out);
  console.log("Ghi lần đầu: " + first.inserted + " dòng thêm, " + first.updated + " sửa, " + first.deleted + " xóa, " + first.tables + " bảng — " + msFull + " ms");
  console.log("Ghi lại khi không đổi gì: " + (again.inserted + again.updated + again.deleted) + " dòng phải ghi, " + again.unchanged + " dòng giữ nguyên — " + msNoop + " ms");
  console.log("Đọc lại so với JSON: " + (v.identical ? "GIỐNG HỆT" : "KHÁC") + " (" + v.bytes + " ký tự) · integrity_check: " + v.integrity);
  console.log("Tính lương hai nguồn: " + pay.periods + " kỳ, " + pay.employees + " lượt nhân viên — " + (pay.different.length ? "KHÁC ở kỳ " + pay.different.join(", ") : "không khác biệt"));
  console.log("File JSON gốc: " + (untouched ? "không bị thay đổi" : "ĐÃ BỊ THAY ĐỔI"));
  process.exit(v.identical && v.integrity === "ok" && !pay.different.length && untouched ? 0 : 1);
}
