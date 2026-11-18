#!/usr/bin/env node
"use strict";
// CỔNG GỘP BẰNG MÁY (handoff 014, issue #116): `node scripts/merge-gate.cjs <số PR> [--merge]`
// In PASS/FAIL từng dòng; MẶC ĐỊNH KHÔNG GỘP; mã thoát ≠ 0 nếu có FAIL. Chỉ dùng REST qua `gh api`. Không lưu/in token.
// Có `--merge` và TẤT CẢ PASS → gộp squash với `sha` = head.sha, đọc lại PR và in merged:true + SHA commit trên main. Không có cờ ép gộp, không đổi nhãn bản phát hành.
const cp = require("node:child_process");
const REPO = process.env.HAK_REPO || "saoluucvhak-pixel/HAK_LUONG_OFFLINE";

// ---------- PHẦN QUYẾT ĐỊNH THUẦN (không gọi mạng; được test ở tests/unit/merge-gate.test.js) ----------
const SKIPPED_OK = { "publish-release": 1 };
const FORBIDDEN = [/^\.github\/workflows\//, /^scripts\/check-consolidation\.cjs$/, /^shared-modules\.lock\.json$/, /^LuongHAK_Offline\/core\/importer\.js$/, /^LuongHAK_Offline\/engine\.js$/, /^LuongHAK_Offline\/hr\.js$/, /^LuongHAK_Offline\/core\/integrity\.js$/, /^LuongHAK_Offline\/core\/production-alloc\.js$/];
const isDocOrTest = (f) => /^docs\//.test(f) || /\.md$/i.test(f) || /^(LuongHAK_Offline\/)?tests\//.test(f);
const semver = (v) => { const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v || "")); return m ? [+m[1], +m[2], +m[3]] : null; };
const newer = (a, b) => { const x = semver(a), y = semver(b); if (!x || !y) return false; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

/**
 * input: { number, pr:{ head:{sha}, mergeable_state, labels:[{name}], state, merged }, files:[tên tệp], checkRuns:[{name,status,conclusion}],
 *          comments:[{body,created_at}], headCommitDate, main:{version}, head:{version, changelog, workspaceVersion, hasReleaseDoc}, tags:[tên tag], lockedPaths:[đường dẫn tệp khóa băm] }
 * → { pass, checks:[{id, ok, msg}], productChange }
 */
function evaluate(input) {
  const out = [], add = (id, ok, msg) => out.push({ id, ok: !!ok, msg });
  const n = input.number, pr = input.pr || {}, sha = (pr.head && pr.head.sha) || "", files = input.files || [], comments = input.comments || [];
  if (pr.state && pr.state !== "open") add(0, false, "PR không ở trạng thái mở (" + pr.state + (pr.merged ? ", đã gộp" : "") + ")");
  // 1. CI ở commit cuối
  const runs = input.checkRuns || [], badRuns = runs.filter((r) => !(r.conclusion === "success" || (r.conclusion === "skipped" && SKIPPED_OK[r.name])));
  add(1, /^[0-9a-f]{40}$/.test(sha) && runs.length > 0 && badRuns.length === 0, runs.length === 0 ? "chưa có check-run nào ở " + (sha || "(thiếu head.sha)") : badRuns.length ? "CI chưa xanh ở " + sha + ": " + badRuns.map((r) => r.name + "=" + (r.conclusion || r.status)).join(", ") : "CI " + runs.length + "/" + runs.length + " xanh ở " + sha + " (publish-release bị bỏ qua là đúng)");
  // 2. mergeable
  add(2, pr.mergeable_state === "clean", "mergeable_state = " + pr.mergeable_state + (pr.mergeable_state === "clean" ? "" : " (cần gộp main vào nhánh / chờ CI)"));
  // 3. PR đổi mã sản phẩm: cần /dong-y-gop #n <đúng SHA> do CEO (thay thế)
  const product = files.filter((f) => !isDocOrTest(f)), productChange = product.length > 0;
  if (productChange) {
    const re = new RegExp("/dong-y-gop\\s+#?" + n + "\\s+" + sha, "i"), ok = comments.some((c) => /^\s*\[CEO_LUONG \(thay thế\)/.test(c.body || "") && re.test(c.body || ""));
    add(3, ok, ok ? "có /dong-y-gop #" + n + " " + sha + " do CEO_LUONG (thay thế)" : "PR đổi mã sản phẩm (" + product.slice(0, 3).join(", ") + (product.length > 3 ? ", …" : "") + ") nhưng thiếu bình luận '[CEO_LUONG (thay thế)…' chứa /dong-y-gop #" + n + " " + sha + " (SHA cũ/khác hoặc không có nhãn \"(thay thế)\" đều FAIL)");
  } else add(3, true, "PR chỉ docs/tests — không cần /dong-y-gop");
  // 4. /da-kiem SAU commit cuối
  const hd = Date.parse(input.headCommitDate || ""), dk = comments.filter((c) => /(^|\n)\s*\/da-kiem\b/.test(c.body || "") && (!(hd > 0) || Date.parse(c.created_at) > hd));
  add(4, dk.length > 0 && hd > 0, hd > 0 ? (dk.length ? "có /da-kiem sau commit cuối (" + input.headCommitDate + ")" : "thiếu /da-kiem đăng SAU commit cuối (" + input.headCommitDate + ")") : "không đọc được ngày commit cuối");
  // 5. nhãn
  const lab = (pr.labels || []).map((l) => l.name); add(5, lab.indexOf("ceo-yeu-cau-sua") < 0, lab.indexOf("ceo-yeu-cau-sua") < 0 ? "không có nhãn ceo-yeu-cau-sua" : "đang có nhãn ceo-yeu-cau-sua (CEO yêu cầu sửa)");
  // 6. phiên bản (chỉ khi đổi mã sản phẩm)
  if (productChange) {
    const h = input.head || {}, m = input.main || {}, ver = h.version, problems = [];
    if (!newer(ver, m.version)) problems.push("package.json " + ver + " không lớn hơn main " + m.version);
    if ((input.tags || []).indexOf("v" + ver) >= 0) problems.push("đã có tag v" + ver);
    if (!new RegExp("##\\s*\\[" + String(ver).replace(/\./g, "\\.") + "\\]").test(h.changelog || "")) problems.push("docs/CHANGELOG.md thiếu mục [" + ver + "]");
    if (!String(h.workspaceVersion || "").includes(String(ver))) problems.push("ui/workspace-v104.js VERSION = '" + h.workspaceVersion + "' không khớp " + ver);
    if (!h.hasReleaseDoc) problems.push("thiếu docs/releases/v" + ver + ".md");
    add(6, problems.length === 0, problems.length ? problems.join("; ") : "phiên bản " + ver + " > main " + m.version + "; chưa có tag; CHANGELOG, VERSION, docs/releases khớp");
  } else add(6, true, "PR chỉ docs/tests — không bắt buộc tăng phiên bản");
  // 7. tệp bị cấm (CEO_BAN_GIAO.md mục 6)
  const locked = (input.lockedPaths || []).map((p) => p.replace(/\\/g, "/")), hit = files.filter((f) => FORBIDDEN.some((re) => re.test(f)) || locked.indexOf(f) >= 0);
  add(7, hit.length === 0, hit.length ? "sửa tệp thuộc mục 6 (cần /hoi-chu-so-huu): " + hit.join(", ") : "không sửa workflow CI / khóa băm / tệp dùng chung đã khóa / core/importer.js");
  return { pass: out.every((c) => c.ok), checks: out, productChange };
}

// ---------- PHẦN GỌI MẠNG (chỉ chạy khi chạy trực tiếp) ----------
function gh(args, opt) { const r = cp.spawnSync("gh", ["api"].concat(args), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0 && !(opt && opt.soft)) throw new Error("gh api " + args.join(" ") + " → " + String(r.stderr || "").split("\n")[0]); return r.status === 0 ? r.stdout : null; }
const ghJson = (args, opt) => { const s = gh(args, opt); return s == null ? null : JSON.parse(s); };
const ghPages = (path) => { const pages = ghJson([path, "--paginate", "--slurp"]); return [].concat.apply([], pages.map((p) => (Array.isArray(p) ? p : p.check_runs || []))); };
const fileAt = (path, ref) => { const j = ghJson(["repos/" + REPO + "/contents/" + path + "?ref=" + ref], { soft: true }); return j && j.content ? Buffer.from(j.content, "base64").toString("utf8") : null; };
const verOf = (pkg) => { try { return JSON.parse(pkg).version; } catch (e) { return null; } };

function collect(number) {
  const pr = ghJson(["repos/" + REPO + "/pulls/" + number]), sha = pr.head.sha;
  const files = ghPages("repos/" + REPO + "/pulls/" + number + "/files?per_page=100").map((f) => f.filename);
  const checkRuns = ghPages("repos/" + REPO + "/commits/" + sha + "/check-runs?per_page=100");
  const comments = ghPages("repos/" + REPO + "/issues/" + number + "/comments?per_page=100");
  const commit = ghJson(["repos/" + REPO + "/commits/" + sha]);
  const tags = ghPages("repos/" + REPO + "/tags?per_page=100").map((t) => t.name);
  const lock = fileAt("shared-modules.lock.json", pr.base.ref); let lockedPaths = [];
  try { JSON.parse(lock).sources.forEach((s) => (s.files || []).forEach((f) => (f.localPaths || []).forEach((p) => lockedPaths.push(p)))); } catch (e) { lockedPaths = []; }
  const ws = fileAt("LuongHAK_Offline/ui/workspace-v104.js", sha) || "", wm = /VERSION\s*=\s*'([^']*)'/.exec(ws), headVer = verOf(fileAt("LuongHAK_Offline/package.json", sha));
  return { number: Number(number), pr, files, checkRuns, comments, headCommitDate: commit.commit.committer.date, tags, lockedPaths,
    main: { version: verOf(fileAt("LuongHAK_Offline/package.json", pr.base.ref)) },
    head: { version: headVer, changelog: fileAt("docs/CHANGELOG.md", sha) || "", workspaceVersion: wm ? wm[1] : "", hasReleaseDoc: !!(headVer && fileAt("docs/releases/v" + headVer + ".md", sha)) } };
}

function main(argv) {
  const num = argv.find((a) => /^\d+$/.test(a)), doMerge = argv.includes("--merge");
  if (!num) { console.error("Dùng: node scripts/merge-gate.cjs <số PR> [--merge]"); return 2; }
  let input; try { input = collect(num); } catch (e) { console.error("LỖI đọc GitHub: " + e.message); return 2; }
  const res = evaluate(input); console.log("CỔNG GỘP — " + REPO + " PR #" + num + " @ " + input.pr.head.sha);
  res.checks.forEach((c) => console.log((c.ok ? "PASS " : "FAIL ") + c.id + " " + c.msg));
  console.log(res.pass ? "KẾT QUẢ: PASS (đủ điều kiện gộp)" : "KẾT QUẢ: FAIL (KHÔNG gộp)");
  if (!res.pass || !doMerge) { if (res.pass && !doMerge) console.log("(chưa gộp: thêm --merge để gộp squash bằng đúng SHA trên)"); return res.pass ? 0 : 1; }
  const m = ghJson(["-X", "PUT", "repos/" + REPO + "/pulls/" + num + "/merge", "-f", "merge_method=squash", "-f", "sha=" + input.pr.head.sha], { soft: true });
  const after = ghJson(["repos/" + REPO + "/pulls/" + num]);
  console.log("merged:" + !!after.merged + (after.merge_commit_sha ? " commit main " + after.merge_commit_sha : "") + (m && m.message ? " — " + m.message : ""));
  return after.merged ? 0 : 1;
}
if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { evaluate, isDocOrTest, newer, FORBIDDEN };
