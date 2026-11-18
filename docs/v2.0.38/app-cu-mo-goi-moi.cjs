// Chạy THẬT app 2.0.35 (giải nén từ tag) mở gói Full Backup mới (có bản chụp SQLite): inspect + stage. Dữ liệu GIẢ.
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const NM = "/home/user/HAK_LUONG_OFFLINE/LuongHAK_Offline";
const { _electron } = require("playwright");
const FB = require(NM + "/main/fullbackup.js");
const { fixture } = require(NM + "/tests/fixtures/production-carry");
const { createStorage } = require("/tmp/old235/LuongHAK_Offline/main/storage.js");
const crypto = require("node:crypto");
const PASS = "OldApp2026";
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "hak-old-")), P = path.join(D, "pkg"); fs.mkdirSync(P);
  const text = JSON.stringify(fixture());
  // gói MỚI do mã hiện tại tạo, kèm bản chụp SQLite
  const { createSqliteStorage } = require(NM + "/main/sqlite-storage.js"); const sd = fs.mkdtempSync(path.join(os.tmpdir(), "hak-new-")), s = createSqliteStorage(sd, {}); s.save(text);
  const sn = s.snapshotForPackage(path.join(sd, "s.sqlite")); const pkg = FB.create({ dataText: s.load().text, destDir: P, sqliteSnapshot: sn }); s.close();
  console.log("gói mới:", pkg.name, "bản chụp:", pkg.sqliteSnapshot, "size", pkg.size);
  // hồ sơ cho app CŨ (JSON) có tài khoản admin
  const salt = crypto.randomBytes(16).toString("hex"), iter = 210000, d = fixture(); d.auditlog = []; d.baomat = []; d.schemaVersion = 2;
  d.nguoidung = [{ id: "ADMIN", tenDangNhap: "admin", hoTen: "Quản trị giả", vaiTro: "admin", khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }];
  const U = path.join(D, "ud"); fs.mkdirSync(U); createStorage(U).save(JSON.stringify(d));
  const app = await _electron.launch({ executablePath: require(NM + "/node_modules/electron"), args: ["--no-sandbox", "/tmp/old235/LuongHAK_Offline"], env: { ...process.env, NODE_PATH: NM + "/node_modules", HAK_USER_DATA: U, HAK_DOWNLOAD_DIR: path.join(D, "dl"), HAK_NO_SHELL: "1", HAK_FB_PICK: path.join(P, pkg.name) } });
  const w = await app.firstWindow(); w.on("dialog", (x) => x.accept());
  console.log("app version:", await app.evaluate(({ app }) => app.getVersion()));
  await w.waitForSelector("#main input[data-f=u]"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  const insp = await w.evaluate(() => window.hakFull.inspect()); console.log("INSPECT ok=", insp.ok, "problems=", JSON.stringify(insp.problems));
  const st = await w.evaluate(() => window.hakFull.stage({})); console.log("STAGE ok=", st.ok, "phases=", JSON.stringify((st.phases || []).map((p) => p.name + ":" + p.ok)), "error=", st.error || "");
  if (st.ok) await w.evaluate((rid) => window.hakFull.discard(rid), st.rid);
  await app.close(); process.exit(insp.ok && st.ok ? 0 : 1);
})().catch((e) => { console.error("LỖI", e.message); process.exit(2); });
