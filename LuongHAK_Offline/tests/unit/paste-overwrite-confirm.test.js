"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const srcPath = path.join(__dirname, "../../app-src/07-bang-nhap-lieu.js");
const src = fs.readFileSync(srcPath, "utf8");

test("P2.2 T-08: paste nhiều dòng phải đếm overwriteCount/addCount, hỏi confirm khi đè >= 1 dòng và gói trong txn", () => {
  const pasteIdx = src.indexOf('addEventListener("paste"');
  assert.ok(pasteIdx >= 0, "Phải tìm thấy handler paste trong 07-bang-nhap-lieu.js");
  const block = src.slice(pasteIdx, pasteIdx + 2800);

  assert.match(block, /overwriteCount/, "Phải tính overwriteCount trước khi dán");
  assert.match(block, /addCount/, "Phải tính addCount trước khi dán");
  assert.match(block, /if\s*\(\s*overwriteCount\s*>=\s*1\s*\)\s*\{?[\s\S]*confirm\(/, "Phải hỏi confirm khi overwriteCount >= 1");
  assert.match(block, /txn\s*\(\s*\[\s*key\s*\]/, "Phải gói thao tác dán (REPO.apply) trong txn([key], ...)");
  assert.match(block, /đè\s*"/, "Toast sau dán phải nêu số dòng đè");
  assert.match(block, /thêm\s*"/, "Toast sau dán phải nêu số dòng thêm");
});
