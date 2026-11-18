#!/usr/bin/env node
"use strict";
// NÂNG PHIÊN BẢN GIỮ NGUYÊN KIỂU XUỐNG DÒNG (handoff 014-B, issue #116): `node scripts/bump-version.cjs <x.y.z> [--root DIR] [--date DD/MM/YYYY] [--no-docs]`
// Đổi: LuongHAK_Offline/package.json ("version"), package-lock.json (2 chỗ đầu: gốc và packages[""]), ui/workspace-v104.js (VERSION); thêm khung mục ở docs/CHANGELOG.md
// và tạo docs/releases/vX.Y.Z.md. Mỗi tệp được đọc/ghi như CHUỖI THÔ (không chuẩn hóa xuống dòng) nên CRLF vẫn là CRLF, LF vẫn là LF; không đổi gì khác.
// Kiểm tra hết TRƯỚC khi ghi: có lỗi ở bất kỳ tệp nào thì KHÔNG ghi tệp nào. Chỉ dùng thư viện chuẩn; không mạng.
const fs = require("node:fs"), path = require("node:path");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const parts = (v) => { const m = SEMVER.exec(String(v || "")); return m ? [+m[1], +m[2], +m[3]] : null; };
const isNewer = (a, b) => { const x = parts(a), y = parts(b); if (!x || !y) return false; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
const eolOf = (t) => (t.includes("\r\n") ? "\r\n" : "\n");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Thay `n` lần xuất hiện ĐẦU của dòng phiên bản; trả { text, count }. */
function replaceFirst(text, re, repl, n) { let count = 0; const out = text.replace(re, (m, ...g) => { if (count >= n) return m; count++; return repl(m, g); }); return { text: out, count }; }

/** Phần thuần (được test): trả { files:{rel:newText}, errors:[] } mà CHƯA ghi gì. in: { oldVer, newVer, texts:{pkg,lock,ws,changelog}, date, docs } */
function plan(o) {
  const errors = [], files = {}, ov = esc(o.oldVer);
  if (!parts(o.newVer)) errors.push("số phiên bản mới '" + o.newVer + "' không hợp lệ (cần x.y.z)");
  else if (!isNewer(o.newVer, o.oldVer)) errors.push("phiên bản mới " + o.newVer + " không lớn hơn bản hiện tại " + o.oldVer);
  if (errors.length) return { files, errors };
  const pkg = replaceFirst(o.texts.pkg, new RegExp('"version":\\s*"' + ov + '"', "g"), (m) => m.replace(o.oldVer, o.newVer), 1);
  if (pkg.count !== 1) errors.push("LuongHAK_Offline/package.json: không thấy dòng \"version\": \"" + o.oldVer + "\"");
  const lock = replaceFirst(o.texts.lock, new RegExp('"version":\\s*"' + ov + '"', "g"), (m) => m.replace(o.oldVer, o.newVer), 2);
  if (lock.count !== 2) errors.push("LuongHAK_Offline/package-lock.json: cần 2 chỗ \"version\": \"" + o.oldVer + "\" đầu tệp, thấy " + lock.count);
  const ws = replaceFirst(o.texts.ws, new RegExp("(VERSION\\s*=\\s*'[^']*?v)" + ov + "(')", "g"), (m, g) => g[0] + o.newVer + g[1], 1);
  if (ws.count !== 1) errors.push("LuongHAK_Offline/ui/workspace-v104.js: không thấy VERSION = '… v" + o.oldVer + "'");
  if (errors.length) return { files, errors };
  files["LuongHAK_Offline/package.json"] = pkg.text; files["LuongHAK_Offline/package-lock.json"] = lock.text; files["LuongHAK_Offline/ui/workspace-v104.js"] = ws.text;
  if (o.docs) {
    const cl = o.texts.changelog, e = eolOf(cl), i = cl.search(/^## \[/m);
    if (i < 0) errors.push("docs/CHANGELOG.md: không thấy mục '## [' nào để chèn trước");
    else if (cl.includes("## [" + o.newVer + "]")) errors.push("docs/CHANGELOG.md đã có mục [" + o.newVer + "]");
    else {
      files["docs/CHANGELOG.md"] = cl.slice(0, i) + "## [" + o.newVer + "] — " + o.date + e + "- **(điền tên việc, mã handoff, issue):** (điền nội dung). Chi tiết: `docs/releases/v" + o.newVer + ".md`." + e + e + cl.slice(i);
      files["docs/releases/v" + o.newVer + ".md"] = ["# HAK Lương Offline V10.4 — v" + o.newVer, "", "Trạng thái: thử nghiệm có kiểm soát", "", "(điền: việc gì, chỉ đạo/issue nào, không đổi gì ngoài phạm vi)", "", "## Thay đổi", "1. (điền)", "", "## Kiểm", "- (điền: test đỏ trước khi sửa → xanh sau; số ca; E2E)", "", "## Giới hạn / chưa kiểm", "- (điền; ghi rõ phần chưa nghiệm thu trên Windows thật)", "", "## Tham chiếu đã đối chiếu", "(điền: HAK_AI_SKILLS / HAK_SMART_FILTER / HAK_CODE_QUALITY_TEST / HAK-Enterprise-Design-System — nêu mục đã đối chiếu và chỗ khác)", ""].join(e);
    }
  }
  return { files, errors };
}

function main(argv) {
  const get = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const newVer = argv.find((a, i) => !a.startsWith("--") && (i === 0 || !["--root", "--date"].includes(argv[i - 1])));
  if (!newVer) { console.error("Dùng: node scripts/bump-version.cjs <x.y.z> [--root DIR] [--date DD/MM/YYYY] [--no-docs]"); return 2; }
  const root = path.resolve(get("--root") || path.join(__dirname, "..")), docs = !argv.includes("--no-docs"), d = new Date(), p2 = (x) => String(x).padStart(2, "0");
  const date = get("--date") || p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear();
  const rd = (rel) => { try { return fs.readFileSync(path.join(root, rel), "utf8"); } catch (e) { return null; } };
  const texts = { pkg: rd("LuongHAK_Offline/package.json"), lock: rd("LuongHAK_Offline/package-lock.json"), ws: rd("LuongHAK_Offline/ui/workspace-v104.js"), changelog: docs ? rd("docs/CHANGELOG.md") : "" };
  const miss = Object.keys(texts).filter((k) => texts[k] == null); if (miss.length) { console.error("LỖI: không đọc được tệp (" + miss.join(", ") + ") dưới " + root); return 2; }
  let oldVer; try { oldVer = JSON.parse(texts.pkg).version; } catch (e) { console.error("LỖI: package.json không phải JSON hợp lệ"); return 2; }
  const res = plan({ oldVer, newVer, texts, date, docs });
  if (res.errors.length) { res.errors.forEach((m) => console.error("LỖI: " + m)); console.error("Không ghi tệp nào."); return 1; }
  const rels = Object.keys(res.files);
  if (rels.some((r) => r.startsWith("docs/releases/") && fs.existsSync(path.join(root, r)))) { console.error("LỖI: docs/releases/v" + newVer + ".md đã có. Không ghi tệp nào."); return 1; }
  rels.forEach((r) => { const f = path.join(root, r); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, res.files[r]); });
  console.log("Đã nâng " + oldVer + " → " + newVer + " (giữ nguyên kiểu xuống dòng từng tệp):"); rels.forEach((r) => console.log("  " + r));
  if (docs) console.log("Còn phải điền: mục CHANGELOG và docs/releases/v" + newVer + ".md (các dòng '(điền…)').");
  return 0;
}
if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { plan, isNewer, eolOf };
