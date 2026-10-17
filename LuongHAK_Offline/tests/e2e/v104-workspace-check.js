// Real Electron screenshots and layout checks. Only isolated synthetic data is used.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const APP = path.resolve(process.env.APP_UNDER_TEST || path.join(__dirname, '../..'));
const OUT = path.resolve(process.env.VISUAL_OUT || path.join(APP, 'tests/e2e/workspace-shots'));
const baseline = process.env.VISUAL_BASELINE === '1';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hak-workspace-'));
const results = [], errors = [];
let app, w;
function check(name, pass, detail) { results.push({ name, pass: !!pass, detail }); console.log((pass ? 'PASS ' : 'FAIL ') + name); }
async function launch() {
  app = await _electron.launch({ executablePath: process.env.ELECTRON_PATH || require('electron'), args: ['--no-sandbox', APP], env: { ...process.env, HAK_USER_DATA: DATA, HAK_NO_SHELL: '1' } });
  w = await app.firstWindow(); w.on('pageerror', e => errors.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#main > *');
  const title = await w.locator('#top h2').innerText();
  if (/Thiết lập/.test(title)) {
    for (const [k, v] of Object.entries({ cty: 'Công ty minh họa HAK', ma: 'DEMO', u: 'admin', n: 'Quản trị minh họa', p: 'Demo2026Safe', p2: 'Demo2026Safe' })) await w.fill('#main input[data-f=' + k + ']', v);
    await w.click('#main button.big'); await w.waitForSelector('[data-recovery]'); await w.click('.dlg footer button.pri');
  } else if (/Đăng nhập/.test(title)) {
    await w.fill('#main input[data-f=u]', 'admin'); await w.fill('#main input[data-f=p]', 'Demo2026Safe'); await w.click('#main button.big');
  }
  await w.waitForSelector('#nav button[data-k=home]');
}
async function nav(key) { await w.click('#nav button[data-k=' + key + ']'); }
async function shot(name) { await w.evaluate(() => document.fonts.ready); await w.screenshot({ path: path.join(OUT, name + '.png') }); }
async function fits(selector, name) {
  await w.locator(selector).evaluate(async el => { await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))); });
  const detail = await w.locator(selector).evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: innerWidth, height: innerHeight }; });
  check(name, detail.left >= -1 && detail.right <= detail.width + 1 && detail.top >= -1 && detail.bottom <= detail.height + 1, detail);
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try {
    await launch(); await nav('backup'); await w.getByRole('button', { name: 'Nạp danh mục chuẩn HAK', exact: false }).click(); await app.close();
    const file = path.join(DATA, 'data.json'), db = JSON.parse(fs.readFileSync(file, 'utf8'));
    const department = db.dm_phongban[0]['Mã phòng ban'];
    ['Nguyễn Minh An', 'Trần Thị Bình', 'Lê Văn Hòa', 'Đặng Thu Hà'].forEach((name, i) => {
      const code = 'DEMO' + (i + 1), contract = code + '/HD';
      db.nhanvien.push({ _id: code, 'Mã NV': code, 'Họ và tên': name, 'Trạng thái': 'Đang làm việc' });
      db.hopdong.push({ _id: contract, 'Mã NV': code, 'Số HĐLĐ': contract, 'Ngày vào làm': '2025-01-01', 'Hình thức HĐLĐ': 'Không xác định thời hạn' });
      db.chitiethd.push({ _id: code + '-pl', 'Mã NV': code, 'Số HĐLĐ': contract, 'Hiệu lực từ': '2025-01-01', 'Phòng ban': department, 'Mã lương': 'TG1', 'Lương thỏa thuận': String(9000000 + i * 1000000), 'Lương cơ bản': '5000000' });
    });
    fs.writeFileSync(file, JSON.stringify(db));
    await launch();
    const business = () => JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')), (key, value) => ['auditlog', 'settings', 'cauhinh', 'updatedAt'].includes(key) ? undefined : value);
    const before = business();
    for (const [width, height] of [[1366, 768], [1920, 1080]]) {
      await app.evaluate(({ BrowserWindow }, size) => { const win = BrowserWindow.getAllWindows()[0]; win.unmaximize(); win.setContentSize(...size); }, [width, height]);
      await w.setViewportSize({ width, height });
      await w.waitForFunction(([width, height]) => innerWidth === width && innerHeight === height, [width, height]);
      check(width + ': actual renderer viewport matches requested size', await w.evaluate(([width, height]) => innerWidth === width && innerHeight === height, [width, height]));
      await nav('home');
      await shot(width + '-01-dashboard');
      check(width + ': page has no horizontal overflow', await w.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(width + ': approved luxe default retained', await w.evaluate(() => document.documentElement.dataset.skin === 'luxe'));
      if (!baseline) {
        check(width + ': dashboard shows 4 metrics and workflow', await w.locator('.hak-dashboard-metric').count() === 4 && await w.locator('.hak-workflow progress').count() === 1);
        // Active group must be collapsible, and its explicit open state must agree with its rows.
        const activeGroup = w.locator('.hak-nav-group').first();
        await activeGroup.click();
        await w.waitForFunction(() => document.querySelector('.hak-nav-group').getAttribute('aria-expanded') === 'false');
        check(width + ': active navigation group can collapse', await activeGroup.getAttribute('aria-expanded') === 'false' && !(await w.locator('#nav button[data-k=home]').isVisible()));
        await activeGroup.click();
      }
      await nav('dm'); await w.locator('#main button', { hasText: 'Tăng ca' }).first().click();
      await w.waitForSelector('[data-ot-table]'); await shot(width + '-02-master-detail');
      if (!baseline) {
        check(width + ': compact list has no internal horizontal overflow', await w.locator('.ot-list').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        check(width + ': parent list starts above the fold', await w.locator('.ot-list').evaluate(el => el.getBoundingClientRect().top < innerHeight * 0.65));
        const density = w.locator('[data-ot-density]');
        await density.click(); check(width + ': full columns available on demand', await density.getAttribute('aria-pressed') === 'true'); await density.click();
      }
      await w.locator('[data-ot-row] button', { hasText: 'Xem chi tiết' }).first().click();
      await fits('[data-ot-modal]', width + ': detail fits viewport'); await shot(width + '-03-side-drawer');
      await w.keyboard.press('Escape');
      if (!baseline) {
        await w.waitForFunction(() => document.activeElement.hasAttribute('data-ot-row'));
        check(width + ': closing detail restores focus to parent', await w.evaluate(() => document.activeElement.hasAttribute('data-ot-row')));
      }
      await nav('nhansu'); await w.locator('[data-sf-adv]').click();
      await fits('[data-sf-drawer]', width + ': advanced filter fits viewport'); await shot(width + '-04-smart-filter'); await w.keyboard.press('Escape');
      if (!baseline) {
        for (const skin of ['luxe', 'classic', 'neutral', 'champagne']) {
          await w.selectOption('[aria-label="Chọn phong cách giao diện"]', skin);
          await nav('home');
          await w.locator('#sidefoot .themebtn').first().click();
          await shot(width + '-05-' + skin + '-dark');
          check(width + ': ' + skin + ' dark mode', await w.evaluate(() => document.documentElement.dataset.theme === 'dark'));
          await w.locator('#sidefoot .themebtn').first().click();
        }
        await w.selectOption('[aria-label="Chọn phong cách giao diện"]', 'luxe');
      }
    }
    check('presentation does not mutate business data', business() === before);
    check('no renderer exceptions', errors.length === 0, errors);
  } finally {
    if (app) await app.close().catch(() => {});
    fs.writeFileSync(path.join(OUT, 'visual-results.json'), JSON.stringify({ baseline, results, errors }, null, 2));
  }
  if (results.some(r => !r.pass)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
