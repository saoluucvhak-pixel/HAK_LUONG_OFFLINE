const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const app = path.resolve(__dirname, '../..');
test('V10.4 runtime design stylesheet matches the inherited portable source', () => {
  const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(read(path.join(app, 'ui/hak-enterprise-components.css')), read(path.join(app, '../design-system/hak-enterprise-components.css')));
});
test('Appearance keeps legacy preferences and defaults new profiles to Kính Sương', () => {
  const source = fs.readFileSync(path.join(app, 'app.js'), 'utf8');
  const start = source.indexOf('  var HAK_SKINS ='), end = source.indexOf('  applySkin(curSkin());\n  applyTheme(curTheme());', start);
  assert.ok(start > 0 && end > start);
  const load = (entries, writesAllowed = true) => {
    const attrs = {};
    const context = vm.createContext({
      KEY: 'test',
      localStorage: {
        getItem: key => entries[key] ?? null,
        setItem: (key, value) => { if (!writesAllowed) throw Error('unavailable'); entries[key] = value; }
      },
      document: { documentElement: { setAttribute: (key, value) => { attrs[key] = value; } }, querySelectorAll: () => [] },
      applyTheme: value => { attrs.mode = value; }
    });
    vm.runInContext(source.slice(start, end), context);
    return { context, attrs };
  };
  for (const skin of ['luxe', 'classic', 'neutral', 'champagne']) {
    const data = { test_skin: skin, test_theme: 'dark' };
    const { context } = load(data);
    assert.equal(context.curSkin(), skin);
    assert.equal(context.curTheme(), 'dark');
    assert.deepEqual(data, { test_skin: skin, test_theme: 'dark' });
  }
  const existing = { test_ui: '{}' };
  assert.equal(load(existing).context.curSkin(), 'luxe');
  const firstUse = {};
  const { context, attrs } = load(firstUse);
  assert.equal(context.curSkin(), 'glass-suong');
  firstUse.test_ui = '{}';
  assert.equal(load(firstUse).context.curSkin(), 'glass-suong');
  context.setSkin('glass-dem');
  assert.deepEqual(attrs, { 'data-skin': 'glass-dem', mode: 'dark' });
  assert.equal(load(firstUse).context.curTheme(), 'dark');
  context.toggleTheme();
  assert.equal(load(firstUse).context.curTheme(), 'light');
  assert.equal(load(firstUse).context.curSkin(), 'glass-dem');
  const blocked = load({}, false);
  blocked.context.setSkin('glass-luc');
  assert.equal(blocked.context.curSkin(), 'glass-luc');
});

test('V10.4 catalogue layout is shared with the reusable design branch source', () => {
  const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(read(path.join(app, 'ui/workspace-v104.css')), read(path.join(app, '../design-system/hak-workspace-layout.css')));
});
