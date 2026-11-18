#!/usr/bin/env node
"use strict";
// KIỂM SAU GỘP/PHÁT HÀNH (handoff 014, issue #116): `node scripts/post-merge-check.cjs <phiên bản, VD 2.0.43> [--wait]`
// Kiểm CI của commit trên main, bản phát hành (tag trỏ đúng commit; đủ .exe + SHA256SUMS.txt + BUILD_INFO.json; băm .exe khớp; BUILD_INFO.commit = tag; nhãn vẫn Pre-release).
// CHỈ ĐỌC. Không đổi nhãn bản phát hành (việc của CEO). Không lưu/in token. Mã thoát ≠ 0 nếu có FAIL.
const cp = require("node:child_process"), fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const REPO = process.env.HAK_REPO || "saoluucvhak-pixel/HAK_LUONG_OFFLINE";

// ---------- PHẦN QUYẾT ĐỊNH THUẦN (test ở tests/unit/merge-gate.test.js, không gọi mạng) ----------
/** input: { version, tagCommit, mainCommit?, checkRuns:[{name,status,conclusion}], release:{ prerelease, draft, assets:[{name}] }, sumsText, buildInfo, exeSha256 } */
function evaluateRelease(input) {
  const out = [], add = (id, ok, msg) => out.push({ id, ok: !!ok, msg }), v = input.version, exeName = "TinhLuongHAK-V10.4-Setup-" + v + ".exe";
  add(1, /^[0-9a-f]{40}$/.test(input.tagCommit || ""), input.tagCommit ? "tag v" + v + " → " + input.tagCommit : "không có tag v" + v);
  if (input.mainCommit) add(2, input.mainCommit === input.tagCommit, "commit main đã nghiệm thu " + input.mainCommit + (input.mainCommit === input.tagCommit ? " = tag" : " ≠ tag " + input.tagCommit));
  const runs = input.checkRuns || [], bad = runs.filter((r) => !(r.conclusion === "success" || (r.conclusion === "skipped" && r.name === "publish-release")));
  add(3, runs.length > 0 && bad.length === 0, runs.length === 0 ? "chưa có check-run ở commit tag" : bad.length ? "CI chưa xanh: " + bad.map((r) => r.name + "=" + (r.conclusion || r.status)).join(", ") : "CI " + runs.length + "/" + runs.length + " xanh ở commit tag");
  const assets = ((input.release && input.release.assets) || []).map((a) => a.name), need = [exeName, "SHA256SUMS.txt", "BUILD_INFO.json"], miss = need.filter((n) => assets.indexOf(n) < 0);
  add(4, input.release && miss.length === 0, !input.release ? "không có bản phát hành cho tag v" + v : miss.length ? "thiếu tệp: " + miss.join(", ") : "đủ 3 tệp: " + need.join(", "));
  const line = String(input.sumsText || "").split(/\r?\n/).map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 2 && p[p.length - 1].replace(/^\*/, "") === exeName)[0], want = line ? line[0].toLowerCase() : "";
  add(5, !!want && want === String(input.exeSha256 || "").toLowerCase(), want ? "SHA-256 .exe tự băm " + (input.exeSha256 || "(chưa băm)") + (want === String(input.exeSha256 || "").toLowerCase() ? " = SHA256SUMS.txt" : " ≠ SHA256SUMS.txt " + want) : "SHA256SUMS.txt không có dòng cho " + exeName);
  const bi = input.buildInfo || {}; add(6, bi.commit === input.tagCommit, "BUILD_INFO.commit = " + bi.commit + (bi.commit === input.tagCommit ? " = tag" : " ≠ tag " + input.tagCommit));
  add(7, !!(input.release && input.release.prerelease === true && !input.release.draft), input.release ? "nhãn = " + (input.release.prerelease ? "Pre-release (đúng; chỉ CEO đổi sang Latest)" : "KHÔNG phải Pre-release — chỉ CEO được đổi nhãn") : "không có bản phát hành");
  return { pass: out.every((c) => c.ok), checks: out };
}

// ---------- PHẦN GỌI MẠNG ----------
function gh(args, soft) { const r = cp.spawnSync("gh", ["api"].concat(args), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) { if (soft) return null; throw new Error("gh api " + args.join(" ") + " → " + String(r.stderr || "").split("\n")[0]); } return r.stdout; }
const ghJson = (args, soft) => { const s = gh(args, soft); return s == null ? null : JSON.parse(s); };
function sha256File(f) { const h = crypto.createHash("sha256"), fd = fs.openSync(f, "r"), buf = Buffer.alloc(1 << 20); let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); fs.closeSync(fd); return h.digest("hex"); }
function downloadAsset(asset, dest) { // REST: GET /releases/assets/{id} với Accept: application/octet-stream (gh release download dùng GraphQL nên không dùng)
  const fd = fs.openSync(dest, "w"); const r = cp.spawnSync("gh", ["api", "-H", "Accept: application/octet-stream", "repos/" + REPO + "/releases/assets/" + asset.id], { stdio: ["ignore", fd, "pipe"], encoding: "utf8" }); fs.closeSync(fd);
  if (r.status !== 0) throw new Error("tải " + asset.name + " → " + String(r.stderr || "").split("\n")[0]);
}

function collect(v, wait) {
  const tag = "v" + v, ref = ghJson(["repos/" + REPO + "/git/ref/tags/" + tag], true); let tagCommit = "";
  if (ref) { tagCommit = ref.object.sha; if (ref.object.type === "tag") { const t = ghJson(["repos/" + REPO + "/git/tags/" + tagCommit]); tagCommit = t.object.sha; } }
  let runs = [];
  for (let i = 0; i < (wait ? 60 : 1) && tagCommit; i++) { const j = ghJson(["repos/" + REPO + "/commits/" + tagCommit + "/check-runs?per_page=100"]); runs = j.check_runs || []; if (!wait || (runs.length && runs.every((r) => r.status === "completed"))) break; cp.spawnSync(process.execPath, ["-e", "setTimeout(()=>{},20000)"]); }
  const rel = ghJson(["repos/" + REPO + "/releases/tags/" + tag], true), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hak-pmc-")), exeName = "TinhLuongHAK-V10.4-Setup-" + v + ".exe";
  let sumsText = "", buildInfo = null, exeSha256 = "";
  const by = (n) => ((rel && rel.assets) || []).filter((x) => x.name === n)[0];
  if (rel) {
    try { downloadAsset(by("SHA256SUMS.txt"), path.join(tmp, "SHA256SUMS.txt")); sumsText = fs.readFileSync(path.join(tmp, "SHA256SUMS.txt"), "utf8"); } catch (e) { /* thiếu → FAIL ở bước 4/5 */ }
    try { downloadAsset(by("BUILD_INFO.json"), path.join(tmp, "BUILD_INFO.json")); buildInfo = JSON.parse(fs.readFileSync(path.join(tmp, "BUILD_INFO.json"), "utf8")); } catch (e) { /* như trên */ }
    try { downloadAsset(by(exeName), path.join(tmp, exeName)); exeSha256 = sha256File(path.join(tmp, exeName)); } catch (e) { /* như trên */ }
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* bỏ qua */ }
  return { version: v, tagCommit, checkRuns: runs, release: rel ? { prerelease: rel.prerelease, draft: rel.draft, assets: rel.assets || [] } : null, sumsText, buildInfo, exeSha256 };
}
function main(argv) {
  const v = argv.find((a) => /^\d+\.\d+\.\d+$/.test(a)); if (!v) { console.error("Dùng: node scripts/post-merge-check.cjs <phiên bản X.Y.Z> [--wait]"); return 2; }
  let input; try { input = collect(v, argv.includes("--wait")); } catch (e) { console.error("LỖI đọc GitHub: " + e.message); return 2; }
  const res = evaluateRelease(input); console.log("KIỂM SAU GỘP/PHÁT HÀNH — " + REPO + " v" + v);
  res.checks.forEach((c) => console.log((c.ok ? "PASS " : "FAIL ") + c.id + " " + c.msg)); console.log(res.pass ? "KẾT QUẢ: PASS" : "KẾT QUẢ: FAIL"); return res.pass ? 0 : 1;
}
if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { evaluateRelease };
