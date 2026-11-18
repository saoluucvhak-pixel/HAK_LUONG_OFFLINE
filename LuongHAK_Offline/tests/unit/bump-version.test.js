"use strict";
// 014-B (issue #116): scripts/bump-version.cjs đổi số phiên bản mà GIỮ NGUYÊN kiểu xuống dòng của từng tệp (CRLF/LF). Test thuần, cây tệp giả trong thư mục tạm; không mạng.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
const SCRIPT = path.resolve(__dirname, "../../../scripts/bump-version.cjs");
const eol = (t, e) => t.replace(/\n/g, e);
const PKG = '{\n  "name": "luong-hak",\n  "version": "2.0.44",\n  "main": "main.js"\n}\n';
const LOCK = '{\n  "name": "luong-hak",\n  "version": "2.0.44",\n  "lockfileVersion": 3,\n  "packages": {\n    "": {\n      "name": "luong-hak",\n      "version": "2.0.44"\n    },\n    "node_modules/x": {\n      "version": "2.0.44"\n    }\n  }\n}\n';
const WS = "(function () {\n  const VERSION = 'V10.4 · v2.0.44';\n  // phần khác không đổi\n  const OTHER = 'v2.0.44 cũ trong chuỗi khác';\n})();\n";
const CL = "# CHANGELOG\n\n> giới thiệu\n\n## [2.0.44] — 19/11/2026\n- bản trước\n\n## [2.0.43] — 18/11/2026\n- bản cũ\n";
function tree(eols) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hak-bump-")), put = (rel, text, e) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, eol(text, e)); };
  put("LuongHAK_Offline/package.json", PKG, eols.pkg); put("LuongHAK_Offline/package-lock.json", LOCK, eols.lock); put("LuongHAK_Offline/ui/workspace-v104.js", WS, eols.ws); put("docs/CHANGELOG.md", CL, eols.cl);
  return root;
}
const run = (root, ver, extra) => cp.spawnSync(process.execPath, [SCRIPT, ver, "--root", root, "--date", "20/11/2026"].concat(extra || []), { encoding: "utf8" });
const rd = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("U-BUMP-01 tệp CRLF vẫn CRLF, tệp LF vẫn LF; chỉ các dòng phiên bản đổi (package-lock 2 chỗ, workspace 1 chỗ)", () => {
  const root = tree({ pkg: "\n", lock: "\r\n", ws: "\r\n", cl: "\n" }), r = run(root, "2.0.45"); assert.equal(r.status, 0, r.stdout + r.stderr);
  const lock = rd(root, "LuongHAK_Offline/package-lock.json"), ws = rd(root, "LuongHAK_Offline/ui/workspace-v104.js"), pkg = rd(root, "LuongHAK_Offline/package.json");
  assert.equal(lock, eol(LOCK, "\r\n").replace('"version": "2.0.44"', '"version": "2.0.45"').replace('"version": "2.0.44"', '"version": "2.0.45"'), "chỉ 2 chỗ đầu đổi, node_modules/x giữ nguyên, vẫn CRLF");
  assert.equal(ws, eol(WS, "\r\n").replace("v2.0.44';", "v2.0.45';"), "chỉ VERSION đổi; chuỗi khác chứa 2.0.44 giữ nguyên; vẫn CRLF");
  assert.equal(pkg, PKG.replace('"version": "2.0.44"', '"version": "2.0.45"'), "package.json LF giữ LF");
  assert.equal((lock.match(/\r\n/g) || []).length, (eol(LOCK, "\r\n").match(/\r\n/g) || []).length, "số dòng CRLF không đổi");
  assert.equal(lock.replace(/\r\n/g, "").includes("\n"), false, "không có LF lẻ trong tệp CRLF");
});
test("U-BUMP-02 CHANGELOG: thêm khung mục mới ngay trước mục cũ nhất, đúng kiểu xuống dòng; tạo docs/releases/vX.Y.Z.md; ngày theo --date", () => {
  for (const e of ["\n", "\r\n"]) {
    const root = tree({ pkg: "\n", lock: "\n", ws: "\n", cl: e }); assert.equal(run(root, "2.0.45").status, 0);
    const cl = rd(root, "docs/CHANGELOG.md"); assert.ok(cl.includes("## [2.0.45] — 20/11/2026" + e), "có mục mới"); assert.ok(cl.indexOf("## [2.0.45]") < cl.indexOf("## [2.0.44]"), "mục mới ở trên");
    assert.equal(e === "\r\n" ? cl.replace(/\r\n/g, "").includes("\n") : cl.includes("\r"), false, "không lẫn kiểu xuống dòng");
    const rel = rd(root, "docs/releases/v2.0.45.md"); assert.match(rel, /v2\.0\.45/); assert.match(rel, /Tham chiếu đã đối chiếu/);
  }
});
test("U-BUMP-03 từ chối: số không hợp lệ, không lớn hơn bản hiện tại, hoặc tệp thiếu dòng phiên bản — KHÔNG ghi tệp nào", () => {
  const root = tree({ pkg: "\n", lock: "\n", ws: "\n", cl: "\n" }), snap = () => ["LuongHAK_Offline/package.json", "LuongHAK_Offline/package-lock.json", "LuongHAK_Offline/ui/workspace-v104.js", "docs/CHANGELOG.md"].map((f) => rd(root, f)).join("|");
  const before = snap();
  for (const v of ["abc", "2.0", "2.0.44", "2.0.43", "2.0.45.1"]) { const r = run(root, v); assert.notEqual(r.status, 0, v); assert.equal(snap(), before, "không ghi gì khi " + v); }
  fs.writeFileSync(path.join(root, "LuongHAK_Offline/ui/workspace-v104.js"), "khong co VERSION\n"); const b2 = snap(), r2 = run(root, "2.0.45"); assert.notEqual(r2.status, 0); assert.equal(snap(), b2, "thiếu VERSION → không ghi tệp nào (kể cả package.json)");
});
test("U-BUMP-04 chạy lại cùng số (đã bump) bị từ chối; --no-docs không đụng CHANGELOG/releases", () => {
  const root = tree({ pkg: "\n", lock: "\n", ws: "\n", cl: "\n" }); assert.equal(run(root, "2.0.45", ["--no-docs"]).status, 0);
  assert.equal(rd(root, "docs/CHANGELOG.md"), CL); assert.equal(fs.existsSync(path.join(root, "docs/releases/v2.0.45.md")), false);
  assert.notEqual(run(root, "2.0.45", ["--no-docs"]).status, 0);
});
