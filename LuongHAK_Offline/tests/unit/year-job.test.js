// A01: thao tác kho năm trên kho SQLite chính không được ghi lùi hay báo thành công giả. Worker kho năm THẬT, SQLite thật, dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { createYearJob } = require("../../main/year-job.js");
const worker = require("../../main/year-archive-worker.js");
const C = require("../../core/payroll-close"), IR = require("../../core/input-review");
const { fixture } = require("../fixtures/production-carry");

const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const dirOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-yj-"));
function seed() {
  const db = fixture(); db.auditlog = []; db.baomat = []; db.schemaVersion = 2;
  db.nhanvien = [{ _id: "n1", "Mã NV": "SYN01", "Họ và tên": "Synthetic Person", "Trạng thái": "Đang làm việc" }];
  db.chamcong = [{ _id: "a1", "Kỳ": "2023-01", "Mã NV": "SYN01", "1": "1" }, { _id: "a2", "Kỳ": "2026-01", "Mã NV": "SYN01", "1": "1" }];
  db.psluong = Array.from({ length: 50 }, (_, i) => ({ _id: "p" + i, "Ngày hạch toán": "2023-01-15", "Mã NV": "SYN01", "Thưởng": "1000" }));
  db.kyluong = [C.buildSnapshot(db, "2023-01", { bangluong: [{ "Mã NV": "SYN01", "Họ và tên": "Synthetic Person", "Thực lĩnh": 1000000 }], bhxh: [], tncn: [], canhbao: [] }, db.nhanvien, { user: "tester" })];
  IR.initialize(db); IR.approve(db, "chamcong", "2023-01", "", "fx"); IR.approve(db, "chamcong", "2026-01", "", "fx");
  return db;
}
// Lỗi xuất data.json (đổi tên file đích bị từ chối) — chỉ khi đích là data.json
function withExportFailure(fn) {
  const real = fs.renameSync; fs.renameSync = function (a, b) { if (String(b).endsWith("data.json")) { const e = new Error("EACCES: permission denied"); e.code = "EACCES"; throw e; } return real.apply(this, arguments); };
  try { return fn(); } finally { fs.renameSync = real; }
}
const realWorker = (dir) => (method, args) => worker.run(dir, method, args);
function setup(extra) {
  const dir = dirOf(), s = createSqliteStorage(dir, { exportDelayMs: 600000 }), d = seed();
  assert.equal(s.save(JSON.stringify(d)), true); assert.equal(s.syncJson(), true);
  if (extra) { extra(d); assert.equal(s.save(JSON.stringify(d)), true); }
  return { dir, s, d };
}

test("U-A01-01 syncJson thất bại: KHÔNG chạy worker (không dùng JSON cũ làm đầu vào), báo lỗi thật, dữ liệu mới nằm nguyên trong SQLite", async () => {
  const { dir, s } = setup((d) => d.chamcong.push({ _id: "new", "Kỳ": "2026-02", "Mã NV": "SYN01", "1": "1" }));
  let called = 0; const job = createYearJob({ storage: s, runWorker: (m, a) => { called++; return worker.run(dir, m, a); } });
  const before = s.load().text, res = await withExportFailure(() => job("preview", [2023]));
  assert.equal(res.ok, false); assert.match(res.error, /KHÔNG chạy|không chạy/i); assert.equal(called, 0, "worker không được chạy");
  assert.equal(s.load().text, before); assert.ok(JSON.parse(s.load().text).chamcong.some((r) => r._id === "new")); s.close();
});

test("U-A01-02 preview/table với worker thật: thành công, KHÔNG đổi dữ liệu nghiệp vụ (nội dung, revision, data.json), không nhận lại", async () => {
  const { dir, s } = setup((d) => d.chamcong.push({ _id: "new", "Kỳ": "2026-02", "Mã NV": "SYN01", "1": "1" }));
  const job = createYearJob({ storage: s, runWorker: realWorker(dir) }), text0 = s.load().text, rev0 = s.sig(), file0 = fs.readFileSync(path.join(dir, "data.json"), "utf8");
  for (const [m, a] of [["preview", [2023]], ["table", [2023, "chamcong", "2023-01", 0]]]) { const r = await job(m, a); assert.ok(r && typeof r === "object", m); }
  assert.equal(s.load().text, text0); assert.equal(s.sig(), rev0, "revision không đổi"); assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), text0, "data.json = bản xuất đúng revision hiện tại (job xuất trước khi chạy), không đổi sau đó"); assert.notEqual(file0, text0, "trước job data.json đang cũ hơn SQLite — đây chính là ca mà lỗi cũ làm mất dòng mới");
  assert.equal(s.pendingOp(), null, "chỉ đọc: không đặt marker"); s.close();
});

test("U-A01-03 worker chỉ-đọc lỡ ghi data.json: data.json được xuất lại từ SQLite, SQLite không đổi", async () => {
  const { dir, s } = setup(); const text0 = s.load().text;
  const job = createYearJob({ storage: s, runWorker: async () => { fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ nhanvien: [{ "Mã NV": "RÁC" }] })); return { ok: true }; } });
  const r = await job("preview", [2023]); assert.equal(r.ok, true);
  assert.equal(s.load().text, text0); assert.equal(sha(fs.readFileSync(path.join(dir, "data.json"), "utf8")), sha(text0), "data.json trở về đúng bản xuất"); s.close();
});

test("U-A01-04 archive thật: kết quả được nhận vào SQLite (revision tăng), marker được xóa, mở lại thấy cùng dữ liệu, data.json = SQLite", async () => {
  const { dir, s } = setup(); const job = createYearJob({ storage: s, runWorker: realWorker(dir) });
  const pv = await job("preview", [2023]); assert.equal(pv.ok, true, JSON.stringify(pv).slice(0, 200));
  const rev0 = s.sig(), tk = pv.token || (pv.preview && pv.preview.token);
  const res = await job("archive", [2023, tk, "tester"]);
  assert.equal(res.ok, true, JSON.stringify(res).slice(0, 300)); assert.notEqual(s.sig(), rev0, "kết quả được nhận");
  assert.equal(s.pendingOp(), null); const after = s.load().text;
  assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), after); s.close();
  const s2 = createSqliteStorage(dir, { exportDelayMs: 20 }); assert.equal(s2.load().text, after); s2.close();
});

test("U-A01-05 archive thất bại (worker báo lỗi sau khi đã ghi dở data.json): SQLite nguyên, data.json xuất lại, marker xóa, KHÔNG thành công giả", async () => {
  const { dir, s } = setup(); const text0 = s.load().text;
  const job = createYearJob({ storage: s, runWorker: async () => { fs.writeFileSync(path.join(dir, "data.json"), "{ dở dang"); return { ok: false, error: "SYNTHETIC_WORKER_FAILURE" }; } });
  const r = await job("archive", [2023, "x", "tester"]); assert.equal(r.ok, false); assert.match(r.error, /SYNTHETIC_WORKER_FAILURE/);
  assert.equal(s.load().text, text0); assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), text0); assert.equal(s.pendingOp(), null); s.close();
});

test("U-A01-06 worker ném lỗi hoặc không trả kết quả: coi là thất bại, hoàn tác, không thành công giả", async () => {
  const { dir, s } = setup(); const text0 = s.load().text;
  for (const runWorker of [async () => { throw new Error("SYNTHETIC_CRASH"); }, async () => undefined]) {
    const r = await createYearJob({ storage: s, runWorker })("archive", [2023, "x", "t"]); assert.equal(r.ok, false);
    assert.equal(s.load().text, text0); assert.equal(s.pendingOp(), null); assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), text0);
  }
  s.close();
});

test("U-A01-07 adopt bị từ chối (kết quả không hợp lệ HOẶC dữ liệu đã đổi trong lúc worker chạy): không nhận kết quả cũ, giữ giao dịch đã commit", async () => {
  { // kết quả không phải JSON hợp lệ
    const { dir, s } = setup(); const text0 = s.load().text;
    const r = await createYearJob({ storage: s, runWorker: async () => { fs.writeFileSync(path.join(dir, "data.json"), "không phải json"); return { ok: true }; } })("archive", [2023, "x", "t"]);
    assert.equal(r.ok, false); assert.match(r.error, /KHÔNG được nhận/); assert.equal(s.load().text, text0); assert.equal(fs.readFileSync(path.join(dir, "data.json"), "utf8"), text0); s.close();
  }
  { // một lần lưu khác commit trong lúc worker chạy
    const { dir, s, d } = setup(); const postOp = JSON.parse(s.load().text); postOp.kyluong = []; // "kết quả" của worker
    const r = await createYearJob({ storage: s, runWorker: async () => {
      d.chamcong.push({ _id: "concurrent", "Kỳ": "2026-03", "Mã NV": "SYN01", "1": "1" }); assert.equal(s.save(JSON.stringify(d)), true); // revision đổi
      fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(postOp)); return { ok: true }; } })("archive", [2023, "x", "t"]);
    assert.equal(r.ok, false); const now = JSON.parse(s.load().text);
    assert.ok(now.chamcong.some((x) => x._id === "concurrent"), "giao dịch đã commit không bị mất"); assert.ok(now.kyluong.length > 0, "kết quả cũ của worker không được nhận"); s.close();
  }
});

test("U-A01-08 crash giữa chừng: marker + data.json đã là kết quả worker → mở lại NHẬN theo marker (không theo ngày giờ); data.json còn là trạng thái trước → bỏ marker, giữ SQLite", () => {
  { const { dir, s } = setup(); const post = JSON.parse(s.load().text); post.kyluong = []; const baseSha = sha(s.load().text);
    assert.equal(s.beginExternalOp({ method: "archive", baseSha, rev: 1 }), true); fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(post)); // worker ghi xong rồi tiến trình chết
    const s2 = createSqliteStorage(dir, { exportDelayMs: 20 }), r = s2.load(); assert.equal(r.ok, true, JSON.stringify(r).slice(0, 200)); assert.deepEqual(JSON.parse(r.text).kyluong, []); assert.equal(s2.pendingOp(), null); s2.close(); }
  { const { dir, s } = setup(); const baseSha = sha(s.load().text), text0 = s.load().text;
    assert.equal(s.beginExternalOp({ method: "archive", baseSha, rev: 1 }), true); // chết trước khi worker ghi gì
    const s2 = createSqliteStorage(dir, { exportDelayMs: 20 }), r = s2.load(); assert.equal(r.ok, true); assert.equal(r.text, text0); assert.equal(s2.pendingOp(), null); s2.close(); }
});

test("U-A01-09 xung đột không còn khuyên theo ngày giờ file; nêu chênh lệch bảng/dòng để xem TRƯỚC khi chọn", () => {
  const { dir, s } = setup(); s.close();
  const other = seed(); other.nhanvien.push({ _id: "x", "Mã NV": "LẠ" }); fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(other));
  const r = createSqliteStorage(dir, { exportDelayMs: 20 }).load(); assert.equal(r.ok, false);
  assert.match(r.error, /Chênh lệch \(data\.json so với SQLite\): .*nhanvien/); assert.doesNotMatch(r.error, /mới hơn|bản đầy đủ hơn|Sửa lần cuối/);
});
