// Real Electron screenshots and layout checks. Only isolated synthetic data is used.
require("./harness-env.cjs");
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
async function checkGlassAppearance(business) {
  const before = business();
  const quick = w.locator('#top [data-appearance-skin]');
  const settings = w.locator('[data-appearance-settings]');
  const skinSetting = settings.locator('[data-appearance-skin]');
  const modeSetting = settings.locator('[data-appearance-mode]');
  const expected = { 'glass-suong': 'rgb(23, 92, 156)', 'glass-luc': 'rgb(32, 101, 62)', 'glass-dem': 'rgb(89, 220, 234)' };
  await nav('appearance');
  await quick.selectOption('glass-dem');
  check('quick selector syncs Kính Đêm and enters dark mode', await skinSetting.inputValue() === 'glass-dem' && await modeSetting.inputValue() === 'dark');
  await skinSetting.selectOption('glass-luc');
  check('settings selector syncs Kính Lục and enters light mode', await quick.inputValue() === 'glass-luc' && await modeSetting.inputValue() === 'light');
  check('ảnh phong cảnh được tải từ gói giao diện ngoại tuyến', await w.evaluate(async () => {
    const image = document.createElement('img');
    image.src = 'ui/images/glass-forest.webp';
    await image.decode();
    return image.naturalWidth >= 1200 && window.getComputedStyle(document.body).backgroundImage.includes('glass-forest.webp');
  }));

  const xlsx = require('../../xlsx.full.min.js');
  const workbook = xlsx.utils.book_new(), file = path.join(DATA, 'theme-warning.xlsx');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([['Ghi chú bổ sung'], ['Kiểm thử giao diện']]), 'Ghi chú');
  fs.writeFileSync(file, xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

  async function contrastOf(selectors) {
    return w.evaluate(targets => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const pen = canvas.getContext('2d', { willReadFrequently: true });
      function rgba(css) {
        pen.clearRect(0, 0, 1, 1);
        pen.fillStyle = css;
        pen.fillRect(0, 0, 1, 1);
        return [...pen.getImageData(0, 0, 1, 1).data];
      }
      const lum = rgb => rgb.slice(0, 3).reduce((n, value, i) => {
        const x = value / 255;
        return n + (x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i];
      }, 0);
      return targets.map(selector => {
        const node = document.querySelector(selector);
        if (!node) return { selector, ratio: 0 };
        const layers = [], fg = lum(rgba(window.getComputedStyle(node).color));
        for (let el = node; el && el !== document.body; el = el.parentElement) {
          const bg = rgba(window.getComputedStyle(el).backgroundColor);
          layers.unshift(bg);
          if (bg[3] === 255) break;
        }
        // Kiểm tra cả nền dưới kính đen và trắng để chặn trường hợp xấu nhất khi có blur.
        const ratios = [0, 255].map(base => {
          const bg = lum(layers.reduce((under, over) => under.map((x, i) => (over[i] * over[3] + x * (255 - over[3])) / 255), [base, base, base]));
          return (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05);
        });
        return { selector, ratio: Math.min(...ratios), color: window.getComputedStyle(node).color, layers };
      });
    }, selectors);
  }
  const opaque = selector => w.locator(selector).first().evaluate(el => /^rgb\(/.test(window.getComputedStyle(el).backgroundColor));
  for (const [skin, primary] of Object.entries(expected)) {
    for (const mode of ['light', 'dark']) {
      await nav('appearance');
      await skinSetting.selectOption(skin);
      await modeSetting.selectOption(mode);
      const settingsContrast = await contrastOf(['.brand b', '#nav button.on', '#nav .hak-nav-group', '#sidefoot .ver', '#top .hak-skin-select', '[data-appearance-settings] label span', '[data-appearance-mode]']);
      await nav('dm'); await w.locator('#main button', { hasText: 'Tăng ca' }).first().click();
      const tableContrast = await contrastOf(['.ot-list th', '.ot-list [data-ot-row] td', '[data-ot-q]', '.hak-record-edit', '.hak-child-head small']);
      check(skin + ' ' + mode + ': danh sách, bảng và nút chính có nền đặc, đúng màu',
        await opaque('.ot-list th') && await opaque('[data-ot-q]') &&
        await w.locator('.hak-record-edit').evaluate((el, color) => window.getComputedStyle(el).backgroundColor === color, primary));
      await shot(skin + '-' + mode);
      await w.locator('.hak-record-edit').click();
      const formContrast = await contrastOf(['#modal .dlg h3', '#modal .fld', '#modal .fld input', '#modal footer button.pri']);
      check(skin + ' ' + mode + ': hộp thoại và ô nhập có nền đặc',
        await opaque('#modal .dlg') && await opaque('#modal .fld input') && await w.locator('#modal').evaluate(el => window.getComputedStyle(el).backdropFilter === 'none'));
      await w.keyboard.press('Escape');
      await nav('home');
      const [chooser] = await Promise.all([w.waitForEvent('filechooser'), w.getByRole('button', { name: /Nhập từ file Excel tổng/ }).click()]);
      await chooser.setFiles(file);
      await w.locator('#modal .warn').first().waitFor();
      const warningContrast = await contrastOf(['#modal .warn']);
      const all = [...settingsContrast, ...tableContrast, ...formContrast, ...warningContrast];
      check(skin + ' ' + mode + ': chữ thông thường đạt AA 4,5:1',
        all.every(({ ratio }) => ratio >= 4.5) && await opaque('#modal .warn'), all);
      await w.getByRole('button', { name: 'Hủy', exact: true }).click();
    }
  }

  await nav('appearance');
  await skinSetting.selectOption('glass-dem');
  check('appearance changes do not mutate business data', business() === before);
  await app.close();
  await launch();
  await nav('appearance');
  check('Kính Đêm và chế độ tối được nhớ sau khi mở lại',
    await w.locator('#top [data-appearance-skin]').inputValue() === 'glass-dem' &&
    await w.locator('[data-appearance-settings] [data-appearance-skin]').inputValue() === 'glass-dem' &&
    await w.locator('[data-appearance-mode]').inputValue() === 'dark' &&
    await w.evaluate(() => window.getComputedStyle(document.body).backgroundColor === 'rgb(13, 29, 44)'));

  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.unmaximize();
    win.setContentSize(1024, 768);
    win.webContents.setZoomFactor(1.5);
  });
  await w.waitForFunction(() => window.devicePixelRatio >= 1.5 && innerWidth < 901);
  await nav('home');
  await nav('appearance');
  check('thanh điều hướng và bộ chọn vẫn dùng được ở 1024×768, zoom 150%',
    await w.locator('[data-appearance-settings]').isVisible() && await w.locator('#top [data-appearance-skin]').isVisible() &&
    await w.evaluate(() => {
      const nav = document.querySelector('#nav'), side = document.querySelector('#side');
      return nav.scrollHeight > nav.clientHeight && nav.clientHeight > 0 &&
        side.getBoundingClientRect().right <= innerWidth + 1 &&
        document.querySelector('#top').scrollWidth <= innerWidth + 1;
    }));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try {
    await launch(); await nav('backup'); if (await w.locator('[data-sl-tab="dl"]').count()) await w.locator('[data-sl-tab="dl"]').click(); /* v2.1.3: màn chia tab; bản V10.3 đối chiếu chưa có tab */ await w.getByRole('button', { name: 'Nạp danh mục chuẩn HAK', exact: false }).click(); await app.close();
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
      if (!baseline) {
        check(width + ': toolbar fits on one row', await w.locator('#top').evaluate(el => {
          const children = [...el.children].filter(child => child.getClientRects().length);
          return Math.max(...children.map(child => child.getBoundingClientRect().top)) - Math.min(...children.map(child => child.getBoundingClientRect().top)) < 24;
        }));
        check(width + ': sidebar shows current stable version', (await w.locator('#sidefoot .ver').innerText()).includes(require('../../package.json').version));
      }
      check(width + ': page has no horizontal overflow', await w.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(width + ': default palette for a new profile', await w.evaluate(expected => document.documentElement.dataset.skin === expected, baseline ? 'luxe' : 'glass-suong'));
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
      if (!baseline) {
        for (const [label, slug] of [['Tăng ca', 'overtime'], ['Phụ cấp', 'allowance'], ['Hỗ trợ', 'support']]) {
          await nav('dm'); await w.locator('#main button', { hasText: label }).first().click();
          await w.waitForSelector('[data-ot-table]');
          check(width + ': ' + slug + ' summary metrics', await w.locator('.hak-catalog-metric').count() === 3);
          check(width + ': ' + slug + ' parent and inspector side by side', await w.locator('.hak-workspace-grid').evaluate(el => { const [a, b] = el.children; return b.getBoundingClientRect().left >= a.getBoundingClientRect().right - 2; }));
          const rows = w.locator('[data-ot-row]');
          if (await rows.count() > 1) {
            const code = await rows.nth(1).getAttribute('data-ot-row'); await rows.nth(1).click();
            check(width + ': ' + slug + ' selected parent drives detail', (await w.locator('.hak-child-head h3').innerText()).startsWith(code + ' —'));
          }
          check(width + ': ' + slug + ' information fields', await w.locator('.hak-record-field').count() >= 7);
          await w.getByRole('tab', { name: 'Công thức', exact: true }).click();
          check(width + ': ' + slug + ' formula tab', await w.locator('.hak-child-expression').isVisible());
          await w.keyboard.press('ArrowLeft');
          check(width + ': ' + slug + ' inspector keyboard navigation', await w.getByRole('tab', { name: 'Thông tin', exact: true }).getAttribute('aria-selected') === 'true' && await w.getByRole('tab', { name: 'Thông tin', exact: true }).evaluate(el => el === document.activeElement));
          await w.getByRole('tab', { name: 'Thông tin', exact: true }).click();
          await shot(width + '-catalog-' + slug);
          await w.locator('.hak-record-edit').click();
          check(width + ': ' + slug + ' editor uses existing save flow', await w.locator('[data-ot-save-info]').isVisible());
          await w.keyboard.press('Escape');
        }
      }
      await nav('nhansu'); await w.locator('[data-sf-adv]').click();
      await fits('[data-sf-drawer]', width + ': advanced filter fits viewport'); await shot(width + '-04-smart-filter'); await w.keyboard.press('Escape');
      if (!baseline) {
        for (const skin of ['luxe', 'classic', 'neutral', 'champagne']) {
          await w.selectOption('[aria-label="Chọn phong cách giao diện"]', skin);
          await nav('dm'); await w.locator('#main button', { hasText: 'Tăng ca' }).first().click();
          await shot(width + '-05-' + skin + '-light');
          await w.locator('#sidefoot .themebtn').first().click();
          await shot(width + '-05-' + skin + '-dark');
          check(width + ': ' + skin + ' dark mode', await w.evaluate(() => document.documentElement.dataset.theme === 'dark'));
          await w.locator('#sidefoot .themebtn').first().click();
        }
        await w.selectOption('[aria-label="Chọn phong cách giao diện"]', 'glass-suong');
      }
    }
    check('presentation does not mutate business data', business() === before);
    if (!baseline) await checkGlassAppearance(business);
    check('no renderer exceptions', errors.length === 0, errors);
  } finally {
    if (app) await app.close().catch(() => {});
    fs.writeFileSync(path.join(OUT, 'visual-results.json'), JSON.stringify({ baseline, results, errors }, null, 2));
  }
  if (results.some(r => !r.pass)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
