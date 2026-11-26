"use strict";
// v2.1.18 (A6-12): PDF phiếu lương TỪNG NGƯỜI trên Electron thật (dữ liệu giả): mỗi người 1 trang, kỳ chưa chốt có _TAM, lọc theo tìm kiếm, tên tệp theo Mã NV khi 1 phiếu.
// Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/slip-pdf.cjs
/* global window */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const APP = path.resolve(__dirname, "../.."), F = require(path.join(APP, "tests/fixtures/build.js")), PASS = "SlipPdf2026x";
const results = []; const ok = (n, c, x) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (!c && x ? " — " + String(x).slice(0, 600) : "")); };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const pages = (f) => { const b = fs.readFileSync(f); return { isPdf: b.slice(0, 5).toString() === "%PDF-", n: (b.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length, size: b.length }; };
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "slippdf-")), DL = path.join(D, "downloads"), db = F.regressionDataset(30); db.schemaVersion = 2; db.nguoidung = [account("admin", "Quản trị giả", "admin")];
  db.sanluong = []; db.bandam = []; // bỏ phiếu cân mẫu có Mã NV không hợp đồng (chặn xuất theo chốt chặn dữ liệu của app, không liên quan phiếu lương)
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const app = await _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: DL, HAK_NO_SHELL: "1" }) });
  const w = await app.firstWindow(); const dlgs = []; w.on("dialog", (d) => { dlgs.push(d.message()); d.accept(); }); await w.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
  await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  await w.selectOption("#top select", "10"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(400);
  await w.click("#nav button[data-k=slips]"); await w.waitForSelector("[data-slips]"); await w.waitForTimeout(600);
  const total = +(await w.locator("[data-slips]").getAttribute("data-slips"));
  ok("Có nút 'PDF từng phiếu' và 'PDF danh sách' tách riêng", (await w.locator('main .bar button:has-text("PDF từng phiếu")').count()) === 1 && (await w.locator('main .bar button:has-text("PDF danh sách")').count()) === 1);
  const waitNew = async (re, before) => { let n = null; for (let i = 0; i < 100 && !n; i++) { await w.waitForTimeout(300); n = fs.existsSync(DL) ? fs.readdirSync(DL).find((f) => re.test(f) && !before.includes(f)) : null; } return n; };
  // 1) tất cả phiếu: mỗi người 1 trang, kỳ chưa chốt → _TAM
  fs.mkdirSync(DL, { recursive: true }); let bf = fs.readdirSync(DL); await w.click('main .bar button:has-text("PDF từng phiếu")');
  let f1 = await waitNew(/^PhieuLuong_TungNguoi_2026-10.*\.pdf$/, bf); ok("Xuất được PDF từng phiếu; kỳ chưa chốt → tên có _TAM", !!f1 && /_TAM\.pdf$/.test(f1), String(f1) + " | dialogs: " + dlgs.join(" || ") + " | toast: " + (await w.locator("#toast, .toast").allInnerTexts()).join(","));
  if (f1) { await w.waitForTimeout(500); const p = pages(path.join(DL, f1)); ok("File là PDF thật; số trang = số phiếu (" + total + ")", p.isPdf && p.n === total && p.size > 3000, JSON.stringify(p) + " vs " + total); }
  // 2) lọc 1 người → 1 trang, tên tệp có Mã NV
  const ma = await w.evaluate(() => JSON.parse(window.hakStore.load().text).nhanvien[0]["Mã NV"]);
  await w.fill('main input[type=search]', ma); await w.dispatchEvent('main input[type=search]', "change"); await w.waitForTimeout(400);
  const one = +(await w.locator("[data-slips]").getAttribute("data-slips")); bf = fs.readdirSync(DL); await w.click('main .bar button:has-text("PDF từng phiếu")');
  const f2 = await waitNew(/^PhieuLuong_TungNguoi_.*\.pdf$/, bf); ok("Lọc 1 người: tên tệp có Mã NV " + ma, !!f2 && f2.includes(ma), String(f2) + " / số phiếu " + one);
  if (f2) { await w.waitForTimeout(500); const p = pages(path.join(DL, f2)); ok("Lọc 1 người: đúng 1 trang", p.isPdf && p.n === one && one >= 1, JSON.stringify(p) + " vs " + one); }
  // In qua IPC thật với phiếu dài, kiểm nội dung trên từng trang.
  const S = require("../../ui/slip-pdf.js"), P = require("../helpers/pdf-text.cjs");
  const long = { maNV: "LONG001", hoTen: "Nguyễn Thị Minh Anh Phạm Hoàng Gia Linh", phongBan: "Tổ giả",
    lines: Array.from({ length: 25 }, (_, i) => ({ label: "Khoản thử " + (i + 1), value: 1000 + i })) };
  long.lines.push({ label: "THỰC LĨNH", value: 4321000, tot: true, grand: true });
  const short = { maNV: "SHORT001", hoTen: "Trần Văn Minh", lines: [{ label: "THỰC LĨNH", value: 1000, grand: true }] };
  for (const chot of [true, false]) {
    const html = S.html({ ky: "10/2026", chot, slips: [long, short] });
    const result = await w.evaluate((payload) => window.hakReport.pdf(payload), { html, name: "PhieuDai_" + chot + ".pdf", landscape: false });
    if (!result.ok) { ok("In được phiếu dài", false, result.error); continue; }
    const pdf = P.extract(fs.readFileSync(path.join(result.dir, result.name)));
    const text = pdf.pages.map((page) => P.canon(page.lines.flatMap((line) => line.cells.map((cell) => cell.text)).join(" ")));
    const has = (n, value) => text[n] && text[n].includes(P.canon(value));
    ok("Phiếu dài lặp nhận diện và giữ Thực lĩnh cùng khối ký, kỳ chốt=" + chot,
      text.length === 3 && [0, 1].every((n) => has(n, "LONG001") && has(n, long.hoTen) && has(n, "10/2026")) &&
      has(1, "4.321.000") && has(1, "Người lao động nhận") && has(2, "SHORT001") && !has(2, "LONG001") &&
      (chot || [0, 1, 2].every((n) => has(n, "TẠM TÍNH"))), text.join(" | "));
  }
  if (process.env.KEEP_DL) fs.cpSync(DL, process.env.KEEP_DL, { recursive: true });
  await app.close();
  const pass = results.filter(Boolean).length; console.log("Slip-PDF E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
