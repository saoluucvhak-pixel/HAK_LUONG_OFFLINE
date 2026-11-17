// Chuyển data.json → kho SQLite ỨNG VIÊN trên MỘT BẢN SAO, kiểm tra rồi mới công nhận; xuất ngược ra JSON để quay lui/đối chiếu.
// File JSON nguồn CHỈ ĐƯỢC ĐỌC (có kiểm SHA-256 trước/sau). Không đổi con trỏ nguồn hoạt động: việc đó thuộc bước cutover riêng.
"use strict";
const fs = require("node:fs"), crypto = require("node:crypto");
const store = require("./sqlite-store.js");
const importer = require("../core/importer.js");

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const NIL = "∅"; // phân biệt "không có giá trị" với chuỗi rỗng khi dựng khóa nghiệp vụ (tránh composite UNIQUE với NULL)

/** Khóa nghiệp vụ chuẩn hóa của một dòng (theo KEYS của importer) hoặc null nếu bảng không có khóa. Thành phần rỗng ghi rõ, không để NULL. */
function businessKey(table, row) {
  try { const k = importer.keyOf(table, row); return k == null ? null : String(k).replace(/\u0000/g, NIL); } catch (e) { return null; }
}

/** Số nguyên ngoài miền an toàn của JS (±2^53−1) không được trao đổi âm thầm: trả danh sách vị trí vi phạm. */
function unsafeNumbers(value, where, out) {
  if (typeof value === "number") { if (Number.isInteger(value) && !Number.isSafeInteger(value)) out.push(where); }
  else if (Array.isArray(value)) value.forEach((v, i) => unsafeNumbers(v, where + "[" + i + "]", out));
  else if (value && typeof value === "object") Object.keys(value).forEach((k) => unsafeNumbers(value[k], where + "." + k, out));
  return out;
}

/** Id nội bộ ổn định: dùng _id sẵn có nếu có; nếu không dùng băm nội dung + số thứ tự lần xuất hiện (trùng y hệt vẫn có id riêng, không bị gộp). */
function idsFor(table, rows) {
  const seen = new Map(), used = new Set();
  return rows.map((row) => {
    let id = row && typeof row === "object" && row._id != null && String(row._id) !== "" ? String(row._id) : null;
    if (id && used.has(id)) id = null; // _id trùng: cấp id băm, không làm mất dòng
    if (!id) {
      const h = sha256(table + "\u0000" + JSON.stringify(row)).slice(0, 16), n = (seen.get(h) || 0) + 1;
      seen.set(h, n); id = "m-" + h + (n > 1 ? "-" + n : "");
    }
    used.add(id); return id;
  });
}

function readSource(file) {
  const bytes = fs.readFileSync(file), text = bytes.toString("utf8");
  let data; try { data = JSON.parse(text); } catch (e) { throw new Error("File nguồn không phải JSON hợp lệ: " + e.message); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Dữ liệu nguồn phải là đối tượng gồm các bảng");
  return { bytes, sha: sha256(bytes), data };
}

function tableChecksums(data) {
  const out = {}; Object.keys(data).forEach((k) => { out[k] = sha256(JSON.stringify(data[k])); }); return out;
}

/** Dựng lại đối tượng dữ liệu từ kho (đúng thứ tự khóa và thứ tự dòng của nguồn). */
function toData(db) {
  const out = {};
  db.prepare("SELECT key, kind, json FROM top_value ORDER BY pos").all().forEach((t) => { out[t.key] = t.kind === "array" ? [] : JSON.parse(t.json); });
  const rows = db.prepare("SELECT tbl, json FROM records ORDER BY tbl, pos").all();
  rows.forEach((r) => { (out[r.tbl] = out[r.tbl] || []).push(JSON.parse(r.json)); });
  return out;
}

/**
 * Chuyển nguồn → ứng viên. Trả báo cáo { state, sourceSha256, tables:{ten:{rows,checksum}}, duplicates, unsafe, alreadyDone }.
 * - Ứng viên đã hoàn thành cùng nguồn → alreadyDone (chạy lại không nhân bản). Khác nguồn → từ chối, không ghi đè.
 * - Ghi vào file tạm, kiểm tra xong mới đổi tên; lỗi/ngắt giữa chừng không để lại ứng viên dở.
 */
function migrate(sourceFile, candidateFile) {
  const src = readSource(sourceFile), report = { state: "started", sourceSha256: src.sha, tables: {}, duplicates: [], unsafe: [], alreadyDone: false };
  const tmp = candidateFile + ".tmp";
  if (fs.existsSync(candidateFile)) {
    const db = store.open(candidateFile, { readonly: true });
    try {
      const j = db.prepare("SELECT state, source_sha256 FROM migration_journal ORDER BY id DESC LIMIT 1").get();
      if (j && j.state === "ready" && j.source_sha256 === src.sha) { report.state = "ready"; report.alreadyDone = true; return report; }
      throw new Error("Đã có ứng viên khác nguồn hoặc chưa hoàn tất: không ghi đè (" + candidateFile + ").");
    } finally { db.close(); }
  }
  Object.keys(src.data).forEach((k) => { if (Array.isArray(src.data[k])) src.data[k].forEach((r, i) => unsafeNumbers(r, k + "[" + i + "]", report.unsafe)); else unsafeNumbers(src.data[k], k, report.unsafe); });
  if (report.unsafe.length) { report.state = "blocked"; throw Object.assign(new Error("Có " + report.unsafe.length + " số nguyên vượt miền an toàn của JavaScript (ví dụ " + report.unsafe[0] + "): không chuyển âm thầm."), { report }); }
  for (const f of [tmp, tmp + "-wal", tmp + "-shm"]) if (fs.existsSync(f)) fs.rmSync(f);
  const db = store.open(tmp);
  try {
    store.migrate(db);
    const jr = db.prepare("INSERT INTO migration_journal (state, source_sha256, detail, at) VALUES (?, ?, ?, ?)");
    jr.run("started", src.sha, "", new Date().toISOString());
    store.tx(db, () => {
      const putTop = db.prepare("INSERT INTO top_value (pos, key, kind, json) VALUES (?, ?, ?, ?)"), putRow = db.prepare("INSERT INTO records (tbl, id, pos, bkey, json) VALUES (?, ?, ?, ?, ?)");
      Object.keys(src.data).forEach((key, pos) => {
        const value = src.data[key];
        if (Array.isArray(value)) {
          putTop.run(pos, key, "array", null);
          const ids = idsFor(key, value), keys = new Map();
          value.forEach((row, i) => {
            const bk = row && typeof row === "object" ? businessKey(key, row) : null;
            if (bk != null) { if (keys.has(bk)) report.duplicates.push({ table: key, key: bk, ids: [keys.get(bk), ids[i]] }); else keys.set(bk, ids[i]); }
            putRow.run(key, ids[i], i, bk, JSON.stringify(row));
          });
          report.tables[key] = { rows: value.length };
        } else putTop.run(pos, key, value === null ? "null" : typeof value, JSON.stringify(value));
      });
      jr.run("copied", src.sha, JSON.stringify({ tables: Object.keys(report.tables).length }), new Date().toISOString());
    });
    const check = verify(db, src);
    if (!check.ok) throw Object.assign(new Error("Ứng viên không đạt kiểm tra: " + check.problems.join("; ")), { report: Object.assign(report, { state: "failed", problems: check.problems }) });
    Object.assign(report, { state: "ready" }); Object.keys(report.tables).forEach((k) => { report.tables[k].checksum = check.checksums[k]; });
    jr.run("ready", src.sha, JSON.stringify({ duplicates: report.duplicates.length }), new Date().toISOString());
    store.close(db);
  } catch (e) {
    try { db.close(); } catch (e2) { /* đã đóng */ }
    for (const f of [tmp, tmp + "-wal", tmp + "-shm"]) if (fs.existsSync(f)) fs.rmSync(f);
    throw e;
  }
  const after = sha256(fs.readFileSync(sourceFile));
  if (after !== src.sha) { fs.rmSync(tmp); throw new Error("File nguồn thay đổi trong lúc chuyển: hủy ứng viên."); }
  fs.renameSync(tmp, candidateFile);
  return report;
}

/**
 * Kiểm tra ứng viên so với nguồn: integrity_check, foreign_key_check, đếm dòng, SHA-256 từng bảng,
 * và dựng lại TOÀN BỘ dữ liệu phải giống nguồn từng ký tự (thứ tự khóa, thứ tự dòng, số 0 đầu, Unicode, null).
 */
function verify(db, src) {
  const problems = [], integrity = db.prepare("PRAGMA integrity_check").all().map((r) => Object.values(r)[0]);
  if (integrity.length !== 1 || integrity[0] !== "ok") problems.push("integrity_check: " + integrity.join(","));
  const fk = db.prepare("PRAGMA foreign_key_check").all(); if (fk.length) problems.push("foreign_key_check: " + fk.length + " dòng lỗi");
  const back = toData(db), a = JSON.stringify(src.data), b = JSON.stringify(back);
  if (a !== b) {
    const keys = new Set(Object.keys(src.data).concat(Object.keys(back)));
    keys.forEach((k) => { if (JSON.stringify(src.data[k]) !== JSON.stringify(back[k])) problems.push("bảng/khóa '" + k + "' khác nguồn (nguồn " + (Array.isArray(src.data[k]) ? src.data[k].length : "?") + " dòng, kho " + (Array.isArray(back[k]) ? back[k].length : "?") + ")"); });
    if (!problems.length) problems.push("thứ tự khóa cấp ngoài cùng khác nguồn");
  }
  return { ok: problems.length === 0, problems, checksums: tableChecksums(back) };
}

/** Mở ứng viên và đối chiếu với file nguồn (không ghi gì). */
function verifyFiles(candidateFile, sourceFile) {
  const db = store.open(candidateFile, { readonly: true });
  try { return verify(db, readSource(sourceFile)); } finally { db.close(); }
}

/** Xuất kho ra JSON — đường QUAY LUI/đối chiếu: cho cùng nội dung như nguồn khi chưa có ghi mới, và gồm cả ghi mới khi đã có. Ghi file tạm rồi đổi tên. */
function exportJson(candidateFile, outFile) {
  const db = store.open(candidateFile, { readonly: true });
  try {
    const text = JSON.stringify(toData(db)), tmp = outFile + ".tmp";
    fs.writeFileSync(tmp, text); fs.renameSync(tmp, outFile);
    return { bytes: Buffer.byteLength(text), sha256: sha256(text) };
  } finally { db.close(); }
}

module.exports = { migrate, verify, verifyFiles, exportJson, toData, readSource, sha256, businessKey, idsFor };
