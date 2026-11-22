"use strict";
// v2.0.98 (PROMPT 3): bảng ảo hóa ui/virtual-table.js — phần tính cửa sổ + dựng thật bằng jsdom.
const test = require("node:test"), assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const VT = require("../../ui/virtual-table.js");

test("I-VT-01 windowRange: đầu bảng, giữa, cuối; đệm trên + dưới + dòng dựng = đúng tổng chiều cao", () => {
  const H = 28, total = 5000;
  for (const top of [0, 1, 27, 28, 5000, 70000, 139000, 5000 * H, 5000 * H + 999]) {
    const r = VT.windowRange(total, top, 600, H, 8);
    assert.ok(r.start >= 0 && r.end <= total && r.end > r.start, "cửa sổ hợp lệ ở " + top);
    assert.equal(r.padTop + (r.end - r.start) * H + r.padBottom, total * H, "tổng chiều cao khớp ở " + top);
  }
  const mid = VT.windowRange(total, 70000, 600, H, 8), first = Math.floor(70000 / H);
  assert.ok(mid.start <= first && mid.end >= first + Math.ceil(600 / H), "phủ kín vùng nhìn thấy");
  assert.ok(mid.end - mid.start <= 40, "chỉ dựng vài chục dòng, không phải 5.000");
});
test("I-VT-02 windowRange: bảng rỗng, 1 dòng, dữ liệu xấu không ném lỗi", () => {
  assert.deepEqual(VT.windowRange(0, 100, 600, 28, 8), { start: 0, end: 0, padTop: 0, padBottom: 0 });
  const one = VT.windowRange(1, 99999, 600, 28, 8); assert.equal(one.end - one.start, 1);
  const bad = VT.windowRange(10, NaN, undefined, 0, -1); assert.ok(bad.end > bad.start && bad.end <= 10);
});

function mount(n, opts) {
  const dom = new JSDOM("<!doctype html><div id=tw><table><thead><tr><th>#</th><th>Tên</th></tr></thead><tbody></tbody></table></div>");
  const d = dom.window.document, tw = d.getElementById("tw"), tb = d.querySelector("tbody");
  Object.defineProperty(tw, "clientHeight", { value: 560, configurable: true });
  const rows = Array.from({ length: n }, (_, i) => ({ i, ten: "NV" + i }));
  const renderRow = (r) => { const tr = d.createElement("tr"); tr.innerHTML = "<td>" + (r.i + 1) + "</td><td>" + r.ten + "</td>"; tr.dataset.i = r.i; return tr; };
  const vt = VT.attach(Object.assign({ scroller: tw, tbody: tb, rows, renderRow, cols: 2, rowHeight: 28 }, opts));
  const dataRows = () => [...tb.querySelectorAll("tr:not(.vt-pad)")];
  return { dom, tw, tb, vt, dataRows, rows };
}

test("I-VT-03 ≤ 150 dòng: dựng đủ, không đệm; 5.000 dòng: chỉ dựng vài chục dòng", () => {
  const small = mount(150); assert.equal(small.dataRows().length, 150); assert.equal(small.tb.querySelectorAll(".vt-pad").length, 0); assert.equal(small.vt.stats().virtual, false);
  const big = mount(5000);
  assert.ok(big.dataRows().length < 60, "dựng " + big.dataRows().length + " dòng"); assert.equal(big.vt.stats().virtual, true);
  assert.equal(big.tb.querySelectorAll(".vt-pad").length, 2);
});
test("I-VT-04 cuộn: dòng đúng vị trí, mọi dòng cuộn tới đều có mặt, bộ nhớ DOM không tăng theo vị trí cuộn", async () => {
  const m = mount(5000); let maxDom = 0;
  for (const top of [0, 28 * 1000, 28 * 2500, 28 * 4990 + 500]) {
    m.tw.scrollTop = top; m.vt.refresh();
    const ids = m.dataRows().map((r) => +r.dataset.i), at = Math.floor(top / 28);
    assert.ok(ids.includes(Math.min(at, 4999)), "dòng " + at + " phải có mặt khi cuộn tới " + top);
    assert.deepEqual(ids, ids.slice().sort((a, b) => a - b), "thứ tự dòng tăng dần");
    maxDom = Math.max(maxDom, m.tb.querySelectorAll("*").length);
  }
  assert.ok(maxDom < 60 * 3 + 10, "DOM tối đa " + maxDom + " phần tử (bảng đủ 5.000 dòng = 15.000)");
  const h = (e) => parseFloat(e.firstChild.style.height);
  const tops = m.tb.querySelector('[data-vt-pad="top"]'), bot = m.tb.querySelector('[data-vt-pad="bottom"]');
  assert.equal(h(tops) + m.dataRows().length * 28 + h(bot), 5000 * 28, "thanh cuộn: tổng chiều cao không đổi");
});
test("I-VT-05 beforeprint dựng đủ mọi dòng (bản in không thiếu dòng); afterprint ảo hóa lại", () => {
  const m = mount(1200), w = m.dom.window;
  assert.ok(m.dataRows().length < 100);
  w.dispatchEvent(new w.Event("beforeprint")); assert.equal(m.dataRows().length, 1200);
  w.dispatchEvent(new w.Event("afterprint")); assert.ok(m.dataRows().length < 100);
});
test("I-VT-06 dòng do renderRow của màn hình dựng: nội dung, thứ tự và sự kiện click giữ nguyên", () => {
  const dom = new JSDOM("<!doctype html><div id=tw><table><tbody></tbody></table></div>"), d = dom.window.document;
  const tw = d.getElementById("tw"), tb = d.querySelector("tbody"); Object.defineProperty(tw, "clientHeight", { value: 560 });
  let clicked = -1;
  const rows = Array.from({ length: 400 }, (_, i) => ({ i, ten: "NV" + i }));
  VT.attach({ scroller: tw, tbody: tb, rows, cols: 1, rowHeight: 28, renderRow: (r, idx) => {
    assert.equal(rows[idx], r, "index khớp mảng gốc");
    const tr = d.createElement("tr"); tr.className = "click"; tr.dataset.i = r.i; tr.textContent = r.ten;
    tr.addEventListener("click", () => { clicked = r.i; }); return tr; } });
  const trs = [...tb.querySelectorAll("tr.click")];
  assert.equal(trs[0].textContent, "NV0"); trs[3].dispatchEvent(new dom.window.Event("click")); assert.equal(clicked, 3);
});
test("I-VT-07 hiệu năng: 5.000 dòng × 22 cột dựng < 150 ms và ít hơn 2% số ô DOM của bảng đầy đủ", () => {
  const dom = new JSDOM("<!doctype html><div id=tw><table><tbody></tbody></table></div>"), d = dom.window.document;
  const tw = d.getElementById("tw"), tb = d.querySelector("tbody"); Object.defineProperty(tw, "clientHeight", { value: 560 });
  const rows = Array.from({ length: 5000 }, (_, i) => i), COLS = 22;
  const renderRow = (i) => { const tr = d.createElement("tr"); for (let c = 0; c < COLS; c++) { const td = d.createElement("td"); td.textContent = i + ":" + c; tr.appendChild(td); } return tr; };
  const t0 = process.hrtime.bigint(); const vt = VT.attach({ scroller: tw, tbody: tb, rows, cols: COLS, renderRow, rowHeight: 28 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6, cells = tb.querySelectorAll("td").length;
  assert.ok(ms < 150, "dựng mất " + ms.toFixed(1) + " ms"); assert.ok(cells < 0.02 * 5000 * COLS + 2 * 1, "ô DOM " + cells + " / " + 5000 * COLS);
  vt.destroy();
});
test("I-VT-08 cập nhật tăng dần: cuộn tiến/lùi/nhảy xa, dòng luôn liên tục, không trùng, không sót, giống hệt dựng mới", () => {
  const m = mount(3000); let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const steps = [0, 28, 280, 28 * 3, -50, 28 * 40, 28 * 400, -28 * 390, 28 * 2900, -28 * 2900, 28 * 1500, 1, 28 * 1500 + 5];
  for (let k = 0; k < 40; k++) steps.push(Math.round((rnd() - 0.5) * 28 * 800));
  let pos = 0;
  for (const d of steps) {
    pos = Math.max(0, Math.min(3000 * 28 - 560, pos + d)); m.tw.scrollTop = pos; m.vt.refresh();
    const ids = m.dataRows().map((r) => +r.dataset.i), at = Math.floor(pos / 28);
    for (let j = 1; j < ids.length; j++) assert.equal(ids[j], ids[j - 1] + 1, "liên tục ở " + pos);
    assert.ok(ids[0] <= at && ids[ids.length - 1] >= Math.min(2999, at + 19), "phủ vùng nhìn ở " + pos);
    const pads = m.tb.querySelectorAll(".vt-pad"); assert.equal(pads.length, 2);
    assert.equal(m.tb.firstElementChild.dataset.vtPad, "top"); assert.equal(m.tb.lastElementChild.dataset.vtPad, "bottom");
  }
});
test("I-VT-09 tích hợp: bảng lương dùng ui/virtual-table.js; index.html nạp module trước app.js; module nằm trong bộ cài (ui/**)", () => {
  const fs = require("node:fs"), path = require("node:path"), root = path.join(__dirname, "../..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8"), app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.ok(html.indexOf("ui/virtual-table.js") > 0 && html.indexOf("ui/virtual-table.js") < html.indexOf("app.js"), "nạp trước app.js");
  assert.match(app, /HAKUI\.virtualTable/); assert.match(app, /VT\.attach\(\{ scroller: tw, tbody: tb, rows: r\.bangluong/);
  assert.ok(require(path.join(root, "package.json")).build.files.includes("ui/**"));
  assert.match(app, /Bấm vào một dòng để xem chi tiết/, "giữ nguyên lời hướng dẫn và dòng bấm mở phiếu (slipDialog)");
});
