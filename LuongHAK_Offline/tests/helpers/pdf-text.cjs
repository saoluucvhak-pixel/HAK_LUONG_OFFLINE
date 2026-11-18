// Trích văn bản từ PDF do Chromium/Skia (printToPDF) tạo ra — KHÔNG thêm thư viện: đọc đối tượng, giải nén Flate, ánh xạ glyph → Unicode bằng ToUnicode CMap,
// theo dõi ma trận văn bản + ma trận biến đổi (cm) để biết VỊ TRÍ từng đoạn chữ rồi ghép thành dòng. Chỉ phục vụ kiểm thử (dữ liệu GIẢ).
// extract(buf) → { pages: [ { lines: [ { y, cells: [ { x, text } ] } ] } ], text }   — dòng sắp theo chiều đọc (trên → dưới), ô theo x tăng dần.
"use strict";
const zlib = require("node:zlib");

function parseObjects(buf) {
  const s = buf.toString("latin1"), objs = {}, re = /(\d+)\s+(\d+)\s+obj\b/g; let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length, end = s.indexOf("endobj", start); if (end < 0) break;
    let body = s.slice(start, end), stream = null;
    const si = body.indexOf("stream");
    if (si >= 0) {
      let a = start + si + 6; if (s[a] === "\r") a++; if (s[a] === "\n") a++;
      const lm = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(body.slice(0, si)); let b = lm ? a + Number(lm[1]) : s.indexOf("endstream", a);
      if (!lm || s.slice(b, b + 12).indexOf("endstream") < 0) b = s.lastIndexOf("endstream", end); // Length gián tiếp/sai → tìm theo endstream
      const raw = buf.subarray(a, b), dict = body.slice(0, si);
      stream = /FlateDecode/.test(dict) ? (() => { try { return zlib.inflateSync(raw); } catch (e) { try { return zlib.inflateSync(raw.subarray(0, raw.length - 1)); } catch (e2) { return null; } } })() : raw;
      body = dict;
    }
    objs[Number(m[1])] = { dict: body, stream };
    re.lastIndex = end + 6;
  }
  return objs;
}
const hex = (h) => { h = h.replace(/\s+/g, ""); if (h.length % 2) h += "0"; return Buffer.from(h, "hex"); };
function cmapOf(text) { // ToUnicode: beginbfchar / beginbfrange → Map(codigo → chuỗi)
  const map = new Map(), u16 = (h) => { const b = hex(h); let o = ""; for (let i = 0; i + 1 < b.length; i += 2) o += String.fromCharCode(b.readUInt16BE(i)); return o; };
  const ch = /beginbfchar([\s\S]*?)endbfchar/g; let m;
  while ((m = ch.exec(text))) { const r = /<([0-9a-fA-F\s]+)>\s*<([0-9a-fA-F\s]+)>/g; let x; while ((x = r.exec(m[1]))) map.set(parseInt(x[1].replace(/\s+/g, ""), 16), u16(x[2])); }
  const rg = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = rg.exec(text))) {
    const r = /<([0-9a-fA-F\s]+)>\s*<([0-9a-fA-F\s]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F\s]+>)/g; let x;
    while ((x = r.exec(m[1]))) {
      const lo = parseInt(x[1].replace(/\s+/g, ""), 16), hi = parseInt(x[2].replace(/\s+/g, ""), 16);
      if (x[3][0] === "[") { const items = x[3].match(/<[0-9a-fA-F\s]+>/g) || []; items.forEach((it, i) => map.set(lo + i, u16(it.slice(1, -1)))); }
      else { const base = u16(x[3].slice(1, -1)); for (let c = lo; c <= hi; c++) map.set(c, base.slice(0, -1) + String.fromCharCode(base.charCodeAt(base.length - 1) + (c - lo))); }
    }
  }
  return map;
}
const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];

function tokensOf(src) { // token hóa luồng nội dung: số, tên, chuỗi hex, mảng, toán tử
  const t = []; const re = /<([0-9a-fA-F\s]*)>|\(((?:\\.|[^\\()])*)\)|\[|\]|\/[^\s/<>\[\]()]+|[-+]?\d*\.?\d+|[A-Za-z'"*]+/g; let m;
  while ((m = re.exec(src))) {
    if (m[1] !== undefined) t.push({ k: "hex", v: m[1] }); else if (m[2] !== undefined) t.push({ k: "str", v: m[2] });
    else if (m[0] === "[" || m[0] === "]") t.push({ k: m[0] }); else if (m[0][0] === "/") t.push({ k: "name", v: m[0].slice(1) });
    else if (/^[-+]?\d*\.?\d+$/.test(m[0])) t.push({ k: "num", v: Number(m[0]) }); else t.push({ k: "op", v: m[0] });
  }
  return t;
}
function extract(buf) {
  const objs = parseObjects(buf), fonts = {}, pages = [];
  const refOf = (dict, key) => { const m = new RegExp("/" + key + "\\s+(\\d+)\\s+\\d+\\s+R").exec(dict); return m ? Number(m[1]) : null; };
  const cmaps = {}; // số đối tượng font → Map
  const fontMap = (n) => { if (cmaps[n] !== undefined) return cmaps[n]; const o = objs[n]; let r = null; if (o) { const tu = refOf(o.dict, "ToUnicode"); if (tu && objs[tu] && objs[tu].stream) r = cmapOf(objs[tu].stream.toString("latin1")); } return (cmaps[n] = r); };
  // trang: đối tượng /Type /Page → /Contents (1 hoặc mảng) + /Resources /Font << /F1 n 0 R >> (trực tiếp hoặc gián tiếp)
  Object.keys(objs).map(Number).sort((a, b) => a - b).forEach((n) => {
    const d = objs[n].dict; if (!/\/Type\s*\/Page(?![s\w])/.test(d)) return;
    const resRef = refOf(d, "Resources"), resDict = resRef && objs[resRef] ? objs[resRef].dict : d;
    const fm = /\/Font\s*(?:(\d+)\s+\d+\s+R|<<([\s\S]*?)>>)/.exec(resDict); let fontDict = fm ? (fm[2] || (objs[Number(fm[1])] || {}).dict || "") : "";
    const fontRefs = {}; fontDict.replace(/\/([^\s/]+)\s+(\d+)\s+\d+\s+R/g, (x, name, num) => { fontRefs[name] = Number(num); return x; });
    const cm = /\/Contents\s*(?:\[([^\]]*)\]|(\d+)\s+\d+\s+R)/.exec(d); if (!cm) return;
    const cs = cm[1] ? (cm[1].match(/\d+(?=\s+\d+\s+R)/g) || []).map(Number) : [Number(cm[2])];
    const src = cs.map((c) => (objs[c] && objs[c].stream ? objs[c].stream.toString("latin1") : "")).join("\n");
    const runs = []; let ctm = [1, 0, 0, 1, 0, 0], stack = [], tm = [1, 0, 0, 1, 0, 0], tlm = tm, font = null, fsz = 1, leading = 0;
    let cur = "";
    const flush = () => { if (cur) { const m = mul(tm, ctm); runs.push({ x: m[4], y: m[5], size: Math.abs(fsz * m[3] || fsz), text: cur }); } cur = ""; };
    const show = (bytes2) => {
      const cmap = font ? fontMap(font) : null, wide = font && objs[font] && /\/Subtype\s*\/Type0/.test(objs[font].dict), step = wide ? 2 : 1; let out = ""; // Type0 (Identity-H): mã 2 byte; Type3/Type1/TrueType đơn giản: 1 byte
      for (let i = 0; i + step - 1 < bytes2.length; i += step) { const c = step === 2 ? bytes2.readUInt16BE(i) : bytes2[i]; out += cmap && cmap.has(c) ? cmap.get(c) : ""; }
      cur += out;
    };
    const toks = tokensOf(src); let args = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.k !== "op") { args.push(t); continue; }
      const nums = args.filter((a) => a.k === "num").map((a) => a.v);
      switch (t.v) {
        case "q": stack.push(ctm); break; case "Q": ctm = stack.pop() || ctm; break;
        case "cm": if (nums.length >= 6) ctm = mul(nums.slice(-6), ctm); break;
        case "BT": tm = [1, 0, 0, 1, 0, 0]; tlm = tm; break;
        case "Tf": { const nm = args.find((a) => a.k === "name"); font = nm ? fontRefs[nm.v] : null; fsz = nums[nums.length - 1] || 1; break; }
        case "Tm": if (nums.length >= 6) { tm = nums.slice(-6); tlm = tm; } break;
        case "Td": case "TD": if (nums.length >= 2) { if (t.v === "TD") leading = -nums[1]; tlm = mul([1, 0, 0, 1, nums[nums.length - 2], nums[nums.length - 1]], tlm); tm = tlm; } break;
        case "T*": tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm; break;
        case "Tj": { const s = args.find((a) => a.k === "hex"); if (s) show(hex(s.v)); flush(); break; } // mỗi lệnh hiện chữ = MỘT đoạn (ô) tại vị trí hiện tại
        case "TJ": args.forEach((a) => { if (a.k === "hex") show(hex(a.v)); }); flush(); break;
        default: break;
      }
      args = [];
    }
    pages.push(runs);
  });
  // ghép chiều đọc: tọa độ PDF có thể lật trục (cm âm) — suy ra từ thứ tự xuất hiện: nếu y tăng dần theo luồng thì lật
  const outPages = pages.map((runs) => {
    const flipped = runs.length > 3 && runs[runs.length - 1].y > runs[0].y; // luồng xuôi đi từ trên xuống: y tăng ⇒ trục lật
    const sorted = runs.slice().sort((a, b) => (flipped ? a.y - b.y : b.y - a.y) || a.x - b.x);
    const lines = []; sorted.forEach((r) => { const ln = lines.find((l) => Math.abs(l.y - r.y) <= Math.max(1.5, r.size * 0.45)); if (ln) ln.runs.push(r); else lines.push({ y: r.y, runs: [r] }); });
    // Skia/Type3 hiện TỪNG KÝ TỰ riêng: ghép các ký tự liền kề (khoảng cách đầu-đầu ≤ 1,3 lần cỡ chữ) thành một ô; khoảng cách lớn hơn = sang ô khác
    return { lines: lines.map((l) => { const rs = l.runs.sort((a, b) => a.x - b.x), cells = []; rs.forEach((r) => { const c = cells[cells.length - 1]; if (c && r.x - c.lastX <= Math.max(c.size, r.size) * 1.3) { c.text += r.text; c.lastX = r.x; } else cells.push({ x: r.x, lastX: r.x, size: r.size, text: r.text }); }); return { y: l.y, cells: cells.map((c) => ({ x: c.x, text: c.text })) }; }) };
  });
  const text = outPages.map((p) => p.lines.map((l) => l.cells.map((c) => c.text).join(" ")).join("\n")).join("\n\f");
  void fonts;
  return { pages: outPages, text };
}
/** Dạng so sánh: bỏ khoảng trắng, dấu gạch, dấu : ; ( ) và ký tự vùng riêng U+E000–F8FF (khi dùng phông Type3 Skia ghi dấu gạch thành U+E088 và bỏ một số dấu câu khỏi bảng ToUnicode), chuẩn hóa NFC. Dấu chấm/phẩy của SỐ được giữ nguyên. */
const canon = (v) => String(v == null ? "" : v).normalize("NFC").replace(/[\s\u00a0\-\u2010-\u2015\ue000-\uf8ff:;()]/g, "");
/** Mỗi dòng của PDF → mảng ô đã chuẩn hóa (bỏ ô rỗng). */
function lines(buf) { return extract(buf).pages.flatMap((p) => p.lines.map((l) => l.cells.map((c) => canon(c.text)).filter(Boolean))); }
/** Có dòng nào của PDF chứa lần lượt các ô `expected` (so sánh dạng chuẩn hóa, ô PDF có thể ghép nhiều ô mong đợi) không? */
function hasRow(pdfLines, expected) {
  const want = expected.map(canon).filter(Boolean);
  return pdfLines.some((cells) => { const joined = cells.join("|"); let pos = 0; return want.every((w) => { const i = joined.indexOf(w, pos); if (i < 0) return false; pos = i + w.length; return true; }); });
}
const words = (v) => String(v == null ? "" : v).split(/[\s/()\-:]+/).map(canon).filter(Boolean); // ô dài có thể ngắt dòng ở dấu cách hoặc dấu "/"
/** Dòng mong đợi nào KHÔNG có trong PDF? case = { expect: [[ô…]…] }. Ba mức, mỗi dòng đạt ở mức MẠNH NHẤT có thể (trả thêm số dòng ở từng mức):
 *  1 "strict": các ô xuất hiện lần lượt trên MỘT dòng PDF; 2 "block": ô dài bị ngắt dòng trong ô bảng / bảng rộng bị tách phần cột → neo theo ô khóa DUY NHẤT của dòng (cột đầu tiên có giá trị khác nhau ở mọi dòng),
 *  mọi TỪ của mọi ô phải có trong khối dòng PDF bắt đầu từ ô khóa đó (tới ô khóa kế tiếp); 3 "weak": không có cột khóa duy nhất → mọi từ phải có đâu đó trong PDF (yếu nhất, được đếm riêng). */
function missingRows(pdfLines, c) {
  const miss = [], tally = { strict: 0, block: 0, weak: 0 }, txt = pdfLines.map((ln) => ln.join(""));
  const ncol = Math.max(0, ...c.expect.map((r) => r.length)); let keyIdx = -1, bestFound = -1;
  for (let k = 0; k < ncol; k++) { // cột khóa: giá trị khác nhau ở các dòng có giá trị (dòng tổng thường không có), có ở ≥ nửa số dòng, mọi giá trị tìm thấy liền mạch trong PDF càng nhiều càng tốt
    const vals = c.expect.map((r) => canon(r[k])).filter((v) => v.length >= 2); if (vals.length * 2 < c.expect.length || new Set(vals).size !== vals.length) continue;
    const found = vals.filter((v) => txt.some((t) => t.includes(v))).length; if (found > bestFound) { bestFound = found; keyIdx = k; } if (found === vals.length) break;
  }
  const keyOf = (r) => (keyIdx >= 0 && canon(r[keyIdx]).length >= 2 ? canon(r[keyIdx]) : null);
  const starts = []; if (keyIdx >= 0) c.expect.forEach((r) => { const k = keyOf(r); if (k) txt.forEach((t, li) => { if (t.includes(k)) starts.push(li); }); });
  const allStarts = [...new Set(starts)].sort((a, b) => a - b);
  c.expect.forEach((cells, i) => {
    if (hasRow(pdfLines, cells)) { tally.strict++; return; }
    const ws = cells.flatMap(words);
    const k0key = keyOf(cells);
    if (k0key) {
      const k = k0key, occ = txt.map((t, li) => (t.includes(k) ? li : -1)).filter((li) => li >= 0);
            const block = occ.map((li) => { const k0 = allStarts.indexOf(li), pv = k0 > 0 ? allStarts[k0 - 1] : -1, nx = k0 < allStarts.length - 1 ? allStarts[k0 + 1] : txt.length; return txt.slice(pv + 1, nx).join(""); }).join(""); // mọi dòng giữa ô khóa của dòng trước và dòng sau (chữ ngắt dòng nằm cả trên lẫn dưới ô khóa)
      if (occ.length && ws.every((w) => block.includes(w))) { tally.block++; return; }
    } else if (ws.every((w) => txt.some((t) => t.includes(w)))) { tally.weak++; return; }
    miss.push({ row: i, cells });
  });
  miss.tally = tally; return miss;
}
module.exports = { extract, lines, hasRow, canon, missingRows };
