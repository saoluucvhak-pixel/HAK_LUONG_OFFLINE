"use strict";
// v2.1.6: Cổng CHỐT KỲ chặn khi Thưởng/Tạm ứng/Suất cơm có Mã NV sai (A2-03). Chạy: PLAYWRIGHT_MODULE=playwright xvfb-run -a node tests/e2e/close-orphans.cjs
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
  db.ungluong = db.ungluong || []; const real = who; db.ungluong.push({ "Ngày hạch toán": "2026-10-07", "Số chứng từ": "TU-ORPH-1", "Mã NV": real.toLowerCase(), "Tạm ứng": 1000000 }, { "Ngày hạch toán": "2026-10-08", "Số chứng từ": "TU-ORPH-2", "Mã NV": "NVXX999", "Tạm ứng": 5 }); // 2 Mã NV mồ côi: sai hoa/thường + không tồn tại
  db.sanluong = db.sanluong.filter((r) => /^PC-AR/.test(r["Phiếu cân"])); db.bandam = db.bandam.filter((r) => /^BD-AR/.test(r["Phiếu cân"])); // bỏ phiếu mẫu có Mã NV không hợp đồng (chặn chốt, không liên quan)
  fs.writeFileSync(path.join(D, "data.json"), JSON.stringify(db));
  const app = await _electron.launch({ executablePath: require(path.join(APP, "node_modules/electron")), args: ["--no-sandbox", APP], env: Object.assign({}, process.env, { HAK_USER_DATA: D, HAK_DOWNLOAD_DIR: path.join(D, "downloads"), HAK_NO_SHELL: "1" }) });
  const w = await app.firstWindow(); const dlgs = []; w.on("dialog", (d) => { dlgs.push(d.message()); d.accept(); }); await w.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
  await w.waitForSelector("#main > *"); await w.fill("#main input[data-f=u]", "admin"); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]");
  await w.selectOption("#top select", "10"); await w.fill("#top input[type=number]", "2026"); await w.dispatchEvent("#top input[type=number]", "change"); await w.waitForTimeout(400);
  await w.click("#nav button[data-k=luong]"); await w.click("button.big"); await w.waitForTimeout(1500);
  dlgs.length = 0; await w.click('button:has-text("Chốt kỳ lương")'); await w.waitForTimeout(1500);
  const msg = dlgs.join(" || ");
  ok("Chốt kỳ bị CHẶN bằng hộp thoại ⛔ KHÔNG THỂ CHỐT", /KHÔNG THỂ CHỐT/.test(msg), msg.slice(0, 300));
  ok("Thông báo nêu Tạm ứng, mã sai hoa/thường kèm mã gần giống, mã không tồn tại, và hậu quả (bị BỎ QUA)", /Tạm ứng: Mã NV "[^"]+" không khớp Nhân sự \(gần giống/.test(msg) && /NVXX999/.test(msg) && /mã không tồn tại/.test(msg) && /BỎ QUA khi tính lương/.test(msg), msg.slice(0, 500));
  ok("Không mở hộp checklist/nhập lý do chốt, kỳ KHÔNG bị chốt", (await w.locator(".dlg").count()) === 0 && (await w.locator('[data-payroll-closed="1"]').count()) === 0);
  const saved = await w.evaluate(() => JSON.parse(window.hakStore.load().text)); ok("Dữ liệu không bị tự sửa (Mã NV mồ côi giữ nguyên)", saved.ungluong.some((r) => r["Số chứng từ"] === "TU-ORPH-2" && r["Mã NV"] === "NVXX999") && (saved.kyluong || []).filter((k) => k.ky === "2026-10").length === 0);
  await app.close();
  const pass = results.filter(Boolean).length; console.log("Close-orphans E2E: " + pass + "/" + results.length + " đạt"); process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
