"use strict";
// v2.1.15 (mục 8, Q-15): khôi phục THEO KỲ làm đổi phụ lục hợp đồng mà kỳ đã chốt đang dùng → giao diện CHẶN, nêu kỳ + phụ lục + cách làm, KHÔNG ghi gì. Electron thật, dữ liệu giả.
// Luồng: dữ liệu có kỳ 2026-08 đã chốt + phụ lục dùng cho kỳ đó → tạo gói kỳ 2026-09 → đổi phụ lục ở máy → "Khôi phục kỳ lương…" chọn gói → màn chặn.
// Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/period-restore-frozen.cjs
/* global window */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const APP = path.resolve(__dirname, "../.."), F = require(path.join(APP, "tests/fixtures/build.js")), PASS = "FrozenRest2026x";
const results = []; const ok = (n, c, x) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (!c && x ? " — " + String(x).slice(0, 700) : "")); };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const sha = (o) => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex");
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "frz-")), db = F.regressionDataset(30); db.schemaVersion = 2; db.nguoidung = [account("admin", "Quản trị giả", "admin")];
  const hd = db.chitiethd.find((c) => c["Mã NV"]), ma = hd["Mã NV"], rows = db.nhanvien.map((n) => ({ "Mã NV": n["Mã NV"], "Họ và tên": n["Họ và tên"], "Thực lĩnh": 1000, "Tổng thu nhập": 1200 }));
  db.kyluong = [{ ky: "2026-08", version: 1, kq: { bangluong: rows, bhxh: [], tncn: [], canhbao: [] } }]; // kỳ 08 đã chốt, dùng phụ lục hiện có
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const launch = (pick) => _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_NO_SHELL: "1", HAK_KY_PICK: pick || "" }) });
  const login = async (w) => { await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]"); };
  // 1) tạo gói kỳ 2026-09 từ dữ liệu hiện tại (phụ lục giữ nguyên "Mã lương" cũ)
  let app = await launch(""), w = await app.firstWindow(); w.on("dialog", (d) => d.accept()); await login(w);
  const made = await w.evaluate(() => window.hakPeriod.create({ ky: "2026-09", user: "admin" })); ok("Tạo được gói kỳ 2026-09", made && made.ok, JSON.stringify(made).slice(0, 300));
  const pkg = made && made.file ? made.file : path.join(D, made && made.name ? made.name : ""); 
  // 2) đổi phụ lục ở máy (mô phỏng: sau khi tạo gói, phụ lục bị sửa bằng đường ghi trực tiếp) → gói khác máy ở phụ lục đã khóa
  const before = await w.evaluate(async (m) => { const d = JSON.parse(window.hakStore.load().text); const r = d.chitiethd.find((c) => c["Mã NV"] === m); const old = r["Mã lương"]; r["Mã lương"] = String(old) + "_SUA"; const res = window.hakStore.save(JSON.stringify(d)); return { old, res }; }, ma);
  ok("Chuẩn bị: phụ lục ở máy khác với trong gói", before && before.res === true, JSON.stringify(before));
  await app.close();
  // 3) mở lại, khôi phục kỳ từ gói → bị CHẶN
  app = await launch(pkg); w = await app.firstWindow(); const dialogs = []; w.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); }); await login(w);
  await w.evaluate(() => document.querySelector("#nav button[data-k=backup]").click());
  let found = false; for (const t of ["sl", "tm", "lich", "kt", "bk", "hd", "ls"]) { if ((await w.locator('button:has-text("Khôi phục kỳ lương")').count()) > 0) { found = true; break; } const tab = w.locator('[data-sl-tab="' + t + '"]'); if (await tab.count()) { await tab.click(); await w.waitForTimeout(300); } }
  if (!found) { const tabs = await w.locator("[data-sl-tab]").evaluateAll((els) => els.map((e) => e.getAttribute("data-sl-tab"))); for (const t of tabs) { await w.locator('[data-sl-tab="' + t + '"]').click(); await w.waitForTimeout(300); if ((await w.locator('button:has-text("Khôi phục kỳ lương")').count()) > 0) { found = true; break; } } }
  ok("Thấy nút 'Khôi phục kỳ lương…'", found);
  const snapBefore = await w.evaluate(() => JSON.stringify(JSON.parse(window.hakStore.load().text).chitiethd));
  await w.locator('button:has-text("Khôi phục kỳ lương")').first().click(); await w.waitForSelector("[data-ky-blocked]", { timeout: 20000 }).catch(() => {});
  const txt = (await w.locator("[data-ky-blocked]").count()) ? await w.locator("[data-ky-blocked]").first().innerText() : "(không có khối chặn) " + dialogs.join("|");
  ok("Màn khôi phục hiện khối chặn (data-ky-blocked) nêu gói làm đổi phụ lục đã khóa", /Gói làm đổi\/xóa \d+ phụ lục hợp đồng/.test(txt), txt);
  ok("Thông báo nêu kỳ đã chốt 2026-08, phụ lục, Q-15 và cách làm (phụ lục MỚI / mở chốt có lý do)", /2026-08/.test(txt) && /phụ lục/.test(txt) && /Q-15/.test(txt) && /phụ lục MỚI|mở chốt/.test(txt), txt);
  ok("Không có nút tiếp tục ghi (chỉ nút Đóng)", (await w.locator("[data-restore-ky-now], [data-ky-apply]").count()) === 0);
  const snapAfter = await w.evaluate(() => JSON.stringify(JSON.parse(window.hakStore.load().text).chitiethd));
  ok("Dữ liệu KHÔNG bị ghi (phụ lục giữ nguyên)", snapBefore === snapAfter);
  await app.close();
  const pass = results.filter(Boolean).length; console.log("Period-restore-frozen E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
