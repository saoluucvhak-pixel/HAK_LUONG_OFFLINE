// Bộ thay đổi (change set) giữa hai trạng thái dữ liệu + áp dụng vào kho SQLite ứng viên.
// Mọi thao tác ghi của app hiện đi qua MỘT đường (store-save ghi cả tài liệu); đây là bước đầu để SQLite chỉ nhận phần thay đổi.
//  diff(prev, next)        → change set theo bảng: cắt tiền tố/hậu tố giống nhau; vùng giữa cùng độ dài → chỉ cập nhật các dòng khác; khác độ dài → một lần splice.
//  apply(prev, cs)         → trạng thái mới (hàm thuần) — dùng để kiểm: apply(prev, diff(prev, next)) phải bằng next TỪNG KÝ TỰ (kể cả thứ tự khóa và dòng).
//  applyToDb(db, cs)       → ghi đúng phần thay đổi vào kho (trong MỘT giao dịch do người gọi mở), trả số dòng thực ghi.
"use strict";
const crypto = require("node:crypto");
const importer = require("../core/importer.js");

const str = (v) => JSON.stringify(v);
const sha16 = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const isTable = (v) => Array.isArray(v);

function diffRows(a, b, cache, key) {
  const sa = cache && cache.prev && cache.prev[key] && cache.prev[key].length === a.length ? cache.prev[key] : a.map(str), sb = b.map(str);
  if (cache) (cache.next = cache.next || {})[key] = sb;
  let p = 0; const n = sa.length, m = sb.length;
  while (p < n && p < m && sa[p] === sb[p]) p++;
  if (p === n && p === m) return null;
  let s = 0; while (s < n - p && s < m - p && sa[n - 1 - s] === sb[m - 1 - s]) s++;
  const midA = n - s - p, midB = m - s - p;
  if (midA === midB) { // cùng độ dài: chỉ cập nhật các dòng thực sự khác
    const updates = []; for (let i = 0; i < midA; i++) if (sa[p + i] !== sb[p + i]) updates.push({ pos: p + i, row: b[p + i] });
    return { kind: "update", updates, length: m };
  }
  return { kind: "splice", from: p, remove: midA, insert: b.slice(p, m - s), length: m };
}

/** prev/next: đối tượng dữ liệu (các bảng là mảng, còn lại là giá trị cấp ngoài cùng). prev = null/{} → toàn bộ là mới. */
function diff(prev, next, cache) {
  prev = prev || {};
  const cs = { tables: {}, top: {}, dropTables: [], dropTop: [], keyOrder: null, rows: 0 };
  const prevKeys = Object.keys(prev), nextKeys = Object.keys(next);
  prevKeys.forEach((k) => { if (!(k in next)) { (isTable(prev[k]) ? cs.dropTables : cs.dropTop).push(k); } });
  nextKeys.forEach((k) => {
    const a = prev[k], b = next[k];
    if (isTable(b)) {
      if (!isTable(a)) { if (k in prev) cs.dropTop.push(k); const d = diffRows([], b, cache, k); cs.tables[k] = d || { kind: "splice", from: 0, remove: 0, insert: [], length: 0, fresh: true }; cs.tables[k].fresh = true; }
      else { const d = diffRows(a, b, cache, k); if (d) cs.tables[k] = d; }
    } else {
      if (isTable(a)) cs.dropTables.push(k);
      if (!(k in prev) || isTable(a) || str(a) !== str(b)) cs.top[k] = b;
    }
  });
  if (str(prevKeys.filter((k) => k in next)) !== str(nextKeys.filter((k) => k in prev)) || prevKeys.length !== nextKeys.length || nextKeys.some((k) => !(k in prev)) || prevKeys.some((k) => !(k in next))) cs.keyOrder = nextKeys;
  Object.values(cs.tables).forEach((t) => { cs.rows += t.kind === "update" ? t.updates.length : t.insert.length + t.remove; });
  return cs;
}

function isEmpty(cs) { return !Object.keys(cs.tables).length && !Object.keys(cs.top).length && !cs.dropTables.length && !cs.dropTop.length && !cs.keyOrder; }

/** Hàm thuần: áp dụng cs lên prev, trả trạng thái mới (không sửa prev). */
function apply(prev, cs) {
  const out = {}; Object.keys(prev || {}).forEach((k) => { out[k] = prev[k]; });
  cs.dropTables.concat(cs.dropTop).forEach((k) => { delete out[k]; });
  Object.keys(cs.top).forEach((k) => { out[k] = cs.top[k]; });
  Object.keys(cs.tables).forEach((k) => {
    const t = cs.tables[k], rows = isTable(out[k]) && !t.fresh ? out[k].slice() : [];
    if (t.kind === "update") t.updates.forEach((u) => { rows[u.pos] = u.row; }); else rows.splice(t.from, t.remove, ...t.insert);
    out[k] = rows;
  });
  if (!cs.keyOrder) return out;
  const ordered = {}; cs.keyOrder.forEach((k) => { ordered[k] = out[k]; }); return ordered;
}

// ----- ghi vào kho SQLite ứng viên -----
function rowId(db, table, row) {
  if (row && typeof row === "object" && row._id != null && String(row._id) !== "") {
    const want = String(row._id); if (!db.prepare("SELECT 1 FROM records WHERE tbl = ? AND id = ?").get(table, want)) return want;
  }
  const base = "m-" + sha16(table + "\u0000" + str(row)); let id = base, n = 1;
  while (db.prepare("SELECT 1 FROM records WHERE tbl = ? AND id = ?").get(table, id)) { n++; id = base + "-" + n; }
  return id;
}
function bkeyOf(table, row) { try { const k = row && typeof row === "object" ? importer.keyOf(table, row) : null; return k == null ? null : String(k).replace(/\u0000/g, "∅"); } catch (e) { return null; } }

/** Số dòng thực ghi (insert + update + delete + dịch vị trí). Người gọi mở/commit giao dịch. */
function applyToDb(db, cs) {
  let written = 0;
  const put = db.prepare("INSERT INTO records (tbl, id, pos, bkey, json) VALUES (?, ?, ?, ?, ?)");
  cs.dropTables.forEach((k) => { written += db.prepare("DELETE FROM records WHERE tbl = ?").run(k).changes; db.prepare("DELETE FROM top_value WHERE key = ?").run(k); });
  cs.dropTop.forEach((k) => { db.prepare("DELETE FROM top_value WHERE key = ?").run(k); });
  Object.keys(cs.tables).forEach((k) => {
    const t = cs.tables[k];
    if (t.fresh) { db.prepare("DELETE FROM records WHERE tbl = ?").run(k); db.prepare("INSERT OR REPLACE INTO top_value (pos, key, kind, json) VALUES ((SELECT COALESCE(MAX(pos), -1) + 1 FROM top_value), ?, 'array', NULL)").run(k); }
    if (t.kind === "update") {
      t.updates.forEach((u) => { written += db.prepare("UPDATE records SET json = ?, bkey = ?, rev = rev + 1 WHERE tbl = ? AND pos = ?").run(str(u.row), bkeyOf(k, u.row), k, u.pos).changes; });
    } else {
      if (t.remove) written += db.prepare("DELETE FROM records WHERE tbl = ? AND pos >= ? AND pos < ?").run(k, t.from, t.from + t.remove).changes;
      const delta = t.insert.length - t.remove;
      if (delta !== 0) { // dịch phần đuôi hai pha để không vướng chỉ mục UNIQUE(tbl,pos)
        written += db.prepare("UPDATE records SET pos = -(pos + ?) - 1 WHERE tbl = ? AND pos >= ?").run(delta, k, t.from + t.remove).changes;
        db.prepare("UPDATE records SET pos = -pos - 1 WHERE tbl = ? AND pos < 0").run(k);
      }
      t.insert.forEach((row, i) => { put.run(k, rowId(db, k, row), t.from + i, bkeyOf(k, row), str(row)); written++; });
    }
  });
  Object.keys(cs.top).forEach((k) => {
    const v = cs.top[k], kind = v === null ? "null" : typeof v;
    const had = db.prepare("SELECT pos FROM top_value WHERE key = ?").get(k);
    if (had) db.prepare("UPDATE top_value SET kind = ?, json = ? WHERE key = ?").run(kind, str(v), k);
    else db.prepare("INSERT INTO top_value (pos, key, kind, json) VALUES ((SELECT COALESCE(MAX(pos), -1) + 1 FROM top_value), ?, ?, ?)").run(k, kind, str(v));
    written++;
  });
  if (cs.keyOrder) { // ghi lại thứ tự khóa cấp ngoài cùng (vài chục dòng)
    db.prepare("UPDATE top_value SET pos = -pos - 1").run();
    cs.keyOrder.forEach((k, i) => { db.prepare("UPDATE top_value SET pos = ? WHERE key = ?").run(i, k); });
  }
  return written;
}

module.exports = { diff, apply, applyToDb, isEmpty };
