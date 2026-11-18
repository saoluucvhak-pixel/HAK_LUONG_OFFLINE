"use strict";
require("./harness-env.cjs");
// F01 trên Electron thật: bộ lọc Phòng ban của Tạm ứng / Thưởng-trừ theo tổ TẠI NGÀY chứng từ (không theo tổ hiện tại),
// với vai trò Nhân sự (có input.view, KHÔNG có payroll.view). Dữ liệu giả. Chạy: node tests/e2e/input-filter-dept.cjs (Linux: xvfb-run -a …).
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { fixture } = require("../fixtures/production-carry");
const APP = path.resolve(__dirname, "../.."), PASS = "LocPb2026e2e", SHOTS = process.env.E2E_SHOTS || "";
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: extra || "" }); console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? " — " + String(extra).slice(0, 400) : "")); };
const shot = async (w, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await w.screenshot({ path: path.join(SHOTS, name + ".png") }).catch(() => {}); } };
const account = (user, name, role) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: user.toUpperCase(), tenDangNhap: user, hoTen: name, vaiTro: role, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
function seed() {
  const d = fixture(); d.auditlog = []; d.baomat = []; d.schemaVersion = 2; d.sanluong = []; d.chamcong = []; d.ungluong = []; d.psluong = [];
  d.chitiethd.push({ ...d.chitiethd.find((r) => r["Mã NV"] === "A"), "Hiệu lực từ": "2026-11-01", "Phòng ban": "02.02" }); // A chuyển tổ 02.02 từ 01/11/2026
  d.nguoidung = [account("admin", "Quản trị giả", "admin"), account("hr", "Nhân sự giả", "nhansu")];
  const tu = (id, ma, ngay, tien) => ({ "Ngày hạch toán": ngay, "Số chứng từ": id, "Mã NV": ma, "Diễn giải": "Tạm ứng thử", "Tạm ứng": tien });
  d.ungluong = [tu("TU-1002", "A", "2026-10-02", 100000), tu("TU-1031", "A", "2026-10-31", 50000), tu("TU-1101", "A", "2026-11-01", 70000), tu("TU-B", "B", "2026-10-03", 200000)];
  d.psluong = [{ "Ngày hạch toán": "2026-10-05", "Số chứng từ": "T-10", "Mã NV": "A", "Diễn giải": "Thưởng thử", "Thưởng": 1000000 }, { "Ngày hạch toán": "2026-11-05", "Số chứng từ": "T-11", "Mã NV": "A", "Diễn giải": "Thưởng thử", "Thưởng": 2000000 }];
  return d;
}
async function launch(dir) {
  const exe = process.env.HAK_PACKAGED_EXE, app = await _electron.launch({ executablePath: exe || require("electron"), args: exe ? ["--no-sandbox"] : ["--no-sandbox", APP], env: { ...process.env, HAK_USER_DATA: dir, HAK_DOWNLOAD_DIR: path.join(dir, "downloads"), HAK_NO_SHELL: "1" } });
  const w = await app.firstWindow(), errs = [];
  w.on("pageerror", (e) => errs.push(e.message)); w.on("dialog", (x) => x.accept());
  await w.waitForSelector("#main > *"); return { app, w, errs };
}
const login = async (w, user) => { await w.waitForSelector("#main input[data-f=u]"); await w.fill("#main input[data-f=u]", user); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]"); };
const totals = async (w, key) => (await w.locator('[data-in-totals="' + key + '"]').innerText()).replace(/\s+/g, " ");
async function setPeriod(w, month) { await w.selectOption("#top select", String(month)); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(300); }
async function pickDept(w, key, label) { // chọn đúng một tổ trong bộ lọc nhanh "Phòng ban" (cửa sổ nổi: Bỏ chọn → tích tổ → Áp dụng)
  await w.locator('[data-in-filter="' + key + '"] button[data-fkey$=":pb"]').click();
  const pop = w.locator("[data-fpop]").first(); await pop.waitFor({ timeout: 5000 });
  await pop.getByRole("button", { name: "Bỏ chọn" }).click(); await pop.locator("label", { hasText: label }).first().locator("input").check();
  await pop.getByRole("button", { name: "Áp dụng" }).click(); await w.waitForTimeout(400);
}
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "hak-f01-")); fs.mkdirSync(path.join(D, "downloads"));
  let { app, w, errs } = await launch(D); await app.close(); // khởi tạo hồ sơ rồi ghi dữ liệu giả
  const before = seed(); fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(before));
  ({ app, w, errs } = await launch(D)); await login(w, "admin"); await app.close(); // lần mở đầu bằng Quản trị: bổ sung các bảng còn thiếu của dữ liệu giả để vai trò khác lưu/đóng được
  ({ app, w, errs } = await launch(D)); await login(w, "hr");
  ok("Vai trò Nhân sự: có xem đầu vào, KHÔNG có quyền xem lương", (await w.locator("#nav button[data-k=ungluong]").count()) === 1 && (await w.locator("#nav button[data-k=bangluong]").count()) === 0);
  await w.click("#nav button[data-k=ungluong]"); await setPeriod(w, 10);
  const all10 = await totals(w, "ungluong"); ok("Tạm ứng tháng 10 chưa lọc: 3 dòng (TU-1002, TU-1031, TU-B)", /3 dòng/.test(all10), all10);
  await pickDept(w, "ungluong", "02.01"); await shot(w, "f01-tam-ung-thang10-to-02.01");
  const t1 = await totals(w, "ungluong");
  ok("Tháng 10, lọc tổ 02.01: vẫn đủ 3 dòng dù A hiện ở tổ 02.02 (chứng từ lịch sử không bị ẩn)", /3 dòng/.test(t1) && /350\.000/.test(t1), t1);
  await pickDept(w, "ungluong", "02.02");
  const t2 = await totals(w, "ungluong"); ok("Tháng 10, lọc tổ 02.02: 0 dòng (A thuộc 02.02 từ 01/11)", /0 dòng/.test(t2), t2);
  await setPeriod(w, 11);
  const t3 = await totals(w, "ungluong"); ok("Tháng 11, lọc tổ 02.02: chứng từ 01/11 của A", /1 dòng/.test(t3) && /70\.000/.test(t3), t3);
  await pickDept(w, "ungluong", "02.01"); const t4 = await totals(w, "ungluong"); ok("Tháng 11, lọc tổ 02.01: 0 dòng", /0 dòng/.test(t4), t4);
  await w.click("#nav button[data-k=psluong]"); await setPeriod(w, 10); await pickDept(w, "psluong", "02.01");
  const b1 = await totals(w, "psluong"); ok("Thưởng/Trừ tháng 10, tổ 02.01: thưởng 1.000.000 của A còn hiện", /1 dòng/.test(b1) && /1\.000\.000/.test(b1), b1);
  ok("Không lỗi JavaScript", errs.length === 0, errs.join(" | "));
  const after = JSON.parse(fs.readFileSync(path.join(D, "data.json"), "utf8"));
  ok("Lọc/xem không ghi đổi dữ liệu đầu vào", JSON.stringify(after.ungluong) === JSON.stringify(before.ungluong) && JSON.stringify(after.psluong) === JSON.stringify(before.psluong));
  await w.click('#top button:has-text("Đăng xuất")').catch(() => {});
  const closed = await Promise.race([app.close().then(() => true), new Promise((r) => setTimeout(() => r(false), 20000))]);
  ok("Đóng ứng dụng bình thường (không treo)", closed);
  const fail = results.filter((r) => !r.pass).length;
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, "f01-result.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  console.log("\nF01 E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); process.exit(2); });
