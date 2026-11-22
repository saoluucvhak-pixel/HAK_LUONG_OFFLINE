// Đo bảng lương kết quả (renderKq) trên Electron thật: bảng ảo hóa (v2.0.98) so với dựng đủ mọi dòng. Dữ liệu giả, thư mục tạm.
// Chạy: xvfb-run -a node tests/perf/ui-bench.js   (dùng thư mục dữ liệu tạm, không đụng dữ liệu thật)
/* global document, localStorage, performance, requestAnimationFrame, window */ // dùng trong w.evaluate(...) chạy bên trong cửa sổ app
"use strict";
const APP = process.argv[2] || require("path").resolve(__dirname, "../..");
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const PASS = "PerfBench2026x";
const account = (user, name, role) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: user.toUpperCase(), tenDangNhap: user, hoTen: name, vaiTro: role, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const F = require(path.join(APP, "tests/fixtures/build.js"));
(async () => {
  for (const n of (process.env.N || "1000").split(",").map(Number)) for (const mode of ["dung-du", "ao-hoa"]) {
    const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "uib-"));
    const db = F.regressionDataset(n); db.schemaVersion = 2;
    for (const k of ["sanluong", "bandam"]) for (const x of db[k] || []) if (!(Number(String(x["KL hàng (Tấn)"]).replace(",", ".")) > 0)) x["KL hàng (Tấn)"] = "1"; // bộ dữ liệu giả có phiếu khối lượng 0 → app chặn tính lương; đặt 1 để đo bảng
    db.nguoidung = [account("admin", "Quản trị giả", "admin")];
    fs.writeFileSync(path.join(DATA, "data.json"), JSON.stringify(db));
    const app = await _electron.launch({ executablePath: process.env.ELECTRON_PATH || require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: DATA }) });
    const w = await app.firstWindow(); w.on("dialog", (d) => { console.log("DIALOG", d.message().slice(0, 300)); d.accept(); });
    await w.waitForSelector("#main > *");
    await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]").catch(async (e) => { console.log("LOGIN KHONG VAO:", (await w.evaluate(() => document.body.innerText.slice(0, 500))).replace(/\n/g, " | ")); throw e; });
    await w.evaluate(() => { const s = JSON.parse(localStorage.getItem("luonghak_db_v1_ui") || "{}"); s.nam = 2026; s.thang = 9; localStorage.setItem("luonghak_db_v1_ui", JSON.stringify(s)); });
    await w.selectOption("#top select", "9"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change");
    console.log("NAV", await w.evaluate(() => [...document.querySelectorAll("#nav button")].map((b) => b.dataset.k).join(",")));
    await w.click("#nav button[data-k=luong]"); await w.waitForSelector("[data-payroll-hub]");
    if (mode === "dung-du") await w.evaluate(() => { window.HAKUI.virtualTable = undefined; }); // mô phỏng bản cũ: không ảo hóa
    const t0 = Date.now(); await w.locator("button.pri.big").first().click(); await w.waitForSelector(".tw table tbody tr:not(.vt-pad)", { timeout: 90000 }).catch(async (e) => { console.log("KHONG CO BANG:", (await w.evaluate(() => document.querySelector("#main").innerText.slice(0, 600))).replace(/\n/g, " | ")); throw e; });
    await w.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))); const tTinh = Date.now() - t0;
    const r = await w.evaluate(async () => {
      const tw = document.querySelector("#main .tw"), rows = tw.querySelectorAll("tbody tr:not(.vt-pad)").length, nodes = document.querySelectorAll("#main *").length;
      const frames = []; let last = performance.now(), pos = 0;
      await new Promise((res) => { const step = (t) => { frames.push(t - last); last = t; pos += 300; tw.scrollTop = pos; if (frames.length < 200) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      frames.shift(); frames.sort((a, b) => a - b);
      return { rows, nodes, frameP50: +frames[Math.floor(frames.length / 2)].toFixed(1), frameP95: +frames[Math.floor(frames.length * 0.95)].toFixed(1), heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576) };
    });
    console.log(JSON.stringify(Object.assign({ n, mode, tinhVaVe_ms: tTinh }, r)));
    await app.close(); fs.rmSync(DATA, { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
