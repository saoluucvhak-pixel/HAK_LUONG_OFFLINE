// Kho dữ liệu SQLite làm NGUỒN CHÍNH (bật bằng HAK_STORAGE=sqlite; mặc định vẫn là data.json).
// Bọc createStorage: mọi thứ về sao lưu/lịch/dọn bản cũ dùng nguyên mã cũ; chỉ thay nơi LƯU DỮ LIỆU CHÍNH.
//  - save(text): kiểm hợp lệ → tính phần đổi so với trạng thái trước → ghi vào SQLite trong MỘT giao dịch (synchronous FULL). Đây là điểm bền vững.
//  - data.json trở thành bản XUẤT dẫn xuất (cho sao lưu/Full Backup/công cụ cũ): được ghi lại, nguyên tử, ở nhịp trễ và NGAY TRƯỚC mọi đọc của mã sao lưu.
//  - Mở lần đầu: có data.json → sao lưu "truoc-chuyen-sqlite", chuyển vào SQLite, đối chiếu TỪNG KÝ TỰ rồi mới coi SQLite là nguồn chính; hỏng giữa chừng → bỏ file tạm, vẫn dùng data.json.
//  - data.json bị sửa ngoài app (khác cả lần xuất cuối lẫn nội dung SQLite) → KHÔNG đoán: báo lỗi để người dùng chọn (cất file lạ sang .bak rồi dùng SQLite, hoặc khôi phục).
// Quay lui: data.json luôn là bản xuất đủ giao dịch (xuất khi đóng app và trước mỗi sao lưu), nên có thể dùng lại; cạnh đó có hak-storage.txt nêu rõ nguồn chính là data.sqlite.
"use strict";
const os = require("node:os"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), { setTimeout, clearTimeout } = require("node:timers");
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
  /** Chụp trạng thái nhất quán của nguồn chính (revision + nội dung + SHA-256) và bảo đảm data.json xuất ra ĐÚNG bản đó. Trả null nếu không bảo đảm được. */
  function snapshotExported() {
    if (!cur) { const r = load(); if (!r.ok || !cur) return null; }
    if (!syncJson()) return null;
    const exp = sha(cur.text);
    return fileSha() === exp ? { rev, sha: exp, text: cur.text } : null;
  }
  function beginExternalOp(info) { try { openDb(); setMeta("pending_op", JSON.stringify(Object.assign({ at: new Date().toISOString() }, info))); return true; } catch (e) { return false; } }
  function endExternalOp() { try { if (db) clearPendingOp(); return true; } catch (e) { return false; } }
  /** Hủy mọi thay đổi data.json do tiến trình phụ: xuất lại đúng trạng thái SQLite. */
  /** Sau thao tác chỉ đọc: nếu data.json khác bản đã chụp thì xuất lại từ SQLite. Trả true nếu phải xuất lại. */
  function restoreJsonIfChanged(baseSha) { if (fileSha() === baseSha) return false; restoreJsonFromSqlite(); return true; }
  function restoreJsonFromSqlite() { jsonStale = true; return syncJson(); }
  function writeNote() { try { if (!fs.existsSync(noteFile)) atomicWrite(noteFile, "Nguồn dữ liệu chính của hồ sơ này là data.sqlite. data.json là bản xuất (được ghi lại khi đóng app và trước mỗi sao lưu); không sửa tay.\n"); } catch (e) { /* ghi chú không bắt buộc */ } }
  const scheduleExport = () => { if (exportSync) { syncJson(); return; } clearTimeout(timer); timer = setTimeout(() => { syncJson(); }, delayMs); if (timer.unref) timer.unref(); };

  const pendingOp = () => { try { const v = meta("pending_op"); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const clearPendingOp = () => { try { db.prepare("DELETE FROM meta WHERE key = 'pending_op'").run(); } catch (e) { /* bỏ qua */ } };
  const journal = (state, detail) => { try { db.prepare("INSERT INTO migration_journal (state, source_sha256, detail, at) VALUES (?, ?, ?, ?)").run(state, "", JSON.stringify(detail || {}), new Date().toISOString()); } catch (e) { /* nhật ký phụ */ } };
  /** Tóm tắt chênh lệch giữa data.json lạ và dữ liệu SQLite (bảng nào, bao nhiêu dòng) để người dùng xem TRƯỚC khi chọn. */
  function describeDiff(sha256OfFile) {
    try {
      const doc = JSON.parse(fs.readFileSync(dataFile, "utf8")), cs = cset.diff(cur.doc, doc), lines = [];
      Object.keys(cs.tables).forEach((k) => { const t = cs.tables[k]; lines.push(k + ": " + (t.kind === "update" ? t.updates.length + " dòng khác" : "+" + t.insert.length + " / −" + t.remove + " dòng")); });
      cs.dropTables.forEach((k) => lines.push(k + ": chỉ có trong SQLite")); Object.keys(cs.top).forEach((k) => lines.push(k + ": giá trị khác"));
      return "Chênh lệch (data.json so với SQLite): " + (lines.length ? lines.slice(0, 12).join("; ") + (lines.length > 12 ? "; …" : "") : "khác ở thứ tự/khóa cấp ngoài cùng") + ".";
    } catch (e) { return "data.json không đọc được như JSON hợp lệ (" + String(sha256OfFile || "").slice(0, 8) + ")."; }
  }
  // Khóa phiên ghi cấp dữ liệu: một tiến trình còn sống đang giữ kho thì tiến trình khác KHÔNG được mở (Electron đã chặn mở hai bản app; khóa này chặn công cụ/tiến trình khác). Khóa của tiến trình đã chết bị bỏ qua.
  const lockFile = path.join(dir, "data.sqlite.lock");
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return !!e && e.code === "EPERM"; } };
  const bootTime = () => Math.round(Date.now() / 1000 - os.uptime()); // đổi sau khi khởi động lại máy: PID cũ có thể đã được cấp cho tiến trình khác
  function acquireLock() {
    try { const o = JSON.parse(fs.readFileSync(lockFile, "utf8")); if (o && o.pid && o.pid !== process.pid && Math.abs((o.boot || 0) - bootTime()) < 30 && alive(o.pid)) throw new Error("Kho dữ liệu đang được tiến trình khác (PID " + o.pid + ") sử dụng. Đóng ứng dụng/công cụ đó rồi mở lại; không mở hai phiên ghi vào cùng một thư mục dữ liệu. Nếu chắc chắn không còn tiến trình nào dùng, xóa file data.sqlite.lock trong thư mục dữ liệu rồi mở lại."); } catch (e) { if (/PID/.test(String(e && e.message))) throw e; }
    try { atomicWrite(lockFile, JSON.stringify({ pid: process.pid, boot: bootTime(), at: new Date().toISOString() })); } catch (e) { /* không ghi được khóa: vẫn chạy, SQLite tự khóa ghi */ }
  }
  function releaseLock() { try { const o = JSON.parse(fs.readFileSync(lockFile, "utf8")); if (o && o.pid === process.pid) fs.rmSync(lockFile, { force: true }); } catch (e) { /* bỏ qua */ } }
  function openDb() {
    if (db) return;
    acquireLock();
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
          const pending = pendingOp();
          if (pending && f !== pending.baseSha && f !== sha(text)) { // thao tác kho năm dở dang: data.json KHÁC trạng thái trước thao tác và khác SQLite → worker đã ghi xong kết quả (ghi nguyên tử, đã kiểm). Nhận theo căn cứ marker, KHÔNG theo ngày giờ.
            opened = true; const adopted = adoptJson({ force: true });
            if (adopted) { clearPendingOp(); journal("recovered-year-op", { method: pending.method, baseSha: pending.baseSha }); return { ok: true, text: cur.text }; }
            conflict = "Thao tác kho năm (" + pending.method + ") bị gián đoạn và không nhận lại được kết quả. " + describeDiff(f);
            return { ok: false, error: conflict, backups: json.list() };
          }
          if (pending) { clearPendingOp(); journal("cleared-year-op", { method: pending.method, note: "data.json giữ trạng thái trước thao tác hoặc đã khớp SQLite" }); }
          if (f !== last && f !== sha(text) && process.env.HAK_SQLITE_ADOPT_EXTERNAL === "1") { opened = true; if (adoptJson({ force: true })) return { ok: true, text: cur.text }; } // CHỈ để nghiệm thu: bộ E2E tự ghi data.json giữa các lần mở
          if (f !== last && f !== sha(text)) conflict = "data.json không phải bản xuất gần nhất của kho SQLite (khác cả bản xuất lần cuối lẫn dữ liệu trong SQLite): có thể bị sửa/thay ngoài ứng dụng, hoặc đã dùng HAK_STORAGE=json / bản cũ sau khi chuyển sang SQLite. " + describeDiff(f) + " Ứng dụng không tự chọn và KHÔNG dựa vào ngày giờ sửa file. Chọn một cách: (1) giữ dữ liệu SQLite — data.json lạ được CẤT sang file .bak (không xóa); (2) khôi phục từ bản sao lưu/Full Backup đã kiểm. Nếu nghi data.json chứa giao dịch mà SQLite chưa có, xem danh sách chênh lệch ở trên TRƯỚC khi chọn.";
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

  function save(text, parsed) {
    try {
      let next = null; try { next = typeof text === "string" ? (parsed && typeof parsed === "object" ? parsed : JSON.parse(text)) : null; } catch (e) { next = null; } // phân tích MỘT lần: vừa kiểm hợp lệ vừa dùng để so sánh
      if (!next || typeof next !== "object" || Array.isArray(next)) return "Dữ liệu cần lưu không hợp lệ — đã hủy ghi để bảo vệ dữ liệu hiện tại";
      if (conflict) return conflict;
      if (!cur) { const r = init(); if (!r.ok) return r.error; }
      openDb();
      const nextBytes = Buffer.byteLength(text, "utf8");
      if (cur) { // các biện pháp bảo vệ cũ của storage.save, giữ nguyên ý nghĩa: bản sao lưu đầu ngày, năm, giảm đột ngột — đều chụp TRẠNG THÁI TRƯỚC thay đổi
        const guardBackup = (tag, file) => { if (!exportReady()) throw new Error("Không tạo được bản sao lưu bảo vệ trước khi ghi (" + tag + "): " + backupError + " Dữ liệu chưa bị thay đổi."); const f = verifyBackup(json.backup(tag, file)); if (!f) throw new Error("Không tạo được bản sao lưu bảo vệ trước khi ghi (" + tag + "). " + backupError + " Dữ liệu chưa bị thay đổi."); };
        const daily = "daily_" + ymd(now()) + ".json";
        if (!fs.existsSync(path.join(json.backupDir, daily))) guardBackup("daily", daily); // chặn lưu nếu không bảo vệ được: giống kho JSON khi ghi file lỗi
        const y = String(now().getFullYear());
        if (yearChecked !== y) { try { if (json.yearBackups(y).length) yearChecked = y; else if (exportReady()) { const f = verifyBackup(json.backup("nam-" + y, "nam-" + y + "_" + ymd(now()) + ".json")); if (f) yearChecked = y; } } catch (e) { /* không chặn việc lưu; thử lại ở lần lưu sau, không tạo bản từ file cũ */ } }
        const oldBytes = Buffer.byteLength(cur.text, "utf8");
        if (oldBytes > 2048 && nextBytes < oldBytes * 0.5) guardBackup("truoc-giam-du-lieu");
      }
      const cache = { prev: cur ? cur.rows : null }, cs = cset.diff(cur ? cur.doc : {}, next, cache);
      if (cset.isEmpty(cs) && cur && cur.text === text) return true;
      store.tx(db, () => { cset.applyToDb(db, cs); setMeta("primary", "1"); setMeta("rev", rev + 1); });
      rev++; cur = { text, doc: next, rows: cache.next }; jsonStale = true; scheduleExport();
      return true;
    } catch (e) { return String(e && e.message || e); }
  }

  /** Bản xuất data.json phải ĐÚNG revision hiện tại trước khi mã sao lưu cũ (đọc data.json) chạy; sai thì KHÔNG sao lưu (không dùng file cũ), trả lỗi thật. */
  let backupError = "";
  const exportReady = () => { if (!cur) return true; const ok = syncJson() && fileSha() === sha(cur.text); if (!ok) backupError = "Không xuất được dữ liệu hiện tại ra data.json (kiểm tra quyền ghi/ổ đĩa) nên KHÔNG tạo bản sao lưu từ file cũ. Các bản sao lưu tốt trước đó được giữ nguyên."; return ok; };
  /** Bản sao lưu vừa tạo phải chứa đúng nội dung của revision đang giữ; sai thì xóa bản đó và báo thất bại. */
  function verifyBackup(name) {
    if (!name || !cur) return name;
    let ok = false; try { const r = json.readBackup(name); ok = r.ok && r.text === cur.text; } catch (e) { ok = false; }
    if (ok) return name;
    for (const f of [name, name + ".sha256"]) { try { fs.rmSync(path.join(json.backupDir, f), { force: true }); } catch (e) { /* bỏ qua */ } }
    backupError = "Bản sao lưu vừa tạo không khớp dữ liệu hiện tại nên đã bị hủy; bản sao lưu tốt trước đó được giữ nguyên."; return null;
  }
  let snapshotError = "";
  // Bản chụp SQLite xoay vòng (1 file, ghi đè sau khi bản mới đạt kiểm tra): bổ sung cho bản sao lưu JSON, KHÔNG thay thế; lỗi chỉ ghi lại, không chặn sao lưu.
  function snapshotNow() { snapshotError = ""; if (!db) return null; const r = store.snapshot(db, path.join(json.backupDir, "data-snapshot.sqlite")); if (!r.ok) snapshotError = r.error; return r; }
  const backupWrap = (name) => (...args) => { backupError = ""; if (!exportReady()) return null; const out = json[name](...args); const v = typeof out === "string" ? verifyBackup(out) : out; if (v && name === "backup") snapshotNow(); return v; };
  const readWrap = (name) => (...args) => { backupError = ""; if (!exportReady()) return name === "changedSinceBackup" ? true : null; return json[name](...args); };
  const mirrorWrap = () => (...args) => { backupError = ""; if (!exportReady()) return { ok: false, error: backupError }; return json.syncMirror(...args); };
  function quarantineCorrupt() { // người dùng chọn "cất file lạ": cất data.json, rồi dùng dữ liệu SQLite
    const f = json.quarantineCorrupt(); conflict = ""; if (!cur) { const r = init(); if (!r.ok) return f; } jsonStale = true; syncJson(); return f;
  }
  /** Tiến trình phụ (kho năm) đã ghi data.json trực tiếp bằng kho JSON: nhận nội dung đó làm trạng thái mới (đã được chính nó kiểm tra) và ghi delta vào SQLite.
   *  opts.expectRev: chỉ nhận khi SQLite chưa đổi kể từ lúc chụp. opts.force: dùng khi khôi phục sau gián đoạn (marker thao tác). */
  function adoptJson(opts) {
    try {
      if (!(opts && opts.force) && opts && opts.expectRev != null && opts.expectRev !== rev) return false; // dữ liệu đã đổi trong lúc worker chạy: không nhận kết quả cũ
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
  function close() { syncJson(); if (db) { try { store.close(db); } catch (e) { /* đã đóng */ } db = null; } releaseLock(); }

  return Object.assign({}, json, {
    load, save, quarantineCorrupt, hasDataFile, close, syncJson, adoptJson, snapshotExported, beginExternalOp, endExternalOp, restoreJsonFromSqlite, restoreJsonIfChanged, pendingOp: () => (db ? pendingOp() : null),
    snapshotNow, lastSnapshotError: () => snapshotError, backup: backupWrap("backup"), backupYear: backupWrap("backupYear"), changedSinceBackup: readWrap("changedSinceBackup"), tickSchedule: backupWrap("tickSchedule"), backupOnClose: backupWrap("backupOnClose"), syncMirror: mirrorWrap(), lastBackupError: () => backupError,
    sig: () => "sqlite:" + rev, kind: "sqlite", dbFile, info: () => ({ dataFile, backupDir: json.backupDir, kind: "sqlite", dbFile })
  });
}

module.exports = { createSqliteStorage };
