"use strict";
// v2.1.7: khôi phục từ bản chụp SQLite ở THƯ MỤC SAO LƯU ĐÃ CHỌN trên Electron THẬT (dữ liệu giả).
// Luồng: chọn thư mục SQLite → Sao lưu → làm hỏng data.sqlite + xóa sạch backups/ → mở lại → màn khôi phục hiện bản ở thư mục đã chọn → khôi phục → đăng nhập → dữ liệu khớp.
// Ca 2: thư mục đã chọn bị mất (USB rút) → màn khôi phục báo rõ nguyên nhân + đường dẫn, không treo.
// Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/sqlite-restore-from-dir.cjs
/* global window */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const APP = path.resolve(__dirname, "../.."), F = require(path.join(APP, "tests/fixtures/build.js")), PASS = "RestoreDir2026x";
const results = []; const ok = (n, c, x) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (!c && x ? " — " + String(x).slice(0, 700) : "")); };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const launch = (D, SD) => _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_NO_SHELL: "1", HAK_PICK_DIR: SD || "" }) });
const login = async (w) => { await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]"); };
/** Dựng hồ sơ: chọn thư mục SQLite qua giao diện, bấm Sao lưu, đóng app. Trả { D, SD, staff }. */
async function prepare() {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "rfd-")), SD = fs.mkdtempSync(path.join(os.tmpdir(), "rfd-out-")), db = F.regressionDataset(30); db.schemaVersion = 2; db.nguoidung = [account("admin", "Quản trị giả", "admin")];
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const app = await launch(D, SD), w = await app.firstWindow(); w.on("dialog", (d) => d.accept()); await w.setViewportSize({ width: 1440, height: 1000 }).catch(() => {}); await login(w);
  await w.evaluate(() => document.querySelector("#nav button[data-k=backup]").click()); await w.click('[data-sl-tab="tm"]'); await w.waitForSelector('[data-stg="sqlite"]');
  await w.locator('[data-stg="sqlite"] button:has-text("Chọn")').click();
  await w.locator('[data-confirm-storage-move="sqlite"]').click();
  await w.locator("[data-stg-msg].ok").waitFor();
  const settings = JSON.parse(fs.readFileSync(path.join(D, "settings.json"), "utf8")); ok("Chuẩn bị: đã chọn thư mục SQLite", settings.sqliteDir === SD);
  await w.click('[data-sl-tab="sl"]'); await w.waitForSelector("[data-backup-now]"); await w.selectOption("[data-backup-kind]", "sqlite"); await w.click("[data-backup-now]"); await w.waitForTimeout(3500);
  ok("Chuẩn bị: bản chụp đã chép sang thư mục đã chọn", fs.existsSync(path.join(SD, "data-snapshot.sqlite")), fs.readdirSync(SD).join(","));
  await w.click('[data-sl-tab="tm"]'); await w.waitForSelector('[data-stg="sqlite"] button:has-text("Thử khôi phục")');
  await w.waitForSelector('[data-stg-ext="sqlite"]'); await w.waitForTimeout(800);
  ok("Dòng Sao lưu SQLite hiện bản ngoài máy gần nhất (đọc từ thư mục thật), chưa báo quá cũ", /Bản ngoài máy gần nhất/.test(await w.locator('[data-stg-ext="sqlite"]').innerText()));
  await w.locator('[data-stg="sqlite"] button:has-text("Thử khôi phục")').click(); await w.waitForSelector('[data-stg-verify="sqlite"]'); await w.waitForTimeout(1500);
  const dt = await w.locator('[data-stg-verify="sqlite"]').innerText(); ok("Diễn tập khôi phục (không ghi gì) báo đạt + số dòng", /Diễn tập đạt \(không ghi gì\).*\d+ dòng/.test(dt), dt);
  await app.close();
  return { D, SD, staff: db.nhanvien.length };
}
const breakStore = (D) => { const f = path.join(D, "data.sqlite"); fs.truncateSync(f, 200); for (const x of ["-wal", "-shm"]) fs.rmSync(f + x, { force: true }); fs.rmSync(path.join(D, "backups"), { recursive: true, force: true }); fs.mkdirSync(path.join(D, "backups"), { recursive: true }); };
(async () => {
  // Ca 1: khôi phục từ thư mục đã chọn
  const { D, SD, staff } = await prepare(); breakStore(D);
  let app = await launch(D, SD), w = await app.firstWindow(); const dialogs = []; w.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });
  await w.waitForSelector("[data-snapshot-candidates]", { timeout: 20000 });
  ok("Màn khôi phục báo kho không mở được và hiện khối 'Bản chụp SQLite tìm thấy'", (await w.locator("#main").innerText()).includes("Không mở được") && (await w.locator("[data-snapshot-candidates] [data-candidate]").count()) >= 2);
  ok("Mọi bản liệt kê đều từ 'Thư mục đã chọn' (thư mục dữ liệu đã bị xóa sạch)", (await w.locator("[data-snapshot-candidates] [data-candidate] td:first-child").allInnerTexts()).every((t) => /Thư mục đã chọn/.test(t)));
  const row = w.locator('[data-candidate="chosen:data-snapshot.sqlite"]'); ok("Có dòng 'Bản mới nhất' của thư mục đã chọn, trạng thái chưa kiểm", (await row.count()) === 1 && (await row.locator("[data-cand-status]").getAttribute("data-cand-status")) === "unknown");
  await row.locator('button:has-text("Kiểm tra")').click(); await w.waitForTimeout(800);
  ok("Bấm 'Kiểm tra' → hợp lệ kèm số dòng", (await row.locator("[data-cand-status]").getAttribute("data-cand-status")) === "ok" && /hợp lệ, \d+ dòng/.test(await row.locator("[data-cand-status]").innerText()));
  const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"), histBefore = {}; fs.readdirSync(SD).filter((n) => /^snap_/.test(n)).forEach((n) => { histBefore[n] = sha(path.join(SD, n)); });
  await w.locator('[data-candidate="chosen:data-snapshot.sqlite"] button:has-text("Khôi phục từ bản này")').click();
  await w.waitForSelector("#main input[data-f=u]", { timeout: 30000 });
  ok("Hộp xác nhận nêu nguồn là thư mục SQLite đã chọn và nơi cất bản cũ", dialogs.some((m) => /thư mục SQLite đã chọn/.test(m) && /truoc-khoi-phuc/.test(m)), dialogs.join(" || "));
  ok("Đã khôi phục: thông báo thành công, màn đăng nhập hiện lại", dialogs.some((m) => /Đã khôi phục/.test(m)));
  await login(w);
  const rows = await w.evaluate(() => (window.db && window.db.nhanvien ? window.db.nhanvien.length : -1)).catch(() => -1);
  const disk = JSON.parse(fs.readFileSync(path.join(D, "data.json"), "utf8"));
  ok("Dữ liệu sau khôi phục khớp bản chụp (số nhân viên)", disk.nhanvien.length === staff && (rows === -1 || rows === staff), disk.nhanvien.length + " vs " + staff);
  ok("Bản hỏng được cất 'data.sqlite.truoc-khoi-phuc-…'", fs.readdirSync(D).some((f) => /^data\.sqlite\.truoc-khoi-phuc-/.test(f)), fs.readdirSync(D).join(","));
  ok("Bản nguồn ở thư mục đã chọn không bị khôi phục sửa/xóa (còn đủ tệp; tệp lịch sử snap_ giữ nguyên SHA-256)", fs.existsSync(path.join(SD, "data-snapshot.sqlite")) && Object.keys(histBefore).every((n) => fs.existsSync(path.join(SD, n)) && sha(path.join(SD, n)) === histBefore[n]));
  ok("Nhật ký kiểm toán ghi nguồn 'thư mục SQLite đã chọn'", (disk.auditlog || []).some((r) => r.thaoTac === "Khôi phục từ bản chụp SQLite" && /thư mục SQLite đã chọn/.test(r.chiTiet)));
  ok("Không còn tệp tạm mồ côi", !fs.readdirSync(D).some((f) => /\.(nguon-ung-vien|kiem-ung-vien|khoi-phuc-moi|restore-pending)$/.test(f)));
  await app.close();
  // Ca 2: thư mục đã chọn bị mất (USB rút) + thư mục dữ liệu trống → báo rõ nguyên nhân, không treo
  const p2 = await prepare(); breakStore(p2.D); fs.rmSync(p2.SD, { recursive: true, force: true });
  app = await launch(p2.D, ""); w = await app.firstWindow(); w.on("dialog", (d) => d.accept());
  const t0 = Date.now(); await w.waitForSelector("[data-snapshot-candidates]", { timeout: 20000 });
  ok("Thư mục đã chọn mất: không treo (hiện trong < 15 s)", Date.now() - t0 < 15000);
  const err = w.locator('[data-source-error="chosen"]'); ok("Báo nguồn không đọc được, nêu đường dẫn + nguyên nhân", (await err.count()) === 1 && (await err.innerText()).includes(p2.SD) && /USB|ổ mạng|Không tìm thấy/.test(await err.innerText()), await err.count() ? await err.innerText() : "không có khối lỗi");
  ok("Không có bản nào để khôi phục (không bịa)", (await w.locator("[data-snapshot-candidates] [data-candidate]").count()) === 0);
  ok("Không tự tạo lại thư mục đã mất", !fs.existsSync(p2.SD));
  await app.close();
  const pass = results.filter(Boolean).length; console.log("SQLite-restore-from-dir E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
