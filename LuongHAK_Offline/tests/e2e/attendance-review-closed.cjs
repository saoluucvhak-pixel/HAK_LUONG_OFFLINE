"use strict";
// v2.1.6: Excel danh sách cần xác nhận chấm công của KỲ ĐÃ CHỐT (lấy từ bản chốt). Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/attendance-review-closed.cjs
// v2.1.4: màn "Phiếu cần đối chiếu chấm công" (Báo cáo lương → Phân bổ sản lượng) dạng thẻ: xác nhận TỪNG DÒNG (từng người) hoặc tích chọn nhiều phiếu.
// Electron thật, dữ liệu giả. Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/attendance-review.cjs
/* global window, document */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const APP = path.resolve(__dirname, "../.."), F = require(path.join(APP, "tests/fixtures/build.js")), PASS = "AttRev2026x";
const results = []; const ok = (n, c, x) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (!c && x ? " — " + String(x).slice(0, 800) : "")); };
const account = (u, n, r) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: u.toUpperCase(), tenDangNhap: u, hoTen: n, vaiTro: r, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "attrev-")), db = F.regressionDataset(30); db.schemaVersion = 2; db.nguoidung = [account("admin", "Quản trị giả", "admin")];
  // 2 phiếu chia theo tổ, mỗi phiếu có 1 người trong tổ ghi công = 0 → cần xác nhận
  const cands = db.chamcong.filter((r) => r["Kỳ"] === "2026-10" && String(r["Hình thức công"]).toUpperCase() === "BT"), pbOf = (ma) => db.chitiethd.find((c) => c["Mã NV"] === ma)["Phòng ban"];
  const team = pbOf(cands[0]["Mã NV"]), same = cands.filter((r) => pbOf(r["Mã NV"]) === team); same.forEach((r) => { r["05"] = 1; r["06"] = 1; }); same[0]["05"] = 0; same[0]["06"] = 0;
  const who = same[0]["Mã NV"];
  db.sanluong.push({ "Phiếu cân": "PC-AR-01", "Ngày cân": "2026-10-05", "KL hàng (Tấn)": "30", "Mã phòng ban": team }, { "Phiếu cân": "PC-AR-02", "Ngày cân": "2026-10-06", "KL hàng (Tấn)": "20", "Mã phòng ban": team });
  db.bandam.push({ "Phiếu cân": "BD-AR-01", "Ngày cân": "2026-10-05", "KL hàng (Tấn)": "2", "Mã phòng ban": team }); // Ban dăm: cùng khuôn phiếu
  db.sanluong = db.sanluong.filter((r) => /^PC-AR/.test(r["Phiếu cân"])); db.bandam = db.bandam.filter((r) => /^BD-AR/.test(r["Phiếu cân"])); // bỏ phiếu mẫu có Mã NV không hợp đồng (chặn chốt, không liên quan)
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const app = await _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: path.join(D, "downloads"), HAK_NO_SHELL: "1" }) });
  const w = await app.firstWindow(); const dlgs = []; w.on("dialog", (d) => { dlgs.push(d.message()); d.accept(); }); await w.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
  await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  await w.selectOption("#top select", "10"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(400);
  // chốt kỳ 10/2026 TRƯỚC khi xuất: số liệu phải lấy từ bản chốt (không có hậu tố _TAM, không tính lại)
  await w.click("#nav button[data-k=luong]"); await w.click("button.big"); await w.waitForTimeout(1500); await w.click('button:has-text("Chốt kỳ lương")'); await w.waitForTimeout(1500); await w.waitForSelector(".dlg"); await w.click('.dlg button:has-text("Đã kiểm tra, tiếp tục chốt")'); await w.waitForSelector(".dlg input");
  await w.locator(".dlg input").fill("Chốt bởi E2E"); await w.click(".dlg footer button.pri");
  let closed = true; try { await w.waitForSelector('[data-payroll-closed="1"]', { timeout: 15000 }); } catch (e) { closed = false; }
  ok("Chốt được kỳ 10/2026 (dữ liệu giả)", closed, closed ? "" : (await w.locator(".dlg, .warn").allInnerTexts()).join(" | ").slice(0, 400));
  await w.evaluate(() => document.querySelector("#nav button[data-k=baocaoluong]").click()); await w.waitForTimeout(600);
  await w.click('#main button:has-text("Phân bổ sản lượng")'); await w.waitForSelector("[data-attendance-review] .ar-card", { timeout: 15000 });
  const ExcelJS = require(path.join(APP, "exceljs.min.js")), DLD = path.join(D, "downloads"), empLines = await w.locator(".ar-card .ar-emp").count();
  ok("Kỳ đã chốt: thẻ hiện từ bản chốt, KHÔNG có nút xác nhận (khóa sửa)", empLines >= 2 && (await w.locator('.ar-card button:has-text("Xác nhận có làm")').count()) === 0);
  await w.click('.ar-export button:has-text("Xuất Excel danh sách cần xác nhận")');
  let f = null; for (let i = 0; i < 60 && !f; i++) { await w.waitForTimeout(300); f = fs.existsSync(DLD) ? fs.readdirSync(DLD).find((n) => /^DoiChieuChamCong_SanLuong_2026-10\.xlsx$/.test(n)) : null; }
  ok("Kỳ đã chốt: tên tệp KHÔNG có _TAM", !!f, fs.existsSync(DLD) ? fs.readdirSync(DLD).join(",") : "");
  if (f) {
    await w.waitForTimeout(300); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(fs.readFileSync(path.join(DLD, f))); const ws = wb.worksheets[0], hr = ws.views[0].ySplit, txt = JSON.stringify(ws.getSheetValues());
    let n = 0; for (let r = hr + 1; r <= ws.rowCount; r++) if (typeof ws.getRow(r).getCell(1).value === "number") n++;
    ok("Kỳ đã chốt: ghi 'Đã chốt', không có BẢN NHÁP / tính tạm; số dòng = số người trên màn", /Đã chốt/.test(txt) && !/NHÁP|tính tạm/i.test(txt) && n === empLines, "n=" + n + " màn=" + empLines);
    const hd = []; ws.getRow(hr).eachCell((c) => hd.push(String(c.value))); const tc = hd.indexOf("Tình trạng chấm công ngày đó") + 1; const vals = []; for (let r = hr + 1; r <= hr + n; r++) vals.push(String(ws.getRow(r).getCell(tc).value));
    ok("Kỳ đã chốt: cột Tình trạng chấm công lấy từ bản chốt (đều là '0' hoặc 'Trống', không phải 'chưa biết')", tc > 0 && vals.length === n && vals.every((v) => v === "0" || v === "Trống"), vals.join(","));
  }
  await app.close();
  const pass = results.filter(Boolean).length; console.log("Attendance-review (kỳ đã chốt) E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
