"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PERM = require("../../core/permissions.js");

function makeEl(tag, attrs, children) {
  const el = {
    tagName: String(tag || "div").toUpperCase(),
    attrs: attrs || {},
    children: [],
    style: {},
    className: (attrs && attrs.class) || "",
    textContent: (attrs && attrs.text) || "",
    title: (attrs && attrs.title) || "",
    disabled: false,
    scrollTop: 0,
    scrollHeight: 0,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return el.attrs[k] || null; },
    addEventListener() {},
    appendChild(c) { if (c) el.children.push(c); return c; },
    insertBefore(c) { if (c) el.children.push(c); return c; },
    querySelector() { return null; },
  };
  (children || []).forEach((c) => { if (c) el.children.push(c); });
  return el;
}

function findButtons(root, out = []) {
  if (!root || typeof root !== "object") return out;
  if (root.tagName === "BUTTON") out.push(root);
  (root.children || []).forEach((c) => findButtons(c, out));
  return out;
}

function runGridForRole(vaiTro) {
  const code = fs.readFileSync(path.join(__dirname, "../../app-src/07-bang-nhap-lieu.js"), "utf8");
  const session = { user: "u1", vaiTro };
  const ctx = {
    h: makeEl,
    btn: (text, cls, fn, title) => makeEl("button", { class: "b " + (cls || ""), text, title: title || "" }),
    can: (p) => PERM.can(session, p),
    need: (p) => PERM.can(session, p),
    st: { qs: {}, pg: {}, nam: 2026, thang: 9, cedit: {} },
    db: { nhanvien: [], tiencom: [], sl_chuyenky: [] },
    S: { tiencom: { ten: "Tiền cơm", kyCol: "Kỳ", cols: ["Kỳ", "Mã NV"], def: {} } },
    INPUT_FILTER: {},
    kyStr: () => "2026-09",
    kyChot: () => null,
    kyEndDay: () => "2026-09-30",
    qOf: () => "",
    catF: () => ({}),
    inputF: () => ({}),
    tenNV: () => "",
    fmt: (v) => String(v),
    slug: (s) => s,
    pager: () => ({ el: null, start: 0, end: 0 }),
    refreshNVList: () => {},
    updateNav: () => {},
    VAL: { normKy: (s) => s, normCell: (c, v) => ({ value: v }) },
    SFC: { isEmpty: () => true },
    sfUi: { mount: () => ({ el: makeEl("div"), cfg: { state: { get: () => ({}) } }, refresh() {} }) },
    C: {
      smartFilter: { mount: () => ({ el: makeEl("div"), cfg: { state: { get: () => ({}) } } }) },
      inputReview: { mode: () => "team" },
    },
    window: { HAKUi: {} },
    Object, Array, String, Number, Date, Math, RegExp,
  };
  vm.runInNewContext(code + "\nthis.__grid = grid;", ctx, { filename: "app-src/07-bang-nhap-lieu.js" });
  const wrap = ctx.__grid("tiencom", ctx.S.tiencom);
  return findButtons(wrap);
}

test("N-04: vai truongbophan có input.edit nhưng không có import/export", () => {
  const s = { user: "tbp", vaiTro: "truongbophan" };
  assert.equal(PERM.can(s, "input.edit"), true);
  assert.equal(PERM.can(s, "import"), false);
  assert.equal(PERM.can(s, "export"), false);
});

test("N-04: vai truongbophan không thấy nút Nhập Excel / Xuất Excel hoạt động", () => {
  const buttons = runGridForRole("truongbophan");
  const imp = buttons.find((b) => (b.textContent || "").includes("Nhập Excel"));
  const exp = buttons.find((b) => (b.textContent || "").includes("Xuất Excel"));
  if (imp) {
    assert.equal(imp.disabled, true, "Nút Nhập Excel phải bị vô hiệu hóa khi !can('import')");
    assert.ok(imp.title && imp.title.trim().length > 0, "Nút Nhập Excel bị vô hiệu hóa phải có tooltip");
  }
  if (exp) {
    assert.equal(exp.disabled, true, "Nút Xuất Excel phải bị vô hiệu hóa khi !can('export')");
    assert.ok(exp.title && exp.title.trim().length > 0, "Nút Xuất Excel bị vô hiệu hóa phải có tooltip");
  }
});

test("N-04: vai admin (có import & export) thấy nút Nhập Excel và Xuất Excel hoạt động bình thường", () => {
  const buttons = runGridForRole("admin");
  const imp = buttons.find((b) => (b.textContent || "").includes("Nhập Excel"));
  const exp = buttons.find((b) => (b.textContent || "").includes("Xuất Excel"));
  assert.ok(imp, "Admin phải thấy nút Nhập Excel");
  assert.equal(imp.disabled, false);
  assert.ok(exp, "Admin phải thấy nút Xuất Excel");
  assert.equal(exp.disabled, false);
});
