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
  // 7. Full Backup có bản chụp SQLite → data.sqlite hỏng → khôi phục TỪ BẢN CHỤP TRONG GÓI (chỉ đạo 002b)
  ({ app, w, errs } = await launch(D)); await login(w);
  const fbr = await w.evaluate(() => window.hakFull.create({}));
  const FBM = require("../../main/fullbackup"), pkgFile = fbr && fbr.dir && fbr.name ? path.join(fbr.dir, fbr.name) : "", rep = pkgFile ? FBM.inspect(pkgFile) : { ok: false, sqlite: null };
  ok("Full Backup tạo thành công và có bản chụp SQLite hợp lệ trong gói (manifest.sqliteSnapshot, SHA-256, số dòng khớp data.json)", !!(fbr && fbr.ok === true) && rep.ok === true && !!rep.sqlite && rep.sqlite.ok === true, JSON.stringify(fbr).slice(0, 300) + " " + JSON.stringify(rep.sqlite));
  const nvPkg = sqliteNv(D).length;
  await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0103','Họ và tên':'Sau khi tạo gói'});");
  await app.close(); await sleep(500);
  fs.truncateSync(path.join(D, "data.sqlite"), 200); for (const x of ["-wal", "-shm"]) fs.rmSync(path.join(D, "data.sqlite" + x), { force: true });
  ({ app, w, errs } = await launch(D, { HAK_FB_PICK: pkgFile }));
  const pkgBtn = 'button:has-text("Khôi phục từ gói Full Backup")';
  await w.waitForSelector(pkgBtn, { timeout: 15000 });
  const dlg2 = []; w.removeAllListeners("dialog"); w.on("dialog", (x) => { dlg2.push(x.message().slice(0, 300)); x.accept().catch(() => {}); });
  await w.click(pkgBtn);
  try { await w.waitForSelector("#main input[data-f=u]", { timeout: 20000 }); } catch (e) { console.log("HỘP THOẠI: " + JSON.stringify(dlg2) + " | thư mục: " + fs.readdirSync(D).join(",")); throw e; }
  await login(w);
  const nvAfterPkg = sqliteNv(D);
  ok("Khôi phục từ gói: dữ liệu = lúc tạo gói (có 0102, KHÔNG có 0103), số nhân viên đúng", nvAfterPkg.length === nvPkg && nvAfterPkg.includes("0102") && !nvAfterPkg.includes("0103"), nvAfterPkg.length + "/" + nvPkg);
  const aud2 = await w.evaluate(() => JSON.parse(window.hakStore.load().text).auditlog.filter((x) => x.thaoTac === "Khôi phục từ bản chụp SQLite" && /gói LuongHAK_FullBackup_/.test(x.chiTiet)).length);
  ok("Nhật ký ghi nguồn là gói Full Backup; ghi tiếp được; không lỗi JavaScript", aud2 === 1 && (await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0104','Họ và tên':'Sau khôi phục từ gói'});")) === true && errs.length === 0, aud2 + " " + errs.join("|"));
  await app.close();
  // 8. Hai phiên app cùng một thư mục dữ liệu (chỉ đạo 003, kịch bản 5): phiên sau bị chặn, phiên đầu không bị ảnh hưởng, không ai ghi chồng
  ({ app, w, errs } = await launch(D)); await login(w);
  const lockFile = path.join(D, "data.sqlite.lock"), firstPid = JSON.parse(fs.readFileSync(lockFile, "utf8")).pid;
  const second = require("node:child_process").spawn(require("electron"), ["--no-sandbox", APP], { env: { ...process.env, HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: path.join(D, "downloads"), HAK_NO_SHELL: "1", HAK_SQLITE_EXPORT_SYNC: "0", HAK_SQLITE_ADOPT_EXTERNAL: "0", HAK_STORAGE: "" }, stdio: "ignore" });
  const secondExit = await new Promise((res) => { const t = setTimeout(() => { try { second.kill("SIGKILL"); } catch (e) { /* đã thoát */ } res("hết giờ"); }, 30000); second.on("exit", (c, sg) => { clearTimeout(t); res("thoát mã " + c + (sg ? " " + sg : "")); }); });
  ok("Phiên thứ hai cùng thư mục dữ liệu bị chặn: tự thoát (không mở cửa sổ ghi chồng)", /^thoát/.test(secondExit), secondExit);
  ok("Khóa phiên ghi vẫn của phiên đầu; phiên đầu vẫn lưu được; không lỗi JavaScript", JSON.parse(fs.readFileSync(lockFile, "utf8")).pid === firstPid && (await saveViaIpc(w, "d.nhanvien.push({'Mã NV':'0105','Họ và tên':'Sau khi phiên hai bị chặn'});")) === true && sqliteNv(D).includes("0105") && errs.length === 0, String(errs.join("|")));
  await app.close();
  // 9. Nhập Excel NHIỀU KỲ trên giao diện thật, mọi bảng nhập liệu theo tháng (chỉ đạo 004, mục 1): kỳ mở nhận, kỳ đã chốt bị chặn có thông báo, nhập lại không nhân đôi
  {
    const CLS = require("../../core/payroll-close.js"), ExcelJS = require(path.join(APP, "exceljs.min.js")), V = require("../../core/validate.js");
    const D9 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-impk-")); fs.mkdirSync(path.join(D9, "downloads"));
    const d9 = seed(); CLS.close(d9, CLS.buildSnapshot(d9, "2026-08", { bangluong: [{ "Mã NV": "A", "Họ và tên": "A", "Thực lĩnh": 1, "Tổng thu nhập": 1 }], bhxh: [], tncn: [], canhbao: [] }, []));
    d9.nhanvien.push({ "Mã NV": "NVNGHI", "Họ và tên": "Đã nghỉ (giả)", "Trạng thái": "Đã nghỉ việc" });
    createStorage(D9).save(JSON.stringify(d9));
    const SPEC = { // bảng → { cột của file, hàm tạo dòng theo kỳ + tag }
      chamcong: { cols: ["Kỳ", "Mã NV", "Hình thức công", "01", "02"], row: (ky, tag) => [ky, tag, "BT", 1, 1] },
      sanluong: { cols: ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV"], row: (ky, tag) => ["PC" + ky + tag, ky + "-12", "51C-1", 10, tag] },
      bandam: { cols: ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV"], row: (ky, tag) => ["BD" + ky + tag, ky + "-12", "51C-2", 8, tag] },
      psluong: { cols: ["Ngày hạch toán", "Số chứng từ", "Mã NV", "Thưởng"], row: (ky, tag) => [ky + "-12", "PS" + ky + tag, tag, 100000] },
      ungluong: { cols: ["Ngày hạch toán", "Số chứng từ", "Mã NV", "Tạm ứng"], row: (ky, tag) => [ky + "-12", "UL" + ky + tag, tag, 500000] },
      tiencom: { cols: ["Ngày", "Mã NV", "Số suất cơm"], row: (ky, tag) => [ky + "-12", tag, 1] }
    };
    ({ app, w, errs } = await launch(D9)); await login(w);
    const rowsOf = async (t) => w.evaluate((tb) => (JSON.parse(window.hakStore.load().text)[tb] || []), t);
    for (const t of Object.keys(SPEC)) {
      const sp = SPEC[t], wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Du lieu"), xf = path.join(D9, "nhieu-ky-" + t + ".xlsx");
      ws.getRow(1).values = sp.cols; [["2026-08", "A"], ["2026-10", "A"], ["2026-10", "B"]].forEach(([ky, tag], i) => { ws.getRow(2 + i).values = sp.row(ky, tag); });
      fs.writeFileSync(xf, new Uint8Array(await wb.xlsx.writeBuffer()));
      const importOnce = async () => { await w.click("#nav button[data-k=" + t + "]"); if (t === "bandam") { const direct = w.getByRole("button", { name: "Phân bổ trực tiếp nhân viên", exact: true }); if (await direct.count()) await direct.click(); } // Ban dăm: chọn cách phân bổ TRỰC TIẾP (file có Mã NV)
       const [fc] = await Promise.all([w.waitForEvent("filechooser"), w.locator('#main button:has-text("Nhập Excel")').first().click()]); await fc.setFiles(xf); await w.waitForSelector(".dlg", { timeout: 15000 }); return w.locator(".dlg").innerText(); };
      const prev = await importOnce();
      ok(t + ": xem trước nhận 2 dòng kỳ mở và CHẶN 1 dòng kỳ đã chốt (có thông báo)", /Ghi 2 dòng/.test(prev) && /đã chốt/i.test(prev), prev.slice(0, 500));
      await w.click('.dlg button:has-text("Ghi 2 dòng")'); await w.waitForSelector(".dlg", { state: "detached", timeout: 15000 }).catch(() => {});
      let got = await rowsOf(t), per = got.map((r) => V.rowPeriod(t, r));
      ok(t + ": ghi đúng 2 dòng kỳ mở (2026-10), KHÔNG có dòng nào của kỳ đã chốt 2026-08", got.length === 2 && per.every((k) => k === "2026-10"), JSON.stringify(per));
      const prev2 = await importOnce();
      ok(t + ": nhập lại cùng file — không còn dòng để ghi, không nhân đôi", /Không có dòng nào để ghi/.test(prev2), prev2.slice(0, 300));
      await w.click('.dlg button:has-text("Hủy")'); got = await rowsOf(t);
      ok(t + ": sau nhập lại vẫn đúng 2 dòng; bản chốt 2026-08 còn nguyên", got.length === 2 && (await w.evaluate(() => JSON.parse(window.hakStore.load().text).kyluong.map((k) => k.ky))).join() === "2026-08");
    }
    { // 009-1/2/3 (issue #98): chữ ở "Số suất cơm" bị CHẶN có thông báo dòng/cột/giá trị; NV đã nghỉ và số tiền âm chỉ CẢNH BÁO (vẫn ghi sau khi xác nhận)
      const wbx = new ExcelJS.Workbook(), wsx = wbx.addWorksheet("Du lieu"), xfx = path.join(D9, "loi-suat-com.xlsx");
      wsx.getRow(1).values = ["Ngày", "Mã NV", "Số suất cơm"]; wsx.getRow(2).values = ["2026-10-20", "A", 2]; wsx.getRow(3).values = ["2026-10-21", "B", "hai"]; wsx.getRow(4).values = ["2026-10-22", "NVNGHI", 1];
      await w.click("#nav button[data-k=tiencom]");
      const [fx] = await Promise.all([w.waitForEvent("filechooser"), w.locator('#main button:has-text("Nhập Excel")').first().click()]); await fx.setFiles((fs.writeFileSync(xfx, new Uint8Array(await wbx.xlsx.writeBuffer())), xfx)); await w.waitForSelector(".dlg", { timeout: 15000 });
      const pv = (await w.locator(".dlg").innerText()).replace(/\s+/g, " ");
      ok("Suất cơm 'hai': xem trước CHẶN dòng 3, nêu cột + giá trị + cách sửa; 2 dòng còn lại ghi được", /Ghi 2 dòng/.test(pv) && /Số suất cơm: phải là số/.test(pv) && /"hai"/.test(pv), pv.slice(0, 600));
      ok("NV đã nghỉ việc: cảnh báo 'kiểm lại' ở bản xem trước (không chặn)", /NV đã nghỉ việc: kiểm lại/.test(pv), pv.slice(0, 600));
      const before = (await rowsOf("tiencom")).length; await w.click('.dlg button:has-text("Ghi 2 dòng")'); await w.waitForSelector(".dlg", { state: "detached", timeout: 15000 }).catch(() => {});
      const after = await rowsOf("tiencom");
      ok("Suất cơm: ghi đúng 2 dòng, dòng 'hai' KHÔNG vào dữ liệu, dòng NV đã nghỉ vẫn được ghi sau xác nhận", after.length === before + 2 && !after.some((r) => String(r["Số suất cơm"]) === "hai") && after.some((r) => r["Mã NV"] === "NVNGHI"), JSON.stringify(after.map((r) => [r["Mã NV"], r["Số suất cơm"]])));
    }
    { // 009-B (issue #98): cột "Cách sửa", đối chiếu với file nguồn, tải file lỗi để sửa rồi nhập lại
      const wb2 = new ExcelJS.Workbook(), ws2 = wb2.addWorksheet("Du lieu"), xf2 = path.join(D9, "loi-doi-chieu.xlsx");
      ws2.getRow(1).values = ["Ngày", "Mã NV", "Số suất cơm"]; ws2.getRow(2).values = ["2026-10-25", "A", 2]; ws2.getRow(3).values = ["2026-10-26", "B", "hai"]; ws2.getRow(4).values = ["2026-10-27", "KHONGCO", 1];
      await w.click("#nav button[data-k=tiencom]");
      const [f2] = await Promise.all([w.waitForEvent("filechooser"), w.locator('#main button:has-text("Nhập Excel")').first().click()]); await f2.setFiles((fs.writeFileSync(xf2, new Uint8Array(await wb2.xlsx.writeBuffer())), xf2)); await w.waitForSelector(".dlg", { timeout: 15000 });
      const pv2 = (await w.locator(".dlg").innerText()).replace(/\s+/g, " ");
      ok("Xem trước: có cột 'Cách sửa' nêu việc cần làm cho dòng chữ ở Số suất cơm và mã NV lạ", /Cách sửa/.test(pv2) && /Nhập số \(ví dụ 2/.test(pv2) && /Thêm nhân viên này ở màn Nhân sự/.test(pv2), pv2.slice(0, 700));
      ok("Xem trước: bảng 'Đối chiếu với file nguồn' — 3 dòng trong file, tổng suất cơm \"file 3 = ghi 2 + gộp 0 + không ghi 1\"", /Đối chiếu với file nguồn/.test(pv2) && /Dòng trong file/.test(pv2) && /Số suất cơm: file 3 = ghi 2 \+ gộp 0 \+ không ghi 1/.test(pv2), pv2.slice(0, 900));
      const dl2 = path.join(D9, "downloads"), had2 = fs.existsSync(dl2) ? fs.readdirSync(dl2) : [];
      await w.click('.dlg button:has-text("Tải file lỗi để sửa")'); let xl2 = null; for (let i = 0; i < 40 && !xl2; i++) { const f = fs.existsSync(dl2) ? fs.readdirSync(dl2).filter((x) => /LoiNhapExcel.*\.xlsx$/i.test(x) && !had2.includes(x)) : []; if (f.length) xl2 = path.join(dl2, f[0]); else await w.waitForTimeout(250); }
      ok("Tải được file lỗi để sửa (.xlsx)", !!xl2);
      if (xl2) {
        const eb = new ExcelJS.Workbook(); await eb.xlsx.load(fs.readFileSync(xl2)); const es = eb.worksheets[0], hdr = []; es.getRow(1).eachCell((c) => hdr.push(String(c.value))); const body = []; es.eachRow((r, n) => { if (n > 1) { const o = {}; r.eachCell((c, i) => { o[hdr[i - 1]] = c.value; }); body.push(o); } });
        ok("File lỗi: đúng cột của bảng + Dòng Excel/Lỗi/Cách sửa; chỉ 2 dòng lỗi (chữ 'hai', mã lạ), giữ giá trị sai để sửa", hdr.slice(-3).join("|") === "Dòng Excel|Lỗi|Cách sửa" && hdr.includes("Số suất cơm") && body.length === 2 && body.some((r) => String(r["Số suất cơm"]) === "hai" && r["Dòng Excel"] === 3 && /Nhập số/.test(String(r["Cách sửa"]))) && body.some((r) => r["Mã NV"] === "KHONGCO"), JSON.stringify(hdr) + JSON.stringify(body));
        // sửa rồi nhập lại bằng chính chức năng Nhập Excel (cột thêm bị bỏ qua)
        body.forEach((r) => { if (String(r["Số suất cơm"]) === "hai") r["Số suất cơm"] = 2; if (r["Mã NV"] === "KHONGCO") r["Mã NV"] = "B"; });
        const wb3 = new ExcelJS.Workbook(), ws3 = wb3.addWorksheet("Du lieu"), xf3 = path.join(D9, "da-sua.xlsx"); ws3.getRow(1).values = hdr; body.forEach((r, i) => { ws3.getRow(2 + i).values = hdr.map((h) => r[h]); }); fs.writeFileSync(xf3, new Uint8Array(await wb3.xlsx.writeBuffer()));
        await w.click('.dlg button:has-text("Hủy")'); await w.click("#nav button[data-k=tiencom]");
        const [f3] = await Promise.all([w.waitForEvent("filechooser"), w.locator('#main button:has-text("Nhập Excel")').first().click()]); await f3.setFiles(xf3); await w.waitForSelector(".dlg", { timeout: 15000 });
        const pv3 = (await w.locator(".dlg").innerText()).replace(/\s+/g, " "); ok("File lỗi đã sửa nhập lại được ngay: 2 dòng ghi được, không còn dòng lỗi (không còn cột Cách sửa)", /Ghi 2 dòng/.test(pv3) && !/Cách sửa/.test(pv3), pv3.slice(0, 500));
      }
      await w.click('.dlg button:has-text("Hủy")').catch(() => {});
    }
    { // 013-B (issue #114): "Nghi trùng" — Mã NV khác chữ hoa/khoảng trắng so với nhân viên đang có / dòng trước trong file → hiện "Nghi trùng", KHÔNG ghi
      const wbn = new ExcelJS.Workbook(), wsn = wbn.addWorksheet("Nhân viên"), xfn = path.join(D9, "nghi-trung.xlsx");
      wsn.getRow(1).values = ["Mã NV", "Họ và tên"]; wsn.getRow(2).values = ["NV-X1", "Người mới"]; wsn.getRow(3).values = ["a", "Trùng chữ thường với A đang có"]; wsn.getRow(4).values = ["nv x1", "Trùng NV-X1 cùng file"];
      await w.click("#nav button[data-k=nhansu]");
      const nv0 = await rowsOf("nhanvien"), [fn] = await Promise.all([w.waitForEvent("filechooser"), w.locator('#main button:has-text("Nhập Excel")').first().click()]); await fn.setFiles((fs.writeFileSync(xfn, new Uint8Array(await wbn.xlsx.writeBuffer())), xfn)); await w.waitForSelector(".dlg", { timeout: 15000 });
      const pvn = (await w.locator(".dlg").innerText()).replace(/\s+/g, " ");
      ok("Nhập nhân sự: 'a' (giống 'A' đang có) và 'nv x1' (giống 'NV-X1' trong file) hiện 'Nghi trùng', chỉ 1 dòng được ghi", /Nghi trùng/.test(pvn) && /Ghi 1 dòng/.test(pvn) && /giống A đã có/.test(pvn) && /giống NV-X1 đã có/.test(pvn), pvn.slice(0, 700));
      await w.click('.dlg button:has-text("Ghi 1 dòng")'); await w.waitForSelector(".dlg", { state: "detached", timeout: 15000 }).catch(() => {});
      const nv1 = await rowsOf("nhanvien"), codes = nv1.map((r) => String(r["Mã NV"]));
      ok("Sau ghi: thêm đúng 1 nhân viên (NV-X1); KHÔNG có 'a' và 'nv x1' trong dữ liệu", nv1.length === nv0.length + 1 && codes.includes("NV-X1") && !codes.includes("a") && !codes.includes("nv x1"), JSON.stringify(codes));
    }
    ok("Nhập Excel nhiều kỳ: không lỗi JavaScript ở giao diện", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // 10. PDF có NỘI DUNG THẬT (chỉ đạo 004, mục 2): xuất bằng đường thật hakReport.pdf (IPC → printToPDF) rồi TRÍCH VĂN BẢN từ PDF và đối chiếu từng dòng/từng ô với dữ liệu báo cáo; tiếng Việt có dấu đúng
  {
    const PDFT = require("../helpers/pdf-text.cjs"), RPC = require("../fixtures/report-pdf-cases.js"), D10 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-pdf-")); fs.mkdirSync(path.join(D10, "downloads"));
    createStorage(D10).save(JSON.stringify(seed()));
    ({ app, w, errs } = await launch(D10)); await login(w);
    let n = 0;
    for (const c of RPC.cases()) {
      const r = await w.evaluate((x) => window.hakReport.pdf({ html: x.html, name: x.name, landscape: true, footer: "Chân trang kiểm thử" }), { html: c.html, name: "baocao-" + (++n) + ".pdf" });
      let miss = [], head = false, why = "";
      if (r && r.ok) { const buf = fs.readFileSync(path.join(r.dir, r.name)), L = PDFT.lines(buf); miss = PDFT.missingRows(L, c); head = PDFT.hasText(L, String(c.title || "").toLocaleUpperCase("vi-VN")) || PDFT.hasText(L, c.title); why = "PDF " + buf.length + " B, " + r.pages + " trang"; } else why = JSON.stringify(r);
      const tl = miss.tally || {}; console.log("   · " + c.name + ": mức khớp dòng — nguyên dòng " + (tl.strict || 0) + ", theo khối (ô ngắt dòng/bảng tách cột) " + (tl.block || 0) + ", yếu (không có khóa duy nhất) " + (tl.weak || 0));
      ok("PDF " + c.name + ": %PDF hợp lệ, có tiêu đề, MỌI dòng dữ liệu (" + c.expect.length + ") khớp văn bản trích từ PDF", !!(r && r.ok) && head && miss.length === 0, why + " | tiêu đề " + head + " | thiếu " + JSON.stringify(miss.slice(0, 3)).slice(0, 400));
    }
    { // ĐỐI CHỨNG: bộ kiểm phải PHÁT HIỆN khi số liệu in sai (không "khớp" cho qua mọi thứ)
      const c0 = RPC.cases().find((c) => /Vận hành TAM_UNG \(không lọc\)$/.test(c.name)), r0 = await w.evaluate((x) => window.hakReport.pdf({ html: x.html, name: "doi-chung.pdf", landscape: true, footer: "" }), { html: c0.html }), L0 = PDFT.lines(fs.readFileSync(path.join(r0.dir, r0.name)));
      const bad = JSON.parse(JSON.stringify(c0)); bad.expect[0] = bad.expect[0].map((v) => (v === "2.000.000" ? "2.000.001" : v));
      ok("PDF đối chứng: dòng đúng được chấp nhận, dòng bị sửa 1 số (2.000.000 → 2.000.001) bị PHÁT HIỆN", PDFT.missingRows(L0, c0).length === 0 && PDFT.missingRows(L0, bad).length === 1);
    }
    // tiếng Việt có dấu: chuỗi đủ dấu thanh/mũ/móc/đ đi qua HTML → PDF → văn bản mà không mất ký tự
    const VN = ["Nguyễn Thị Đào", "Phạm Quốc Việt", "Lưu Hoàng Ỷ", "Đỗ Thị Hương Ngân", "Trịnh Xuân Quỳnh", "Ông Ích Khiêm", "Cộng hòa xã hội chủ nghĩa"];
    const htmlVn = require("../../core/reporting/report-html.js").sheets({ title: "Kiểm tra tiếng Việt", ky: "Kỳ 2026-09", congTy: "CÔNG TY TNHH ĐẶNG VĂN ƯƠM", sheets: [{ name: "S", rows: VN.map((t, i) => ({ "STT": i + 1, "Họ và tên": t, "Ghi chú": "Ơ ơ Ư ư Ă ă Â â Ê ê Ô ô" })) }] }, {});
    const rv = await w.evaluate((h) => window.hakReport.pdf({ html: h, name: "tieng-viet.pdf", landscape: true, footer: "" }), htmlVn), Lv = PDFT.lines(fs.readFileSync(path.join(rv.dir, rv.name)));
    ok("PDF tiếng Việt có dấu: mọi tên/ghi chú đúng từng ký tự sau khi trích từ PDF", VN.every((t) => PDFT.hasText(Lv, t)) && PDFT.hasText(Lv, "Ơ ơ Ư ư Ă ă Â â Ê ê Ô ô") && PDFT.hasText(Lv, "CÔNG TY TNHH ĐẶNG VĂN ƯƠM") && PDFT.hasText(Lv, "KIỂM TRA TIẾNG VIỆT"), JSON.stringify(Lv.slice(0, 4)).slice(0, 400));
    ok("PDF: không lỗi JavaScript ở giao diện", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // 12. GÓI KỲ LƯƠNG (012-B1, issue #113): IPC thật tạo/kiểm gói .zip|.hakenc → khôi phục bằng lõi period.* → kỳ + nhân sự về đúng lúc sao lưu (băm bằng nhau), kỳ khác và kỳ đã chốt không đổi
  {
    const PR = require("../../core/repository.js").period, D12 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-ky-")); fs.mkdirSync(path.join(D12, "downloads"));
    const d0 = seed(); d0.chamcong = [{ "Kỳ": "2026-09", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }, { "Kỳ": "2026-10", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }, { "Kỳ": "2026-08", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }];
    d0.kyluong = [{ ky: "2026-08", version: 1, kq: { bangluong: [{ "Mã NV": "A", "Thực lĩnh": 1000, "Tổng thu nhập": 1200 }] } }]; createStorage(D12).save(JSON.stringify(d0));
    ({ app, w, errs } = await launch(D12)); await login(w);
    const cr = await w.evaluate(() => window.hakPeriod.create({ ky: "2026-09", user: "admin" }));
    ok("Gói kỳ: tạo qua IPC thật, tên LuongHAK_Ky_2026-09_<ngày>_<giờ>.zip, nằm trong thư mục sao lưu", cr && cr.ok === true && /^LuongHAK_Ky_2026-09_\d{8}_\d{6}\.zip$/.test(cr.name) && fs.existsSync(path.join(cr.dir, cr.name)), JSON.stringify(cr));
    const kyd = (d, ky) => PR.canon(d.chamcong.filter((r) => r["Kỳ"] === ky));
    await saveViaIpc(w, "d.chamcong.push({'Kỳ':'2026-09','Mã NV':'B','Hình thức công':'BT','01':1}); d.chamcong.find(function(r){return r['Kỳ']==='2026-09'&&r['Mã NV']==='A';})['01']=0.5; d.nhanvien[0]['Họ và tên']='Đã sửa sau khi sao lưu'; d.chamcong.find(function(r){return r['Kỳ']==='2026-10';})['01']=0.25;");
    const mid = await w.evaluate(() => JSON.parse(window.hakStore.load().text)); ok("Điều kiện thử: dữ liệu đã bị sửa sau khi sao lưu", kyd(mid, "2026-09") !== kyd(d0, "2026-09") && mid.nhanvien[0]["Họ và tên"] === "Đã sửa sau khi sao lưu");
    const ins = await w.evaluate((n) => window.hakPeriod.inspect(n), cr.name); ok("Kiểm gói qua IPC: hợp lệ, đúng kỳ, trả dữ liệu cho lõi khôi phục", ins && ins.ok === true && ins.manifest.ky === "2026-09" && !!ins.payload, JSON.stringify(ins && ins.error));
    const res = await w.evaluate((x) => { const P = window.HAKCore.repo.period, cur = JSON.parse(window.hakStore.load().text), pl = P.plan(cur, x.payload, "2026-09"); if (!pl.ok) return { ok: false, pl }; const r = P.apply(cur, pl, x.payload); return { ok: r.ok, audit: r.audit, saved: window.hakStore.save(JSON.stringify(cur)) }; }, { payload: ins.payload });
    ok("Khôi phục kỳ bằng lõi period.* rồi lưu qua IPC thật: thành công, có chuỗi nhật ký kiểm toán", res && res.ok === true && /Khôi phục kỳ 2026-09/.test(res.audit || ""), JSON.stringify(res).slice(0, 300));
    const aft = await w.evaluate(() => JSON.parse(window.hakStore.load().text));
    ok("Sau khôi phục: kỳ 2026-09 và nhân sự về đúng lúc sao lưu (băm nội dung bằng nhau)", kyd(aft, "2026-09") === kyd(d0, "2026-09") && PR.canon(aft.nhanvien) === PR.canon(d0.nhanvien));
    ok("Sau khôi phục: kỳ khác (2026-10 đã sửa sau đó) KHÔNG đổi; kỳ đã chốt 2026-08 và snapshot kyluong không đổi", kyd(aft, "2026-10") === kyd(mid, "2026-10") && kyd(aft, "2026-08") === kyd(d0, "2026-08") && PR.canon(aft.kyluong) === PR.canon(d0.kyluong));
    const again = await w.evaluate((x) => { const P = window.HAKCore.repo.period, cur = JSON.parse(window.hakStore.load().text), before = JSON.stringify(cur); P.apply(cur, P.plan(cur, x.payload, "2026-09"), x.payload); return JSON.stringify(cur) === before; }, { payload: ins.payload }); ok("Khôi phục lần hai: dữ liệu không đổi (không nhân đôi)", again === true);
    const lock = await w.evaluate(() => { const P = window.HAKCore.repo.period, cur = JSON.parse(window.hakStore.load().text), p8 = P.slice(cur, "2026-08"); return P.plan(cur, p8, "2026-08"); }); ok("Kỳ đã chốt ở máy (2026-08): khôi phục bị chặn", lock.ok === false && /đã chốt/.test(lock.blocked || ""));
    const enc = await w.evaluate(() => window.hakPeriod.create({ ky: "2026-09", user: "admin", password: "Mat-khau-du-dai-2026" }));
    ok("Gói có mật khẩu → .hakenc; thiếu/sai mật khẩu bị từ chối, đúng mật khẩu mở được", enc.ok && /\.hakenc$/.test(enc.name) && (await w.evaluate((n) => window.hakPeriod.inspect(n, ""), enc.name)).needPassword === true && (await w.evaluate((n) => window.hakPeriod.inspect(n, "sai-mat-khau-khac-123"), enc.name)).wrongPassword === true && (await w.evaluate((n) => window.hakPeriod.inspect(n, "Mat-khau-du-dai-2026"), enc.name)).ok === true);
    ok("Gói kỳ lương: không lỗi JavaScript ở giao diện", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // 11. Màn "Sao lưu & Khôi phục" (012-A, issue #113): mỗi chức năng MỘT chỗ; chữ "giữ N ngày" theo cài đặt thật; thư mục JSON; sao lưu JSON ghi vào thư mục đó và khôi phục lại được (băm từng bảng bằng nhau)
  {
    const DG = require("../../main/data-digest"), D11 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-bk-")), JD = fs.mkdtempSync(path.join(os.tmpdir(), "hak-bkjson-")); fs.mkdirSync(path.join(D11, "downloads"));
    createStorage(D11).save(JSON.stringify(seed()));
    ({ app, w, errs } = await launch(D11, { HAK_PICK_DIR: JD })); await login(w);
    await w.evaluate(() => window.hakStore.scheduleSet({ keepDaily: 180 }));
    await w.click('#nav button[data-k="backup"]'); await w.waitForSelector('[data-stg="mirror"]', { timeout: 15000 });
    const txt = await w.locator("#main").innerText();
    ok("Chữ 'giữ N ngày' theo cài đặt thật (keepDaily = 180), không ghi cứng 60 ngày", /giữ 180 ngày/.test(txt) && !/giữ 60 ngày/.test(txt), (txt.match(/giữ \d+ ngày/g) || []).join(","));
    const pickers = await w.locator("#main button").evaluateAll((bs) => bs.filter((b) => /Chọn thư mục sao lưu thứ hai|Đổi thư mục/.test(b.innerText) || (/Chọn \/ Chuyển/.test(b.innerText) && b.closest('[data-stg="mirror"]'))).length);
    ok("Thư mục sao lưu dự phòng (mirrorDir) chỉ chọn được ở MỘT chỗ", pickers === 1, "số nút chọn = " + pickers);
    const one = async (sel) => (await w.locator(sel).count()) === 1;
    ok("Khu 'Sao lưu ngay': đúng 1 nút Sao lưu toàn bộ + 1 ô chọn loại (SQLite mặc định / Full Backup / JSON)", (await one("[data-backup-now]")) && (await one("[data-backup-kind]")) && (await w.locator("[data-backup-kind] option").evaluateAll((o) => o.map((x) => x.value).join())) === "sqlite,full,json");
    ok("Khu 'Khôi phục': đúng 1 nút Khôi phục toàn bộ + 1 ô chọn loại", (await one("[data-restore-now]")) && (await one("[data-restore-kind]")));
    ok("Bảng thư mục có đủ dòng: SQLite (tự động), JSON, Full Backup, dự phòng, chứng từ, OCR", (await w.locator("[data-stg]").evaluateAll((r) => r.map((x) => x.getAttribute("data-stg")).sort().join())) === "backup,docs,export,json,mirror,ocrLib,sqlite");
    ok("Dòng thư mục SQLite có ghi chú cố định (CEO chọn (a)): 'Cố định trong thư mục dữ liệu; muốn có bản ở nơi khác hãy đặt Thư mục dự phòng'", (await w.locator('[data-stg-note="sqlite"]').count()) === 1 && (await w.locator('[data-stg-note="sqlite"]').innerText()).trim() === "Cố định trong thư mục dữ liệu; muốn có bản ở nơi khác hãy đặt Thư mục dự phòng" && (await w.locator('[data-stg="sqlite"] button:has-text("Chọn")').count()) === 0);
    ok("Không còn các nút sao lưu trùng chức năng (Tạo bản sao lưu ngay / Tạo Full Backup / Sao lưu ra file)", (await w.locator('#main button:has-text("Tạo bản sao lưu ngay"), #main button:has-text("Tạo Full Backup"), #main button:has-text("Sao lưu ra file")').count()) === 0);
    if (await one('[data-stg="json"]')) {
      await w.locator('[data-stg="json"] button:has-text("Chọn")').click(); await w.waitForTimeout(800);
      await w.click('#nav button[data-k="home"]'); await w.click('#nav button[data-k="backup"]'); await w.waitForSelector('[data-stg="json"]');
      ok("Đặt thư mục sao lưu JSON → hiện đúng đường dẫn đã chọn", (await w.locator('[data-stg="json"]').innerText()).includes(JD));
    }
    if ((await one("[data-backup-kind]")) && (await one("[data-backup-now]"))) {
      await w.selectOption("[data-backup-kind]", "json"); await w.click("[data-backup-now]"); await w.waitForTimeout(1500);
    }
    const jf = fs.readdirSync(JD).filter((f) => /^LuongHAK_JSON_\d{8}_\d{6}.*\.json$/.test(f));
    ok("Sao lưu JSON ghi VÀO thư mục JSON đã đặt (tên có ngày giờ), không qua hộp thoại tải về", jf.length === 1 && !fs.readdirSync(path.join(D11, "downloads")).some((f) => /\.json$/.test(f)), JSON.stringify(jf));
    if (jf.length) {
      const fileObj = JSON.parse(fs.readFileSync(path.join(JD, jf[0]), "utf8")), cur = await w.evaluate(() => JSON.parse(window.hakStore.load().text));
      ok("File JSON khôi phục lại được: mã băm từng bảng bằng dữ liệu đang chạy (main/data-digest.js)", DG.compare(DG.digest(cur), DG.digest(fileObj)).length === 0, DG.compare(DG.digest(cur), DG.digest(fileObj)).join("; "));
    }
    if (await one("[data-backup-now]")) { const b = await w.locator("[data-backup-now]").boundingBox(), vp = w.viewportSize() || { width: 1366, height: 768 }; ok("Nút Sao lưu toàn bộ thấy ngay khi mở màn (không cần cuộn)", !!b && b.y >= 0 && b.y + b.height <= vp.height, JSON.stringify(b) + " / " + JSON.stringify(vp)); } else ok("Nút Sao lưu toàn bộ thấy ngay khi mở màn (không cần cuộn)", false, "không có nút");
    ok("Màn Sao lưu & Khôi phục: không lỗi JavaScript", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // 13. GIAO DIỆN sao lưu / khôi phục THEO KỲ (012-B2, issue #113): bấm nút thật → gói .zip; sửa dữ liệu; khôi phục qua màn xem trước (xác nhận riêng, xóa tắt sẵn), tự SAO LƯU TOÀN BỘ trước khi ghi, ghi nhật ký
  {
    const D13 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-kyui-")); fs.mkdirSync(path.join(D13, "downloads"));
    const d0 = seed(); d0.chamcong = [{ "Kỳ": "2026-09", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }, { "Kỳ": "2026-10", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }]; createStorage(D13).save(JSON.stringify(d0));
    ({ app, w, errs } = await launch(D13)); await login(w);
    await w.selectOption("#top select", "9"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(300);
    await w.click('#nav button[data-k="backup"]'); await w.waitForSelector("[data-ky-backup]", { timeout: 15000 });
    ok("Khu Sao lưu ngay có nút 'Sao lưu kỳ 2026-09' theo kỳ đang chọn", /2026-09/.test(await w.locator("[data-ky-backup]").innerText()));
    await w.click("[data-ky-backup]"); await w.waitForSelector("[data-fb-msg]", { timeout: 20000 });
    const msg = await w.locator("[data-fb-msg]").innerText();
    const findPk = (dir) => { const out = []; const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/^LuongHAK_Ky_2026-09_.*\.zip$/.test(e.name)) out.push(p); }); walk(dir); return out; };
    const pk = findPk(D13);
    ok("Bấm nút: tạo đúng 1 gói LuongHAK_Ky_2026-09_*.zip và báo thành công", pk.length === 1 && /Đã tạo gói kỳ 2026-09/.test(msg), msg + " | " + pk.join(","));
    const nameA = await w.evaluate(() => JSON.parse(window.hakStore.load().text).nhanvien.find((n) => n["Mã NV"] === "A")["Họ và tên"]);
    await saveViaIpc(w, "d.chamcong.find(function(r){return r['Kỳ']==='2026-09'&&r['Mã NV']==='A'})['01']=0.5; d.chamcong.push({'Kỳ':'2026-09','Mã NV':'B','Hình thức công':'BT','01':1}); d.nhanvien.find(function(n){return n['Mã NV']==='A'})['Họ và tên']='Tên bị sửa';");
    await app.close();
    ({ app, w, errs } = await launch(D13, { HAK_KY_PICK: pk[0] || "" })); await login(w);
    await w.click('#nav button[data-k="backup"]'); await w.waitForSelector("[data-ky-restore]", { timeout: 15000 });
    await w.click("[data-ky-restore]"); await w.waitForSelector("[data-ky-preview]", { timeout: 15000 });
    const pv = await w.locator("[data-ky-preview]").innerText();
    ok("Xem trước: liệt kê thay đổi nhân sự cũ → mới, có ô xác nhận ghi đè riêng, ô 'cho phép xóa' KHÔNG bật sẵn", /Tên bị sửa → /.test(pv) && (await w.locator("[data-ky-ack-global]").count()) === 1 && (await w.locator("[data-ky-allow-delete]:checked").count()) === 0, pv.slice(0, 400));
    const bkBefore = await w.evaluate(() => window.hakStore.listBackups().length);
    await w.click("[data-ky-apply]"); await w.waitForTimeout(400);
    const still = (await w.locator("[data-ky-preview]").count()) === 1, unchanged = await w.evaluate(() => JSON.parse(window.hakStore.load().text).nhanvien.find((n) => n["Mã NV"] === "A")["Họ và tên"]);
    ok("Chưa tích xác nhận: KHÔNG ghi, vẫn ở màn xem trước", still && unchanged === "Tên bị sửa", "còn xem trước=" + still + ", tên=" + unchanged);
    await w.check("[data-ky-ack-global]"); await w.click("[data-ky-apply]"); await w.waitForSelector("[data-fb-msg]", { timeout: 15000 });
    const after = await w.evaluate(() => JSON.parse(window.hakStore.load().text));
    const c09 = after.chamcong.filter((r) => r["Kỳ"] === "2026-09"), c10 = after.chamcong.filter((r) => r["Kỳ"] === "2026-10");
    ok("Sau khôi phục: kỳ 09 về đúng lúc sao lưu (A = 1, không còn B), kỳ 10 giữ nguyên, tên NV về như cũ", c09.length === 1 && String(c09[0]["01"]) === "1" && c10.length === 1 && after.nhanvien.find((n) => n["Mã NV"] === "A")["Họ và tên"] === nameA, JSON.stringify(c09));
    const bkAfter = await w.evaluate(() => window.hakStore.listBackups());
    ok("Tự SAO LƯU TOÀN BỘ trước khi khôi phục (có bản 'truoc-khoi-phuc-ky') và nhật ký kiểm toán có 'Khôi phục kỳ lương'", bkAfter.length > bkBefore && JSON.stringify(bkAfter).includes("truoc-khoi-phuc-ky") && after.auditlog.some((a) => a.thaoTac === "Khôi phục kỳ lương"), JSON.stringify(bkAfter).slice(0, 200));
    ok("Giao diện sao lưu/khôi phục kỳ: không lỗi JavaScript", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // 14. QUY TRÌNH SAO LƯU khi nơi lưu CHÍNH là SQLite (CEO rà 19/11): bấm "Sao lưu toàn bộ" (loại SQLite mặc định) → có bản chụp snap_*.sqlite đã kiểm + JSON đối chứng, thông báo nêu tên bản chụp, màn hiện trạng thái bản chụp
  {
    const D14 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-snapui-")); fs.mkdirSync(path.join(D14, "downloads"));
    createStorage(D14).save(JSON.stringify(seed()));
    ({ app, w, errs } = await launch(D14)); await login(w);
    await w.click('#nav button[data-k="backup"]'); await w.waitForSelector("[data-backup-now]", { timeout: 15000 });
    ok("Loại sao lưu mặc định là SQLite và mô tả đúng (bản chụp .sqlite + JSON đối chứng)", (await w.locator("[data-backup-kind]").inputValue()) === "sqlite" && /\.sqlite đã kiểm/.test(await w.locator("[data-backup-kind] option[value=sqlite]").innerText()));
    await w.click("[data-backup-now]"); await w.waitForSelector("[data-fb-msg]", { timeout: 20000 });
    const m14 = await w.locator("[data-fb-msg]").innerText(), bdir = await w.evaluate(() => window.hakStore.info().backupDir), snapsOnDisk = fs.readdirSync(bdir).filter((x) => /^snap_.*\.sqlite$/.test(x));
    ok("Bấm Sao lưu toàn bộ (SQLite): có bản chụp snap_*.sqlite trên đĩa và thông báo nêu tên bản chụp + số dòng", snapsOnDisk.length >= 1 && /bản chụp snap_.*\.sqlite \(\d+ dòng, đã kiểm\)/.test(m14), m14 + " | " + snapsOnDisk.join(","));
    ok("Màn Sao lưu hiện trạng thái bản chụp SQLite mới nhất, không có cảnh báo lỗi bản chụp", (await w.locator("[data-snap-status]").count()) === 1 && /Bản chụp SQLite mới nhất/.test(await w.locator("[data-snap-status]").innerText()) && (await w.locator("[data-snap-error]").count()) === 0);
    { // 012-C: danh sách bản sao lưu có cột Định dạng / Phạm vi, gồm cả lịch sử bản chụp .sqlite; lọc theo định dạng
      const nSql = await w.locator('[data-bk-row="sqlite"]').count(), nJson = await w.locator('[data-bk-row="json"]').count(), head = await w.locator('[data-bk-row]').first().locator("xpath=ancestor::table").locator("thead").innerText();
      await w.selectOption("[data-bk-kind-filter]", "sqlite"); await w.waitForTimeout(300);
      const onlySql = (await w.locator('[data-bk-row="json"]').count()) === 0 && (await w.locator('[data-bk-row="sqlite"]').count()) === nSql;
      await w.selectOption("[data-bk-kind-filter]", "all"); await w.waitForTimeout(200);
      ok("Danh sách bản sao lưu: có cả bản chụp SQLite và bản JSON, cột Định dạng + Phạm vi; lọc 'SQLite' chỉ còn bản .sqlite", nSql >= 1 && nJson >= 1 && /Định dạng/.test(head) && /Phạm vi/.test(head) && onlySql, "sqlite=" + nSql + " json=" + nJson + " | " + head.replace(/\s+/g, " "));
    }
    { // T-01 (rà soát 5 agent): "Kiểm tra tất cả bản sao lưu" — không bản nào hỏng → biểu ngữ xanh; làm hỏng 1 bản JSON (vẫn là JSON hợp lệ, SHA lệch) → biểu ngữ CẢNH BÁO
      await w.click('#main button:has-text("Kiểm tra tất cả bản sao lưu")'); await w.waitForTimeout(800);
      const okBanner = await w.locator('#main .ok:has-text("Đã kiểm tra")').count(), warnBefore = await w.locator('#main .warn:has-text("bị hỏng")').count();
      const jf = fs.readdirSync(bdir).filter((x) => /\.json$/.test(x)).sort()[0], jp = path.join(bdir, jf), jd = JSON.parse(fs.readFileSync(jp, "utf8")); jd.__sua_tay = "bị sửa"; fs.writeFileSync(jp, JSON.stringify(jd));
      await w.click('#main button:has-text("Kiểm tra tất cả bản sao lưu")'); await w.waitForTimeout(800);
      const warnTxt = await w.locator('#main .warn:has-text("bị hỏng")').allInnerTexts(), okAfter = await w.locator('#main .ok:has-text("Đã kiểm tra")').count(), rowBad = await w.locator('[data-bk-row="json"]:has-text("HỎNG")').count();
      ok("T-01: kiểm tra khi không có bản hỏng → biểu ngữ xanh 'Đã kiểm tra…'", okBanner === 1 && warnBefore === 0, "ok=" + okBanner + " warn=" + warnBefore);
      ok("T-01: có 1 bản JSON bị sửa → hàng hiện HỎNG VÀ biểu ngữ CẢNH BÁO '1 bản sao lưu bị hỏng' (không còn biểu ngữ xanh)", rowBad >= 1 && warnTxt.some((t) => /\b1 bản sao lưu bị hỏng/.test(t)) && okAfter === 0, "rowBad=" + rowBad + " warn=" + JSON.stringify(warnTxt) + " okAfter=" + okAfter + " file=" + jf);
    }
    ok("Quy trình sao lưu SQLite: không lỗi JavaScript", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // 15. CHUYỂN SANG MÁY KHÁC (handoff 011, issue #112) qua GIAO DIỆN THẬT: máy A sao lưu JSON + gói kỳ có mật khẩu → máy B (hồ sơ khác, SQLite mặc định) khôi phục;
  //     băm từng bảng A = B; khôi phục lần 2 không nhân đôi; gói kỳ sai mật khẩu → dữ liệu B không đổi, đúng mật khẩu → kỳ về như máy A. (Full Backup sang hồ sơ khác: capphat.cjs.)
  {
    const DG = require("../../main/data-digest"), DA = fs.mkdtempSync(path.join(os.tmpdir(), "hak-mayA-")), DB = fs.mkdtempSync(path.join(os.tmpdir(), "hak-mayB-"));
    [DA, DB].forEach((d) => fs.mkdirSync(path.join(d, "downloads")));
    const dA = seed(); dA.chamcong = [{ "Kỳ": "2026-09", "Mã NV": "A", "Hình thức công": "BT", "01": 1, "02": 1 }, { "Kỳ": "2026-10", "Mã NV": "B", "Hình thức công": "BT", "01": 0.5 }];
    dA.psluong = [{ "Ngày hạch toán": "2026-09-10", "Số chứng từ": "T-9", "Mã NV": "A", "Diễn giải": "Thưởng chuyển máy", "Thưởng": 300000 }];
    createStorage(DA).save(JSON.stringify(dA));
    const dB = seed(); dB.nhanvien = dB.nhanvien.slice(0, 1); createStorage(DB).save(JSON.stringify(dB)); // máy B: cài mới, chỉ có tài khoản quản trị và 1 nhân viên
    const PKPW = "ChuyenMay#2026";
    // --- máy A ---
    ({ app, w, errs } = await launch(DA)); await login(w);
    await w.selectOption("#top select", "9"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(300);
    await w.click('#nav button[data-k="backup"]'); await w.waitForSelector("[data-backup-kind]", { timeout: 15000 });
    await w.selectOption("[data-backup-kind]", "json"); await w.waitForTimeout(300);
    ok("Máy A: mô tả loại JSON nói rõ KHÔNG có chứng từ gốc và thư viện OCR (chuyển máy đầy đủ dùng Full Backup)", /KHÔNG có chứng từ gốc và thư viện OCR/.test(await w.locator('[data-zone="now"]').innerText()));
    await w.click("[data-backup-now]"); await w.waitForTimeout(1500);
    await w.check("[data-ky-pw]"); await w.click("[data-ky-backup]"); await w.waitForSelector("#modal input[type=password]", { timeout: 10000 });
    await w.fill("#modal input[type=password]", PKPW); await w.click("#modal button.pri"); await w.waitForSelector("[data-fb-msg]", { timeout: 20000 }); await w.waitForTimeout(500);
    const dataA = await w.evaluate(() => JSON.parse(window.hakStore.load().text)); await app.close();
    const walk = (dir, re) => { const out = []; const go = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const q = path.join(d, e.name); if (e.isDirectory()) go(q); else if (re.test(e.name)) out.push(q); }); go(dir); return out; };
    const jsonA = walk(DA, /^LuongHAK_JSON_.*\.json$/), pkA = walk(DA, /^LuongHAK_Ky_2026-09_.*\.hakenc$/);
    ok("Máy A: có đúng 1 file JSON (thư mục JSON) và 1 gói kỳ .hakenc có mật khẩu", jsonA.length === 1 && pkA.length === 1, jsonA.concat(pkA).join(" | "));
    // --- máy B: khôi phục JSON qua nút Khôi phục toàn bộ ---
    ({ app, w, errs } = await launch(DB, { HAK_KY_PICK: pkA[0] || "" })); await login(w);
    const restoreJson = async () => { await w.click('#nav button[data-k="backup"]'); await w.waitForSelector("[data-restore-kind]", { timeout: 15000 }); await w.selectOption("[data-restore-kind]", "json");
      const [fc] = await Promise.all([w.waitForEvent("filechooser"), w.click("[data-restore-now]")]); await fc.setFiles(jsonA[0]); await w.waitForTimeout(2500);
      if (await w.locator("#main input[data-f=u]").count()) await login(w); };
    await restoreJson();
    const b1 = await w.evaluate(() => JSON.parse(window.hakStore.load().text)), diff1 = DG.compare(DG.digest(dataA), DG.digest(b1));
    ok("Máy B sau khôi phục JSON: mã băm TỪNG BẢNG trùng máy A (nhân sự, chấm công, phát sinh…)", diff1.length === 0 && b1.nhanvien.length === dataA.nhanvien.length && b1.chamcong.length === dataA.chamcong.length, JSON.stringify(diff1).slice(0, 300));
    await restoreJson();
    const b2 = await w.evaluate(() => JSON.parse(window.hakStore.load().text));
    ok("Khôi phục cùng file JSON LẦN 2: không nhân đôi (băm từng bảng không đổi)", DG.compare(DG.digest(b1), DG.digest(b2)).length === 0 && b2.chamcong.length === dataA.chamcong.length);
    // --- file JSON có BẢN CHỐT BỊ LÀM GIẢ (không khớp tính lại) → tiến trình chính từ chối ghi, dữ liệu máy B không đổi ---
    { const forged = JSON.parse(fs.readFileSync(jsonA[0], "utf8")); forged.kyluong = [{ ky: "2026-08", version: 1, kq: { bangluong: [{ "Mã NV": "A", "Thực lĩnh": 999999999, "Tổng thu nhập": 999999999 }] } }];
      const ff = path.join(DB, "downloads", "LuongHAK_JSON_gia-mao.json"); fs.writeFileSync(ff, JSON.stringify(forged)); const keep = await w.evaluate(() => window.hakStore.load().text);
      await w.click('#nav button[data-k="backup"]'); await w.waitForSelector("[data-restore-kind]", { timeout: 15000 }); await w.selectOption("[data-restore-kind]", "json");
      const [fc2] = await Promise.all([w.waitForEvent("filechooser"), w.click("[data-restore-now]")]); await fc2.setFiles(ff); await w.waitForTimeout(2500);
      if (await w.locator("#main input[data-f=u]").count()) await login(w);
      ok("JSON có bản chốt kỳ bị LÀM GIẢ: tiến trình chính TỪ CHỐI ghi, dữ liệu máy B không đổi một byte", (await w.evaluate(() => window.hakStore.load().text)) === keep); }
    // --- máy B: sửa kỳ 09 rồi khôi phục gói kỳ .hakenc (sai mật khẩu trước) ---
    await saveViaIpc(w, "d.chamcong.find(function(r){return r['Kỳ']==='2026-09'})['01']=0; d.psluong=[];");
    await app.close(); ({ app, w, errs } = await launch(DB, { HAK_KY_PICK: pkA[0] || "" })); await login(w); // ghi qua IPC sau lưng giao diện → mở lại để giao diện nạp dữ liệu mới (như khối 13)
    const beforeKy = await w.evaluate(() => window.hakStore.load().text);
    await w.click('#nav button[data-k="backup"]'); await w.waitForSelector("[data-ky-restore]", { timeout: 15000 });
    await w.click("[data-ky-restore]"); await w.waitForSelector("#modal input[type=password]", { timeout: 15000 });
    await w.fill("#modal input[type=password]", "SaiMatKhau#1"); await w.click("#modal button.pri"); await w.waitForTimeout(1500);
    const wrongMsg = (await w.locator("#modal").innerText().catch(() => "")) || "", afterWrong = await w.evaluate(() => window.hakStore.load().text);
    ok("Gói kỳ SAI mật khẩu: báo 'chưa đúng', dữ liệu máy B KHÔNG đổi một byte", /chưa đúng/i.test(wrongMsg) && afterWrong === beforeKy, wrongMsg.slice(0, 160));
    await w.fill("#modal input[type=password]", PKPW); await w.click("#modal button.pri"); await w.waitForSelector("[data-ky-preview]", { timeout: 45000 }); // giải mã scrypt chậm trên runner bận
    if (await w.locator("[data-ky-ack-global]").count()) await w.check("[data-ky-ack-global]");
    await w.click("[data-ky-apply]"); await w.waitForSelector("[data-fb-msg]", { timeout: 45000 }); await w.waitForTimeout(500);
    const b3 = await w.evaluate(() => JSON.parse(window.hakStore.load().text)), k09 = (d) => DG.canon(d.chamcong.filter((r) => r["Kỳ"] === "2026-09")) + DG.canon(d.psluong);
    ok("Gói kỳ ĐÚNG mật khẩu: kỳ 09 (chấm công + phát sinh) về đúng như máy A; kỳ 10 không đổi", k09(b3) === k09(dataA) && DG.canon(b3.chamcong.filter((r) => r["Kỳ"] === "2026-10")) === DG.canon(dataA.chamcong.filter((r) => r["Kỳ"] === "2026-10")));
    ok("Chuyển máy qua giao diện: không lỗi JavaScript", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  const fail = results.filter((r) => !r.pass).length;
  console.log("\nSQLite chế độ thật E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); process.exit(2); });
