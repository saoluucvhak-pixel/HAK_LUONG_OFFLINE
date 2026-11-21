"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const VAL = require("../../core/validate.js");

function loadAppHelpers() {
  const code = fs.readFileSync(path.join(__dirname, "../../ui/app-helpers.js"), "utf8");
  const win = { HAKCore: { validate: VAL, lf: { isoDay: (s) => s || "" }, periodReports: { addTotal: () => {} } } };
  const ctx = {
    window: win,
    Date,
    String,
    Number,
    RegExp,
    Math,
    isNaN,
  };
  vm.runInNewContext(code, ctx, { filename: "ui/app-helpers.js" });
  return win.HAKAppHelpers;
}

const EXPECTED_MSG = "nhập ngày dạng dd/MM/yyyy, ví dụ 15/09/2026 (năm 4 chữ số)";

test("T-22: normCell báo lỗi ngày theo định dạng dd/MM/yyyy (ví dụ 15/09/2026), không nêu ISO", () => {
  const res = VAL.normCell("Ngày sinh", "31/02/2026");
  assert.ok(res.error, "phải trả về error cho 31/02/2026");
  assert.ok(res.error.includes(EXPECTED_MSG), `error nhận được: ${res.error}`);
  assert.equal(res.error.includes("2026-09-15"), false, "không được nêu ví dụ ISO 2026-09-15");
});

test("T-22: normCell giữ nguyên các dạng ngày hợp lệ hiện có", () => {
  assert.equal(VAL.normCell("Ngày sinh", "15/09/2026").value, "2026-09-15");
  assert.equal(VAL.normCell("Ngày sinh", "2026-09-15").value, "2026-09-15");
  assert.equal(VAL.normCell("Ngày sinh", "15092026").value, "2026-09-15");
  assert.equal(VAL.normCell("Ngày sinh", "15-9-2026").value, "2026-09-15");
});

test("T-22: app-helpers dateFix đặt title lỗi theo định dạng dd/MM/yyyy, ví dụ 15/09/2026", () => {
  const HA = loadAppHelpers();
  const classes = new Set();
  const attrs = {};
  const inp = {
    value: "31/02/2026",
    title: "",
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
    },
    setAttribute: (k, v) => { attrs[k] = v; },
    removeAttribute: (k) => { delete attrs[k]; },
    getAttribute: (k) => attrs[k] || null,
  };
  HA.dateFix(inp);
  assert.equal(classes.has("invalid"), true);
  assert.equal(attrs["aria-invalid"], "true");
  assert.ok(inp.title.includes(EXPECTED_MSG), `title nhận được: ${inp.title}`);
});
