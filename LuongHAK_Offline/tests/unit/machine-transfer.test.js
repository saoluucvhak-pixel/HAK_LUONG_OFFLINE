// #112 (handoff 011): sao lưu ở máy A → khôi phục ở máy B (hồ sơ mới, SQLite mặc định). Dữ liệu GIẢ, chạy không cần mạng.
// Phủ: (1) JSON đầy đủ → B khớp từng bảng (số dòng + SHA-256) và kỳ đã chốt; (2) Full Backup (chứng từ + thư viện OCR);
// (3) gói .hakenc: đúng mật khẩu khôi phục được, sai mật khẩu / cắt cụt / sửa 1 byte thì dữ liệu B KHÔNG đổi một byte;
// (4) khôi phục hai lần không nhân đôi; (5) ghi tiếp được ở B sau khôi phục.
// CHƯA phủ (ghi rõ): Windows thật (ổ khác, đường dẫn có dấu, USB), nhập lại Excel sau khôi phục (đã có test chống trùng riêng), lược đồ JSON cũ hơn (đã có tests/regression + sqlite-migrate).
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
delete process.env.HAK_SQLITE_EXPORT_SYNC; delete process.env.HAK_SQLITE_ADOPT_EXTERNAL;
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { createVault } = require("../../main/documents"), { createStore } = require("../../main/ocr-library.js");
const FB = require("../../main/fullbackup"), { createRestorer } = require("../../main/restore"), BC = require("../../main/backup-crypt.js"), DD = require("../../main/data-digest.js");
const { fixture } = require("../fixtures/production-carry");
const S = require("../fixtures/synth-digits.js");
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p || "hak-xfer-"));
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const FAST = { scrypt: { N: 1 << 14, r: 8, p: 1 } }, PW = "Mat-khau-Manh-2026";
const bb = (a, b, c, d) => ({ x0: a, y0: b, x1: c, y1: d });

/** Dữ liệu giả đủ nhiều bảng + một kỳ ĐÃ CHỐT có snapshot bảng lương (để so tổng tiền kỳ chốt). */
function dataA() {
  const d = JSON.parse(JSON.stringify(fixture()));
  d.kyluong = [{ ky: "2026-08", version: 1, chot: true, kq: { bangluong: [{ "Mã NV": "NV001", "Thực lĩnh": 8000000.4, "Tổng thu nhập": 9000000 }, { "Mã NV": "NV002", "Thực lĩnh": 7500000, "Tổng thu nhập": 8200000 }] } }];
  return d;
}
/** Máy A: hồ sơ SQLite + kho chứng từ + thư viện OCR có dữ liệu. */
function machineA() {
  const root = tmp(), dir = path.join(root, "userData"); fs.mkdirSync(dir);
  const store = createSqliteStorage(dir, { exportDelayMs: 20 }); const data = dataA();
  assert.equal(store.save(JSON.stringify(data)), true);
  let n = 0; const v = createVault(path.join(root, "documents"), { now: () => new Date(2026, 9, 13, 9, 0, 0), rand: () => "R" + String(++n).padStart(5, "0") });
  const a = v.add(Buffer.from("anh bang cong".repeat(500)), { name: "bang-cong.png" }); v.add(Buffer.from("%PDF phieu"), { name: "phieu.pdf" });
  const lib = createStore(path.join(root, "lib"), { spoolDir: path.join(root, "spool") });
  ["1", "7", "3"].forEach((l, i) => { const im = S.render(l, S.prng(i + 1)); lib.record({ raw: im.g, clean: im.g, w: im.w, h: im.h, cellType: "digit", docId: a.id, page: 1, bbox: bb(i * 50, 0, i * 50 + 40, 60), before: "", after: l, employee: "NV001" }); });
  return { root, dir, store, data, v, lib };
}
/** Máy B: hồ sơ MỚI (chưa có dữ liệu). */
function machineB() {
  const root = tmp(), dir = path.join(root, "userData"); fs.mkdirSync(dir);
  const store = createSqliteStorage(dir, { exportDelayMs: 20 });
  const vault = createVault(path.join(root, "documents")), lib = createStore(path.join(root, "lib"), { spoolDir: path.join(root, "spool") });
  const b = { root, dir, store, vault, lib, live: null };
  b.rs = createRestorer({ userData: dir, getVault: () => vault, getOcrLib: () => lib, readData: () => (b.live == null ? { ok: false } : { ok: true, text: b.live }), maxSchema: 5 });
  return b;
}
const digestOf = (store) => { const l = store.load(); assert.equal(l.ok, true, l.error); return DD.digest(JSON.parse(l.text)); };

test("U-XFER-01 JSON đầy đủ: A → B (hồ sơ mới): từng bảng cùng số dòng + SHA-256, kỳ đã chốt cùng tổng tiền, ghi tiếp được, mở lại vẫn đúng", () => {
  const A = machineA(), text = A.store.load().text, B = machineB();
  assert.equal(B.store.save(text), true);                         // giao diện đẩy nội dung file JSON vào kho của B
  const dA = digestOf(A.store), dB = digestOf(B.store);
  assert.deepEqual(DD.compare(dA, dB), [], "mọi bảng + kỳ chốt của B phải khớp A");
  assert.ok(Object.keys(dA.tables).length >= 8, "dữ liệu giả phải phủ nhiều bảng: " + Object.keys(dA.tables).length);
  assert.equal(dB.kyChot["2026-08#v1"].tongThucLinh, 15500000); assert.equal(dB.kyChot["2026-08#v1"].soNV, 2);
  assert.equal(fs.existsSync(path.join(B.dir, "data.sqlite")), true);
  const more = JSON.parse(B.store.load().text); more.nhanvien.push({ "Mã NV": "ZZ1", "Họ và tên": "Ghi tiếp ở B" });
  assert.equal(B.store.save(JSON.stringify(more)), true, "B ghi tiếp được");
  B.store.close(); const B2 = createSqliteStorage(B.dir, { exportDelayMs: 20 }), ld = B2.load();
  assert.equal(ld.ok, true); assert.ok(JSON.parse(ld.text).nhanvien.some((x) => x["Mã NV"] === "ZZ1")); B2.close(); A.store.close();
});

test("U-XFER-02 Full Backup: A → B: dữ liệu khớp, chứng từ + thư viện OCR về đủ (băm file trùng), nhật ký DONE", () => {
  const A = machineA(), text = A.store.load().text;
  const pkg = FB.create({ dataText: text, vault: A.v, ocrLib: A.lib, destDir: path.join(A.root, "out") }); assert.equal(pkg.status, "SUCCESS");
  const B = machineB(), r = B.rs.stage(pkg.file); assert.equal(r.ok, true, r.error);
  const c = B.rs.commitAssets(r.rid); assert.equal(c.ok, true, c.error); assert.equal(c.docs.added, 2); assert.equal(c.ocr.addedSamples, 3);
  assert.equal(B.store.save(r.text), true); B.live = B.store.load().text;
  const p = B.rs.postcheck(r.rid); assert.equal(p.ok, true, JSON.stringify(p.checks)); B.rs.finish(r.rid);
  assert.deepEqual(DD.compare(digestOf(A.store), digestOf(B.store)), []);
  const ia = A.v.list().map((d) => d.id).sort(), ib = B.vault.list().map((d) => d.id).sort(); assert.deepEqual(ib, ia);
  assert.ok(B.vault.verify().every((x) => x.status === "ok")); assert.equal(B.lib.verify().ok, true);
  assert.equal(JSON.parse(fs.readFileSync(B.rs.journalFile, "utf8")).state, "DONE");
  A.store.close(); B.store.close();
});

test("U-XFER-03 gói .hakenc sang máy B: đúng mật khẩu khôi phục được; sai mật khẩu / cắt cụt / sửa 1 byte → báo lỗi và data.sqlite của B KHÔNG đổi một byte", async () => {
  const A = machineA(), pkg = FB.create({ dataText: A.store.load().text, vault: A.v, ocrLib: A.lib, destDir: path.join(A.root, "out") });
  const enc = pkg.file + ".hakenc"; assert.equal((await BC.encryptFile(pkg.file, enc, PW, FAST)).ok, true);
  const B = machineB(); B.store.save(JSON.stringify({ schemaVersion: 2, nhanvien: [{ "Mã NV": "B-CU", "Họ và tên": "Dữ liệu sẵn có ở B" }] })); B.store.close();
  const dbB = path.join(B.dir, "data.sqlite"), before = sha(dbB), out = path.join(B.root, "giai-ma.zip");
  assert.equal((await BC.decryptFile(enc, out, PW + "x")).code, "AUTH"); assert.equal(fs.existsSync(out), false);
  const good = fs.readFileSync(enc), cut = path.join(B.root, "cut.hakenc"), flip = path.join(B.root, "flip.hakenc");
  fs.writeFileSync(cut, good.subarray(0, good.length - 40)); const g2 = Buffer.from(good); g2[g2.length - 50] ^= 1; fs.writeFileSync(flip, g2);
  for (const f of [cut, flip]) { const x = await BC.decryptFile(f, out, PW); assert.equal(x.ok, false); assert.equal(fs.existsSync(out), false); }
  assert.equal(sha(dbB), before, "B không đổi một byte sau các lần giải mã thất bại");
  const ok = await BC.decryptFile(enc, out, PW); assert.equal(ok.ok, true, ok.error);
  const r = B.rs.stage(out); assert.equal(r.ok, true, r.error); assert.equal(r.text, A.store.load().text);
  A.store.close();
});

test("U-XFER-04 khôi phục CÙNG một gói hai lần: không nhân đôi chứng từ/mẫu OCR, dữ liệu lương giữ nguyên dấu vân tay", () => {
  const A = machineA(), pkg = FB.create({ dataText: A.store.load().text, vault: A.v, ocrLib: A.lib, destDir: path.join(A.root, "out") });
  const B = machineB(); let counts = [], dig = [];
  for (let i = 0; i < 2; i++) {
    const r = B.rs.stage(pkg.file); assert.equal(r.ok, true, r.error); const c = B.rs.commitAssets(r.rid); assert.equal(c.ok, true, c.error);
    assert.equal(B.store.save(r.text), true); B.live = B.store.load().text; assert.equal(B.rs.postcheck(r.rid).ok, true); B.rs.finish(r.rid);
    counts.push([B.vault.list().length, B.lib.lib.edits().length, JSON.parse(B.live).nhanvien.length]); dig.push(JSON.stringify(DD.digest(JSON.parse(B.live))));
    if (i === 0) { assert.equal(c.docs.added, 2); } else { assert.equal(c.docs.added, 0, "lần 2 không thêm lại chứng từ"); assert.equal(c.ocr.addedSamples, 0, "lần 2 không thêm lại mẫu OCR"); }
  }
  assert.deepEqual(counts[1], counts[0]); assert.equal(dig[1], dig[0]);
  A.store.close(); B.store.close();
});

test("U-XFER-05 hủy khôi phục (gói hỏng) ở B: B không đổi — kho chứng từ + thư viện nguyên, data.sqlite cùng mã băm", () => {
  const A = machineA(), pkg = FB.create({ dataText: A.store.load().text, vault: A.v, ocrLib: A.lib, destDir: path.join(A.root, "out") });
  const B = machineB(); B.store.save(JSON.stringify({ schemaVersion: 2, nhanvien: [{ "Mã NV": "B-CU" }] })); B.store.close();
  const dbB = path.join(B.dir, "data.sqlite"), before = sha(dbB), bad = path.join(B.root, "bad.zip"), buf = Buffer.from(fs.readFileSync(pkg.file));
  buf[Math.floor(buf.length / 2)] ^= 0xFF; fs.writeFileSync(bad, buf);
  const r = B.rs.stage(bad); assert.equal(r.ok, false); assert.equal(B.vault.list().length, 0); assert.equal(B.lib.lib.size(), 0); assert.equal(sha(dbB), before);
  A.store.close();
});
