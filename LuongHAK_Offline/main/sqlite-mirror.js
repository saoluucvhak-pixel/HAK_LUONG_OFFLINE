// Bản sao "bóng" của dữ liệu vào kho SQLite ứng viên — CHỈ KHI bật HAK_SQLITE_SHADOW (mặc định TẮT, app không đổi hành vi).
// data.json vẫn là nguồn duy nhất; mirror chỉ nhận cùng nội dung sau khi data.json đã ghi thành công và KHÔNG BAO GIỜ ném lỗi ra ngoài.
// Mục đích: chứng minh mọi thao tác ghi thật của app (đi qua store-save) cho ra cùng dữ liệu khi chỉ ghi phần thay đổi vào SQLite.
//   HAK_SQLITE_SHADOW=1       ghi delta
//   HAK_SQLITE_SHADOW=verify  ghi delta rồi dựng lại TOÀN BỘ từ SQLite so với nội dung vừa lưu (chậm — chỉ để nghiệm thu)
"use strict";
const fs = require("node:fs"), path = require("node:path");
const store = require("./sqlite-store.js"), cset = require("./sqlite-changeset.js"), M = require("./sqlite-migrate.js");

function create(dataFile, mode) {
  const file = path.join(path.dirname(dataFile), "shadow.sqlite"), logFile = path.join(path.dirname(dataFile), "shadow.log");
  let db = null, prev = null;
  const log = (line) => { try { fs.appendFileSync(logFile, new Date().toISOString() + " " + line + "\n"); } catch (e) { /* bỏ qua */ } };
  function openFresh() { // luôn dựng mới từ nội dung hiện tại: tránh tin vào kho cũ không còn khớp data.json
    if (db) { try { db.close(); } catch (e) { /* đã đóng */ } db = null; }
    for (const f of [file, file + "-wal", file + "-shm"]) { try { fs.rmSync(f, { force: true }); } catch (e) { /* bỏ qua */ } }
    db = store.open(file); store.migrate(db); prev = {};
  }
  function mirror(text) {
    try {
      const next = JSON.parse(text);
      if (!db) openFresh();
      const cs = cset.diff(prev, next);
      if (cset.isEmpty(cs)) return;
      const written = store.tx(db, () => cset.applyToDb(db, cs));
      prev = next;
      let state = "OK";
      if (mode === "verify" && JSON.stringify(M.toData(db)) !== JSON.stringify(next)) state = "MISMATCH";
      log(state + " tables=" + Object.keys(cs.tables).length + " rows=" + written + " bytes=" + text.length);
    } catch (e) { log("ERROR " + String(e && e.message || e)); try { if (db) db.close(); } catch (e2) { /* bỏ qua */ } db = null; prev = null; }
  }
  return { mirror, file, logFile, close() { try { if (db) store.close(db); } catch (e) { /* bỏ qua */ } db = null; } };
}
module.exports = { create };
