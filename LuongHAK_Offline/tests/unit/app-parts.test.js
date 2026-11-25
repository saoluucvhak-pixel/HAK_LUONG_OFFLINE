"use strict";
// app.js được ghép từ app-src/*.js (scripts/build-app.cjs). Test này bắt trường hợp sửa một bên mà quên bên kia.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { build, parts, outFile, srcDir, normalizeEol, matches } = require("../../scripts/build-app.cjs");

test("U-APP-PARTS-01 app.js khớp từng ký tự với app-src/ ghép theo thứ tự (chạy npm run build:app sau khi sửa app-src/)", () => {
  assert.ok(matches(fs.readFileSync(outFile, "utf8"), build()), "app.js không khớp app-src/ (so sau khi chuẩn hóa xuống dòng)");
});
test("U-APP-PARTS-02 mỗi file trong app-src/ kết thúc bằng xuống dòng và không rỗng, để điểm ghép luôn nằm giữa hai câu lệnh", () => {
  for (const f of parts()) {
    const text = fs.readFileSync(path.join(srcDir, f), "utf8");
    assert.ok(text.length > 0, f + " rỗng");
    assert.ok(text.endsWith("\n"), f + " phải kết thúc bằng xuống dòng");
  }
});
test("U-APP-PARTS-03 app-src/ không đi vào bộ cài (chỉ app.js đã ghép được đóng gói)", () => {
  const files = require("../../package.json").build.files;
  assert.ok(files.includes("app.js"));
  assert.ok(!files.some(f => /app-src/.test(f)));
});

test("U-APP-PARTS-04 build:app --check đúng trên cả Linux (LF) và Windows (CRLF): khác kiểu xuống dòng không bị coi là lệch, khác nội dung vẫn bị bắt", () => {
  const os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
  const crlf = (text) => text.replace(/\r?\n/g, "\r\n");
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "app-src-crlf-"));
  const dir = path.join(fixture, "app-src");
  fs.mkdirSync(dir);
  fs.mkdirSync(path.join(dir, "screens"));
  for (const f of parts()) fs.writeFileSync(path.join(dir, f), crlf(fs.readFileSync(path.join(srcDir, f), "utf8")));
  for (const f of fs.readdirSync(path.join(srcDir, "screens"))) fs.writeFileSync(path.join(dir, "screens", f), crlf(fs.readFileSync(path.join(srcDir, "screens", f), "utf8")));
  const fromCrlf = build(dir), lf = fs.readFileSync(outFile, "utf8");
  assert.ok(fromCrlf.includes("\r\n"), "bản dựng từ nguồn CRLF có CRLF");
  assert.ok(matches(lf, fromCrlf), "app.js LF khớp nguồn CRLF");
  assert.ok(matches(crlf(lf), build()), "app.js CRLF khớp nguồn LF");
  assert.ok(matches(crlf(lf), fromCrlf), "app.js CRLF khớp nguồn CRLF");
  assert.equal(normalizeEol(fromCrlf), normalizeEol(lf));
  assert.ok(!matches(lf + "x", build()), "khác nội dung vẫn bị bắt");
  // Thử CLI trong thư mục riêng vì các test khác đọc app.js gốc song song.
  const cli = path.join(fixture, "scripts", "build-app.cjs"), generated = path.join(fixture, "app.js");
  fs.mkdirSync(path.dirname(cli));
  fs.copyFileSync(path.join(__dirname, "../../scripts/build-app.cjs"), cli);
  try {
    fs.writeFileSync(generated, crlf(lf));
    const ok = cp.spawnSync(process.execPath, [cli, "--check"], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    fs.writeFileSync(generated, lf + "// lệch\n");
    assert.equal(cp.spawnSync(process.execPath, [cli, "--check"], { encoding: "utf8" }).status, 1);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
