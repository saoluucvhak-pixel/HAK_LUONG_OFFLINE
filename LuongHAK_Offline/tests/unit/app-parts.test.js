"use strict";
// app.js được ghép từ app-src/*.js (scripts/build-app.cjs). Test này bắt trường hợp sửa một bên mà quên bên kia.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { build, parts, outFile, srcDir } = require("../../scripts/build-app.cjs");

test("U-APP-PARTS-01 app.js khớp từng ký tự với app-src/ ghép theo thứ tự (chạy npm run build:app sau khi sửa app-src/)", () => {
  assert.equal(fs.readFileSync(outFile, "utf8"), build());
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
