"use strict";
// Kiểm bản nền (baseSig) của lưu dữ liệu — chế độ THẬT (không cờ nghiệm thu). Trước v2.0.35: ghi vào kho ngoài trạng thái bộ nhớ của giao diện bị giao diện ghi đè khi đóng/tải lại
// (tái hiện: docs/v2.0.34/tai-hien-ghi-de-khi-dong.cjs). Từ v2.0.35: main từ chối ghi dựa trên bản nền cũ (STALE_BASE); giao diện hỏi tải lại / đóng bỏ thay đổi; dữ liệu mới còn nguyên.
// Dữ liệu GIẢ. Chạy: node tests/e2e/stale-base.cjs   (Linux: xvfb-run -a …)
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { fixture } = require("../fixtures/production-carry");
const { createStorage } = require("../../main/storage.js");
const { DatabaseSync } = require("node:sqlite");
const APP = path.resolve(__dirname, "../.."), PASS = "StaleBase2026";
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: extra || "" }); console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? " — " + String(extra).slice(0, 400) : "")); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const seed = () => { const d = fixture(); d.auditlog = []; d.baomat = []; d.schemaVersion = 2; d.sanluong = []; d.chamcong = []; d.nguoidung = [account("admin", "Quản trị giả", "admin")]; return d; };
const nv = (D) => { const db = new DatabaseSync(path.join(D, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT json FROM records WHERE tbl='nhanvien'").all().map((r) => JSON.parse(r.json)["Mã NV"]); } finally { db.close(); } };
const audit = (D) => { const db = new DatabaseSync(path.join(D, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT COUNT(*) AS c FROM records WHERE tbl='auditlog'").get().c; } finally { db.close(); } };
async function launch(D) {
  const app = await _electron.launch({ executablePath: require("electron"), args: ["--no-sandbox", APP],
    env: { ...process.env, HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: path.join(D, "downloads"), HAK_NO_SHELL: "1", HAK_SQLITE_EXPORT_SYNC: "0", HAK_SQLITE_ADOPT_EXTERNAL: "0", HAK_STORAGE: "" } });
  const w = await app.firstWindow(), dialogs = [], errs = [];
  w.on("pageerror", (e) => errs.push(e.message)); w.on("dialog", (x) => { dialogs.push(x.message()); x.accept(); });
  await w.waitForSelector("#main > *"); return { app, w, dialogs, errs };
}
const login = async (w) => { await w.waitForSelector("#main input[data-f=u]"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]"); };
// Ghi vào kho "ngoài" trạng thái bộ nhớ của giao diện (không gửi baseSig), như một đường ghi mới ở tiến trình chính / cửa sổ khác
const outsideWrite = (w, ma) => w.evaluate((m) => { const d = JSON.parse(window.hakStore.load().text); d.nhanvien.push({ "Mã NV": m, "Họ và tên": "Ghi từ nơi khác " + m, "Trạng thái": "Đang làm việc" }); return window.hakStore.save(JSON.stringify(d)); }, ma);
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "hak-stale-")); fs.mkdirSync(path.join(D, "downloads")); createStorage(D).save(JSON.stringify(seed()));
  let { app, w, dialogs, errs } = await launch(D); await login(w); await sleep(1000);

  // D. Giao thức: baseSig sai bị từ chối; đúng thì ghi được
  const sig0 = await w.evaluate(() => window.hakStore.sig());
  const txt = await w.evaluate(() => window.hakStore.load().text);
  const bad = await w.evaluate((t) => window.hakStore.save(t, "sqlite:999999"), txt);
  ok("IPC: baseSig sai → bị từ chối 'STALE_BASE', không ghi", typeof bad === "string" && /^STALE_BASE/.test(bad), String(bad));
  ok("IPC: baseSig đúng → ghi được và sig đổi", (await w.evaluate((t) => window.hakStore.save(t, window.hakStore.sig()), txt)) === true && (await w.evaluate(() => window.hakStore.sig())) !== sig0);

  // A. Đường đóng: ghi ngoài giao diện rồi đóng bình thường → bản ghi còn nguyên (trước v2.0.35 bị ghi đè)
  ok("Ghi ngoài giao diện (không baseSig) vẫn được nhận (khách cũ/kịch bản)", (await outsideWrite(w, "0099")) === true && nv(D).includes("0099"));
  await app.close().catch(() => {}); await sleep(2000);
  ok("ĐÓNG: bản ghi 0099 (ghi từ nơi khác) CÒN NGUYÊN sau khi giao diện đóng — không bị ghi đè", nv(D).includes("0099"), "sqlite: " + nv(D).slice(-3).join(","));
  ok("ĐÓNG: giao diện đã hỏi người dùng (hộp thoại nêu 'thay đổi ở nơi khác')", dialogs.some((m) => /thay đổi ở nơi khác/.test(m)), JSON.stringify(dialogs).slice(0, 200));

  // B. Đường tải lại: ghi ngoài giao diện rồi tải lại giao diện → hỏi, tải lại dữ liệu mới, KHÔNG ghi đè
  for (const f of fs.readdirSync(D).filter((x) => /^Singleton/.test(x))) fs.rmSync(path.join(D, f), { force: true });
  ({ app, w, dialogs, errs } = await launch(D)); await login(w); await sleep(1000);
  ok("Ghi ngoài giao diện lần 2 (0100)", (await outsideWrite(w, "0100")) === true && nv(D).includes("0100"));
  await w.reload(); await sleep(1500);
  ok("TẢI LẠI: giao diện hỏi, bỏ bản cũ và tải lại; 0099 và 0100 còn trong kho", dialogs.some((m) => /thay đổi ở nơi khác/.test(m)) && nv(D).includes("0099") && nv(D).includes("0100"), JSON.stringify(dialogs).slice(0, 160));
  await login(w);
  const after = await w.evaluate(() => JSON.parse(window.hakStore.load().text).nhanvien.map((r) => r["Mã NV"]));
  ok("Sau tải lại + đăng nhập: giao diện thấy cả 0099 và 0100", after.includes("0099") && after.includes("0100"));
  ok("Không lỗi JavaScript ở giao diện", errs.length === 0, errs.join(" | "));

  // C. Đối chứng: ghi do CHÍNH giao diện vẫn bền, nhiều lần liên tiếp (baseSig được làm mới sau mỗi lần ghi)
  await sleep(1000); const a1 = audit(D);
  await app.close().catch(() => {}); await sleep(2000);
  ok("Đối chứng: đóng bình thường sau khi giao diện đã đồng bộ → ghi bền (nhật ký tăng hoặc giữ)", audit(D) >= a1);
  for (const f of fs.readdirSync(D).filter((x) => /^Singleton/.test(x))) fs.rmSync(path.join(D, f), { force: true });
  ({ app, w, dialogs, errs } = await launch(D)); await login(w); await sleep(800);
  const a2 = audit(D); await app.close().catch(() => {}); await sleep(2000);
  ok("Đối chứng: lần mở/đóng sau, ghi của giao diện vẫn bền (nhật ký tăng) và KHÔNG có hộp thoại 'nơi khác'", audit(D) > a2 && !dialogs.some((m) => /thay đổi ở nơi khác/.test(m)), "trước " + a2 + ", sau " + audit(D) + " | " + JSON.stringify(dialogs).slice(0, 120));
  ok("Dữ liệu cuối còn đủ 0099 và 0100", nv(D).includes("0099") && nv(D).includes("0100"));

  const fail = results.filter((r) => !r.pass).length;
  console.log("\nBản nền (baseSig) E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); process.exit(2); });
