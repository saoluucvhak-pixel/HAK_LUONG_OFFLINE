"use strict";
// 014 (issue #116): cổng gộp bằng máy + kiểm sau gộp. Chỉ test phần QUYẾT ĐỊNH thuần với dữ liệu giả; KHÔNG gọi mạng.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("node:path"), cp = require("node:child_process"), fs = require("node:fs");
const { evaluate } = require("../../../scripts/merge-gate.cjs"), { evaluateRelease } = require("../../../scripts/post-merge-check.cjs");
const SHA = "a".repeat(40), OLD = "b".repeat(40), HEAD_DATE = "2026-11-19T00:30:00Z", AFTER = "2026-11-19T00:40:00Z", BEFORE = "2026-11-19T00:20:00Z";
const { REQUIRED_JOBS, kindOf } = require("../../../scripts/merge-gate.cjs");
const green = () => REQUIRED_JOBS.map((name, i) => ({ id: 100 + i, name, status: "completed", conclusion: name === "publish-release" ? "skipped" : "success", completed_at: "2026-11-19T00:35:00Z" }));
const base = (over) => Object.assign({
  number: 7, pr: { state: "open", merged: false, head: { sha: SHA }, mergeable_state: "clean", labels: [] },
  files: ["LuongHAK_Offline/app-src/04-excel-nhap-lieu.js", "LuongHAK_Offline/app.js", "LuongHAK_Offline/package.json", "docs/CHANGELOG.md"],
  checkRuns: green(), headCommitDate: HEAD_DATE, tags: ["v2.0.42"], lockedPaths: ["LuongHAK_Offline/ui/filter-popover.js"],
  comments: [{ body: "[CEO_LUONG (thay thế) → STAFF_LUONG]\n/dong-y-gop #7 " + SHA, created_at: AFTER }, { body: "[STAFF_LUONG làm thay KCS]\n/da-kiem #7\n…", created_at: AFTER }],
  main: { version: "2.0.42" }, head: { version: "2.0.43", changelog: "## [2.0.43] — 19/11/2026\n", workspaceVersion: "V10.4 · v2.0.43", hasReleaseDoc: true }
}, over || {});
const failed = (r) => r.checks.filter((c) => !c.ok).map((c) => c.id);

test("U-GATE-01 đủ điều kiện (PR đổi mã, có /dong-y-gop đúng SHA, /da-kiem sau commit cuối, CI xanh, phiên bản đúng) → PASS", () => { const r = evaluate(base()); assert.equal(r.pass, true, JSON.stringify(r.checks.filter((c) => !c.ok))); assert.equal(r.productChange, true); });
test("U-GATE-02 thiếu /dong-y-gop → FAIL ở mục 3", () => { const r = evaluate(base({ comments: [{ body: "/da-kiem #7", created_at: AFTER }] })); assert.equal(r.pass, false); assert.deepEqual(failed(r), [3]); });
test("U-GATE-03 /dong-y-gop cho SHA CŨ → FAIL ở mục 3", () => { const r = evaluate(base({ comments: [{ body: "[CEO_LUONG (thay thế) → STAFF_LUONG]\n/dong-y-gop #7 " + OLD, created_at: AFTER }, { body: "/da-kiem #7", created_at: AFTER }] })); assert.deepEqual(failed(r), [3]); });
test("U-GATE-04 /dong-y-gop KHÔNG có nhãn '(thay thế)' → FAIL ở mục 3", () => { const r = evaluate(base({ comments: [{ body: "[CEO_LUONG → STAFF_LUONG]\n/dong-y-gop #7 " + SHA, created_at: AFTER }, { body: "/da-kiem #7", created_at: AFTER }] })); assert.deepEqual(failed(r), [3]); });
test("U-GATE-05 /dong-y-gop cho PR khác (#8) → FAIL ở mục 3", () => { const r = evaluate(base({ comments: [{ body: "[CEO_LUONG (thay thế) → STAFF_LUONG]\n/dong-y-gop #8 " + SHA, created_at: AFTER }, { body: "/da-kiem #7", created_at: AFTER }] })); assert.deepEqual(failed(r), [3]); });
test("U-GATE-06 thiếu /da-kiem, hoặc /da-kiem đăng TRƯỚC commit cuối → FAIL ở mục 4", () => {
  const ceo = { body: "[CEO_LUONG (thay thế) → STAFF_LUONG]\n/dong-y-gop #7 " + SHA, created_at: AFTER };
  assert.deepEqual(failed(evaluate(base({ comments: [ceo] }))), [4]);
  assert.deepEqual(failed(evaluate(base({ comments: [ceo, { body: "/da-kiem #7", created_at: BEFORE }] }))), [4]);
});
test("U-GATE-07 CI có job failure / đang chạy / chưa có check-run / job khác bỏ qua → FAIL ở mục 1", () => {
  assert.deepEqual(failed(evaluate(base({ checkRuns: green().concat([{ id: 900, name: "Build bộ cài Windows", status: "completed", conclusion: "failure", completed_at: "2026-11-19T00:36:00Z" }]) }))), [1]);
  assert.deepEqual(failed(evaluate(base({ checkRuns: green().concat([{ id: 901, name: "x", status: "in_progress", conclusion: null }]) }))), [1]);
  assert.deepEqual(failed(evaluate(base({ checkRuns: [] }))), [1]);
  assert.deepEqual(failed(evaluate(base({ checkRuns: green().concat([{ id: 902, name: "khác", status: "completed", conclusion: "skipped" }]) }))), [1], "chỉ publish-release được bỏ qua");
});
test("U-GATE-07b THIẾU job bắt buộc (workflow không kích hoạt đủ) → FAIL ở mục 1 và nêu tên job thiếu", () => {
  for (const miss of REQUIRED_JOBS) { const r = evaluate(base({ checkRuns: green().filter((x) => x.name !== miss) })); assert.deepEqual(failed(r), [1], miss); assert.ok(r.checks[0].msg.includes(miss), r.checks[0].msg); }
});
test("U-GATE-07c cùng tên nhiều lần chạy: lấy lần MỚI NHẤT — chạy lại xanh không bị lần cũ đỏ che; lần mới đỏ thì FAIL dù lần cũ xanh", () => {
  const old = { id: 50, name: "electron-e2e", status: "completed", conclusion: "failure", completed_at: "2026-11-19T00:10:00Z" };
  assert.equal(evaluate(base({ checkRuns: green().concat([old]) })).pass, true, "lần cũ đỏ, lần mới xanh → PASS");
  const bad = { id: 950, name: "electron-e2e", status: "completed", conclusion: "failure", completed_at: "2026-11-19T00:50:00Z" };
  assert.deepEqual(failed(evaluate(base({ checkRuns: green().concat([bad]) }))), [1], "lần mới đỏ → FAIL");
});
test("U-GATE-08 mergeable_state ≠ clean (dirty/behind/unstable) → FAIL ở mục 2", () => { for (const s of ["dirty", "behind", "unstable", "blocked"]) assert.deepEqual(failed(evaluate(base({ pr: Object.assign({}, base().pr, { mergeable_state: s }) }))), [2], s); });
test("U-GATE-09 nhãn ceo-yeu-cau-sua → FAIL ở mục 5", () => { assert.deepEqual(failed(evaluate(base({ pr: Object.assign({}, base().pr, { labels: [{ name: "ceo-yeu-cau-sua" }] }) }))), [5]); });
test("U-GATE-10 phiên bản không tăng / trùng tag / thiếu CHANGELOG / VERSION lệch / thiếu docs/releases → FAIL ở mục 6", () => {
  const h = (o) => Object.assign({}, base().head, o);
  assert.deepEqual(failed(evaluate(base({ head: h({ version: "2.0.42", changelog: "## [2.0.42]", workspaceVersion: "v2.0.42" }) }))), [6], "không tăng");
  assert.deepEqual(failed(evaluate(base({ tags: ["v2.0.43"] }))), [6], "trùng tag");
  assert.deepEqual(failed(evaluate(base({ head: h({ changelog: "## [2.0.42]" }) }))), [6], "thiếu CHANGELOG");
  assert.deepEqual(failed(evaluate(base({ head: h({ workspaceVersion: "V10.4 · v2.0.42" }) }))), [6], "VERSION lệch");
  assert.deepEqual(failed(evaluate(base({ head: h({ hasReleaseDoc: false }) }))), [6], "thiếu docs/releases");
});
test("U-GATE-11 sửa tệp thuộc mục 6 (workflow, khóa băm, core/importer.js, tệp khóa trong shared-modules.lock.json) → FAIL ở mục 7", () => {
  for (const f of [".github/workflows/luong-hak-v10-4-setup.yml", "scripts/check-consolidation.cjs", "shared-modules.lock.json", "LuongHAK_Offline/core/importer.js", "LuongHAK_Offline/engine.js", "LuongHAK_Offline/ui/filter-popover.js"]) {
    const r = evaluate(base({ files: base().files.concat([f]) })); assert.ok(failed(r).includes(7), f); assert.match(r.checks.find((c) => c.id === 7).msg, /hoi-chu-so-huu/);
  }
});
test("U-GATE-12 nhóm (c) PR chỉ docs/tests: không cần /dong-y-gop và không bắt buộc tăng phiên bản; vẫn cần CI xanh, clean, /da-kiem", () => {
  const docs = { files: ["docs/INPUT_FLOW_MAP.md", "LuongHAK_Offline/tests/unit/x.test.js", "README.md"], comments: [{ body: "/da-kiem #7", created_at: AFTER }], head: { version: "2.0.42", changelog: "", workspaceVersion: "", hasReleaseDoc: false } };
  const r = evaluate(base(docs)); assert.equal(r.pass, true, JSON.stringify(r.checks.filter((c) => !c.ok))); assert.equal(r.productChange, false); assert.equal(r.kind, "docs");
  assert.deepEqual(failed(evaluate(base(Object.assign({}, docs, { comments: [] })))), [4]);
});
test("U-GATE-12b nhóm (b) PR công cụ (chỉ scripts/x.cjs): cần /dong-y-gop nhưng BỎ QUA bước phiên bản (6 PASS dù không tăng version)", () => {
  const tool = { files: ["scripts/x.cjs", "docs/handoff/CONG_GOP.md", "LuongHAK_Offline/tests/unit/x.test.js"], head: { version: "2.0.42", changelog: "", workspaceVersion: "", hasReleaseDoc: false }, main: { version: "2.0.42" }, tags: ["v2.0.42"] };
  const ok = evaluate(base(tool)); assert.equal(ok.pass, true, JSON.stringify(ok.checks.filter((c) => !c.ok))); assert.equal(ok.kind, "tool"); assert.equal(ok.checks.find((c) => c.id === 6).ok, true);
  const noCeo = evaluate(base(Object.assign({}, tool, { comments: [{ body: "/da-kiem #7", created_at: AFTER }] }))); assert.deepEqual(failed(noCeo), [3], "công cụ vẫn cần /dong-y-gop");
});
test("U-GATE-12c phân loại tệp: product = dưới LuongHAK_Offline/ (trừ tests, *.md); tool = scripts/, ci/, tệp gốc khác; docs = docs/, tests/, *.md", () => {
  for (const [f, k] of [["LuongHAK_Offline/app.js", "product"], ["LuongHAK_Offline/core/validate.js", "product"], ["scripts/merge-gate.cjs", "tool"], ["ci/x.py", "tool"], ["package.json", "tool"], ["docs/A.md", "docs"], ["LuongHAK_Offline/tests/unit/a.test.js", "docs"], ["tests/x.cjs", "docs"], ["LuongHAK_Offline/README.md", "docs"]]) assert.equal(kindOf(f), k, f);
});
test("U-GATE-12d nhóm (a) mã sản phẩm vẫn cần CẢ /dong-y-gop và bước phiên bản", () => { const r = evaluate(base({ head: Object.assign({}, base().head, { version: "2.0.42" }) })); assert.deepEqual(failed(r), [6]); assert.equal(r.kind, "product"); });
test("U-GATE-12e /dong-y-gop có SHA trong dấu backtick hoặc nháy → PASS; thiếu SHA → FAIL", () => {
  const mk = (sha) => [{ body: "[CEO_LUONG (thay thế) → STAFF_LUONG]\n/dong-y-gop #7 " + sha, created_at: AFTER }, { body: "/da-kiem #7", created_at: AFTER }];
  for (const w of ["`" + SHA + "`", "'" + SHA + "'", SHA]) assert.equal(evaluate(base({ comments: mk(w) })).pass, true, w);
  assert.deepEqual(failed(evaluate(base({ comments: mk("`" + SHA.slice(0, 39) + "`") }))), [3], "SHA thiếu ký tự");
});
test("U-GATE-13 PR đã đóng/gộp → FAIL; head.sha không phải 40 ký tự → FAIL ở mục 1", () => {
  assert.ok(failed(evaluate(base({ pr: Object.assign({}, base().pr, { state: "closed", merged: true }) }))).includes(0));
  assert.ok(failed(evaluate(base({ pr: Object.assign({}, base().pr, { head: { sha: "abc123" } }) }))).includes(1));
});
test("U-GATE-15 --merge: PUT lỗi (405) → in NGUYÊN message, thoát 1, KHÔNG đọc lại PR; --json in kết quả máy đọc được (gh giả bằng Node qua HAK_GH_JS — chạy được cả Windows, không mạng)", () => {
  const os = require("node:os"), dir = fs.mkdtempSync(path.join(os.tmpdir(), "hak-fakegh-")), log = path.join(dir, "calls.log"), fake = path.join(dir, "gh-gia.js");
  const pr = { number: 7, state: "open", merged: false, head: { sha: SHA }, base: { ref: "main" }, mergeable_state: "clean", labels: [] };
  fs.writeFileSync(fake, [
    "const fs = require('node:fs'), a = process.argv.slice(2).join(' '); fs.appendFileSync(" + JSON.stringify(log) + ", a + '\\n');",
    "const out = (x) => console.log(JSON.stringify(x));",
    "if (/-X PUT/.test(a)) { out({ message: 'Pull Request is not mergeable' }); process.exit(1); }",
    "if (/pulls\\/7\\/files/.test(a)) out([[{ filename: 'docs/a.md' }]]);",
    "else if (/check-runs/.test(a)) out([{ check_runs: " + JSON.stringify(green()) + " }]);",
    "else if (/issues\\/7\\/comments/.test(a)) out([[{ body: '/da-kiem #7', created_at: " + JSON.stringify(AFTER) + " }]]);",
    "else if (/\\/commits\\//.test(a)) out({ commit: { committer: { date: " + JSON.stringify(HEAD_DATE) + " } } });",
    "else if (/\\/tags/.test(a)) out([[]]);",
    "else if (/\\/contents\\//.test(a)) out({});",
    "else if (/pulls\\/7$/.test(a.split(' ').pop())) out(" + JSON.stringify(pr) + ");",
    "else out({});"
  ].join("\n"));
  const r = cp.spawnSync(process.execPath, [path.resolve(__dirname, "../../../scripts/merge-gate.cjs"), "7", "--merge", "--json"], { encoding: "utf8", env: Object.assign({}, process.env, { HAK_GH_JS: fake }) });
  assert.equal(r.status, 1, r.stdout + r.stderr); const out = JSON.parse(r.stdout.trim().split("\n").pop()); assert.equal(out.pass, true, JSON.stringify(out.checks.filter((c) => !c.ok))); assert.equal(out.merged, false); assert.equal(out.error, "Pull Request is not mergeable");
  const calls = fs.readFileSync(log, "utf8").split("\n").filter(Boolean), iPut = calls.findIndex((l) => /-X PUT/.test(l)); assert.ok(iPut >= 0, "đã gọi PUT");
  assert.equal(calls.slice(iPut + 1).length, 0, "không có lệnh nào sau PUT lỗi (không đọc lại PR)");
});
test("U-GATE-14 script KHÔNG gọi mạng khi được require; chạy không đối số thoát 2 và không in token", () => {
  const r = cp.spawnSync(process.execPath, [path.resolve(__dirname, "../../../scripts/merge-gate.cjs")], { encoding: "utf8", env: Object.assign({}, process.env, { GH_TOKEN: "tok-bi-mat-123", GITHUB_TOKEN: "tok-bi-mat-123" }) });
  assert.equal(r.status, 2); assert.doesNotMatch(r.stdout + r.stderr, /tok-bi-mat-123/);
  const src = fs.readFileSync(path.resolve(__dirname, "../../../scripts/merge-gate.cjs"), "utf8"); assert.doesNotMatch(src, /--force|graphql/i, "không dùng --force / GraphQL");
});

// ---- 014-B: bước 8 "đổi xuống dòng" (issue #116, CEO /giao 014-B) ----
const stat = (o) => Object.assign({ filename: "LuongHAK_Offline/package-lock.json", status: "modified", additions: 2, deletions: 2 }, o);
test("U-GATE-16 viết lại CẢ tệp (additions = deletions = tổng số dòng tệp) → FAIL ở mục 8 kèm gợi ý bump-version/khôi phục kiểu xuống dòng", () => {
  const r = evaluate(base({ fileStats: [stat({ additions: 4948, deletions: 4948, headLines: 4948 }), stat({ filename: "LuongHAK_Offline/ui/workspace-v104.js", additions: 133, deletions: 133, headLines: 133 })] }));
  assert.deepEqual(failed(r), [8]); const m = r.checks.find((c) => c.id === 8).msg;
  assert.match(m, /package-lock\.json/); assert.match(m, /workspace-v104\.js/); assert.match(m, /bump-version\.cjs/); assert.match(m, /xuống dòng/);
});
test("U-GATE-17 đổi 2 dòng thật (kể cả tệp lớn) → PASS mục 8; không có fileStats → PASS (không thể kiểm)", () => {
  assert.equal(failed(evaluate(base({ fileStats: [stat({ additions: 2, deletions: 2, headLines: 4948 })] }))).includes(8), false);
  assert.equal(failed(evaluate(base())).includes(8), false);
  assert.equal(failed(evaluate(base({ fileStats: [stat({ additions: 30, deletions: 30, headLines: 4948 })] }))).includes(8), false, "đổi 30 dòng trong tệp 4948 dòng là thay đổi thật");
});
test("U-GATE-18 có patch: các dòng chỉ khác CR (CRLF→LF) chiếm gần hết → FAIL mục 8; patch đổi thật → PASS", () => {
  const crOnly = []; for (let i = 0; i < 40; i++) crOnly.push("-dòng " + i + "\r", "+dòng " + i); crOnly.push("-version 2.0.43\r", "+version 2.0.44");
  assert.deepEqual(failed(evaluate(base({ fileStats: [stat({ additions: 41, deletions: 41, patch: "@@ -1,41 +1,41 @@\n" + crOnly.join("\n") })] }))), [8]);
  const real = []; for (let i = 0; i < 40; i++) real.push("-dòng " + i, "+dòng mới " + i);
  assert.equal(failed(evaluate(base({ fileStats: [stat({ additions: 40, deletions: 40, patch: "@@ -1,40 +1,40 @@\n" + real.join("\n") })] }))).includes(8), false);
});
test("U-GATE-19 tệp mới thêm / xóa cả tệp không bị coi là 'viết lại'; tệp nhỏ (< 20 dòng) bỏ qua", () => {
  assert.equal(failed(evaluate(base({ fileStats: [stat({ status: "added", additions: 300, deletions: 0, headLines: 300 }), stat({ filename: "a.js", status: "modified", additions: 10, deletions: 10, headLines: 10 })] }))).includes(8), false);
});

// ---- post-merge-check ----
const REL = (over) => Object.assign({ version: "2.0.43", tagCommit: SHA, mainCommit: SHA, checkRuns: green(), release: { prerelease: true, draft: false, assets: [{ name: "TinhLuongHAK-V10.4-Setup-2.0.43.exe" }, { name: "SHA256SUMS.txt" }, { name: "BUILD_INFO.json" }] },
  sumsText: "c0ffee" + "0".repeat(58) + "  TinhLuongHAK-V10.4-Setup-2.0.43.exe\n", exeSha256: "c0ffee" + "0".repeat(58), buildInfo: { commit: SHA } }, over || {});
test("U-REL-01 bản phát hành đủ: tag = main, CI xanh, đủ 3 tệp, băm khớp, BUILD_INFO = tag, Pre-release → PASS", () => { const r = evaluateRelease(REL()); assert.equal(r.pass, true, JSON.stringify(r.checks.filter((c) => !c.ok))); });
test("U-REL-02 từng lỗi cho đúng mục: không tag, tag ≠ main, CI đỏ, thiếu .exe, băm lệch, BUILD_INFO lệch, nhãn Latest", () => {
  const f = (o) => evaluateRelease(REL(o)).checks.filter((c) => !c.ok).map((c) => c.id);
  assert.ok(f({ tagCommit: "" }).includes(1)); assert.deepEqual(f({ mainCommit: OLD }), [2]);
  assert.deepEqual(f({ checkRuns: green().concat([{ name: "Build bộ cài Windows", status: "completed", conclusion: "failure" }]) }), [3]);
  assert.deepEqual(f({ release: { prerelease: true, assets: [{ name: "SHA256SUMS.txt" }, { name: "BUILD_INFO.json" }] }, exeSha256: "" }).slice(0, 1), [4]);
  assert.deepEqual(f({ exeSha256: "d".repeat(64) }), [5]); assert.deepEqual(f({ buildInfo: { commit: OLD } }), [6]); assert.deepEqual(f({ release: Object.assign({}, REL().release, { prerelease: false }) }), [7]);
});
