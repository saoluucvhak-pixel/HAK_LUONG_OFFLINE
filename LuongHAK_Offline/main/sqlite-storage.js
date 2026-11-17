// Kho dữ liệu SQLite làm NGUỒN CHÍNH (bật bằng HAK_STORAGE=sqlite; mặc định vẫn là data.json).
// Bọc createStorage: mọi thứ về sao lưu/lịch/dọn bản cũ dùng nguyên mã cũ; chỉ thay nơi LƯU DỮ LIỆU CHÍNH.
//  - save(text): kiểm hợp lệ → tính phần đổi so với trạng thái trước → ghi vào SQLite trong MỘT giao dịch (synchronous FULL). Đây là điểm bền vững.
//  - data.json trở thành bản XUẤT dẫn xuất (cho sao lưu/Full Backup/công cụ cũ): được ghi lại, nguyên tử, ở nhịp trễ và NGAY TRƯỚC mọi đọc của mã sao lưu.
//  - Mở lần đầu: có data.json → sao lưu "truoc-chuyen-sqlite", chuyển vào SQLite, đối chiếu TỪNG KÝ TỰ rồi mới coi SQLite là nguồn chính; hỏng giữa chừng → bỏ file tạm, vẫn dùng data.json.
//  - data.json bị sửa ngoài app (khác cả lần xuất cuối lẫn nội dung SQLite) → KHÔNG đoán: báo lỗi để người dùng chọn (cất file lạ sang .bak rồi dùng SQLite, hoặc khôi phục).
// Quay lui: data.json luôn là bản xuất đủ giao dịch (xuất khi đóng app và trước mỗi sao lưu), nên có thể dùng lại; cạnh đó có hak-storage.txt nêu rõ nguồn chính là data.sqlite.
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), { setTimeout, clearTimeout } = require("node:timers");
const { createStorage, isValidDataText } = require("./storage.js");
const store = require("./sqlite-store.js"), cset = require("./sqlite-changeset.js"), M = require("./sqlite-migrate.js");

const sha = (t) => crypto.createHash("sha256").update(t, "utf8").digest("hex");
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

function createSqliteStorage(dir, opts) {
  opts = opts || {};
  const now = opts.now || (() => new Date());
  const json = createStorage(dir, opts), dataFile = json.dataFile, dbFile = path.join(dir, "data.sqlite"), noteFile = path.join(dir, "hak-storage.txt");
  const exportSync = !!opts.exportSync || process.env.HAK_SQLITE_EXPORT_SYNC === "1"; // nghiệm thu: xuất data.json ngay mỗi lần lưu
  const delayMs = opts.exportDelayMs != null ? opts.exportDelayMs : 3000;
  let db = null, cur = null /* { text, doc, rows } — rows: chuỗi JSON từng dòng để lần diff sau không tuần tự hóa lại bảng cũ */, rev = 0, jsonStale = false, timer = null, conflict = "", yearChecked = "", opened = false;

  const meta = (k) => { const r = db.prepare("SELECT value FROM meta WHERE key = ?").get(k); return r ? r.value : null; };
  const setMeta = (k, v) => db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(k, String(v));
  const fileSha = () => { try { return sha(fs.readFileSync(dataFile, "utf8")); } catch (e) { return ""; } };
  function atomicWrite(file, text) {
    const tmp = file + ".tmp"; let fd;
    try { fd = fs.openSync(tmp, "w"); fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { if (fd !== undefined) fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  }

  /** Ghi bản xuất data.json từ trạng thái SQLite hiện tại (nếu đang trễ). Không ném lỗi ra cho người gọi sao lưu — lỗi được trả để quyết định. */
  function syncJson() {
    clearTimeout(timer); timer = null;
    if (!jsonStale || !cur) return true;
    try {
      atomicWrite(dataFile, cur.text);
      if (!Buffer.from(fs.readFileSync(dataFile)).equals(Buffer.from(cur.text, "utf8"))) return false;
      setMeta("exported_sha", sha(cur.text)); jsonStale = false;
      writeNote();
      return true;
    } catch (e) { return false; }
  }
  function writeNote() { try { if (!fs.existsSync(noteFile)) atomicWrite(noteFile, "Nguồn dữ liệu chính của hồ sơ này là data.sqlite. data.json là bản xuất (được ghi lại khi đóng app và trước mỗi sao lưu); không sửa tay.\n"); } catch (e) { /* ghi chú không bắt buộc */ } }
  const scheduleExport = () => { if (exportSync) { syncJson(); return; } clearTimeout(timer); timer = setTimeout(() => { syncJson(); }, delayMs); if (timer.unref) timer.unref(); };

  function openDb() {
    if (db) return;
    db = store.open(dbFile); store.migrate(db); opened = true;
  }
  /** Lần mở đầu của phiên: quyết định nguồn dữ liệu. Trả { ok:true, text|null } hoặc lỗi cho giao diện. */
  function init() {
    const hasSqlite = fs.existsSync(dbFile) && fs.statSync(dbFile).size > 0;
    if (hasSqlite) {
      openDb();
      const primary = meta("primary") === "1";
      if (primary) {
        const doc = M.toData(db), text = JSON.stringify(doc); cur = { text, doc }; rev = Number(meta("rev") || 0);
        if (fs.existsSync(dataFile)) {
          const f = fileSha(), last = meta("exported_sha");
          if (f !== last && f !== sha(text) && process.env.HAK_SQLITE_ADOPT_EXTERNAL === "1") { opened = true; if (adoptJson()) return { ok: true, text: cur.text }; } // CHỈ để nghiệm thu: bộ E2E tự ghi data.json giữa các lần mở
          if (f !== last && f !== sha(text)) {
            const t = (file) => { try { return fs.statSync(file).mtime.toISOString().replace("T", " ").slice(0, 16) + " UTC"; } catch (e) { return "?"; } };
            conflict = "data.json khác với dữ liệu trong data.sqlite (có thể bị sửa/thay ngoài ứng dụng, hoặc đã dùng HAK_STORAGE=json sau khi chuyển sang SQLite). Sửa lần cuối: data.json " + t(dataFile) + ", data.sqlite " + t(dbFile) +
              ". Ứng dụng không tự chọn. File nào mới hơn là bản đầy đủ hơn. Chọn giữ dữ liệu SQLite thì data.json lạ được CẤT sang file .bak (không xóa); nếu data.json mới hơn, hãy khôi phục từ nó (hoặc từ bản sao lưu) thay vì giữ SQLite.";
          }
          else jsonStale = f !== sha(text); // JSON cũ hơn do chưa kịp xuất (mất điện/đóng đột ngột) → xuất lại
        } else jsonStale = true;
        if (conflict) return { ok: false, error: conflict, backups: json.list() };
        writeNote();
        if (jsonStale) syncJson();
        return { ok: true, text };
      }
      store.close(db); db = null; // kho dở dang (chưa chuyển xong): bỏ, chuyển lại từ data.json
      for (const f of [dbFile, dbFile + "-wal", dbFile + "-shm"]) { try { fs.rmSync(f, { force: true }); } catch (e) { /* bỏ qua */ } }
    }
    const ld = json.load(); // cũng dọn .tmp sót lại; kiểm JSON hợp lệ
    if (!ld.ok) return ld;
    if (ld.text == null) return { ok: true, text: null }; // hồ sơ mới: SQLite tạo ở lần lưu đầu
    return importFrom(ld.text);
  }
  function importFrom(text) {
    const before = json.backup("truoc-chuyen-sqlite");
    if (before === null) return { ok: false, error: "Không tạo được bản sao lưu trước khi chuyển sang SQLite — dừng, dữ liệu data.json giữ nguyên.", backups: json.list() };
    const tmpSrc = path.join(dir, "data.sqlite.import.json"), tmpDb = dbFile + ".new";
    try {
      for (const f of [tmpDb, tmpDb + "-wal", tmpDb + "-shm"]) fs.rmSync(f, { force: true });
      fs.writeFileSync(tmpSrc, text);
      const rep = M.migrate(tmpSrc, tmpDb); if (rep.state !== "ready") throw new Error("Ứng viên không sẵn sàng: " + rep.state);
      const v = M.verifyFiles(tmpDb, tmpSrc); if (!v.ok) throw new Error(v.problems.join("; "));
      const t = store.open(tmpDb); try { store.tx(t, () => { t.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('primary', '1')").run(); t.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('rev', '0')").run(); t.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('exported_sha', ?)").run(sha(text)); }); } finally { store.close(t); }
      fs.renameSync(tmpDb, dbFile);
    } catch (e) {
      for (const f of [tmpSrc, tmpDb, tmpDb + "-wal", tmpDb + "-shm"]) { try { fs.rmSync(f, { force: true }); } catch (e2) { /* bỏ qua */ } }
      return { ok: false, error: "Chuyển sang SQLite không thành công, data.json giữ nguyên: " + (e && e.message || e), backups: json.list() };
    }
    try { fs.rmSync(tmpSrc, { force: true }); } catch (e) { /* bỏ qua */ }
    openDb(); writeNote(); const doc = M.toData(db); cur = { text: JSON.stringify(doc), doc }; rev = 0; jsonStale = sha(cur.text) !== sha(text);
    return { ok: true, text: cur.text };
  }

  function load() {
    if (cur && !conflict) return { ok: true, text: cur.text };
    if (conflict) return { ok: false, error: conflict, backups: json.list() };
    if (!opened || !cur) {
      try { return init(); } // lỗi mở kho (schema mới hơn app, file hỏng) → báo cho giao diện, KHÔNG quay về data.json cũ một cách âm thầm
      catch (e) { return { ok: false, error: "Không mở được kho dữ liệu SQLite: " + String(e && e.message || e), backups: json.list() }; }
    }
    return { ok: true, text: cur.text };
  }

  function save(text) {
    try {
      let next = null; try { next = typeof text === "string" ? JSON.parse(text) : null; } catch (e) { next = null; } // phân tích MỘT lần: vừa kiểm hợp lệ vừa dùng để so sánh
      if (!next || typeof next !== "object" || Array.isArray(next)) return "Dữ liệu cần lưu không hợp lệ — đã hủy ghi để bảo vệ dữ liệu hiện tại";
      if (conflict) return conflict;
      if (!cur) { const r = init(); if (!r.ok) return r.error; }
      openDb();
      const nextBytes = Buffer.byteLength(text, "utf8");
      if (cur) { // các biện pháp bảo vệ cũ của storage.save, giữ nguyên ý nghĩa: bản sao lưu đầu ngày, năm, giảm đột ngột — đều chụp TRẠNG THÁI TRƯỚC thay đổi
        const daily = "daily_" + ymd(now()) + ".json";
        if (!fs.existsSync(path.join(json.backupDir, daily))) { syncJson(); json.backup("daily", daily); }
        const y = String(now().getFullYear());
        if (yearChecked !== y) { try { if (json.yearBackups(y).length) yearChecked = y; else { syncJson(); if (json.backup("nam-" + y, "nam-" + y + "_" + ymd(now()) + ".json")) yearChecked = y; } } catch (e) { /* không chặn việc lưu */ } }
        const oldBytes = Buffer.byteLength(cur.text, "utf8");
        if (oldBytes > 2048 && nextBytes < oldBytes * 0.5) { syncJson(); json.backup("truoc-giam-du-lieu"); }
      }
      const cache = { prev: cur ? cur.rows : null }, cs = cset.diff(cur ? cur.doc : {}, next, cache);
      if (cset.isEmpty(cs) && cur && cur.text === text) return true;
      store.tx(db, () => { cset.applyToDb(db, cs); setMeta("primary", "1"); setMeta("rev", rev + 1); });
      rev++; cur = { text, doc: next, rows: cache.next }; jsonStale = true; scheduleExport();
      return true;
    } catch (e) { return String(e && e.message || e); }
  }

  const wrapSync = (name) => (...args) => { syncJson(); return json[name](...args); };
  function quarantineCorrupt() { // người dùng chọn "cất file lạ": cất data.json, rồi dùng dữ liệu SQLite
    const f = json.quarantineCorrupt(); conflict = ""; if (!cur) { const r = init(); if (!r.ok) return f; } jsonStale = true; syncJson(); return f;
  }
  /** Tiến trình phụ (kho năm) đã ghi data.json trực tiếp bằng kho JSON: nhận nội dung đó làm trạng thái mới (đã được chính nó kiểm tra) và ghi delta vào SQLite. */
  function adoptJson() {
    try {
      if (!fs.existsSync(dataFile)) return false;
      const text = fs.readFileSync(dataFile, "utf8"); if (!isValidDataText(text)) return false;
      if (!cur) { const r = init(); if (!r.ok) return false; }
      openDb(); if (cur && cur.text === text) { jsonStale = false; return true; }
      const next = JSON.parse(text), cs = cset.diff(cur ? cur.doc : {}, next);
      store.tx(db, () => { cset.applyToDb(db, cs); setMeta("primary", "1"); setMeta("rev", rev + 1); setMeta("exported_sha", sha(text)); });
      rev++; cur = { text, doc: next }; jsonStale = false; return true;
    } catch (e) { return false; }
  }
  function hasDataFile() { return !!cur || fs.existsSync(dbFile) || json.hasDataFile(); }
  function close() { syncJson(); if (db) { try { store.close(db); } catch (e) { /* đã đóng */ } db = null; } }

  return Object.assign({}, json, {
    load, save, quarantineCorrupt, hasDataFile, close, syncJson, adoptJson,
    backup: wrapSync("backup"), backupYear: wrapSync("backupYear"), changedSinceBackup: wrapSync("changedSinceBackup"), tickSchedule: wrapSync("tickSchedule"), backupOnClose: wrapSync("backupOnClose"), syncMirror: wrapSync("syncMirror"),
    sig: () => "sqlite:" + rev, kind: "sqlite", dbFile, info: () => ({ dataFile, backupDir: json.backupDir, kind: "sqlite", dbFile })
  });
}

module.exports = { createSqliteStorage };
