"use strict";
// Kiểm bộ cài THẬT (NSIS) trên Windows: cài im lặng → chạy app đã cài (không phải thư mục win-unpacked) → nâng cấp JSON→SQLite → lưu/đóng/mở
// → nâng cấp ĐÈ lên bản trước (nếu có) giữ nguyên dữ liệu → gỡ cài giữ dữ liệu người dùng. Dữ liệu GIẢ; thư mục dữ liệu tách riêng (HAK_USER_DATA).
// Chạy: node tests/e2e/installed-setup.cjs --setup <Setup-moi.exe> [--prev <Setup-truoc.exe>]   (chỉ Windows; CI: job windows-setup)
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto"), cp = require("node:child_process");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { fixture } = require("../fixtures/production-carry");
const { createStorage } = require("../../main/storage.js");
const { DatabaseSync } = require("node:sqlite");

const argv = process.argv.slice(2), arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ""; };
const SETUP = path.resolve(arg("--setup") || ""), PREV = arg("--prev") ? path.resolve(arg("--prev")) : "";
const VERSION = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8")).version, PASS = "InstalledSetup2026";
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: extra || "" }); console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? " — " + String(extra).slice(0, 500) : "")); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const account = (user, name, role) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: user.toUpperCase(), tenDangNhap: user, hoTen: name, vaiTro: role, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const seed = () => { const d = fixture(); d.auditlog = []; d.baomat = []; d.schemaVersion = 2; d.sanluong = []; d.chamcong = []; d.nguoidung = [account("admin", "Quản trị giả", "admin")]; return d; };

const killAll = () => { for (const n of ["Tinh Luong HAK.exe"]) { try { cp.execSync('taskkill /IM "' + n + '" /T /F', { stdio: "ignore" }); } catch (e) { /* không có tiến trình */ } } };
function install(setup, dir) { // NSIS im lặng: /S, và /D=<thư mục> PHẢI là tham số cuối, không có dấu nháy
  const r = cp.spawnSync(setup, ["/S", "/D=" + dir], { windowsHide: true, timeout: 300000 });
  return r;
}
async function waitFor(fn, ms, step) { const t0 = Date.now(); for (;;) { try { const v = fn(); if (v) return v; } catch (e) { /* chờ tiếp */ } if (Date.now() - t0 > ms) return null; await sleep(step || 1000); } }
const installedExe = (dir) => { const f = fs.existsSync(dir) ? fs.readdirSync(dir).find((n) => /\.exe$/i.test(n) && !/^uninstall/i.test(n)) : null; return f ? path.join(dir, f) : null; };
const uninstaller = (dir) => { const f = fs.existsSync(dir) ? fs.readdirSync(dir).find((n) => /^uninstall.*\.exe$/i.test(n)) : null; return f ? path.join(dir, f) : null; };

async function launch(exe, dir) {
  const app = await _electron.launch({ executablePath: exe, args: [],
    env: { ...process.env, HAK_USER_DATA: dir, HAK_DOWNLOAD_DIR: path.join(dir, "downloads"), HAK_NO_SHELL: "1", HAK_SQLITE_EXPORT_SYNC: "0", HAK_SQLITE_ADOPT_EXTERNAL: "0", HAK_STORAGE: "" } });
  const w = await app.firstWindow(), errs = [], dialogs = []; w.on("pageerror", (e) => errs.push(e.message)); w.on("dialog", (x) => { dialogs.push(x.message()); x.accept(); });
  await w.waitForSelector("#main > *"); return { app, w, errs, dialogs };
}
async function launchRetry(exe, dir) { let last; for (let i = 0; i < 4; i++) { try { return await launch(exe, dir); } catch (e) { last = e; await sleep(3000); } } throw last; }
const login = async (w) => { await w.waitForSelector("#main input[data-f=u]"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]", { timeout: 60000 }); };
const sqliteNv = (dir) => { const db = new DatabaseSync(path.join(dir, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT json FROM records WHERE tbl='nhanvien'").all().map((r) => JSON.parse(r.json)["Mã NV"]); } finally { db.close(); } };
const tblCount = (dir, tbl) => { const db = new DatabaseSync(path.join(dir, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT COUNT(*) AS c FROM records WHERE tbl = ?").get(tbl).c; } finally { db.close(); } };
const congTyAddr = (dir) => { const db = new DatabaseSync(path.join(dir, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT json FROM records WHERE tbl = 'congty'").all().map((r) => JSON.parse(r.json)["Địa chỉ"]).join("|"); } finally { db.close(); } };
const userVersion = (dir) => { const db = new DatabaseSync(path.join(dir, "data.sqlite"), { readOnly: true }); try { return db.prepare("PRAGMA user_version").get().user_version; } finally { db.close(); } };
const freshData = () => { const D = fs.mkdtempSync(path.join(os.tmpdir(), "hak-inst-data-")); fs.mkdirSync(path.join(D, "downloads")); const base = seed(); createStorage(D).save(JSON.stringify(base)); return { D, n: base.nhanvien.length }; };
const diag = (label, dir) => { try { console.log("DIAG " + label + ": " + fs.readdirSync(dir).filter((f) => /^data\./.test(f) || /^backups$/.test(f)).map((f) => f + "=" + (fs.statSync(path.join(dir, f)).isDirectory() ? "dir" : fs.statSync(path.join(dir, f)).size)).join(", ")); } catch (e) { console.log("DIAG " + label + " lỗi: " + e.message); } };
const jsonNv = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8")).nhanvien.map((x) => x["Mã NV"]); } catch (e) { return ["(lỗi đọc data.json: " + e.message + ")"]; } };
const closeAll = async (app) => { let closed = true; try { await Promise.race([app.close(), sleep(40000).then(() => { throw new Error("app.close() quá 40 giây"); })]); } catch (e) { closed = false; console.log("INFO app.close(): " + e.message); } await sleep(2500); killAll(); await sleep(1500); return closed; };

(async () => {
  if (process.platform !== "win32") { console.log("Bỏ qua: chỉ chạy trên Windows."); process.exit(0); }
  if (!fs.existsSync(SETUP)) { console.error("Thiếu --setup"); process.exit(2); }
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "hak-inst-")), A = path.join(base, "A").replace(/ /g, ""), B = path.join(base, "B").replace(/ /g, "");

  // 1. Cài mới (bản ứng viên)
  let r = install(SETUP, A); killAll();
  const exeA = await waitFor(() => installedExe(A), 120000);
  ok("Cài mới im lặng: có file chạy và trình gỡ cài trong thư mục cài", !!exeA && !!(await waitFor(() => uninstaller(A), 30000)), "exit=" + r.status + " " + (r.error || ""));
  if (!exeA) { console.log("\nKhông cài được — dừng."); process.exit(1); }
  await sleep(3000); killAll();

  // 2. Chạy app ĐÃ CÀI với hồ sơ bản cũ (chỉ data.json): nâng cấp JSON→SQLite, lưu, đóng, mở lại
  const d1 = freshData();
  let s = await launchRetry(exeA, d1.D); await login(s.w);
  const ver = await s.app.evaluate(({ app }) => app.getVersion());
  ok("Bản đã cài đúng phiên bản của bản ứng viên", ver === VERSION, ver + " ≠ " + VERSION);
  ok("Nâng cấp JSON→SQLite trong bản đã cài: có data.sqlite, schema v2, đủ nhân viên", fs.existsSync(path.join(d1.D, "data.sqlite")) && userVersion(d1.D) === 2 && sqliteNv(d1.D).length === d1.n);
  // Lưu bền qua thao tác giao diện THẬT (Công ty & Sao lưu → Hồ sơ công ty → Lưu): SQLite phải thấy bản ghi NGAY (chờ theo trạng thái, tối đa 8 s) — đường ghi bền của bản đã cài.
  const uiSave = async (addr) => {
    await s.w.click("#nav button[data-k=backup]"); await s.w.waitForSelector('.fld[data-k="Địa chỉ"] input');
    await s.w.fill('.fld[data-k="Địa chỉ"] input', addr); await s.w.click('button:has-text("Lưu hồ sơ công ty")');
    return waitFor(() => congTyAddr(d1.D) === addr, 8000, 200);
  };
  ok("Lưu qua GIAO DIỆN thật trong bản đã cài: SQLite thấy bản ghi ngay (không chờ đóng app)", !!(await uiSave("1 Đường Thử Nghiệm")), "sqlite: " + congTyAddr(d1.D));
  // Lần lưu thứ hai qua giao diện: chứng minh giao diện KHÔNG bị coi là bản cũ sau lần ghi đầu (bản nền được làm mới), không hộp thoại 'nơi khác'.
  ok("Lưu lần hai qua giao diện: vẫn được nhận (bản nền làm mới), không hộp thoại 'thay đổi ở nơi khác'", !!(await uiSave("2 Đường Thử Nghiệm")) && !s.dialogs.some((m) => /thay đổi ở nơi khác/.test(m)), "sqlite: " + congTyAddr(d1.D) + " | " + JSON.stringify(s.dialogs).slice(0, 100));
  // Giao thức: bản nền ĐÚNG được nhận, bản nền SAI bị từ chối; dùng đúng văn bản đang lưu nên kho không đổi phiên bản.
  const sigNow = await s.w.evaluate(() => window.hakStore.sig());
  const same = await s.w.evaluate(() => window.hakStore.save(window.hakStore.load().text, window.hakStore.sig()));
  ok("IPC trong bản đã cài: bản nền đúng → true", same === true, String(same));
  const bad = await s.w.evaluate(() => window.hakStore.save(window.hakStore.load().text, "sqlite:999999"));
  ok("IPC trong bản đã cài: bản nền sai → 'STALE_BASE'", typeof bad === "string" && /^STALE_BASE/.test(bad), String(bad));
  ok("Phiên bản kho không đổi sau hai lệnh IPC trên (giao diện vẫn đồng bộ)", (await s.w.evaluate(() => window.hakStore.sig())) === sigNow, sigNow);
  ok("Không lỗi JavaScript ở giao diện bản đã cài", s.errs.length === 0, s.errs.join(" | "));
  // Tính bền qua đóng/mở: dữ liệu do CHÍNH giao diện ghi (nhật ký đăng nhập) phải còn sau khi đóng bình thường, ở cả SQLite và data.json
  const closed1 = await closeAll(s.app); diag("sau đóng lần 1 (app.close " + (closed1 ? "ok" : "KHÔNG ok") + ")", d1.D);
  const audit1 = tblCount(d1.D, "auditlog");
  ok("Đóng bình thường: giao diện ghi nhật ký đăng nhập vào SQLite (ghi do giao diện)", audit1 >= 1, "auditlog=" + audit1);
  ok("Đóng bình thường: bản ghi lưu qua giao diện CÒN NGUYÊN trong SQLite và giao diện không hỏi 'nơi khác' khi đóng", congTyAddr(d1.D) === "2 Đường Thử Nghiệm" && !s.dialogs.some((m) => /thay đổi ở nơi khác/.test(m)), congTyAddr(d1.D) + " | " + JSON.stringify(s.dialogs).slice(0, 100));
  ok("Đóng bình thường: data.json được xuất, khớp số nhật ký và đủ nhân viên", (() => { try { const j = JSON.parse(fs.readFileSync(path.join(d1.D, "data.json"), "utf8")); return j.auditlog.length === audit1 && j.nhanvien.length >= d1.n; } catch (e) { return false; } })());
  for (const f of fs.readdirSync(d1.D).filter((x) => /^Singleton/.test(x))) fs.rmSync(path.join(d1.D, f), { force: true });
  s = await launchRetry(exeA, d1.D); await login(s.w);
  const again = await s.w.evaluate(() => { const r = window.hakStore.load(); if (!r.ok) return { err: r.error }; const d = JSON.parse(r.text); return { nv: d.nhanvien.length, audit: d.auditlog.length }; });
  ok("Mở lại bản đã cài: đủ nhân viên và nhật ký cũ", !again.err && again.nv >= d1.n && again.audit >= audit1, JSON.stringify(again));
  await closeAll(s.app);
  ok("Sau lần mở/đóng thứ hai: nhật ký tăng (ghi do giao diện vẫn bền)", tblCount(d1.D, "auditlog") > audit1, "trước " + audit1 + ", sau " + tblCount(d1.D, "auditlog"));

  // 3. Nâng cấp ĐÈ lên bản trước đã phát hành (nếu CI cung cấp)
  let lastDir = A;
  if (PREV) {
    const rp = install(PREV, B); killAll();
    const exeB0 = await waitFor(() => installedExe(B), 120000);
    ok("Cài bản trước đã phát hành (để thử nâng cấp đè)", !!exeB0, "exit=" + rp.status);
    if (exeB0) {
      lastDir = B; await sleep(3000); killAll();
      const d2 = freshData(); let p = await launchRetry(exeB0, d2.D); await login(p.w);
      const closed2 = await closeAll(p.app); diag("sau đóng bản trước (app.close " + (closed2 ? "ok" : "KHÔNG ok") + ")", d2.D);
      const n1 = fs.existsSync(path.join(d2.D, "data.sqlite")) ? tblCount(d2.D, "auditlog") : -1;
      ok("Bản trước đã lưu hồ sơ của nó (nhật ký ≥ 1, dữ liệu SQLite)", n1 >= 1, "auditlog=" + n1);
      const ru = install(SETUP, B); killAll(); await sleep(5000); killAll();
      ok("Cài đè bản ứng viên lên bản trước, cùng thư mục", ru.status === 0 || ru.status === null || !!installedExe(B), "exit=" + ru.status);
      for (const f of fs.readdirSync(d2.D).filter((x) => /^Singleton/.test(x))) fs.rmSync(path.join(d2.D, f), { force: true });
      const exeB = installedExe(B); p = await launchRetry(exeB, d2.D); await login(p.w);
      const v2 = await p.app.evaluate(({ app }) => app.getVersion());
      ok("Sau nâng cấp đè: đúng phiên bản mới", v2 === VERSION, v2);
      const after = await p.w.evaluate(() => { const r = window.hakStore.load(); if (!r.ok) return { err: r.error }; const d = JSON.parse(r.text); return { nv: d.nhanvien.length, audit: d.auditlog.length }; });
      ok("Sau nâng cấp đè: dữ liệu bản trước còn nguyên (nhân viên, nhật ký)", !after.err && after.nv >= d2.n && after.audit >= n1, JSON.stringify(after) + " / trước: nhật ký " + n1);
      ok("Sau nâng cấp đè: kho SQLite schema v2", userVersion(d2.D) === 2);
      ok("Sau nâng cấp đè: không lỗi JavaScript", p.errs.length === 0, p.errs.join(" | "));
      await closeAll(p.app);
      ok("Sau nâng cấp đè + đóng: nhật ký tăng (bản mới ghi bền trên hồ sơ bản trước)", tblCount(d2.D, "auditlog") > n1, "trước " + n1 + ", sau " + tblCount(d2.D, "auditlog"));
    }
  } else console.log("INFO Không có bản trước để thử nâng cấp đè (chưa có release nào).");

  // 4. Gỡ cài: xóa chương trình, GIỮ dữ liệu người dùng
  // Lưu ý: cài bản khác thư mục cho CÙNG ứng dụng làm NSIS tự gỡ bản đã cài trước đó (thư mục A biến mất) — gỡ cài thử ở thư mục còn lại.
  if (PREV) ok("Cài sang thư mục khác: NSIS gỡ bản cũ ở thư mục đầu (cùng một ứng dụng)", !installedExe(A), "còn: " + (fs.existsSync(A) ? fs.readdirSync(A).join(",") : "(đã xóa)"));
  const un = uninstaller(lastDir);
  let ur = null;
  if (un) { ur = cp.spawnSync(un, ["/S", "_?=" + lastDir], { windowsHide: true, timeout: 180000 }); await waitFor(() => !installedExe(lastDir), 60000, 2000); }
  console.log("DIAG gỡ cài: exit=" + (ur && ur.status) + "; còn lại: " + (fs.existsSync(lastDir) ? fs.readdirSync(lastDir).join(", ") : "(thư mục đã xóa)"));
  ok("Gỡ cài im lặng: file chạy chính đã bị xóa", !!un && !installedExe(lastDir));
  ok("Gỡ cài KHÔNG xóa dữ liệu người dùng (thư mục dữ liệu riêng)", fs.existsSync(path.join(d1.D, "data.sqlite")) && fs.existsSync(path.join(d1.D, "data.json")));

  const fail = results.filter((x) => !x.pass).length;
  console.log("\nBộ cài thật E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); killAll(); process.exit(2); });
