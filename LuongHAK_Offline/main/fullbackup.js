// Full Backup / Restore: 1 gói ZIP gồm dữ liệu lương (data.json) + toàn bộ chứng từ gốc + manifest (SHA-256 từng file).
// Tạo: ghi ra file .tmp → kiểm tra lại toàn bộ gói → mới đổi tên (không bao giờ để lại gói dở).
// Khôi phục: KHÔNG ghi gì lên máy cho tới khi gói qua kiểm tra (inspect); chứng từ chỉ được THÊM, không ghi đè.
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const Z = require("./zip");
const FORMAT = "HAK-FULLBACKUP", VERSION = 2;
const SNAP_DEFLATE_MAX = 256 * 1048576;
const SNAPSHOT_PATH = "sqlite/data-snapshot.sqlite"; // 002b: bản chụp SQLite TÙY CHỌN trong gói (manifest.sqliteSnapshot); app cũ không biết tới và bỏ qua, data.json vẫn là nguồn khôi phục chuẩn
const rowsOf = (o) => Object.keys(o).reduce((n, k) => n + (Array.isArray(o[k]) ? o[k].length : 0), 0);
function shaFileWith(f, file) { const h = crypto.createHash("sha256"), fd = f.openSync(file, "r"), b = Buffer.alloc(1 << 20); let n; try { while ((n = f.readSync(fd, b, 0, b.length, null)) > 0) h.update(b.subarray(0, n)); } finally { f.closeSync(fd); } return h.digest("hex"); }
function shaFile(file) { return shaFileWith(fs, file); }
const SNAPSHOT_SCHEMA_MAX = 2; // schema SQLite tối đa app này hiểu; khớp với SCHEMA_VERSION của kho (tests/unit/fullbackup-snapshot.test.js kiểm hai số bằng nhau). Tệp này không tự mở SQLite (quy tắc U-SQL-07): bản chụp do kho chụp và kiểm, ở đây chỉ đối chiếu siêu dữ liệu
/** Kiểm siêu dữ liệu bản chụp do kho SQLite cung cấp (kho đã VACUUM INTO + integrity_check + đối chiếu số dòng): có tệp, schema ≤ app, số dòng = số dòng của data.json cùng thời điểm. Ném lỗi nếu không đạt. */
function checkSnapshotMeta(sn, wantRows) {
  let st; try { st = fs.statSync(sn.file); } catch (e) { throw new Error("không đọc được tệp bản chụp"); }
  if (!st.isFile() || st.size <= 0) throw new Error("tệp bản chụp rỗng");
  if (!Number.isInteger(sn.schema) || !Number.isInteger(sn.records)) throw new Error("thiếu thông tin schema/số dòng của bản chụp");
  if (sn.schema > SNAPSHOT_SCHEMA_MAX) throw new Error("schema v" + sn.schema + " mới hơn app này (v" + SNAPSHOT_SCHEMA_MAX + ")");
  if (sn.records !== wantRows) throw new Error("lệch data.json (" + sn.records + " dòng so với " + wantRows + " dòng trong data.json)");
  return { schema: sn.schema, records: sn.records, size: st.size };
}
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const stampOf = (d) => { const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); };

const ST = { SUCCESS: "SUCCESS", PARTIAL: "PARTIAL", FAILED: "FAILED", CANCELLED: "CANCELLED" };
const SAFE_MARGIN = 16 * 1048576;
function freeBytes(dir, statfs) { try { const f = (statfs || fs.statfsSync)(dir); return Number(f.bavail) * Number(f.bsize); } catch (e) { return null; } }
function failed(error, extra) { return Object.assign({ ok: false, status: ST.FAILED, error }, extra || {}); }

/** Full Backup — 4 trạng thái:
 *  SUCCESS   đủ mọi thành phần, đã kiểm tra lại gói (ok:true).
 *  PARTIAL   CHỈ khi o.allowPartial === true: gói thiếu một số phần, ghi rõ trong missing[]; tên file "LuongHAK_PartialBackup_…", manifest.complete=false; KHÔNG tính là Full Backup (ok:false).
 *  FAILED    thiếu/hỏng phần nào mà không cho phép PARTIAL, hoặc lỗi đường dẫn/dung lượng/ghi (không để lại file).
 *  CANCELLED người dùng hủy (o.shouldCancel() trả true) — xóa file tạm.
 *  Tính nhất quán: data.json là bản chụp (dataText) truyền vào lúc bắt đầu; nhật ký thư viện OCR được đọc 1 lần và cắt tại dòng đầy đủ cuối cùng; ảnh/chứng từ được kiểm SHA-256 ngay khi đóng gói và kiểm lại toàn gói.
 *  @param o { dataText, vault, ocrLib, destDir, appVersion, user, now, allowPartial, shouldCancel, restoreConfig, statfs, onProgress } */
function create(o) {
  const now = o.now || (() => new Date()), cancelled = () => !!(o.shouldCancel && o.shouldCancel()), prog = (m) => { try { if (o.onProgress) o.onProgress(m); } catch (e) { /* tiến độ không được làm hỏng sao lưu */ } };
  const missing = [], warnings = [];
  // 1-2. đường dẫn + ghi được
  if (typeof o.dataText !== "string" || !o.dataText.trim()) return failed("Chưa có dữ liệu để sao lưu");
  let parsed; try { parsed = JSON.parse(o.dataText); } catch (e) { return failed("Dữ liệu hiện tại không đọc được (JSON lỗi) — không đóng gói"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return failed("Dữ liệu hiện tại không đúng cấu trúc — không đóng gói");
  const yearFiles=[];
  try{for(const ref of parsed._yearArchives||[]){
    const Y=require('./year-archive');if(!o.yearArchiveDir||!Y.validFile(ref.file))throw Error('Thiếu kho hồ sơ năm');
    const abs=path.join(o.yearArchiveDir,ref.file);if(fs.lstatSync(abs).isSymbolicLink())throw Error('Hồ sơ năm là liên kết');
    const bytes=fs.readFileSync(abs);if(sha(bytes)!==ref.sha256)throw Error('Hồ sơ năm sai SHA256');if(Y.decode(bytes).year!==ref.year)throw Error('Năm hồ sơ không khớp');
    yearFiles.push({abs,path:'year_archives/'+ref.file,sha256:ref.sha256,size:bytes.length});
  }}catch(e){return failed('Không thể sao lưu đầy đủ hồ sơ năm: '+e.message);}
  if (!o.destDir) return failed("Chưa chọn thư mục sao lưu");
  try {
    fs.mkdirSync(o.destDir, { recursive: true });
    const probe = path.join(o.destDir, ".hak-write-test-" + process.pid); fs.writeFileSync(probe, "x"); fs.unlinkSync(probe);
  } catch (e) { return failed("Thư mục sao lưu không ghi được: " + (e.message || e)); }
  // 3-5. liệt kê chứng từ + thư viện OCR, ước lượng dung lượng, kiểm tra toàn vẹn nguồn
  prog("Kiểm tra dữ liệu nguồn…");
  const metas = o.vault ? o.vault.list() : [], status = {}; (o.vault ? o.vault.verify() : []).forEach((x) => { status[x.id] = x.status; });
  const okDocs = [];
  metas.forEach((m) => { if (status[m.id] === "ok") okDocs.push(m); else missing.push({ kind: "document", id: m.id, name: m.name, problem: status[m.id] === "missing" ? "mất file" : "sai SHA-256" }); });
  let ocrFiles = [];
  if (o.ocrLib) {
    try { o.ocrLib.load(); } catch (e) { return failed("Không đọc được thư viện mẫu OCR: " + (e.message || e)); }
    const lv = o.ocrLib.verify();
    (lv.bad || []).forEach((b) => missing.push({ kind: "ocr-image", id: String(b.id || b.sha || b), problem: b.error || "ảnh mẫu mất/hỏng" }));
    if (lv.corruptLines) missing.push({ kind: "ocr-log", id: "library.jsonl", problem: lv.corruptLines + " dòng nhật ký hỏng" });
    if (lv.truncatedTail) warnings.push("Nhật ký thư viện OCR có 1 dòng cuối bị cắt dở (mất điện) — đã bỏ qua, các mẫu còn lại đầy đủ");
    ocrFiles = o.ocrLib.files();
  }
  if (missing.length && !o.allowPartial) return failed("Không thể tạo Full Backup đầy đủ: " + missing.length + " thành phần thiếu/hỏng (" + missing.slice(0, 5).map((x) => x.kind + " " + x.id + " — " + x.problem).join("; ") + (missing.length > 5 ? "; …" : "") + "). Sửa nguồn trước, hoặc chọn 'Sao lưu một phần' để tạo gói PARTIAL (không tính là Full Backup).", { missing });
  let need = Buffer.byteLength(o.dataText)+yearFiles.reduce((s,f)=>s+f.size,0); okDocs.forEach((m) => { need += Number(m.size) || 0; }); ocrFiles.forEach((f) => { try { need += fs.statSync(f.abs).size; } catch (e) { /* file biến mất — sẽ báo khi đóng gói */ } });
  const free = freeBytes(o.destDir, o.statfs);
  if (free != null && free < need * 1.1 + SAFE_MARGIN) return failed("Không đủ dung lượng trống: cần khoảng " + Math.ceil(need * 1.1 / 1048576) + " MB, còn " + Math.floor(free / 1048576) + " MB", { needBytes: need, freeBytes: free });
  if (cancelled()) return { ok: false, status: ST.CANCELLED };
  const partial = missing.length > 0, prefix = partial ? "LuongHAK_PartialBackup_" : "LuongHAK_FullBackup_";
  let name = prefix + stampOf(now()) + ".zip", n = 1;
  while (fs.existsSync(path.join(o.destDir, name))) name = prefix + stampOf(now()) + "_" + (++n) + ".zip";
  const dest = path.join(o.destDir, name), tmp = dest + ".tmp";
  let snapInfo = null; // bản chụp SQLite (tùy chọn): lỗi ở đây KHÔNG làm hỏng gói — bỏ bản chụp, ghi cảnh báo
  if (o.sqliteSnapshot && o.sqliteSnapshot.file) {
    try { const f = o.sqliteSnapshot.file, v = checkSnapshotMeta(o.sqliteSnapshot, rowsOf(parsed)); snapInfo = { file: f, size: v.size, sha256: shaFile(f), schema: v.schema, records: v.records, rev: Number(o.sqliteSnapshot.rev) || 0 }; }
    catch (e) { warnings.push("Không đưa bản chụp SQLite vào gói (" + (e.message || e) + "). Gói vẫn đầy đủ: khôi phục dùng data.json."); }
  } else if (o.sqliteSnapshotError) warnings.push("Không đưa bản chụp SQLite vào gói (" + o.sqliteSnapshotError + "). Gói vẫn đầy đủ: khôi phục dùng data.json.");
  const counts = {}; Object.keys(parsed).forEach((k) => { if (Array.isArray(parsed[k])) counts[k] = parsed[k].length; });
  const manifest = { format: FORMAT, version: VERSION, status: partial ? ST.PARTIAL : ST.SUCCESS, complete: !partial, createdAt: now().toISOString(), appVersion: String(o.appVersion || ""), createdBy: String(o.user || ""), data: null, counts, digest: require("./data-digest").digest(parsed), documents: [], ocrLibrary: null, restoreConfig: o.restoreConfig || null, missing, warnings };
  let w;
  const abortTmp = () => { try { if (w) w.abort(); } catch (e) { /* đã đóng */ } try { fs.unlinkSync(tmp); } catch (e) { /* chưa tạo */ } };
  try {
    w = Z.createWriter(tmp, { now });
    const db = Buffer.from(o.dataText, "utf8"); w.addBuffer("data.json", db);
    manifest.data = { path: "data.json", size: db.length, sha256: sha(db) };
    manifest.version=yearFiles.length?2:1;
    if (snapInfo) { // giữ nguyên manifest.version: app cũ bỏ qua khối/tệp lạ (đã kiểm bằng mã nguyên văn 2.0.35 trong tests/unit/fullbackup-snapshot.test.js)
      try { if (snapInfo.size <= SNAP_DEFLATE_MAX) w.addBuffer(SNAPSHOT_PATH, fs.readFileSync(snapInfo.file)); else w.addFile(SNAPSHOT_PATH, snapInfo.file); // nén (JSON trong SQLite nén ~15–20 lần); quá lớn thì lưu nguyên để không nạp cả file vào bộ nhớ
        manifest.sqliteSnapshot = { path: SNAPSHOT_PATH, size: snapInfo.size, sha256: snapInfo.sha256, schema: snapInfo.schema, records: snapInfo.records, rev: snapInfo.rev, createdAt: now().toISOString() }; }
      catch (e) { abortTmp(); return failed("Không tạo được gói: " + (e.message || e)); }
    }
    if(yearFiles.length){manifest.yearArchives=yearFiles.map(f=>({path:f.path,sha256:f.sha256,size:f.size}));for(const f of yearFiles)w.addFile(f.path,f.abs);}
    let k = 0;
    for (const m of okDocs) {
      if (cancelled()) { abortTmp(); return { ok: false, status: ST.CANCELLED }; }
      prog("Đóng gói chứng từ " + (++k) + "/" + okDocs.length);
      const f = o.vault.filesOf(m.id), rel = "documents/" + m.id + (m.ext ? "." + m.ext : "");
      w.addFile(rel, f.file); w.addBuffer("documents/" + m.id + ".json", Buffer.from(JSON.stringify(m, null, 1), "utf8"));
      manifest.documents.push({ id: m.id, name: m.name, path: rel, size: m.size, sha256: m.sha256 });
    }
    if (o.ocrLib) { // Thư viện mẫu OCR: nhật ký + ảnh ô, kèm SHA-256 từng file → khôi phục không phải học lại
      const fl = []; k = 0;
      for (const f of ocrFiles) {
        if (cancelled()) { abortTmp(); return { ok: false, status: ST.CANCELLED }; }
        if (++k % 200 === 0) prog("Đóng gói thư viện OCR " + k + "/" + ocrFiles.length);
        const rel = "ocr_library/" + f.rel; let buf; try { buf = fs.readFileSync(f.abs); } catch (e) { missing.push({ kind: "ocr-file", id: f.rel, problem: "không đọc được: " + (e.message || e) }); continue; }
        if (/\.jsonl$/.test(f.rel)) { const cut = buf.lastIndexOf(10); buf = cut < 0 ? Buffer.alloc(0) : buf.subarray(0, cut + 1); } // bản chụp nhất quán: chỉ dòng đầy đủ, đã đọc 1 lần
        else if (sha(buf) !== path.basename(f.rel, ".png")) { missing.push({ kind: "ocr-image", id: f.rel, problem: "ảnh mẫu sai SHA-256" }); continue; }
        w.addBuffer(rel, buf); fl.push({ path: rel, size: buf.length, sha256: sha(buf) });
      }
      manifest.ocrLibrary = { samples: o.ocrLib.lib.size(), edits: o.ocrLib.lib.edits().length, files: fl };
      if (missing.length && !partial) { abortTmp(); return failed("Thư viện mẫu OCR thay đổi/hỏng trong lúc sao lưu: " + missing.map((x) => x.id + " — " + x.problem).join("; ") + ". Chạy lại.", { missing }); }
    }
    w.addBuffer("manifest.json", Buffer.from(JSON.stringify(manifest, null, 1), "utf8"));
    w.finish();
  } catch (e) { abortTmp(); return failed("Không tạo được gói: " + (e.message || e)); }
  prog("Kiểm tra lại gói…");
  const chk = inspect(tmp);
  if (chk.ok && chk.sqlite && !chk.sqlite.ok) warnings.push("Bản chụp SQLite trong gói không qua kiểm tra lại (" + chk.sqlite.error + ") — khôi phục sẽ dùng data.json.");
  if (!chk.ok) { abortTmp(); return failed("Gói vừa tạo không qua kiểm tra: " + chk.problems.join("; ")); }
  if (cancelled()) { abortTmp(); return { ok: false, status: ST.CANCELLED }; }
  // nguồn thay đổi trong lúc đóng gói? (chứng từ thêm mới không có trong gói → báo, không coi là lỗi: gói nhất quán tại thời điểm bắt đầu)
  if (o.vault) { const have = new Set(okDocs.map((m) => m.id)), added = o.vault.list().filter((m) => !have.has(m.id) && !missing.some((x) => x.id === m.id)); if (added.length) warnings.push(added.length + " chứng từ được thêm trong lúc sao lưu nên chưa có trong gói — tạo lại gói nếu cần"); }
  fs.renameSync(tmp, dest);
  const whole = crypto.createHash("sha256"), fd = fs.openSync(dest, "r"), buf = Buffer.alloc(1 << 20); let r0;
  try { while ((r0 = fs.readSync(fd, buf, 0, buf.length, null)) > 0) whole.update(buf.subarray(0, r0)); } finally { fs.closeSync(fd); }
  const hex = whole.digest("hex"); fs.writeFileSync(dest + ".sha256", hex + "  " + name + "\n");
  return { ok: !partial, status: partial ? ST.PARTIAL : ST.SUCCESS, partial, file: dest, name, size: fs.statSync(dest).size, sha256: hex, docs: manifest.documents.length, yearArchives: yearFiles.length, ocrSamples: manifest.ocrLibrary ? manifest.ocrLibrary.samples : 0, sqliteSnapshot: !!manifest.sqliteSnapshot, missing, warnings };
}

/** Kiểm tra gói KHÔNG ghi gì lên đĩa. @param vault (tuỳ chọn) để phân loại chứng từ new/same/conflict.
 *  → { ok, manifest, problems[], dataText, docs: [{id,name,size,state}] } */
function inspect(file, vault) {
  const res = { ok: false, manifest: null, problems: [], dataText: null, docs: [], sqlite: null, warnings: [] };
  let zip; try { zip = Z.openZip(file); } catch (e) { res.problems.push(e.message); return res; }
  try {
    const me = zip.byName["manifest.json"]; if (!me) { res.problems.push("Thiếu manifest.json — không phải gói Full Backup của app"); return res; }
    let m; try { m = JSON.parse(zip.readBuffer(me, 8 * 1048576).toString("utf8")); } catch (e) { res.problems.push("manifest.json hỏng: " + e.message); return res; }
    if (!m || m.format !== FORMAT) { res.problems.push("Không phải gói Full Backup của app (sai định dạng)"); return res; }
    if (m.version > VERSION) { res.problems.push("Gói do phiên bản MỚI HƠN tạo (v" + m.version + ") — hãy cập nhật app"); return res; }
    res.manifest = m; res.partial = m.complete === false;
    const de = zip.byName[(m.data || {}).path || ""];
    if (!de) res.problems.push("Thiếu data.json trong gói");
    else {
      try { const b = zip.readBuffer(de); if (sha(b) !== m.data.sha256 || b.length !== m.data.size) res.problems.push("data.json sai SHA-256 — gói bị hỏng hoặc bị sửa"); else { res.dataText = b.toString("utf8"); try { const o = JSON.parse(res.dataText); if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("không phải đối tượng"); } catch (e) { res.problems.push("data.json không phải dữ liệu hợp lệ: " + e.message); res.dataText = null; } } }
      catch (e) { res.problems.push("data.json: " + e.message); }
    }
    (m.documents || []).forEach((d) => {
      const e = zip.byName[d.path || ""], sc = zip.byName["documents/" + d.id + ".json"]; let state = "new";
      if (!e || !sc) { res.problems.push("Thiếu file chứng từ " + d.id); res.docs.push({ id: d.id, name: d.name, size: d.size, state: "bad" }); return; }
      try { if (zip.sha256Of(e) !== d.sha256) throw new Error("sai SHA-256"); } catch (x) { res.problems.push("Chứng từ " + d.id + " (" + d.name + "): " + x.message); res.docs.push({ id: d.id, name: d.name, size: d.size, state: "bad" }); return; }
      if (vault) { const cur = vault.find(d.id); if (cur) state = cur.sha256 === d.sha256 ? "same" : "conflict"; }
      res.docs.push({ id: d.id, name: d.name, size: d.size, state });
    });
    if (m.ocrLibrary) (m.ocrLibrary.files || []).forEach((f) => {
      const e = zip.byName[f.path || ""]; if (!e || !/^ocr_library\/(library\.jsonl|layouts\.jsonl|images\/[0-9a-f]{2}\/[0-9a-f]{64}\.png)$/.test(f.path)) { res.problems.push("Thư viện mẫu OCR: thiếu/sai tên file " + f.path); return; }
      try { if (zip.sha256Of(e) !== f.sha256) throw new Error("sai SHA-256"); } catch (x) { res.problems.push("Thư viện mẫu OCR " + f.path + ": " + x.message); }
    });
    res.ocrSamples = m.ocrLibrary ? m.ocrLibrary.samples : 0;
    try{
      const refs=JSON.parse(res.dataText||'{}')._yearArchives||[], files=m.yearArchives||[];
      if(files.length!==refs.length)throw Error('Danh sách hồ sơ năm không đầy đủ');
      for(const ref of refs){const Y=require('./year-archive');if(!Y.validFile(ref.file))throw Error('Tên hồ sơ năm không hợp lệ');const f=files.find(x=>x.path==='year_archives/'+ref.file&&x.sha256===ref.sha256);if(!f||!zip.byName[f.path])throw Error('Thiếu hồ sơ năm');const b=zip.readBuffer(zip.byName[f.path]);if(sha(b)!==f.sha256||b.length!==f.size)throw Error('Hồ sơ năm sai SHA256');if(Y.decode(b).year!==ref.year)throw Error('Năm hồ sơ không khớp');}
    }catch(e){res.problems.push('Kho hồ sơ năm: '+e.message);}
    if (m.sqliteSnapshot && res.dataText) { // bản chụp SQLite TÙY CHỌN: sai gì cũng chỉ là cảnh báo (bỏ bản chụp, dùng data.json), không làm gói mất hợp lệ
      const sn = m.sqliteSnapshot, bad = (why) => { res.sqlite = { ok: false, error: why }; res.warnings.push("Bỏ bản chụp SQLite trong gói (" + why + "): khôi phục dùng data.json."); };
      try {
        const e = zip.byName[sn.path || ""], rows = rowsOf(JSON.parse(res.dataText));
        if (sn.path !== SNAPSHOT_PATH || !e) bad("thiếu mục " + SNAPSHOT_PATH);
        else if (!(Number(sn.schema) <= SNAPSHOT_SCHEMA_MAX)) bad("schema v" + sn.schema + " mới hơn app này (v" + SNAPSHOT_SCHEMA_MAX + ")");
        else if (sn.records !== rows) bad("lệch data.json: bản chụp ghi " + sn.records + " dòng, data.json có " + rows + " dòng");
        else if (e.size !== sn.size || zip.sha256Of(e) !== sn.sha256) bad("sai SHA-256 hoặc kích thước");
        else res.sqlite = { ok: true, path: sn.path, size: sn.size, schema: sn.schema, records: sn.records, rev: sn.rev, createdAt: sn.createdAt };
      } catch (e) { bad(String(e && e.message || e)); }
    }
    res.ok = res.problems.length === 0 && !!res.dataText;
    return res;
  } finally { zip.close(); }
}

// ---- đọc nội dung gói qua "reader": trực tiếp từ ZIP hoặc từ thư mục staging đã giải nén & kiểm tra ----
function zipReader(zip) { return { has: (n) => !!zip.byName[n], buf: (n, max) => zip.readBuffer(zip.byName[n], max) }; }
function dirReader(dir) {
  const root = path.resolve(dir), real = fs.realpathSync(root);
  const abs = (n) => { const p = path.resolve(root, n); if (p !== root && !p.startsWith(root + path.sep)) throw new Error("Đường dẫn ngoài thư mục staging: " + n); const rp = fs.realpathSync(p); if (rp !== real && !rp.startsWith(real + path.sep)) throw new Error("Liên kết/junction trỏ ra ngoài staging: " + n); return p; };
  return { has: (n) => { try { return fs.lstatSync(abs(n)).isFile(); } catch (e) { return false; } }, buf: (n, max) => { const p = abs(n), st = fs.lstatSync(p); if (!st.isFile()) throw new Error("Không phải file thường: " + n); if (st.size > (max || 1 << 30)) throw new Error("Mục quá lớn: " + n); return fs.readFileSync(p); } };
}
/** Thêm chứng từ từ gói vào kho (đã qua inspect/staging). Không ghi đè. opts.restoreId đánh dấu để hoàn tác đúng các chứng từ vừa thêm.
 *  → { added, same, conflict[], failed[], addedIds[] } */
function importDocumentsFrom(rd, vault, opts) {
  const out = { added: 0, same: 0, conflict: [], failed: [], addedIds: [] };
  const m = JSON.parse(rd.buf("manifest.json", 8 * 1048576).toString("utf8"));
  (m.documents || []).forEach((d) => {
    try {
      const meta = JSON.parse(rd.buf("documents/" + d.id + ".json", 1048576).toString("utf8"));
      if (meta.id !== d.id || meta.sha256 !== d.sha256) throw new Error("siêu dữ liệu không khớp manifest");
      if (opts && opts.restoreId) meta.restoreId = opts.restoreId;
      const r = vault.importDoc(meta, rd.buf(d.path, 256 * 1048576));
      if (!r.ok) out.failed.push(d.id + ": " + r.error); else if (r.status === "added") { out.added++; out.addedIds.push(d.id); } else if (r.status === "same") out.same++; else out.conflict.push(d.id);
    } catch (e) { out.failed.push(d.id + ": " + (e.message || e)); }
  });
  return out;
}
function importDocuments(file, vault, opts) { const zip = Z.openZip(file); try { return importDocumentsFrom(zipReader(zip), vault, opts); } finally { zip.close(); } }
/** Khôi phục thư viện mẫu OCR (đã qua inspect/staging). Thư viện đích rỗng → chép nguyên; không rỗng → chỉ THÊM mẫu/sự kiện chưa có (không ghi đè).
 *  → { addedSamples, addedEdits, images, newImages[], addedLayouts } */
function importOcrLibraryFrom(rd, store) {
  const out = { addedSamples: 0, addedEdits: 0, images: 0, newImages: [], addedLayouts: 0 };
  if (rd.has("ocr_library/layouts.jsonl")) {
    const have = new Set(store.layouts().map((x) => x.id));
    rd.buf("ocr_library/layouts.jsonl", 64 * 1048576).toString("utf8").split("\n").forEach((ln) => { if (!ln.trim()) return; let r; try { r = JSON.parse(ln); } catch (e) { return; } if (r.t === "layout" && !have.has(r.id)) { store.addLayoutRecord(r); out.addedLayouts++; } });
  }
  if (!rd.has("ocr_library/library.jsonl")) return out;
  store.load(); const have = new Set(store.lib.list().map((x) => x.id)), haveEd = new Set(store.lib.edits().map((x) => x.id)), newIds = new Set();
  const text = rd.buf("ocr_library/library.jsonl", 1024 * 1048576).toString("utf8"), recs = [];
  text.split("\n").forEach((ln) => { if (!ln.trim()) return; let r; try { r = JSON.parse(ln); } catch (e) { return; }
    if (r.t === "sample") { if (have.has(r.id)) return; newIds.add(r.id); recs.push(r); out.addedSamples++; }
    else if (r.t === "edit") { if (haveEd.has(r.id)) return; recs.push(r); out.addedEdits++; }
    else if (r.t === "status" || r.t === "relabel") { if (newIds.has(r.id)) recs.push(r); }
    else if (r.t === "assign" || r.t === "unassign") { if (newIds.has(r.sampleId)) recs.push(r); }
    else if (r.t === "refs") recs.push(r); });
  recs.forEach((r) => { if (r.t !== "sample") return; const n = "ocr_library/" + r.png; if (rd.has(n) && !store.readImage(r.pngSha)) { store.putImage(r.pngSha, rd.buf(n, 64 * 1048576)); out.images++; out.newImages.push(r.pngSha); } });
  store.restoreRecords(recs);
  return out;
}
function importOcrLibrary(file, store) { const zip = Z.openZip(file); try { return importOcrLibraryFrom(zipReader(zip), store); } finally { zip.close(); } }
/** Giải nén bản chụp SQLite trong gói ra `dest` (chưa tồn tại) sau khi gói và bản chụp qua kiểm tra. → { ok, records, schema, rows } | { ok:false, error } */
function extractSqliteSnapshot(pkg, dest) {
  let rep; try { rep = inspect(pkg); } catch (e) { return { ok: false, error: "Không đọc được gói: " + (e.message || e) }; }
  if (!rep.ok) return { ok: false, error: "Gói không đạt kiểm tra: " + rep.problems.join("; ") };
  if (!rep.manifest.sqliteSnapshot) return { ok: false, error: "Gói này không có bản chụp SQLite (gói tạo bằng bản cũ hoặc tạo bản chụp không thành) — khôi phục bằng data.json qua Khôi phục Full Backup." };
  if (!rep.sqlite || !rep.sqlite.ok) return { ok: false, error: (rep.sqlite && rep.sqlite.error) || "bản chụp không dùng được" };
  const zip = Z.openZip(pkg);
  try {
    zip.extractTo(zip.byName[SNAPSHOT_PATH], dest);
    if (shaFile(dest) !== rep.manifest.sqliteSnapshot.sha256) { try { fs.rmSync(dest, { force: true }); } catch (e) { /* bỏ qua */ } return { ok: false, error: "Sau giải nén bản chụp sai SHA-256" }; }
    return { ok: true, records: rep.sqlite.records, schema: rep.sqlite.schema, rows: rep.sqlite.records };
  } catch (e) { try { fs.rmSync(dest, { force: true }); } catch (e2) { /* bỏ qua */ } return { ok: false, error: "Không giải nén được bản chụp: " + (e.message || e) }; }
  finally { zip.close(); }
}
// ===== 012-B1 (issue #113): GÓI KỲ LƯƠNG — LuongHAK_Ky_YYYY-MM_<ngày-giờ>.zip = manifest.json + data.json; có mật khẩu → .hakenc (backup-crypt, như Full Backup) =====
// Gói CHỈ gồm: phát sinh của kỳ + toàn bộ nhân sự/danh mục (core/repository.js period.slice); KHÔNG có nhật ký/người dùng/bảo mật/cấp phát. Kiểm gói chặt trước khi trả dữ liệu.
const KY_RE_PKG = /^\d{4}-(0[1-9]|1[0-2])$/, shaBuf = (b) => crypto.createHash("sha256").update(b).digest("hex");
const canonOf = (v) => require("../core/repository.js").period.canon(v);
async function createPeriodPackage(o) {
  const fail = (error) => ({ ok: false, error }), BC = require("./backup-crypt"), os = require("os"), now = o.now || (() => new Date());
  const ky = String(o.ky || ""); if (!KY_RE_PKG.test(ky)) return fail("Kỳ '" + ky + "' không hợp lệ (cần YYYY-MM).");
  if (!o.dir || typeof o.dir !== "string") return fail("Chưa có thư mục để ghi gói kỳ lương.");
  if (!o.data || typeof o.data !== "object") return fail("Chưa có dữ liệu để sao lưu.");
  const pw = o.password ? String(o.password) : ""; if (pw) { const bad = BC.checkPassword(pw); if (bad) return fail(bad); }
  const sl = require("../core/repository.js").period.slice(o.data, ky), payload = { ky, period: sl.period, global: sl.global, refOnly: sl.refOnly };
  const dataBuf = Buffer.from(JSON.stringify(payload), "utf8"), soDong = {}, sha256 = {};
  ["period", "global"].forEach((g) => Object.keys(payload[g]).forEach((t) => { soDong[g + "." + t] = payload[g][t].length; sha256[g + "." + t] = shaBuf(Buffer.from(canonOf(payload[g][t]), "utf8")); }));
  const d = now(), p2 = (x) => String(x).padStart(2, "0"), stamp = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + "_" + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
  const manifest = { loai: "ky", dinhDang: 1, ky, phienBanApp: String(o.appVersion || ""), tao: d.toISOString(), taoBoi: String(o.user || ""), soDong, sha256, shaTong: shaBuf(dataBuf), data: { path: "data.json", size: dataBuf.length } };
  let work = null, w = null;
  try {
    fs.mkdirSync(o.dir, { recursive: true });
    const ext = pw ? ".hakenc" : ".zip"; let name = "LuongHAK_Ky_" + ky + "_" + stamp + ext, i = 2; while (fs.existsSync(path.join(o.dir, name))) name = "LuongHAK_Ky_" + ky + "_" + stamp + "-" + (i++) + ext;
    const final = path.join(o.dir, name);
    if (pw) work = fs.mkdtempSync(path.join(os.tmpdir(), "hak-kypkg-")); // bản .zip CHƯA mã hóa không bao giờ nằm trong thư mục đích
    const zipTmp = pw ? path.join(work, "g.zip") : final + ".tmp";
    w = Z.createWriter(zipTmp, { now }); w.addBuffer("manifest.json", Buffer.from(JSON.stringify(manifest, null, 1), "utf8")); w.addBuffer("data.json", dataBuf); w.finish(); w = null;
    if (pw) { const e = await BC.encryptFile(zipTmp, final, pw); if (!e.ok) return fail("Không mã hóa được gói: " + (e.error || "lỗi không rõ")); }
    else fs.renameSync(zipTmp, final);
    return { ok: true, name, dir: o.dir, file: final, size: fs.statSync(final).size, sha256: shaFile(final), encrypted: !!pw, ky, soDong };
  } catch (e) { try { if (w) w.abort(); } catch (e2) { /* đã đóng */ } try { fs.rmSync(path.join(o.dir, "LuongHAK_Ky_" + ky + "_" + stamp + ".zip.tmp"), { force: true }); } catch (e3) { /* chưa tạo */ } return fail("Không tạo được gói kỳ lương: " + (e.message || e)); }
  finally { if (work) try { fs.rmSync(work, { recursive: true, force: true }); } catch (e) { /* dọn tạm */ } }
}
/** Kiểm gói kỳ lương (chỉ đọc). Hợp lệ → { ok, manifest, payload }; không → { ok:false, error[, needPassword|wrongPassword] } và KHÔNG có payload. */
async function inspectPeriodPackage(file, password) {
  const bad = (error, x) => Object.assign({ ok: false, error }, x || {}), BC = require("./backup-crypt"), os = require("os");
  if (!file || !fs.existsSync(file)) return bad("Không thấy tệp gói kỳ lương.");
  let work = null, zip = null;
  try {
    let zf = file;
    if (BC.isEnc(file)) {
      if (!password) return bad("Gói được mã hóa — cần nhập mật khẩu.", { needPassword: true });
      work = fs.mkdtempSync(path.join(os.tmpdir(), "hak-kypkg-")); zf = path.join(work, "g.zip");
      const de = await BC.decryptFile(file, zf, String(password)); if (!de.ok) return bad(de.code === "AUTH" ? "Sai mật khẩu hoặc gói đã bị sửa." : (de.error || "Không giải mã được gói."), { wrongPassword: de.code === "AUTH" });
    }
    try { zip = Z.openZip(zf); } catch (e) { return bad("Không phải gói kỳ lương hợp lệ: " + e.message); }
    const me = zip.byName["manifest.json"], de2 = zip.byName["data.json"]; if (!me || !de2) return bad("Thiếu manifest.json hoặc data.json — không phải gói kỳ lương của app.");
    let m; try { m = JSON.parse(zip.readBuffer(me, 8 * 1048576).toString("utf8")); } catch (e) { return bad("manifest.json hỏng: " + e.message); }
    if (!m || m.loai !== "ky" || !KY_RE_PKG.test(String(m.ky || "")) || !m.sha256 || !m.soDong || !m.shaTong) return bad("Không phải gói kỳ lương (thiếu loại/kỳ/SHA-256/số dòng).");
    let buf; try { buf = zip.readBuffer(de2); } catch (e) { return bad("data.json không giải nén được — gói hỏng hoặc bị sửa: " + e.message); }
    if (shaBuf(buf) !== m.shaTong || (m.data && m.data.size != null && buf.length !== m.data.size)) return bad("data.json sai SHA-256 — gói bị hỏng hoặc bị sửa.");
    let payload; try { payload = JSON.parse(buf.toString("utf8")); } catch (e) { return bad("data.json hỏng: " + e.message); }
    if (!payload || payload.ky !== m.ky || !payload.period || !payload.global) return bad("Kỳ trong data.json không khớp manifest hoặc thiếu cấu trúc.");
    const probs = [];
    ["period", "global"].forEach((g) => Object.keys(payload[g]).forEach((t) => {
      const k = g + "." + t, rows = payload[g][t]; if (!Array.isArray(rows)) { probs.push(k + ": không phải danh sách"); return; }
      if (m.soDong[k] !== rows.length) probs.push(k + ": số dòng " + rows.length + " ≠ manifest " + m.soDong[k]); else if (m.sha256[k] !== shaBuf(Buffer.from(canonOf(rows), "utf8"))) probs.push(k + ": sai SHA-256");
    }));
    Object.keys(m.soDong).forEach((k) => { const [g, t] = k.split("."); if (!payload[g] || !(t in payload[g])) probs.push(k + ": manifest có nhưng data.json thiếu"); });
    if (probs.length) return bad("Gói kỳ lương không khớp manifest: " + probs.slice(0, 5).join("; "));
    return { ok: true, manifest: m, payload, encrypted: BC.isEnc(file) };
  } catch (e) { return bad("Không kiểm được gói: " + (e.message || e)); }
  finally { if (zip) try { zip.close(); } catch (e) { /* đã đóng */ } if (work) try { fs.rmSync(work, { recursive: true, force: true }); } catch (e) { /* dọn tạm */ } }
}
/** Chép tệp an toàn: ghi .tmp -> fsync -> đối chiếu SHA-256 -> rename -> dọn .tmp nếu lỗi. */
function copyFileDurable(src, dest, opts) {
  const f = (opts && opts.fsImpl) || fs;
  const tmp = dest + ".tmp";
  f.mkdirSync(path.dirname(dest), { recursive: true });
  try { f.rmSync(tmp, { force: true }); } catch (e) { /* bỏ qua */ }
  try {
    f.copyFileSync(src, tmp);
    const fd = f.openSync(tmp, "r+");
    try { f.fsyncSync(fd); } finally { f.closeSync(fd); }
    const wantSha = (opts && opts.expectedSha256) || shaFileWith(f, src);
    const gotSha = shaFileWith(f, tmp);
    if (gotSha !== wantSha) throw new Error("Bản sao dự phòng sai SHA-256 (" + gotSha.slice(0, 12) + " ≠ " + wantSha.slice(0, 12) + ")");
    f.renameSync(tmp, dest);
  } catch (err) {
    try { f.rmSync(tmp, { force: true }); } catch (e) { /* bỏ qua */ }
    throw err;
  }
}
/** Chép gói Full Backup (và .sha256 nếu có) sang <mirrorDir>/FullBackup an toàn, dọn .tmp mồ côi. */
function mirrorFullBackup(srcFile, mirrorDir, opts) {
  const f = (opts && opts.fsImpl) || fs;
  const targetDir = path.join(mirrorDir, "FullBackup");
  f.mkdirSync(targetDir, { recursive: true });
  for (const entry of f.readdirSync(targetDir)) {
    if (/\.tmp$/i.test(entry)) {
      try { f.rmSync(path.join(targetDir, entry), { force: true }); } catch (e) { /* bỏ qua */ }
    }
  }
  const destPkg = path.join(targetDir, path.basename(srcFile));
  copyFileDurable(srcFile, destPkg, { expectedSha256: opts && opts.expectedSha256, fsImpl: f });
  const srcSha = (opts && opts.sha256File) || (srcFile + ".sha256");
  if (f.existsSync(srcSha)) copyFileDurable(srcSha, destPkg + ".sha256", { fsImpl: f });
  return targetDir;
}
module.exports = { createPeriodPackage, inspectPeriodPackage, copyFileDurable, mirrorFullBackup, STATUS: ST, create, inspect, extractSqliteSnapshot, SNAPSHOT_PATH, SNAPSHOT_SCHEMA_MAX, importDocuments, importOcrLibrary, importDocumentsFrom, importOcrLibraryFrom, zipReader, dirReader, FORMAT, VERSION };
