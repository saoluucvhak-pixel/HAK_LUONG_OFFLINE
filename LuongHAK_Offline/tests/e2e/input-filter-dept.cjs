"use strict";
require("./harness-env.cjs");
// F01 trên Electron thật: bộ lọc Phòng ban của Tạm ứng / Thưởng-trừ theo tổ TẠI NGÀY chứng từ (không theo tổ hiện tại),
// với vai trò Nhân sự (có input.view, KHÔNG có payroll.view). Dữ liệu giả. Chạy: node tests/e2e/input-filter-dept.cjs (Linux: xvfb-run -a …).
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { fixture } = require("../fixtures/production-carry");
const { createStorage } = require("../../main/storage.js"), LA = require("./layout-audit.cjs");
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
  // ===== 004.3 — HAK Smart Filter trên từng màn có bộ lọc: từ khóa, chọn Phòng ban, giữ bộ lọc khi sang màn khác rồi quay lại, lọc KHÔNG ghi đổi dữ liệu, xuất Excel theo bộ lọc khớp màn hình =====
  await app.close();
  {
    const ExcelJS = require("../../exceljs.min.js"), D2 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-sf-")), DL = path.join(D2, "downloads"); fs.mkdirSync(DL);
    const now = new Date(), pad = (n) => String(n).padStart(2, "0"), ky = now.getFullYear() + "-" + pad(now.getMonth() + 1), dd = (n) => ky + "-" + pad(n);
    const d2 = fixture(); d2.auditlog = []; d2.baomat = []; d2.schemaVersion = 2; d2.nguoidung = [account("admin", "Quản trị giả", "admin")];
    d2.nhanvien = [["NV01", "Nguyễn Văn Anh"], ["NV02", "Trần Thị Bình"], ["NV03", "Lê Hoàng Cường"]].map(([m, t]) => ({ "Mã NV": m, "Họ và tên": t, "Trạng thái": "Đang làm việc" }));
    d2.hopdong = d2.nhanvien.map((n) => ({ "Mã NV": n["Mã NV"], "Số HĐLĐ": n["Mã NV"] + "/HĐ", "Ngày vào làm": "2025-01-01" }));
    d2.chitiethd = d2.nhanvien.map((n, i) => ({ "Mã NV": n["Mã NV"], "Số HĐLĐ": n["Mã NV"] + "/HĐ", "Hiệu lực từ": "2025-01-01", "Phòng ban": i === 0 ? "01.01" : "02.01", "Lương thỏa thuận": "9000000" }));
    d2.chamcong = d2.nhanvien.map((n) => { const r = { "Kỳ": ky, "Mã NV": n["Mã NV"], "Hình thức công": "BT" }; ["01", "02", "03"].forEach((c) => { r[c] = 1; }); return r; });
    const P = ["ANH", "BINH", "CUONG"], NV = ["NV01", "NV02", "NV03"];
    d2.sanluong = NV.map((m, i) => ({ "Phiếu cân": "PC-" + P[i], "Ngày cân": dd(2 + i), "KL hàng (Tấn)": String(10 * (i + 1)), "Mã NV": m, "Mã phòng ban": i === 0 ? "01.01" : "02.01" }));
    d2.bandam = NV.map((m, i) => ({ "Phiếu cân": "BD-" + P[i], "Ngày cân": dd(2 + i), "KL hàng (Tấn)": String(i + 1), "Mã NV": m, "Mã phòng ban": i === 0 ? "01.01" : "02.01" }));
    d2.psluong = NV.map((m, i) => ({ "Ngày hạch toán": dd(5 + i), "Số chứng từ": "PS-" + P[i], "Mã NV": m, "Diễn giải": "Thưởng " + P[i], "Thưởng": 100000 * (i + 1) }));
    d2.ungluong = NV.map((m, i) => ({ "Ngày hạch toán": dd(5 + i), "Số chứng từ": "UL-" + P[i], "Mã NV": m, "Diễn giải": "Ứng " + P[i], "Tạm ứng": 500000 * (i + 1) }));
    d2.tiencom = NV.map((m, i) => ({ "Ngày": dd(5 + i), "Mã NV": m, "Số suất cơm": i + 1, "Ghi chú": "com-" + P[i] }));
    createStorage(D2).save(JSON.stringify(d2)); // cùng đường nạp dữ liệu giả với sqlite-default.cjs (chạy ổn trên CI Windows)
    const SCR = [ // k: màn · t1/t2: chuỗi chỉ có ở dòng của NV01 / NV02 (không dấu, chữ thường cũng khớp) · pb: nhãn phòng ban có đúng 1 dòng NV01 · n: số dòng của NV01
      { k: "chamcong", t1: "Nguyễn Văn Anh", t2: "Trần Thị Bình", x1: "NV01", x2: "NV02", ten: "Chấm công" }, { k: "sanluong", t1: "PC-ANH", t2: "PC-BINH", ten: "Sản lượng" }, { k: "bandam", t1: "BD-ANH", t2: "BD-BINH", ten: "Ban dăm", pre: "Phân bổ trực tiếp nhân viên" },
      { k: "psluong", t1: "PS-ANH", t2: "PS-BINH", ten: "Thưởng/Trừ" }, { k: "ungluong", t1: "UL-ANH", t2: "UL-BINH", ten: "Tạm ứng" }, { k: "tiencom", t1: "com-ANH", t2: "com-BINH", ten: "Suất cơm" }, { k: "nhansu", t1: "Nguyễn Văn Anh", t2: "Trần Thị Bình", ten: "Danh sách nhân viên", ex: "Excel danh sách đang lọc" }
    ];
    ({ app, w, errs } = await launch(D2)); await login(w, "admin");
    const shown = async () => { const t = (await w.locator("#main .sf").first().innerText()).replace(/\s+/g, " "), m = /Hiển thị (\d+) \/ (\d+) dòng/.exec(t); return m ? [Number(m[1]), Number(m[2])] : null; };
    const stored = () => w.evaluate(() => window.hakStore.load().text);
    const xlsxAfter = async (before) => { for (let i = 0; i < 40; i++) { const f = fs.readdirSync(DL).filter((x) => /\.xlsx$/i.test(x) && !before.includes(x)); if (f.length) return path.join(DL, f[0]); await w.waitForTimeout(250); } return null; };
    const cellsOf = async (file) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(fs.readFileSync(file)); const out = []; wb.worksheets.forEach((ws) => ws.eachRow((r) => { const v = []; r.eachCell((c) => { v.push(c.value && typeof c.value === "object" && "result" in c.value ? c.value.result : c.value); }); out.push(v.map(String)); })); return out; };
    for (const sc of SCR) {
      const base = await stored(); await w.click('#nav button[data-k="' + sc.k + '"]'); if (sc.pre) { await w.locator("#main button", { hasText: sc.pre }).first().click(); await w.waitForTimeout(500); } await w.waitForSelector("#main [data-sf-q]", { timeout: 10000 }); await w.waitForTimeout(300);
      const tot = await shown(); ok(sc.ten + ": có Smart Filter và hiển thị đủ 3 dòng của kỳ", !!tot && tot[0] === 3 && tot[1] === 3, JSON.stringify(tot));
      await w.fill("#main [data-sf-q]", sc.t2); await w.press("#main [data-sf-q]", "Enter"); await w.waitForTimeout(700); const k1 = await shown(), txt = await w.locator("#main").innerText();
      ok(sc.ten + ": lọc từ khóa chỉ còn đúng dòng khớp (1/3), dòng khác biến mất khỏi màn hình", !!k1 && k1[0] === 1 && k1[1] === 3 && txt.includes(sc.t2) && !txt.includes(sc.t1), JSON.stringify(k1));
      // xuất Excel theo bộ lọc
      const exBtn = w.locator('#main button:has-text("' + (sc.ex || "Xuất Excel") + '")').first(); let xl = null; const had = fs.readdirSync(DL);
      if (await exBtn.count()) { await exBtn.click(); xl = await xlsxAfter(had); }
      if (xl) { const cells = await cellsOf(xl), flat = cells.flat().join("|"); ok(sc.ten + ": Excel xuất theo bộ lọc khớp màn hình (có dòng đã lọc, KHÔNG có dòng bị lọc)", flat.includes(sc.x2 || sc.t2) && !flat.includes(sc.x1 || sc.t1), cells.length + " dòng: " + flat.replace(/\|+/g, "|").slice(0, 300)); } else ok(sc.ten + ": có nút Xuất Excel và tạo được tệp", false, "không thấy tệp .xlsx");
      // chọn nhiều (Phòng ban) trong ngăn "Bộ lọc nâng cao": tích đúng một tổ → Áp dụng → còn 1/3 dòng; Đặt lại → đủ 3 dòng
      await w.locator('#main .sf button:has-text("Đặt lại")').first().click(); await w.waitForTimeout(400);
      await w.locator('#main .sf button:has-text("Bộ lọc nâng cao")').first().click(); await w.waitForSelector("[data-sf-drawer]"); await w.waitForTimeout(300);
      const dr = w.locator("[data-sf-drawer]").first(), ms = dr.locator('[data-sfm="pb"], [data-sfm="phongBan"]').first(); let sel = null, msTxt = "";
      if (await ms.count()) { const n = await ms.locator(".sfm-row").count(); msTxt = "n=" + n + " " + (await ms.innerText()).replace(/\s+/g, " ").slice(0, 200) + " ";
        for (let i = 0; i < n && !sel; i++) { const row = ms.locator(".sfm-row").nth(i), lb = (await row.innerText()).trim(); if (/Không có/.test(lb)) continue;
          await row.locator("input").check(); await dr.getByRole("button", { name: "Áp dụng" }).click(); await w.waitForTimeout(600); const r = await shown();
          msTxt += "[" + lb.replace(/\s+/g, " ") + " → " + JSON.stringify(r) + "]"; if (r && r[0] === 1) { sel = lb; break; }
          await w.locator('#main .sf button:has-text("Bộ lọc nâng cao")').first().click(); await w.waitForSelector("[data-sf-drawer]"); await w.locator("[data-sf-drawer] [data-sfm]").first().waitFor(); await w.locator("[data-sf-drawer]").first().locator('[data-sfm="pb"], [data-sfm="phongBan"]').first().getByRole("button", { name: "Bỏ chọn" }).click(); }
      } else { msTxt = "KHÔNG có [data-sfm] pb/phongBan; ngăn: " + (await dr.innerText()).replace(/\s+/g, " ").slice(0, 300) + " | keys=" + (await dr.locator("[data-sfm]").evaluateAll((e) => e.map((x) => x.dataset.sfm))).join(","); await dr.getByRole("button", { name: "Hủy" }).click(); }
      ok(sc.ten + ": chọn nhiều Phòng ban trong Bộ lọc nâng cao thu hẹp còn 1/3 dòng", !!sel, "nhãn=" + sel + " " + msTxt);
      if (sel) { const chip = (await w.locator("#main .sf").first().innerText()).replace(/\s+/g, " "); ok(sc.ten + ": thanh lọc hiện bộ lọc đang áp dụng (Phòng ban)", /Phòng ban/.test(chip), chip.slice(0, 200)); }
      await w.locator('#main .sf button:has-text("Đặt lại")').first().click(); await w.waitForTimeout(500); const r0 = await shown(); ok(sc.ten + ": Đặt lại sau khi chọn nhiều trả về đủ 3 dòng", !!r0 && r0[0] === 3, JSON.stringify(r0));
      await w.fill("#main [data-sf-q]", sc.t2); await w.press("#main [data-sf-q]", "Enter"); await w.waitForTimeout(600);
      // giữ bộ lọc khi sang màn khác rồi quay lại
      await w.click('#nav button[data-k="home"]'); await w.waitForTimeout(300); await w.click('#nav button[data-k="' + sc.k + '"]'); if (sc.pre) { await w.locator("#main button", { hasText: sc.pre }).first().click(); await w.waitForTimeout(500); } await w.waitForSelector("#main [data-sf-q]"); await w.waitForTimeout(400);
      const kb = await shown(); ok(sc.ten + ": sang màn khác rồi quay lại vẫn giữ bộ lọc (1/3, ô tìm vẫn còn từ khóa)", !!kb && kb[0] === 1 && (await w.locator("#main [data-sf-q]").inputValue()) === sc.t2, JSON.stringify(kb));
      await w.locator('#main .sf button:has-text("Đặt lại")').first().click(); await w.waitForTimeout(500); const k0 = await shown(); ok(sc.ten + ": Đặt lại trả về đủ 3 dòng", !!k0 && k0[0] === 3, JSON.stringify(k0));
      ok(sc.ten + ": lọc/xuất/đổi màn KHÔNG ghi đổi dữ liệu đã lưu", (await stored()) === base);
    }
    ok("Smart Filter các màn: không lỗi JavaScript", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // ===== 009-C (issue #98 mục 4): KHÔNG MẤT việc đang làm khi đóng app / chuyển màn — nhập tay, dán, bản nháp danh mục, bản xem trước nhập Excel =====
  {
    const ExcelJS = require("../../exceljs.min.js"), D3 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-009c-")); fs.mkdirSync(path.join(D3, "downloads"));
    const d3 = fixture(); d3.auditlog = []; d3.baomat = []; d3.schemaVersion = 2; d3.tiencom = []; d3.nguoidung = [account("admin", "Quản trị giả", "admin")];
    createStorage(D3).save(JSON.stringify(d3));
    let answer = true; const useDialogs = () => { w.removeAllListeners("dialog"); w.on("dialog", (x) => (answer ? x.accept() : x.dismiss())); };
    const rowsOf = (t) => w.evaluate((tb) => (JSON.parse(window.hakStore.load().text)[tb] || []), t);
    const reopen = async () => { await app.close(); ({ app, w, errs } = await launch(D3)); await login(w, "admin"); useDialogs(); };
    ({ app, w, errs } = await launch(D3)); await login(w, "admin"); useDialogs();
    // C1 gõ dở trong ô (chưa rời ô) rồi đóng cửa sổ: giá trị phải còn
    await w.click('#nav button[data-k="tiencom"]'); await w.waitForTimeout(500);
    await w.locator('#main button:has-text("Thêm dòng")').first().click(); await w.waitForTimeout(600);
    await w.locator("#main table tbody tr").first().locator("input").nth(1).fill("A"); // Mã NV — KHÔNG blur
    const flushed = await w.evaluate(() => window.hakFlushBeforeClose()); ok("Gõ dở trong ô rồi đóng cửa sổ: cho đóng và đã lưu", flushed === true);
    await reopen(); let tc = await rowsOf("tiencom"); ok("Mở lại: dòng nhập dở còn, đúng Mã NV đã gõ", tc.length === 1 && tc[0]["Mã NV"] === "A", JSON.stringify(tc));
    // C2 dán nhiều dòng có ô sai: ô sai KHÔNG vào dữ liệu và có thông báo; dòng đúng được giữ qua đóng/mở lại
    await w.click('#nav button[data-k="tiencom"]'); await w.waitForTimeout(500);
    const first = w.locator("#main table tbody tr").first().locator("input").first();
    await first.evaluate((el) => { const dt = new DataTransfer(); dt.setData("text", "2026-11-05\tB\t2\n2026-11-06\tC\thai\n2026-11-07\tA\t1,5"); el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); });
    await w.waitForTimeout(700); const body = (await w.locator("body").innerText()).replace(/\s+/g, " ");
    ok("Dán có ô chữ ở 'Số suất cơm': thông báo nêu ô sai định dạng, KHÔNG dán ô đó", /ô sai định dạng/.test(body), body.slice(-300));
    await reopen(); tc = await rowsOf("tiencom");
    ok("Sau dán rồi đóng/mở lại: không có chữ 'hai' trong dữ liệu; các dòng đúng còn", !tc.some((r) => String(r["Số suất cơm"]) === "hai") && tc.some((r) => r["Mã NV"] === "B" && String(r["Số suất cơm"]) === "2"), JSON.stringify(tc.map((r) => [r["Ngày"], r["Mã NV"], r["Số suất cơm"]])));
    // C3 bản nháp danh mục (không tự lưu): chuyển màn hỏi trước; HỦY thì nháp còn; đóng cửa sổ cũng phải hỏi
    await w.click('#nav button[data-k="dm"]'); await w.waitForTimeout(500);
    await w.locator('#main button:has-text("Thêm mới")').first().click(); await w.waitForTimeout(500);
    const dIn = w.locator("#main tr.catedit input").nth(2); await dIn.fill("NHAPDO"); await dIn.press("Tab"); await w.waitForTimeout(300); // ô thứ 3 = "Mã lương" (hai ô đầu là ngày)
    answer = false; await w.click('#nav button[data-k="home"]'); await w.waitForTimeout(400);
    ok("Danh mục có nháp chưa lưu: bấm sang màn khác rồi chọn HỦY → ở lại, nháp còn nguyên", (await w.locator("#main tr.catedit").count()) === 1 && (await w.locator("#main tr.catedit input").nth(2).inputValue()) === "NHAPDO");
    answer = false; const keep = await w.evaluate(() => window.hakFlushBeforeClose());
    ok("Danh mục có nháp chưa lưu: đóng cửa sổ phải HỎI — chọn Hủy thì giữ cửa sổ (không mất nháp âm thầm)", keep === false, String(keep));
    answer = true; const go = await w.evaluate(() => window.hakFlushBeforeClose()); ok("Chọn OK thì cho đóng (người dùng chủ động bỏ nháp)", go === true, String(go));
    // C4 bản xem trước nhập Excel (chưa bấm Ghi) rồi đóng cửa sổ: KHÔNG ghi nửa chừng
    await reopen(); const before = JSON.stringify(await rowsOf("tiencom"));
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Du lieu"), xf = path.join(D3, "xem-truoc.xlsx"); ws.getRow(1).values = ["Ngày", "Mã NV", "Số suất cơm"]; ws.getRow(2).values = ["2026-11-20", "A", 2]; ws.getRow(3).values = ["2026-11-21", "B", 1];
    await w.click('#nav button[data-k="tiencom"]'); await w.waitForTimeout(500);
    const [fc] = await Promise.all([w.waitForEvent("filechooser"), w.locator('#main button:has-text("Nhập Excel")').first().click()]); await fc.setFiles((fs.writeFileSync(xf, new Uint8Array(await wb.xlsx.writeBuffer())), xf)); await w.waitForSelector(".dlg", { timeout: 15000 });
    const out = await w.evaluate(() => window.hakFlushBeforeClose()); await reopen();
    ok("Đóng khi đang xem trước nhập Excel (chưa bấm Ghi): không ghi dòng nào, dữ liệu như cũ", out === true && JSON.stringify(await rowsOf("tiencom")) === before);
    ok("Nhập dở/dán/nháp: không lỗi JavaScript", errs.length === 0, errs.join(" | "));
    await app.close();
  }
  // ===== 005 (issue #97): kiểm BỐ CỤC bằng máy cho MỌI màn × 3 cỡ (1366×768, 1920×1080, 1024×768) + hộp thoại tiêu biểu; ảnh vào E2E_SHOTS =====
  {
    const D4 = fs.mkdtempSync(path.join(os.tmpdir(), "hak-ui-")); fs.mkdirSync(path.join(D4, "downloads"));
    const d4 = LA.syntheticData(fixture()); d4.nguoidung = [account("admin", "Quản trị giả", "admin")]; createStorage(D4).save(JSON.stringify(d4));
    const ExcelJS = require("../../exceljs.min.js"), wb4 = new ExcelJS.Workbook(), ws4 = wb4.addWorksheet("Du lieu"), x4 = path.join(D4, "ui.xlsx"); ws4.getRow(1).values = ["Ngày", "Mã NV", "Số suất cơm"]; for (let i = 0; i < 15; i++) ws4.getRow(2 + i).values = ["2026-11-" + String(10 + i), "NV0" + (1 + (i % 9)), 1];
    fs.writeFileSync(x4, new Uint8Array(await wb4.xlsx.writeBuffer()));
    ({ app, w, errs } = await launch(D4)); await login(w, "admin");
    const shotsDir = SHOTS ? SHOTS : "", res = await LA.auditAll({ app, w, shotsDir }), dl = await LA.auditDialogs({ app, w, shotsDir, xlsxPath: x4 });
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, "layout-audit.json"), JSON.stringify({ at: new Date().toISOString(), rows: res.rows, dialogs: dl }, null, 1));
    const HARD = [["pageOverflow", "không tràn ngang trang"], ["clipped", "không có chữ bị cắt"], ["wideNoScroll", "bảng rộng có vùng cuộn riêng"], ["stickyHead", "bảng dài có tiêu đề cột cố định"], ["overlap", "control không chồng nhau"], ["noFocus", "control nhận Tab đều thấy focus"]];
    ok("Bố cục: duyệt đủ mọi màn của menu ở 3 cỡ không lỗi thao tác", res.rows.length === res.keys.length * 3 && res.rows.every((r) => !r.error), JSON.stringify(res.rows.filter((r) => r.error).slice(0, 3)));
    for (const [k, label] of HARD) { const bad = res.rows.filter((r) => (Array.isArray(r[k]) ? r[k].length : r[k]) > 0); ok("Bố cục mọi màn × 3 cỡ: " + label, bad.length === 0, bad.slice(0, 4).map((r) => r.screen + "@" + r.size + ": " + JSON.stringify(r[k]).slice(0, 160)).join(" | ")); }
    const badD = dl.filter((r) => r.error || !r.fits || !r.primaryVisible); ok("Bố cục hộp thoại (Thêm nhân viên, Xem trước nhập Excel, Danh mục-Lịch sử) × 3 cỡ: vừa khung nhìn, nút chính thấy ngay", dl.length === 9 && badD.length === 0, JSON.stringify(badD));
    { // 005B-UI002: màn nhập liệu phải thấy ≥ MIN_ROWS dòng ngay khi mở màn ở 1366×768 (PASS/FAIL, không còn INFO)
      const inRows = res.rows.filter((r) => r.size === "1366x768" && LA.INPUT_SCREENS.includes(r.screen) && r.visRows != null), few = inRows.filter((r) => r.visRows < LA.MIN_ROWS);
      ok("Bố cục 1366×768: màn nhập liệu thấy ≥ " + LA.MIN_ROWS + " dòng dữ liệu khi mở màn (không cần cuộn)", inRows.length === LA.INPUT_SCREENS.length && few.length === 0, "đo được " + inRows.length + " màn; thiếu: " + few.map((r) => r.screen + "=" + r.visRows).join(", ") + " | " + inRows.map((r) => r.screen + "=" + r.visRows).join(" "));
    }
    { // 005B-UI001: thanh trên KHÔNG xuống dòng ở 1366×768 / 1920×1080 (≤ 1 hàng), tối đa 2 hàng ở 1024×768 (PASS/FAIL, không còn INFO)
      const tops = res.rows.filter((r) => r.topH != null), lim = (r) => (r.size === "1024x768" ? LA.TOP_TWO_ROWS : LA.TOP_ONE_ROW), badT = tops.filter((r) => r.topH > lim(r));
      ok("Bố cục: thanh trên 1 hàng ở 1366×768 và 1920×1080, tối đa 2 hàng ở 1024×768 (mọi màn)", tops.length === res.rows.length && badT.length === 0, "đo " + tops.length + "/" + res.rows.length + "; vượt: " + badT.slice(0, 8).map((r) => r.screen + "@" + r.size + "=" + r.topH + "px").join(", ") + (badT.length > 8 ? " … (" + badT.length + ")" : ""));
    }
    { // 005B-UI004: không có hai thanh cuộn dọc lồng nhau (khung trang + bảng) ở mọi màn × 3 cỡ
      const badN = res.rows.filter((r) => (r.nestedScroll || []).length);
      ok("Bố cục: không có hai thanh cuộn dọc lồng nhau (khung trang + bảng) ở mọi màn × 3 cỡ", badN.length === 0, badN.length + " (màn × cỡ): " + badN.slice(0, 6).map((r) => r.screen + "@" + r.size + " " + r.nestedScroll[0]).join(" | "));
    }
    const soft = {}; ["contrast", "topWrap", "fewRows"].forEach((k) => { soft[k] = res.rows.filter((r) => (r[k] || []).length).length; }); console.log("INFO bố cục (chỉ ghi nhận, xem docs/UI_ISSUES.md): " + JSON.stringify(soft) + " trên " + res.rows.length + " (màn × cỡ)");
    { // ĐỐI CHỨNG: cố ý chèn lỗi bố cục vào trang → bộ kiểm PHẢI phát hiện (chứng minh các kiểm "Đạt" ở trên có khả năng bắt lỗi)
      await w.click('#nav button[data-k="home"]'); await w.waitForTimeout(300);
      const found = await w.evaluate(() => {
        const box = document.createElement("div"); box.id = "ctl-box"; box.innerHTML = '<div class="bar"><button id="b1" style="position:relative;width:120px">Nút A dài dài</button><button id="b2" style="position:relative;margin-left:-60px;width:120px">Nút B chồng</button></div><span id="clip" style="display:inline-block;width:40px;overflow:hidden;white-space:nowrap;text-overflow:clip">Chữ rất dài bị cắt cụt không có dấu ba chấm</span><table id="wide"><tbody><tr>' + Array.from({ length: 60 }, (_, i) => "<td style='min-width:90px'>Cột " + i + "</td>").join("") + '</tr></tbody></table><span class="hint" id="lowc" style="color:#bbb;background:#fff">Chữ mờ khó đọc</span>';
        document.querySelector("#main").appendChild(box); return null;
      });
      const r = await w.evaluate(LA.pageChecks); await w.evaluate(() => document.getElementById("ctl-box").remove());
      ok("Đối chứng: chữ bị cắt được phát hiện", r.clipped.some((x) => /Chữ rất dài/.test(x)), JSON.stringify(r.clipped));
      ok("Đối chứng: bảng rộng không có vùng cuộn riêng được phát hiện", r.wideNoScroll.length > 0, JSON.stringify(r.wideNoScroll));
      ok("Đối chứng: hai nút chồng nhau được phát hiện", r.overlap.some((x) => /Nút A/.test(x) && /Nút B/.test(x)), JSON.stringify(r.overlap));
      ok("Đối chiếu: chữ tương phản thấp (dưới AA) được phát hiện", r.contrast.some((x) => /Chữ mờ/.test(x)), JSON.stringify(r.contrast));
    }
    ok("Bố cục: không lỗi JavaScript", errs.length === 0, errs.join(" | ")); await app.close();
  }
  ({ app, w, errs } = await launch(D)); await login(w, "hr"); await w.click('#top button:has-text("Đăng xuất")').catch(() => {});
  const closed = await Promise.race([app.close().then(() => true), new Promise((r) => setTimeout(() => r(false), 20000))]);
  ok("Đóng ứng dụng bình thường (không treo)", closed);
  const fail = results.filter((r) => !r.pass).length;
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, "f01-result.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  console.log("\nF01 E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); process.exit(2); });
