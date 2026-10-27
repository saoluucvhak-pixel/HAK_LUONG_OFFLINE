"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { JSDOM } = require("jsdom");
const source = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
test("Form keeps draft after drag-selection releases on backdrop; explicit close still works", () => {
  const dom = new JSDOM('<div id="modal"></div>', { runScripts: "outside-only" }), w = dom.window, d = w.document;
  const root = d.querySelector("#modal");
  // Previous dialog may have a handler: new form must clear it.
  root.onclick = () => { root.innerHTML = ""; };
  w.st = {}; w.$ = (s) => d.querySelector(s);
  w.h = (tag, attrs, kids) => {
    const el = d.createElement(tag); Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "text") el.textContent = v; else el.setAttribute(k, v); });
    (kids || []).filter(Boolean).forEach((n) => el.appendChild(n)); return el;
  };
  w.btn = (text, cls, fn) => { const b = d.createElement("button"); b.textContent = text; b.onclick = fn; return b; };
  w.eval(source.slice(source.indexOf("  function modal(title"), source.indexOf("  // Hộp nhập chữ của app")));
  const input = d.createElement("input"); input.value = "SYNTHETIC DRAFT";
  const close = w.modal("Thêm nhân viên mới", input);
  input.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true }));
  root.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
  root.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  assert.equal(root.contains(input), true); assert.equal(input.value, "SYNTHETIC DRAFT");
  root.click(); assert.equal(root.contains(input), true);
  d.querySelector("header button").click(); assert.equal(root.className, "hide"); assert.equal(root.children.length, 0);
  w.modal("Test", d.createElement("input")); close(); assert.equal(root.className, "hide");
  w.close();
});
