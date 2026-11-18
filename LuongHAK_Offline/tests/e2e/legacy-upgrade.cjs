'use strict';
// Nâng cấp từ dữ liệu cũ (không schemaVersion, tiền dạng "500.000", kỳ chốt kiểu cũ) → thiết lập quản trị viên lần đầu → Trang chủ.
// Lặp HAK_LEGACY_REPEAT lần (mặc định 10), mỗi lần một hồ sơ MỚI, để bắt lỗi chập chờn (từng thấy 1 lần hỏng trên runner Windows ở PR #83: không thấy nút Trang chủ).
// Mỗi vòng ghi nhật ký chẩn đoán của tiến trình chính (HAK_DEBUG_SAVE): với mỗi lần lưu, bản nền giao diện gửi (base), phiên bản kho lúc đó (now) và có bị từ chối không (stale).
// Điều kiện đạt của mỗi vòng: KHÔNG có STALE_BASE giả ở lần chạy đầu; Trang chủ hiện ra (chờ theo TRẠNG THÁI, không chờ cố định); dữ liệu cũ nguyên vẹn.
require('./harness-env.cjs');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const REPEAT = Math.max(1, +process.env.HAK_LEGACY_REPEAT || 10);
const legacy = { nhanvien: [{ 'Mã NV': 'NV001', 'Họ và tên': 'Cũ', 'Trạng thái': 'Đang làm việc', 'Số CCCD': '49090001234' }], psluong: [{ 'Ngày hạch toán': '28/09/2026', 'Mã NV': 'NV001', 'Thưởng': '500.000' }], kyluong: [{ ky: '2026-08', ngayChot: '2026-09-01T00:00:00.000Z', ghiChu: '', kq: { bangluong: [{ 'Mã NV': 'NV001', 'Họ và tên': 'Cũ', 'Thực lĩnh': 1000000, 'Tổng thu nhập': 1000000 }], bhxh: [], tncn: [], canhbao: [] } }] };

async function once(k) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hak-legacy-upgrade-')), dbg = path.join(dir, 'save-debug.jsonl');
  fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(legacy));
  let app;
  try {
    app = await _electron.launch({ executablePath: process.env.ELECTRON_PATH || require('electron'), args: ['--no-sandbox', path.resolve(__dirname, '../..')], env: { ...process.env, HAK_USER_DATA: dir, HAK_NO_SHELL: '1', HAK_DEBUG_SAVE: dbg } });
    const w = await app.firstWindow(), errors = [], dialogs = [];
    w.on('dialog', (d) => { dialogs.push(d.type() + ': ' + d.message().slice(0, 160)); d.accept(); });
    w.on('pageerror', (e) => errors.push(e.message));
    await w.waitForSelector('#main > *');
    const sig0 = await w.evaluate(() => window.hakStore.sig());
    for (const [f, v] of [['cty', 'Test'], ['ma', 'TEST'], ['u', 'admin'], ['n', 'Admin'], ['p', 'Admin2026test'], ['p2', 'Admin2026test']]) await w.fill('#main input[data-f=' + f + ']', v);
    await w.click('#main button.big');
    await w.waitForSelector('[data-recovery]');
    await w.click('.dlg footer button.pri');
    const t0 = Date.now();
    let homeMs = -1;
    try { await w.waitForSelector('#nav button[data-k=home]', { timeout: 20000 }); homeMs = Date.now() - t0; } catch (e) { /* ghi nhận bên dưới */ }
    const saves = fs.existsSync(dbg) ? fs.readFileSync(dbg, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    const sigEnd = await w.evaluate(() => window.hakStore.sig()).catch(() => '?');
    console.log('[vòng ' + k + '/' + REPEAT + '] sig đầu=' + sig0 + ' sig cuối=' + sigEnd + ' Trang chủ sau ' + homeMs + ' ms; lưu: ' + saves.map((s) => s.base + '→' + s.now + (s.stale ? ' STALE' : '')).join(' | ') + '; hộp thoại: ' + JSON.stringify(dialogs));
    assert.equal(saves.filter((s) => s.stale).length, 0, 'STALE_BASE giả ở lần chạy đầu: ' + JSON.stringify(saves));
    assert.deepEqual(errors, [], 'No renderer errors after setup');
    assert.ok(homeMs >= 0, 'Trang chủ không hiện sau 20 s; hộp thoại: ' + JSON.stringify(dialogs) + ' | màn hình: ' + (await w.locator('#main').innerText().catch(() => '?')).slice(0, 200));
    assert.equal(await w.locator('#nav button[data-k=home]').count(), 1);
    const disk = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8'));
    assert.equal(disk.psluong[0]['Thưởng'], '500000');
    assert.equal(disk.nhanvien[0]['Số CCCD'], '049090001234');
    assert.equal(disk.psluong[0]['Ngày hạch toán'], '2026-09-28');
    assert.deepEqual(disk.kyluong, legacy.kyluong);
    return homeMs;
  } finally { if (app) await app.close().catch(() => {}); }
}

(async () => {
  const ms = [];
  for (let k = 1; k <= REPEAT; k++) ms.push(await once(k));
  console.log('PASS exact legacy fixture: migration, old closed payroll, setup and Dashboard (' + REPEAT + '/' + REPEAT + ' vòng; Trang chủ sau ' + Math.min(...ms) + '–' + Math.max(...ms) + ' ms)');
})().catch((e) => { console.error(e); process.exitCode = 1; });
