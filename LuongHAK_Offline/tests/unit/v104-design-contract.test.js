const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const app = path.resolve(__dirname, '../..');
test('V10.4 runtime design stylesheet matches the inherited portable source', () => {
  const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(read(path.join(app, 'ui/hak-enterprise-components.css')), read(path.join(app, '../design-system/hak-enterprise-components.css')));
});
test('V10.4 preserves existing palette preferences and keeps luxe as the default', () => {
  const source = fs.readFileSync(path.join(app, 'app.js'), 'utf8');
  const start = source.indexOf('  var HAK_SKINS ='), end = source.indexOf('  applySkin(curSkin());', start);
  assert.ok(start > 0 && end > start);
  for (const saved of [null, 'luxe', 'classic', 'neutral', 'champagne', 'invalid']) {
    let writes = 0;
    const context = vm.createContext({ KEY: 'test', localStorage: { getItem: () => saved, setItem: () => { writes++; } }, document: { documentElement: { setAttribute() {} } } });
    vm.runInContext(source.slice(start, end), context);
    assert.equal(context.curSkin(), ['luxe', 'classic', 'neutral', 'champagne'].includes(saved) ? saved : 'luxe');
    assert.equal(writes, 0, 'rendering must not overwrite an existing preference');
  }
});

test('V10.4 catalogue layout is shared with the reusable design branch source', () => {
  const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(read(path.join(app, 'ui/workspace-v104.css')), read(path.join(app, '../design-system/hak-workspace-layout.css')));
});
