"use strict";
// v2.1.5: chọn thư mục sao lưu SQLite trên Electron THẬT (dữ liệu giả): chọn thư mục → lưu cấu hình → bấm Sao lưu → bản chụp chép sang thư mục đó, SHA-256 khớp → "Về mặc định".
// Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/sqlite-dir.cjs
/* global window */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const APP = path.resolve(__dirname, "../.."), F = require(path.join(APP, "tests/fixtures/build.js")), PASS = "SqliteDir2026x";
const results = []; const ok = (n, c, x) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (!c && x ? " — " + String(x).slice(0, 600) : "")); };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "sqdir-")), SD = fs.mkdtempSync(path.join(os.tmpdir(), "sqdir-out-")), db = F.regressionDataset(30); db.schemaVersion = 2; db.nguoidung = [account("admin", "Quản trị giả", "admin")];
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const app = await _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_NO_SHELL: "1", HAK_PICK_DIR: SD }) });
  const w = await app.firstWindow(); w.on("dialog", (d) => d.accept()); await w.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
  await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  await w.evaluate(() => document.querySelector("#nav button[data-k=backup]").click()); await w.click('[data-sl-tab="tm"]'); await w.waitForSelector('[data-stg="sqlite"]');
  ok("Dòng SQLite có nút 'Chọn / Chuyển…' và chưa tùy chỉnh", (await w.locator('[data-stg="sqlite"] button:has-text("Chọn")').count()) === 1 && (await w.locator('[data-stg="sqlite"] button:has-text("Về mặc định")').count()) === 0);
  await w.locator('[data-stg="sqlite"] button:has-text("Chọn")').click();
  await w.locator('[data-confirm-storage-move="sqlite"]').click();
  await w.locator("[data-stg-msg].ok").waitFor();
  const settings = () => JSON.parse(fs.readFileSync(path.join(D, "settings.json"), "utf8"));
  ok("Chọn thư mục → lưu cấu hình sqliteDir", settings().sqliteDir === SD, JSON.stringify(settings()));
  ok("Hiện đúng đường dẫn đã chọn + nút 'Về mặc định'", (await w.locator('[data-stg="sqlite"] .bk-path').innerText()).includes(SD) && (await w.locator('[data-stg="sqlite"] button:has-text("Về mặc định")').count()) === 1);
  await w.click('[data-sl-tab="sl"]'); await w.waitForSelector("[data-backup-now]"); await w.selectOption("[data-backup-kind]", "sqlite"); await w.click("[data-backup-now]"); await w.waitForTimeout(3500);
  const outs = fs.readdirSync(SD).filter((x) => /^snap_.*\.sqlite$/.test(x)), local = path.join(D, "backups");
  ok("Sau khi Sao lưu: thư mục đã chọn có data-snapshot.sqlite + bản lịch sử", fs.existsSync(path.join(SD, "data-snapshot.sqlite")) && outs.length >= 1, fs.readdirSync(SD).join(","));
  ok("SHA-256 bản trong thư mục đã chọn khớp bản trong thư mục dữ liệu", outs.length > 0 && outs.every((n) => fs.existsSync(path.join(local, n)) && sha(path.join(SD, n)) === sha(path.join(local, n))));
  await w.click('[data-sl-tab="tm"]'); await w.waitForSelector('[data-stg="sqlite"] button:has-text("Về mặc định")'); await w.locator('[data-stg="sqlite"] button:has-text("Về mặc định")').click(); await w.waitForTimeout(1200);
  ok("Về mặc định → xóa cấu hình sqliteDir, bản đã chép giữ nguyên", !settings().sqliteDir && fs.existsSync(path.join(SD, "data-snapshot.sqlite")));
  await app.close();
  const pass = results.filter(Boolean).length; console.log("SQLite-dir E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
