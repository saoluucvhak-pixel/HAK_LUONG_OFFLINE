'use strict';
// Kiểm tra các file dùng chung với repo gốc (bộ lọc, design system) theo shared-modules.lock.json.
// Cùng cách làm với LuongHAK_Offline/scripts/verify-shared-ocr.cjs.
//
//   node scripts/verify-shared-modules.cjs
//       So SHA-256 (đã chuẩn hóa CRLF -> LF) của từng file trong repo này với khóa.
//       Bắt mọi thay đổi ngoài ý muốn; không cần mạng, không cần repo gốc.
//
//   node scripts/verify-shared-modules.cjs <thư mục chứa các bản checkout repo gốc>
//       Thêm bước đối chiếu với repo gốc đã checkout tại commit ghi trong khóa
//       (thư mục con lấy theo trường "checkout" của từng nguồn):
//       - mục "identical": file ở đây phải giống hệt file gốc;
//       - mục "diverged": file gốc phải đúng mã băm đã ghi, để biết bản gốc được so là bản nào.
//
// Khi cố ý sửa một file trong danh sách: cập nhật normalizedSha256 (và status/note nếu cần) trong khóa, cùng PR.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'shared-modules.lock.json'), 'utf8'));
const upstreamRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex');

const errors = [];
let checked = 0, compared = 0;
for (const source of lock.sources) {
  for (const entry of source.files) {
    for (const local of entry.localPaths) {
      const file = path.join(root, local);
      if (!fs.existsSync(file)) { errors.push(local + ': không tìm thấy file'); continue; }
      const digest = sha(file);
      checked++;
      if (digest !== entry.normalizedSha256) errors.push(local + ': nội dung khác khóa (' + digest + '). Nếu cố ý sửa, cập nhật shared-modules.lock.json.');
    }
    if (!['identical', 'diverged'].includes(entry.status)) errors.push(entry.upstreamPath + ': status phải là "identical" hoặc "diverged"');
    if (entry.status === 'diverged' && !entry.note) errors.push(entry.upstreamPath + ': mục "diverged" phải có note nêu lý do');
    if (entry.status === 'identical' && entry.upstreamSha256 !== entry.normalizedSha256) errors.push(entry.upstreamPath + ': mục "identical" phải có upstreamSha256 bằng normalizedSha256');
    if (!upstreamRoot) continue;
    const upstream = path.join(upstreamRoot, source.checkout, entry.upstreamPath);
    if (!fs.existsSync(upstream)) { errors.push(source.repository + ':' + entry.upstreamPath + ': không có trong bản checkout repo gốc'); continue; }
    compared++;
    if (sha(upstream) !== entry.upstreamSha256) errors.push(source.repository + ':' + entry.upstreamPath + ': bản gốc tại ' + source.commit.slice(0, 7) + ' khác mã băm đã ghi');
  }
}

if (errors.length) {
  console.error('FAIL shared modules:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}
console.log('PASS shared modules: ' + checked + ' file khớp khóa' + (upstreamRoot ? ', ' + compared + ' file đã đối chiếu với repo gốc' : ' (chưa đối chiếu repo gốc: không truyền thư mục checkout)'));
