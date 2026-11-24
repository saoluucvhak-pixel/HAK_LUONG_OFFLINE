"use strict";
// v2.1.22 (Q10 phần 3/3): in PHIẾU CHI tiền mặt (PDF) từ Sổ chứng từ thanh toán trên Electron thật (dữ liệu giả): mỗi chứng từ tiền mặt 1 trang; bỏ chuyển khoản và phiếu đã hủy.
// Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/payment-voucher.cjs
/* global window */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const APP = path.resolve(__dirname, "../.."), F = require(path.join(APP, "tests/fixtures/build.js")), PASS = "Voucher2026x";
const results = []; const ok = (n, c, x) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (!c && x ? " — " + String(x).slice(0, 600) : "")); };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const pages = (f) => { const b = fs.readFileSync(f); return { isPdf: b.slice(0, 5).toString() === "%PDF-", n: (b.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length }; };
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "voucher-")), DL = path.join(D, "downloads"), db = F.regressionDataset(30); db.schemaVersion = 2; db.nguoidung = [account("admin", "Quản trị giả", "admin")]; db.sanluong = []; db.bandam = [];
  const mk = (so, ma, tien, ht, tt) => ({ "Số chứng từ": so, "Kỳ": "2026-10", "Hình thức": ht, "Mã NV": ma, "Họ và tên": "Người " + ma, "Số tiền": tien, "Trạng thái": tt, "Ngày lập": "2026-11-05", "Người lập": "admin" });
  db.ttluong = [mk("TM-2026-10-001", "NV001", 8950000, "Tiền mặt", "Đã lập"), mk("TM-2026-10-002", "NV002", 5000000, "Tiền mặt", "Đã duyệt"), mk("CK-2026-10-001", "NV003", 7000000, "Chuyển khoản", "Đã duyệt"), mk("TM-2026-10-003", "NV004", 1000000, "Tiền mặt", "Đã hủy")];
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db)); fs.mkdirSync(DL, { recursive: true });
  const app = await _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: DL, HAK_NO_SHELL: "1" }) });
  const w = await app.firstWindow(); const dlgs = []; w.on("dialog", (d) => { dlgs.push(d.message()); d.accept(); }); await w.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
  await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  await w.selectOption("#top select", "10"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(400);
  await w.click("#nav button[data-k=rp_soct]"); await w.waitForTimeout(800);
  const btn = w.locator('main .bar button:has-text("In phiếu chi tiền mặt")'); ok("Màn Sổ chứng từ có nút 'In phiếu chi tiền mặt (PDF)'", (await btn.count()) === 1, dlgs.join("|"));
  const before = fs.readdirSync(DL); await btn.click(); let f = null; for (let i = 0; i < 100 && !f; i++) { await w.waitForTimeout(300); f = fs.readdirSync(DL).find((n) => /^PhieuChi_.*\.pdf$/.test(n) && !before.includes(n)); }
  ok("Xuất được PDF phiếu chi", !!f, String(f) + " | " + dlgs.join(" | ")); if (f) { await w.waitForTimeout(500); const p = pages(path.join(DL, f)); ok("PDF thật; 2 trang = 2 phiếu tiền mặt (bỏ chuyển khoản + đã hủy)", p.isPdf && p.n === 2, JSON.stringify(p)); ok("Tên tệp ghi kỳ và số phiếu", /PhieuChi_2026-10_2phieu\.pdf$/.test(f), f); }
  if (process.env.KEEP_DL && f) fs.cpSync(DL, process.env.KEEP_DL, { recursive: true });
  await app.close();
  const pass = results.filter(Boolean).length; console.log("Payment-voucher E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
