"use strict";
// Chế độ THẬT của kho SQLite (mặc định từ v2.0.29), KHÔNG dùng cờ nghiệm thu HAK_SQLITE_EXPORT_SYNC / HAK_SQLITE_ADOPT_EXTERNAL:
//  nâng cấp từ data.json có sẵn · lưu qua IPC thật (có kiểm quyền) · SQLite có dữ liệu trước khi data.json được xuất · bị kill sau khi lưu · đóng/mở lại ·
//  data.json bị thay ngoài app · quay lui bằng HAK_STORAGE=json. Dữ liệu giả. Chạy: node tests/e2e/sqlite-default.cjs (Linux: xvfb-run -a …).
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { fixture } = require("../fixtures/production-carry");
const { createStorage } = require("../../main/storage.js");
const { DatabaseSync } = require("node:sqlite");
const APP = path.resolve(__dirname, "../.."), PASS = "SqliteDefault2026";
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: extra || "" }); console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? " — " + String(extra).slice(0, 400) : "")); };
const account = (user, name, role) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: user.toUpperCase(), tenDangNhap: user, hoTen: name, vaiTro: role, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const seed = () => { const d = fixture(); d.auditlog = []; d.baomat = []; d.schemaVersion = 2; d.sanluong = []; d.chamcong = []; d.nguoidung = [account("admin", "Quản trị giả", "admin")]; return d; };
async function launch(dir, env) {
  const app = await _electron.launch({ executablePath: require("electron"), args: ["--no-sandbox", APP],
    env: { ...process.env, HAK_USER_DATA: dir, HAK_DOWNLOAD_DIR: path.join(dir, "downloads"), HAK_NO_SHELL: "1", HAK_SQLITE_EXPORT_SYNC: "0", HAK_SQLITE_ADOPT_EXTERNAL: "0", HAK_STORAGE: "", ...(env || {}) } });
  const w = await app.firstWindow(), errs = []; w.on("pageerror", (e) => errs.push(e.message)); w.on("dialog", (x) => x.accept());
  await w.waitForSelector("#main > *"); return { app, w, errs };
}
const login = async (w) => { await w.waitForSelector("#main input[data-f=u]"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]"); };
const readJson = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8"));
const sqliteNv = (dir) => { const db = new DatabaseSync(path.join(dir, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT json FROM records WHERE tbl='nhanvien'").all().map((r) => JSON.parse(r.json)["Mã NV"]); } finally { db.close(); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Kill đột ngột như mất điện/tắt tiến trình. Windows: kill cả cây tiến trình (renderer/GPU còn giữ khóa thư mục Cache của lần chạy trước nếu chỉ kill tiến trình chính) rồi chờ khóa nhả.
async function killHard(app) {
  const pid = app.process().pid;
  if (process.platform === "win32") { try { require("node:child_process").execSync("taskkill /PID " + pid + " /T /F", { stdio: "ignore" }); } catch (e) { /* đã thoát */ } await sleep(4000); }
  else { process.kill(pid, "SIGKILL"); await sleep(1500); }
}
async function launchRetry(dir, env) { // sau kill cứng, Windows có thể còn khóa tạm: thử lại vài lần thay vì coi là lỗi ứng dụng
  let last; for (let i = 0; i < 4; i++) { try { return await launch(dir, env); } catch (e) { last = e; await sleep(3000); } } throw last;
}
async function saveViaIpc(w, mutate) { // lưu qua IPC thật (kiểm quyền + write-policy + kho), như giao diện làm
  return w.evaluate((src) => { const r = window.hakStore.load(); const d = JSON.parse(r.text); (new Function("d", src))(d); return window.hakStore.save(JSON.stringify(d)); }, mutate);
}
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "hak-sqdef-")); fs.mkdirSync(path.join(D, "downloads"));
  // 1. Hồ sơ của bản cũ: chỉ có data.json
  const base = seed(); createStorage(D).save(JSON.stringify(base)); const nv0 = base.nhanvien.length;
  ok("Bản cũ: chỉ có data.json, chưa có data.sqlite", fs.existsSync(path.join(D, "data.json")) && !fs.existsSync(path.join(D, "data.sqlite")));
  let { app, w, errs } = await launch(D); await login(w);
  ok("Nâng cấp lần đầu: tạo data.sqlite, có bản sao lưu 'truoc-chuyen-sqlite', ghi chú nguồn chính", fs.existsSync(path.join(D, "data.sqlite")) && fs.readdirSync(path.join(D, "backups")).some((f) => /truoc-chuyen-sqlite/.test(f)) && /data\.sqlite/.test(fs.readFileSync(path.join(D, "hak-storage.txt"), "utf8")));
  ok("Dữ liệu sau nâng cấp đủ: số nhân viên và tài khoản giữ nguyên", sqliteNv(D).length === nv0 && (await w.evaluate(() => JSON.parse(window.hakStore.load().text).nguoidung.length)) === 1);
  // 2. Lưu qua IPC thật: SQLite có ngay, data.json xuất trễ
  const saved = await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0099','Họ và tên':'Nguyễn Văn Ánh','Trạng thái':'Đang làm việc'});");
  ok("Lưu qua IPC thật (kiểm quyền + chính sách ghi) trả true", saved === true, String(saved));
  ok("SQLite có 0099 ngay sau khi lưu (không chờ xuất data.json)", sqliteNv(D).includes("0099"));
  await sleep(4500); ok("Sau nhịp xuất, data.json có 0099 (bản xuất đủ giao dịch)", readJson(D).nhanvien.some((r) => r["Mã NV"] === "0099"));
  // 3. Kill ngay sau khi lưu (trước nhịp xuất)
  await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0100','Họ và tên':'Trước khi bị kill'});");
  await killHard(app);
  ok("Bị kill ngay sau khi lưu: data.json còn cũ nhưng SQLite đã có 0100", !readJson(D).nhanvien.some((r) => r["Mã NV"] === "0100") && sqliteNv(D).includes("0100"));
  for (const f of fs.readdirSync(D).filter((x) => /^Singleton/.test(x))) fs.rmSync(path.join(D, f), { force: true });
  ({ app, w, errs } = await launchRetry(D)); await login(w);
  ok("Mở lại sau kill: thấy đủ 0099 và 0100; data.json được xuất lại", (await w.evaluate(() => JSON.parse(window.hakStore.load().text).nhanvien.map((r) => r["Mã NV"]))).filter((m) => /^0(099|100)$/.test(m)).length === 2 && (await (async () => { await sleep(500); return readJson(D).nhanvien.some((r) => r["Mã NV"] === "0100"); })()));
  ok("Không lỗi JavaScript ở giao diện", errs.length === 0, errs.join(" | "));
  // 4. Đóng bình thường rồi data.json bị thay ngoài app
  await app.close(); const before = fs.readFileSync(path.join(D, "data.json"), "utf8");
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify({ nhanvien: [{ "Mã NV": "LẠ" }] }));
  ({ app, w, errs } = await launch(D)); const conflict = await w.evaluate(() => window.hakStore.load());
  ok("data.json bị thay ngoài app: app KHÔNG đoán, báo xung đột (ok:false) và không ghi đè", conflict.ok === false && /không phải bản xuất gần nhất của kho SQLite/.test(conflict.error) && JSON.parse(fs.readFileSync(path.join(D, "data.json"), "utf8")).nhanvien[0]["Mã NV"] === "LẠ");
  await app.close().catch(() => {}); fs.writeFileSync(path.join(D, "data.json"), before); // trả lại bản xuất đúng
  // 5. Quay lui: HAK_STORAGE=json đọc đúng bản xuất
  ({ app, w, errs } = await launch(D, { HAK_STORAGE: "json" })); const rb = await w.evaluate(() => JSON.parse(window.hakStore.load().text).nhanvien.map((r) => r["Mã NV"]));
  ok("Quay lui HAK_STORAGE=json: đọc được data.json đã xuất, đủ 0099 và 0100", rb.includes("0099") && rb.includes("0100"));
  await app.close();
  // 6. data.sqlite bị hỏng → màn hình khôi phục → khôi phục TỪ BẢN CHỤP SQLite (chỉ đạo 002)
  ({ app, w, errs } = await launch(D)); await login(w);
  const bk = await w.evaluate(() => window.hakStore.backup("thu-ban-chup")); // sao lưu JSON thành công → app ghi backups/data-snapshot.sqlite
  const snapFile = path.join(D, "backups", "data-snapshot.sqlite");
  ok("Sao lưu thành công và có bản chụp SQLite", !!bk && fs.existsSync(snapFile));
  const nvSnap = sqliteNv(D).length;
  await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0101','Họ và tên':'Sau bản chụp'});");
  ok("Có thêm 0101 SAU bản chụp (bản chụp không có)", sqliteNv(D).includes("0101") && sqliteNv(D).length === nvSnap + 1);
  await app.close(); await sleep(500);
  const goodDb = fs.readFileSync(path.join(D, "data.sqlite")); fs.truncateSync(path.join(D, "data.sqlite"), 200); for (const x of ["-wal", "-shm"]) fs.rmSync(path.join(D, "data.sqlite" + x), { force: true });
  ({ app, w, errs } = await launch(D));
  const recBtn = 'button:has-text("Khôi phục từ bản chụp SQLite")';
  await w.waitForSelector(recBtn, { timeout: 15000 });
  ok("data.sqlite hỏng: màn hình khôi phục hiện nút khôi phục từ bản chụp (bản chụp đã kiểm hợp lệ)", (await w.locator("[data-snapshot=ok]").count()) === 1 && /Không mở được kho dữ liệu SQLite/.test(await w.locator("#main").innerText()));
  const dlg = []; w.removeAllListeners("dialog"); w.on("dialog", (x) => { dlg.push(x.message().slice(0, 300)); x.accept().catch(() => {}); }); // ghi lại thông báo để chẩn đoán nếu khôi phục không thành
  await w.click(recBtn);
  try { await w.waitForSelector("#main input[data-f=u]", { timeout: 20000 }); } catch (e) { console.log("HỘP THOẠI: " + JSON.stringify(dlg) + " | thư mục: " + fs.readdirSync(D).join(",")); throw e; }
  await login(w);
  const nvAfter = sqliteNv(D);
  ok("Khôi phục xong: dữ liệu = bản chụp (đủ 0099/0100, KHÔNG có 0101), số nhân viên đúng", nvAfter.length === nvSnap && nvAfter.includes("0100") && !nvAfter.includes("0101"), nvAfter.length + "/" + nvSnap);
  ok("Bản data.sqlite hỏng được cất, data.json cũ cũng được cất", fs.readdirSync(D).some((f) => /^data\.sqlite\.truoc-khoi-phuc-/.test(f)) && fs.readdirSync(D).some((f) => /^data\.json\.truoc-khoi-phuc-/.test(f)) && !fs.existsSync(path.join(D, "data.sqlite.restore-pending")));
  const aud = await w.evaluate(() => JSON.parse(window.hakStore.load().text).auditlog.filter((x) => x.thaoTac === "Khôi phục từ bản chụp SQLite").length);
  ok("Nhật ký kiểm toán có đúng 1 dòng 'Khôi phục từ bản chụp SQLite'", aud === 1, String(aud));
  const savedAgain = await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0102','Họ và tên':'Sau khôi phục'});");
  ok("Ghi tiếp sau khôi phục được; không lỗi JavaScript", savedAgain === true && sqliteNv(D).includes("0102") && errs.length === 0, String(savedAgain) + " " + errs.join("|"));
  await app.close(); void goodDb;
  // 8. Hai phiên app cùng một thư mục dữ liệu (chỉ đạo 003, kịch bản 5): phiên sau bị chặn, phiên đầu không bị ảnh hưởng, không ai ghi chồng
  ({ app, w, errs } = await launch(D)); await login(w);
  const lockFile = path.join(D, "data.sqlite.lock"), firstPid = JSON.parse(fs.readFileSync(lockFile, "utf8")).pid;
  const second = require("node:child_process").spawn(require("electron"), ["--no-sandbox", APP], { env: { ...process.env, HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: path.join(D, "downloads"), HAK_NO_SHELL: "1", HAK_SQLITE_EXPORT_SYNC: "0", HAK_SQLITE_ADOPT_EXTERNAL: "0", HAK_STORAGE: "" }, stdio: "ignore" });
  const secondExit = await new Promise((res) => { const t = setTimeout(() => { try { second.kill("SIGKILL"); } catch (e) { /* đã thoát */ } res("hết giờ"); }, 30000); second.on("exit", (c, sg) => { clearTimeout(t); res("thoát mã " + c + (sg ? " " + sg : "")); }); });
  ok("Phiên thứ hai cùng thư mục dữ liệu bị chặn: tự thoát (không mở cửa sổ ghi chồng)", /^thoát/.test(secondExit), secondExit);
  ok("Khóa phiên ghi vẫn của phiên đầu; phiên đầu vẫn lưu được; không lỗi JavaScript", JSON.parse(fs.readFileSync(lockFile, "utf8")).pid === firstPid && (await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0105','Họ và tên':'Sau khi phiên hai bị chặn'});")) === true && sqliteNv(D).includes("0105") && errs.length === 0, String(errs.join("|")));
  await app.close();
  const fail = results.filter((r) => !r.pass).length;
  console.log("\nSQLite chế độ thật E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); process.exit(2); });
