// Đo chuyển tab báo cáo lương (lần đầu / lần sau) trên Electron thật với dữ liệu giả lớn (PROMPT 5: bộ nhớ đệm báo cáo).
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
    const t0 = Date.now(); await w.locator("button.pri.big").first().click(); await w.waitForSelector(".tw table tbody tr:not(.vt-pad)", { timeout: 300000 }); const tTinh = Date.now() - t0;
    if (process.env.SHELL_OFF) await w.evaluate(() => localStorage.setItem("hak_shell_off", "1")); // A/B: tắt cập nhật khung tại chỗ
    const keys = (process.env.TABS || "rp_tonghop,baocaoluong,baocao,rp_pb,rp_tncn,rp_ctnv,luong,rp_ns,rp_th").split(",");
    const sw = async (k) => { const t = await w.evaluate(async (k) => { const b = document.querySelector("#nav button[data-k=" + k + "]"); if (!b) return -1; const t0 = performance.now(); b.click(); const sync = performance.now() - t0; await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return { ms: performance.now() - t0, sync, snap: window.__hakSnapshot || null }; }, k); return t === -1 ? -1 : { ms: Math.round(t.ms * 10) / 10, jsMs: Math.round(t.sync * 10) / 10, snap: t.snap }; };
    if (process.env.PROFILE) { // hồ sơ CPU của vòng chuyển tab (đường trúng bản chụp): in 12 hàm tốn nhất theo thời gian riêng
      const cdp = await w.context().newCDPSession(w); await cdp.send("Profiler.enable"); await sw("rp_tonghop"); await sw("huongdan");
      await cdp.send("Profiler.start"); for (let i = 0; i < 15; i++) { await sw("rp_tonghop"); await sw("huongdan"); }
      const { profile } = await cdp.send("Profiler.stop"), self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map((n) => [n.id, n]));
      profile.samples.forEach((id, i) => { const n = byId.get(id), k = n.callFrame.functionName + " " + n.callFrame.url.split("/").pop() + ":" + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
      console.log("PROFILE", JSON.stringify([...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 14).map(([k, v]) => [k, Math.round(v / 1000)])));
    }
    if (process.env.REPEAT) { // đo lặp: trung bình thời gian JS và tổng (đến khung vẽ kế tiếp) của lần chuyển tab TRÚNG bản nhớ, xen kẽ tab → trang chủ → tab
      const R = +process.env.REPEAT, res = [];
      for (const k of keys) { await sw(k); await sw("home"); const js = [], tot = []; for (let i = 0; i < R; i++) { const r = await sw(k); js.push(r.jsMs); tot.push(r.ms); await sw("home"); }
        const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10, med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1]; res.push({ tab: k, jsTB: avg(js), jsTrungVi: med(js), tongTrungVi: med(tot) }); }
      console.log("REPEAT " + JSON.stringify({ n, shellOff: !!process.env.SHELL_OFF, res })); await app.close(); fs.rmSync(DATA, { recursive: true, force: true }); continue;
    }
    const rows = [];
    for (const k of keys) { const first = await sw(k); await sw("home"); const again = await sw(k); await sw("home"); rows.push({ tab: k, lanDau: first, lanSau: again }); }
    console.log(JSON.stringify({ n, tinhLuong_ms: tTinh, tabs: rows }));
    await app.close(); fs.rmSync(DATA, { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
