"use strict";
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
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const app = await _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: path.join(D, "downloads"), HAK_NO_SHELL: "1" }) });
  const w = await app.firstWindow(); w.on("dialog", (d) => d.accept()); await w.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
  await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  await w.selectOption("#top select", "10"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(400);
  await w.evaluate(() => document.querySelector("#nav button[data-k=baocaoluong]").click()); await w.waitForTimeout(600);
  await w.click('#main button:has-text("Phân bổ sản lượng")'); await w.waitForSelector("[data-attendance-review] .ar-card", { timeout: 15000 });
  const cards = await w.locator(".ar-card").count();
  ok("Danh sách thẻ: mỗi phiếu cần đối chiếu một thẻ (≥ 2 phiếu thử)", cards >= 2, "thẻ = " + cards);
  ok("Mỗi người cần xác nhận có nút 'Xác nhận có làm' riêng", (await w.locator('.ar-card .ar-emp button:has-text("Xác nhận có làm")').count()) >= 2);
  ok("Chưa chọn phiếu → nút xác nhận hàng loạt bị khóa", await w.locator(".ar-bulk button.pri").isDisabled());
  await w.locator(".ar-card input.ar-pick").first().check();
  ok("Tích chọn phiếu → nút hàng loạt mở, đếm 1 phiếu", !(await w.locator(".ar-bulk button.pri").isDisabled()) && /1 phiếu đã chọn/.test(await w.locator(".ar-count").innerText()));
  await w.locator(".ar-all input").check(); ok("Chọn tất cả → mọi thẻ được chọn", (await w.locator(".ar-card.sel").count()) === cards);
  await w.locator(".ar-all input").uncheck(); ok("Bỏ chọn tất cả → không thẻ nào được chọn", (await w.locator(".ar-card.sel").count()) === 0);
  // v2.1.6: Excel danh sách phẳng người × phiếu (kỳ chưa chốt → hậu tố _TAM)
  const ExcelJS = require(path.join(APP, "exceljs.min.js")), DLD = path.join(D, "downloads"), empLines = await w.locator(".ar-card .ar-emp").count();
  const getXlsx = async () => { let f = null; for (let i = 0; i < 60 && !f; i++) { await w.waitForTimeout(300); f = fs.existsSync(DLD) ? fs.readdirSync(DLD).find((n) => /^DoiChieuChamCong_SanLuong_2026-10_TAM\.xlsx$/.test(n)) : null; } if (!f) return null; await w.waitForTimeout(300); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(fs.readFileSync(path.join(DLD, f))); fs.unlinkSync(path.join(DLD, f)); return wb; };
  ok("Có 2 nút xuất Excel danh sách cần xác nhận (theo lọc / tất cả)", (await w.locator('.ar-export button').count()) === 2);
  await w.click('.ar-export button:has-text("Xuất Excel danh sách cần xác nhận")');
  const wbX = await getXlsx(); ok("Tải được DoiChieuChamCong_SanLuong_2026-10_TAM.xlsx", !!wbX);
  if (wbX) {
    const ws = wbX.worksheets[0], hr = ws.views[0].ySplit, head = []; ws.getRow(hr).eachCell((c) => head.push(String(c.value)));
    ok("Sheet 1 có đủ cột: Số phiếu, Mã NV, Họ và tên, Tình trạng chấm công, Có trong NV vắng, Trạng thái xác nhận, cột ký", ["Số phiếu", "Mã NV", "Họ và tên", "Tình trạng chấm công ngày đó", "Có trong NV vắng của phiếu?", "Trạng thái xác nhận", "Chủ/Trưởng bộ phận xác nhận (ký)"].every((c) => head.includes(c)), head.join("|"));
    let n = 0; for (let r = hr + 1; r <= ws.rowCount; r++) { const v = ws.getRow(r).getCell(head.indexOf("Mã NV") + 1).value; if (v && /\S/.test(String(v)) && typeof ws.getRow(r).getCell(1).value === "number") n++; }
    ok("Số dòng = số người cần xác nhận đang hiện trên màn (" + empLines + ")", n === empLines && n >= 2, n + " vs " + empLines);
    ok("3 sheet; đóng băng + bộ lọc; kỳ chưa chốt có 'tính tạm'", wbX.worksheets.length === 3 && !!ws.autoFilter && /tính tạm|NHÁP/i.test(JSON.stringify(ws.getSheetValues())));
  }
  await w.click('.ar-export button:has-text("Xuất tất cả")'); const wbAll = await getXlsx(); ok("Xuất tất cả (bỏ lọc) cũng tải được", !!wbAll);
  // xác nhận TỪNG DÒNG: phiếu 1, người `who`
  await w.locator(".ar-card").first().locator('.ar-emp button:has-text("Xác nhận có làm")').first().click(); await w.waitForSelector(".ar-pickrow");
  ok("Xác nhận từng dòng: hộp chỉ liệt kê đúng 1 người, đã tích sẵn", (await w.locator(".ar-pickrow").count()) === 1 && (await w.locator(".ar-pickrow input").isChecked()));
  await w.click('button:has-text("Xem trước phân bổ")'); ok("Thiếu lý do → không đi tiếp", (await w.locator('button:has-text("Lưu xác nhận")').count()) === 0);
  await w.fill("textarea.ar-reason", "Làm ca dài qua ngày"); await w.click('button:has-text("Xem trước phân bổ")'); await w.waitForSelector('button:has-text("Lưu xác nhận")');
  await w.click('button:has-text("Lưu xác nhận")'); await w.waitForTimeout(1200);
  const saved = await w.evaluate(() => { try { return JSON.parse(window.hakStore.load().text).productionAttendance || []; } catch (e) { return String(e); } });
  ok("Đã lưu đúng 1 xác nhận (người, ngày, tổ, lý do)", Array.isArray(saved) && saved.length === 1 && saved[0].employee === who && saved[0].reason === "Làm ca dài qua ngày", JSON.stringify(saved));
  // xác nhận HÀNG LOẠT theo phiếu đã chọn (phiếu còn lại)
  await w.waitForSelector(".ar-card"); const left = await w.locator(".ar-card").count();
  ok("Sau khi xác nhận 1 dòng, thẻ đã xử lý biến khỏi danh sách (còn ≥ 1 phiếu)", left >= 1 && left < cards, "còn " + left + " / " + cards);
  await w.locator(".ar-all input").check(); await w.click('.ar-bulk button.pri'); await w.waitForSelector(".ar-pickrow");
  ok("Xác nhận theo phiếu đã chọn: các người của phiếu được tích sẵn", (await w.locator(".ar-pickrow input:checked").count()) === (await w.locator(".ar-pickrow").count()));
  await w.fill("textarea.ar-reason", "Làm ca dài (xác nhận theo phiếu)"); await w.click('button:has-text("Xem trước phân bổ")'); await w.waitForSelector('button:has-text("Lưu xác nhận")'); await w.click('button:has-text("Lưu xác nhận")'); await w.waitForTimeout(1200);
  const saved2 = await w.evaluate(() => JSON.parse(window.hakStore.load().text).productionAttendance || []);
  ok("Đã lưu thêm xác nhận theo phiếu (tổng ≥ 2, đều có lý do)", saved2.length >= 2 && saved2.every((r) => r.reason), JSON.stringify(saved2));
  await app.close();
  const pass = results.filter(Boolean).length; console.log("Attendance-review E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
