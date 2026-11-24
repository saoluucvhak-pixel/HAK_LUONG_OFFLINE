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
// v2.1.12: KHÔNG dựa vào thời gian ngủ cố định sau khi đóng app (runner Windows chậm từng làm 1 lần đỏ ngẫu nhiên ở bước này, 21/11/2026): chờ ĐIỀU KIỆN thật tối đa `ms`.
const until = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { let v = false; try { v = await fn(); } catch (e) { v = false; } if (v) return true; if (Date.now() - t0 > ms) return false; await sleep(150); } };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const seed = () => { const d = fixture(); d.auditlog = []; d.baomat = []; d.schemaVersion = 2; d.sanluong = []; d.chamcong = []; d.nguoidung = [account("admin", "Quản trị giả", "admin")]; return d; };
const nv = (D) => { const db = new DatabaseSync(path.join(D, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT json FROM records WHERE tbl='nhanvien'").all().map((r) => JSON.parse(r.json)["Mã NV"]); } finally { db.close(); } };
const audit = (D) => { const db = new DatabaseSync(path.join(D, "data.sqlite"), { readOnly: true }); try { return db.prepare("SELECT COUNT(*) AS c FROM records WHERE tbl='auditlog'").get().c; } finally { db.close(); } };
const answer = { ok: true }; // trả lời các hộp thoại confirm: true = OK, false = Hủy
async function launch(D) {
  const app = await _electron.launch({ executablePath: require("electron"), args: ["--no-sandbox", APP],
    env: { ...process.env, HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: path.join(D, "downloads"), HAK_NO_SHELL: "1", HAK_SQLITE_EXPORT_SYNC: "0", HAK_SQLITE_ADOPT_EXTERNAL: "0", HAK_STORAGE: "" } });
  const w = await app.firstWindow(), dialogs = [], errs = [];
  w.on("pageerror", (e) => errs.push(e.message)); w.on("dialog", (x) => { dialogs.push(x.message()); if (answer.ok) x.accept(); else x.dismiss(); });
  await w.waitForSelector("#main > *"); return { app, w, dialogs, errs };
}
const login = async (w) => { await w.waitForSelector("#main input[data-f=u]"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]"); };
// Ghi vào kho "ngoài" trạng thái bộ nhớ của giao diện (không gửi baseSig), như một đường ghi mới ở tiến trình chính / cửa sổ khác
const outsideWrite = (w, ma) => w.evaluate((m) => { const d = JSON.parse(window.hakStore.load().text); d.nhanvien.push({ "Mã NV": m, "Họ và tên": "Ghi từ nơi khác " + m, "Trạng thái": "Đang làm việc" }); return window.hakStore.save(JSON.stringify(d)); }, ma);
(async () => {
  // Mỗi kịch bản dùng HỒ SƠ MỚI: lần mở đầu giao diện còn thay đổi chưa lưu (dirty) nên sẽ ghi lại khi đóng — đúng điều kiện gây ghi đè trước v2.0.35.
  const fresh = () => { const D = fs.mkdtempSync(path.join(os.tmpdir(), "hak-stale-")); fs.mkdirSync(path.join(D, "downloads")); createStorage(D).save(JSON.stringify(seed())); return D; };
  const asked = (dl) => dl.some((m) => /thay đổi ở nơi khác/.test(m));
  let r;

  // D. Giao thức IPC
  { const D = fresh(); r = await launch(D); await login(r.w); await sleep(800);
    const sig0 = await r.w.evaluate(() => window.hakStore.sig()), txt = await r.w.evaluate(() => window.hakStore.load().text);
    const bad = await r.w.evaluate((t) => window.hakStore.save(t, "sqlite:999999"), txt);
    ok("IPC: baseSig sai → bị từ chối 'STALE_BASE', không ghi", typeof bad === "string" && /^STALE_BASE/.test(bad), String(bad));
    const changed = await r.w.evaluate((t) => { const d = JSON.parse(t); d.nhanvien[0]["Ghi chú"] = "thử baseSig"; return window.hakStore.save(JSON.stringify(d), window.hakStore.sig()); }, txt);
    ok("IPC: baseSig đúng → ghi được và sig đổi", changed === true && (await r.w.evaluate(() => window.hakStore.sig())) !== sig0, String(changed));
    ok("IPC: không gửi baseSig (khách cũ/kịch bản) → giữ hành vi cũ, ghi được", (await outsideWrite(r.w, "0090")) === true && nv(D).includes("0090"));
    answer.ok = true; await r.app.close().catch(() => {}); await sleep(1500); }

  // 1. Đường ĐÓNG cửa sổ: ghi ngoài giao diện rồi đóng → bản ghi còn nguyên; giao diện hỏi
  { const D = fresh(); r = await launch(D); await login(r.w); await sleep(1000); answer.ok = true;
    await r.w.evaluate(() => { if (typeof window.hakMakeDirty === "function") window.hakMakeDirty(); });
    ok("Ghi ngoài giao diện (0099)", (await outsideWrite(r.w, "0099")) === true && nv(D).includes("0099"));
    await r.app.close().catch(() => {}); await until(() => asked(r.dialogs)); await sleep(500);
    ok("ĐÓNG: 0099 CÒN NGUYÊN sau khi giao diện đóng — không bị ghi đè (trước v2.0.35: bị mất)", nv(D).includes("0099"), "sqlite: " + nv(D).slice(-3).join(","));
    ok("ĐÓNG: giao diện đã hỏi người dùng (hộp thoại nêu 'thay đổi ở nơi khác')", asked(r.dialogs), JSON.stringify(r.dialogs).slice(0, 160)); }

  // 2. Đường TẢI LẠI giao diện (như sau khôi phục/lưu trữ năm): không ghi đè, không giữ trang
  { const D = fresh(); r = await launch(D); await login(r.w); await sleep(1000); answer.ok = true;
    await outsideWrite(r.w, "0100"); await r.w.reload(); await sleep(1500);
    ok("TẢI LẠI: 0100 còn nguyên trong kho và trang tải lại được (màn đăng nhập)", nv(D).includes("0100") && (await r.w.locator("#main input[data-f=u]").count()) === 1);
    await login(r.w);
    ok("Sau tải lại + đăng nhập: giao diện thấy 0100", (await r.w.evaluate(() => JSON.parse(window.hakStore.load().text).nhanvien.map((x) => x["Mã NV"]))).includes("0100"));
    ok("Không lỗi JavaScript ở giao diện", r.errs.length === 0, r.errs.join(" | "));
    await r.app.close().catch(() => {}); await sleep(1500); }

  // 3. Gọi đường đóng cửa sổ trực tiếp: Hủy → giữ cửa sổ (false); OK → cho đóng (true); cả hai KHÔNG ghi đè
  { const D = fresh(); r = await launch(D); await login(r.w); await sleep(1000);
    await r.w.evaluate(() => { if (typeof window.hakMakeDirty === "function") window.hakMakeDirty(); });
    await outsideWrite(r.w, "0101");
    answer.ok = false; const keep = await r.w.evaluate(() => window.hakFlushBeforeClose());
    ok("Hủy hộp thoại: hakFlushBeforeClose trả false (giữ cửa sổ), 0101 nguyên", keep === false && asked(r.dialogs) && nv(D).includes("0101"), String(keep));
    answer.ok = true; r.dialogs.length = 0; const go = await r.w.evaluate(() => window.hakFlushBeforeClose());
    ok("OK hộp thoại: hakFlushBeforeClose trả true (cho đóng), 0101 nguyên", go === true && asked(r.dialogs) && nv(D).includes("0101"), String(go));
    await r.app.close().catch(() => {}); await sleep(1500); }

  // 4. Đối chứng: không có ghi ngoài giao diện → ghi của giao diện vẫn bền, KHÔNG hộp thoại 'nơi khác'
  { const D = fresh(); r = await launch(D); await login(r.w); await sleep(1000); answer.ok = true; const a0 = audit(D);
    await r.w.evaluate(() => { if (typeof window.hakMakeDirty === "function") window.hakMakeDirty(); });
    await r.app.close().catch(() => {}); await until(() => audit(D) > a0); await sleep(500);
    ok("Đối chứng: đóng bình thường → giao diện ghi bền (nhật ký tăng) và không hỏi 'nơi khác'", audit(D) > a0 && !asked(r.dialogs), "trước " + a0 + ", sau " + audit(D) + " | " + JSON.stringify(r.dialogs).slice(0, 120)); }

  const fail = results.filter((x) => !x.pass).length;
  console.log("\nBản nền (baseSig) E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); process.exit(2); });
