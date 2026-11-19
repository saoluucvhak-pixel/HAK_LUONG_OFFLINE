"use strict";
// Kiểm bố cục BẰNG MÁY cho từng màn ở nhiều cỡ cửa sổ (chỉ đạo 005, issue #97). Dữ liệu giả; không ghi dữ liệu nghiệp vụ.
// Dùng: const { auditAll } = require("./layout-audit.cjs"); await auditAll({ app, w, shotsDir, sizes, log })  → { rows, summary }
// Mỗi (màn × cỡ) chạy các kiểm: pageOverflow (trang tràn ngang), clipped (chữ bị cắt không có dấu …), wideNoScroll (bảng rộng không có vùng cuộn riêng),
// stickyHead (bảng dài thiếu tiêu đề cột cố định), overlap (nút/ô chồng nhau), contrast (chip/nhãn trạng thái dưới AA), noFocus (control không hiện focus).
const fs = require("node:fs"), path = require("node:path");
/** Màn nhập liệu hằng ngày + số dòng tối thiểu phải thấy ngay khi mở màn ở 1366×768 (005B-UI002, issue #97). */
/** 005B-UI001 (issue #97): chiều cao tối đa của thanh trên — 1 hàng ở 1366×768 và 1920×1080, tối đa 2 hàng ở 1024×768. */
const TOP_ONE_ROW = 80, TOP_TWO_ROWS = 120;
const INPUT_SCREENS = ["chamcong", "sanluong", "bandam", "tiencom", "psluong", "ungluong"], MIN_ROWS = 12;
const SIZES = [{ w: 1366, h: 768 }, { w: 1920, h: 1080 }, { w: 1024, h: 768 }];


/** Dữ liệu GIẢ nhiều dòng trong THÁNG HIỆN TẠI (để mọi bảng có ≥ 14 dòng, tên dài, nhiều phòng ban) — chỉ dùng cho kiểm bố cục. base = fixture() của production-carry. */
function syntheticData(base, n) {
  n = n || 24; const d = JSON.parse(JSON.stringify(base)), now = new Date(), pad = (x) => String(x).padStart(2, "0"), ky = now.getFullYear() + "-" + pad(now.getMonth() + 1), day = (i) => ky + "-" + pad(1 + (i % 27));
  const ma = (i) => "NV" + pad(i + 1), ten = (i) => "Nguyễn Thị Hoàng Minh Thùy Dương " + (i + 1), pb = (i) => (i % 3 === 0 ? "01.01" : i % 3 === 1 ? "02.01" : "02.02");
  d.nhanvien = Array.from({ length: n }, (_, i) => ({ "Mã NV": ma(i), "Họ và tên": ten(i), "Trạng thái": "Đang làm việc" }));
  d.hopdong = d.nhanvien.map((r) => ({ "Mã NV": r["Mã NV"], "Số HĐLĐ": r["Mã NV"] + "/HĐ", "Ngày vào làm": "2025-01-01" }));
  d.chitiethd = d.nhanvien.map((r, i) => ({ "Mã NV": r["Mã NV"], "Số HĐLĐ": r["Mã NV"] + "/HĐ", "Hiệu lực từ": "2025-01-01", "Phòng ban": pb(i), "Lương thỏa thuận": String(8000000 + i * 100000) }));
  d.chamcong = d.nhanvien.map((r) => { const o = { "Kỳ": ky, "Mã NV": r["Mã NV"], "Hình thức công": "BT" }; for (let k = 1; k <= 26; k++) o[pad(k)] = k % 7 === 0 ? "" : 1; return o; });
  d.sanluong = d.nhanvien.map((r, i) => ({ "Phiếu cân": "PC-" + (1000 + i), "Ngày cân": day(i), "Biển số": "51C-" + (10000 + i), "KL hàng (Tấn)": String(10 + i), "Mã NV": r["Mã NV"], "Mã phòng ban": pb(i) }));
  d.bandam = d.nhanvien.map((r, i) => ({ "Phiếu cân": "BD-" + (2000 + i), "Ngày cân": day(i), "Biển số": "51C-" + (20000 + i), "KL hàng (Tấn)": String(1 + (i % 3)), "Mã phòng ban": pb(i) })); // chế độ mặc định của màn là "Phân bổ theo tổ" (dòng KHÔNG có Mã NV) — để bảng có dòng mà đo được (005B-UI002)
  d.psluong = d.nhanvien.map((r, i) => ({ "Ngày hạch toán": day(i), "Số chứng từ": "PS-" + (3000 + i), "Mã NV": r["Mã NV"], "Diễn giải": "Thưởng chuyên cần tháng " + (i + 1), "Thưởng": 100000 * (1 + (i % 4)) }));
  d.ungluong = d.nhanvien.map((r, i) => ({ "Ngày hạch toán": day(i), "Số chứng từ": "UL-" + (4000 + i), "Mã NV": r["Mã NV"], "Diễn giải": "Tạm ứng kỳ 1 tháng " + (i + 1), "Tạm ứng": 500000 }));
  d.tiencom = d.nhanvien.map((r, i) => ({ "Ngày": day(i), "Mã NV": r["Mã NV"], "Số suất cơm": 1 + (i % 2), "Ghi chú": "Cơm ca " + (1 + (i % 3)) }));
  d.auditlog = []; d.baomat = []; d.schemaVersion = 2; return d;
}

/** Chạy trong trang: trả về { pageOverflow, clipped[], wideNoScroll[], stickyHead[], overlap[], contrast[] } (mỗi phần tử là chuỗi mô tả ngắn). */
function pageChecks() {
  const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0"; };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + ' "' + (e.innerText || e.value || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 28) + '"');
  const root = document.querySelector("#main") || document.body, out = { pageOverflow: 0, clipped: [], wideNoScroll: [], stickyHead: [], overlap: [], contrast: [] };
  out.pageOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // chữ bị cắt: phần tử có chữ, overflow hidden, nội dung rộng hơn khung, không có text-overflow: ellipsis và không có title
  root.querySelectorAll("button,label,th,td,h1,h2,h3,.chip,.badge,.pill,.tag,a,span").forEach((e) => {
    if (!vis(e) || e.closest("[aria-hidden=true]")) return; const cs = getComputedStyle(e);
    if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== "ellipsis" && !e.title && (e.innerText || "").trim()) out.clipped.push(desc(e));
  });
  // bảng rộng hơn vùng chứa mà vùng chứa không cuộn riêng (làm cả trang tràn hoặc bị cắt)
  root.querySelectorAll("table").forEach((t) => {
    if (!vis(t)) return; let p = t.parentElement, scroller = null;
    while (p && p !== root && p !== document.body) { const cs = getComputedStyle(p); if (/auto|scroll/.test(cs.overflowX)) { scroller = p; break; } p = p.parentElement; } // vùng cuộn RIÊNG của bảng (không tính cả #main)
    const wTable = t.getBoundingClientRect().width, host = scroller || root;
    if (wTable > host.clientWidth + 2 && !scroller) out.wideNoScroll.push(desc(t) + " " + Math.round(wTable) + ">" + host.clientWidth);
    // tiêu đề cột cố định cho bảng dài (≥ 12 dòng)
    if (t.tBodies[0] && t.tBodies[0].rows.length >= 12) { const th = t.querySelector("thead th"); if (th && getComputedStyle(th).position !== "sticky") out.stickyHead.push(desc(t) + " " + t.tBodies[0].rows.length + " dòng"); }
  });
  // nút/ô chồng nhau trong cùng một thanh công cụ (bounding box giao nhau > 4px²)
  const bars = root.querySelectorAll(".bar,.toolbar,.tb,.sf,.row,header");
  bars.forEach((bar) => {
    const items = [...bar.querySelectorAll(":scope > button,:scope > input,:scope > select,:scope > label")].filter(vis).slice(0, 40);
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i].getBoundingClientRect(), b = items[j].getBoundingClientRect(), ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 2 && oy > 2 && ox * oy > 4) out.overlap.push(desc(items[i]) + " ∩ " + desc(items[j]));
    }
  });
  // tương phản chữ/nền của chip, nhãn trạng thái (AA: 4.5, chữ ≥ 18.66px đậm hoặc ≥ 24px: 3)
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (e) => { let acc = null, el = e; const layers = []; while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; } el = el.parentElement; } if (!layers.length) return { r: 255, g: 255, b: 255, a: 1 }; acc = layers.pop(); for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; acc = { r: c.r * c.a + acc.r * (1 - c.a), g: c.g * c.a + acc.g * (1 - c.a), b: c.b * c.a + acc.b * (1 - c.a), a: 1 }; } return acc; };
  root.querySelectorAll(".chip,.badge,.pill,.tag,[class*=status],[class*=stt],.warn,.ok,.bad,.hint").forEach((e) => {
    if (!vis(e) || !(e.innerText || "").trim() || e.children.length > 3) return; const cs = getComputedStyle(e), fg = parse(cs.color); if (!fg) return;
    const bg = bgOf(e), L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700, large = px >= 24 || (px >= 18.66 && bold);
    if (ratio < (large ? 3 : 4.5)) out.contrast.push(desc(e) + " " + ratio.toFixed(2));
  });
  // thanh trên bị xuống dòng (các control nằm ở ≥ 2 hàng khác nhau)
  const top = document.querySelector("#top"); out.topWrap = []; out.topH = top ? Math.round(top.getBoundingClientRect().height) : null;
  if (top && top.getBoundingClientRect().height > 80) out.topWrap.push("thanh trên cao " + Math.round(top.getBoundingClientRect().height) + "px (1 hàng ≈ 57px) — control bị đẩy xuống hàng 2+");
  // 005B-UI004: hai thanh cuộn dọc lồng nhau DO CHÍNH BẢNG TRÀN — khung trang (#main) cuộn được, bảng (.tw) cũng cuộn dọc, và bảng là khối cuối của trang
  // (dưới bảng < 40px nội dung) VÀ ép bảng vừa màn được (bảng còn ≥ 200px) — tức là sửa được mà chưa sửa. Trang báo cáo nhiều phần (nội dung phía trên/dưới bảng quá cao) không ép được: khung trang cuộn + bảng cuộn riêng là giới hạn thiết kế (bảng rộng cần vùng cuộn ngang và tiêu đề cột cố định), ghi ở docs/UI_ISSUES.md.
  out.nestedScroll = [];
  { const m = document.querySelector("#main"); if (m && m.scrollHeight > m.clientHeight + 2) {
      const inner = [...m.querySelectorAll(".tw")].filter((e) => vis(e) && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 2).sort((a, b) => b.clientHeight - a.clientHeight)[0];
      if (inner) { const mb = m.getBoundingClientRect(), contentBottom = mb.top + m.scrollHeight - m.scrollTop, below = contentBottom - inner.getBoundingClientRect().bottom - parseFloat(getComputedStyle(m).paddingBottom || 0);
        if (below < 40 && inner.clientHeight - (m.scrollHeight - m.clientHeight) >= 200) out.nestedScroll.push("#main thừa " + (m.scrollHeight - m.clientHeight) + "px + bảng cuộn riêng " + inner.clientHeight + "/" + inner.scrollHeight + "px (dưới bảng " + Math.round(below) + "px)"); } } }
  // bảng dữ liệu dài nhưng màn đầu tiên chỉ thấy rất ít dòng (< 6) — thanh công cụ/chú thích chiếm hết chiều cao
  out.fewRows = [];
  const big = [...root.querySelectorAll("table")].filter((t) => vis(t) && t.tBodies[0] && t.tBodies[0].rows.length >= 8)[0];
  if (big) { const rowsN = [...big.tBodies[0].rows].filter((r) => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; }).length; out.visRows = rowsN; if (rowsN < 6) out.fewRows.push(rowsN + " dòng nhìn thấy / cao " + innerHeight + "px"); } else out.visRows = null; // visRows = số dòng dữ liệu nhìn thấy trọn vẹn ở màn đầu (005B-UI002: màn nhập ≥ MIN_ROWS ở 1366×768)
  Object.keys(out).forEach((k) => { if (Array.isArray(out[k])) out[k] = [...new Set(out[k])].slice(0, 12); });
  { // 010 (issue #99): kiểm kê từng màn — có Bộ lọc thông minh, nút xuất Excel/PDF/in, số bảng — để lập docs/REPORT_CATALOG.md bằng máy (chỉ ghi nhận)
    const btns = [...root.querySelectorAll("button")].filter(vis).map((b) => (b.innerText || b.title || "").replace(/\s+/g, " ").trim());
    const h2 = document.querySelector("#top h2");
    out.inv = { title: h2 ? h2.innerText.trim() : "", sf: !!root.querySelector("[data-sf-q]"), excel: btns.some((t) => /Excel/i.test(t) && !/Nhập/i.test(t)), pdf: btns.some((t) => /PDF|\bIn\b|In báo cáo|In phiếu/i.test(t)),
      tables: [...root.querySelectorAll("table")].filter(vis).length };
  }
  return out;
}

/** Hộp thoại (nếu đang mở): vừa khung nhìn và nút chính thấy không cần cuộn. */
function dialogChecks() {
  const d = document.querySelector("#modal .dlg, .dlg"); if (!d) return null; const r = d.getBoundingClientRect(), res = { fits: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, primaryVisible: true, size: Math.round(r.width) + "x" + Math.round(r.height) };
  const pri = d.querySelector("footer button.pri, footer .pri, button.pri"); if (pri) { const b = pri.getBoundingClientRect(); res.primaryVisible = b.bottom <= innerHeight + 1 && b.top >= -1 && b.right <= innerWidth + 1; }
  return res;
}

/** Tab 12 lần: mỗi control nhận focus phải có dấu hiệu nhìn thấy (outline hoặc box-shadow khác none). Trả danh sách control không có dấu hiệu. */
async function focusCheck(w) {
  const bad = [];
  await w.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < 12; i++) {
    await w.keyboard.press("Tab");
    const r = await w.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const out = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0, sh = cs.boxShadow && cs.boxShadow !== "none", bd = e.matches("input,select,textarea"); return { vis: out || sh || bd, d: e.tagName.toLowerCase() + ' "' + (e.innerText || e.value || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 24) + '"' }; });
    if (r && !r.vis) bad.push(r.d);
  }
  return [...new Set(bad)].slice(0, 8);
}

async function auditAll(opt) {
  const { app, w, shotsDir, log } = opt, sizes = opt.sizes || SIZES, rows = [], keys = await w.locator("#nav button[data-k]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-k"), e.innerText.replace(/\s+/g, " ").trim()]));
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
  for (const sz of sizes) {
    await app.evaluate(({ BrowserWindow }, s) => { const win = BrowserWindow.getAllWindows()[0]; win.unmaximize(); win.setContentSize(s.w, s.h); }, sz);
    await w.waitForTimeout(500);
    for (const [k, label] of keys) {
      const row = { screen: k, label, size: sz.w + "x" + sz.h };
      try {
        await w.click('#nav button[data-k="' + k + '"]', { timeout: 8000 }); await w.waitForTimeout(450);
        row.vp = await w.evaluate(() => innerWidth + "x" + innerHeight);
        Object.assign(row, await w.evaluate(pageChecks)); row.noFocus = await focusCheck(w);
        if (shotsDir) { await w.evaluate(() => document.fonts && document.fonts.ready); await w.screenshot({ path: path.join(shotsDir, "ui-" + k + "-" + sz.w + "x" + sz.h + ".png") }).catch(() => {}); }
      } catch (e) { row.error = String(e.message).slice(0, 120); }
      rows.push(row); if (log) log(row);
    }
  }
  return { rows, keys };
}

/** Một số hộp thoại tiêu biểu ở từng cỡ: vừa khung nhìn, nút chính thấy ngay. opt.xlsxPath = file Excel giả để mở "xem trước nhập Excel". */
async function auditDialogs(opt) {
  const { app, w, shotsDir, log } = opt, sizes = opt.sizes || SIZES, rows = [];
  const DLGS = [
    { name: "Thêm nhân viên", open: async () => { await w.click('#nav button[data-k="nhansu"]'); await w.waitForTimeout(350); await w.locator('#main button:has-text("Thêm nhân viên")').first().click(); } },
    { name: "Xem trước nhập Excel", open: async () => { await w.click('#nav button[data-k="tiencom"]'); await w.waitForTimeout(350); const [fc] = await Promise.all([w.waitForEvent("filechooser"), w.locator('#main button:has-text("Nhập Excel")').first().click()]); await fc.setFiles(opt.xlsxPath); } },
    { name: "Danh mục: lịch sử/chi tiết", open: async () => { await w.click('#nav button[data-k="dm"]'); await w.waitForTimeout(350); await w.locator('#main button:has-text("Lịch sử")').first().click(); } }
  ];
  for (const sz of sizes) {
    await app.evaluate(({ BrowserWindow }, s2) => { const win = BrowserWindow.getAllWindows()[0]; win.unmaximize(); win.setContentSize(s2.w, s2.h); }, sz); await w.waitForTimeout(400);
    for (const dg of DLGS) {
      const row = { dialog: dg.name, size: sz.w + "x" + sz.h };
      try {
        await dg.open(); await w.waitForSelector(".dlg", { timeout: 8000 }); await w.waitForTimeout(350);
        Object.assign(row, await w.evaluate(dialogChecks) || { fits: false, primaryVisible: false, size: "không thấy hộp thoại" });
        if (shotsDir) await w.screenshot({ path: path.join(shotsDir, "ui-dlg-" + dg.name.replace(/[^A-Za-z0-9]+/g, "-") + "-" + sz.w + "x" + sz.h + ".png") }).catch(() => {});
        const close = w.locator('.dlg footer button:has-text("Hủy"), .dlg footer button:has-text("Đóng"), .dlg header button').first(); if (await close.count()) await close.click(); else await w.keyboard.press("Escape");
        await w.waitForTimeout(250);
      } catch (e) { row.error = String(e.message).slice(0, 120); }
      rows.push(row); if (log) log(row);
    }
  }
  return rows;
}
module.exports = { TOP_ONE_ROW, TOP_TWO_ROWS, INPUT_SCREENS, MIN_ROWS, auditDialogs, syntheticData, auditAll, pageChecks, dialogChecks, focusCheck, SIZES };
