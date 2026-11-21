// P3.2 / T-25: Tiêu đề cột bảng (th) và chữ gợi ý (.hint) đạt tương phản WCAG AA >= 4.5:1 ở cả sáng/tối và classic/luxe.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CSS = fs.readFileSync(path.join(__dirname, "../../style.css"), "utf8");

function parseHex(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLum([r, g, b]) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(rgb1, rgb2) {
  const l1 = relLum(rgb1), l2 = relLum(rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function extractVars(selector) {
  const idx = CSS.indexOf(selector + "{");
  assert.ok(idx >= 0, "Không tìm thấy block " + selector);
  const end = CSS.indexOf("}", idx);
  const block = CSS.slice(idx, end);
  const vars = {};
  for (const m of block.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}\n]+)/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}
function resolveColor(expr, vars) {
  const v = expr.trim();
  if (v.startsWith("#")) return parseHex(v);
  const mVar = v.match(/^var\((--[a-zA-Z0-9_-]+)\)$/);
  if (mVar) return resolveColor(vars[mVar[1]], vars);
  const mMix = v.match(/^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*(.+?)\s*\)$/i);
  if (mMix) {
    const c1 = resolveColor(mMix[1], vars);
    const p1 = Number(mMix[2]) / 100;
    const c2 = resolveColor(mMix[3], vars);
    return [0, 1, 2].map((i) => Math.round(c1[i] * p1 + c2[i] * (1 - p1)));
  }
  throw new Error("Không giải được màu: " + expr);
}
function lastRuleProp(selectorRegex, prop) {
  let val = null;
  for (const m of CSS.matchAll(selectorRegex)) {
    const pm = m[1].match(new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;}\\n]+)", "i"));
    if (pm) val = pm[1].trim();
  }
  return val;
}

const base = extractVars(":root");
const dark = Object.assign({}, base, extractVars('[data-theme="dark"]'));
const luxe = Object.assign({}, base, extractVars('[data-skin="luxe"]'));
const luxeDark = Object.assign({}, luxe, extractVars('[data-skin="luxe"][data-theme="dark"]'));
const THEMES = [
  ["classic light", base],
  ["classic dark", dark],
  ["luxe light", luxe],
  ["luxe dark", luxeDark]
];

test("T-25.1 th (tiêu đề cột bảng) đạt tương phản AA >= 4.5:1 trên nền --th ở mọi giao diện", () => {
  const thColor = lastRuleProp(/(?:^|\n)th\s*\{([^}]*)\}/g, "color");
  assert.ok(thColor, "Không tìm thấy color của th trong style.css");
  for (const [name, vars] of THEMES) {
    const fg = resolveColor(thColor, vars);
    const bg = resolveColor(vars["--th"], vars);
    const cr = contrast(fg, bg);
    assert.ok(cr >= 4.5, `${name}: th color (${thColor}) trên --th (${vars["--th"]}) chỉ đạt ${cr.toFixed(2)}:1 (< 4.5:1)`);
  }
});

test("T-25.2 .hint đạt tương phản AA >= 4.5:1 trên nền --card và --bg ở mọi giao diện", () => {
  const hintColor = lastRuleProp(/(?:^|\n)\.hint\s*\{([^}]*)\}/g, "color");
  assert.ok(hintColor, "Không tìm thấy color của .hint trong style.css");
  for (const [name, vars] of THEMES) {
    const fg = resolveColor(hintColor, vars);
    for (const bgKey of ["--card", "--bg"]) {
      const bg = resolveColor(vars[bgKey], vars);
      const cr = contrast(fg, bg);
      assert.ok(cr >= 4.5, `${name}: .hint (${hintColor}) trên ${bgKey} (${vars[bgKey]}) chỉ đạt ${cr.toFixed(2)}:1 (< 4.5:1)`);
    }
  }
});
