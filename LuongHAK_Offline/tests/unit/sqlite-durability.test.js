// Test crash/độ bền còn thiếu (chỉ đạo 003, issue #91). Dữ liệu GIẢ. Kill -9 THẬT ở các kịch bản crash; kịch bản đĩa đầy dùng SQLITE_FULL THẬT của SQLite
// (PRAGMA max_page_count) nhưng việc "đĩa đầy" là MÔ PHỎNG (không làm đầy đĩa thật).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process"), crypto = require("node:crypto");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const store = require("../../main/sqlite-store.js");
const CLS = require("../../core/payroll-close.js");
const { fixture } = require("../fixtures/production-carry");
const CHILD = path.resolve(__dirname, "../fixtures/sqlite-durability-child.cjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-dur-"));
const opts = { exportDelayMs: 20 };
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const run = (mode, dir, arg) => cp.spawnSync(process.execPath, ["--no-warnings", CHILD, mode, dir, String(arg || "")], { encoding: "utf8", timeout: 60000 });
const killed = (r) => (process.platform === "win32" ? r.status !== 0 && r.status !== null : r.signal === "SIGKILL"); // Windows: signal = null, mã thoát ≠ 0
const base = () => JSON.parse(JSON.stringify(fixture()));
const seed = (dir, d) => { const s = createSqliteStorage(dir, opts); assert.equal(s.save(JSON.stringify(d)), true); s.close(); };
const countRows = (dir) => { const db = store.open(path.join(dir, "data.sqlite"), { readonly: true }); try { return db.prepare("SELECT COUNT(*) AS c FROM records").get().c; } finally { db.close(); } };

test("U-DUR-01 (kịch bản 1) kill -9 NGAY SAU commit SQLite, trước mọi phản hồi: mở lại thấy dữ liệu đã lưu; lưu lại cùng bản không nhân đôi", () => {
  const dir = tmp(), d = base(); seed(dir, d);
  const r = run("commit-die", dir); assert.ok(killed(r), "tiến trình con phải chết đột ngột. " + r.stdout + r.stderr.slice(0, 200)); assert.match(r.stdout, /SAVING/); assert.doesNotMatch(r.stdout, /SAVED|ERROR/);
  const s = createSqliteStorage(dir, opts), ld = s.load(); assert.equal(ld.ok, true, JSON.stringify(ld).slice(0, 200));
  const got = JSON.parse(ld.text); assert.equal(got.nhanvien.filter((x) => x["Mã NV"] === "SAU-COMMIT").length, 1, "bản đã commit phải còn, đúng một dòng");
  const rows = countRows(dir), sig = s.sig();
  // giao diện (hoặc người dùng) gửi lại đúng bản đã lưu — không được tạo thêm dòng/phiên bản
  assert.equal(s.save(ld.text), true); assert.equal(s.sig(), sig, "lưu lại cùng nội dung không tăng revision"); s.close(); assert.equal(countRows(dir), rows, "không nhân đôi dòng");
  const s2 = createSqliteStorage(dir, opts); assert.equal(JSON.parse(s2.load().text).nhanvien.filter((x) => x["Mã NV"] === "SAU-COMMIT").length, 1); s2.close();
});

test("U-DUR-02 (kịch bản 2) kill -9 giữa chốt kỳ liên tục (6 lần, thời điểm kill khác nhau): kỳ chốt trọn (checksum ok + nhật ký + trạng thái đủ cặp) hoặc chưa chốt; kỳ chốt trước đó không đổi một byte", { timeout: 240000 }, async () => {
  const dir = tmp(), d = base(); const pre = CLS.buildSnapshot(d, "2026-09", { bangluong: [{ "Mã NV": "NV001", "Họ và tên": "A", "Thực lĩnh": 100, "Tổng thu nhập": 100 }], bhxh: [], tncn: [], canhbao: [] }, []); CLS.close(d, pre); seed(dir, d);
  const preJson = JSON.stringify(pre); let start = 1;
  for (const [minSaved, extraMs] of [[1, 0], [2, 3], [2, 19], [1, 41], [3, 7], [2, 83]]) {
    const out = await new Promise((resolve, reject) => {
      const child = cp.spawn(process.execPath, ["--no-warnings", CHILD, "close-loop", dir, String(start)], { stdio: ["ignore", "pipe", "pipe"] });
      let buf = "", saved = 0, last = "", killedAt = false; let err = "";
      child.stderr.on("data", (c) => { err += c; });
      child.stdout.on("data", (c) => { buf += c; let nl; while ((nl = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (/^SAVED /.test(line)) { saved++; last = line.slice(6); if (saved >= minSaved && !killedAt) { killedAt = true; setTimeout(() => { try { child.kill("SIGKILL"); } catch (e) { /* đã thoát */ } }, extraMs); } } else if (/^ERROR/.test(line)) reject(new Error(line)); } });
      child.on("exit", () => resolve({ saved, last, err })); setTimeout(() => { try { child.kill("SIGKILL"); } catch (e) { /* bỏ qua */ } }, 90000).unref();
    });
    assert.ok(out.saved >= 1, "con phải chốt được ít nhất 1 kỳ. " + out.err.slice(0, 200));
    const s = createSqliteStorage(dir, opts), ld = s.load(); assert.equal(ld.ok, true, JSON.stringify(ld).slice(0, 200));
    const doc = JSON.parse(ld.text), snaps = doc.kyluong, aud = (doc.auditlog || []).filter((x) => x.thaoTac === "Chốt kỳ").map((x) => x.chiTiet), tt = (doc.ttluong || []).map((x) => x.ky);
    assert.equal(JSON.stringify(snaps.find((k) => k.ky === "2026-09")), preJson, "kỳ đã chốt trước đó không đổi");
    snaps.forEach((k) => assert.equal(CLS.verify(k), "ok", "bản chốt " + k.ky + " phải toàn vẹn (không nửa vời)"));
    const closed = snaps.map((k) => k.ky).filter((k) => k !== "2026-09").sort();
    assert.deepEqual([...aud].sort(), closed, "mỗi kỳ chốt có đúng một dòng nhật ký (cả hai cùng có hoặc cùng không)"); assert.deepEqual([...tt].sort(), closed, "bảng trạng thái cùng nhịp với bản chốt");
    assert.ok(closed.includes(out.last), "kỳ đã báo SAVED phải còn");
    start += 1000; s.close();
  }
});

test("U-DUR-04 (kịch bản 4, MÔ PHỎNG đĩa đầy bằng SQLITE_FULL thật) lưu khi hết chỗ: trả LỖI (không ném), dữ liệu cũ nguyên vẹn trong bộ nhớ và trên đĩa, nhả chỗ rồi lưu lại được", () => {
  const dir = tmp(), d = base(), s = createSqliteStorage(dir, opts); assert.equal(s.save(JSON.stringify(d)), true); const before = s.load().text, sig = s.sig();
  const realTx = store.tx; let full = true;
  store.tx = (db, fn) => { if (full) { const pages = Number(db.prepare("PRAGMA page_count").get().page_count); db.exec("PRAGMA max_page_count = " + pages); } else db.exec("PRAGMA max_page_count = 1073741823"); return realTx(db, fn); }; // chỉ giới hạn số trang của KẾT NỐI này: SQLite báo "database or disk is full" thật
  try {
    const big = JSON.parse(before); big.nhanvien = big.nhanvien.concat(Array.from({ length: 3000 }, (_, i) => ({ "Mã NV": "ĐẦY" + i, "Họ và tên": "Người " + i + " ".repeat(200) })));
    const r = s.save(JSON.stringify(big)); assert.equal(typeof r, "string", "phải trả chuỗi lỗi"); assert.match(r, /full|đầy|disk/i, "lỗi nêu rõ hết chỗ: " + r);
    assert.equal(s.load().text, before, "dữ liệu trong bộ nhớ vẫn là bản cũ"); assert.equal(s.sig(), sig, "revision không đổi");
    full = false; assert.equal(s.save(JSON.stringify(big)), true, "nhả chỗ rồi thử lại được"); assert.equal(JSON.parse(s.load().text).nhanvien.length, big.nhanvien.length);
  } finally { store.tx = realTx; }
  s.close();
  const s2 = createSqliteStorage(dir, opts), after = JSON.parse(s2.load().text); assert.equal(after.nhanvien.some((x) => x["Mã NV"] === "ĐẦY0"), true); s2.close();
  // và nếu app bị đóng NGAY sau lần lưu thất bại: dữ liệu cũ còn đủ
  const dir2 = tmp(); const t = createSqliteStorage(dir2, opts); assert.equal(t.save(before), true);
  store.tx = (db, fn) => { db.exec("PRAGMA max_page_count = " + Number(db.prepare("PRAGMA page_count").get().page_count)); return realTx(db, fn); };
  try { const bigger = JSON.parse(before); bigger.nhanvien.push({ "Mã NV": "X", "Họ và tên": "y".repeat(500000) }); assert.equal(typeof t.save(JSON.stringify(bigger)), "string"); } finally { store.tx = realTx; }
  t.close(); const u = createSqliteStorage(dir2, opts); assert.equal(u.load().text, before, "đóng/mở lại sau lỗi lưu: vẫn là bản cũ"); u.close();
});

test("U-DUR-05 (kịch bản 5) hai phiên cùng một thư mục dữ liệu: phiên sau bị chặn với thông báo rõ, không ghi gì; phiên đầu bị kill thì khóa cũ được nhận ra và mở lại bình thường", async () => {
  const dir = tmp(), d = base(); seed(dir, d);
  const child = cp.spawn(process.execPath, ["--no-warnings", CHILD, "hold", dir], { stdio: ["ignore", "pipe", "pipe"] });
  try {
    await new Promise((res, rej) => { let b = ""; child.stdout.on("data", (c) => { b += c; if (/READY/.test(b)) res(); else if (/ERROR/.test(b)) rej(new Error(b)); }); child.on("exit", () => rej(new Error("con thoát sớm"))); setTimeout(() => rej(new Error("hết giờ chờ con")), 20000).unref(); });
    const before = sha(path.join(dir, "data.sqlite")), s = createSqliteStorage(dir, opts), ld = s.load();
    assert.equal(ld.ok, false, "phiên sau KHÔNG được mở"); assert.match(ld.error, /PID \d+/); assert.match(ld.error, /không mở hai phiên ghi/);
    assert.equal(typeof s.save(JSON.stringify(d)), "string", "phiên sau không ghi được"); assert.equal(fs.existsSync(path.join(dir, "data.sqlite.lock")), true, "khóa của phiên đầu còn nguyên");
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "data.sqlite.lock"), "utf8")).pid, child.pid, "khóa vẫn của phiên đầu"); assert.equal(sha(path.join(dir, "data.sqlite")), before, "phiên sau không ghi gì xuống kho");
  } finally { try { child.kill("SIGKILL"); } catch (e) { /* đã thoát */ } }
  await new Promise((r) => child.on("exit", r));
  const s2 = createSqliteStorage(dir, opts), l2 = s2.load(); assert.equal(l2.ok, true, "khóa của tiến trình đã chết phải bị bỏ qua: " + JSON.stringify(l2).slice(0, 200)); assert.equal(s2.save(l2.text), true); s2.close();
});

/** Dựng tình huống: v1 đã checkpoint (đóng sạch) → con mở lại, lưu v2 chỉ nằm trong -wal, (sync: xuất data.json), kill -9 → trả thư mục. */
function walCrash(exportMode, env) {
  const dir = tmp(); seed(dir, base());
  const r = env ? cp.spawnSync(process.execPath, ["--no-warnings", CHILD, "wal-write", dir, exportMode], { encoding: "utf8", timeout: 60000, env: Object.assign({}, process.env, env) }) : run("wal-write", dir, exportMode); assert.ok(killed(r), r.stdout + r.stderr.slice(0, 200)); assert.match(r.stdout, /SAVED/);
  if (!env) assert.equal(fs.existsSync(path.join(dir, "data.sqlite-wal")) && fs.statSync(path.join(dir, "data.sqlite-wal")).size > 0, true, "v2 phải đang nằm trong -wal (chưa checkpoint)");
  return dir;
}
const wipeWal = (dir) => { for (const x of ["-wal", "-shm"]) fs.rmSync(path.join(dir, "data.sqlite" + x), { force: true }); };
const hasV2 = (text) => JSON.parse(text).nhanvien.some((x) => x["Mã NV"] === "CHI-CO-O-V2");

test("U-DUR-06a (kịch bản 6) crash thường (kill -9, KHÔNG đụng -wal): giao dịch nằm trong -wal vẫn còn khi mở lại (synchronous=FULL)", () => {
  const dir = walCrash("delay"); const s = createSqliteStorage(dir, opts), ld = s.load(); assert.equal(ld.ok, true); assert.equal(hasV2(ld.text), true); s.close();
});

test("U-DUR-06b (kịch bản 6) -wal bị MẤT/CẮT CỤT/HỎNG sau crash khi data.json ĐÃ xuất kịp: app KHÔNG mở âm thầm — báo xung đột nêu chênh lệch, không ghi đè", () => {
  for (const damage of ["xóa", "cắt cụt", "rác"]) {
    const dir = walCrash("sync"), wal = path.join(dir, "data.sqlite-wal");
    if (damage === "xóa") wipeWal(dir); else if (damage === "cắt cụt") { fs.truncateSync(wal, 1000); fs.rmSync(wal.replace("-wal", "-shm"), { force: true }); } else { const n = fs.statSync(wal).size; fs.writeFileSync(wal, Buffer.alloc(n, 0xff)); fs.rmSync(wal.replace("-wal", "-shm"), { force: true }); }
    const s = createSqliteStorage(dir, opts), ld = s.load(); assert.equal(ld.ok, false, damage + ": phải báo, không mở như bình thường"); assert.match(ld.error, /data\.json không phải bản xuất gần nhất/, damage); assert.match(ld.error, /Chênh lệch/, damage); s.close();
    assert.equal(hasV2(fs.readFileSync(path.join(dir, "data.json"), "utf8")), true, damage + ": data.json (có v2) không bị ghi đè");
  }
});

// GIỚI HẠN ĐÃ BIẾT, CHỜ QUYẾT ĐỊNH (issue #91, kịch bản 6): nếu -wal mất/hỏng trong cửa sổ trước lần xuất data.json (≤ 3 s) thì app mở bình thường và MẤT giao dịch cuối mà KHÔNG báo.
// Test này mô tả hành vi MONG MUỐN nếu sau này chọn B/C (phải báo mất giao dịch). Chủ sở hữu đã chọn A (chấp nhận rủi ro, issue #91): giữ `todo` làm tài liệu sống — không xóa, không nới.
for (const damage of ["xóa", "cắt cụt", "rác"]) {
  test("U-DUR-06c (kịch bản 6) -wal " + damage + " khi data.json CHƯA xuất kịp: phải báo mất giao dịch, không được mở âm thầm", { todo: "hành vi mong muốn nếu sau này chọn B/C; hiện chủ sở hữu chấp nhận rủi ro (quyết định A, issue #91)" }, () => {
    const dir = walCrash("delay"), wal = path.join(dir, "data.sqlite-wal");
    if (damage === "xóa") wipeWal(dir); else if (damage === "cắt cụt") { fs.truncateSync(wal, 1000); fs.rmSync(wal.replace("-wal", "-shm"), { force: true }); } else { const n = fs.statSync(wal).size; fs.writeFileSync(wal, Buffer.alloc(n, 0xff)); fs.rmSync(wal.replace("-wal", "-shm"), { force: true }); }
    const s = createSqliteStorage(dir, opts), ld = s.load(); const silent = ld.ok === true && !hasV2(ld.text); s.close();
    assert.equal(silent, false, "đang mở bình thường và thiếu giao dịch cuối mà không báo gì");
  });
}

// Phương án C (MÔ PHỎNG, không phải sản phẩm): checkpoint(TRUNCATE) sau mỗi lần lưu → mất/hỏng -wal không còn làm mất giao dịch, kể cả khi data.json chưa xuất.
test("U-DUR-06d (mô phỏng phương án C) -wal xóa/cắt cụt/rác khi data.json CHƯA xuất kịp: KHÔNG mất giao dịch vì -wal luôn rỗng sau mỗi lần lưu", () => {
  for (const damage of ["xóa", "cắt cụt", "rác"]) {
    const dir = walCrash("delay", { HAK_SIM_CKPT: "1" }), wal = path.join(dir, "data.sqlite-wal");
    assert.ok(!fs.existsSync(wal) || fs.statSync(wal).size === 0, "-wal rỗng sau lần lưu cuối");
    if (damage === "xóa") wipeWal(dir); else if (fs.existsSync(wal)) { fs.writeFileSync(wal, damage === "cắt cụt" ? Buffer.alloc(0) : Buffer.alloc(4096, 0xff)); fs.rmSync(wal.replace("-wal", "-shm"), { force: true }); }
    const s = createSqliteStorage(dir, opts), ld = s.load(); assert.equal(ld.ok, true, damage); assert.equal(hasV2(ld.text), true, damage + ": giao dịch cuối còn"); s.close();
  }
});
