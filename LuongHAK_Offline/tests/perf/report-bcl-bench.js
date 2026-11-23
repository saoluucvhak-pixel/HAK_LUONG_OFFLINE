// Đo các báo cáo con của tab "Báo cáo lương" (tabBaoCaoLuong) trên Electron thật: thời gian bấm → khung vẽ, số phần tử DOM của #main. Dữ liệu giả.
// Chạy: xvfb-run -a node tests/perf/ui-bench.js   (dùng thư mục dữ liệu tạm, không đụng dữ liệu thật)
/* global document, localStorage, performance, requestAnimationFrame */ // dùng trong w.evaluate(...) chạy bên trong cửa sổ app
"use strict";
const APP = process.argv[2] || require("path").resolve(__dirname, "../..");
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const PASS = "PerfBench2026x";
const account = (user, name, role) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: user.toUpperCase(), tenDangNhap: user, hoTen: name, vaiTro: role, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const F = require(path.join(APP, "tests/fixtures/build.js"));
(async () => {
  for (const n of (process.env.N || "1000").split(",").map(Number)) {
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
    await w.locator("button.pri.big").first().click(); await w.waitForSelector(".tw table tbody tr:not(.vt-pad)", { timeout: 300000 }); 
    await w.evaluate(() => document.querySelector("#nav button[data-k=baocaoluong]").click());
    await w.waitForSelector("#main button");
    const labels = await w.evaluate(() => [...document.querySelectorAll("#main button")].map((b) => b.textContent.trim()).filter((t) => /Tổng hợp công|Phân bổ sản lượng|Báo cáo bảo hiểm|Bảng hạch toán|So sánh với kỳ trước|Lương 12 tháng|Thu nhập năm theo NV|Thuế TNCN cả năm/.test(t)));
    const out = [];
    for (let pass = 1; pass <= 2; pass++) for (let i = 0; i < labels.length; i++) { // lượt 1: lần đầu; lượt 2: quay lại báo cáo con đã xem (bản chụp)
      const r = await w.evaluate(async (i) => { const b = [...document.querySelectorAll("#main button")].filter((x) => /Tổng hợp công|Phân bổ sản lượng|Báo cáo bảo hiểm|Bảng hạch toán|So sánh với kỳ trước|Lương 12 tháng|Thu nhập năm theo NV|Thuế TNCN cả năm/.test(x.textContent))[i]; const t0 = performance.now(); b.click(); const js = performance.now() - t0; await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return { ms: Math.round((performance.now() - t0) * 10) / 10, js: Math.round(js * 10) / 10, nodes: document.querySelectorAll("#main *").length, rows: document.querySelectorAll("#main tbody tr").length }; }, i);
      out.push(Object.assign({ luot: pass, tab: labels[i] }, r));
    }
    console.log(JSON.stringify({ n, tabs: out }));
    await app.close(); fs.rmSync(DATA, { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
