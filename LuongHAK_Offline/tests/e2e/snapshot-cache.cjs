"use strict";
// v2.1.1: bộ nhớ đệm báo cáo trên Electron THẬT, dữ liệu giả. Cốt lõi là AN TOÀN: không bao giờ hiện số cũ.
//  - quay lại tab báo cáo bằng thanh điều hướng → trúng bản chụp, và bản chụp GIỐNG HỆT bản dựng mới (chế độ tự đối chiếu bật suốt bài)
//  - dữ liệu đổi / đổi kỳ → trượt bản chụp (dựng mới); tắt bằng hak_snapshot_off → không bao giờ trúng
// Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/snapshot-cache.cjs
/* global window, localStorage, document */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const APP = path.resolve(__dirname, "../.."), F = require(path.join(APP, "tests/fixtures/build.js")), PASS = "SnapCache2026x";
const results = []; const ok = (n, c, x) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (!c && x ? " — " + String(x).slice(0, 1800) : "")); };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "snapc-")), db = F.regressionDataset(300); db.schemaVersion = 2;
  for (const k of ["sanluong", "bandam"]) for (const x of db[k] || []) if (!(Number(String(x["KL hàng (Tấn)"]).replace(",", ".")) > 0)) x["KL hàng (Tấn)"] = "1";
  db.nguoidung = [account("admin", "Quản trị giả", "admin")]; fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const app = await _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D }) });
  const w = await app.firstWindow(), errs = []; w.on("pageerror", (e) => errs.push(e.message)); w.on("dialog", (d) => d.accept());
  await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  await w.evaluate(() => { const s = JSON.parse(localStorage.getItem("luonghak_db_v1_ui") || "{}"); s.nam = 2026; s.thang = 9; localStorage.setItem("luonghak_db_v1_ui", JSON.stringify(s)); });
  await w.selectOption("#top select", "9"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change");
  await w.evaluate(() => window.__hakSnapshotVerify(true));
  const go = (k) => w.evaluate(async (k) => { const b = document.querySelector("#nav button[data-k=" + k + "]"); if (!b) return null; window.__hakSnapshot = null; b.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return window.__hakSnapshot; }, k);
  await w.click("#nav button[data-k=luong]"); await w.locator("button.pri.big").first().click(); await w.waitForSelector(".tw table tbody tr:not(.vt-pad)", { timeout: 120000 });
  const TABS = ["rp_tonghop", "rp_ctnv", "rp_pb", "rp_tncn", "baocao", "baocaoluong", "rp_ns", "rp_th"];
  const first = {}, again = {};
  for (const k of TABS) { first[k] = await go(k); await go("home"); again[k] = await go(k); await go("home"); }
  ok("lần đầu mỗi tab báo cáo: dựng mới (không trúng)", TABS.every((k) => first[k] && first[k].hit === false), JSON.stringify(first));
  ok("quay lại bằng thanh điều hướng: trúng bản chụp ở mọi tab báo cáo", TABS.every((k) => again[k] && again[k].hit === true), JSON.stringify(again));
  ok("chế độ tự đối chiếu: bản đã nhớ GIỐNG HỆT bản dựng mới ở mọi tab (không lệch)", (await w.evaluate(() => window.__hakSnapshotMismatch)).length === 0, JSON.stringify(await w.evaluate(() => window.__hakSnapshotMismatch)));
  const textBefore = await w.evaluate(() => { document.querySelector("#nav button[data-k=rp_tonghop]").click(); return document.querySelector("#main").innerText.slice(0, 4000); });
  // Dữ liệu đổi → phải trượt. Sửa một ô công trong lưới chấm công bằng giao diện thật.
  await go("chamcong"); await w.waitForSelector("main tbody tr");
  const cell = w.locator("main tbody tr").first().locator("td.day input").first(); await cell.fill("2"); await cell.dispatchEvent("change");
  await w.evaluate(() => new Promise((r) => setTimeout(r, 600)));
  await go("home"); const afterEdit = await go("rp_tonghop");
  ok("dữ liệu vừa đổi: báo cáo KHÔNG lấy bản cũ (trượt, dựng mới)", afterEdit && afterEdit.hit === false, JSON.stringify(afterEdit));
  await go("home"); const afterEdit2 = await go("rp_tonghop");
  ok("sau đó quay lại: lại trúng bản chụp MỚI và vẫn giống hệt bản dựng mới", afterEdit2 && afterEdit2.hit === true && (await w.evaluate(() => window.__hakSnapshotMismatch)).length === 0, JSON.stringify(afterEdit2));
  const textAfter = await w.evaluate(() => document.querySelector("#main").innerText.slice(0, 4000));
  ok("(thông tin) nội dung báo cáo sau khi sửa công đã đổi hoặc báo Nháp", textAfter !== textBefore || /Nháp|chưa/i.test(textAfter), "cùng nội dung");
  // Báo cáo con của "Báo cáo lương": đổi báo cáo con nhiều lần; quay lại báo cáo con đã xem → trúng; bảng nhiều dòng được ảo hóa và cuộn tới được dòng cuối
  const sub = (txt) => w.evaluate(async (txt) => { const b = [...document.querySelectorAll("#main button")].find((x) => x.textContent.includes(txt)); if (!b) return null; window.__hakSnapshot = null; b.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); const tw = document.querySelector("#main .tw"), rows = [...document.querySelectorAll("#main tbody tr:not(.vt-pad)")]; return { snap: window.__hakSnapshot, rows: rows.length, first: rows[0] ? rows[0].textContent.slice(0, 60) : "", hasTw: !!tw }; }, txt);
  await go("home"); await go("baocaoluong");
  const sCong = await sub("Tổng hợp công"), sBH = await sub("Báo cáo bảo hiểm"), sCong2 = await sub("Tổng hợp công"), sBH2 = await sub("Báo cáo bảo hiểm");
  ok("báo cáo con: lần đầu dựng mới", sCong && sBH && sBH.snap && sBH.snap.hit === false, JSON.stringify([sCong, sBH]));
  ok("báo cáo con: quay lại báo cáo con đã xem → trúng bản chụp, giống hệt bản dựng mới", sCong2 && sCong2.snap && sCong2.snap.hit === true && sBH2.snap.hit === true && (await w.evaluate(() => window.__hakSnapshotMismatch)).length === 0, JSON.stringify([sCong2.snap, sBH2.snap]));
  ok("báo cáo con nhiều dòng được ảo hóa (chỉ dựng phần đang nhìn thấy)", sCong2.rows > 0 && sCong2.rows < 120, JSON.stringify(sCong2));
  await sub("Tổng hợp công");
  const scrolled = await w.evaluate(async () => { const tw = [...document.querySelectorAll("#main .tw")].find((x) => x.querySelector("tbody tr:not(.vt-pad)")), first0 = tw.querySelector("tbody tr:not(.vt-pad)").textContent; tw.scrollTop = tw.scrollHeight; await new Promise((r) => setTimeout(r, 400)); const rows = [...tw.querySelectorAll("tbody tr:not(.vt-pad)")]; return { first0: first0.slice(0, 50), firstNow: rows[0].textContent.slice(0, 50), n: rows.length, hasPadTop: !!tw.querySelector('[data-vt-pad="top"]') }; });
  ok("bảng ảo hóa: cuộn xuống cuối thì dòng đổi (không chỉ hiện đầu bảng)", scrolled.firstNow !== scrolled.first0 && scrolled.n > 0 && scrolled.n < 120 && scrolled.hasPadTop, JSON.stringify(scrolled));
  await go("home"); await go("rp_tonghop"); // quay về tab tổng hợp lương cho phần kiểm đổi kỳ bên dưới
  // Đổi kỳ: không bao giờ hiện bản chụp của kỳ KHÁC (bản chụp gắn với kỳ trong dấu vân tay)
  const periodText = () => w.evaluate(() => document.querySelector("#main").innerText.slice(0, 600));
  const t9 = await periodText();
  await w.evaluate(() => { window.__hakSnapshot = null; }); await w.selectOption("#top select", "8"); // đổi kỳ trong màn hình → vẽ lại trực tiếp
  const sw8 = await w.evaluate(() => window.__hakSnapshot), t8 = await periodText();
  ok("đổi kỳ ngay trong màn hình: dựng mới (không trúng bản chụp kỳ 9)", sw8 && sw8.hit === false, JSON.stringify(sw8));
  ok("đổi kỳ: nội dung báo cáo đã đổi theo kỳ 8 (khác kỳ 9)", t8 !== t9, t8.slice(0, 200));
  await go("home"); const back8 = await go("rp_tonghop"), tBack = await periodText();
  ok("quay lại bằng thanh điều hướng ở kỳ 8: bản chụp là của kỳ 8, không phải kỳ 9", back8 && back8.mismatch === false && tBack === t8 && tBack !== t9, JSON.stringify(back8) + " | KỲ8-vẽ-trực-tiếp: " + JSON.stringify(t8.slice(0, 260)) + " | SAU-KHI-QUAY-LẠI: " + JSON.stringify(tBack.slice(0, 260)));
  // Tắt bằng cờ
  await w.evaluate(() => localStorage.setItem("hak_snapshot_off", "1")); await go("home"); await go("rp_ctnv"); await go("home"); const off = await go("rp_ctnv");
  ok("cờ hak_snapshot_off=1: không bao giờ dùng bản chụp", !off || off.hit !== true, JSON.stringify(off)); await w.evaluate(() => localStorage.removeItem("hak_snapshot_off"));
  // Vẽ lại do thao tác trong màn hình (không phải thanh điều hướng) luôn dựng mới
  await w.selectOption("#top select", "9"); await go("rp_tonghop"); await go("home"); await go("rp_tonghop");
  await w.evaluate(() => { window.__hakSnapshot = null; }); await w.selectOption("#top select", "9"); // đổi kỳ trong màn hình → render() trực tiếp
  const inScreen = await w.evaluate(() => window.__hakSnapshot);
  ok("vẽ lại do thao tác trong màn hình: không trúng bản chụp", !inScreen || inScreen.hit !== true, JSON.stringify(inScreen));
  ok("không lỗi JavaScript trong cả bài", errs.length === 0, errs.join(" | "));
  await app.close(); fs.rmSync(D, { recursive: true, force: true });
  const bad = results.filter((x) => !x).length; console.log("\nSnapshot cache E2E: " + (results.length - bad) + "/" + results.length + " đạt"); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
