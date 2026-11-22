'use strict';
// Ghép các file trong app-src/ (theo thứ tự tên) thành app.js.
//
// app.js là MỘT hàm bao (IIFE) nên mọi màn hình dùng chung db, st, session... Các file trong app-src/ là
// những ĐOẠN liên tiếp của hàm đó, không phải module độc lập: không chạy riêng, không require được.
// Sửa giao diện thì sửa trong app-src/, rồi chạy:
//
//   npm run build:app          ghi lại app.js
//   npm run build:app -- --check   chỉ kiểm tra app.js có khớp app-src/ không (dùng trong test và CI)
//
// app.js vẫn được commit: Electron, bộ cài và các test đọc thẳng file này.
//
// Công cụ phát triển (v2.0.97, esbuild chạy cục bộ, KHÔNG cần mạng; app.js KHÔNG đổi một ký tự):
//   npm run build:app -- --verify     phân tích app.js bằng esbuild (cú pháp, kích thước, bản nén thử) và đo thời gian ghép
//   npm run build:app -- --sourcemap  ghi app.js.map: DevTools hiện đúng tên file app-src/*.js và screens/*.js khi gỡ lỗi (không đóng gói)
const fs = require('node:fs'), path = require('node:path');
const appDir = path.resolve(__dirname, '..'), srcDir = path.join(appDir, 'app-src'), outFile = path.join(appDir, 'app.js');

// Windows có thể checkout app-src/ và app.js với CRLF (git autocrlf) trong khi bản ghép ra dùng LF hoặc ngược lại:
// so khớp nội dung sau khi chuẩn hóa xuống dòng, không coi khác kiểu xuống dòng là lệch.
const normalizeEol = text => text.replace(/\r\n/g, '\n');
const matches = (actual, expected) => normalizeEol(actual) === normalizeEol(expected);

function parts(dir = srcDir) {
  const names = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const bad = names.filter(f => !/^\d{2}-[a-z0-9-]+\.js$/.test(f));
  if (bad.length) throw Error('Tên file trong app-src/ phải có dạng NN-ten.js: ' + bad.join(', '));
  const dup = names.map(f => f.slice(0, 2)).filter((n, i, a) => a.indexOf(n) !== i);
  if (dup.length) throw Error('Trùng số thứ tự trong app-src/: ' + dup.join(', '));
  return names;
}
function build(dir = srcDir) {
  const screenDir = path.join(dir, 'screens');
  const remaining = new Set(fs.readdirSync(screenDir).filter(f => f.endsWith('.js')));
  const bundle = parts(dir).map(f => {
    const source = fs.readFileSync(path.join(dir, f), 'utf8');
    return source.replace(/^  \/\/ @screen (tab[A-Za-z]+)\r?\n/gm, (_, name) => {
      const file = name + '.js';
      if (!remaining.delete(file)) throw Error('Màn hình bị thiếu hoặc ghép hai lần: ' + file);
      const screen = fs.readFileSync(path.join(screenDir, file), 'utf8');
      if (!screen.startsWith('  function ' + name + '(') || !screen.endsWith('\n')) {
        throw Error('File màn hình không đúng tên hàm hoặc thiếu xuống dòng: ' + file);
      }
      return screen;
    });
  }).join('');
  if (remaining.size) throw Error('Màn hình chưa được ghép: ' + [...remaining].join(', '));
  return bundle;
}


/** Các đoạn của app.js theo thứ tự ghép: [{ file, text }] với file là đường dẫn tương đối trong app-src/ (màn hình chèn vào là screens/tabX.js).
 *  Nối text của các đoạn bằng đúng build(): được test (U-APP-ESB-01). */
/** Số dòng (từ 0) của vị trí pos trong source: đếm các '\n' đứng trước. */
function lineAt(source, pos) { let n = 0; for (let i = source.indexOf('\n'); i !== -1 && i < pos; i = source.indexOf('\n', i + 1)) n++; return n; }
function segments(dir = srcDir) {
  const screenDir = path.join(dir, 'screens');
  const out = [];
  for (const f of parts(dir)) {
    const source = fs.readFileSync(path.join(dir, f), 'utf8');
    const re = /^  \/\/ @screen (tab[A-Za-z]+)\r?\n/gm;
    let last = 0, m;
    while ((m = re.exec(source))) {
      if (m.index > last) out.push({ file: f, text: source.slice(last, m.index), line: lineAt(source, last) });
      const file = 'screens/' + m[1] + '.js';
      out.push({ file, text: fs.readFileSync(path.join(screenDir, m[1] + '.js'), 'utf8'), line: 0 });
      last = m.index + m[0].length;
    }
    if (last < source.length) out.push({ file: f, text: source.slice(last), line: lineAt(source, last) });
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function vlq(n) { // Base64 VLQ của Source Map v3
  let v = n < 0 ? ((-n) << 1) | 1 : n << 1, s = '';
  do { let d = v & 31; v >>>= 5; if (v) d |= 32; s += B64[d]; } while (v);
  return s;
}
/** Source Map v3 mức dòng: mỗi dòng của app.js trỏ về đúng dòng trong file nguồn (sources tương đối với thư mục app-src/). */
function sourceMap(segs = segments()) {
  const sources = [], idx = new Map(), lines = [];
  let prevSrc = 0, prevLine = 0;
  for (const seg of segs) {
    if (!idx.has(seg.file)) { idx.set(seg.file, sources.length); sources.push(seg.file); }
    const src = idx.get(seg.file);
    const n = normalizeEol(seg.text).split('\n'); if (n[n.length - 1] === '') n.pop();
    n.forEach((_, i) => {
      const ln = (seg.line || 0) + i; lines.push('A' + vlq(src - prevSrc) + vlq(ln - prevLine) + 'A'); // cột phát sinh 0 → mỗi dòng độc lập
      prevSrc = src; prevLine = ln;
    });
  }
  return { version: 3, file: 'app.js', sourceRoot: 'app-src/', sources, names: [], mappings: lines.join(';') };
}

/** Phân tích bằng esbuild cục bộ: cú pháp (ném lỗi nếu sai), kích thước, bản nén thử, thời gian. Không ghi gì. */
function verify(text = fs.readFileSync(outFile, 'utf8')) {
  const esbuild = require('esbuild');
  const t0 = process.hrtime.bigint();
  esbuild.transformSync(text, { loader: 'js', sourcefile: 'app.js', logLevel: 'silent' });
  const parseMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const min = esbuild.transformSync(text, { loader: 'js', minify: true, logLevel: 'silent' }).code;
  return { esbuild: esbuild.version, chars: text.length, minChars: min.length, parseMs: Math.round(parseMs * 10) / 10 };
}

module.exports = { build, parts, segments, sourceMap, verify, outFile, srcDir, normalizeEol, matches };
if (require.main === module) {
  const t0 = process.hrtime.bigint();
  const text = build();
  const buildMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e5) / 10;
  if (process.argv.includes('--verify')) {
    const v = verify(); console.log('PASS esbuild ' + v.esbuild + ': app.js đọc được (' + v.chars + ' ký tự, bản nén thử ' + v.minChars + ', phân tích ' + v.parseMs + ' ms); ghép ' + parts().length + ' file trong ' + buildMs + ' ms');
  } else if (process.argv.includes('--sourcemap')) {
    const map = sourceMap(); fs.writeFileSync(outFile + '.map', JSON.stringify(map)); console.log('Đã ghi app.js.map (' + map.sources.length + ' file nguồn). Chỉ để gỡ lỗi, không đóng gói.');
  } else if (process.argv.includes('--check')) {
    if (!matches(fs.readFileSync(outFile, 'utf8'), text)) { console.error('FAIL app.js không khớp app-src/. Chạy: npm run build:app'); process.exit(1); }
    console.log('PASS app.js khớp ' + parts().length + ' file trong app-src/');
  } else {
    fs.writeFileSync(outFile, text);
    console.log('Đã ghép ' + parts().length + ' file thành app.js (' + text.length + ' ký tự)');
  }
}
