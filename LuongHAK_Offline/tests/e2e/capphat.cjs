"use strict";
require("./harness-env.cjs");
// Nghiệm thu trọn luồng phân hệ Cấp phát trên ứng dụng Electron thật, bằng dữ liệu giả:
//  · hai chế độ (một người / phân quyền: chặn tự xác nhận ở giao diện VÀ tiến trình chính), lập tay, sửa nháp, nhập Excel (mã 0005, lỗi theo dòng, chặn trùng),
//  · nhân viên chuyển tổ + thu hồi một phần (Tổ 1 = 10/2/8, Tổ 2 = 5/0/5), báo cáo Tổng hợp/Chi tiết khớp ở màn hình, Excel và PDF, mở phiếu gốc và quay lại giữ bộ lọc + trang,
//  · hồi quy sữa (mặt hàng hết định mức vẫn hiện số đã cấp, nháp không tính), nâng cấp từ dữ liệu kiểu v2.0.24, đóng/mở lại, Full Backup → khôi phục vào hồ sơ riêng.
// Chạy: node tests/e2e/capphat.cjs   (Linux không màn hình: xvfb-run -a …). HAK_PACKAGED_EXE=<Setup đã cài .exe> để chạy trên bản đóng gói. E2E_SHOTS=<thư mục> để lưu ảnh.
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ExcelJS = require("../../exceljs.min.js"), B = require("../../core/benefits.js"), { fixture } = require("../fixtures/production-carry");
const APP = path.resolve(__dirname, "../.."), PASS = "CapPhat2026e2e", SHOTS = process.env.E2E_SHOTS || "";
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra: extra || "" }); console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? " — " + String(extra).slice(0, 400) : "")); };
const shot = async (w, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await w.screenshot({ path: path.join(SHOTS, name + ".png") }).catch(() => {}); } };
const account = (user, name, role) => { const salt = crypto.randomBytes(16).toString("hex"), iter = 210000; return { id: user.toUpperCase(), tenDangNhap: user, hoTen: name, vaiTro: role, khoa: false, salt, iter, hash: crypto.pbkdf2Sync(PASS, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") }; };
const T = { "02.01": "Tổ 1 - Công nhân sản xuất", "02.02": "Tổ 2 - Công nhân sản xuất" };
// A: Tổ 1 đến hết 14/11/2026, Tổ 2 từ 15/11/2026. 0005 và B luôn Tổ 1.
const deptOf = (ma, date) => { const code = ma === "A" && (date || "9999") >= "2026-11-15" ? "02.02" : "02.01"; return { code, name: T[code] }; };
const stamp = "2026-11-20T08:00:00.000Z";

function seed(mode) {
  const d = fixture(); d.auditlog = []; d.baomat = []; d.schemaVersion = 2; d.sanluong = []; d.chamcong = [];
  d.nhanvien.push({ "Mã NV": "0005", "Họ và tên": "Người số 0005", "Trạng thái": "Đang làm việc" });
  d.hopdong.push({ "Mã NV": "0005", "Số HĐLĐ": "0005", "Ngày vào làm": "2026-01-01", "Ngày chấm dứt": "" });
  d.chitiethd.push({ ...d.chitiethd[0], "Mã NV": "0005", "Số HĐLĐ": "0005", "Phòng ban": "02.01" });
  d.chitiethd.push({ ...d.chitiethd.find((r) => r["Mã NV"] === "A"), "Hiệu lực từ": "2026-11-15", "Phòng ban": "02.02" });
  d.nguoidung = [account("admin", "Quản trị giả", "admin"), account("hr", "Nhân sự giả", "nhansu"), account("boss", "Phê duyệt giả", "pheduyet")];
  if (mode === "roles") d.workflowSettings = [{ mode: "roles", reason: "E2E cấp phát", user: "admin", changedAt: stamp }];
  d.benefitStandards = [{ code: "S1", from: "2026-01-01", until: "2026-10-31", items: [{ code: "MILK", name: "Sữa tươi", unit: "hộp", quantity: 30 }] }];
  d.benefitAssignments = ["A", "B"].map((ma) => ({ employee: ma, contract: ma, code: "S1", from: "2026-01-01" }));
  d.benefitPpeItems = [{ code: "GIAY", name: "Giày bảo hộ", group: "Giày", unit: "đôi", spec: "da", active: true, sizes: ["39", "40", "41"] }, { code: "MUBH", name: "Mũ bảo hộ", group: "Mũ", unit: "cái", spec: "", active: true, sizes: [] }];
  const vouch = (input, status) => ({ ...B.buildVoucher(d, { maker: "hr", ...input }, deptOf), status, ...(status === "issued" ? { reviewer: "boss", confirmedAt: stamp } : {}) });
  d.benefitIssues = [vouch({ type: "milk", id: "SUA-SEED", date: "2026-11-05", place: "Kho", lines: [{ employee: "A", item: "MILK", quantity: 4 }] }, "issued"),
    vouch({ type: "milk", id: "SUA-NHAP", date: "2026-11-06", place: "Kho", lines: [{ employee: "B", item: "MILK", quantity: 9 }] }, "draft")];
  for (let i = 1; i <= 110; i++) d.benefitIssues.push(vouch({ type: "ppe", id: "MU-" + String(i).padStart(3, "0"), date: "2026-10-" + String(1 + (i % 28)).padStart(2, "0"), place: "Kho mũ", lines: [{ employee: "0005", item: "MUBH", size: "", quantity: 1 }] }, "issued"));
  d.benefitAdjustments = [];
  return d;
}
async function launch(dir, env) {
  const exe = process.env.HAK_PACKAGED_EXE, app = await _electron.launch({ executablePath: exe || require("electron"), args: exe ? ["--no-sandbox"] : ["--no-sandbox", APP],
    env: { ...process.env, HAK_USER_DATA: dir, HAK_DOWNLOAD_DIR: path.join(dir, "downloads"), HAK_NO_SHELL: "1", ...(env || {}) } });
  const w = await app.firstWindow(), errs = [], dialogs = [];
  w.on("pageerror", (e) => errs.push(e.message)); w.on("dialog", (x) => { dialogs.push(x.message()); x.accept(); });
  await w.waitForSelector("#main > *"); return { app, w, errs, dialogs };
}
async function login(w, user) { await w.waitForSelector("#main input[data-f=u]"); await w.fill("#main input[data-f=u]", user); await w.fill("#main input[data-f=p]", PASS); await w.click("#main button.big"); await w.waitForSelector("#nav button[data-k=home]"); }
async function logout(w) { await w.click('#top button:has-text("Đăng xuất")'); await w.waitForSelector("#main input[data-f=u]"); }
const text = async (w) => (await w.locator("main").first().innerText()).replace(/\s+/g, " ");
const dirOf = (tag) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "hak-capphat-" + tag + "-")); fs.mkdirSync(path.join(d, "downloads")); return d; };
const readData = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8"));
const goCp = async (w, type, view) => { await w.click("#nav button[data-k=capphat]"); if (view) await w.click('[aria-label="Màn hình cấp phát"] button:has-text("' + view + '")'); if (type) await w.click('[aria-label="Loại cấp phát"] button:has-text("' + type + '")'); await w.waitForTimeout(150); };
const rowsOf = async (w) => w.locator("[data-cp-table] tbody tr").evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim())));
const waitFile = async (dir, re, ms) => { for (let i = 0; i < (ms || 30000) / 250; i++) { const f = fs.readdirSync(dir).filter((x) => re.test(x)).sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs)[0]; if (f) return path.join(dir, f); await new Promise((r) => setTimeout(r, 250)); } return ""; };
async function newPpeVoucher(w, id, date, lines) {
  await w.click('button:has-text("Lập phiếu bảo hộ lao động")'); await w.waitForSelector("[data-cp-detail]");
  await w.fill('[data-cp-zone=info] input[aria-label="Mã phiếu"]', id); await w.fill('[data-cp-zone=info] input[aria-label="Ngày giao"]', date); await w.fill('[data-cp-zone=info] input[aria-label="Địa điểm"]', "Kho vật tư");
  for (const l of lines) {
    await w.click('button:has-text("Thêm dòng")'); const n = await w.locator("[data-cp-lines] tbody tr").count(), row = w.locator("[data-cp-lines] tbody tr").nth(n - 1);
    await row.locator('input[aria-label="Mã NV"]').fill(l.employee); await row.locator('input[aria-label="Mã NV"]').press("Tab"); await w.waitForTimeout(120);
    await w.locator("[data-cp-lines] tbody tr").nth(n - 1).locator('select[aria-label="Mặt hàng"]').selectOption(l.item); await w.waitForTimeout(120);
    if (l.size) await w.locator("[data-cp-lines] tbody tr").nth(n - 1).locator('select[aria-label="Kích cỡ"]').selectOption(l.size);
    const q = w.locator("[data-cp-lines] tbody tr").nth(n - 1).locator('input[aria-label="Số lượng"]'); await q.fill(String(l.quantity)); await q.press("Tab"); await w.waitForTimeout(120);
  }
}
async function guarded(name, fn) { try { await fn(); } catch (e) { ok(name + " — ngoại lệ", false, e && e.message); } }

(async () => {
  // ================= HỒ SƠ 1: chế độ PHÂN QUYỀN =================
  const D1 = dirOf("roles"); fs.writeFileSync(path.join(D1, "data.json"), JSON.stringify(seed("roles")));
  // Mở một lần bằng Quản trị để app bổ sung các bảng mặc định (như dữ liệu thật đã dùng) trước khi thử vai trò khác.
  { const first = await launch(D1); await login(first.w, "admin"); await first.w.waitForTimeout(800); await first.app.close(); }
  let { app, w, errs, dialogs } = await launch(D1);
  await guarded("Chế độ phân quyền — người lập (hr)", async () => {
    await login(w, "hr");
    await w.click("#nav button[data-k=nvns]"); await w.click('button:has-text("Cấp phát sữa phúc lợi")'); await w.waitForSelector("[data-cp-tab]");
    ok("Một nơi duy nhất: lối cấp phát sữa cũ ở Nghiệp vụ nhân sự chuyển về Cấp phát với bộ lọc Sữa phúc lợi", /Phiếu cấp phát/.test(await text(w)) && (await w.locator('[aria-label="Loại cấp phát"] button.pri').innerText()).includes("Sữa phúc lợi"));
    ok("Không còn màn lập/nhập phiếu cũ trong Nghiệp vụ nhân sự", !(await w.evaluate(() => /Lập phiếu cấp phát/.test(document.body.innerText))));
    await goCp(w, "Bảo hộ lao động", "Phiếu cấp phát");
    await newPpeVoucher(w, "BH1", "2026-11-03", [{ employee: "A", item: "GIAY", size: "40", quantity: 10 }]);
    await shot(w, "cp-win-01-man-nhap-phieu");
    await w.click('button:has-text("Lưu nháp")'); await w.waitForTimeout(500);
    ok("Lập tay: lưu nháp phiếu BH1 (A, 10 đôi giày cỡ 40)", /BH1 — Nháp/.test(await text(w)));
    ok("Chế độ phân quyền: người lập KHÔNG có nút tự xác nhận (giao diện)", (await w.locator('button:has-text("Xác nhận cấp phát")').count()) === 0 && /khác người lập/.test(await text(w)));
    const bypass = await w.evaluate(() => { const t = window.hakStore.load(); const db = JSON.parse(t.text); db.benefitIssues = db.benefitIssues.map((x) => x.id === "BH1" ? { ...x, status: "issued", reviewer: "hr", confirmedAt: new Date().toISOString() } : x); return window.hakStore.save(JSON.stringify(db)); });
    ok("Chế độ phân quyền: tiến trình chính từ chối người lập tự xác nhận (qua cầu lưu trữ, bỏ qua giao diện)", bypass !== true && /khác người lập|quyền xác nhận/i.test(String(bypass)), String(bypass).slice(0, 160));
    ok("…và dữ liệu vẫn là nháp", readData(D1).benefitIssues.find((x) => x.id === "BH1").status === "draft");
    // sửa nháp
    const line = w.locator("[data-cp-lines] tbody tr").first().locator('input[aria-label="Số lượng"]'); await line.fill("11"); await line.press("Tab");
    await w.click('button:has-text("Lưu nháp")'); await w.waitForTimeout(450);
    ok("Sửa nháp: người lập đổi số lượng 10 → 11 và lưu được", readData(D1).benefitIssues.find((x) => x.id === "BH1").lines[0].quantity === 11);
    const line2 = w.locator("[data-cp-lines] tbody tr").first().locator('input[aria-label="Số lượng"]'); await line2.fill("10"); await line2.press("Tab"); await w.click('button:has-text("Lưu nháp")'); await w.waitForTimeout(450);
    // trùng dòng
    await w.click('button:has-text("Quay lại danh sách")'); await newPpeVoucher(w, "BH-TRUNG", "2026-11-04", [{ employee: "B", item: "GIAY", size: "39", quantity: 1 }, { employee: "B", item: "GIAY", size: "39", quantity: 2 }]);
    await w.click('button:has-text("Lưu nháp")'); await w.waitForSelector(".dlg"); const dup = await w.locator(".dlg").innerText();
    ok("Chặn trùng dòng khi lập tay (cùng nhân viên, vật tư, cỡ) với thông báo theo dòng", /Dòng 2.*trùng/.test(dup), dup.slice(0, 200)); await w.click('.dlg button:has-text("Đóng")');
    await w.click('button:has-text("Quay lại danh sách")');
    // phiếu tổ 2 ngày 20/11 (A đã chuyển Tổ 2)
    await newPpeVoucher(w, "BH2", "2026-11-20", [{ employee: "A", item: "GIAY", size: "40", quantity: 5 }]); await w.click('button:has-text("Lưu nháp")'); await w.waitForTimeout(450);
    const v2 = readData(D1).benefitIssues.find((x) => x.id === "BH2");
    ok("Phiếu BH2 (20/11, A đã chuyển Tổ 2) lưu tổ tại ngày cấp = Tổ 2; BH1 (03/11) lưu Tổ 1", v2.lines[0].dept === "02.02" && readData(D1).benefitIssues.find((x) => x.id === "BH1").lines[0].dept === "02.01");
    await w.click('button:has-text("Quay lại danh sách")');
    // nhập Excel
    await w.click('button:has-text("Tải mẫu bảo hộ lao động")'); const tpl = await waitFile(path.join(D1, "downloads"), /^Mau_CapPhat_BaoHo.*\.xlsx$/);
    const wb = new ExcelJS.Workbook(); if (tpl) await wb.xlsx.load(fs.readFileSync(tpl)); const ws = wb.worksheets[0];
    ok("Mẫu Excel bảo hộ: cột Mã phiếu / Mã NV / Mã vật tư / Kích cỡ định dạng Text cho cả cột, có cột 'Dòng ví dụ', có sheet Hướng dẫn", !!tpl && ["Mã phiếu", "Mã NV", "Mã vật tư", "Kích cỡ"].every((c) => { const i = ws.getRow(1).values.indexOf(c); return i > 0 && ws.getColumn(i).numFmt === "@" && ws.getCell(60, i).numFmt === "@"; }) && ws.getRow(1).values.includes("Dòng ví dụ") && wb.worksheets.length === 2);
    const xl = new ExcelJS.Workbook(), sh = xl.addWorksheet("Cấp phát bảo hộ"); sh.getRow(1).values = ["Mã phiếu", "Ngày cấp", "Địa điểm", "Mã NV", "Mã vật tư", "Kích cỡ", "Số lượng", "Lý do", "Ghi chú", "Dòng ví dụ"];
    const rows = [["BH-VD-01", "2026-11-15", "Kho", "0005", "GIAY", "40", 1, "", "", "VÍ DỤ"], ["BH-IMP", "2026-11-16", "Kho", "0005", "MUBH", "", 2, "Đợt 11", "", ""], ["BH-IMP", "2026-11-16", "Kho", "0005", "GIAY", "45", 1, "Đợt 11", "", ""],
      ["BH-IMP", "2026-11-16", "Kho", "0005", "MUBH", "", 1, "Đợt 11", "", ""], ["BH-IMP", "2026-11-17", "Kho", "0005", "GIAY", "41", 1, "Đợt 11", "", ""], ["BH-X", "2026-11-16", "Kho", "9999", "MUBH", "", 1, "", "", ""]];
    rows.forEach((r, i) => { sh.getRow(i + 2).values = r; }); const xf = path.join(D1, "import.xlsx"); fs.writeFileSync(xf, new Uint8Array(await xl.xlsx.writeBuffer()));
    const imp = async () => { const [fc] = await Promise.all([w.waitForEvent("filechooser"), w.click('button:has-text("Nhập Excel")')]); await fc.setFiles(xf); await w.waitForSelector("[data-cp-import]"); return (await w.locator(".dlg").innerText()).replace(/\s+/g, " "); };
    let pv = await imp(); await shot(w, "cp-win-02-xem-truoc-nhap-excel");
    ok("Nhập Excel: báo lỗi đúng số dòng (sai cỡ dòng 4, trùng dòng 5, đầu phiếu lệch dòng 6, mã NV không có dòng 7) và bỏ qua dòng ví dụ", /Dòng Excel 4\b.*sai kích cỡ/.test(pv) && /Dòng Excel 5: trùng dòng 3/.test(pv) && /Dòng Excel 6: đầu phiếu BH-IMP không nhất quán/.test(pv) && /Dòng Excel 7: không có nhân viên 9999/.test(pv) && /Đã bỏ qua 1 dòng ví dụ/.test(pv), pv.slice(0, 500));
    await w.click('.dlg button:has-text("Sửa lỗi trong file")');
    const good = [["BH-VD-01", "2026-11-15", "Kho", "0005", "GIAY", "40", 1, "", "", "VÍ DỤ"], ["BH-IMP", "2026-11-16", "Kho", "0005", "MUBH", "", 2, "Đợt 11", "", ""], ["BH-IMP", "2026-11-16", "Kho", "0005", "GIAY", "41", 1, "Đợt 11", "", ""]];
    const xl2 = new ExcelJS.Workbook(), s2 = xl2.addWorksheet("Cấp phát bảo hộ"); s2.getRow(1).values = sh.getRow(1).values.slice(1); good.forEach((r, i) => { s2.getRow(i + 2).values = r; }); s2.getColumn(4).numFmt = "@"; fs.writeFileSync(xf, new Uint8Array(await xl2.xlsx.writeBuffer()));
    pv = await imp(); ok("Nhập Excel sau khi sửa: 1 phiếu nháp mới, mã 0005 giữ số 0 đầu", /1 phiếu: 1 mới/.test(pv) && /Lưu nháp 1 phiếu/.test(pv), pv.slice(0, 300));
    await w.click('.dlg button:has-text("Lưu nháp 1 phiếu")'); await w.waitForTimeout(500);
    const imported = readData(D1).benefitIssues.find((x) => x.id === "BH-IMP");
    ok("Dữ liệu ghi: BH-IMP có Mã NV '0005' (chuỗi) và tổ đã lưu tại ngày cấp", imported && imported.lines.every((l) => l.employee === "0005" && l.dept === "02.01") && imported.lines.length === 2 && imported.status === "draft");
    pv = await imp(); ok("Nhập lại cùng file: chặn nhập trùng (đã có, không đổi), không cộng lần hai", /1 đã có \(không đổi\)/.test(pv) && /Không có phiếu nào để lưu/.test(pv)); await w.click('.dlg button:has-text("Đóng")');
    ok("Danh sách phiếu: BH-IMP chỉ xuất hiện một lần sau nhập lại", readData(D1).benefitIssues.filter((x) => x.id === "BH-IMP").length === 1);
    ok("Không lỗi JavaScript (người lập)", errs.length === 0, errs.join(" | ")); errs.length = 0;
  });
  await guarded("Chế độ phân quyền — người phê duyệt (boss)", async () => {
    await logout(w); await login(w, "boss"); await goCp(w, "Bảo hộ lao động", "Phiếu cấp phát");
    ok("Người phê duyệt không có nút lập phiếu (không có quyền nhân sự)", (await w.locator('button:has-text("Lập phiếu")').count()) === 0);
    for (const id of ["BH1", "BH2"]) { await w.locator('[data-cp-voucher="' + id + '"] button').click(); await w.waitForSelector("[data-cp-detail]"); await w.click('button:has-text("Xác nhận cấp phát")'); await w.waitForTimeout(450); ok("Người khác có quyền xác nhận được phiếu " + id, new RegExp(id + " — Đã cấp").test(await text(w))); await w.click('button:has-text("Quay lại danh sách")'); }
    ok("Tiến trình chính ghi người xác nhận và thời điểm", readData(D1).benefitIssues.filter((x) => ["BH1", "BH2"].includes(x.id)).every((x) => x.status === "issued" && x.reviewer === "boss" && /^\d{4}-\d{2}-\d{2}T/.test(x.confirmedAt)));
    // thu hồi sau khi A đã chuyển Tổ 2: vượt, rồi đúng
    await w.locator('[data-cp-voucher="BH1"] button').click(); await w.waitForSelector("[data-cp-detail]"); await w.click('button:has-text("Thu hồi / điều chỉnh")'); await w.waitForSelector("[data-cp-adjust]");
    await w.fill('.dlg input[aria-label="Ngày giao dịch thu hồi hoặc đổi cỡ"]', "2026-11-17");
    await shot(w, "cp-win-07-ngay-giao-dich");
    const rec = w.locator('[data-cp-adjust] input[aria-label^="Số thu hồi A GIAY"]'); await rec.fill("11"); await w.fill('.dlg input[aria-label="Lý do thu hồi hoặc điều chỉnh"]', "Trả lại 2 đôi sai cỡ");
    dialogs.length = 0; await w.click('.dlg button:has-text("Ghi thu hồi / điều chỉnh")'); await w.waitForTimeout(300);
    ok("Thu hồi vượt số lượng còn lại bị chặn", dialogs.some((m) => /vượt số lượng còn lại/.test(m)) && readData(D1).benefitAdjustments.length === 0, dialogs.join("|"));
    await rec.fill("2"); await w.click('.dlg button:has-text("Ghi thu hồi / điều chỉnh")'); await w.waitForTimeout(450);
    const adj = readData(D1).benefitAdjustments[0];
    ok("Thu hồi 2 đôi: ghi tham chiếu phiếu gốc, lý do, người thao tác, thời điểm", adj && adj.ref === "BH1" && adj.by === "boss" && adj.reason === "Trả lại 2 đôi sai cỡ" && /^\d{4}-\d{2}-\d{2}T/.test(adj.at) && adj.lines[0].quantity === 2);
    await shot(w, "cp-win-03-chi-tiet-phieu-da-thu-hoi");
    await w.click('button:has-text("Quay lại danh sách")');
    // báo cáo tổng hợp
    await goCp(w, "Bảo hộ lao động", "Báo cáo cấp phát"); await w.waitForSelector("[data-cp-table]");
    let sum = await rowsOf(w); const find = (rows, key, unit) => rows.find((r) => r[1].startsWith(key) && r.includes(unit));
    const t1 = sum.find((r) => /^Tổ 1/.test(r[1]) && r[2] === "Giày bảo hộ"), t2 = sum.find((r) => /^Tổ 2/.test(r[1]) && r[2] === "Giày bảo hộ"), tot = sum.find((r) => r[1] === "CỘNG" && r.includes("đôi"));
    ok("Tổng hợp theo tổ: Tổ 1 = đã cấp 10, thu hồi 2, thực cấp 8; Tổ 2 = 5, 0, 5; tổng đôi = 15 / 2 / 13", !!t1 && !!t2 && !!tot && t1.slice(-3).join() === "10,2,8" && t2.slice(-3).join() === "5,0,5" && tot.slice(-3).join() === "15,2,13", JSON.stringify([t1, t2, tot, find]));
    ok("Cộng riêng từng đơn vị tính (đôi và cái là hai dòng cộng riêng)", sum.some((r) => r[1] === "CỘNG" && r.includes("cái")) && sum.some((r) => r[1] === "CỘNG" && r.includes("đôi")));
    await shot(w, "cp-win-04-bao-cao-tong-hop");
    // Excel / PDF khớp màn hình
    const dl = path.join(D1, "downloads"); fs.readdirSync(dl).forEach((f) => /^BaoCaoCapPhat/.test(f) && fs.rmSync(path.join(dl, f)));
    await w.locator("[data-cp-report] button", { hasText: "Excel" }).click(); const xlsx = await waitFile(dl, /^BaoCaoCapPhat_TongHop.*\.xlsx$/);
    const rb = new ExcelJS.Workbook(); await rb.xlsx.load(fs.readFileSync(xlsx)); const rs = rb.worksheets[0], head = []; rs.eachRow((row, n) => { if (n <= 7) head.push(row.values.filter(Boolean).join(" ")); });
    let hrow = 0; rs.eachRow((row, n) => { if (!hrow && row.values.includes("Mặt hàng") && row.values.includes("Đã cấp")) hrow = n; });
    const xrows = []; rs.eachRow((row, n) => { if (n > hrow && ["Bảo hộ lao động", "Sữa phúc lợi"].includes(String(row.getCell(1).value))) xrows.push(row.values.slice(1).map((v) => (v == null ? "" : String(v)))); });
    const screenKey = sum.map((r) => r.join("|")).sort(), xlKey = xrows.filter((r) => r[0]).map((r) => r.join("|")).sort();
    ok("Excel tổng hợp: có đơn vị, tên báo cáo, kỳ, phạm vi lọc, ngày lập; số liệu từng dòng KHỚP màn hình", /BÁO CÁO CẤP PHÁT/.test(head.join(" ")) && /Phạm vi/.test(head.join(" ")) && /Ngày lập/.test(head.join(" ")) && screenKey.length === xlKey.length && screenKey.every((k, i) => k.replace(/\s/g, "") === xlKey[i].replace(/\s/g, "")), JSON.stringify({ screenKey: screenKey.slice(0, 3), xlKey: xlKey.slice(0, 3), head: head.slice(0, 4) }));
    ok("Excel: cố định tiêu đề và có bộ lọc", rs.views[0] && rs.views[0].state === "frozen" && !!rs.autoFilter);
    await w.locator("[data-cp-report] button", { hasText: "PDF" }).click(); const pdf = await waitFile(dl, /^BaoCaoCapPhat_TongHop.*\.pdf$/, 45000);
    const pb = pdf ? fs.readFileSync(pdf) : Buffer.alloc(0);
    ok("PDF tổng hợp được tạo (đầu tệp %PDF, có nội dung)", pb.length > 2000 && pb.slice(0, 4).toString() === "%PDF", pb.length);
    // Chi tiết + bộ lọc + mở phiếu gốc + quay lại
    await w.click('[data-cp-report] button:has-text("Chi tiết")'); await w.waitForSelector('[data-cp-report="detail"]');
    await w.fill("[data-sf-q]", "BH1"); await w.press("[data-sf-q]", "Enter"); await w.waitForTimeout(600); // 110 phiếu mũ nằm trước theo ngày: lọc mã phiếu để thấy lượt thu hồi
    const detailRows = await rowsOf(w); const header = await w.locator("[data-cp-table] thead th").allInnerTexts();
    await w.fill("[data-sf-q]", ""); await w.press("[data-sf-q]", "Enter"); await w.waitForTimeout(600);
    ok("Chi tiết: có Ngày giao dịch và Ngày cấp gốc riêng, Mã điều chỉnh, tổ tại ngày cấp", ["Ngày giao dịch", "Ngày cấp gốc", "Mã điều chỉnh", "Tổ/Phòng ban tại ngày cấp"].every((c) => header.includes(c)));
    const iT = header.indexOf("Lượt"), recall = detailRows.find((r) => r[iT] === "Thu hồi" && r[header.indexOf("Mã phiếu")] === "BH1");
    ok("Chi tiết dòng thu hồi: ngày 'giao dịch' là ngày nghiệp vụ đã chọn (17/11), ngày cấp gốc 03/11/2026 hiển thị riêng, tổ = Tổ 1 dù A đã sang Tổ 2", !!recall && recall[header.indexOf("Ngày cấp gốc")] === "2026-11-03" && /^Tổ 1/.test(recall[header.indexOf("Tổ/Phòng ban tại ngày cấp")]) && recall[header.indexOf("Mã điều chỉnh")] === adj.id && recall[header.indexOf("Ngày giao dịch")] === "2026-11-17" && adj.date === "2026-11-17", JSON.stringify(recall));
    await shot(w, "cp-win-05-bao-cao-chi-tiet");
    // trang 2 (có >100 dòng do 110 phiếu mũ) + bộ lọc đang áp dụng → mở phiếu gốc → quay lại
    await w.fill("[data-sf-q]", "0005"); await w.press("[data-sf-q]", "Enter"); await w.waitForTimeout(700);
    await w.locator(".pager button[title='Trang sau']").first().click(); await w.waitForTimeout(250);
    const before = { q: await w.inputValue("[data-sf-q]"), pager: await w.locator(".pager span").first().innerText(), first: (await rowsOf(w))[0] };
    await w.locator("[data-cp-table] tbody tr button").first().click(); await w.waitForSelector("[data-cp-detail]");
    ok("Từ báo cáo mở đúng phiếu gốc bằng cùng màn chi tiết", new RegExp("Phiếu " + before.first[header.indexOf("Mã phiếu")] + " ").test(await text(w)), before.first.join("|"));
    await w.click('button:has-text("Quay lại báo cáo")'); await w.waitForSelector('[data-cp-report="detail"]'); await w.waitForTimeout(300);
    const after = { q: await w.inputValue("[data-sf-q]"), pager: await w.locator(".pager span").first().innerText(), first: (await rowsOf(w))[0] };
    ok("Quay lại báo cáo giữ nguyên bộ lọc (từ khóa), chế độ Chi tiết và trang đang xem", after.q === before.q && after.pager === before.pager && after.first.join() === before.first.join() && /Trang 2\//.test(after.pager), JSON.stringify({ before, after }).slice(0, 300));
    await w.fill("[data-sf-q]", ""); await w.press("[data-sf-q]", "Enter"); await w.waitForTimeout(500);
    // lọc theo từ khóa mã phiếu / nhân viên và khoảng ngày
    await w.fill("[data-sf-q]", "BH2"); await w.press("[data-sf-q]", "Enter"); await w.waitForTimeout(500);
    const bh2 = await rowsOf(w); ok("Lọc theo mã phiếu BH2: chỉ còn lượt cấp 5 đôi của Tổ 2", bh2.length === 1 && bh2[0][header.indexOf("Số lượng")] === "5" && /^Tổ 2/.test(bh2[0][header.indexOf("Tổ/Phòng ban tại ngày cấp")]));
    await w.fill("[data-sf-q]", ""); await w.press("[data-sf-q]", "Enter"); await w.waitForTimeout(400);
    ok("Không lỗi JavaScript (người phê duyệt)", errs.length === 0, errs.join(" | ")); errs.length = 0;
  });
  await app.close();

  // ================= Đóng/mở lại + Full Backup → khôi phục vào hồ sơ Windows riêng =================
  await guarded("Đóng/mở lại, Full Backup, khôi phục", async () => {
    const snapshot = () => { const d = readData(D1); return JSON.stringify(["benefitStandards", "benefitAssignments", "benefitIssues", "benefitPpeItems", "benefitAdjustments"].map((k) => d[k])); };
    const before = snapshot(); ({ app, w, errs } = await launch(D1)); await login(w, "admin");
    ok("Đóng app, mở lại: danh mục, phiếu và lịch sử thu hồi còn nguyên", snapshot() === before && readData(D1).benefitAdjustments.length === 1);
    await goCp(w, "Bảo hộ lao động", "Báo cáo cấp phát"); await w.waitForSelector("[data-cp-table]"); const sumA = (await rowsOf(w)).map((r) => r.join("|")).join("\n");
    await w.click("#nav button[data-k=backup]"); await w.waitForSelector("[data-fullbackup]"); await w.selectOption('[data-backup-kind]', 'full'); await w.click('[data-backup-now]');
    await w.waitForSelector("#modal [data-pw]"); await w.click('#modal button:has-text("Tạo Full Backup")'); await w.waitForSelector('[data-fb-msg]:has-text("ĐẦY ĐỦ")', { timeout: 60000 });
    const zip = await waitFile(path.join(D1, "downloads"), /^LuongHAK_FullBackup_.*\.zip$/); await app.close();
    ok("Full Backup tạo được gói .zip", !!zip);
    const D2 = dirOf("restore"); const base = seed("single"); base.benefitStandards = []; base.benefitAssignments = []; base.benefitIssues = []; base.benefitPpeItems = []; base.benefitAdjustments = []; fs.writeFileSync(path.join(D2, "data.json"), JSON.stringify(base));
    ({ app, w, errs } = await launch(D2, { HAK_FB_PICK: zip })); await login(w, "admin");
    await w.click("#nav button[data-k=backup]"); await w.waitForSelector("[data-fullbackup]"); await w.selectOption('[data-restore-kind]', 'full'); await w.click('[data-restore-now]');
    for (let i = 0; i < 60; i++) { await w.waitForTimeout(500); if ((readData(D2).benefitIssues || []).length) break; }
    await w.waitForTimeout(800);
    const same = ["benefitStandards", "benefitAssignments", "benefitIssues", "benefitPpeItems", "benefitAdjustments"].every((k) => JSON.stringify(readData(D2)[k]) === JSON.stringify(readData(D1)[k]));
    ok("Khôi phục vào hồ sơ riêng: danh mục, phiếu, lịch sử thu hồi đối chiếu trùng khớp từng bảng", same);
    try { await w.waitForSelector("#main input[data-f=u]", { timeout: 4000 }); await login(w, "admin"); } catch (e) { /* đã đăng nhập sẵn */ }
    await goCp(w, "Bảo hộ lao động", "Báo cáo cấp phát"); await w.waitForSelector("[data-cp-table]");
    ok("Báo cáo sau khôi phục giống hệt báo cáo trước sao lưu", (await rowsOf(w)).map((r) => r.join("|")).join("\n") === sumA);
    await app.close();
  });

  // ================= HỒ SƠ 0: nâng cấp từ dữ liệu kiểu v2.0.24 (chế độ MỘT NGƯỜI) =================
  await guarded("Nâng cấp từ v2.0.24", async () => {
    const D0 = dirOf("v2024"), d = seed("single"); delete d.benefitPpeItems; delete d.benefitAdjustments;
    const legacy = (id, status, extra) => ({ id, date: "2026-11-05", period: "2026-11", place: "Kho cũ", maker: "hr", status, lines: [{ employee: "A", item: "MILK", quantity: 4, note: "" }], ...extra });
    d.benefitIssues = [legacy("PC-2026-11-01", "issued", { reviewer: "boss", confirmedAt: stamp }), legacy("PC-2026-11-02", "draft", { lines: [{ employee: "B", item: "MILK", quantity: 9, note: "" }] })];
    d.nguoidung = [account("admin", "Quản trị giả", "admin")]; fs.writeFileSync(path.join(D0, "data.json"), JSON.stringify(d));
    const legacyJson = JSON.stringify(d.benefitIssues); ({ app, w, errs } = await launch(D0)); await login(w, "admin");
    await goCp(w, "Sữa phúc lợi", "Phiếu cấp phát");
    ok("Dữ liệu kiểu v2.0.24: phiếu sữa cũ hiện ở danh sách chung loại Sữa (giữ mã phiếu, người xác nhận)", (await w.locator("[data-cp-voucher]").count()) === 2 && /boss/.test(await text(w)));
    await w.click('[aria-label="Màn hình cấp phát"] button:has-text("Báo cáo cấp phát")'); await w.waitForSelector("[data-cp-table]");
    const milk = await rowsOf(w); ok("Hồi quy sữa: tiêu chuẩn đã hết hạn, phiếu đã xác nhận vẫn hiện 4 hộp đã cấp kèm 'Không còn định mức hiệu lực'; phiếu nháp 9 hộp KHÔNG cộng", milk.some((r) => r.includes("4") && r.some((c) => /Không còn định mức hiệu lực/.test(c))) && !milk.some((r) => r.slice(0, 9).includes("9") && r.includes("Sữa tươi") && r.indexOf("9") === r.indexOf("Đã cấp")), JSON.stringify(milk));
    await shot(w, "cp-win-06-sua-nang-cap-tu-v2-0-24");
    await w.click("#nav button[data-k=dm]"); await w.click('button:has-text("Đồ bảo hộ lao động")');
    await w.click('button:has-text("Thêm vật tư")'); await w.fill('.dlg [aria-label="Mã vật tư"]', "AOMUA"); await w.fill('.dlg [aria-label="Tên vật tư"]', "Áo mưa"); await w.selectOption('.dlg select[aria-label="Nhóm hàng"]', "Áo mưa"); await w.fill('.dlg [aria-label="Đơn vị tính"]', "cái"); await w.fill('.dlg [aria-label^="Kích cỡ hợp lệ"]', "M, L"); await w.click('.dlg button:has-text("Lưu vật tư")');
    await w.waitForSelector(".dlg", { state: "detached", timeout: 4000 }).catch(async () => {
      await w.evaluate(() => { const m = document.getElementById("modal"); if (m) { m.className = "hide"; m.innerHTML = ""; } });
    });
    await w.waitForTimeout(200);
    await goCp(w, "Bảo hộ lao động", "Phiếu cấp phát"); await newPpeVoucher(w, "BH-MOI", "2026-11-18", [{ employee: "B", item: "AOMUA", size: "L", quantity: 2 }]); await w.click('button:has-text("Lưu nháp")'); await w.waitForTimeout(400); await w.click('button:has-text("Xác nhận cấp phát")'); await w.waitForTimeout(450);
    ok("Chế độ một người: Quản trị lập rồi tự xác nhận được", /BH-MOI — Đã cấp/.test(await text(w)));
    await app.close(); ({ app, w, errs } = await launch(D0)); await login(w, "admin");
    const after = readData(D0);
    const keptLegacy = JSON.stringify(after.benefitIssues.filter((x) => /^PC-/.test(x.id))) === legacyJson;
    ok("Đóng/mở lại sau nâng cấp: phiếu cũ không đổi một ký tự, phiếu mới và danh mục vật tư được giữ, không sinh phiếu trùng", keptLegacy && after.benefitIssues.filter((x) => x.id === "BH-MOI").length === 1 && after.benefitPpeItems.length === 1 && after.benefitIssues.length === 3, after.benefitIssues.length);
    ok("Không lỗi JavaScript khi nâng cấp", errs.length === 0, errs.join(" | ")); await app.close();
  });

  const fail = results.filter((r) => !r.pass).length;
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, "capphat-result.json"), JSON.stringify({ at: new Date().toISOString(), packaged: !!process.env.HAK_PACKAGED_EXE, results }, null, 2));
  console.log("\nCấp phát E2E: " + (results.length - fail) + "/" + results.length + " đạt"); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("E2E LỖI:", e); process.exit(2); });
