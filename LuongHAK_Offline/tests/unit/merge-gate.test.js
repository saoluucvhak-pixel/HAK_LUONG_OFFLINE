"use strict";
// 014 (issue #116): cổng gộp bằng máy + kiểm sau gộp. Chỉ test phần QUYẾT ĐỊNH thuần với dữ liệu giả; KHÔNG gọi mạng.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("node:path"), cp = require("node:child_process"), fs = require("node:fs");
const { evaluate } = require("../../../scripts/merge-gate.cjs"), { evaluateRelease } = require("../../../scripts/post-merge-check.cjs");
const SHA = "a".repeat(40), OLD = "b".repeat(40), HEAD_DATE = "2026-11-19T00:30:00Z", AFTER = "2026-11-19T00:40:00Z", BEFORE = "2026-11-19T00:20:00Z";
const green = () => [{ name: "build", status: "completed", conclusion: "success" }, { name: "electron-e2e", status: "completed", conclusion: "success" }, { name: "publish-release", status: "completed", conclusion: "skipped" }];
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
test("U-GATE-07 CI có job failure / đang chạy / chưa có check-run → FAIL ở mục 1", () => {
  assert.deepEqual(failed(evaluate(base({ checkRuns: green().concat([{ name: "Build bộ cài Windows", status: "completed", conclusion: "failure" }]) }))), [1]);
  assert.deepEqual(failed(evaluate(base({ checkRuns: green().concat([{ name: "x", status: "in_progress", conclusion: null }]) }))), [1]);
  assert.deepEqual(failed(evaluate(base({ checkRuns: [] }))), [1]);
  assert.deepEqual(failed(evaluate(base({ checkRuns: green().concat([{ name: "khác", status: "completed", conclusion: "skipped" }]) }))), [1], "chỉ publish-release được bỏ qua");
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
test("U-GATE-12 PR chỉ docs/tests: không cần /dong-y-gop và không bắt buộc tăng phiên bản; vẫn cần CI xanh, clean, /da-kiem", () => {
  const docs = { files: ["docs/INPUT_FLOW_MAP.md", "LuongHAK_Offline/tests/unit/x.test.js", "README.md"], comments: [{ body: "/da-kiem #7", created_at: AFTER }], head: { version: "2.0.42", changelog: "", workspaceVersion: "", hasReleaseDoc: false } };
  const r = evaluate(base(docs)); assert.equal(r.pass, true, JSON.stringify(r.checks.filter((c) => !c.ok))); assert.equal(r.productChange, false);
  assert.deepEqual(failed(evaluate(base(Object.assign({}, docs, { comments: [] })))), [4]);
});
test("U-GATE-13 PR đã đóng/gộp → FAIL; head.sha không phải 40 ký tự → FAIL ở mục 1", () => {
  assert.ok(failed(evaluate(base({ pr: Object.assign({}, base().pr, { state: "closed", merged: true }) }))).includes(0));
  assert.ok(failed(evaluate(base({ pr: Object.assign({}, base().pr, { head: { sha: "abc123" } }) }))).includes(1));
});
test("U-GATE-14 script KHÔNG gọi mạng khi được require; chạy không đối số thoát 2 và không in token", () => {
  const r = cp.spawnSync(process.execPath, [path.resolve(__dirname, "../../../scripts/merge-gate.cjs")], { encoding: "utf8", env: Object.assign({}, process.env, { GH_TOKEN: "tok-bi-mat-123", GITHUB_TOKEN: "tok-bi-mat-123" }) });
  assert.equal(r.status, 2); assert.doesNotMatch(r.stdout + r.stderr, /tok-bi-mat-123/);
  const src = fs.readFileSync(path.resolve(__dirname, "../../../scripts/merge-gate.cjs"), "utf8"); assert.doesNotMatch(src, /--force|graphql/i, "không dùng --force / GraphQL");
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
