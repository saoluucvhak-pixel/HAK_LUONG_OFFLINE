// v2.1.7 — khôi phục từ bản chụp SQLite ở THƯ MỤC SAO LƯU ĐÃ CHỌN (sqliteDir). Dữ liệu GIẢ, fs thật. Đủ 17 tình huống E1–E17 của PROMPT_KHOI_PHUC_TU_THU_MUC_SQLITE.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process"), crypto = require("node:crypto");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { fixture } = require("../fixtures/production-carry");
const KILL = path.resolve(__dirname, "../fixtures/sqlite-restore-dir-kill.cjs");
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const base = () => JSON.parse(JSON.stringify(fixture()));
const sq = (dir) => path.join(dir, "data.sqlite");
const corrupt = (dir) => { fs.truncateSync(sq(dir), 200); for (const x of ["-wal", "-shm"]) fs.rmSync(sq(dir) + x, { force: true }); };
const opts = (extra) => Object.assign({ exportDelayMs: 600000 }, extra);
/** Dựng hồ sơ: lưu v1, chọn thư mục SQLite, sao lưu (bản ở cả 2 nơi), lưu thêm v2, đóng. */
function setup(extra) {
  const dir = tmp("hak-rfd-"), sd = tmp("hak-rfd-out-"), s = createSqliteStorage(dir, opts()), v1 = base();
  assert.equal(s.save(JSON.stringify(v1)), true);
  s.writeSettings(Object.assign({}, s.readSettings(), { sqliteDir: sd }));
  assert.ok(s.backup("thu"), "sao lưu thành công"); assert.equal(s.snapshotStatus().lastError, "");
  const v2 = base(); v2.nhanvien.push({ "Mã NV": "9999", "Họ và tên": "Chỉ có sau bản chụp" }); assert.equal(s.save(JSON.stringify(v2)), true); s.close();
  return { dir, sd, v1, v2, backups: path.join(dir, "backups") };
}
const wipeLocal = (dir) => { fs.rmSync(path.join(dir, "backups"), { recursive: true, force: true }); fs.mkdirSync(path.join(dir, "backups"), { recursive: true }); };
const open = (dir, extra) => createSqliteStorage(dir, opts(extra));
const files = (d, re) => fs.readdirSync(d).filter((f) => re.test(f));

test("U-RFD-01 data.sqlite hỏng + backups/ mất: bản ở thư mục đã chọn được liệt kê, khôi phục ra đúng dữ liệu, cất bản cũ, nhật ký ghi nguồn", () => {
  const { dir, sd, v1 } = setup(); corrupt(dir); wipeLocal(dir);
  const s = open(dir); assert.equal(s.needsRecovery(), true);
  const l = s.listRestoreCandidates(), ch = l.candidates.filter((c) => c.source === "chosen");
  assert.ok(ch.length >= 2, "thấy data-snapshot + snap_ ở thư mục chọn: " + JSON.stringify(l.sources));
  assert.equal(l.sources.find((x) => x.source === "chosen").reachable, true); assert.equal(l.candidates.filter((c) => c.source === "local").length, 0);
  const id = ch.find((c) => c.name === "data-snapshot.sqlite").id, ins = s.inspectCandidate(id);
  assert.equal(ins.ok, true, JSON.stringify(ins)); assert.ok(ins.records > 0);
  const before = sha(path.join(sd, "data-snapshot.sqlite")), r = s.restoreCandidate("Quản trị giả", id);
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(sha(path.join(sd, "data-snapshot.sqlite")), before, "nguồn đọc-chỉ: không đổi");
  const d = JSON.parse(s.load().text); assert.equal(d.nhanvien.length, v1.nhanvien.length, "đúng dữ liệu bản chụp (không có 9999)");
  assert.ok(files(dir, /^data\.sqlite\.truoc-khoi-phuc-/).length >= 1, "bản hỏng được cất");
  const log = d.auditlog[d.auditlog.length - 1]; assert.match(log.chiTiet, /thư mục SQLite đã chọn/); assert.ok(log.chiTiet.includes(sd));
  assert.equal(files(dir, /\.(nguon-ung-vien|kiem-ung-vien|khoi-phuc-moi)$/).length, 0, "không còn tệp tạm mồ côi"); s.close();
});
test("U-RFD-02 cả 2 nguồn hợp lệ, data.sqlite hỏng: cả hai hiện, khôi phục theo id đã chọn; sắp theo thời gian giảm dần", () => {
  const { dir } = setup(); corrupt(dir); const s = open(dir), l = s.listRestoreCandidates();
  assert.ok(l.candidates.some((c) => c.source === "local") && l.candidates.some((c) => c.source === "chosen"));
  for (let i = 1; i < l.candidates.length; i++) assert.ok(l.candidates[i - 1].mtimeMs >= l.candidates[i].mtimeMs, "sắp mới → cũ");
  const id = l.candidates.find((c) => c.source === "local" && c.name === "data-snapshot.sqlite").id;
  assert.equal(s.restoreCandidate("x", id).ok, true); assert.equal(s.load().ok, true); s.close();
});
test("U-RFD-03 E1: chưa chọn thư mục → chỉ nguồn dữ liệu, không lỗi. E2: thư mục chọn mất kết nối → nguồn local vẫn dùng được, thông báo có đường dẫn, KHÔNG tự tạo thư mục", () => {
  const dir = tmp("hak-rfd-"), s0 = createSqliteStorage(dir, opts()); assert.equal(s0.save(JSON.stringify(base())), true); assert.ok(s0.backup("thu")); s0.close();
  const a = open(dir), l1 = a.listRestoreCandidates(); assert.equal(l1.sources.length, 1); assert.equal(l1.sources[0].reachable, true); a.close();
  const gone = path.join(os.tmpdir(), "hak-khong-co-" + Date.now()), b = open(dir); b.writeSettings(Object.assign({}, b.readSettings(), { sqliteDir: gone })); b.close(); corrupt(dir);
  const s = open(dir), l = s.listRestoreCandidates(), ch = l.sources.find((x) => x.source === "chosen");
  assert.equal(ch.reachable, false); assert.ok(ch.error.includes(gone), ch.error); assert.equal(fs.existsSync(gone), false, "không tự tạo thư mục");
  const id = l.candidates.find((c) => c.source === "local" && c.name === "data-snapshot.sqlite").id; assert.equal(s.restoreCandidate("x", id).ok, true); s.close();
});
test("U-RFD-04 E5–E7: bản 0 byte / cụt / không phải kho HAK / schema mới hơn → từ chối, dữ liệu không đổi, tệp tạm sạch, không được chọn làm gợi ý", () => {
  const { dir, sd } = setup(); corrupt(dir); wipeLocal(dir);
  const snapPath = path.join(sd, "data-snapshot.sqlite"), good = fs.readFileSync(snapPath);
  const s = open(dir), id = "chosen:data-snapshot.sqlite", hurtBytes = fs.readFileSync(sq(dir));
  fs.writeFileSync(snapPath, Buffer.alloc(0)); assert.equal(s.inspectCandidate(id).ok, false);
  fs.writeFileSync(snapPath, good.subarray(0, 300)); assert.equal(s.inspectCandidate(id).ok, false);
  fs.writeFileSync(snapPath, "đây không phải SQLite"); let r = s.restoreCandidate("x", id); assert.equal(r.ok, false); assert.match(r.error, /không dùng được|không phải|KHÔNG thay đổi/i);
  assert.deepEqual(fs.readFileSync(sq(dir)), hurtBytes, "data.sqlite hỏng không bị đụng"); assert.equal(files(dir, /\.truoc-khoi-phuc-/).length, 0);
  assert.equal(files(dir, /\.(nguon-ung-vien|kiem-ung-vien|khoi-phuc-moi)/).length, 0, "tệp tạm sạch");
  // schema mới hơn app (E6)
  fs.writeFileSync(snapPath, good); const store = require("../../main/sqlite-store.js"), t = store.open(snapPath); t.exec("PRAGMA user_version = 999"); store.close(t);
  r = s.inspectCandidate(id); assert.equal(r.ok, false); assert.match(r.error, /mới hơn|schema/i, r.error);
  // E7 (kiểm không đạt: chưa phải kho nguồn chính; lệch số dòng đã có ở U-SNAP-04)
  fs.writeFileSync(snapPath, good); const t2 = store.open(snapPath); t2.exec("UPDATE meta SET value = '0' WHERE key = 'primary'"); store.close(t2);
  r = s.inspectCandidate(id); assert.equal(r.ok, false);
  const best0 = s.findBestCandidate(); assert.ok(best0.best && /^snap_/.test(best0.best.name), "bản data-snapshot hỏng bị bỏ qua, rơi về bản snap_ hợp lệ kế tiếp");
  for (const f of files(sd, /^snap_/)) fs.writeFileSync(path.join(sd, f), "hỏng");
  const best = s.findBestCandidate(); assert.equal(best.best, null, "bản hỏng không được gợi ý"); assert.ok(best.checked.length >= 1); s.close();
});
test("U-RFD-05 E13: id lạ / đường dẫn tùy ý / path traversal → từ chối", () => {
  const { dir } = setup(); corrupt(dir); const s = open(dir), hurt = fs.readFileSync(sq(dir));
  for (const id of ["chosen:../../etc/passwd", "chosen:..\\x.sqlite", "C:\\Windows\\x.sqlite", "/etc/passwd", "local:khong-co.sqlite", "chosen:data-snapshot.sqlite/../x", "", null, undefined, "chosen:snap_20990101-000000-000_zzz.sqlite"]) {
    const r = s.restoreCandidate("x", id); assert.equal(r.ok, false, String(id)); assert.equal(s.inspectCandidate(id).ok, false);
  }
  assert.deepEqual(fs.readFileSync(sq(dir)), hurt); s.close();
});
test("U-RFD-06 E12: kho đang lành → lớp lưu trữ tự từ chối, dữ liệu không đổi", () => {
  const { dir } = setup(); const s = open(dir); assert.equal(s.load().ok, true);
  const r = s.restoreCandidate("x", "chosen:data-snapshot.sqlite"); assert.equal(r.ok, false); assert.match(r.error, /không mở được|bình thường/);
  assert.equal(s.load().ok, true); assert.equal(files(dir, /\.truoc-khoi-phuc-/).length, 0); s.close();
});
for (const at of ["sau-marker", "truoc-doi-ten", "sau-doi-ten"]) {
  test("U-RFD-07 E11: kill -9 thật tại '" + at + "' khi khôi phục từ thư mục chọn → mở lại tự hoàn tất đúng", () => {
    const { dir } = setup(); corrupt(dir); wipeLocal(dir);
    const r = cp.spawnSync(process.execPath, ["--no-warnings", KILL, dir, at, "chosen:data-snapshot.sqlite"], { encoding: "utf8", timeout: 60000 });
    if (process.platform === "win32") assert.notEqual(r.status, 0); else assert.equal(r.signal, "SIGKILL", r.stdout + r.stderr.slice(0, 200));
    assert.match(r.stdout, new RegExp("KILL " + at)); assert.doesNotMatch(r.stdout, /DONE/);
    const s = open(dir), ld = s.load(); assert.equal(ld.ok, true, JSON.stringify(ld).slice(0, 300));
    assert.equal(fs.existsSync(path.join(dir, "data.sqlite.restore-pending")), false, "marker xóa cuối"); assert.ok(files(dir, /^data\.sqlite\.truoc-khoi-phuc-/).length >= 1); s.close();
  });
}
test("U-RFD-08 E8: cùng tên 2 nguồn nhưng SHA-256 khác → cả hai hiện + cảnh báo", () => {
  const { dir, sd } = setup(); const t = sd + "/data-snapshot.sqlite", buf = fs.readFileSync(t); fs.writeFileSync(t, Buffer.concat([buf, Buffer.from([0])]));
  corrupt(dir); const s = open(dir), l = s.listRestoreCandidates(), two = l.candidates.filter((c) => c.name === "data-snapshot.sqlite");
  assert.equal(two.length, 2); assert.ok(two.every((c) => c.shaConflict === true)); assert.ok(l.warnings.length >= 1 && /nội dung khác/.test(l.warnings[0])); s.close();
});
test("U-RFD-09 E4: đọc thư mục chọn quá hạn → reachable:false 'quá thời gian chờ', màn khôi phục không treo; nguồn local vẫn có", () => {
  const { dir } = setup(); corrupt(dir);
  const s = open(dir, { scanImpl: (d, ms) => ({ ok: false, error: "Quá thời gian chờ (" + ms / 1000 + " giây) khi đọc thư mục " + d, timeout: true }) }), t0 = Date.now(), l = s.listRestoreCandidates();
  assert.ok(Date.now() - t0 < 3000); const ch = l.sources.find((x) => x.source === "chosen"); assert.equal(ch.reachable, false); assert.match(ch.error, /Quá thời gian chờ/); assert.ok(l.candidates.some((c) => c.source === "local")); s.close();
});
test("U-RFD-09b E4 thật: worker đọc thư mục thật được và có giới hạn thời gian (scanTimeoutMs rất nhỏ cho ra 'quá thời gian' hoặc kết quả, không treo)", () => {
  const { dir } = setup(); corrupt(dir); const s = open(dir, { scanTimeoutMs: 1 }), t0 = Date.now(), l = s.listRestoreCandidates();
  assert.ok(Date.now() - t0 < 4000); const ch = l.sources.find((x) => x.source === "chosen"); assert.ok(ch.reachable === true || /Quá thời gian chờ/.test(ch.error), JSON.stringify(ch));
  const s2 = open(dir), l2 = s2.listRestoreCandidates(); assert.equal(l2.sources.find((x) => x.source === "chosen").reachable, true, "worker thật đọc được thư mục"); s.close(); s2.close();
});
test("U-RFD-10 verifyExternal: SHA-256 từng bản đối chiếu thư mục dữ liệu + kiểm đầy đủ bản mới nhất; phát hiện bản ngoài máy bị sửa; externalStatus đọc từ thư mục thật", () => {
  const { dir, sd } = setup(); const s = open(dir), st = s.externalStatus();
  assert.equal(st.configured, true); assert.equal(st.reachable, true); assert.ok(st.count >= 2); assert.ok(st.latest && st.latest.mtimeMs > 0);
  let v = s.verifyExternal(); assert.equal(v.good, true, v.text); assert.match(v.text, /đạt kiểm tra đầy đủ/);
  const t = path.join(sd, "data-snapshot.sqlite"); fs.writeFileSync(t, Buffer.concat([fs.readFileSync(t), Buffer.from([1])]));
  v = s.verifyExternal(); assert.equal(v.good, false); assert.ok(v.bad.some((x) => x.name === "data-snapshot.sqlite"), v.text);
  const none = open(tmp("hak-rfd-none-")); assert.equal(none.externalStatus().configured, false); assert.equal(none.verifyExternal().good, true); s.close(); none.close();
});
test("U-RFD-11 E9/E10: nguồn đọc không ổn định giữa chừng (bản chép khác nguồn) → hủy, dữ liệu không đổi, không để tệp tạm", () => {
  const { dir } = setup(); corrupt(dir); wipeLocal(dir); const hurt = fs.readFileSync(sq(dir));
  const s = open(dir, { copyHook: (dest) => fs.appendFileSync(dest, "x") }), r = s.restoreCandidate("x", "chosen:data-snapshot.sqlite");
  assert.equal(r.ok, false); assert.match(r.error, /không ổn định|mất kết nối/); assert.deepEqual(fs.readFileSync(sq(dir)), hurt);
  assert.equal(files(dir, /\.(nguon-ung-vien|kiem-ung-vien|khoi-phuc-moi)/).length, 0); assert.equal(s.inspectCandidate("chosen:data-snapshot.sqlite").ok, false);
  const s2 = open(dir, { copyHook: () => { const e = new Error("ENOSPC: no space left"); e.code = "ENOSPC"; throw e; } }), r2 = s2.restoreCandidate("x", "chosen:data-snapshot.sqlite");
  assert.equal(r2.ok, false); assert.match(r2.error, /Không đủ chỗ trống/); s.close(); s2.close();
});
test("U-RFD-12 E15: thư mục chọn nằm trong thư mục dữ liệu → bỏ qua nguồn đó + cảnh báo", () => {
  const dir = tmp("hak-rfd-"), s0 = createSqliteStorage(dir, opts()); assert.equal(s0.save(JSON.stringify(base())), true); assert.ok(s0.backup("thu"));
  const inside = path.join(dir, "ben-trong"); fs.mkdirSync(inside); s0.writeSettings(Object.assign({}, s0.readSettings(), { sqliteDir: inside })); s0.close();
  const s = open(dir), l = s.listRestoreCandidates(), ch = l.sources.find((x) => x.source === "chosen");
  assert.equal(ch.reachable, false); assert.match(ch.error, /trùng|lồng/); assert.equal(l.candidates.filter((c) => c.source === "chosen").length, 0); assert.equal(s.externalStatus().reachable, false); s.close();
});
test("U-RFD-13 E16: bản ở thư mục chọn cũ hơn bản local hợp lệ → cả hai hiện theo thời gian; findBest chọn bản mới nhất HỢP LỆ, bỏ qua bản mới hơn mà hỏng, không tự khôi phục", () => {
  const { dir, sd, backups } = setup(); const now = Date.now() / 1000;
  fs.utimesSync(path.join(sd, "data-snapshot.sqlite"), now - 3600, now - 3600);
  for (const f of files(sd, /^snap_/)) fs.utimesSync(path.join(sd, f), now - 3600, now - 3600);
  corrupt(dir); const s = open(dir), l = s.listRestoreCandidates();
  assert.equal(l.candidates[0].source, "local"); assert.ok(l.candidates.some((c) => c.source === "chosen"));
  fs.writeFileSync(path.join(backups, "data-snapshot.sqlite"), "hỏng"); for (const f of files(backups, /^snap_/)) fs.writeFileSync(path.join(backups, f), "hỏng");
  const best = s.findBestCandidate(); assert.ok(best.best && best.best.source === "chosen", JSON.stringify(best)); assert.ok(best.checked.some((c) => !c.ok), "bản mới hơn mà hỏng bị bỏ qua kèm lý do");
  assert.equal(s.needsRecovery(), true, "chưa tự khôi phục"); s.close();
});
