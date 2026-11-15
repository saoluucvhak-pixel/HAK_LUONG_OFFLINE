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
const fs = require('node:fs'), path = require('node:path');
const appDir = path.resolve(__dirname, '..'), srcDir = path.join(appDir, 'app-src'), outFile = path.join(appDir, 'app.js');

function parts() {
  const names = fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).sort();
  const bad = names.filter(f => !/^\d{2}-[a-z0-9-]+\.js$/.test(f));
  if (bad.length) throw Error('Tên file trong app-src/ phải có dạng NN-ten.js: ' + bad.join(', '));
  const dup = names.map(f => f.slice(0, 2)).filter((n, i, a) => a.indexOf(n) !== i);
  if (dup.length) throw Error('Trùng số thứ tự trong app-src/: ' + dup.join(', '));
  return names;
}
function build() { return parts().map(f => fs.readFileSync(path.join(srcDir, f), 'utf8')).join(''); }

module.exports = { build, parts, outFile, srcDir };
if (require.main === module) {
  const text = build();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(outFile, 'utf8') !== text) { console.error('FAIL app.js không khớp app-src/. Chạy: npm run build:app'); process.exit(1); }
    console.log('PASS app.js khớp ' + parts().length + ' file trong app-src/');
  } else {
    fs.writeFileSync(outFile, text);
    console.log('Đã ghép ' + parts().length + ' file thành app.js (' + text.length + ' ký tự)');
  }
}
