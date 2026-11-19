"use strict";
// 012-B1 (issue #113, CEO /giao 012-B): GÓI KỲ LƯƠNG `.zip` (manifest.json + data.json), tùy chọn mật khẩu → `.hakenc`. Kiểm gói chặt: sai 1 byte / sai SHA / file của app khác → từ chối, tiếng Việt, không ghi dở.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const FB = require("../../main/fullbackup.js"), Z = require("../../main/zip.js"), REPO = require("../../core/repository.js"), P = REPO.period;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-ky-"));
const db = () => ({
  nhanvien: [{ "Mã NV": "A", "Họ và tên": "An" }, { "Mã NV": "B", "Họ và tên": "Bình" }], dm_luong: [{ "Mã lương": "L1", "Số tiền khoán": 100, "Hiệu lực từ": "2026-01-01" }],
  chamcong: [{ "Kỳ": "2026-09", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }, { "Kỳ": "2026-10", "Mã NV": "B", "Hình thức công": "BT", "01": 1 }],
  psluong: [{ "Ngày hạch toán": "2026-09-10", "Số chứng từ": "T1", "Mã NV": "B", "Thưởng": 50 }], kyluong: [], sl_chuyenky: [{ source: "2026-09", target: "2026-10", id: "x2" }], auditlog: [{ t: 1 }], nguoidung: [{ u: "admin" }]
});
const NOW = () => new Date(2026, 10, 19, 7, 5, 9);
const make = (dir, o) => FB.createPeriodPackage(Object.assign({ dir, ky: "2026-09", data: db(), appVersion: "2.0.47", user: "admin", now: NOW }, o || {}));

test("U-KYPKG-01 tạo gói: tên LuongHAK_Ky_YYYY-MM_<ngày-giờ>.zip; manifest loai:'ky' + số dòng + SHA-256 từng bảng + sha tổng; data.json chỉ gồm kỳ + nhân sự/danh mục (không auditlog/nguoidung)", async () => {
  const dir = tmp(), r = await make(dir); assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.name, "LuongHAK_Ky_2026-09_20261119_070509.zip"); assert.ok(fs.existsSync(path.join(dir, r.name)));
  const z = Z.openZip(path.join(dir, r.name)); try {
    assert.deepEqual(Object.keys(z.byName).sort(), ["data.json", "manifest.json"]);
    const m = JSON.parse(z.readBuffer(z.byName["manifest.json"]).toString("utf8")), d = JSON.parse(z.readBuffer(z.byName["data.json"]).toString("utf8"));
    assert.equal(m.loai, "ky"); assert.equal(m.ky, "2026-09"); assert.equal(m.phienBanApp, "2.0.47"); assert.ok(m.tao && m.shaTong); assert.equal(m.soDong["period.chamcong"], 1); assert.equal(m.soDong["global.nhanvien"], 2); assert.match(m.sha256["period.psluong"], /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(Object.keys(d).sort()), JSON.stringify(["global", "ky", "period", "refOnly"])); assert.equal("auditlog" in d.global || "nguoidung" in d.global || "auditlog" in d.period, false);
  } finally { z.close(); }
});
test("U-KYPKG-02 kiểm gói hợp lệ: inspect trả payload dùng được cho P.plan; số dòng và SHA khớp", async () => {
  const dir = tmp(), r = await make(dir), ins = await FB.inspectPeriodPackage(path.join(dir, r.name)); assert.equal(ins.ok, true, JSON.stringify(ins)); assert.equal(ins.manifest.ky, "2026-09");
  const pl = P.plan(db(), ins.payload, "2026-09"); assert.equal(pl.ok, true, JSON.stringify(pl.errors));
});
test("U-KYPKG-03 gói bị sửa 1 byte trong data.json → từ chối (tiếng Việt), không trả payload", async () => {
  const dir = tmp(), r = await make(dir), f = path.join(dir, r.name), buf = fs.readFileSync(f), z = Z.openZip(f); let off; try { const e = z.byName["data.json"]; off = e.offset + 30 + Buffer.byteLength(e.name) + Math.floor(e.csize / 2); } finally { z.close(); }
  buf[off] ^= 0x01; const bad = path.join(dir, "sua.zip"); fs.writeFileSync(bad, buf);
  const ins = await FB.inspectPeriodPackage(bad); assert.equal(ins.ok, false); assert.equal(ins.payload, undefined); assert.match(ins.error, /[Gg]ói|hỏng|sửa|SHA|CRC|giải nén/);
});
test("U-KYPKG-04 manifest sai SHA / sai số dòng / sai kỳ / thiếu trường → từ chối; không ghi dở", async () => {
  const dir = tmp(), ok = await make(dir), src = Z.openZip(path.join(dir, ok.name)); let m, d; try { m = JSON.parse(src.readBuffer(src.byName["manifest.json"]).toString()); d = src.readBuffer(src.byName["data.json"]); } finally { src.close(); }
  const build = (name, mm, dd) => { const f = path.join(dir, name), w = Z.createWriter(f); w.addBuffer("manifest.json", Buffer.from(JSON.stringify(mm))); w.addBuffer("data.json", dd || d); w.finish(); return f; };
  const cases = { "sha.zip": Object.assign({}, m, { sha256: Object.assign({}, m.sha256, { "period.chamcong": "0".repeat(64) }) }), "sodong.zip": Object.assign({}, m, { soDong: Object.assign({}, m.soDong, { "period.chamcong": 99 }) }), "shatong.zip": Object.assign({}, m, { shaTong: "f".repeat(64) }), "ky.zip": Object.assign({}, m, { ky: "2026-10" }), "thieu.zip": { loai: "ky" } };
  for (const k of Object.keys(cases)) { const ins = await FB.inspectPeriodPackage(build(k, cases[k])); assert.equal(ins.ok, false, k); assert.equal(typeof ins.error, "string"); assert.equal(ins.payload, undefined, k); }
});
test("U-KYPKG-05 file của app khác / Full Backup / không phải ZIP / không tồn tại → từ chối", async () => {
  const dir = tmp(), f1 = path.join(dir, "khac.zip"), w = Z.createWriter(f1); w.addBuffer("hello.txt", Buffer.from("x")); w.finish();
  const f2 = path.join(dir, "full.zip"), w2 = Z.createWriter(f2); w2.addBuffer("manifest.json", Buffer.from(JSON.stringify({ format: "HAK-FULL", status: "SUCCESS" }))); w2.addBuffer("data.json", Buffer.from("{}")); w2.finish();
  const f3 = path.join(dir, "text.zip"); fs.writeFileSync(f3, "khong phai zip " + "x".repeat(100));
  for (const f of [f1, f2, f3, path.join(dir, "khong-co.zip")]) { const ins = await FB.inspectPeriodPackage(f); assert.equal(ins.ok, false, f); assert.equal(typeof ins.error, "string"); }
});
test("U-KYPKG-06 mật khẩu: tạo → .hakenc; không mật khẩu → needPassword; sai mật khẩu → wrongPassword; đúng → mở được; mật khẩu yếu bị từ chối khi tạo", async () => {
  const dir = tmp(), r = await make(dir, { password: "Mat-khau-du-dai-2026" }); assert.equal(r.ok, true, JSON.stringify(r)); assert.match(r.name, /^LuongHAK_Ky_2026-09_\d{8}_\d{6}\.hakenc$/); assert.equal(r.encrypted, true);
  assert.equal(fs.readdirSync(dir).filter((x) => /\.zip$/.test(x)).length, 0, "không để lại bản .zip chưa mã hóa");
  const f = path.join(dir, r.name); assert.equal((await FB.inspectPeriodPackage(f)).needPassword, true);
  assert.equal((await FB.inspectPeriodPackage(f, "sai-mat-khau-khac-123")).wrongPassword, true);
  const ok = await FB.inspectPeriodPackage(f, "Mat-khau-du-dai-2026"); assert.equal(ok.ok, true, JSON.stringify(ok)); assert.equal(ok.manifest.ky, "2026-09");
  const weak = await make(tmp(), { password: "123" }); assert.equal(weak.ok, false);
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter((x) => /^hak-ky-.*\.tmp$/.test(x)), []);
});
test("U-KYPKG-07 kỳ sai định dạng / dữ liệu rỗng / thư mục không ghi được → báo lỗi tiếng Việt, không tạo tệp", async () => {
  const dir = tmp(); for (const ky of ["2026-9", "", "abc"]) { const r = await make(dir, { ky }); assert.equal(r.ok, false, ky); assert.equal(typeof r.error, "string"); }
  assert.deepEqual(fs.readdirSync(dir), []);
});
