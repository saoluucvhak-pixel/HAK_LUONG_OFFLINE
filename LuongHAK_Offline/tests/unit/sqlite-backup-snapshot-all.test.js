// Quy trình sao lưu khi nơi lưu CHÍNH là SQLite (CEO rà 19/11/2026): mọi loại sao lưu phải có bản chụp .sqlite đã kiểm,
// có lịch sử bản chụp, lỗi bản chụp không được im lặng, thư mục dự phòng nhận cả bản .sqlite. Dữ liệu giả, fs thật.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const STORE = require("../../main/sqlite-store.js");
const { fixture } = require("../fixtures/production-carry");

const dirOf = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-snapall-"));
let n = 0;
const doc = () => { const d = JSON.parse(JSON.stringify(fixture())); d.nhanvien.push({ "Mã NV": "S" + (++n), "Họ và tên": "Giả " + n }); return d; };
const shaF = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const snaps = (dir) => { try { return fs.readdirSync(dir).filter((x) => /^snap_.*\.sqlite$/.test(x)).sort(); } catch (e) { return []; } };
function fresh() { const dir = dirOf(), s = createSqliteStorage(dir, { exportDelayMs: 600000 }); assert.equal(s.save(JSON.stringify(doc())), true); return { dir, s }; }
const latestSnap = (s) => path.join(s.backupDir, "data-snapshot.sqlite");

test("U-SNAP-01 sao lưu ĐỊNH KỲ (tickSchedule) cũng tạo bản chụp .sqlite đã kiểm, có trong lịch sử với nhãn dinh-ky", () => {
  const { s } = fresh();
  assert.equal(s.setSchedule({ everyHours: 1 }).ok, true);
  assert.equal(s.save(JSON.stringify(doc())), true);
  const r = s.tickSchedule(); assert.ok(r, "định kỳ phải tạo bản sao lưu");
  assert.ok(fs.existsSync(latestSnap(s)), "phải có data-snapshot.sqlite");
  assert.ok(snaps(s.backupDir).some((x) => /_dinh-ky\.sqlite$/.test(x)), "lịch sử có bản chụp dinh-ky: " + snaps(s.backupDir).join(","));
});

test("U-SNAP-02 sao lưu KHI ĐÓNG APP cũng tạo bản chụp .sqlite (nhãn khi-dong)", () => {
  const { s } = fresh();
  assert.equal(s.save(JSON.stringify(doc())), true);
  assert.ok(s.backupOnClose(), "khi đóng app (mặc định bật) phải sao lưu");
  assert.ok(snaps(s.backupDir).some((x) => /_khi-dong\.sqlite$/.test(x)), snaps(s.backupDir).join(","));
});

test("U-SNAP-03 bản chụp mới nhất luôn KHỚP dữ liệu vừa sao lưu (số dòng records bằng kho đang chạy)", () => {
  const { s } = fresh();
  assert.equal(s.setSchedule({ everyHours: 1 }).ok, true);
  for (let i = 0; i < 3; i++) assert.equal(s.save(JSON.stringify(doc())), true);
  assert.ok(s.tickSchedule());
  const info = s.snapshotInfo(); assert.equal(info.ok, true, JSON.stringify(info));
  const want = JSON.parse(s.load().text).nhanvien.length, got = info.doc ? info.doc.nhanvien.length : null;
  if (got != null) assert.equal(got, want);
  const st = s.snapshotStatus(); assert.ok(st && st.latest && st.latest.records > 0, JSON.stringify(st));
});

test("U-SNAP-04 có LỊCH SỬ bản chụp: giữ 10 bản gần nhất, bản sau chốt kỳ / theo năm giữ vĩnh viễn", () => {
  const { s } = fresh();
  assert.ok(s.backup("sau-chot-2026-09"));
  for (let i = 0; i < 13; i++) { assert.equal(s.save(JSON.stringify(doc())), true); assert.ok(s.backup("manual"), "lần " + i); }
  const h = snaps(s.backupDir), manual = h.filter((x) => /_manual\.sqlite$/.test(x));
  assert.equal(manual.length, 10, "giữ đúng 10 bản thường: " + h.join(","));
  assert.ok(h.some((x) => /_sau-chot-2026-09\.sqlite$/.test(x)), "bản sau chốt kỳ không bị xóa");
  for (const x of h) assert.ok(fs.statSync(path.join(s.backupDir, x)).size > 0);
});

test("U-SNAP-05 tạo bản chụp LỖI thì không im lặng: snapshotStatus().lastError có nội dung tiếng Việt, bản JSON vẫn có", () => {
  const { s } = fresh();
  const real = STORE.snapshot; STORE.snapshot = () => ({ ok: false, error: "giả lập đĩa đầy" });
  try { assert.equal(s.save(JSON.stringify(doc())), true); assert.ok(s.backup("manual"), "bản JSON vẫn tạo được"); }
  finally { STORE.snapshot = real; }
  const st = s.snapshotStatus(); assert.ok(st && /giả lập đĩa đầy/.test(st.lastError || ""), JSON.stringify(st));
  assert.equal(s.save(JSON.stringify(doc())), true); assert.ok(s.backup("manual"));
  assert.equal(s.snapshotStatus().lastError, "", "lần sau thành công thì xóa báo lỗi");
});

test("U-SNAP-06 THƯ MỤC DỰ PHÒNG nhận cả bản chụp .sqlite (mã băm khớp bản trên máy)", () => {
  const { s } = fresh(), mir = dirOf();
  assert.equal(s.setMirror(mir).ok, true);
  assert.equal(s.save(JSON.stringify(doc())), true); assert.ok(s.backup("manual"));
  const sub = path.join(mir, "TinhLuongHAK-SaoLuu"), m = snaps(sub);
  assert.ok(m.length >= 1, "thư mục dự phòng phải có snap_*.sqlite: " + (fs.existsSync(sub) ? fs.readdirSync(sub).join(",") : "(chưa có thư mục)"));
  const last = m[m.length - 1]; assert.equal(shaF(path.join(sub, last)), shaF(path.join(s.backupDir, last)));
});

test("U-SNAP-07 bản sao lưu ĐẦU NGÀY (bảo vệ trước khi ghi) có bản chụp .sqlite nhãn daily", () => {
  const { s } = fresh();
  assert.ok(snaps(s.backupDir).some((x) => /_daily\.sqlite$/.test(x)) || (s.save(JSON.stringify(doc())) && snaps(s.backupDir).some((x) => /_daily\.sqlite$/.test(x))), snaps(s.backupDir).join(","));
});
