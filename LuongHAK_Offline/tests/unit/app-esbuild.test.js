"use strict";
// v2.0.97 (PROMPT 2, giai đoạn A): esbuild cục bộ phân tích app.js; sourcemap trỏ về app-src/. app.js KHÔNG đổi (U-APP-PARTS-01 vẫn bắt buộc khớp từng ký tự).
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { build, segments, sourceMap, verify, outFile, srcDir, normalizeEol } = require("../../scripts/build-app.cjs");

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function decodeVlq(str) { const out = []; let shift = 0, value = 0; for (const ch of str) { const d = B64.indexOf(ch); value += (d & 31) << shift; if (d & 32) { shift += 5; continue; } out.push(value & 1 ? -(value >> 1) : value >> 1); shift = 0; value = 0; } return out; }
/** Giải mã mức dòng: trả [{ src, line }] cho từng dòng của app.js. */
function decodeLines(map) { let src = 0, line = 0; return map.mappings.split(";").map((seg) => { const [, ds, dl] = decodeVlq(seg); src += ds; line += dl; return { src: map.sources[src], line }; }); }

test("U-APP-ESB-01 các đoạn ghép nối lại đúng bằng build(): app.js không đổi một ký tự so với trước khi có esbuild", () => {
  assert.equal(segments().map((s) => s.text).join(""), build());
});
test("U-APP-ESB-02 esbuild cục bộ (không mạng) đọc được app.js và báo kích thước; cú pháp sai thì ném lỗi", () => {
  const v = verify(fs.readFileSync(outFile, "utf8"));
  assert.ok(v.chars > 500000 && v.minChars < v.chars && /^\d+\.\d+\.\d+$/.test(v.esbuild));
  assert.throws(() => verify("(function () { var x = ; })();"), /Expected|Unexpected|error/i);
});
test("U-APP-ESB-03 ghép 31 file + màn hình không chậm bất thường (đo thật ≈ 20 ms, mục tiêu PROMPT 2 < 200 ms; ngưỡng 1,5 s lấy trung vị để máy CI chậm không làm đỏ ngẫu nhiên)", () => {
  build(); const runs = [];
  for (let i = 0; i < 7; i++) { const t0 = process.hrtime.bigint(); build(); runs.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  runs.sort((a, b) => a - b); const ms = runs[3]; // trung vị
  assert.ok(ms < 1500, "ghép mất " + ms.toFixed(1) + " ms (trung vị)");
});
test("U-APP-ESB-04 sourcemap: mỗi dòng app.js trỏ đúng dòng trong file nguồn (đầu, cuối, và màn hình chèn từ screens/)", () => {
  const map = sourceMap(), lines = decodeLines(map), text = normalizeEol(fs.readFileSync(outFile, "utf8")), appLines = text.split("\n");
  if (appLines[appLines.length - 1] === "") appLines.pop();
  assert.equal(map.version, 3); assert.equal(lines.length, appLines.length, "số dòng ánh xạ = số dòng app.js");
  const readLine = (file, n) => normalizeEol(fs.readFileSync(path.join(srcDir, file), "utf8")).split("\n")[n];
  // đối chiếu NỘI DUNG từng dòng với dòng nguồn mà bản đồ trỏ tới: kiểm hết, không chọn mẫu
  const cache = new Map();
  lines.forEach((m, i) => {
    if (!cache.has(m.src)) cache.set(m.src, normalizeEol(fs.readFileSync(path.join(srcDir, m.src), "utf8")).split("\n"));
    assert.equal(cache.get(m.src)[m.line], appLines[i], "dòng " + (i + 1) + " của app.js không khớp " + m.src + ":" + (m.line + 1));
  });
  assert.equal(lines[0].src, "00-mo-dau-dinh-nghia-bang.js");
  const iLuong = appLines.findIndex((l) => l.startsWith("  function tabLuong("));
  assert.ok(iLuong > 0); assert.equal(lines[iLuong].src, "screens/tabLuong.js"); assert.equal(lines[iLuong].line, 0);
  assert.ok(readLine("screens/tabLuong.js", 0).startsWith("  function tabLuong("));
});
test("U-APP-ESB-05 app.js.map không được commit và không vào bộ cài", () => {
  const files = require("../../package.json").build.files;
  assert.ok(!files.some((f) => /\.map/.test(f)));
  assert.match(fs.readFileSync(path.join(__dirname, "../../../.gitignore"), "utf8"), /app\.js\.map/);
});
