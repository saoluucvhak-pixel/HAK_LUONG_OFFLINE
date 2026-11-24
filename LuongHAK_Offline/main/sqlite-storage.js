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

  const curText = () => {
    if (!cur) return "";
    if (cur.text == null && cur.doc) cur.text = JSON.stringify(cur.doc);
    return cur.text || "";
  };

  /** Ghi bản xuất data.json từ trạng thái SQLite hiện tại (nếu đang trễ). Không ném lỗi ra cho người gọi sao lưu — lỗi được trả để quyết định. */
  function syncJson() {
    clearTimeout(timer); timer = null;
    if (!jsonStale || !cur) return true;
    try {
      const txt = curText();
      atomicWrite(dataFile, txt);
      if (!Buffer.from(fs.readFileSync(dataFile)).equals(Buffer.from(txt, "utf8"))) return false;
      setMeta("exported_sha", sha(txt)); jsonStale = false;
      writeNote();
      return true;
    } catch (e) { return false; }
  }
  /** Chụp trạng thái nhất quán của nguồn chính (revision + nội dung + SHA-256) và bảo đảm data.json xuất ra ĐÚNG bản đó. Trả null nếu không bảo đảm được. */
  function snapshotExported() {
    if (!cur) { const r = load(); if (!r.ok || !cur) return null; }
    if (!syncJson()) return null;
    const txt = curText(), exp = sha(txt);
    return fileSha() === exp ? { rev, sha: exp, text: txt } : null;
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
    try { const o = JSON.parse(fs.readFileSync(lockFile, "utf8")); if (o && o.pid && o.pid !== process.pid && Math.abs((o.boot || 0) - bootTime()) < 30 && alive(o.pid)) { const err = new Error("Kho dữ liệu đang được tiến trình khác (PID " + o.pid + ") sử dụng. Đóng ứng dụng/công cụ đó rồi mở lại; không mở hai phiên ghi vào cùng một thư mục dữ liệu. Nếu chắc chắn không còn tiến trình nào dùng, xóa file data.sqlite.lock trong thư mục dữ liệu rồi mở lại."); err.lockedByOther = true; throw err; } } catch (e) { if (e && e.lockedByOther) throw e; } // cờ riêng, KHÔNG khớp chữ trên thông báo (đường dẫn có "PID" làm hỏng cách cũ)
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
    if (fs.existsSync(markerFile)) { // khôi phục từ bản chụp bị ngắt giữa chừng: LUÔN hoàn tất tiếp (bản chụp đã được kiểm, bản cũ đã được cất) rồi mới mở như bình thường
      try { finishRestore(JSON.parse(fs.readFileSync(markerFile, "utf8"))); }
      catch (e) { return { ok: false, error: "Khôi phục từ bản chụp SQLite bị gián đoạn và chưa hoàn tất được: " + String(e && e.message || e) + " Dữ liệu cũ đã được cất cạnh file dữ liệu (tên có 'truoc-khoi-phuc').", backups: json.list(), snapshot: snapshotInfo() }; }
    }
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
    if (ld.text == null) { // hồ sơ mới — nhưng nếu có bản chụp SQLite thì máy này từng có dữ liệu (data.sqlite và data.json đều mất): hỏi khôi phục, KHÔNG âm thầm bắt đầu trống
      const sn = snapshotInfo(); if (sn.exists) return { ok: false, error: "Không thấy data.sqlite lẫn data.json, nhưng có bản chụp SQLite trong thư mục sao lưu.", backups: json.list(), snapshot: sn };
      return { ok: true, text: null }; // hồ sơ mới: SQLite tạo ở lần lưu đầu
    }
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
    if (cur && !conflict) return { ok: true, text: curText(), baseSig: "sqlite:" + rev, rev };
    if (conflict) return { ok: false, error: conflict, backups: json.list() };
    if (!opened || !cur) {
      try {
        const initRes = init();
        if (initRes.ok && cur) {
          initRes.baseSig = "sqlite:" + rev;
          initRes.rev = rev;
        }
        return initRes;
      } // lỗi mở kho (schema mới hơn app, file hỏng) → báo cho giao diện, KHÔNG quay về data.json cũ một cách âm thầm
      catch (e) { return { ok: false, error: "Không mở được kho dữ liệu SQLite: " + String(e && e.message || e), backups: json.list(), snapshot: snapshotInfo() }; }
    }
    return { ok: true, text: curText(), baseSig: "sqlite:" + rev, rev };
  }

  function save(text, parsed, rowsHint, baseSig) {
    try {
      const currentSig = "sqlite:" + rev;
      if (baseSig && typeof baseSig === "string" && baseSig !== currentSig) {
        return "STALE_BASE: Bản nền đã cũ (kỳ vọng " + currentSig + ", nhận " + baseSig + ")";
      }
      let next = null; try { next = typeof text === "string" ? (parsed && typeof parsed === "object" ? parsed : JSON.parse(text)) : null; } catch (e) { next = null; } // phân tích MỘT lần: vừa kiểm hợp lệ vừa dùng để so sánh
      if (!next || typeof next !== "object" || Array.isArray(next)) return "Dữ liệu cần lưu không hợp lệ — đã hủy ghi để bảo vệ dữ liệu hiện tại";
      if (conflict) return conflict;
      if (!cur) { const r = init(); if (!r.ok) return r.error; }
      openDb();
      const nextBytes = Buffer.byteLength(text, "utf8");
      if (cur) { // các biện pháp bảo vệ cũ của storage.save, giữ nguyên ý nghĩa: bản sao lưu đầu ngày, năm, giảm đột ngột — đều chụp TRẠNG THÁI TRƯỚC thay đổi
        const guardBackup = (tag, file) => { if (!exportReady()) throw new Error("Không tạo được bản sao lưu bảo vệ trước khi ghi (" + tag + "): " + backupError + " Dữ liệu chưa bị thay đổi."); const f = verifyBackup(json.backup(tag, file)); if (!f) throw new Error("Không tạo được bản sao lưu bảo vệ trước khi ghi (" + tag + "). " + backupError + " Dữ liệu chưa bị thay đổi."); snapshotNow(tag); };
        const daily = "daily_" + ymd(now()) + ".json";
        if (!fs.existsSync(path.join(json.backupDir, daily))) guardBackup("daily", daily); // chặn lưu nếu không bảo vệ được: giống kho JSON khi ghi file lỗi
        const y = String(now().getFullYear());
        if (yearChecked !== y) { try { if (json.yearBackups(y).length) yearChecked = y; else if (exportReady()) { const f = verifyBackup(json.backup("nam-" + y, "nam-" + y + "_" + ymd(now()) + ".json")); if (f) { yearChecked = y; snapshotNow("nam-" + y); } } } catch (e) { /* không chặn việc lưu; thử lại ở lần lưu sau, không tạo bản từ file cũ */ } }
        const oldBytes = cur.text ? Buffer.byteLength(cur.text, "utf8") : 0;
        if (oldBytes > 2048 && nextBytes < oldBytes * 0.5) guardBackup("truoc-giam-du-lieu");
      }
      const cache = { prev: cur ? cur.rows : null, hint: parsed && parsed === next && rowsHint ? rowsHint : null }, cs = cset.diff(cur ? cur.doc : {}, next, cache); // 006: chuỗi từng dòng do bước kiểm quy tắc đã tính (chỉ dùng khi đúng đối tượng parsed)
      if (cset.isEmpty(cs) && cur && (cur.text === text || (cur.doc && JSON.stringify(cur.doc) === text))) return true;
      store.tx(db, () => { cset.applyToDb(db, cs); setMeta("primary", "1"); setMeta("rev", rev + 1); });
      rev++; cur = { text, doc: next, rows: cache.next }; jsonStale = true; scheduleExport();
      return true;
    } catch (e) { return String(e && e.message || e); }
  }

  function saveDelta(mutation, opts) {
    try {
      if (conflict) return { ok: false, conflict: true, code: "CONFLICT", error: conflict };
      if (!cur) { const r = init(); if (!r.ok) return { ok: false, error: r.error }; }
      openDb();

      const expectedBase = (opts && opts.baseSig) || (mutation && mutation.baseSig);
      const currentSig = "sqlite:" + rev;
      if (expectedBase && typeof expectedBase === "string" && expectedBase !== currentSig) {
        return { ok: false, conflict: true, code: "STALE_BASE", error: "STALE_BASE: Bản nền đã cũ (kỳ vọng " + currentSig + ", nhận " + expectedBase + ")" };
      }

      if (!mutation || typeof mutation !== "object") {
        return { ok: false, error: "Mutation payload không hợp lệ" };
      }

      const guardBackup = (tag, file) => {
        if (!exportReady()) throw new Error("Không tạo được bản sao lưu bảo vệ trước khi ghi (" + tag + "): " + backupError);
        const f = verifyBackup(json.backup(tag, file));
        if (!f) throw new Error("Không tạo được bản sao lưu bảo vệ trước khi ghi (" + tag + "). " + backupError);
        snapshotNow(tag);
      };
      const daily = "daily_" + ymd(now()) + ".json";
      if (!fs.existsSync(path.join(json.backupDir, daily))) guardBackup("daily", daily);
      const y = String(now().getFullYear());
      if (yearChecked !== y) {
        try {
          if (json.yearBackups(y).length) yearChecked = y;
          else if (exportReady()) {
            const f = verifyBackup(json.backup("nam-" + y, "nam-" + y + "_" + ymd(now()) + ".json"));
            if (f) { yearChecked = y; snapshotNow("nam-" + y); }
          }
        } catch (e) {}
      }

      const next = Object.assign({}, cur.doc);
      const changedTables = [];

      function matchTarget(row, keys) {
        if (!row || !keys) return false;
        if (typeof keys === "string" || typeof keys === "number") {
          return row._id === keys || row["Mã NV"] === keys || row.id === keys;
        }
        return Object.keys(keys).every((k) => String(row[k]) === String(keys[k]));
      }

      function applySingle(m) {
        if (!m || !m.table) return;
        const tbl = m.table;
        if (!changedTables.includes(tbl)) changedTables.push(tbl);
        const currentList = Array.isArray(cur.doc[tbl]) ? cur.doc[tbl] : [];

        if (m.action === "saveRows" || m.action === "replace") {
          next[tbl] = Array.isArray(m.delta) ? m.delta : [];
        } else if (m.action === "insert") {
          const toAdd = Array.isArray(m.delta) ? m.delta : [m.delta];
          next[tbl] = currentList.concat(toAdd);
        } else if (m.action === "update") {
          next[tbl] = currentList.map((r) => {
            if (matchTarget(r, m.keys)) {
              return Object.assign({}, r, m.delta);
            }
            return r;
          });
        } else if (m.action === "delete" || m.action === "remove") {
          next[tbl] = currentList.filter((r) => !matchTarget(r, m.keys));
        }
      }

      if (Array.isArray(mutation.mutations)) {
        mutation.mutations.forEach(applySingle);
      } else if (mutation.tables && typeof mutation.tables === "object") {
        Object.keys(mutation.tables).forEach((tbl) => {
          if (!changedTables.includes(tbl)) changedTables.push(tbl);
          next[tbl] = Array.isArray(mutation.tables[tbl]) ? mutation.tables[tbl] : [];
        });
        if (mutation.top && typeof mutation.top === "object") {
          Object.assign(next, mutation.top);
        }
        if (Array.isArray(mutation.dropTables)) {
          mutation.dropTables.forEach((tbl) => {
            if (!changedTables.includes(tbl)) changedTables.push(tbl);
            delete next[tbl];
          });
        }
      } else if (mutation.table) {
        applySingle(mutation);
      } else {
        return { ok: false, error: "Mutation không chỉ định bảng thay đổi" };
      }

      const cache = { prev: cur ? cur.rows : null };
      const cs = cset.diff(cur ? cur.doc : {}, next, cache);
      if (cset.isEmpty(cs)) {
        return { ok: true, rev, baseSig: "sqlite:" + rev, written: 0, changedTables };
      }

      let written = 0;
      store.tx(db, () => {
        written = cset.applyToDb(db, cs);
        setMeta("primary", "1");
        setMeta("rev", rev + 1);
      });

      rev++;
      cur = { text: null, doc: next, rows: cache.next };
      jsonStale = true;
      scheduleExport();

      return { ok: true, rev, baseSig: "sqlite:" + rev, written, changedTables };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
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
  let snapshotError = "", snapshotLast = null;
  // Bản chụp SQLite (CEO rà quy trình sao lưu 19/11/2026 — nơi lưu CHÍNH là SQLite):
  //  · MỌI lần sao lưu (tay, định kỳ, khi đóng app, đầu ngày, đầu năm, trước thao tác lớn, sau chốt kỳ) đều tạo bản chụp .sqlite đã kiểm (VACUUM INTO + integrity_check + đối chiếu số dòng);
  //  · data-snapshot.sqlite = bản MỚI NHẤT (giữ nguyên tên để khôi phục khi data.sqlite hỏng như trước); thêm LỊCH SỬ snap_<thời điểm>_<nhãn>.sqlite: giữ SNAP_KEEP bản cho mỗi nhãn, bản sau chốt kỳ / theo năm giữ vĩnh viễn;
  //  · chép bản chụp sang thư mục dự phòng (nếu đã chọn), đọc lại so SHA-256;
  //  · lỗi KHÔNG chặn sao lưu JSON nhưng được ghi lại và đưa lên giao diện (snapshotStatus().lastError).
  const SNAP_KEEP = 10, SNAP_RE = /^snap_\d{8}-\d{6}-\d{3}_([a-z0-9-]+)\.sqlite$/i, MIRROR_SUB = "TinhLuongHAK-SaoLuu";
  const snapPerm = (tag) => /^(sau-chot|nam-\d{4}$)/i.test(tag);
  const snapStamp = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + "-" + String(d.getMilliseconds()).padStart(3, "0");
  const shaOf = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const listSnaps = (d) => { try { return fs.readdirSync(d).filter((x) => SNAP_RE.test(x)).sort().reverse(); } catch (e) { return []; } };
  function pruneSnaps(d) {
    const all = listSnaps(d);
    if (!all.length) return;
    const newest = all[0]; // bản mới nhất toàn thư mục: không bao giờ xóa
    const byTag = new Map();
    for (const x of all) {
      const m = x.match(SNAP_RE);
      const tag = m ? m[1] : "";
      if (snapPerm(tag)) continue;
      const arr = byTag.get(tag) || [];
      arr.push(x);
      byTag.set(tag, arr);
    }
    for (const arr of byTag.values()) {
      for (const x of arr.slice(SNAP_KEEP)) {
        if (x === newest) continue;
        try { fs.rmSync(path.join(d, x), { force: true }); } catch (e) { /* để lần sau */ }
      }
    }
  }
  function copyVerified(src, dest) { const tmp = dest + ".tmp"; fs.copyFileSync(src, tmp); const fd = fs.openSync(tmp, "r+"); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } if (shaOf(tmp) !== shaOf(src)) { fs.rmSync(tmp, { force: true }); throw new Error("bản chép không khớp SHA-256"); } fs.renameSync(tmp, dest); }
  let snapshotCatchup = 0;
  function snapshotNow(tag) {
    snapshotError = ""; if (!db) return null;
    const latest = path.join(json.backupDir, "data-snapshot.sqlite"), r = store.snapshot(db, latest);
    if (!r.ok) { snapshotError = "Không tạo được bản chụp SQLite: " + r.error + " (bản sao lưu JSON vẫn có)."; return r; }
    const t = String(tag || "manual").replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "manual", name = "snap_" + snapStamp(now()) + "_" + t + ".sqlite";
    try { copyVerified(latest, path.join(json.backupDir, name)); pruneSnaps(json.backupDir); }
    catch (e) { snapshotError = "Đã có bản chụp mới nhất nhưng không lưu được lịch sử bản chụp: " + String(e && e.message || e); }
    snapshotLast = { name, at: now().toISOString(), records: r.records, tag: t };
    try { // v2.1.5: thư mục sao lưu SQLite do người dùng chọn (khóa cài đặt MỚI `sqliteDir`, chỉ thêm): chép có kiểm SHA-256 bản mới nhất + lịch sử; lỗi chỉ báo, bản trong thư mục dữ liệu luôn còn
      const sd = (json.readSettings() || {}).sqliteDir;
      if (sd) {
        if (!fs.existsSync(sd)) throw new Error("Không truy cập được thư mục " + sd + " (USB chưa cắm / ổ mạng mất kết nối?)");
        copyVerified(latest, path.join(sd, "data-snapshot.sqlite")); copyVerified(path.join(json.backupDir, name), path.join(sd, name));
        // v2.1.8: chép BÙ các bản lịch sử bị lỡ lúc thư mục đã chọn mất kết nối (USB chưa cắm…): bản local còn mà ở đó chưa có → chép có kiểm SHA-256 (tối đa SNAP_KEEP bản mới nhất; lỗi từng bản không chặn)
        let catchup = 0; for (const n of listSnaps(json.backupDir).slice(0, SNAP_KEEP)) { if (fs.existsSync(path.join(sd, n))) continue; try { copyVerified(path.join(json.backupDir, n), path.join(sd, n)); catchup++; } catch (e2) { /* bản lẻ không chép được: lần sau thử lại */ } }
        snapshotCatchup = catchup; pruneSnaps(sd);
      }
    } catch (e) { snapshotError = (snapshotError ? snapshotError + " " : "") + "Bản chụp SQLite chưa chép được sang thư mục SQLite đã chọn: " + String(e && e.message || e); }
    try {
      const st = json.readSettings() || {};
      if (st.mirrorDir) {
        if (!fs.existsSync(st.mirrorDir)) throw new Error("Không truy cập được thư mục " + st.mirrorDir + " (USB chưa cắm / ổ mạng mất kết nối?)");
        const root = path.join(st.mirrorDir, MIRROR_SUB); fs.mkdirSync(root, { recursive: true });
        copyVerified(path.join(json.backupDir, name), path.join(root, name)); pruneSnaps(root);
      }
    } catch (e) { snapshotError = (snapshotError ? snapshotError + " " : "") + "Bản chụp SQLite chưa chép được sang thư mục dự phòng: " + String(e && e.message || e); }
    return r;
  }
  const SNAP_TAG = { backup: (a) => a[0] || "manual", tickSchedule: () => "dinh-ky", backupOnClose: () => "khi-dong", backupYear: (a) => "nam-" + (a[0] || now().getFullYear()) };
  const backupWrap = (name) => (...args) => { backupError = ""; if (!exportReady()) return null; const out = json[name](...args); const v = typeof out === "string" ? verifyBackup(out) : out; if (v && SNAP_TAG[name]) snapshotNow(SNAP_TAG[name](args)); return v; };
  /** Trạng thái bản chụp SQLite cho giao diện: bản mới nhất (lần này), lịch sử trên máy, lỗi gần nhất ("" = không lỗi). */
  function snapshotStatus() {
    const hist = listSnaps(json.backupDir).map((x) => { let size = 0, mtime = null; try { const s0 = fs.statSync(path.join(json.backupDir, x)); size = s0.size; mtime = s0.mtimeMs; } catch (e) { /* bỏ qua */ } return { name: x, tag: x.match(SNAP_RE)[1], size, mtime, permanent: snapPerm(x.match(SNAP_RE)[1]) }; });
    const info = snapshotInfo(); const sqliteDir = (json.readSettings() || {}).sqliteDir || ""; return { sqliteDir, latest: snapshotLast || (info && info.exists ? { name: "data-snapshot.sqlite", at: info.mtime ? new Date(info.mtime).toISOString() : null, records: info.records } : null), history: hist, keep: SNAP_KEEP, lastError: snapshotError };
  }
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
  // ---- Khôi phục TỪ bản chụp SQLite (backups/data-snapshot.sqlite) khi data.sqlite hỏng/mất ----
  const snapFile = path.join(json.backupDir, "data-snapshot.sqlite"), markerFile = path.join(dir, "data.sqlite.restore-pending"), candFile = dbFile + ".khoi-phuc-moi";
  const rmDb = (f) => { for (const x of ["", "-wal", "-shm"]) { try { fs.rmSync(f + x, { force: true }); } catch (e) { /* bỏ qua */ } } };
  const countOf = (doc) => Object.keys(doc).reduce((n, k) => n + (Array.isArray(doc[k]) ? doc[k].length : 0), 0);
  /** Kiểm một file bản chụp (đã chép ra `file`, mở đọc-ghi được): đúng kho HAK, schema không mới hơn app, integrity_check ok, foreign_key_check rỗng, số dòng records khớp dữ liệu dựng lại. */
  function checkSnapshotDb(t) {
    if (!store.isHakStore(t)) throw new Error("File không phải kho dữ liệu của HAK Lương.");
    const ic = store.pragma(t, "integrity_check"); if (ic !== "ok") throw new Error("Bản chụp không đạt integrity_check (" + ic + ").");
    const fk = t.prepare("PRAGMA foreign_key_check").all(); if (fk.length) throw new Error("Bản chụp vi phạm khóa ngoại (" + fk.length + " dòng).");
    const m = t.prepare("SELECT value FROM meta WHERE key = 'primary'").get(); if (!m || m.value !== "1") throw new Error("Bản chụp chưa phải kho nguồn chính (primary).");
    store.migrate(t);
    const n = t.prepare("SELECT COUNT(*) AS c FROM records").get().c, doc = M.toData(t), want = countOf(doc);
    if (n !== want) throw new Error("Số dòng không khớp (" + n + " dòng trong bảng records, dựng lại được " + want + ").");
    return { records: n, doc };
  }
  /** Thông tin bản chụp để giao diện hiển thị: có/không, thời điểm, dung lượng, hợp lệ hay lý do không dùng được (kiểm trên BẢN CHÉP, không đụng file gốc). */
  function snapshotInfo() {
    let st; try { st = fs.statSync(snapFile); } catch (e) { return { exists: false, ok: false, error: "Chưa có bản chụp SQLite (tạo sau mỗi lần sao lưu thành công)." }; }
    const out = { exists: true, file: path.basename(snapFile), mtime: st.mtime.toISOString(), size: st.size, ok: false }, tmp = dbFile + ".kiem-ban-chup";
    try { rmDb(tmp); fs.copyFileSync(snapFile, tmp); const t = store.open(tmp); try { const r = checkSnapshotDb(t); out.ok = true; out.records = r.records; } finally { try { t.close(); } catch (e) { /* đã đóng */ } } }
    catch (e) { out.error = String(e && e.message || e); }
    finally { rmDb(tmp); }
    return out;
  }
  /** Bản chụp để đưa vào gói Full Backup: VACUUM INTO + integrity_check + đối chiếu số dòng (store.snapshot) NGAY TRONG tiến trình chính, cùng nhịp đồng bộ với data.json (cur.text) nên cùng revision. */
  function snapshotForPackage(dest) {
    if (!cur) { const r = load(); if (!r.ok || !cur) return { ok: false, error: "Kho dữ liệu chưa mở được" }; }
    if (!db) return { ok: false, error: "Kho SQLite chưa mở" };
    const r = store.snapshot(db, dest); if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, file: dest, rev, records: r.records, schema: Number(store.pragma(db, "user_version")) };
  }
  /** Khôi phục từ bản chụp nằm trong gói Full Backup (002b): gói đã qua inspect → giải nén bản chụp ra tệp tạm → restoreFromSnapshot (cùng đường kiểm/cất bản cũ/thay nguyên tử/kiểm toán)
   *  → dọn tệp tạm. Tự từ chối khi kho đang lành. opts.tmpDir: thư mục tệp tạm. */
  function restoreFromPackage(pkgFile, actor, o) {
    if (!needsRecovery()) return { ok: false, error: "Kho dữ liệu đang mở bình thường — không khôi phục từ bản chụp trong gói để tránh ghi đè dữ liệu tốt. Chỉ dùng khi data.sqlite hỏng hoặc mất." };
    const FB = require("./fullbackup"), tmp = path.join((o && o.tmpDir) || path.dirname(pkgFile), "restore-snapshot-" + process.pid + "-" + Date.now() + ".sqlite");
    try {
      const ex = FB.extractSqliteSnapshot(pkgFile, tmp); if (!ex.ok) return { ok: false, error: ex.error };
      return restoreFromSnapshot(actor, { file: tmp, source: "gói " + path.basename(pkgFile), expectRecords: ex.rows });
    } finally { rmDb(tmp); }
  }
  // ===== v2.1.7: khôi phục từ bản chụp SQLite ở THƯ MỤC SAO LƯU ĐÃ CHỌN (sqliteDir) =====
  // Nguồn đọc-chỉ: không sửa/xóa/dọn bản ở đó. Luôn chép về tệp tạm cục bộ + kiểm SHA-256 rồi mới mở (không mở SQLite trực tiếp trên USB/ổ mạng). Khôi phục thật vẫn đi qua restoreFromSnapshot (marker, cất bản cũ, kiểm toán).
  const CAND_NAME = /^(data-snapshot\.sqlite|snap_\d{8}-\d{6}-\d{3}_[a-z0-9-]+\.sqlite)$/i, SCAN_MS = (opts && opts.scanTimeoutMs) || 6000;
  const lowerPath = (x) => { const r = path.resolve(String(x)); return process.platform === "win32" ? r.toLowerCase() : r; };
  const nestedOrSame = (a, b) => { const x = lowerPath(a), y = lowerPath(b), sep = path.sep; return x === y || x.startsWith(y + sep) || y.startsWith(x + sep); };
  const chosenDir = () => { try { const v = (json.readSettings() || {}).sqliteDir; return v ? String(v) : ""; } catch (e) { return ""; } };
  const describeFsError = (d, e) => { const c = e && e.code || ""; return c === "ENOENT" || c === "ENOTDIR" ? "Không tìm thấy thư mục " + d + " (USB chưa cắm / ổ mạng mất kết nối?)" : c === "EACCES" || c === "EPERM" ? "Không có quyền đọc thư mục " + d + " (" + c + ")" : "Không đọc được thư mục " + d + ": " + String(e && e.message || e); };
  /** Liệt kê tệp bản chụp trong 1 thư mục (đồng bộ). Thư mục ngoài máy chạy trong worker và CHỜ tối đa SCAN_MS: ổ mạng treo thì trả "quá thời gian chờ" thay vì đóng băng cửa sổ khôi phục. */
  function scanSnapDir(d, timed) {
    if (opts && opts.scanImpl && timed) return opts.scanImpl(d, SCAN_MS);
    if (!timed) { try { return { ok: true, items: fs.readdirSync(d).filter((n) => CAND_NAME.test(n)).map((n) => { const st = fs.statSync(path.join(d, n)); return st.isFile() ? { name: n, size: st.size, mtimeMs: st.mtimeMs } : null; }).filter(Boolean) }; } catch (e) { return { ok: false, error: describeFsError(d, e) }; } }
    let w;
    try {
      const { Worker, MessageChannel, receiveMessageOnPort } = require("worker_threads"), flag = new Int32Array(new SharedArrayBuffer(4)), ch = new MessageChannel();
      const src = 'const { workerData } = require("worker_threads"), fs = require("fs"), path = require("path"), f = new Int32Array(workerData.sab); let out; try { out = { ok: true, items: [] }; for (const n of fs.readdirSync(workerData.dir)) { if (!new RegExp(workerData.re, "i").test(n)) continue; try { const st = fs.statSync(path.join(workerData.dir, n)); if (st.isFile()) out.items.push({ name: n, size: st.size, mtimeMs: st.mtimeMs }); } catch (e) { /* bỏ qua tệp lỗi */ } } } catch (e) { out = { ok: false, code: e && e.code || "", error: String(e && e.message || e) }; } workerData.port.postMessage(out); Atomics.store(f, 0, 1); Atomics.notify(f, 0);';
      w = new Worker(src, { eval: true, workerData: { dir: d, re: CAND_NAME.source, sab: flag.buffer, port: ch.port2 }, transferList: [ch.port2] }); w.on("error", () => {}); w.unref();
      if (Atomics.wait(flag, 0, 0, SCAN_MS) === "timed-out") return { ok: false, error: "Quá thời gian chờ (" + Math.round(SCAN_MS / 1000) + " giây) khi đọc thư mục " + d + " (ổ mạng/USB chậm hoặc mất kết nối)", timeout: true };
      const m = receiveMessageOnPort(ch.port1); try { ch.port1.close(); } catch (e) { /* bỏ qua */ } if (!m) return { ok: false, error: "Không đọc được thư mục " + d };
      const r = m.message; return r.ok ? r : { ok: false, error: describeFsError(d, { code: r.code, message: r.error }) };
    } catch (e) { return { ok: false, error: describeFsError(d, e) }; }
    finally { if (w) { try { w.terminate().catch(() => {}); } catch (e) { /* bỏ qua */ } } }
  }
  const tagOf = (name) => { const m = name.match(SNAP_RE); return m ? m[1] : "moi-nhat"; };
  /** Danh sách ứng viên khôi phục từ 2 nguồn: thư mục dữ liệu (backups) và thư mục SQLite đã chọn. Không kiểm nội dung (đắt trên ổ chậm) — dùng inspectCandidate. Nguồn lỗi KHÔNG ném: trả reachable:false kèm nguyên nhân. */
  function listRestoreCandidates() {
    const sources = [], cands = [], chosen = chosenDir();
    const add = (source, label, d, res) => {
      sources.push({ source, label, dir: d, reachable: !!res.ok, error: res.ok ? "" : res.error, count: res.ok ? res.items.length : 0 });
      if (res.ok) res.items.forEach((it) => cands.push({ id: source + ":" + it.name, source, dir: d, name: it.name, tag: tagOf(it.name), mtimeMs: it.mtimeMs, size: it.size }));
    };
    add("local", "Thư mục dữ liệu", json.backupDir, scanSnapDir(json.backupDir, false));
    if (chosen) {
      if (nestedOrSame(chosen, dir) || nestedOrSame(chosen, json.backupDir)) sources.push({ source: "chosen", label: "Thư mục SQLite đã chọn", dir: chosen, reachable: false, error: "Bỏ qua: thư mục đã chọn trùng/lồng với thư mục dữ liệu của app (cấu hình sai).", count: 0 });
      else add("chosen", "Thư mục SQLite đã chọn", chosen, scanSnapDir(chosen, true));
    }
    cands.sort((a, b) => b.mtimeMs - a.mtimeMs || (a.source < b.source ? -1 : 1));
    // cùng tên ở 2 nguồn nhưng nội dung khác = dấu hiệu ghi dở / USB lỗi: cảnh báo, để chủ chọn
    const byName = {}; cands.forEach((c) => { (byName[c.name] = byName[c.name] || []).push(c); });
    Object.keys(byName).forEach((n) => { const g = byName[n]; if (g.length < 2) return; try { const shas = g.map((c) => shaOf(path.join(c.dir, c.name))); g.forEach((c, i) => { c.sha256 = shas[i]; c.shaConflict = new Set(shas).size > 1; }); } catch (e) { /* không đọc được: bỏ qua so sánh */ } });
    return { ok: true, sources, candidates: cands, chosenDir: chosen, warnings: cands.filter((c) => c.shaConflict).map((c) => "Hai bản cùng tên " + c.name + " nhưng nội dung khác nhau (" + c.source + ") — kiểm tra kỹ trước khi chọn.") };
  }
  const resolveCandidate = (id) => {
    const m = /^(local|chosen):([^\\/]+)$/.exec(String(id || "")); if (!m || !CAND_NAME.test(m[2])) return { ok: false, error: "Bản chụp không hợp lệ (id lạ)." };
    const c = listRestoreCandidates().candidates.find((x) => x.id === id); if (!c) return { ok: false, error: "Không thấy bản chụp này trong danh sách (đã bị xóa / ổ chưa cắm)." };
    return { ok: true, cand: c, file: path.join(c.dir, c.name) };
  };
  /** Chép ứng viên về tệp tạm cục bộ và kiểm SHA-256 (đọc lại nguồn lần 2 để bắt lỗi đọc giữa chừng). Mọi lỗi → dọn tệp tạm, KHÔNG đụng dữ liệu. */
  function copyCandidateLocal(src, dest, label) {
    try {
      const before = shaOf(src); rmDb(dest); fs.copyFileSync(src, dest); if (opts && opts.copyHook) opts.copyHook(dest);
      if (shaOf(dest) !== before || shaOf(src) !== before) throw Object.assign(new Error("không ổn định"), { code: "HAK_UNSTABLE" });
      return { ok: true, sha256: before };
    } catch (e) {
      rmDb(dest);
      const c = e && e.code || "";
      if (c === "ENOSPC") return { ok: false, error: "Không đủ chỗ trống ở " + path.dirname(dest) + " để chép bản chụp về kiểm tra." };
      return { ok: false, error: "Đọc từ " + label + " không ổn định (USB/mạng) hoặc bị mất kết nối giữa chừng — thử lại hoặc dùng bản khác. Chi tiết: " + String(e && e.message || e) };
    }
  }
  const inspectTmp = () => dbFile + ".kiem-ung-vien", restoreTmp = () => dbFile + ".nguon-ung-vien";
  /** Kiểm một ứng viên (chép về tệp tạm → checkSnapshotDb). Luôn dọn tệp tạm. */
  function inspectCandidate(id) {
    const r = resolveCandidate(id); if (!r.ok) return r;
    const tmp = inspectTmp(), label = r.cand.source === "chosen" ? "thư mục đã chọn" : "thư mục dữ liệu";
    const out = { ok: false, id, name: r.cand.name, source: r.cand.source, mtimeMs: r.cand.mtimeMs, size: r.cand.size };
    try {
      const c = copyCandidateLocal(r.file, tmp, label); if (!c.ok) { out.error = c.error; return out; }
      out.sha256 = c.sha256;
      const t = store.open(tmp); try { const chk = checkSnapshotDb(t); out.ok = true; out.records = chk.records; out.schema = Number(store.pragma(t, "user_version")); } finally { try { store.close(t); } catch (e) { /* đã đóng */ } }
    } catch (e) { out.error = String(e && e.message || e); }
    finally { rmDb(tmp); }
    return out;
  }
  /** Tìm bản dùng được MỚI NHẤT: duyệt theo thời gian giảm dần, kiểm từng bản cho tới khi gặp bản hợp lệ; bản mới hơn mà hỏng bị bỏ qua kèm lý do. KHÔNG tự khôi phục. */
  function findBestCandidate() {
    const l = listRestoreCandidates(), checked = []; let best = null;
    for (const c of l.candidates) { const r = inspectCandidate(c.id); checked.push({ id: c.id, ok: r.ok, error: r.error || "", records: r.records }); if (r.ok) { best = Object.assign({}, r); break; } }
    return { ok: true, best, checked, sources: l.sources };
  }
  /** Khôi phục từ 1 ứng viên theo id (id phải nằm trong danh sách — không nhận đường dẫn tùy ý). Chỉ khi kho không mở được. */
  function restoreCandidate(actor, id) {
    if (!needsRecovery()) return { ok: false, error: "Chỉ khôi phục khi kho dữ liệu không mở được — kho đang mở bình thường nên không khôi phục để tránh ghi đè dữ liệu tốt." };
    const r = resolveCandidate(id); if (!r.ok) return r;
    const tmp = restoreTmp(), label = r.cand.source === "chosen" ? "thư mục đã chọn" : "thư mục dữ liệu";
    try {
      const c = copyCandidateLocal(r.file, tmp, label); if (!c.ok) return { ok: false, error: c.error + " Dữ liệu không đổi." };
      return restoreFromSnapshot(actor, { file: tmp, source: (r.cand.source === "chosen" ? "thư mục SQLite đã chọn: " : "thư mục dữ liệu: ") + path.join(r.cand.dir, r.cand.name) });
    } finally { rmDb(tmp); }
  }
  /** Trạng thái bản ngoài máy (đọc từ thư mục thật, không phải RAM): bản mới nhất + số bản. Có thời hạn chờ. */
  function externalStatus() {
    const d = chosenDir(); if (!d) return { ok: true, configured: false };
    if (nestedOrSame(d, dir) || nestedOrSame(d, json.backupDir)) return { ok: true, configured: true, dir: d, reachable: false, error: "Thư mục đã chọn trùng/lồng với thư mục dữ liệu của app." };
    const r = scanSnapDir(d, true); if (!r.ok) return { ok: true, configured: true, dir: d, reachable: false, error: r.error };
    const items = r.items.slice().sort((a, b) => b.mtimeMs - a.mtimeMs);
    const st = Number((json.readSettings() || {}).sqliteStaleDays), staleDays = st > 0 ? st : 7, latest = items[0] || null, ageDays = latest ? (now().getTime() - latest.mtimeMs) / 86400000 : null;
    return { ok: true, configured: true, dir: d, reachable: true, count: items.length, latest, staleDays, ageDays: ageDays == null ? null : Math.round(ageDays * 10) / 10, stale: latest == null || ageDays > staleDays, catchup: snapshotCatchup };
  }
  /** Diễn tập khôi phục (KHÔNG ghi gì, dùng được cả khi kho đang lành): kiểm bản hợp lệ mới nhất ở mọi nguồn trên bản chép tạm, báo số dòng/thời điểm để chủ biết sao lưu dùng được TRƯỚC khi cần. */
  function restoreDrill() {
    const r = findBestCandidate();
    if (!r.best) return { ok: true, good: false, best: null, text: "Diễn tập: KHÔNG có bản chụp nào dùng được" + (r.checked.length ? " — " + r.checked.slice(0, 3).map((c) => c.id + ": " + c.error).join("; ") : " (chưa có bản chụp)") + ". Hãy bấm Sao lưu rồi thử lại.", checked: r.checked, sources: r.sources };
    const b = r.best;
    return { ok: true, good: true, best: b, checked: r.checked, sources: r.sources, text: "Diễn tập đạt (không ghi gì): bản " + b.name + " ở " + (b.source === "chosen" ? "thư mục đã chọn" : "thư mục dữ liệu") + ", " + new Date(b.mtimeMs).toLocaleString("vi-VN") + ", " + b.records + " dòng — khôi phục được." + (r.checked.some((c) => !c.ok) ? " Có " + r.checked.filter((c) => !c.ok).length + " bản mới hơn bị lỗi, đã bỏ qua." : "") };
  }
  /** Kiểm các bản ở thư mục đã chọn: SHA-256 đối chiếu bản cùng tên trong thư mục dữ liệu; bản mới nhất còn kiểm đầy đủ (integrity_check, số dòng). */
  function verifyExternal() {
    const d = chosenDir(); if (!d) return { ok: true, good: true, total: 0, text: "Chưa chọn thư mục SQLite riêng" };
    if (nestedOrSame(d, dir) || nestedOrSame(d, json.backupDir)) return { ok: true, good: false, total: 0, text: "Thư mục đã chọn trùng/lồng với thư mục dữ liệu", bad: [] };
    const r = scanSnapDir(d, true); if (!r.ok) return { ok: true, good: false, total: 0, text: r.error, bad: [] };
    const items = r.items.slice().sort((a, b) => b.mtimeMs - a.mtimeMs), bad = [];
    items.forEach((it) => { try { const loc = path.join(json.backupDir, it.name); if (fs.existsSync(loc) && shaOf(loc) !== shaOf(path.join(d, it.name))) bad.push({ name: it.name, status: "khác bản trong thư mục dữ liệu" }); } catch (e) { bad.push({ name: it.name, status: "không đọc được: " + String(e && e.message || e) }); } });
    let latestText = "";
    if (items[0]) { const ins = inspectCandidate("chosen:" + items[0].name); if (!ins.ok) bad.push({ name: items[0].name, status: ins.error }); else latestText = " Bản mới nhất " + items[0].name + ": " + ins.records + " dòng, đạt kiểm tra đầy đủ."; }
    return { ok: true, good: bad.length === 0, total: items.length, bad: bad.slice(0, 20), text: (items.length - bad.length) + "/" + items.length + " bản ở thư mục đã chọn khớp/đọc được" + (bad.length ? " — LỖI: " + bad.slice(0, 3).map((x) => x.name + " (" + x.status + ")").join("; ") : "") + latestText };
  }
  const stamp = () => { const d = now(); return ymd(d) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()); };
  /** Hoàn tất (idempotent) việc thay data.sqlite bằng ứng viên đã kiểm; chạy lại được sau mọi lần bị ngắt. Marker xóa CUỐI CÙNG. */
  function finishRestore(m) {
    if (fs.existsSync(candFile)) {
      if (sha256File(candFile) !== m.candSha) throw new Error("ứng viên khôi phục không khớp mã kiểm (không thay data.sqlite).");
      if (db) { try { store.close(db); } catch (e) { /* đã đóng */ } db = null; }
      for (const x of ["-wal", "-shm"]) { try { fs.rmSync(dbFile + x, { force: true }); } catch (e) { /* bỏ qua */ } } // WAL cũ không được áp lên file mới (bản đầy đủ đã được cất trước đó)
      if (opts.testHook) opts.testHook("truoc-doi-ten"); // chỉ kiểm thử
      retry(() => fs.renameSync(candFile, dbFile));
      if (opts.testHook) opts.testHook("sau-doi-ten"); // chỉ kiểm thử
      for (const x of ["-wal", "-shm"]) { try { fs.rmSync(candFile + x, { force: true }); } catch (e) { /* bỏ qua */ } }
    }
    openDb(); const doc = M.toData(db), text = JSON.stringify(doc); cur = { text, doc }; rev = Number(meta("rev") || 0);
    const after = countOf(doc), tag = "[" + m.ts + "]";
    const entry = { luc: new Date().toISOString(), nguoi: String(m.actor || ""), thaoTac: "Khôi phục từ bản chụp SQLite", chiTiet: tag + " từ " + m.from + "; số dòng trước: " + (m.before == null ? "không đọc được" : m.before) + ", sau: " + after + "; bản cũ cất: " + (m.kept || []).join(", ") };
    const done = db.prepare("SELECT 1 FROM migration_journal WHERE state = 'restored-from-snapshot' AND detail LIKE ?").get("%" + m.ts + "%");
    if (!done) {
      const next = JSON.parse(text); next.auditlog = (Array.isArray(next.auditlog) ? next.auditlog : []).concat([entry]); // nhật ký kiểm toán hiển thị trong app
      const cs = cset.diff(doc, next);
      store.tx(db, () => { cset.applyToDb(db, cs); setMeta("rev", rev + 1); journal("restored-from-snapshot", { ts: m.ts, actor: m.actor, from: m.from, before: m.before, after, kept: m.kept });
        db.prepare("INSERT INTO audit (at, actor, action, tbl, id, detail) VALUES (?, ?, ?, ?, ?, ?)").run(entry.luc, String(m.actor || ""), "khoi-phuc-tu-ban-chup", "", "", JSON.stringify({ ts: m.ts, from: m.from, before: m.before, after })); });
      rev++; cur = { text: JSON.stringify(next), doc: next };
    }
    atomicWrite(dataFile, cur.text); setMeta("exported_sha", sha(cur.text)); jsonStale = false; writeNote(); // bản xuất khớp dữ liệu vừa khôi phục (bản cũ đã cất)
    conflict = ""; opened = true; fs.rmSync(markerFile, { force: true });
    return { ok: true, records: after };
  }
  const pause = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (e) { /* bỏ qua */ } };
  const retry = (fn) => { let last; for (let i = 0; i < 8; i++) { try { return fn(); } catch (e) { last = e; if (!e || !/^(EBUSY|EPERM|EACCES)$/.test(e.code || "")) throw e; pause(250); } } throw last; }; // Windows: antivirus/handle vừa nhả có thể giữ file vài trăm ms
  const sha256File = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  /** Khôi phục data.sqlite từ bản chụp. Chỉ dùng khi kho không mở được (giao diện chặn ở main). Không hủy dữ liệu hiện có: cất data.sqlite(+wal/shm)/data.json sang tên 'truoc-khoi-phuc-<ts>'. */
  function restoreFromSnapshot(actor, o) {
    o = o || {}; const srcFile = o.file || snapFile;
    if (!needsRecovery()) return { ok: false, error: "Kho dữ liệu đang mở bình thường — không khôi phục từ bản chụp để tránh ghi đè dữ liệu tốt. Chỉ dùng khi data.sqlite hỏng hoặc mất." }; // tự bảo vệ ở lớp lưu trữ, không chỉ ở IPC
    clearTimeout(timer); timer = null;
    let before = null; const ts = stamp(), kept = [];
    try {
      if (!fs.existsSync(srcFile)) return { ok: false, error: "Không có bản chụp SQLite để khôi phục." };
      rmDb(candFile); fs.copyFileSync(srcFile, candFile);
      const t = store.open(candFile); // từ chối bản chụp của app MỚI HƠN (schema > SCHEMA_VERSION) ngay ở đây
      try { const chk = checkSnapshotDb(t); if (o.expectRecords != null && chk.records !== o.expectRecords) throw new Error("bản chụp lệch data.json trong gói (" + chk.records + " dòng so với " + o.expectRecords + " dòng của data.json)"); store.tx(t, () => { t.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('exported_sha', '')").run(); }); } finally { store.close(t); }
    } catch (e) { rmDb(candFile); return { ok: false, error: "Bản chụp SQLite không dùng được, KHÔNG thay đổi dữ liệu: " + String(e && e.message || e) }; }
    try {
      acquireLockOnly();
      if (db) { try { before = db.prepare("SELECT COUNT(*) AS c FROM records").get().c; } catch (e) { before = null; } try { store.close(db); } catch (e) { /* đã đóng */ } db = null; }
      else { try { const { DatabaseSync } = store.driver(), r = new DatabaseSync(dbFile, { readOnly: true }); try { before = r.prepare("SELECT COUNT(*) AS c FROM records").get().c; } finally { r.close(); } } catch (e) { before = null; } }
      cur = null; opened = false; conflict = "";
      for (const x of ["", "-wal", "-shm"]) if (fs.existsSync(dbFile + x)) { const k = "data.sqlite.truoc-khoi-phuc-" + ts + x; retry(() => fs.copyFileSync(dbFile + x, path.join(dir, k))); kept.push(k); }
      if (fs.existsSync(dataFile)) { const k = "data.json.truoc-khoi-phuc-" + ts; fs.copyFileSync(dataFile, path.join(dir, k)); kept.push(k); }
      atomicWrite(markerFile, JSON.stringify({ ts, actor: String(actor || ""), from: o.source || "backups/data-snapshot.sqlite", candSha: sha256File(candFile), before, kept, at: new Date().toISOString() }));
      if (opts.testHook) opts.testHook("sau-marker"); // chỉ kiểm thử: kill -9 thật tại đây
      const r = finishRestore(JSON.parse(fs.readFileSync(markerFile, "utf8")));
      return { ok: true, records: r.records, before, kept };
    } catch (e) { return { ok: false, error: "Khôi phục từ bản chụp chưa hoàn tất: " + String(e && e.message || e) + " Dữ liệu cũ đã được cất (tên có 'truoc-khoi-phuc'); mở lại app sẽ tự hoàn tất nếu còn dở dang.", kept }; }
  }
  const acquireLockOnly = () => { if (!db) acquireLock(); };
  const needsRecovery = () => { if (cur) return false; try { return load().ok === false; } catch (e) { return true; } };
  function hasDataFile() { return !!cur || fs.existsSync(dbFile) || json.hasDataFile(); }
  function close() { syncJson(); if (db) { try { store.close(db); } catch (e) { /* đã đóng */ } db = null; } releaseLock(); }

  return Object.assign({}, json, {
    snapshotInfo, restoreFromSnapshot, snapshotForPackage, restoreFromPackage, listRestoreCandidates, inspectCandidate, findBestCandidate, restoreCandidate, externalStatus, verifyExternal, restoreDrill, needsRecovery, load, save, saveDelta, quarantineCorrupt, hasDataFile, close, syncJson, adoptJson, snapshotExported, beginExternalOp, endExternalOp, restoreJsonFromSqlite, restoreJsonIfChanged, pendingOp: () => (db ? pendingOp() : null),
    snapshotNow, snapshotStatus, lastSnapshotError: () => snapshotError, backup: backupWrap("backup"), backupYear: backupWrap("backupYear"), changedSinceBackup: readWrap("changedSinceBackup"), tickSchedule: backupWrap("tickSchedule"), backupOnClose: backupWrap("backupOnClose"), syncMirror: mirrorWrap(), lastBackupError: () => backupError,
    sig: () => "sqlite:" + rev,
    /** 006: bản đang lưu ĐÃ phân tích (chỉ đọc) + sig — để kiểm quy tắc / kho năm không phân tích lại toàn bộ dữ liệu sau mỗi lần lưu. */
    currentDoc: () => (cur && !conflict ? { sig: "sqlite:" + rev, doc: cur.doc } : null), kind: "sqlite", dbFile, info: () => ({ dataFile, backupDir: json.backupDir, kind: "sqlite", dbFile })
  });
}

module.exports = { createSqliteStorage };
